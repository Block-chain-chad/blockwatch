# Tokenization news feed + Learn the basics expansion

Design spec, approved in conversation 2026-08-20 (user: "looks good to me").
Fixes the empty News tab with a source-vetted feed about the tokenized-equity
market, and adds three explainer cards.

## Problems being fixed

1. **The News tab renders no headlines.** Not a bug. `News.jsx` gates the mock
   `newsFeed` behind `import.meta.env.DEV`, with a comment stating it must never
   ship — the deliberate removal of invented headlines credited to real outlets.
   In production the tab is DailyDigest + alert events (empty until the user
   creates an alert rule) + LearnCards. It reads as broken.
2. **A working pipeline exists but the tab does not use it.** `getCompanyNews`
   fetches Google News RSS via `/api/news`, applies a ranked credible-source
   whitelist, falls back to Finnhub, dedupes, caps to 7 days. It powers
   "Latest {underlying} news" on AssetDetail only.
3. **That pipeline cannot serve this beat.** Two hard blockers:
   - `/api/news` accepts only `symbol`, validated `/^[A-Z0-9.\-]{1,10}$/i`, and
     hardcodes the query as `"{symbol}" stock`. Topic queries are impossible.
   - The existing whitelist rejects essentially all tokenization coverage.
     Measured 2026-08-20: across 50 sampled headlines from five tokenization
     queries, ZERO came from Bloomberg/Reuters/FT/WSJ; only Yahoo Finance's 3
     would pass. Reused unchanged it yields an empty tab for a new reason.

## Measured baseline (2026-08-20)

| Configuration | Unique, last 7d | Last 24h |
|---|---|---|
| Single merged OR query, strict whitelist | 4 | 0 |
| Six separate queries, strict whitelist | 11 | 3 |
| Six queries, wider whitelist (+10 outlets) | 17 | 3 |

Consequences that shape the design:

- **Six separate queries, not one merged OR query.** Google returns 100
  relevance-ranked items per query; separate queries surface different long
  tails. The merged query yielded 4 items, nothing newer than 52 hours.
- **This beat is not daily.** ~2-3 quality items/day, 11-17/week. The section is
  named "The tokenization beat" and uses relative timestamps. "Today in..."
  would over-promise, and that name already belongs to DailyDigest
  (`DailyDigest.jsx:89`), which the user explicitly likes.
- **Strict whitelist over wider.** 11/week fills the section, and source
  reliability is the stated priority. Widening is a one-line change later.

## Changes

### S1 — `api/news.js`: topic fan-out

- `ALLOWED_PARAMS` becomes `{'symbol', 'topic', 'c'}`. Exactly one of
  symbol/topic must be present; both or neither returns 400.
- `TOPIC_QUERIES`, a frozen map of topic key to query array. Only `tokenized`
  initially: `"tokenized stocks"`, `"tokenized equities"`,
  `"tokenized securities"`, `xStocks`, `"Ondo Finance"`,
  `tokenization SEC equities`.
- `topic` validated against `Object.keys(TOPIC_QUERIES)`. NEVER free text —
  free text makes this an open relay and unbounds the cache key.
- Fan out with `Promise.allSettled`; a failed leg is skipped, not fatal. All
  six failing returns 502.
- Parse server-side (Node has no `DOMParser`), normalize to
  `{ id, headline, source, url, at }`, dedupe by lowercased headline, drop
  older than 7 days, sort by `at` descending, cap at 120. The cap is payload
  hygiene, not editorial filtering.
- Respond `application/json`. Cache headers unchanged:
  `s-maxage=1800, stale-while-revalidate=7200` via `setCacheControl`.
- The `symbol` branch is untouched and still relays raw XML.

### S2 — `api/_rss.js`: shared parser (new file)

`parseRssItems(xml)` extracting `item` blocks and `title`, `link`, `guid`,
`pubDate`, `source`, dependency-free — no new production dependency in a
serverless function, since the repo keeps `npm audit` clean and recently
patched a transitive advisory. Tolerates CDATA, HTML entities, missing
`source`, and strips Google's `" - Source"` title suffix (source gets its own
byline). Unit-tested against a captured fixture.

### C1 — `services/stocks.js`: separate whitelist and fetcher

