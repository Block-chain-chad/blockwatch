// Real stock price service, abstracted so the provider is swappable.
//
// Providers:
//  - finnhub: primary (per the brief). Free tier = 60 calls/min; we need ~25
//    per cycle. Activated by VITE_FINNHUB_API_KEY in .env.local.
//  - yahoo-dev: keyless fallback for local dev only — hits Yahoo's public quote
//    endpoint through the Vite dev-server proxy (see vite.config.js) because
//    Yahoo doesn't send CORS headers. Production replaces this with the edge
//    proxy (later step) or a Finnhub key.
//
// Returned shape per ticker: { price, basis, prevClose, asOf }.
//  - asOf is the ms epoch the PROVIDER stamped on the quote, or null. Never
//    the time we fetched it: our own proxy serves quotes up to ~15 minutes old
//    (api/finnhub.js caches 300s with a 600s stale-while-revalidate window),
//    so fetch time would understate a quote's age by exactly the amount that
//    matters. A quote we cannot date is shown as undated, never as "now".
//  - basis is 'trade' when the provider gave a traded price, 'prevClose' when
//    the only number it had was yesterday's close. Falling back to the close
//    is fine; presenting it as today's price is not, so the caller is told.

// API_CACHE_SUFFIX is '' on web (URLs unchanged) and '&c=app' on native, which
// puts native requests in their own edge-cache lane — see apiBase.js.
import { API_BASE, API_CACHE_SUFFIX } from './apiBase'

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY
// In production every stock call goes through our own /api serverless proxy
// (key server-side, responses CDN-cached). Dev talks to providers directly.
const IS_PROD = import.meta.env.PROD
// v2: quotes gained `basis` and an honest `asOf` (null rather than fetch
// time). v1 rows would claim a freshness they never had, so they are dropped.
const CACHE_KEY = 'bw.stockCache.v2'

export const STOCK_POLL_MS = 60_000
// When the market is closed, prices don't move — refetch at most this often.
export const CLOSED_MARKET_REFRESH_MS = 30 * 60_000

/** Which provider the live share quote comes from, for the Readout's leg line. */
export const STOCK_QUOTE_SOURCE = IS_PROD || FINNHUB_KEY ? 'Finnhub' : 'Yahoo Finance'

/**
 * Finnhub's /quote payload → our quote shape. Shared by the direct dev call
 * and the production proxy, which return the same body.
 *
 * `c` is the current price and `t` its unix second. When `c` is missing we
 * still show `pc` so the board is not blank, but the quote says so: basis
 * 'prevClose', and no timestamp is invented for it.
 */
function fromFinnhub(q) {
  const traded = q.c || null
  const prevClose = q.pc ?? null
  const price = traded ?? prevClose
  if (!price) throw new Error('empty quote')
  return {
    price,
    basis: traded ? 'trade' : 'prevClose',
    prevClose,
    open: q.o || null,
    dayHigh: q.h || null,
    dayLow: q.l || null,
    asOf: traded && q.t ? q.t * 1000 : null,
  }
}

/**
 * The error a refused quote throws, tagged so callers can tell "ask again in a
 * moment" apart from "this symbol has no price".
 *
 * A 429 says nothing about the symbol. It comes from api/finnhub.js's own
 * buckets (or Finnhub's), which refill in seconds, and every one of them is
 * either per-caller or per-instance — so a shared office or carrier address
 * cold-loading two boards at once can collect them for symbols that are
 * perfectly fine. Treated as an ordinary failure it reads as "no quote", and
 * the rotation does not come back to that symbol for a full cycle, which is
 * three minutes on a wide Board. Tagging it lets the caller retry instead.
 */
function refused(status) {
  const err = new Error(`quote ${status}`)
  err.rateLimited = true
  return err
}

