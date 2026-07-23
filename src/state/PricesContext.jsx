import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ASSETS, BY_ID, CORE_IDS } from '../data/universe'
import { mergeAssets } from '../lib/prices'
import { isUsMarketOpen } from '../lib/market'
import { fetchTokenMarkets, loadPriceCache, savePriceCache, POLL_MS } from '../services/coingecko'
import { fetchFastPrices, FAST_POLL_MS } from '../services/jupiter'
import {
  getStockPrices,
  loadStockCache,
  saveStockCache,
  STOCK_POLL_MS,
  CLOSED_MARKET_REFRESH_MS,
} from '../services/stocks'

const PricesContext = createContext(null)

// Max stock quotes per cycle/burst — Finnhub free is 60/min and the quote set
// must never own the whole budget. Overflow rotates through on later cycles.
const STOCK_QUOTE_CAP = 50

/*
 * Free-tier budget over a ~900-asset universe means we can't poll everything:
 *  - token prices: the CORE_IDS slice (top of market by cap) polls every
 *    minute in batched CoinGecko chunks; long-tail assets poll only while a
 *    screen subscribes to them.
 *  - fast layer: subscribed assets with a Solana mint (xStocks) additionally
 *    tick every couple of seconds from Jupiter's DEX price feed — the
 *    "prices are alive" feel, layered over the polling base. Best-effort:
 *    if Jupiter is down, the minute poll still owns the numbers.
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
  // Assets the fast layer is actively feeding (and when it last answered).
  // The minute poll must NOT overwrite their tokenPrice: CoinGecko lags the
  // DEX by minutes, so doing so would snap live prices backwards every cycle.
  const fastFedRef = useRef({ at: 0, ids: new Set() })
  // Fast-layer discipline: one request in flight at a time, responses applied
  // in order only, a cool-off after failures, and a cross-tab leader lock so
  // N open tabs don't multiply 24 req/min against Jupiter's per-IP budget.
  const fastSeqRef = useRef(0)
  const fastBusyRef = useRef(false)
  const fastPauseUntilRef = useRef(0)
  const tabIdRef = useRef(Math.random().toString(36).slice(2))
  const lastRefreshRef = useRef(0)
  const quoteRotorRef = useRef(0)

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
    let fastTimer = null
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
        // Fast-fed assets keep their live DEX tokenPrice (fresher than this
        // batch) while still taking the batch's 24h change / cap / volume.
        const fastFresh = Date.now() - fastFedRef.current.at < FAST_POLL_MS * 6
        const prices = { ...s.prices }
        for (const [id, row] of Object.entries(data)) {
          const livePrice =
            fastFresh && fastFedRef.current.ids.has(id) ? s.prices[id]?.tokenPrice : null
          prices[id] = livePrice != null ? { ...row, tokenPrice: livePrice } : row
        }
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
      // Cap quotes per cycle (a 100-asset folder must not fire 100 Finnhub
      // calls a minute); overflow rotates through on subsequent cycles.
      const all = subscribedTickers()
      let list = all
      if (all.length > STOCK_QUOTE_CAP) {
        const off = quoteRotorRef.current % all.length
        list = all.slice(off, off + STOCK_QUOTE_CAP)
        if (list.length < STOCK_QUOTE_CAP) list = list.concat(all.slice(0, STOCK_QUOTE_CAP - list.length))
        quoteRotorRef.current = (off + STOCK_QUOTE_CAP) % all.length
      }
      await fetchStocks(list)
    }

    // Cross-tab leader lock (localStorage heartbeat): only one tab runs the
    // fast layer, so N open tabs can't multiply 24 req/min against Jupiter's
    // per-IP budget. Self-healing — the leader's heartbeat goes stale within
    // 3 ticks of it closing/hiding, and the next visible tab takes over.
    function claimFastLeadership() {
      try {
        const raw = localStorage.getItem('bw.fastLeader.v1')
        const cur = raw ? JSON.parse(raw) : null
        if (cur && cur.id !== tabIdRef.current && Date.now() - cur.at < FAST_POLL_MS * 3) {
          return false // someone else is actively leading
        }
        localStorage.setItem(
          'bw.fastLeader.v1',
          JSON.stringify({ id: tabIdRef.current, at: Date.now() })
        )
        return true
      } catch {
        return true // storage unavailable → single-tab context anyway
      }
    }

    // Fast layer: live DEX ticks for on-screen assets that have a Solana
    // mint. Merges ONLY tokenPrice over the polling base; skips the setState
    // entirely when nothing moved, so idle markets cost no re-renders.
    async function tickFast() {
      if (document.hidden) return // nobody's looking; also frees leadership
      if (fastBusyRef.current) return // one request in flight at a time
      if (Date.now() < fastPauseUntilRef.current) return // cooling off a failure
      if (!claimFastLeadership()) return

      const pairs = []
      // Most recently mounted screens first: an open detail view outranks
      // background subscriptions when we hit the per-call mint cap.
      const subLists = [...subsRef.current.values()].reverse()
      const seen = new Set()
      for (const ids of subLists) {
        for (const id of ids) {
          if (seen.has(id)) continue
          seen.add(id)
          const mint = BY_ID[id]?.mint
          if (mint) pairs.push({ id, mint })
          if (pairs.length >= 40) break
        }
        if (pairs.length >= 40) break
      }
      if (pairs.length === 0) return

      const seq = ++fastSeqRef.current
      fastBusyRef.current = true
      try {
        const live = await fetchFastPrices(pairs.map((p) => p.mint))
        if (cancelled || seq !== fastSeqRef.current) return // stale response
        // Record coverage — "Jupiter answered for these ids just now" is what
        // shields them from the slow poll. Union with prior coverage so one
        // thin response can't drop the shield mid-window for an asset.
        const covered = new Set(pairs.filter((p) => live[p.mint] != null).map((p) => p.id))
        if (Date.now() - fastFedRef.current.at < FAST_POLL_MS * 6) {
          for (const id of fastFedRef.current.ids) covered.add(id)
        }
        fastFedRef.current = { at: Date.now(), ids: covered }

        const updates = {}
        for (const { id, mint } of pairs) {
          const px = live[mint]
          if (px == null) continue
          const row = pricesRef.current[id]
          // Never fabricate a price-only row: a tokenPrice without volume/cap
          // would flash a false "thin trading" tag until the poll fills it in.
          if (row == null) continue
          const prev = row.tokenPrice
          // Ignore sub-display-precision moves (~0.005%): no visible digit
          // changes, so an update would only burn renders and fake flashes.
          if (prev != null && Math.abs(px - prev) / prev < 0.00005) continue
          updates[id] = { ...row, tokenPrice: px }
        }
        if (Object.keys(updates).length === 0) return
        setTokenState((s) => {
          const prices = { ...s.prices, ...updates }
          pricesRef.current = prices
          return { ...s, prices }
        })
      } catch {
        // best-effort layer — pause briefly so we don't hammer an unhappy API
        fastPauseUntilRef.current = Date.now() + 30_000
      } finally {
        fastBusyRef.current = false
      }
    }

    // A screen just subscribed: fetch only what it's missing, right away.
    // (Bypasses the closed-market skip — a first paint needs SOME quote.)
    async function topUp() {
      const missingIds = [...subscribedIds()].filter((id) => !pricesRef.current[id])
      // Same per-burst cap as the cycle: a giant folder's first open fills
      // the rest via rotation instead of one 100-call burst.
      const missingTickers = subscribedTickers()
        .filter((t) => !quotesRef.current[t])
        .slice(0, STOCK_QUOTE_CAP)
      await Promise.allSettled([
        missingIds.length > 0 ? fetchTokens(missingIds).catch(() => {}) : null,
        fetchStocks(missingTickers),
      ])
    }
    topUpRef.current = topUp

    function start() {
      tickTokens()
      tickStocks()
      tickFast() // immediate first tick: live numbers on load, not 2.5s later
      tokenTimer = setInterval(tickTokens, POLL_MS)
      stockTimer = setInterval(tickStocks, STOCK_POLL_MS)
      fastTimer = setInterval(tickFast, FAST_POLL_MS)
    }

    function stop() {
      if (tokenTimer) clearInterval(tokenTimer)
      if (stockTimer) clearInterval(stockTimer)
      if (fastTimer) clearInterval(fastTimer)
      tokenTimer = null
      stockTimer = null
      fastTimer = null
    }

    function onVisibility() {
      if (document.hidden) {
        stop()
      } else if (!tokenTimer) {
        // Refresh immediately if the data went stale while hidden.
        if (!tokenFetchRef.current || Date.now() - tokenFetchRef.current > POLL_MS) {
          start()
        } else {
          tickFast() // wake the live layer right away on tab return
          tokenTimer = setInterval(tickTokens, POLL_MS)
          stockTimer = setInterval(tickStocks, STOCK_POLL_MS)
          fastTimer = setInterval(tickFast, FAST_POLL_MS)
        }
      }
    }

    // Mounted in a background tab? Don't burn API quota until someone looks —
    // onVisibility's start() branch fires on the first reveal.
    if (!document.hidden) start()
    refreshRef.current = () => {
      tickTokens()
      tickStocks(true)
      tickFast()
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
      refresh: () => {
        // Debounced: mashing tap-to-refresh must not stack API bursts.
        if (Date.now() - lastRefreshRef.current < 5_000) return
        lastRefreshRef.current = Date.now()
        refreshRef.current?.()
      },
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
