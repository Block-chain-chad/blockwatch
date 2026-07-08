import { useEffect, useState } from 'react'
import { usePrices } from '../state/PricesContext'

function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

/* Live "Updated Xs ago" label; self-ticks so the rest of the app doesn't re-render. */
export default function UpdatedAgo({ className = '' }) {
  const { lastFetchAt, status, marketOpen } = usePrices()
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  if (!lastFetchAt) {
    return (
      <div className={`text-xs text-zinc-600 ${className}`}>
        {status === 'error'
          ? "We can't reach the price feed — check your connection. Retrying automatically."
          : 'Fetching live prices…'}
      </div>
    )
  }

  const closedNote = marketOpen ? '' : ' · US market closed — stock prices at last close'
  return (
    <div className={`text-xs text-zinc-600 ${className}`}>
      {status === 'stale'
        ? `Connection hiccup — showing prices from ${ago(Date.now() - lastFetchAt)}. Retrying…`
        : `Updated ${ago(Date.now() - lastFetchAt)}${closedNote}`}
    </div>
  )
}
