import { describe, it, expect } from 'vitest'
import { parseRssItems } from './_rss.js'

/*
 * Fixtures mirror what Google News actually emits: CDATA-wrapped titles,
 * entity-escaped punctuation, the " - Source" suffix on every headline, and
 * the occasional item missing a <source> or <pubDate> entirely.
 *
 * These are cheap tests for a silent failure mode. A parser that half-works
 * does not throw, it just quietly drops headlines or leaves "Reuters" printed
 * twice on one row.
 */

const feed = `<?xml version="1.0"?><rss version="2.0"><channel>
<title>Google News</title>
<item>
  <title>SEC proposes first major crypto rule - CoinDesk</title>
  <link>https://example.com/a</link>
  <guid isPermaLink="false">tag:news,a</guid>
  <pubDate>Wed, 19 Aug 2026 14:03:00 GMT</pubDate>
  <source url="https://coindesk.com">CoinDesk</source>
</item>
<item>
  <title><![CDATA[Ondo&#39;s tokenized equities top $1B - The Block]]></title>
  <link>https://example.com/b</link>
  <guid isPermaLink="false">tag:news,b</guid>
  <pubDate>Tue, 18 Aug 2026 09:00:00 GMT</pubDate>
  <source url="https://theblock.co">The Block</source>
</item>
<item>
  <title>Kraken &amp; xStocks expand in Europe</title>
  <link>https://example.com/c</link>
</item>
</channel></rss>`

describe('parseRssItems', () => {
  const items = parseRssItems(feed)

  it('extracts every item', () => {
    expect(items).toHaveLength(3)
  })

  it('strips the " - Source" suffix Google appends to titles', () => {
    expect(items[0].headline).toBe('SEC proposes first major crypto rule')
    expect(items[0].source).toBe('CoinDesk')
  })

  it('unwraps CDATA and decodes numeric entities', () => {
    expect(items[1].headline).toBe("Ondo's tokenized equities top $1B")
  })

  it('decodes named entities and leaves the title alone when there is no source', () => {
    expect(items[2].headline).toBe('Kraken & xStocks expand in Europe')
    expect(items[2].source).toBe('')
  })

  it('parses pubDate to epoch ms, and yields 0 when absent', () => {
    expect(items[0].at).toBe(Date.parse('Wed, 19 Aug 2026 14:03:00 GMT'))
    expect(items[1].at).toBeGreaterThan(0)
    expect(items[2].at).toBe(0)
  })

  it('falls back to the link when guid is missing', () => {
    expect(items[0].id).toBe('tag:news,a')
    expect(items[2].id).toBe('https://example.com/c')
  })

  it('survives junk input without throwing', () => {
    expect(parseRssItems('')).toEqual([])
    expect(parseRssItems(null)).toEqual([])
    expect(parseRssItems('<rss><channel></channel></rss>')).toEqual([])
    expect(parseRssItems('<item><title>unclosed')).toEqual([])
  })

  it('does not strip a suffix that merely resembles the source', () => {
    const odd = parseRssItems(
      `<item><title>Reuters wins award - Bloomberg</title><link>u</link><source>Reuters</source></item>`
    )
    expect(odd[0].headline).toBe('Reuters wins award - Bloomberg')
  })
})
