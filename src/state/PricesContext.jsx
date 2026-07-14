import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ASSETS, BY_ID, CORE_IDS } from '../data/universe'
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

/*
 * Free-tier budget over a ~900-asset universe means we can't poll everything:
 *  - token prices: the CORE_IDS slice (top of market by cap) polls every
 *    minute in batched CoinGecko chunks; long-tail assets poll only while a
 *    screen subscribes to them.
 *  - stock quotes: ONLY subscribed assets' underlyings are quoted (Finnhub
 *    free tier can't take 300 underlyings/min). Home's watchlist, an open
 *    folder, and an open detail screen each subscribe what they render.
 *
 * Screens declare what they show via useAssetSubscription(key, assetIds);
 * newly subscribed assets missing data are fetched within ~150ms (coalesced),
 * so opening a long-tail asset paints prices about as fast as a core one.
 *
 * Both loops hydrate from localStorage so the watchlist is never a blank
 * screen (3-second rule), and both pause while the tab is hidden.
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
  const pricesRef = useRef(tokenState.prices)
  const quotesRef = useRef(stockState.quotes)
  const refreshRef = useRef(null)

  // Subscription registry: screen key -> asset ids currently on screen.
  const subsRef = useRef(new Map())
  const topUpTimerRef = useRef(null)
  const topUpRef = useRef(null)

  function subscribedIds() {
    const set = new Set()
    for (const ids of subsRef.current.values()) for (const id of ids) set.add(id)
    return set
  }

  function subscribedTickers() {
    const set = new Set()
    for (const id of subscribedIds()) {
      const t = BY_ID[id]?.underlying
      if (t) set.add(t)
    }
    return [...set]
  }

  const setSubscription = useCallback((key, ids) => {
    const clean = [...new Set(ids.filter((id) => BY_ID[id]))]
    const prev = subsRef.current.get(key) ?? []
    if (clean.length === 0) subsRef.current.delete(key)
    else subsRef.current.set(key, clean)
    if (prev.join('|') === clean.join('|')) return
    // Coalesce mount bursts, then fetch whatever the new screen is missing.
    if (topUpTimerRef.current) return
    topUpTimerRef.current = setTimeout(() => {
      topUpTimerRef.current = null
      topUpRef.current?.()
    }, 150)
  }, [])

  useEffect(() => {
    let tokenTimer = null
    let stockTimer = null
    let cancelled = false

    function tokenPollIds() {
      const set = subscribedIds()
      for (const id of CORE_IDS) set.add(id)
      return [...set]
    }

    async function fetchTokens(ids) {
      const data = await fetchTokenMarkets(ids)
      if (cancelled) return
      const at = Date.now()
      tokenFetchRef.current = at
      setTokenState((s) => {
        // Merge over previous so a failed chunk (or a narrowed poll set)
        // keeps showing the last good numbers for everything else.
        const prices = { ...s.prices, ...data }
        pricesRef.current = prices
        savePriceCache(at, prices)
        return { prices, lastFetchAt: at, status: 'live' }
      })
    }

    async function tickTokens() {
      try {
        await fetchTokens(tokenPollIds())
      } catch {
        if (cancelled) return
        // 'error' = first-ever load failed with no cache to fall back on;
        // polling keeps retrying automatically either way.
        setTokenState((s) => ({ ...s, status: s.lastFetchAt ? 'stale' : 'error' }))
      }
    }

    async function fetchStocks(tickers) {
      if (tickers.length === 0) return
      try {
        const data = await getStockPrices(tickers)
        if (cancelled) return
        const at = Date.now()
        stockFetchRef.current = at
        // Merge over previous quotes so a partial failure keeps older tickers.
        setStockState((s) => {
          const quotes = { ...s.quotes, ...data }
          quotesRef.current = quotes
          saveStockCache(at, quotes)
          return { quotes, at }
        })
      } catch {
        // keep showing cached quotes; next tick retries
      }
    }

    async function tickStocks(force = false) {
      // Closed market + reasonably fresh close on hand → skip the network.
      const closedAndFresh =
        !isUsMarketOpen() &&
        stockFetchRef.current &&
        Date.now() - stockFetchRef.current < CLOSED_MARKET_REFRESH_MS
      if (closedAndFresh && !force) return
      await fetchStocks(subscribedTickers())
    }

    // A screen just subscribed: fetch only what it's missing, right away.
    // (Bypasses the closed-market skip — a first paint needs SOME quote.)
    async function topUp() {
      const missingIds = [...subscribedIds()].filter((id) => !pricesRef.current[id])
      const missingTickers = subscribedTickers().filter((t) => !quotesRef.current[t])
      await Promise.allSettled([
        missingIds.length > 0 ? fetchTokens(missingIds).catch(() => {}) : null,
        fetchStocks(missingTickers),
      ])
    }
    topUpRef.current = topUp

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
    refreshRef.current = () => {
      tickTokens()
      tickStocks(true)
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      stop()
      if (topUpTimerRef.current) clearTimeout(topUpTimerRef.current)
      topUpTimerRef.current = null
      topUpRef.current = null
      refreshRef.current = null
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value = useMemo(() => {
    const assets = mergeAssets(ASSETS, tokenState.prices, stockState.quotes)
    const byId = Object.fromEntries(assets.map((a) => [a.id, a]))
    return {
      assets,
      byId,
      lastFetchAt: tokenState.lastFetchAt,
      status: tokenState.status,
      stocksAt: stockState.at,
      marketOpen: isUsMarketOpen(),
      refresh: () => refreshRef.current?.(),
      setSubscription,
    }
  }, [tokenState, stockState, setSubscription])

  return <PricesContext.Provider value={value}>{children}</PricesContext.Provider>
}

export function usePrices() {
  return useContext(PricesContext)
}

export function useAsset(id) {
  return useContext(PricesContext).byId[id] ?? null
}

/**
 * Declare the asset ids a screen is currently rendering. While subscribed,
 * their token prices poll every cycle (even outside the core slice) and
 * their underlyings' stock quotes are fetched — quotes ONLY flow for
 * subscribed assets. `key` must be unique per screen instance.
 */
export function useAssetSubscription(key, assetIds) {
  const { setSubscription } = useContext(PricesContext)
  const sig = [...new Set(assetIds)].sort().join('|')
  useEffect(() => {
    setSubscription(key, sig ? sig.split('|') : [])
    return () => setSubscription(key, [])
  }, [setSubscription, key, sig])
}
