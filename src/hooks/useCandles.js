import { useEffect, useState } from 'react'
import { getTokenCandles, getStockCandles } from '../services/candles'
import { stockRequestFor } from '../lib/candles'

const EMPTY = { loading: false, data: null }

/**
 * Candles for one side of the gap at one timeframe.
 *
 *   series 'token' → the DEX pool the token trades in (services/candles.js
 *     resolves and caches the pool per asset); data carries { network, pool,
 *     candles }.
 *   series 'stock' → the underlying share via /api/history at the interval
 *     lib/candles.js maps this timeframe to; data carries { symbol, candles }.
 *
 * `asset` is the STATIC universe record (services key their caches on its
 * id and read ticker / mint / issuer / underlying), or null for "load
 * nothing".
 *
 * Returns { loading, data } where data is null whenever there is nothing to
 * draw — no pool, no underlying, an upstream failure, an empty series. The
 * services never throw for those, so the caller renders nothing rather than
 * an error. A response for a request that is no longer current is dropped.
 */
export function useCandles(asset, series, timeframeId) {
  const [state, setState] = useState({ loading: true, data: null })

  useEffect(() => {
    if (!asset) {
      setState(EMPTY)
      return
    }
    let cancelled = false
    setState({ loading: true, data: null })
    const request =
      series === 'stock'
        ? (() => {
            const req = stockRequestFor(timeframeId)
            return req && asset.underlying
              ? getStockCandles(asset.underlying, req.interval, req.range)
              : Promise.resolve(null)
          })()
        : getTokenCandles(asset, timeframeId)
    request.then(
      (data) => {
        if (!cancelled) setState({ loading: false, data })
      },
      () => {
        if (!cancelled) setState(EMPTY)
      }
    )
    return () => {
      cancelled = true
    }
    // `asset` must be the static universe record, which is one object for
    // the life of the app — the live one is re-created on every price tick
    // and would refetch on each.
  }, [asset, series, timeframeId])

  return state
}
