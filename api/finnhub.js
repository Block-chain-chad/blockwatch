// Vercel serverless function: Finnhub proxy.
// Keeps the API key server-side (env FINNHUB_API_KEY, no VITE_ prefix — never
// bundled into the client). Only allowlisted read-only endpoints pass through,
// and responses are CDN-cached so many visitors share one upstream call.
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js). Same-origin web calls are
// unaffected.

import { applyCors, handlePreflight, setCacheControl } from './_cors.js'
import { rejectUnknownParams } from './_params.js'

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

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return
  const originScoped = applyCors(req, res)

  const { kind, symbol } = req.query
  const spec = ALLOWED[kind]
  const key = process.env.FINNHUB_API_KEY
  if (!spec || !symbol || !/^[A-Z0-9.\-]{1,10}$/i.test(symbol)) {
    return res.status(400).json({ error: 'bad request' })
  }
  if (!key) return res.status(503).json({ error: 'stock feed not configured' })

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