async function fetchFinnhub(ticker) {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`
  )
  if (res.status === 429) throw refused(res.status)
  if (!res.ok) throw new Error(`Finnhub ${res.status}`)
  return fromFinnhub(await res.json())
}

async function fetchYahooDev(ticker) {
  const symbol = ticker.replace('.', '-') // Yahoo uses BRK-B, Finnhub BRK.B
  const res = await fetch(`/yfin/v8/finance/chart/${symbol}?interval=1d&range=1d`)
  if (!res.ok) throw new Error(`Yahoo ${res.status}`)
  const json = await res.json()
  const meta = json?.chart?.result?.[0]?.meta
  if (!meta?.regularMarketPrice) throw new Error('Yahoo: empty quote')
  return {
    price: meta.regularMarketPrice,
    basis: 'trade',
    prevClose: meta.chartPreviousClose ?? null,
    open: null, // not in Yahoo's chart meta — dev-only fallback, rows cope
    dayHigh: meta.regularMarketDayHigh ?? null,
    dayLow: meta.regularMarketDayLow ?? null,
    asOf: meta.regularMarketTime ? meta.regularMarketTime * 1000 : null,
  }
}

async function fetchApiQuote(ticker) {
  const res = await fetch(
    `${API_BASE}/api/finnhub?kind=quote&symbol=${encodeURIComponent(ticker)}${API_CACHE_SUFFIX}`
  )
  if (res.status === 429) throw refused(res.status)
  if (!res.ok) throw new Error(`quote ${res.status}`)
  return fromFinnhub(await res.json())
}

const fetchQuote = IS_PROD ? fetchApiQuote : FINNHUB_KEY ? fetchFinnhub : fetchYahooDev

/**
 * Fetch many tickers with limited concurrency. Individual failures are
 * tolerated (missing from the result) so one bad symbol can't blank the board.
 *
 * Returns { quotes, rateLimited }:
 *   quotes      { [ticker]: { price, basis, prevClose, asOf } }
 *   rateLimited tickers that were REFUSED, not answered — ask again shortly.
 *
 * The two are reported separately because they mean opposite things to the
 * caller. A ticker missing from `quotes` because the provider had nothing for
 * it should wait its turn in the rotation. A ticker in `rateLimited` was never
 * asked a real question, so waiting a whole rotation leaves its share price
 * blank for minutes over a limit that cleared in a second.
 *
 * Once a refusal arrives the remaining batches are not sent. They would be
 * refused too — the bucket is emptier with every one — and the deficit only
 * deepens. The unsent tickers are reported as rateLimited, which is what they
 * are in effect: not answered, worth asking again.
 *
 * Still throws when every ticker failed for an ordinary reason and none was
 * refused, because that is a broken feed and the caller should keep its cache.
 */
export async function getStockPrices(tickers, concurrency = 5) {
  const quotes = {}
  const rateLimited = []
  for (let i = 0; i < tickers.length; i += concurrency) {
    const batch = tickers.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch.map((t) => fetchQuote(t)))
    settled.forEach((r, j) => {
      if (r.status === 'fulfilled') quotes[batch[j]] = r.value
      else if (r.reason?.rateLimited) rateLimited.push(batch[j])
    })
    if (rateLimited.length > 0) {
      rateLimited.push(...tickers.slice(i + concurrency))
      break
    }
  }
  if (Object.keys(quotes).length === 0 && rateLimited.length === 0) {
    throw new Error('stock feed: all quotes failed')
  }
  return { quotes, rateLimited }
}

// --- Price history (for the detail chart) ---------------------------------
// Yahoo's chart endpoint is the only free intraday/daily history source we
// have (Finnhub candles are premium-tier). Dev: via the Vite proxy; production
// goes through the edge proxy (later step). Cached 5 min per (ticker, range).
const historyCache = new Map()
const HISTORY_TTL = 5 * 60_000

/**
 * Fetch stock price history. cfg: { interval: '5m'|'30m'|'1d', yrange: '1d'|'5d'|'1mo'|... }
 * Returns [{ t: msEpoch, v: usd }] (close prices; null candles skipped).
 */
export async function getStockHistory(ticker, cfg) {
  const key = `${ticker}|${cfg.yrange}|${cfg.interval}`
  const hit = historyCache.get(key)
  if (hit && Date.now() - hit.at < HISTORY_TTL) return hit.data

  const symbol = ticker.replace('.', '-')
  const url = IS_PROD
    ? `${API_BASE}/api/history?symbol=${encodeURIComponent(symbol)}&interval=${cfg.interval}&range=${cfg.yrange}${API_CACHE_SUFFIX}`
    : `/yfin/v8/finance/chart/${symbol}?interval=${cfg.interval}&range=${cfg.yrange}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Yahoo history ${res.status}`)
  const json = await res.json()
  const result = json?.chart?.result?.[0]
  const times = result?.timestamp ?? []
  const closes = result?.indicators?.quote?.[0]?.close ?? []
  // Candles are stamped at their OPEN time but we plot CLOSE prices — shift
  // intraday stamps to the interval's end so scrubbing "7:55" shows the price
  // that actually printed around 7:55 (matters on fast tape).
  const shiftMs = { '5m': 300_000, '30m': 1_800_000 }[cfg.interval] ?? 0
  const data = times
    .map((t, i) => ({ t: t * 1000 + shiftMs, v: closes[i] }))
    .filter((p) => p.v != null)
  historyCache.set(key, { at: Date.now(), data })
  return data
}

// --- Company info (detail screen: about, analyst ratings, earnings) --------
// Finnhub free-tier endpoints, fetched on demand when a detail screen opens.
// This data changes slowly → cached 1h. Each call returns null on any failure
// so a missing dataset (ETFs, treasuries, API hiccups) just hides its section.
const infoCache = new Map()
const INFO_TTL = 60 * 60_000

const DEV_INFO_PATHS = {
  profile: '/stock/profile2',
  recommendation: '/stock/recommendation',
  earnings: '/stock/earnings',
  metric: '/stock/metric',
}

function devInfoUrl(kind, symbol) {
  if (kind === 'news') {
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
    return `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
  }
  const extra = kind === 'metric' ? '&metric=all' : ''
  return `https://finnhub.io/api/v1${DEV_INFO_PATHS[kind]}?symbol=${symbol}${extra}&token=${FINNHUB_KEY}`
}

