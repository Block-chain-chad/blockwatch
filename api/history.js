// Vercel serverless function: stock price history proxy (Yahoo chart endpoint —
// no key required upstream, but the browser can't call it directly due to CORS).
// Production replacement for the dev-only Vite /yfin proxy.
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js). Same-origin web calls are
// unaffected.

import { applyCors, handlePreflight, refuseForeignOrigin } from './_cors.js'
import { rejectUnknownParams } from './_params.js'
import { isAllowedYahooSymbol } from './_symbols.js'
import { clientKey, createRateLimiter, sendTooManyRequests } from './_rateLimit.js'

// Exported so src/lib/candles.js can keep its client-side mirror in sync
// (a test compares the two); the handler itself is unchanged.
export const INTERVALS = new Set(['5m', '30m', '1d'])
export const RANGES = new Set(['1d', '5d', '1mo', '3mo', '1y'])

const ALLOWED_PARAMS = new Set(['symbol', 'interval', 'range', 'c'])

// Per-caller ceiling. Best-effort and PER INSTANCE — read ./_rateLimit.js
// before quoting these numbers at anyone; Vercel running several instances
// means several 60-call budgets, and a cold start forgets every bucket.
//
// Sized against what a person actually does. One chart view is one call, held
// for five minutes by the client's own cache (src/services/stocks.js), and
// changing the range or the interval costs one more. Clicking through twenty
// symbols in a minute is a busy human at twenty calls. 60 burst refilling at
// 1/second is three times that and still bounds a script to 60 a minute per
// instance instead of as many as it can open sockets for.
//
// Only CACHE MISSES reach here: a request the edge can answer never runs this
// function, so ordinary traffic never spends a token.
//
// There is deliberately NO per-instance breaker on this endpoint, unlike
// api/finnhub.js. That breaker exists to protect a shared 60/min Finnhub
// quota whose exhaustion blanks the share price for every user at once.
// Yahoo's chart endpoint is keyless and has no quota of ours to drain, so the
// only loss here is Vercel invocations — and a breaker would answer that by
// refusing charts to innocent users, which is a worse outcome than the cost it
// saves. The symbol allowlist is what bounds this endpoint: it caps the
// edge-cache key space at (459 symbols x 3 intervals x 5 ranges), where the
// old 1-10 character pattern left it unbounded.
const perClient = createRateLimiter({ capacity: 60, refillPerSecond: 1 })

// Exported for the tests, which need a known-empty bucket per case.
export const limiters = { perClient }

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  if (refuseForeignOrigin(req, res)) return
  applyCors(req, res)
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return

  const client = perClient.take(clientKey(req))
  if (!client.ok) return sendTooManyRequests(res, client.retryAfter)

  const { symbol, interval, range } = req.query
  // Exact match against the Yahoo spelling of a symbol the app can display —
  // the client rewrites BRK.B to BRK-B before calling, so BRK-B is what the
  // allowlist holds. See api/_symbols.js for why the old shape check was a
  // free way to mint unbounded cache keys.
  if (!isAllowedYahooSymbol(symbol) || !INTERVALS.has(interval) || !RANGES.has(range)) {
    return res.status(400).json({ error: 'bad request' })
  }

  try {
    const upstream = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (OnStock tracker)' } }
    )
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'upstream error' })
    const data = await upstream.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(data)
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' })
  }
}
