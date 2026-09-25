import { useEffect, useRef, useState } from 'react'
import { resolvePool } from '../services/candles'
import { poolLiquidity, wantsPoolLookup } from '../lib/poolLiquidity'

/**
 * The charted pool's liquidity for Key statistics: { usd, asOf, poolName } or
 * null. Looks the pool up the first time `enabled` is true for an asset, and
 * never again for that asset while mounted, so opening and closing the
 * disclosure is one lookup at most. resolvePool shares its cache and its
 * in-flight request with the candle chart, so the two together are one
 * lookup too.
 *
 * `delayMs` waits that long after the asset settles before looking up, and
 * drops the lookup if the asset changes first. The desktop passes it: its
 * Key statistics is always open, so without a wait every row clicked on the
 * way to the one you want would spend the shared GeckoTerminal budget. The
 * phone opens the section by hand and passes nothing.
 *
 * Keyed on the asset's id: the live asset object is re-created on every price
 * tick and must not start a new lookup or restart the wait.
 */
export function usePoolLiquidity(asset, enabled, delayMs = 0) {
  const [state, setState] = useState(null) // { id, value }
  const asked = useRef(null)
  const id = asset?.id
  const want = enabled && Boolean(id) && wantsPoolLookup(asset)

  useEffect(() => {
    if (!want || asked.current === id) return undefined
    const lookUp = () => {
      asked.current = id
      // A slow answer for an asset the screen has already left must not
      // overwrite the answer for the one it is on now.
      const settle = (value) => setState((prev) => (asked.current === id ? { id, value } : prev))
      resolvePool(asset).then(
        (resolved) => settle(poolLiquidity(resolved, asset)),
        () => settle(null),
      )
    }
    if (!delayMs) {
      lookUp()
      return undefined
    }
    const timer = setTimeout(lookUp, delayMs)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, want, delayMs])

  return state?.id === id ? state.value : null
}