async function fetchInfo(kind, ticker) {
  const symbol = encodeURIComponent(ticker)
  const url = IS_PROD
    ? `${API_BASE}/api/finnhub?kind=${kind}&symbol=${symbol}${API_CACHE_SUFFIX}`
    : FINNHUB_KEY
      ? devInfoUrl(kind, symbol)
      : null
  if (!url) return null
  const hit = infoCache.get(url)
  if (hit && Date.now() - hit.at < INFO_TTL) return hit.data
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    infoCache.set(url, { at: Date.now(), data })
    return data
  } catch {
    return null
  }
}

/** Company profile: { name, finnhubIndustry, exchange, ipo, marketCapitalization (millions), weburl, logo } */
export async function getStockProfile(ticker) {
  const p = await fetchInfo('profile', ticker)
  return p && p.name ? p : null
}

// --- Company logos ----------------------------------------------------------
// Logo URLs practically never change, so they live in localStorage for 30 days
// ('' = known-missing, e.g. ETFs — cached too so we don't re-ask every load).
const LOGO_KEY = 'bw.logos.v1'
const LOGO_TTL = 30 * 24 * 60 * 60_000
const logoInflight = new Map()

function readLogoCache() {
  try {
    const raw = localStorage.getItem(LOGO_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed?.at && Date.now() - parsed.at < LOGO_TTL) return parsed.data
    }
  } catch {
    // fall through
  }
  return null
}

/** Resolve a company logo URL for a ticker (null when none exists). */
export async function getLogo(ticker) {
  if (!ticker) return null
  const cache = readLogoCache() ?? {}
  if (ticker in cache) return cache[ticker] || null

  if (logoInflight.has(ticker)) return logoInflight.get(ticker)
  const promise = (async () => {
    const profile = await fetchInfo('profile', ticker)
    const url = profile?.logo || ''
    try {
      const current = readLogoCache() ?? {}
      localStorage.setItem(LOGO_KEY, JSON.stringify({ at: Date.now(), data: { ...current, [ticker]: url } }))
    } catch {
      // cache miss is fine
    }
    logoInflight.delete(ticker)
    return url || null
  })()
  logoInflight.set(ticker, promise)
  return promise
}

/**
 * Key statistics for the detail screen's Yahoo-style summary. Normalized from
 * Finnhub's /stock/metric grab-bag; every field is null when the upstream
 * doesn't report it (common for ETFs), and the whole result is null when
 * nothing useful came back.
 */
export async function getKeyMetrics(ticker) {
  const data = await fetchInfo('metric', ticker)
  const m = data?.metric
  if (!m) return null
  const stats = {
    high52: m['52WeekHigh'] ?? null,
    low52: m['52WeekLow'] ?? null,
    pe: m.peTTM ?? m.peBasicExclExtraTTM ?? null,
    eps: m.epsTTM ?? m.epsBasicExclExtraItemsTTM ?? null,
    divYield: m.dividendYieldIndicatedAnnual ?? null, // already a percent
    beta: m.beta ?? null,
    avgVolume10d: m['10DayAverageTradingVolume'] != null ? m['10DayAverageTradingVolume'] * 1e6 : null, // reported in millions of shares
  }
  return Object.values(stats).some((v) => v != null) ? stats : null
}

/** Latest analyst recommendation counts: { strongBuy, buy, hold, sell, strongSell, period } */
export async function getAnalystRecs(ticker) {
  const recs = await fetchInfo('recommendation', ticker)
  return Array.isArray(recs) && recs.length > 0 ? recs[0] : null
}

