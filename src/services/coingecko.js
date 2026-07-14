// CoinGecko market data service.
// Free/demo tier: we stay well under limits by batching every tracked id into
// ONE /coins/markets request per poll cycle and caching the last good response
// in localStorage (survives reloads; powers the "last updated X ago" fallback).

const API_BASE = 'https://api.coingecko.com/api/v3'
const DEMO_KEY = import.meta.env.VITE_COINGECKO_API_KEY // optional; raises rate limits
const CACHE_KEY = 'bw.priceCache.v1'

export const POLL_MS = 60_000

/**
 * Fetch current market data for a list of coin ids. /coins/markets caps at
 * 250 ids per request, so larger universes go out as parallel chunks; a chunk
 * failing only blanks its own ids (caller merges over previous data).
 * Returns { [id]: { tokenPrice, change24h, marketCap } }.
 * Throws only when every chunk fails.
 */
export async function fetchTokenMarkets(ids) {
  // Chunk by both count (API cap: 250) and joined length — CoinGecko ids can
  // run 50+ chars and the ids= param has to stay inside sane URL limits.
  const MAX_JOINED = 5_000
  const chunks = []
  let current = []
  let length = 0
  for (const id of ids) {
    if (current.length >= 250 || length + id.length > MAX_JOINED) {
      chunks.push(current)
      current = []
      length = 0
    }
    current.push(id)
    length += id.length + 1
  }
  if (current.length > 0) chunks.push(current)

  const settled = await Promise.allSettled(chunks.map(fetchMarketsChunk))
  const map = {}
  let anyOk = false
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue
    anyOk = true
    Object.assign(map, s.value)
  }
  if (!anyOk) throw new Error('CoinGecko: all chunks failed')
  return map
}

async function fetchMarketsChunk(ids) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    ids: ids.join(','),
    order: 'market_cap_desc',
    per_page: String(Math.min(ids.length, 250)),
    price_change_percentage: '24h',
  })
  const headers = { accept: 'application/json' }
  if (DEMO_KEY) headers['x-cg-demo-api-key'] = DEMO_KEY

  const res = await fetch(`${API_BASE}/coins/markets?${params}`, { headers })
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const rows = await res.json()

  const map = {}
  for (const row of rows) {
    map[row.id] = {
      tokenPrice: row.current_price,
      change24h: row.price_change_percentage_24h ?? null,
      marketCap: row.market_cap ?? null,
      volume24h: row.total_volume ?? null,
    }
  }
  return map
}

// --- Price history (for the detail chart) ---------------------------------
// Cached in memory for 5 minutes per (coin, range) so flipping ranges doesn't
// burn rate limit.
const historyCache = new Map()
const HISTORY_TTL = 5 * 60_000

/** Fetch token price history. Returns [{ t: msEpoch, v: usd }]. */
export async function fetchTokenHistory(id, days) {
  const key = `${id}|${days}`
  const hit = historyCache.get(key)
  if (hit && Date.now() - hit.at < HISTORY_TTL) return hit.data

  const headers = { accept: 'application/json' }
  if (DEMO_KEY) headers['x-cg-demo-api-key'] = DEMO_KEY
  const res = await fetch(
    `${API_BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`,
    { headers }
  )
  if (!res.ok) throw new Error(`CoinGecko history ${res.status}`)
  const json = await res.json()
  const data = (json.prices ?? []).map(([t, v]) => ({ t, v }))
  historyCache.set(key, { at: Date.now(), data })
  return data
}

// --- New listings discovery -------------------------------------------------
// Tokens in the issuer categories that we don't track yet — "recently
// tokenized" for users, an expansion to-do list for us. Cached 6h (listings
// don't change often) with a localStorage copy for instant paint.
const LISTINGS_KEY = 'bw.newListings.v1'
const LISTINGS_TTL = 6 * 60 * 60_000
const LISTING_CATEGORIES = [
  { id: 'xstocks-ecosystem', issuer: 'xStocks' },
  { id: 'ondo-tokenized-assets', issuer: 'Ondo' },
]

export async function fetchNewListings(excludeIds) {
  try {
    const raw = localStorage.getItem(LISTINGS_KEY)
    if (raw) {
      const cached = JSON.parse(raw)
      if (cached?.at && Date.now() - cached.at < LISTINGS_TTL) return cached.data
    }
  } catch {
    // no cache — fetch fresh
  }

  const headers = { accept: 'application/json' }
  if (DEMO_KEY) headers['x-cg-demo-api-key'] = DEMO_KEY
  const settled = await Promise.allSettled(
    LISTING_CATEGORIES.map(async (cat) => {
      const res = await fetch(
        `${API_BASE}/coins/markets?vs_currency=usd&category=${cat.id}&order=market_cap_desc&per_page=30`,
        { headers }
      )
      if (!res.ok) return []
      const rows = await res.json()
      return rows.map((r) => ({ ...r, _issuer: cat.issuer }))
    })
  )
  const seen = new Set(excludeIds)
  const data = []
  for (const s of settled) {
    if (s.status !== 'fulfilled') continue
    for (const r of s.value) {
      if (seen.has(r.id) || r.current_price == null) continue
      seen.add(r.id)
      data.push({
        id: r.id,
        ticker: (r.symbol ?? '').toUpperCase(),
        name: r.name,
        price: r.current_price,
        marketCap: r.market_cap ?? 0,
        issuer: r._issuer,
      })
    }
  }
  data.sort((a, b) => b.marketCap - a.marketCap)
  const top = data.slice(0, 8)
  try {
    localStorage.setItem(LISTINGS_KEY, JSON.stringify({ at: Date.now(), data: top }))
  } catch {
    // cache miss is fine
  }
  return top
}

export function loadPriceCache() {
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

export function savePriceCache(at, data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at, data }))
  } catch {
    // storage full/blocked — polling still works, just no reload cache
  }
}
