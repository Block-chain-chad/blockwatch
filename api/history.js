// Vercel serverless function: stock price history proxy (Yahoo chart endpoint —
// no key required upstream, but the browser can't call it directly due to CORS).
// Production replacement for the dev-only Vite /yfin proxy.

const INTERVALS = new Set(['5m', '30m', '1d'])
const RANGES = new Set(['1d', '5d', '1mo', '3mo', '1y'])

export default async function handler(req, res) {
  const { symbol, interval, range } = req.query
  if (!symbol || !/^[A-Z0-9.\-]{1,10}$/i.test(symbol) || !INTERVALS.has(interval) || !RANGES.has(range)) {
    return res.status(400).json({ error: 'bad request' })
  }

  try {
    const upstream = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (BlockWatch tracker)' } }
    )
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'upstream error' })
    const data = await upstream.json()
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    return res.status(200).json(data)
  } catch {
    return res.status(502).json({ error: 'upstream unreachable' })
  }
}
