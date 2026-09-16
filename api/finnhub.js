// Vercel serverless function: Finnhub proxy.
// Keeps the API key server-side (env FINNHUB_API_KEY, no VITE_ prefix — never
// bundled into the client). Only allowlisted read-only endpoints pass through,
// and responses are CDN-cached so many visitors share one upstream call.
//
// Three gates stand between a stranger and Finnhub's shared 60/min free tier:
// the query allowlist (./_params.js), the symbol allowlist (./_symbols.js),
// and the buckets below (./_rateLimit.js, best-effort and per-instance — read
// that file before trusting the numbers). The last of those is sized to the
// quota itself, so it is the one that decides how much of Finnhub's minute
// this instance can ever spend.
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js). Same-origin web calls are
// unaffected.

import { applyCors, handlePreflight, setCacheControl } from './_cors.js'
import { rejectUnknownParams } from './_params.js'
import { isAllowedSymbol } from './_symbols.js'
import { clientKey, createRateLimiter, sendTooManyRequests } from './_rateLimit.js'

const ALLOWED = {
  // 180s shared cache: ~50 polled symbols become ~17 upstream calls/min per
  // edge-cache copy, so several concurrent tester regions fit Finnhub's
  // 60/min free tier. The client's UpdatedAgo pulse shows the honest age.
  quote: { path: '/quote', cache: 's-maxage=180, stale-while-revalidate=600' },
  profile: { path: '/stock/profile2', cache: 's-maxage=86400, stale-while-revalidate=86400' },
  recommendation: { path: '/stock/recommendation', cache: 's-maxage=21600, stale-while-revalidate=86400' },
  earnings: { path: '/stock/earnings', cache: 's-maxage=21600, stale-while-revalidate=86400' },
  // company-news gets its date window computed server-side (last 7 days)
  news: { path: '/company-news', cache: 's-maxage=1800, stale-while-revalidate=3600' },
  // key statistics (P/E, EPS, 52-week range, beta…) for the detail screen
  metric: { path: '/stock/metric', cache: 's-maxage=21600, stale-while-revalidate=86400' },
}

const ALLOWED_PARAMS = new Set(['kind', 'symbol', 'c'])

// Per-caller ceiling. A cold Board load asks for up to CANDIDATE_CAP (150)
// underlyings at once and a detail screen adds five more calls, so 240 with a
// 4/s refill is several times the busiest honest minute. Only CACHE MISSES
// ever reach here: a request Vercel's edge can answer never runs this
// function, which is exactly the traffic we want to leave alone.
//
// This is a fair-use gate, NOT the quota's defence. It is keyed on a header a
// caller controls, and 240/min from one address is four times Finnhub's whole
// minute — the breaker below is what actually stops that.
const perClient = createRateLimiter({ capacity: 240, refillPerSecond: 4 })

// THE QUOTA'S CEILING. Spent only on calls that actually go upstream, and
// keyed on a constant, so unlike the bucket above it cannot be split by
// forging or rotating anything.
//
// Sized at Finnhub's real free tier: 60 calls burst, refilling at 1/second.
// It used to sit at 600/min — ten times the entire quota — which left the
// per-caller bucket as the only thing in the way of one address spending
// everybody's minute four times over.
//
// Honest about what this is worth: the bucket is per INSTANCE (see
// ./_rateLimit.js), so Vercel running several instances means several
// 60/minute budgets. It is a floor on the damage, not a global quota. What it
// does guarantee is that no single instance can be turned into an unbounded
// relay onto a 60/minute upstream.
//
// The cost, stated plainly: on a genuinely COLD edge cache a 150-symbol Board
// load produces 150 misses, and everything past the first 60 now gets a 429
// from us. It used to get a 429 from Finnhub instead, having already spent
// the quota for every other user — so this is the same wall, reached more
// cheaply and without taking prices down for everyone else.
const perInstance = createRateLimiter({ capacity: 60, refillPerSecond: 1, maxKeys: 1 })

// Exported for the tests, which need a known-empty bucket per case.
export const limiters = { perClient, perInstance }

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  const originScoped = applyCors(req, res)
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return

  const client = perClient.take(clientKey(req))
  if (!client.ok) return sendTooManyRequests(res, client.retryAfter)

  const { kind, symbol } = req.query
  const spec = ALLOWED[kind]
  const key = process.env.FINNHUB_API_KEY
  // Exact symbol match, not a shape check: see api/_symbols.js for why the
  // old 1-10 character pattern was a free way to drain the quota.
  if (!spec || !isAllowedSymbol(symbol)) {
    return res.status(400).json({ error: 'bad request' })
  }
  if (!key) return res.status(503).json({ error: 'stock feed not configured' })

  const instance = perInstance.take('all')
  if (!instance.ok) return sendTooManyRequests(res, instance.retryAfter)

  let extra = ''
  if (kind === 'news') {
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
    extra = `&from=${from}&to=${to}`
  }
  if (kind === 'metric') extra = '&metric=all'

  try {
    const upstream = await fetch(
      `https://finnhub.io/api/v1${spec.path}?symbol=${encodeURIComponent(symbol)}${extra}&token=${key}`
    )
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'upstream error' })
    const data = await upstream.json()
    setCacheControl(res, spec.cache, originScoped)
    return res.status(200).json(data)
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' })
  }
}
