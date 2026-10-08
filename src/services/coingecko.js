// CoinGecko market data service.
// Free/demo tier: we stay well under limits by batching every tracked id into
// ONE /coins/markets request per poll cycle and caching the last good response
// in localStorage (survives reloads; powers the "last updated X ago" fallback).
//
// Live prices come from CoinGecko directly. Price history, in production,
// comes through our own /api/token-history (see fetchTokenHistory below).

import { TOKEN_PRICE_MAX_AGE_MS } from '../lib/gapCheck'
import { API_BASE, API_CACHE_SUFFIX } from './apiBase'
import { isNativeApp } from '../lib/platform'
import { CLIENT_HEADER, CLIENT_HEADER_VALUE } from '../../api/_clientGate.js'

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
const IS_PROD = import.meta.env.PROD
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

  const res = await fetch(`${COINGECKO_BASE}/coins/markets?${params}`, { headers })
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const rows = await res.json()

  const map = {}
  for (const row of rows) {
    const updated = row.last_updated ? Date.parse(row.last_updated) : NaN
    map[row.id] = {
      tokenPrice: row.current_price,
      // CoinGecko's own price, kept beside tokenPrice so the live Jupiter
      // layer can be checked against a second source (state/PricesContext),
      // and when CoinGecko last saw it trade (lib/gapCheck.js).
      feedPrice: row.current_price,
      feedUpdatedAt: Number.isFinite(updated) ? updated : null,
      priceUpdatedAt: Number.isFinite(updated) ? updated : null,
      change24h: row.price_change_percentage_24h ?? null,
      marketCap: row.market_cap ?? null,
      volume24h: row.total_volume ?? null,
      // Token-side key statistics (detail screen) — free riders on this call.
      high24h: row.high_24h ?? null,
      low24h: row.low_24h ?? null,
      ath: row.ath ?? null,
      athChangePct: row.ath_change_percentage ?? null,
      supply: row.circulating_supply ?? null,
    }
  }
  return map
}

// --- 7-day sparklines (watchlist rows) ---------------------------------------
// One extra /coins/markets call with sparkline=true, refreshed slowly (the
// hook caches 30 min) — week-long lines don't move fast. Downsampled to ~40
// points; a row's sparkline is 56px wide, hourly resolution is wasted there.

function downsample(points, target = 40) {
  if (!Array.isArray(points) || points.length <= target) return points ?? null
  const step = (points.length - 1) / (target - 1)
  return Array.from({ length: target }, (_, i) => points[Math.round(i * step)])
}

/** Fetch 7d sparkline arrays: { [id]: number[] }. Small id lists only. */
export async function fetchSparklines(ids) {
  const params = new URLSearchParams({
    vs_currency: 'usd',
    ids: ids.slice(0, 100).join(','),
    sparkline: 'true',
    per_page: String(Math.min(ids.length, 100)),
  })
  const headers = { accept: 'application/json' }
  if (DEMO_KEY) headers['x-cg-demo-api-key'] = DEMO_KEY
  const res = await fetch(`${COINGECKO_BASE}/coins/markets?${params}`, { headers })
  if (!res.ok) throw new Error(`CoinGecko sparkline ${res.status}`)
  const rows = await res.json()
  const map = {}
  for (const row of rows) {
    const points = downsample(row.sparkline_in_7d?.price)
    if (points && points.length >= 2) map[row.id] = points
  }
  return map
}

// --- Price history (for the detail chart) ---------------------------------
// Cached in memory for 5 minutes per (coin, range) so flipping ranges doesn't
// burn rate limit.
const historyCache = new Map()
const historyInflight = new Map()
const HISTORY_TTL = 5 * 60_000

/*
 * Where history comes from. In production, from our own /api/token-history
 * (website and iPhone app alike, through API_BASE and the app's cache lane):
 * one CoinGecko answer cached at the edge for every visitor. The browser used
 * to ask CoinGecko itself, on the keyless per-visitor limit, and a fresh
 * desktop visit spends three of those calls on /coins/markets (the core ids,
 * then the Board's 261 ids in two chunks) before the Readout asks for
 * history, so the history call was the one refused. Development still asks
 * CoinGecko directly, which has no serverless functions to ask.
 *
 * After any refusal or failure, history calls fail at once until it is worth
 * asking again, instead of spending more requests. The route says when in
 * Retry-After. CoinGecko's own 429 carries no Access-Control-Allow-Origin
 * header, so in development the browser reports a network error and
 * Retry-After cannot be read (it said 58 s when checked on 2026-09-29); those
 * cases fall back to a cooldown with jitter.
 */
