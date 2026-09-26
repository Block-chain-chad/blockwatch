import { useEffect, useState } from 'react'
import { fetchTokenHistory } from '../services/coingecko'
import { getStockHistory } from '../services/stocks'
import { gapCheck, sharesPerToken, MAX_PLAUSIBLE_GAP_PCT } from '../lib/gapCheck'

// Range → CoinGecko days + Yahoo interval/range. For 1D we ask Yahoo for 5d
// and clip: on weekends "1d" would return only Friday's session, entirely
// outside the token's 24h window.
export const CHART_RANGES = {
  '1D': { days: 1, interval: '5m', yrange: '5d' },
  '1W': { days: 7, interval: '30m', yrange: '5d' },
  '1M': { days: 30, interval: '1d', yrange: '1mo' },
  '3M': { days: 90, interval: '1d', yrange: '3mo' },
  '1Y': { days: 365, interval: '1d', yrange: '1y' },
}

/**
 * Premium history: for each token price point, the % gap vs the most recent
 * stock price at that moment. Stock quotes only exist during market hours, so
 * we forward-fill (nights/weekends measure against the last close — the same
 * semantic the live premium pill uses when markets are closed).
 * Uses the UNCLIPPED stock series so early-window token points can reference
 * the prior session's close.
 *
 * UNITS. Both sides are PER SHARE, which is the only way this subtraction
 * means anything. The token side comes from CoinGecko's market_chart, and
 * CoinGecko applies the issuer's scaled-amount multiplier itself: checked
 * against mainnet on 2026-09-16, NFLXx (ratio 10) came back at 76.98 while
 * its DEX pool priced a base token at 757 and the real NFLX share was 76.41.
 * So nothing is converted here for xStocks, and nothing should be: dividing
 * this series by the multiplier would invent a 90% discount on a screen with
 * a Buy button. The pool-sourced candles in services/candles.js are the ones
 * that do need converting; they arrive per base token.
 *
 * Ondo is different: CoinGecko quotes an Ondo token per token, and one token
 * tracks sValue shares (10 on NFLXon). The hook below divides by the verified
 * sValue before this runs; see sharesPerToken in lib/gapCheck.js.
 */
export function buildPremiumSeries(token, stockRaw, fallbackStockPrice) {
  const src =
    stockRaw.length > 0
      ? stockRaw
      : fallbackStockPrice != null
        ? [{ t: 0, v: fallbackStockPrice }]
        : []
  if (src.length === 0 || token.length < 2) return []
  const out = []
  let i = 0
  for (const p of token) {
    while (i + 1 < src.length && src[i + 1].t <= p.t) i++
    if (src[i].t > p.t) continue // token point precedes all stock data
    const v = ((p.v - src[i].v) / src[i].v) * 100
    // The same bound the live gap is held to (lib/gapCheck.js): a point past
    // it is a bad print, not history worth drawing or ranking against.
    if (!Number.isFinite(v) || Math.abs(v) > MAX_PLAUSIBLE_GAP_PCT) continue
    out.push({ t: p.t, v })
  }
  return out
}

/**
 * The gap history is shown only while the live gap is: an asset whose ratio
 * is unverified, whose token price is stale, or whose gap is not confirmed
 * gets no history either, on the phone chart, the desktop gap chart or the
 * Readout's percentile. Applied when read, not when fetched, so it follows
 * the live verdict as prices arrive.
 */
export function gatedPremium(asset, premium, now) {
  return gapCheck(asset, now).status === 'ok' ? premium : []
}

/**
 * Loads both lines of the signature chart for an asset + range, plus the
 * derived premium-history series (no extra API calls).
 * Returns { loading, error, token, stock, premium, stockIsFlat }.
 *
 * The token trades 24/7 but the stock only during market hours, so the stock
 * series is clipped to the token's time window. If no stock candles fall
 * inside it (market closed all window, e.g. weekends on 1D), we draw a flat
 * line at the last close — that's the reference the premium is measured
 * against, labeled as such in the UI (stockIsFlat).
 */
export function useChartData(asset, range, retryKey = 0) {
  const [state, setState] = useState({
    loading: true,
    error: false,
    token: [],
    stock: [],
    premium: [],
    stockIsFlat: false,
  })

  useEffect(() => {
    let cancelled = false
    const cfg = CHART_RANGES[range]

    async function go() {
      setState((s) => ({ ...s, loading: true, error: false }))
      try {
        const [tokenRaw, stockRaw] = await Promise.all([
          fetchTokenHistory(asset.id, cfg.days),
          asset.underlying
            ? getStockHistory(asset.underlying, cfg).catch(() => [])
            : Promise.resolve([]),
        ])
        if (cancelled) return

        // Share units for the token line, like the live gap: an Ondo token
        // that tracks ten shares is divided by ten (lib/gapCheck.js). With no
        // verified ratio there is no token line and no gap history; drawing
        // it at an assumed 1:1 is how NFLXon came to be charted at 711.
        const shares = asset.underlying ? sharesPerToken(asset) : 1
        const token =
          shares == null ? [] : shares === 1 ? tokenRaw : tokenRaw.map((p) => ({ t: p.t, v: p.v / shares }))
        const windowStart = token[0]?.t ?? 0
        let stock = stockRaw.filter((p) => p.t >= windowStart)
        let stockIsFlat = false
        if (stock.length < 2 && asset.stockPrice != null && token.length >= 2) {
          stock = [
            { t: windowStart, v: asset.stockPrice },
            { t: token[token.length - 1].t, v: asset.stockPrice },
          ]
          stockIsFlat = true
        }
        const premium = asset.underlying
          ? buildPremiumSeries(token, stockRaw, asset.stockPrice)
          : []
        setState({ loading: false, error: false, token, stock, premium, stockIsFlat })
      } catch {
        if (!cancelled)
          setState({ loading: false, error: true, token: [], stock: [], premium: [], stockIsFlat: false })
      }
    }

    go()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, range, retryKey])

  return { ...state, premium: gatedPremium(asset, state.premium) }
}
