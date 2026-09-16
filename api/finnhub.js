// Vercel serverless function: Finnhub proxy.
// Keeps the API key server-side (env FINNHUB_API_KEY, no VITE_ prefix — never
// bundled into the client). Only allowlisted read-only endpoints pass through,
// and responses are CDN-cached so many visitors share one upstream call.
//
// Three gates stand between a stranger and Finnhub's shared 60/min free tier:
// the query allowlist (./_params.js), the symbol allowlist (./_symbols.js),
// and the buckets below (./_rateLimit.js, best-effort and per-instance — read
// that file before trusting the numbers).
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
// 4/s refill is several times the busiest honest minute and still a hard stop
// on a script. Only CACHE MISSES ever reach here: a request Vercel's edge can
// answer never runs this function, which is exactly the traffic we want to
// leave alone.
const perClient = createRateLimiter({ capacity: 240, refillPerSecond: 4 })

// Circuit breaker on the whole instance, spent only on calls that actually go
// upstream. The per-caller bucket above is keyed on a header, and any per-IP
// scheme is only as good as that key; this one cannot be split by forging
// anything. Sized at ten times Finnhub's entire 60/min free tier so it never
// touches real traffic — it exists to stop one instance being turned into an
// unbounded relay, not to ration the quota.
const perInstance = createRateLimiter({ capacity: 600, refillPerSecond: 10, maxKeys: 1 })

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
