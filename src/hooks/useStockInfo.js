import { useEffect, useState } from 'react'
import { getStockProfile, getAnalystRecs, getEarnings, getCompanyNews } from '../services/stocks'

const EMPTY = { loading: false, profile: null, recs: null, earnings: null, news: null }

/**
 * Company info for the detail screen (about, analyst ratings, earnings, news).
 * Fetched in parallel when a detail opens; each piece is independently null
 * when unavailable (ETFs/treasuries, no Finnhub key, API failure) so the UI
 * simply hides that section.
 */
export function useStockInfo(underlying) {
  const [info, setInfo] = useState(underlying ? { ...EMPTY, loading: true } : EMPTY)

  useEffect(() => {
    if (!underlying) {
      setInfo(EMPTY)
      return
    }
    let cancelled = false
    setInfo({ ...EMPTY, loading: true })
    Promise.all([
      getStockProfile(underlying),
      getAnalystRecs(underlying),
      getEarnings(underlying),
      getCompanyNews(underlying),
    ]).then(([profile, recs, earnings, news]) => {
      if (!cancelled) setInfo({ loading: false, profile, recs, earnings, news })
    })
    return () => {
      cancelled = true
    }
  }, [underlying])

  return info
}
