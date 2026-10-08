// Vercel serverless function: token price history from CoinGecko.
//
//   GET /api/token-history?id=<coin id>&days=<1|7|30|90|365>
//     -> { prices: [[unix ms, usd], ...] }, oldest first, as CoinGecko sends it.
//
// Why through our own server. The browser used to ask CoinGecko for this
// directly, on CoinGecko's keyless per-visitor limit, and a fresh desktop
// visit spends that limit on /coins/markets first (the live prices). The
// history call was the one refused, the chart fell back to the token's
// trading pool, and on 2026-10-07 CRCLon's "Past day" line was five trades
// from a pool holding about $2,700. Here one answer is cached at the edge and
// shared by every visitor, so ordinary traffic never runs this function.
//
// Gates, in the order they run: CORS and origin (./_cors.js), the query
// allowlist (./_params.js), a per-caller bucket, the coin-id allowlist
// (./_coins.js, generated from universe.json, exact case) and the days
// allowlist, then the breaker in front of CoinGecko. Every param is an enum,
// so the edge-cache key space is bounded: 711 ids x 5 ranges x 2 lanes.
//
// Nothing about the caller goes upstream: the request to CoinGecko carries
// only the headers built here, never the visitor's address, cookies or
// headers. With COINGECKO_API_KEY set (server only, never VITE_), it is sent
// as CoinGecko's demo-key header.
//
// Answers:
//   200  the points, edge-cached per range (CACHE below).
//   400  a param off the allowlists.
//   404  CoinGecko has no such coin. The client reads it as missing.
//   429  this caller's own bucket is empty (sendTooManyRequests).
//   502  CoinGecko could not be reached or answered with an error.
//   503  CoinGecko refused (429), or the breaker is open.
// Every answer but the 200 carries Cache-Control: no-store, and 502 and 503
// carry Retry-After: CoinGecko's own value when it sent one, else 60 s.
//
// CORS: the iPhone app calls this from capacitor://localhost (see ./_cors.js),
// and reads Retry-After, which a cross-origin response only exposes when told
// to (Access-Control-Expose-Headers).

import { applyCors, handlePreflight, refuseForeignOrigin } from './_cors.js'
import { rejectUnknownParams } from './_params.js'
import { isAllowedCoin } from './_coins.js'
import { clientKey, createRateLimiter, sendTooManyRequests } from './_rateLimit.js'

/** The chart's ranges in CoinGecko days (src/hooks/useChartData.js CHART_RANGES). */
export const DAYS = new Set(['1', '7', '30', '90', '365'])

const ALLOWED_PARAMS = new Set(['id', 'days', 'c'])

/*
 * Edge cache per range. Fresh for about as long as the data's own step makes
 * worth it: CoinGecko serves 5-minute points for 1 day, hourly up to 90 days
 * and daily beyond, and the client keeps an answer for 5 minutes too
 * (src/services/coingecko.js HISTORY_TTL). stale-while-revalidate hides the
 * refetch from the viewer; stale-if-error lets the edge keep serving the last
 * good copy while CoinGecko refuses (this route then answers 503 or 502,
 * which the edge treats as an error), bounded so a long outage does not pass
 * a day-old "Past day" line off as recent.
 */
export const CACHE = Object.freeze({
  1: 'public, s-maxage=300, stale-while-revalidate=600, stale-if-error=3600',
  7: 'public, s-maxage=1800, stale-while-revalidate=3600, stale-if-error=7200',
  30: 'public, s-maxage=3600, stale-while-revalidate=7200, stale-if-error=14400',
  90: 'public, s-maxage=10800, stale-while-revalidate=21600, stale-if-error=43200',
  365: 'public, s-maxage=21600, stale-while-revalidate=43200, stale-if-error=86400',
})

/** Retry-After when CoinGecko sends none, and the longest one we pass on. */
export const DEFAULT_RETRY_AFTER_S = 60
const MAX_RETRY_AFTER_S = 600
const UPSTREAM_TIMEOUT_MS = 8_000

// Per-caller ceiling, sized like api/history.js: one chart view is one call,
// held five minutes by the client, and only cache misses reach here.
const perClient = createRateLimiter({ capacity: 60, refillPerSecond: 1 })