/** Last quarterly EPS results: [{ actual, estimate, period, surprisePercent }] (newest first) */
export async function getEarnings(ticker) {
  const rows = await fetchInfo('earnings', ticker)
  if (!Array.isArray(rows) || rows.length === 0) return null
  return rows.filter((r) => r.actual != null).slice(0, 4)
}

// Primary headline source: Google News RSS, which indexes the major outlets
// directly. STRICT whitelist — an unranked source doesn't appear at all
// (Google's search results include endless SEO blogs). Rank orders the list.
const NEWS_SOURCE_RANK = {
  bloomberg: 3,
  reuters: 3,
  cnbc: 3,
  'the wall street journal': 3,
  'financial times': 3,
  "barron's": 2,
  barrons: 2,
  marketwatch: 2,
  'investor’s business daily': 2,
  "investor's business daily": 2,
  fortune: 2,
  'yahoo finance': 1,
  forbes: 1,
  'business insider': 1,
  'the motley fool': 1,
  'seeking alpha': 1,
  thestreet: 1,
  benzinga: 1,
}
const newsRank = (source) => NEWS_SOURCE_RANK[(source || '').toLowerCase()] ?? 0

function dedupeRankSlice(items) {
  const seen = new Set()
  const out = []
  for (const i of [...items].sort((a, b) => newsRank(b.source) - newsRank(a.source) || b.at - a.at)) {
    const key = i.headline.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(i)
  }
  return out.slice(0, 5)
}

// 30-minute per-ticker cache: headlines don't move faster, and the section
// re-fetches every time a detail screen opens.
const newsCache = new Map()
const NEWS_TTL = 30 * 60_000

/** RSS XML → [{ id, headline, source, url, at }]. Shape only; no filtering —
 *  the two news lanes rank by different maps. Mirrors api/_rss.js, which does
 *  the same job server-side where there is no DOMParser. */
function parseRssXml(text) {
  const doc = new DOMParser().parseFromString(text, 'text/xml')
  return [...doc.querySelectorAll('item')].map((el) => {
    const source = el.querySelector('source')?.textContent?.trim() ?? ''
    // Google appends " - Source" to titles; drop it, the source gets its own byline.
    const rawTitle = el.querySelector('title')?.textContent ?? ''
    const suffix = ` - ${source}`
    const headline =
      source && rawTitle.toLowerCase().endsWith(suffix.toLowerCase())
        ? rawTitle.slice(0, rawTitle.length - suffix.length).trim()
        : rawTitle.trim()
    const link = el.querySelector('link')?.textContent?.trim() ?? ''
    return {
      id: el.querySelector('guid')?.textContent || link,
      headline,
      source,
      url: link,
      at: Date.parse(el.querySelector('pubDate')?.textContent ?? '') || 0,
    }
  })
}

/** Shared sanity gate: a real headline, with a link, from the last week. */
function isUsableHeadline(i) {
  return (
    i.url &&
    // real sentences only — feeds occasionally leak template tokens
    // like "META_TITLE_QUOTE" as titles
    i.headline.includes(' ') &&
    i.headline.length >= 15 &&
    i.at > Date.now() - 7 * 86_400_000
  )
}

async function fetchGoogleNews(ticker) {
  const url = IS_PROD
    ? `${API_BASE}/api/news?symbol=${encodeURIComponent(ticker)}${API_CACHE_SUFFIX}`
    : `/gnews/rss/search?q=${encodeURIComponent(`"${ticker}" stock`)}&hl=en-US&gl=US&ceid=US:en`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`news ${res.status}`)
  const items = parseRssXml(await res.text()).filter(
    (i) => isUsableHeadline(i) && newsRank(i.source) > 0
  )
  return dedupeRankSlice(items)
}

/** Finnhub aggregate feed — fallback when Google News is unreachable or thin. */
async function getFinnhubNews(ticker) {
  const rows = await fetchInfo('news', ticker)
  if (!Array.isArray(rows)) return null
  const items = rows
    .filter((r) => r.headline && r.url)
    .map((r) => ({
      id: r.id ?? r.url,
      headline: r.headline,
      source: r.source || 'News',
      url: r.url,
      at: (r.datetime || 0) * 1000,
    }))
  const ranked = dedupeRankSlice(items)
  // Whitelist rejected everything (small caps often only get aggregator
  // coverage) — better filler than an empty section.
  return ranked.length > 0 ? ranked : items.slice(0, 5).length > 0 ? items.slice(0, 5) : null
}

/** Last week's headlines for the underlying: [{ id, headline, source, url, at }],
 *  major outlets only when available, deduped, credible wires first. */
