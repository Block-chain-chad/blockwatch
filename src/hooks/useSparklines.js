import { useEffect, useState } from 'react'
import { fetchSparklines } from '../services/coingecko'

// 7-day sparkline data for a list of asset ids. localStorage-cached for 30
// minutes (shared across screens), one batched fetch when stale or when a
// screen shows ids the cache hasn't met.

const CACHE_KEY = 'bw.sparklines.v1'
const TTL = 30 * 60_000

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY))
    return parsed?.at && parsed?.data ? parsed : null
  } catch {
    return null
  }
}

export function useSparklines(ids) {
  const sig = [...new Set(ids)].sort().join('|')
  const [sparks, setSparks] = useState(() => readCache()?.data ?? {})

  useEffect(() => {
    if (!sig) return
    const wanted = sig.split('|')
    const cached = readCache()
    const fresh = cached && Date.now() - cached.at < TTL
    if (cached) setSparks(cached.data)
    if (fresh && wanted.every((id) => id in cached.data)) return

    let cancelled = false
    fetchSparklines(wanted)
      .then((map) => {
        if (cancelled) return
        const merged = { ...(cached?.data ?? {}), ...map }
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: merged }))
        } catch {
          // cache miss is fine
        }
        setSparks(merged)
      })
      .catch(() => {
        // sparklines are decoration — rows render fine without them
      })
    return () => {
      cancelled = true
    }
  }, [sig])

  return sparks
}