// The upstream budget, per instance and keyed on a constant so it cannot be
// split by forging a header. Sized at CoinGecko's demo plan, 30 calls a
// minute. Keyless, CoinGecko's own limit is lower and decided by address, and
// Vercel's outbound addresses are shared with other customers, so the 429
// lockout below is what does the work then.
const perInstance = createRateLimiter({ capacity: 30, refillPerSecond: 0.5, maxKeys: 1 })

// After a 429 from CoinGecko, no call goes upstream until its Retry-After
// has passed. Per instance, like the buckets (read ./_rateLimit.js).
let upstreamBlockedUntil = 0

// Exported for the tests, which need known-empty state per case.
export const limiters = { perClient, perInstance }
export function resetBreaker() {
  upstreamBlockedUntil = 0
}

/**
 * Whole seconds to wait, from a Retry-After header (seconds or an HTTP date),
 * between 1 and 600; DEFAULT_RETRY_AFTER_S when it is missing or unreadable.
 */
export function retryAfterSeconds(header, now = Date.now()) {
  if (header == null || String(header).trim() === '') return DEFAULT_RETRY_AFTER_S
  const n = Number(header)
  const seconds = Number.isFinite(n) ? n : (Date.parse(header) - now) / 1000
  if (!Number.isFinite(seconds)) return DEFAULT_RETRY_AFTER_S
  return Math.min(MAX_RETRY_AFTER_S, Math.max(1, Math.ceil(seconds)))
}

/** Only well-formed [ms, usd] pairs from a market_chart answer; nothing else is relayed. */
export function pointsFrom(json) {
  const rows = Array.isArray(json?.prices) ? json.prices : []
  return rows
    .filter((r) => Array.isArray(r) && Number.isFinite(r[0]) && Number.isFinite(r[1]))
    .map(([t, v]) => [t, v])
}

function upstreamHeaders() {
  const headers = { Accept: 'application/json', 'User-Agent': 'OnStock tracker' }
  const key = process.env.COINGECKO_API_KEY
  if (key) headers['x-cg-demo-api-key'] = key
  return headers
}

function failWithRetry(res, status, error, seconds) {
  res.setHeader('Retry-After', String(seconds))
  return res.status(status).json({ error })
}

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  if (refuseForeignOrigin(req, res)) return
  applyCors(req, res)
  res.setHeader('Access-Control-Expose-Headers', 'Retry-After')
  // Every answer is a failure until the one success below says otherwise.
  res.setHeader('Cache-Control', 'no-store')
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return

  const client = perClient.take(clientKey(req))
  if (!client.ok) return sendTooManyRequests(res, client.retryAfter)

  const { id, days } = req.query
  if (!isAllowedCoin(id) || !DAYS.has(days)) return res.status(400).json({ error: 'bad request' })

  const now = Date.now()
  if (now < upstreamBlockedUntil) {
    return failWithRetry(res, 503, 'busy', Math.ceil((upstreamBlockedUntil - now) / 1000))
  }
  const instance = perInstance.take('all', now)
  if (!instance.ok) return failWithRetry(res, 503, 'busy', instance.retryAfter)

  let upstream
  try {
    upstream = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
      { headers: upstreamHeaders(), signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
    )
  } catch {
    return failWithRetry(res, 502, 'upstream unreachable', DEFAULT_RETRY_AFTER_S)
  }

  const retryAfter = retryAfterSeconds(upstream.headers?.get?.('retry-after'))
  if (upstream.status === 429) {
    upstreamBlockedUntil = Date.now() + retryAfter * 1000
    return failWithRetry(res, 503, 'busy', retryAfter)
  }
  if (upstream.status === 404) return res.status(404).json({ error: 'not found' })
  if (!upstream.ok) return failWithRetry(res, 502, 'upstream error', retryAfter)

  let json
  try {
    json = await upstream.json()
  } catch {
    return failWithRetry(res, 502, 'upstream error', DEFAULT_RETRY_AFTER_S)
  }
  res.setHeader('Cache-Control', CACHE[days])
  return res.status(200).json({ prices: pointsFrom(json) })
}
