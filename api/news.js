// Vercel serverless function: Google News RSS relay. Two lanes.
//
// ?symbol=NVDA  — company headlines for one ticker. Relays the XML untouched;
//                 parsing and the credible-source whitelist live client-side
//                 (see services/stocks.js). Unchanged since it shipped.
//
// ?topic=tokenized — the tokenization beat. Fans out to several queries and
//                 returns merged JSON, because one query is not enough: on
//                 2026-08-20 a single merged OR query yielded 4 usable items
//                 in seven days with nothing newer than 52 hours, while six
//                 separate queries yielded 11. Google returns 100
//                 relevance-ranked items per query and the long tails differ.
//                 Merging means parsing, and Node has no DOMParser — hence
//                 ./_rss.js. The client still owns the whitelist.
//
// Doing the fan-out here rather than in the client turns six round trips into
// one, and caches as a single edge object instead of six.
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js). Same-origin web calls are
// unaffected.

import { applyCors, handlePreflight, setCacheControl } from './_cors.js'
import { rejectUnknownParams } from './_params.js'
import { parseRssItems } from './_rss.js'

const ALLOWED_PARAMS = new Set(['symbol', 'topic', 'c'])

// Topic keys map to fixed queries. NEVER accept a free-text query: it would
// make this an open relay for arbitrary Google searches, and unbound the
// edge-cache key the same way an unknown param does (see ./_params.js).
const TOPIC_QUERIES = Object.freeze({
  tokenized: Object.freeze([
    '"tokenized stocks"',
    '"tokenized equities"',
    '"tokenized securities"',
    'xStocks',
    '"Ondo Finance"',
    'tokenization SEC equities',
  ]),
})

const CACHE = 's-maxage=1800, stale-while-revalidate=7200'
const MAX_AGE_MS = 7 * 86_400_000
const MAX_ITEMS = 120

const feedUrl = (query) =>
  `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  const originScoped = applyCors(req, res)
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return

  const hasSymbol = req.query.symbol != null
  const hasTopic = req.query.topic != null
  // Exactly one lane. Both would be ambiguous; neither has nothing to fetch.
  if (hasSymbol === hasTopic) {
    return res.status(400).json({ error: 'bad request' })
  }

  return hasTopic ? topicLane(req, res, originScoped) : symbolLane(req, res, originScoped)
}

async function symbolLane(req, res, originScoped) {
  const symbol = String(req.query.symbol ?? '')
  if (!/^[A-Z0-9.\-]{1,10}$/i.test(symbol)) {
    return res.status(400).json({ error: 'bad request' })
  }
  try {
    const upstream = await fetch(feedUrl(`"${symbol}" stock`))
    if (!upstream.ok) return res.status(upstream.status).send('upstream error')
    const xml = await upstream.text()
    setCacheControl(res, CACHE, originScoped)
    res.setHeader('Content-Type', 'application/xml; charset=utf-8')
    return res.status(200).send(xml)
  } catch {
    return res.status(502).send('upstream unreachable')
  }
}

async function topicLane(req, res, originScoped) {
  const topic = String(req.query.topic ?? '')
  const queries = TOPIC_QUERIES[topic]
  if (!queries) return res.status(400).json({ error: 'bad request' })

  // allSettled, not all: one flaky leg should shrink the feed, not empty it.
  const settled = await Promise.allSettled(
    queries.map(async (q) => {
      const upstream = await fetch(feedUrl(q))
      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`)
      return parseRssItems(await upstream.text())
    })
  )
  const ok = settled.filter((s) => s.status === 'fulfilled')
  if (ok.length === 0) return res.status(502).send('upstream unreachable')

  // Dedupe by headline, since the queries overlap heavily by design. The cap
  // and the 7-day window are payload hygiene, not editorial filtering — the
  // credible-source whitelist stays client-side so both lanes decide alike.
  const cutoff = Date.now() - MAX_AGE_MS
  const seen = new Set()
  const items = []
  for (const { value } of ok) {
    for (const item of value) {
      if (!item.url || !item.headline || item.at < cutoff) continue
      const key = item.headline.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      items.push(item)
    }
  }
  items.sort((a, b) => b.at - a.at)

  setCacheControl(res, CACHE, originScoped)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  return res.status(200).json({ items: items.slice(0, MAX_ITEMS) })
}
