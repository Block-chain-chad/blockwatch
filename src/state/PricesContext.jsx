import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { SEED_ASSETS, SEED_IDS, UNDERLYING_TICKERS } from '../data/seedAssets'
import { mergeAssets } from '../lib/prices'
import { isUsMarketOpen } from '../lib/market'
import { fetchTokenMarkets, loadPriceCache, savePriceCache, POLL_MS } from '../services/coingecko'
import {
  getStockPrices,
  loadStockCache,
  saveStockCache,
  STOCK_POLL_MS,
  CLOSED_MARKET_REFRESH_MS,
} from '../services/stocks'

const PricesContext = createContext(null)

/**
 * Two polling loops, both hydrated from localStorage so the watchlist is never
 * a blank screen (3-second rule), both paused while the tab is hidden:
 *  - token prices: one batched CoinGecko request per minute
 *  - stock quotes: one pass per minute while the US market is open; when the
 *    market is closed the quote is the last close and can't move, so we refresh
 *    at most every 30 minutes.
 *
 * status: 'loading' (no token data yet) | 'live' | 'stale' (fetch failing, showing cached)
 */
export function PricesProvider({ children }) {
  const [tokenState, setTokenState] = useState(() => {
    const cached = loadPriceCache()
    return {
      prices: cached?.data ?? {},
      lastFetchAt: cached?.at ?? null,
      status: cached ? 'stale' : 'loading',
    }
  })
  const [stockState, setStockState] = useState(() => {
    const cached = loadStockCache()
    return { quotes: cached?.data ?? {}, at: cached?.at ?? null }
  })
  const tokenFetchRef = useRef(tokenState.lastFetchAt)
  const stockFetchRef = useRef(stockState.at)

  useEffect(() => {
    let tokenTimer = null
    let stockTimer = null
    let cancelled = false

    async function tickTokens() {
      try {
        const data = await fetchTokenMarkets(SEED_IDS)
        if (cancelled) return
        const at = Date.now()
        tokenFetchRef.current = at
        savePriceCache(at, data)
        setTokenState({ prices: data, lastFetchAt: at, status: 'live' })
      } catch {
        if (cancelled) return
        // 'error' = first-ever load failed with no cache to fall back on;
        // polling keeps retrying automatically either way.
        setTokenState((s) => ({ ...s, status: s.lastFetchAt ? 'stale' : 'error' }))
      }
    }

    async function tickStocks() {
      // Closed market + reasonably fresh close on hand → skip the network.
      const closedAndFresh =
        !isUsMarketOpen() &&
        stockFetchRef.current &&
        Date.now() - stockFetchRef.current < CLOSED_MARKET_REFRESH_MS
      if (closedAndFresh) return
      try {
        const data = await getStockPrices(UNDERLYING_TICKERS)
        if (cancelled) return
        const at = Date.now()
        stockFetchRef.current = at
        // Merge over previous quotes so a partial failure keeps older tickers.
        setStockState((s) => {
          const quotes = { ...s.quotes, ...data }
          saveStockCache(at, quotes)
          return { quotes, at }
        })
      } catch {
        // keep showing cached quotes; next tick retries
      }
    }

    function start() {
      tickTokens()
      tickStocks()
      tokenTimer = setInterval(tickTokens, POLL_MS)
      stockTimer = setInterval(tickStocks, STOCK_POLL_MS)
    }

    function stop() {
      if (tokenTimer) clearInterval(tokenTimer)
      if (stockTimer) clearInterval(stockTimer)
      tokenTimer = null
      stockTimer = null
    }

    function onVisibility() {
      if (document.hidden) {
        stop()
      } else if (!tokenTimer) {
        // Refresh immediately if the data went stale while hidden.
        if (!tokenFetchRef.current || Date.now() - tokenFetchRef.current > POLL_MS) {
          start()
        } else {
          tokenTimer = setInterval(tickTokens, POLL_MS)
          stockTimer = setInterval(tickStocks, STOCK_POLL_MS)
        }
      }
    }

    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const value = useMemo(() => {
    const assets = mergeAssets(SEED_ASSETS, tokenState.prices, stockState.quotes)
    const byId = Object.fromEntries(assets.map((a) => [a.id, a]))
    return {
      assets,
      byId,
      lastFetchAt: tokenState.lastFetchAt,
      status: tokenState.status,
      stocksAt: stockState.at,
      marketOpen: isUsMarketOpen(),
    }
  }, [tokenState, stockState])

  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>
}

export function usePrices() {
  return useContext(PricesContext)
}

export function useAsset(id) {
  return useContext(PricesContext).byId[id] ?? null
}
