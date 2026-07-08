import { useEffect, useState } from 'react'
import { getStockProfile, getAnalystRecs, getEarnings } from '../services/stocks'

/**
 * Company info for the detail screen (about, analyst ratings, earnings).
 * Fetched in parallel when a detail opens; each piece is independently null
 * when unavailable (ETFs/treasuries, no Finnhub key, API failure) so the UI
 * simply hides that section.
 */
export function useStockInfo(underlying) {
  const [info, setInfo] = useState({ loading: Boolean(underlying), profile: null, recs: null, earnings: null })

  useEffect(() => {
    if (!underlying) {
      setInfo({ loading: false, profile: null, recs: null, earnings: null })
      return
    }
    let cancelled = false
    setInfo({ loading: true, profile: null, recs: null, earnings: null })
    Promise.all([getStockProfile(underlying), getAnalystRecs(underlying), getEarnings(underlying)]).then(
      ([profile, recs, earnings]) => {
        if (!cancelled) setInfo({ loading: false, profile, recs, earnings })
      }
    )
    return () => {
      cancelled = true
    }
  }, [underlying])

  return info
}
