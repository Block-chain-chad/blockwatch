// Pure candle-chart vocabulary: which timeframes exist, how each maps onto
// GeckoTerminal's bucket + aggregate, how long a fetched series stays fresh,
// how a Yahoo chart payload becomes the same candle shape, and how to choose
// the pool a token's candles should come from. No network, no browser
// globals — services/apiBase.js reads window at import, so anything that
// imports a service cannot be tested in plain node. This can.
//
// One candle everywhere: { time, open, high, low, close, volume } with `time`
// in unix SECONDS. Token candles (GeckoTerminal) and stock candles (Yahoo)
// both land in this shape so a chart and the indicators never care which
// side of the gap they are drawing.

import { NETWORKS, TIMEFRAME_AGGREGATES } from '../../api/_geckoterminal.js'

/**
 * Timeframes offered to the chart. `timeframe` + `aggregate` is what
 * GeckoTerminal is asked for; `ttlMs` is how long the client keeps a series
 * before refetching (it mirrors the proxy's s-maxage, so a refetch inside the
 * window is usually a CDN hit rather than an upstream call — GeckoTerminal's
 * free tier is roughly 30 requests a minute, shared by everyone). `limit` is
 * how many candles to ask for; GeckoTerminal caps a call at 1000.
 * `stock` is the /api/history request that covers about the same span, or
 * null when Yahoo offers no matching interval (its allowlist is 5m/30m/1d).
 */
export const TIMEFRAMES = Object.freeze([
  Object.freeze({ id: '1m', label: '1m', timeframe: 'minute', aggregate: 1, limit: 300, ttlMs: 30_000, stock: null }),
  Object.freeze({ id: '5m', label: '5m', timeframe: 'minute', aggregate: 5, limit: 300, ttlMs: 30_000, stock: { interval: '5m', range: '5d' } }),
  Object.freeze({ id: '15m', label: '15m', timeframe: 'minute', aggregate: 15, limit: 300, ttlMs: 30_000, stock: null }),
  Object.freeze({ id: '1h', label: '1h', timeframe: 'hour', aggregate: 1, limit: 300, ttlMs: 300_000, stock: null }),
  Object.freeze({ id: '4h', label: '4h', timeframe: 'hour', aggregate: 4, limit: 300, ttlMs: 300_000, stock: null }),
  Object.freeze({ id: '1d', label: '1D', timeframe: 'day', aggregate: 1, limit: 300, ttlMs: 3_600_000, stock: { interval: '1d', range: '1y' } }),
])

export const DEFAULT_TIMEFRAME_ID = '1h'

/** The timeframe definition for an id, or null for anything unknown. */
export function timeframeById(id) {
  return TIMEFRAMES.find((t) => t.id === id) ?? null
}

/** The /api/history {interval, range} that approximates a timeframe, or null. */
export function stockRequestFor(id) {
  return timeframeById(id)?.stock ?? null
}

/** Seconds per candle for a timeframe (chart axis spacing, gap detection). */
export function candleSeconds(id) {
  const t = timeframeById(id)
  if (!t) return null
  const unit = { minute: 60, hour: 3600, day: 86_400 }[t.timeframe]
  return unit * t.aggregate
}

/**
 * Every timeframe must be one GeckoTerminal actually serves; this is checked
 * once at import so a typo here fails loudly instead of as a 400 in prod.
 */
for (const t of TIMEFRAMES) {
  if (!TIMEFRAME_AGGREGATES[t.timeframe]?.includes(t.aggregate)) {
    throw new Error(`candles: timeframe ${t.id} is not served by GeckoTerminal`)
  }
}

// --- Which network holds a token's pools ----------------------------------

/**
 * Networks to try for an asset, in order. xStocks trade on Solana, Ondo's
 * tokens on Ethereum; anything else is a guess, so both are tried. Only
 * networks the proxy allowlists are ever returned.
 */
export function networksFor(asset) {
  const issuer = asset?.issuer
  if (issuer === 'xStocks') return ['solana']
  if (issuer === 'Ondo') return ['eth']
  return [...NETWORKS]
}

