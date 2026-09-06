// Vercel serverless function: stock price history proxy (Yahoo chart endpoint —
// no key required upstream, but the browser can't call it directly due to CORS).
// Production replacement for the dev-only Vite /yfin proxy.
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js). Same-origin web calls are
// unaffected.

import { applyCors, handlePreflight, setCacheControl } from './_cors.js'
import { rejectUnknownParams } from './_params.js'

// Exported so src/lib/candles.js can keep its client-side mirror in sync
// (a test compares the two); the handler itself is unchanged.
export const INTERVALS = new Set(['5m', '30m', '1d'])
export const RANGES = new Set(['1d', '5d', '1mo', '3mo', '1y'])

const ALLOWED_PARAMS = new Set(['symbol', 'interval', 'range', 'c'])

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  const originScoped = applyCors(req, res)
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return

  const { symbol, interval, range } = req.query
  if (!symbol || !/^[A-Z0-9.\-]{1,10}$/i.test(symbol) || !INTERVALS.has(interval) || !RANGES.has(range)) {
    return res.status(400).json({ error: 'bad request' })
  }

  try {
    const upstream = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (OnStock tracker)' } }
    )
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'upstream error' })
    const data = await upstream.json()
    setCacheControl(res, 's-maxage=300, stale-while-revalidate=600', originScoped)
    return res.status(200).json(data)
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' })
  }
}
