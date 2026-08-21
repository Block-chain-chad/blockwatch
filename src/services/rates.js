// US Treasury yields. Its own service rather than another section of
// stocks.js: different upstream, different cadence, and nothing here has a
// token, an underlying or a gap.

import { API_BASE, API_CACHE_QUERY } from './apiBase'
import { parseFredCsv } from '../../api/_fred.js'

const IS_PROD = import.meta.env.PROD

/** Short, belly, long. Keys match FRED series ids; order is display order. */
export const MATURITIES = [
  { id: 'DGS2', label: '2-year' },
  { id: 'DGS10', label: '10-year' },
  { id: 'DGS30', label: '30-year' },
]
const IDS = MATURITIES.map((m) => m.id)

// FRED posts once per business day, so an hour-old answer is still today's.
const TTL = 60 * 60_000
let cache = null

/**
 * { asOf, series: { DGS2: { value, at, change }, … } }, or null when the feed
 * is unavailable — callers render nothing rather than an error.
 */
export async function getTreasuryYields() {
  if (cache && Date.now() - cache.at < TTL) return cache.data
  try {
    let data
    if (IS_PROD) {
      const res = await fetch(`${API_BASE}/api/rates${API_CACHE_QUERY}`)
      if (!res.ok) throw new Error(`rates ${res.status}`)
      data = await res.json()
    } else {
      // Dev has no serverless function; fetch and trim the raw CSV here using
      // the same parser the endpoint uses, so both paths agree.
      const res = await fetch(`/fred/graph/fredgraph.csv?id=${IDS.join(',')}`)
      if (!res.ok) throw new Error(`rates ${res.status}`)
      data = parseFredCsv(await res.text(), IDS)
    }
    if (!data?.asOf) return null
    cache = { at: Date.now(), data }
    return data
  } catch {
    return null
  }
}
