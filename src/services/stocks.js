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
// Returned shape per ticker: { price, prevClose, asOf } — asOf is ms epoch of
// the quote (when markets are closed this is the last close).

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_API_KEY
// In production every stock call goes through our own /api serverless proxy
// (key server-side, responses CDN-cached). Dev talks to providers directly.
const IS_PROD = import.meta.env.PROD
const CACHE_KEY = 'bw.stockCache.v1'

export const STOCK_POLL_MS = 60_000
// When the market is closed, prices don't move — refetch at most this often.
export const CLOSED_MARKET_REFRESH_MS = 30 * 60_000

async function fetchFinnhub(ticker) {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`
  )
  if (!res.ok) throw new Error(`Finnhub ${res.status}`)
  const q = await res.json()
  const price = q.c || q.pc
  if (!price) throw new Error('Finnhub: empty quote')
  return { price, prevClose: q.pc ?? null, asOf: (q.t || 0) * 1000 || Date.now() }
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
    prevClose: meta.chartPreviousClose ?? null,
    asOf: (meta.regularMarketTime || 0) * 1000 || Date.now(),
  }
}

async function fetchApiQuote(ticker) {
  const res = await fetch(`/api/finnhub?kind=quote&symbol=${encodeURIComponent(ticker)}`)
  if (!res.ok) throw new Error(`quote ${res.status}`)
  const q = await res.json()
  const price = q.c || q.pc
  if (!price) throw new Error('empty quote')
  return { price, prevClose: q.pc ?? null, asOf: (q.t || 0) * 1000 || Date.now() }
}

const fetchQuote = IS_PROD ? fetchApiQuote : FINNHUB_KEY ? fetchFinnhub : fetchYahooDev
export const STOCK_PROVIDER = IS_PROD ? 'edge-proxy' : FINNHUB_KEY ? 'finnhub' : 'yahoo-dev'

/** Fetch one ticker. */
export function getStockPrice(ticker) {
  return fetchQuote(ticker)
}

/**
 * Fetch many tickers with limited concurrency. Individual failures are
 * tolerated (missing from the result) so one bad symbol can't blank the board.
 * Returns { [ticker]: { price, prevClose, asOf } }.
 */
export async function getStockPrices(tickers, concurrency = 5) {
  const out = {}
  for (let i = 0; i < tickers.length; i += concurrency) {
    const batch = tickers.slice(i, i + concurrency)
    const settled = await Promise.allSettled(batch.map((t) => fetchQuote(t)))
    settled.forEach((r, j) => {
      if (r.status === 'fulfilled') out[batch[j]] = r.value
    })
  }
  if (Object.keys(out).length === 0) throw new Error('stock feed: all quotes failed')
  return out
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
    ? `/api/history?symbol=${encodeURIComponent(symbol)}&interval=${cfg.interval}&range=${cfg.yrange}`
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
}

function devInfoUrl(kind, symbol) {
  if (kind === 'news') {
    const to = new Date().toISOString().slice(0, 10)
    const from = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10)
    return `https://finnhub.io/api/v1/company-news?symbol=${symbol}&from=${from}&to=${to}&token=${FINNHUB_KEY}`
  }
  return `https://finnhub.io/api/v1${DEV_INFO_PATHS[kind]}?symbol=${symbol}&token=${FINNHUB_KEY}`
}

async function fetchInfo(kind, ticker) {
  const symbol = encodeURIComponent(ticker)
  const url = IS_PROD
    ? `/api/finnhub?kind=${kind}&symbol=${symbol}`
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

/** Company profile: { name, finnhubIndustry, exchange, ipo, marketCapitalization (millions), weburl } */
export async function getStockProfile(ticker) {
  const p = await fetchInfo('profile', ticker)
  return p && p.name ? p : null
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

/** Last week's headlines for the underlying: [{ id, headline, source, url, at }] */
export async function getCompanyNews(ticker) {
  const rows = await fetchInfo('news', ticker)
  if (!Array.isArray(rows)) return null
  const items = rows
    .filter((r) => r.headline && r.url)
    .slice(0, 5)
    .map((r) => ({
      id: r.id ?? r.url,
      headline: r.headline,
      source: r.source || 'News',
      url: r.url,
      at: (r.datetime || 0) * 1000,
    }))
  return items.length > 0 ? items : null
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
