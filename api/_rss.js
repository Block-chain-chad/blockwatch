// Minimal RSS item extraction for Google News feeds.
//
// Server-side because the topic feed merges SIX feeds into one response, and
// merging means parsing — Node has no DOMParser, and the per-symbol lane keeps
// relaying raw XML for the client to parse with one.
//
// Hand-rolled rather than pulling in an XML library: this parses exactly one
// machine-generated feed shape, every field is validated downstream anyway,
// and a serverless function is the last place to widen the dependency tree
// (npm audit is kept clean here; a transitive advisory was patched 2026-08-05).

const CDATA = /^<!\[CDATA\[([\s\S]*?)\]\]>$/

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
}

/** CDATA unwrap + the handful of entities Google actually emits. */
function decode(raw) {
  if (!raw) return ''
  const inner = raw.match(CDATA)
  const text = (inner ? inner[1] : raw).trim()
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (m, name) => ENTITIES[name] ?? m)
    .trim()
}

/** First <tag>…</tag> inside a chunk, attributes tolerated. */
function tag(chunk, name) {
  const m = chunk.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return m ? decode(m[1]) : ''
}

/**
 * [{ id, headline, source, url, at }] — `at` is epoch ms, 0 when unparseable.
 *
 * Google appends " - Source" to every title; it is stripped because the source
 * gets its own byline and would otherwise read twice on one row.
 *
 * No filtering happens here. Recency, the credible-source whitelist and dedupe
 * are the caller's decisions, and the two lanes want different ones.
 */
export function parseRssItems(xml) {
  if (typeof xml !== 'string' || !xml) return []
  const items = xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? []
  return items.map((chunk) => {
    const source = tag(chunk, 'source')
    const rawTitle = tag(chunk, 'title')
    const suffix = ` - ${source}`
    const headline =
      source && rawTitle.toLowerCase().endsWith(suffix.toLowerCase())
        ? rawTitle.slice(0, rawTitle.length - suffix.length).trim()
        : rawTitle
    const url = tag(chunk, 'link')
    return {
      id: tag(chunk, 'guid') || url,
      headline,
      source,
      url,
      at: Date.parse(tag(chunk, 'pubDate')) || 0,
    }
  })
}
