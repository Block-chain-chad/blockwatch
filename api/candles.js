// Vercel serverless function: token candles (OHLCV) from GeckoTerminal.
//
// GeckoTerminal is CoinGecko's on-chain arm. It indexes the DEX pools where
// xStocks (Solana) and Ondo tokens (Ethereum) actually trade and serves their
// candles keyless, which is the only free OHLCV source for the tokenized side
// of the gap. Two ops, both strictly allowlisted:
//
//   ?op=resolve&ticker=AAPLx&network=solana
//     Only a ticker from the token list, on a network the app searches for
//     it (api/_tokens.js, exact case).
//     Which pool a ticker's candles should come from. Returns the pools where
//     the ticker is the BASE token, busiest first (see api/_geckoterminal.js
//     for why the search result cannot be used as-is), plus the top one as
//     `pool`, and `asOf`: when this answer was fetched from GeckoTerminal.
//     Cached a day: pools do not move. Their liquidity does, and a cached
//     answer can be served for days, which is why `asOf` travels with it.
//
//   ?op=ohlcv&network=solana&pool=<address>&timeframe=minute&aggregate=5&limit=300
//     Candles for one pool, ascending, in the shared candle shape. Cached for
//     about one candle's worth for minute and hour data, an hour for daily,
//     with a generous stale-while-revalidate so a burst of viewers is one
//     upstream call.
//
// RATE LIMIT: GeckoTerminal's free tier is roughly 30 requests per minute for
// everyone behind this deployment put together, with no key to raise it. Three
// things hold the line, in order of how much work they do. The edge cache does
// most of it: every param is an enum or a fixed-shape address, so the space of
// cache keys is small and every miss is a request a real chart needed. Never
// accept a free-text param here — that both opens a relay and unbounds the
// cache key, the same way an unknown param would (see ./_params.js). Then the
// two buckets below: a per-caller bucket, and a per-instance breaker sized at
// GeckoTerminal's real 30/minute and spent only on calls that reach upstream.
// Both are best-effort and per instance (./_rateLimit.js). Upstream 429s still
// come back as 502 like any other upstream failure; the client renders nothing
// rather than an error.
//
// Nothing upstream is relayed wholesale: both ops return only fields derived
// by api/_geckoterminal.js.
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js). Same-origin web calls are
// unaffected.

import { applyCors, handlePreflight, setCacheControl } from './_cors.js'
import { rejectUnknownParams } from './_params.js'
import { isAllowedToken } from './_tokens.js'
import { clientKey, createRateLimiter, sendTooManyRequests } from './_rateLimit.js'
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

const UPSTREAM_HEADERS = { Accept: 'application/json', 'User-Agent': 'OnStock tracker' }

// Per-caller ceiling. Best-effort and PER INSTANCE, like every bucket in this
// directory — read ./_rateLimit.js before quoting these numbers at anyone.
//
// Sized against one person watching charts. A minute chart refetches on the
// 30-second TTL above, so a single open chart costs about two upstream calls a
// minute; resolve is cached a day. Flicking between a dozen tokens in a minute
// is a busy human. 60 burst refilling at 1/second is well past that.
const perClient = createRateLimiter({ capacity: 60, refillPerSecond: 1 })

// THE QUOTA'S CEILING, and the reason this file gets a breaker where
// api/history.js and api/news.js do not. GeckoTerminal's free tier is roughly
// 30 requests a minute for EVERYONE behind this deployment put together, with
// no key to raise it — the same shared-quota shape as Finnhub, so it gets the
// same treatment: sized at the real upstream limit, spent only on calls that
// actually go upstream, and keyed on a constant so it cannot be split by
// forging or rotating a header.
//
// Honest about the cost. This does not buy a user anything: a request past the
// budget gets a 429 from us instead of a 429 from GeckoTerminal, and either
// way the chart does not draw. What it buys is that the refusal is cheap and
// falls on the caller who overspent, rather than on whoever asks next after a
// scraper has already spent the minute for everybody.
const perInstance = createRateLimiter({ capacity: 30, refillPerSecond: 0.5, maxKeys: 1 })

// Exported for the tests, which need a known-empty bucket per case.
export const limiters = { perClient, perInstance }

const str = (v) => (typeof v === 'string' ? v : '')

// One spelling per pool, so one pool is one cache key. Ethereum addresses are
// hex and case-insensitive: 0xABC and 0xabc are the same pool, and accepting
// both would let a script mint cache keys from one real address. Resolve hands
// out the lowercase form and ohlcv accepts only that. Solana addresses are
// base58, where case is meaningful, so they pass through untouched.
const canonicalPool = (network, address) => (network === 'eth' ? address.toLowerCase() : address)

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  const originScoped = applyCors(req, res)
  if (rejectUnknownParams(req, res, ALL_PARAMS)) return

  const client = perClient.take(clientKey(req))
  if (!client.ok) return sendTooManyRequests(res, client.retryAfter)

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
  if (!isAllowedToken(ticker, network)) return res.status(400).json({ error: 'bad request' })

  // Spent here rather than at the top of the handler, so a request the params
  // were going to refuse anyway never costs the shared budget a token.
  const instance = perInstance.take('all')
  if (!instance.ok) return sendTooManyRequests(res, instance.retryAfter)

  let candidates
  let asOf
  try {
    const json = await fetchUpstream(searchUrl(ticker, network))
    // Stamped when the upstream answer arrives, so the edge cache stores the
    // real age of the figures along with them.
    asOf = new Date().toISOString()
    candidates = matchingPools(parseSearchPools(json), ticker)
      .slice(0, MAX_CANDIDATES)
      .map((p) => ({ ...p, address: canonicalPool(network, p.address) }))
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' })
  }

  setCacheControl(res, candidates.length ? CACHE.resolve : CACHE.resolveMiss, originScoped)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(200).json({ network, ticker, pool: candidates[0] ?? null, candidates, asOf })
}

async function ohlcvOp(req, res, originScoped, network) {
  const pool = str(req.query.pool)
  const timeframe = str(req.query.timeframe)
  const aggregate = str(req.query.aggregate)
  const limit = str(req.query.limit)

  const aggregates = Object.hasOwn(TIMEFRAME_AGGREGATES, timeframe) ? TIMEFRAME_AGGREGATES[timeframe] : null
  if (
    !POOL_ADDRESS[network].test(pool) ||
    pool !== canonicalPool(network, pool) ||
    !aggregates ||
    !aggregates.some((a) => String(a) === aggregate) ||
    !LIMITS.has(limit)
  ) {
    return res.status(400).json({ error: 'bad request' })
  }

  // As in resolveOp: the shared budget pays only for calls that reach upstream.
  const instance = perInstance.take('all')
  if (!instance.ok) return sendTooManyRequests(res, instance.retryAfter)

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