// --- Pool choice ------------------------------------------------------------

/** Quote legs whose price is a dollar. Candles from these pools are USD without
 *  a second conversion riding on top. */
const STABLE_QUOTES = new Set(['USDC', 'USDT', 'USD1', 'PYUSD', 'USDS', 'DAI', 'FDUSD'])

/**
 * Score one candidate pool for an asset. Higher is better; -Infinity means
 * "never use this pool".
 *
 * Rules, in order of weight:
 *  - The base token must be the asset's ticker (case-sensitive), and when the
 *    asset carries a mint, the base ADDRESS must match it — a look-alike with
 *    the same letters is exactly what an attacker would list.
 *  - A dollar-stable quote leg counts double a volatile one: a pool against
 *    SOL or a meme token has its USD candles computed through that token's
 *    own price, adding its noise to the chart.
 *  - Then 24h volume, on a log scale so a busy pool wins but not so
 *    lopsidedly that the stable-quote preference never matters.
 */
export function scorePool(pool, asset) {
  if (!pool || typeof pool.address !== 'string') return -Infinity
  if (!asset?.ticker || pool.baseSymbol !== asset.ticker) return -Infinity
  if (asset.mint && pool.baseAddress && pool.baseAddress !== asset.mint) return -Infinity
  const vol = Number.isFinite(pool.volume24h) && pool.volume24h > 0 ? pool.volume24h : 0
  if (vol === 0) return -Infinity // a dead pool has no candles worth drawing
  const stable = STABLE_QUOTES.has(pool.quoteSymbol) ? 2 : 1
  return stable * Math.log10(1 + vol)
}

/** The best-scoring pool among candidates, or null when none qualifies. */
export function choosePool(candidates, asset) {
  let best = null
  let bestScore = -Infinity
  for (const pool of Array.isArray(candidates) ? candidates : []) {
    const s = scorePool(pool, asset)
    if (s > bestScore) {
      best = pool
      bestScore = s
    }
  }
  return best
}

// --- Stock candles from the Yahoo chart payload ------------------------------

/**
 * What /api/history accepts. A client-side mirror of INTERVALS / RANGES in
 * api/history.js — mirrored rather than imported so the browser bundle does
 * not pull the serverless handler in; candles.test.js checks the two agree.
 * Used to refuse a request locally instead of spending a round trip on a 400.
 */
export const STOCK_INTERVALS = Object.freeze(['5m', '30m', '1d'])
export const STOCK_RANGES = Object.freeze(['1d', '5d', '1mo', '3mo', '1y'])

export function isStockRequest(interval, range) {
  return STOCK_INTERVALS.includes(interval) && STOCK_RANGES.includes(range)
}

/**
 * Yahoo v8 chart JSON (what /api/history relays) -> ascending candles in the
 * shared shape. Yahoo aligns five parallel arrays by index and leaves nulls
 * where a bucket had no trade; those rows are dropped, not zero-filled.
 */
export function normalizeYahooCandles(json) {
  const result = json?.chart?.result?.[0]
  const times = Array.isArray(result?.timestamp) ? result.timestamp : []
  const q = result?.indicators?.quote?.[0] ?? {}
  const leg = (k) => (Array.isArray(q[k]) ? q[k] : [])
  const open = leg('open')
  const high = leg('high')
  const low = leg('low')
  const close = leg('close')
  const volume = leg('volume')
  const out = []
  for (let i = 0; i < times.length; i++) {
    const row = { time: times[i], open: open[i], high: high[i], low: low[i], close: close[i] }
    if (!Object.values(row).every((v) => Number.isFinite(v))) continue
    row.volume = Number.isFinite(volume[i]) ? volume[i] : 0
    out.push(row)
  }
  out.sort((a, b) => a.time - b.time)
  return out
}

/** Last close in a candle series, or null when there is none. */
export function lastClose(candles) {
  const c = Array.isArray(candles) && candles.length ? candles[candles.length - 1] : null
  return Number.isFinite(c?.close) ? c.close : null
}