export async function getCompanyNews(ticker) {
  const hit = newsCache.get(ticker)
  if (hit && Date.now() - hit.at < NEWS_TTL) return hit.data
  let items = null
  try {
    const google = await fetchGoogleNews(ticker)
    if (google.length >= 2) items = google
  } catch {
    // unofficial feed — fall through to Finnhub
  }
  if (!items) items = await getFinnhubNews(ticker)
  newsCache.set(ticker, { at: Date.now(), data: items })
  return items
}

/*
 * The tokenization beat — a SEPARATE whitelist, deliberately not an extension
 * of NEWS_SOURCE_RANK.
 *
 * Measured 2026-08-20: across 50 sampled headlines on tokenization queries,
 * ZERO came from Bloomberg/Reuters/FT/WSJ. The wires barely cover this beat;
 * it lives in crypto trade press. So the company-news map would reject almost
 * all of it — and conversely, adding CoinDesk to that map would start leaking
 * crypto coverage into "Latest NVIDIA news" on asset pages. Different beat,
 * different bar, different map.
 *
 * Wires still rank top so Reuters wins whenever it does show up. Everything
 * absent scores 0 and never appears, which is what keeps exchange blogs
 * (Kraken Blog, Bitget), issuer PR (Ondo Finance) and the SEO farms
 * (CryptoRank, Cryptonews.net, Startup Fortune, Altcoin Buzz…) out without
 * needing a blocklist to chase.
 */
const TOKEN_NEWS_SOURCE_RANK = {
  reuters: 5,
  bloomberg: 5,
  'financial times': 5,
  'the wall street journal': 5,
  cnbc: 4,
  axios: 4,
  coindesk: 3,
  'the block': 3,
  fortune: 3,
  decrypt: 2,
  forkast: 2,
  'forkast.news': 2,
  'finance magnates': 2,
  'crowdfund insider': 2,
  'crypto briefing': 2,
}
const tokenNewsRank = (source) => TOKEN_NEWS_SOURCE_RANK[(source || '').toLowerCase()] ?? 0

// Dev only: prod gets all six merged server-side in one request. Kept in sync
// with TOPIC_QUERIES in api/news.js.
const TOKENIZATION_QUERIES = [
  '"tokenized stocks"',
  '"tokenized equities"',
  '"tokenized securities"',
  'xStocks',
  '"Ondo Finance"',
  'tokenization SEC equities',
]

const TOKEN_NEWS_LIMIT = 15
let tokenNewsCache = null

async function fetchTokenizationRaw() {
  if (IS_PROD) {
    const res = await fetch(`${API_BASE}/api/news?topic=tokenized${API_CACHE_SUFFIX}`)
    if (!res.ok) throw new Error(`news ${res.status}`)
    const body = await res.json()
    return Array.isArray(body?.items) ? body.items : []
  }
  // No serverless function under vite dev, so fan out here instead. A failed
  // leg shrinks the feed rather than emptying it, same as the server.
  const settled = await Promise.allSettled(
    TOKENIZATION_QUERIES.map(async (q) => {
      const res = await fetch(
        `/gnews/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`
      )
      if (!res.ok) throw new Error(`news ${res.status}`)
      return parseRssXml(await res.text())
    })
  )
  const ok = settled.filter((s) => s.status === 'fulfilled')
  if (ok.length === 0) throw new Error('news unreachable')
  return ok.flatMap((s) => s.value)
}

/**
 * Headlines about the tokenized-equity market itself:
 * [{ id, headline, source, url, at }], newest first, vetted sources only.
 *
 * Ordering differs from dedupeRankSlice on purpose. A feed is chronological —
 * rank decides what gets IN and which copy of a story survives, not where it
 * sits. Sorting by rank would pin last week's Reuters piece above this
 * morning's.
 */
export async function getTokenizationNews() {
  if (tokenNewsCache && Date.now() - tokenNewsCache.at < NEWS_TTL) return tokenNewsCache.data
  const raw = await fetchTokenizationRaw()
  const ranked = raw
    .filter((i) => isUsableHeadline(i) && tokenNewsRank(i.source) > 0)
    .sort((a, b) => tokenNewsRank(b.source) - tokenNewsRank(a.source) || b.at - a.at)
  const seen = new Set()
  const deduped = []
  for (const i of ranked) {
    const key = i.headline.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(i)
  }
  const data = deduped.sort((a, b) => b.at - a.at).slice(0, TOKEN_NEWS_LIMIT)
  tokenNewsCache = { at: Date.now(), data }
  return data
}

export function loadStockCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.at || !parsed?.data) return null
    return parsed
  } catch {
    return null
  }
}

export function saveStockCache(at, data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at, data }))
  } catch {
    // storage unavailable — polling still works
  }
}