- **`TOKEN_NEWS_SOURCE_RANK`, a NEW map. Do not extend `NEWS_SOURCE_RANK`** —
  extending the shared map leaks crypto trade press into "Latest NVIDIA news"
  on asset pages, a different beat with a different bar. Wires keep top rank so
  Reuters wins when it covers this:
  reuters 5, bloomberg 5, financial times 5, wall street journal 5, cnbc 4,
  axios 4, coindesk 3, the block 3, fortune 3, decrypt 2, forkast 2,
  forkast.news 2, finance magnates 2, crowdfund insider 2, crypto briefing 2.
  Anything absent scores 0 and is dropped, so exchange blogs (Kraken Blog,
  Bitget), issuer PR (Ondo Finance) and SEO farms (CryptoRank, Cryptonews.net,
  eciks.org, Startup Fortune, Altcoin Buzz, Pluang, bloomingbit) need no
  separate blocklist.
- **`getTokenizationNews()`**, mirroring `getCompanyNews`'s 30-minute cache:
  - prod: one call to `${API_BASE}/api/news?topic=tokenized${API_CACHE_SUFFIX}`
  - dev: fan out to the six queries through the existing `/gnews` vite proxy and
    normalize client-side, so dev needs no Vercel function
  - both then run identical client logic: drop rank 0, dedupe by lowercased
    headline KEEPING THE HIGHEST-RANKED source, sort newest-first, slice to 15.
- Ordering differs from `dedupeRankSlice`, which sorts rank-first. A feed is
  chronological; rank decides inclusion and which duplicate survives, not
  position. Hence a separate function rather than reuse.
- Extract the RSS-item normalizer currently inlined in `fetchGoogleNews` so both
  fetchers share one implementation.

### U1 — `components/TokenizationNews.jsx` (new)

- Heading "The tokenization beat", matching existing section headers
  (`t-micro`, bottom border, `var(--border-subtle)`).
- Rows reuse AssetDetail's exact pattern: `<a href target="_blank"
  rel="noopener noreferrer">`, headline `line-clamp-2`, then
  `{source} · {timeAgo(at)}`.
- Loading: the existing animate-pulse skeleton block.
- **Empty or errored: render `null`.** The section disappears rather than
  apologising, consistent with DailyDigest returning null.
- Footer note: "Coverage of the tokenized-equity market. Links open the
  source." — mirrors AssetDetail's equivalent line.

### U2 — `screens/News.jsx`

Insert `<TokenizationNews />` between `<DailyDigest />` and the alerts heading.
Nothing else moves. The tab's unread dot stays alerts-only; wiring it to news
would leave it permanently lit.

### L1 — `components/LearnCards.jsx`: three new lessons

Appended to `LESSONS`, same one-concept-per-card, tap-to-read pattern:

1. **"What's a basis point?"** — DailyDigest renders "62bp" at an audience
   assumed to have zero finance background. 100bp = 1%; why small gaps are
   quoted in bp at all.
2. **"What if the issuer goes under?"** — custody and counterparty risk told
   straight: the share sits with a licensed custodian, what the token is a
   claim on, what that does and does not protect against.
3. **"Who actually holds my money?"** — BlockWatch never touches funds; the app
   is a tracker; buying routes out to Jupiter; non-custodial means the keys stay
   with the user.

## Error handling

- A failed fan-out leg is skipped silently; the feed degrades in size, not
  availability.
- Total upstream failure returns 502; the client catches and the section renders
  null. No error state shown — a missing section is quieter and more honest than
  an error box on a secondary surface.
- No Finnhub fallback here. Finnhub's company-news endpoint is per-symbol and
  has nothing to say about this beat.

## Testing

- `api/_rss.js`: unit tests over a captured fixture — CDATA, entity-escaped
  titles, missing `source`, absent `pubDate`, the `" - Source"` suffix strip.
- `api/news.js`: unknown topic 400, both params 400, neither 400, valid topic
  200 JSON; existing `symbol` behaviour unchanged.
- `services/stocks.js`: rank-0 dropped; duplicate headline keeps the
  higher-ranked source; output newest-first; slice at 15.
- Existing suite is 64 tests and must stay green.

## Non-goals

- **Navigation changes.** Deferred by agreement; content should settle before
  the shell around it is reworked.
- **Company news on the News tab.** Already works on asset pages, and the stated
  intent is topic coverage: "staying on the topic of tokenized because that is
  my whole app."
- **A labelled issuer/exchange "Announcements" strip.** Considered and declined
  this round. Revisit if the feed proves thin.

## Future upgrade path

The 11-17 items/week ceiling is a property of free Google News RSS plus a strict
whitelist, not of this design. The user intends to pay for better services once
the venture has revenue. A paid news API (Benzinga, Polygon.io, or a wire feed)
raises both cadence and reliability and slots in behind `getTokenizationNews()`
without touching the UI — the component consumes
`{ id, headline, source, url, at }` and does not care where it came from.
Widening `TOKEN_NEWS_SOURCE_RANK` is the free interim lever.
