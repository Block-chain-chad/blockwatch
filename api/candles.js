// Vercel serverless function: token candles (OHLCV) from GeckoTerminal.
//
// GeckoTerminal is CoinGecko's on-chain arm. It indexes the DEX pools where
// xStocks (Solana) and Ondo tokens (Ethereum) actually trade and serves their
// candles keyless, which is the only free OHLCV source for the tokenized side
// of the gap. Two ops, both strictly allowlisted:
//
//   ?op=resolve&ticker=AAPLx&network=solana
//     Which pool a ticker's candles should come from. Returns the pools where
//     the ticker is the BASE token, busiest first (see api/_geckoterminal.js
//     for why the search result cannot be used as-is), plus the top one as
//     `pool`. Cached a day: pools do not move.
//
//   ?op=ohlcv&network=solana&pool=<address>&timeframe=minute&aggregate=5&limit=300
//     Candles for one pool, ascending, in the shared candle shape. Cached for
//     about one candle's worth for minute and hour data, an hour for daily,
//     with a generous stale-while-revalidate so a burst of viewers is one
//     upstream call.
//
// RATE LIMIT: GeckoTerminal's free tier is roughly 30 requests per minute for
// everyone behind this deployment put together, with no key to raise it. The
// edge cache is the budget: every param is an enum or a fixed-shape address so
// the space of cache keys is small and every miss is a request a real chart
// needed. Never accept a free-text param here — that both opens a relay and
// unbounds the cache key, the same way an unknown param would (see
// ./_params.js). Upstream 429s come back as 502 like any other upstream
// failure; the client renders nothing rather than an error.
//
// Nothing upstream is relayed wholesale: both ops return only fields derived
// by api/_geckoterminal.js.
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js). Same-origin web calls are
// unaffected.

import { applyCors, handlePreflight, setCacheControl } from './_cors.js'
import { rejectUnknownParams } from './_params.js'
import {
  NETWORKS,
  TIMEFRAME_AGGREGATES,
  POOL_ADDRESS,
  searchUrl,
  ohlcvUrl,
  parseSearchPools,
  matchingPools,
  normalizeOhlcv,
  ohlcvMeta,
} from './_geckoterminal.js'

// Per-op allowlists. A resolve request carrying `pool`, or an ohlcv request
// carrying `ticker`, is a stray cache-key dimension and is refused.
const OP_PARAMS = Object.freeze({
  resolve: new Set(['op', 'ticker', 'network', 'c']),
  ohlcv: new Set(['op', 'network', 'pool', 'timeframe', 'aggregate', 'limit', 'c']),
})
const ALL_PARAMS = new Set([...OP_PARAMS.resolve, ...OP_PARAMS.ohlcv])

const TICKER = /^[A-Z0-9.-]{1,10}$/i
const NETWORK_SET = new Set(NETWORKS)
// GeckoTerminal caps a call at 1000 candles. Fixed steps, not a free integer,
// so `limit` cannot mint unbounded cache keys.
const LIMITS = new Set(['100', '300', '500', '1000'])
// How many candidate pools to hand back. Enough for the client's own scoring
// to prefer a dollar-quoted pool; not the whole search page.
const MAX_CANDIDATES = 8

const CACHE = Object.freeze({
  resolve: 's-maxage=86400, stale-while-revalidate=604800',
  // A ticker with no pool today may have one tomorrow — recheck sooner.
  resolveMiss: 's-maxage=3600, stale-while-revalidate=86400',
  minute: 's-maxage=30, stale-while-revalidate=300',
  hour: 's-maxage=300, stale-while-revalidate=3600',
  day: 's-maxage=3600, stale-while-revalidate=86400',
})

const UPSTREAM_HEADERS = { Accept: 'application/json', 'User-Agent': 'BlockWatch tracker' }

const str = (v) => (typeof v === 'string' ? v : '')

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  const originScoped = applyCors(req, res)
  if (rejectUnknownParams(req, res, ALL_PARAMS)) return

  const op = str(req.query.op)
  const allowed = Object.hasOwn(OP_PARAMS, op) ? OP_PARAMS[op] : null
  if (!allowed) return res.status(400).json({ error: 'bad request' })
  if (rejectUnknownParams(req, res, allowed)) return

  const network = str(req.query.network)
  if (!NETWORK_SET.has(network)) return res.status(400).json({ error: 'bad request' })

  return op === 'resolve' ? resolveOp(req, res, originScoped, network) : ohlcvOp(req, res, originScoped, network)
}

async function fetchUpstream(url) {
  const upstream = await fetch(url, { headers: UPSTREAM_HEADERS })
  if (!upstream.ok) throw new Error(`upstream ${upstream.status}`)
  return upstream.json()
}

async function resolveOp(req, res, originScoped, network) {
  const ticker = str(req.query.ticker)
  if (!TICKER.test(ticker)) return res.status(400).json({ error: 'bad request' })

  let candidates
  try {
    const json = await fetchUpstream(searchUrl(ticker, network))
    candidates = matchingPools(parseSearchPools(json), ticker).slice(0, MAX_CANDIDATES)
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' })
  }

  setCacheControl(res, candidates.length ? CACHE.resolve : CACHE.resolveMiss, originScoped)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(200).json({ network, ticker, pool: candidates[0] ?? null, candidates })
}

async function ohlcvOp(req, res, originScoped, network) {
  const pool = str(req.query.pool)
  const timeframe = str(req.query.timeframe)
  const aggregate = str(req.query.aggregate)
  const limit = str(req.query.limit)

  const aggregates = Object.hasOwn(TIMEFRAME_AGGREGATES, timeframe) ? TIMEFRAME_AGGREGATES[timeframe] : null
  if (
    !POOL_ADDRESS[network].test(pool) ||
    !aggregates ||
    !aggregates.some((a) => String(a) === aggregate) ||
    !LIMITS.has(limit)
  ) {
    return res.status(400).json({ error: 'bad request' })
  }

  let json
  try {
    json = await fetchUpstream(ohlcvUrl(network, pool, timeframe, aggregate, limit))
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' })
  }
  const candles = normalizeOhlcv(json)
  // A pool with no candles at all means the response changed shape or the
  // pool is gone — a cached empty 200 would render as a blank chart for an
  // hour, so say so instead.
  if (candles.length === 0) return res.status(502).json({ error: 'no candles' })

  setCacheControl(res, CACHE[timeframe], originScoped)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(200).json({
    network,
    pool,
    timeframe,
    aggregate: Number(aggregate),
    ...ohlcvMeta(json),
    candles,
  })
}
