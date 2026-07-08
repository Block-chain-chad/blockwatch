// CoinGecko market data service.
// Free/demo tier: we stay well under limits by batching every tracked id into
// ONE /coins/markets request per poll cycle and caching the last good response
// in localStorage (survives reloads; powers the "last updated X ago" fallback).

const API_BASE = 'https://api.coingecko.com/api/v3'
const DEMO_KEY = import.meta.env.VITE_COINGECKO_API_KEY // optional; raises rate limits
const CACHE_KEY = 'bw.priceCache.v1'

export const POLL_MS = 60_000

/**
 * Fetch current market data for a list of coin ids in a single request.
 * Returns { [id]: { tokenPrice, change24h, marketCap } }.
 */
export async function fetchTokenMarkets(ids) {
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
