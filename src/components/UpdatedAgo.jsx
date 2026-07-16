import { useEffect, useState } from 'react'
import { usePrices } from '../state/PricesContext'

function ago(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  return `${Math.round(m / 60)}h ago`
}

/*
 * Live "Updated Xs ago" label; self-ticks so the rest of the app doesn't
 * re-render. Tappable: impatient thumbs can force a refresh even though the
 * app polls on its own.
 */
export default function UpdatedAgo({ className = '' }) {
  const { lastFetchAt, status, marketOpen, refresh } = usePrices()
  const [, setTick] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  // Fresh data arrived → the manual refresh is done.
  useEffect(() => {
    setRefreshing(false)
  }, [lastFetchAt])

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
  const label = refreshing
    ? 'Refreshing…'
    : status === 'stale'
      ? `Connection hiccup — showing prices from ${ago(Date.now() - lastFetchAt)}. Retrying…`
      : `Updated ${ago(Date.now() - lastFetchAt)}${closedNote} · tap to refresh`

  // Breathing dot: green while the feed is fresh, gray when it isn't.
  const live = status === 'live' && Date.now() - lastFetchAt < 90_000

  return (
    <button
      onClick={() => {
        setRefreshing(true)
        refresh()
      }}
      className={`block w-full text-xs text-zinc-600 transition-colors active:text-zinc-400 ${className}`}
    >
      <span
        aria-hidden="true"
        className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${
          live ? 'animate-pulse bg-gain' : 'bg-zinc-700'
        }`}
      />
      {label}
    </button>
  )
}
