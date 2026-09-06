// Candles for both sides of the gap, in one shape.
//
//   getTokenCandles(asset, timeframeId)  — the tokenized side, from the DEX
//     pool where the token trades (GeckoTerminal via /api/candles).
//   getStockCandles(symbol, interval, range) — the real share, from the Yahoo
//     chart endpoint /api/history already relays.
//
// Both return { candles: [{ time, open, high, low, close, volume }, …] }
// ascending, time in unix seconds, or null when there is nothing to draw —
// callers render nothing rather than an error.
//
// Budget: GeckoTerminal's free tier is roughly 30 requests a minute for
// everyone put together, so pool resolution is cached here per asset for a
// day and candle series for the timeframe's TTL (which mirrors the proxy's
// s-maxage, so a refetch inside the window is usually a CDN hit). Concurrent
// callers for the same asset share one in-flight request.
//
// Dev has no serverless functions, so it talks to GeckoTerminal and Yahoo
// through the vite proxies (/gt, /yfin) and runs the same parsers the proxy
// runs — one code path's worth of logic, two transports.

import { API_BASE, API_CACHE_SUFFIX } from './apiBase'
import {
  GT_API_PREFIX,
  searchPath,
  ohlcvPath,
  parseSearchPools,
  matchingPools,
  normalizeOhlcv,
} from '../../api/_geckoterminal.js'
import {
  timeframeById,
  networksFor,
  choosePool,
  normalizeYahooCandles,
  isStockRequest,
} from '../lib/candles'

const IS_PROD = import.meta.env.PROD

const POOL_TTL = 24 * 60 * 60_000
// A token with no pool today may be listed tomorrow; do not remember the
// miss for as long as a hit.
const POOL_MISS_TTL = 60 * 60_000
const STOCK_TTL = 5 * 60_000

const poolCache = new Map() // assetKey -> { at, data: { network, pool } | null }
const poolInflight = new Map() // assetKey -> Promise
const candleCache = new Map() // `${assetKey}|${timeframeId}` -> { at, data }
const candleInflight = new Map() // same key -> Promise, while a fetch is out
const stockCache = new Map() // `${symbol}|${interval}|${range}` -> { at, data }

const assetKey = (asset) => asset?.id ?? asset?.ticker ?? ''

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`candles ${res.status}`)
  return res.json()
}

/** Pools where `ticker` is the base token on one network, busiest first. */
async function searchCandidates(ticker, network) {
  if (IS_PROD) {
    const body = await fetchJson(
      `${API_BASE}/api/candles?op=resolve&ticker=${encodeURIComponent(ticker)}&network=${network}${API_CACHE_SUFFIX}`
    )
    return Array.isArray(body?.candidates) ? body.candidates : []
  }
  const json = await fetchJson(`/gt${GT_API_PREFIX}${searchPath(ticker, network)}`)
  return matchingPools(parseSearchPools(json), ticker)
}

/**
 * The pool an asset's candles come from: { network, pool } or null. Tries the
 * networks lib/candles.js says the issuer trades on, in order, and stops at
 * the first that has a usable pool. Cached per asset.
 */
export async function resolvePool(asset) {
  const key = assetKey(asset)
  if (!key || !asset?.ticker) return null
  const hit = poolCache.get(key)
  if (hit && Date.now() - hit.at < (hit.data ? POOL_TTL : POOL_MISS_TTL)) return hit.data
  if (poolInflight.has(key)) return poolInflight.get(key)

  const promise = (async () => {
    let data = null
    let failed = false
    for (const network of networksFor(asset)) {
      try {
        const pool = choosePool(await searchCandidates(asset.ticker, network), asset)
        if (pool) {
          data = { network, pool }
          break
        }
      } catch {
        // this network is unreachable right now — try the next, but remember
        // that we did not actually get an answer from it
        failed = true
      }
    }
    // A search that completed and matched nothing is a real miss and is
    // cached for POOL_MISS_TTL. A search that errored (a 429 on the shared
    // GeckoTerminal budget, a network drop) is not an answer, so it leaves
    // the cache alone and the next mount retries instead of reporting
    // "no pool" for an hour.
    if (data || !failed) poolCache.set(key, { at: Date.now(), data })
    poolInflight.delete(key)
    return data
  })()
  poolInflight.set(key, promise)
  return promise
}

/**
 * Token candles for an asset at a timeframe id from lib/candles.js:
 * { network, pool, timeframe, candles } or null.
 */
export async function getTokenCandles(asset, timeframeId) {
  const timeframe = timeframeById(timeframeId)
  if (!timeframe) return null
  const key = `${assetKey(asset)}|${timeframe.id}`
  const hit = candleCache.get(key)
  if (hit && Date.now() - hit.at < timeframe.ttlMs) return hit.data
  // Two mounts in quick succession (React's dev double-mount, a remount
  // after an error boundary) must not be two upstream calls for one series.
  if (candleInflight.has(key)) return candleInflight.get(key)

  const promise = (async () => {
    try {
      const resolved = await resolvePool(asset)
      if (!resolved) return null
      const { network, pool } = resolved
      const path = ohlcvPath(network, pool.address, timeframe.timeframe, timeframe.aggregate, timeframe.limit)
      let candles
      if (IS_PROD) {
        const body = await fetchJson(
          `${API_BASE}/api/candles?op=ohlcv&network=${network}&pool=${encodeURIComponent(pool.address)}` +
            `&timeframe=${timeframe.timeframe}&aggregate=${timeframe.aggregate}&limit=${timeframe.limit}${API_CACHE_SUFFIX}`
        )
        candles = Array.isArray(body?.candles) ? body.candles : []
      } else {
        candles = normalizeOhlcv(await fetchJson(`/gt${GT_API_PREFIX}${path}`))
      }
      if (candles.length === 0) return null
      const data = { network, pool, timeframe: timeframe.id, candles }
      candleCache.set(key, { at: Date.now(), data })
      return data
    } catch {
      return null
    } finally {
      candleInflight.delete(key)
    }
  })()
  candleInflight.set(key, promise)
  return promise
}

/**
 * Stock candles for a symbol: { symbol, interval, range, candles } or null.
 * interval/range must be inside /api/history's allowlists (see
 * STOCK_INTERVALS / STOCK_RANGES in lib/candles.js); anything else is refused
 * here rather than spending a round trip on a 400.
 */
export async function getStockCandles(symbol, interval, range) {
  if (!symbol || !isStockRequest(interval, range)) return null
  const key = `${symbol}|${interval}|${range}`
  const hit = stockCache.get(key)
  if (hit && Date.now() - hit.at < STOCK_TTL) return hit.data

  const yahooSymbol = symbol.replace('.', '-') // Yahoo uses BRK-B, Finnhub BRK.B
  const url = IS_PROD
    ? `${API_BASE}/api/history?symbol=${encodeURIComponent(yahooSymbol)}&interval=${interval}&range=${range}${API_CACHE_SUFFIX}`
    : `/yfin/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}&range=${range}`
  try {
    const candles = normalizeYahooCandles(await fetchJson(url))
    if (candles.length === 0) return null
    const data = { symbol, interval, range, candles }
    stockCache.set(key, { at: Date.now(), data })
    return data
  } catch {
    return null
  }
}
