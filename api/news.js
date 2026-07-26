// Vercel serverless function: Google News RSS relay for company headlines.
// Google News indexes the major wires (Bloomberg, Reuters, CNBC, WSJ…) and
// its RSS endpoint is free, but browsers can't fetch it directly (no CORS
// headers) — so this relays the XML with CDN caching. Parsing and the
// credible-source whitelist live client-side (see services/stocks.js).
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js). Same-origin web calls are
// unaffected.

import { applyCors, handlePreflight, setCacheControl } from './_cors.js'

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  const originScoped = applyCors(req, res)

  const symbol = String(req.query.symbol ?? '')
  if (!/^[A-Z0-9.\-]{1,10}$/i.test(symbol)) {
    return res.status(400).json({ error: 'bad request' })
  }
  try {
    const q = encodeURIComponent(`"${symbol}" stock`)
    const upstream = await fetch(
      `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`
    )
    if (!upstream.ok) return res.status(upstream.status).send('upstream error')
    const xml = await upstream.text()
    setCacheControl(res, 's-maxage=1800, stale-while-revalidate=7200', originScoped)
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    return res.status(200).send(xml)
  } catch {
    return res.status(502).send('upstream unreachable')
  }
}