export const HISTORY_COOLDOWN_MS = 60_000
let historyBusyUntil = 0

/**
 * Why token history is missing: 'busy' (a 429 we could read, or a cooldown
 * still running), 'unreachable' (no readable answer, which in a browser is
 * usually that same 429), or 'missing' (CoinGecko has no such coin).
 * `retryAt` is when asking again is worth it, or null for never.
 */
export class HistoryUnavailable extends Error {
  constructor(kind, retryAt) {
    super(`token history ${kind}`)
    this.kind = kind
    this.retryAt = retryAt
  }
}

function coolDown() {
  historyBusyUntil = Date.now() + HISTORY_COOLDOWN_MS + Math.round(Math.random() * 10_000)
  return historyBusyUntil
}

/** Hold history calls until the response's Retry-After, or a cooldown when it has none. */
function holdFor(res) {
  const seconds = Number(res.headers?.get?.('Retry-After'))
  if (!(seconds > 0)) return coolDown()
  historyBusyUntil = Date.now() + seconds * 1000
  return historyBusyUntil
}

function historyRequest(id, days) {
  if (IS_PROD) {
    // The route's light gate (api/_clientGate.js): the website says it is the
    // website. The iPhone app's cross-origin requests carry its Origin
    // instead, and a custom header there would cost a CORS preflight.
    const headers = { accept: 'application/json' }
    if (!isNativeApp()) headers[CLIENT_HEADER] = CLIENT_HEADER_VALUE
    return fetch(`${API_BASE}/api/token-history?id=${encodeURIComponent(id)}&days=${days}${API_CACHE_SUFFIX}`, {
      headers,
    })
  }
  const headers = { accept: 'application/json' }
  if (DEMO_KEY) headers['x-cg-demo-api-key'] = DEMO_KEY
  return fetch(`${COINGECKO_BASE}/coins/${encodeURIComponent(id)}/market_chart?vs_currency=usd&days=${days}`, {
    headers,
  })
}

/** Test seam: forget the cooldown and the cache between cases. */
export function resetHistoryState() {
  historyBusyUntil = 0
  historyCache.clear()
  historyInflight.clear()
}

/**
 * Fetch token price history. Returns [{ t: msEpoch, v: usd }]. Throws
 * HistoryUnavailable: 404 is missing; 429 and 503 (CoinGecko or our route
 * refusing) are busy; a network error or any other failure is unreachable.
 * retryAt comes from Retry-After when the response has one. Concurrent
 * callers for one series share a request.
 */
export async function fetchTokenHistory(id, days) {
  const key = `${id}|${days}`
  const hit = historyCache.get(key)
  if (hit && Date.now() - hit.at < HISTORY_TTL) return hit.data
  if (historyInflight.has(key)) return historyInflight.get(key)
  if (Date.now() < historyBusyUntil) throw new HistoryUnavailable('busy', historyBusyUntil)

  const promise = (async () => {
    let res
    try {
      res = await historyRequest(id, days)
    } catch {
      throw new HistoryUnavailable('unreachable', coolDown())
    }
    if (res.status === 404) throw new HistoryUnavailable('missing', null)
    if (res.status === 429 || res.status === 503) throw new HistoryUnavailable('busy', holdFor(res))
    if (!res.ok) throw new HistoryUnavailable('unreachable', holdFor(res))
    const json = await res.json()
    const data = (json.prices ?? []).map(([t, v]) => ({ t, v }))
    historyCache.set(key, { at: Date.now(), data })
    return data
  })()
  historyInflight.set(key, promise)
  try {
    return await promise
  } finally {
    historyInflight.delete(key)
  }
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
        `${COINGECKO_BASE}/coins/markets?vs_currency=usd&category=${cat.id}&order=market_cap_desc&per_page=30`,
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
    // Instant paint on reload is worth a few minutes' lag, not a week's: a
    // cache older than a token price may be is dropped (lib/gapCheck.js).
    if (!(Date.now() - parsed.at <= TOKEN_PRICE_MAX_AGE_MS)) return null
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
