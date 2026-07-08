import { useEffect, useState } from 'react'
import { fetchTokenHistory } from '../services/coingecko'
import { getStockHistory } from '../services/stocks'

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
 * Loads both lines of the signature chart for an asset + range.
 * Returns { loading, error, token, stock, stockIsFlat }.
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
    stockIsFlat: false,
  })

  useEffect(() => {
    let cancelled = false
    const cfg = CHART_RANGES[range]

    async function go() {
      setState((s) => ({ ...s, loading: true, error: false }))
      try {
        const [token, stockRaw] = await Promise.all([
          fetchTokenHistory(asset.id, cfg.days),
          asset.underlying
            ? getStockHistory(asset.underlying, cfg).catch(() => [])
            : Promise.resolve([]),
        ])
        if (cancelled) return

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
        setState({ loading: false, error: false, token, stock, stockIsFlat })
      } catch {
        if (!cancelled) setState({ loading: false, error: true, token: [], stock: [], stockIsFlat: false })
      }
    }

    go()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset.id, range, retryKey])

  return state
}
