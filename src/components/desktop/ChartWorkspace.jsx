import { useEffect } from 'react'
import { useAsset } from '../../state/PricesContext'
import { recordView } from '../../lib/recentViews'

/*
 * PLACEHOLDER. The chart workspace (spec §6.9 — toolbar, the Gap / Candles
 * chart, the gap-history pane, the tabs under the chart, the legend, the tab
 * title) lands in the next stream and replaces this file whole. This version
 * exists so the shell compiles and can be looked at: it shows the selected
 * asset's ticker and the empty state, and feeds "Recently viewed" the way
 * the phone asset screen does.
 *
 * Props the real one takes: assetId, onSelectAsset, onScrub (the shell's
 * setter — a Gap-chart scrub drives the right column's gap panel), searchRef
 * (the legend's ticker button focuses the symbol search).
 */
export default function ChartWorkspace({ assetId }) {
  const asset = useAsset(assetId)

  useEffect(() => {
    if (assetId) recordView(assetId)
  }, [assetId])

  if (!assetId) {
    return (
      <div className="flex h-full items-center justify-center px-6">
        <p className="t-body text-center text-zinc-400">
          Search for a ticker, or pick one from your watchlist.
        </p>
      </div>
    )
  }

  return (
    <div className="px-6 py-4">
      <span className="t-label text-zinc-100">{asset?.ticker ?? assetId}</span>
    </div>
  )
}
