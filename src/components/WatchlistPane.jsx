import { useEffect, useRef } from 'react'
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { useSparklines } from '../hooks/useSparklines'
import { isStockDelayed } from '../lib/provenance'
import { AssetRow } from './shared'

const EMPTY_TEXT = 'Your watchlist is empty — add the tokens you care about.'

/**
 * The watchlist as a sidebar, for the desktop asset screen. Same phone
 * AssetRow the Home list uses — the desktop table row's grid needs ~830px,
 * which is more than a sidebar can give it. No chips, search, session line or
 * error surface: this pane is for moving between assets, not for finding them.
 *
 * The subscription key differs from Home's 'home-watchlist' on purpose:
 * PricesContext keeps a Map per key, so both screens can be mounted at once.
 *
 * The desktop right column drives it with `assetIds` (a folder's rows rather
 * than the watchlist), its own `subscriptionKey`, the column's `barWidth`,
 * a `header` node in place of the fixed one (null for none), an `emptyText`
 * for the folder case and `showDelayed`, which puts the legend's D badge on
 * every row's stock price while the share quote is not live (spec A23) —
 * the same `isStockDelayed` the chart legend keys on, so the two can never
 * disagree. Every one of them defaults to what the pane did before, so the
 * existing call site renders the same DOM.
 */
export default function WatchlistPane({
  currentId,
  onOpen,
  assetIds,
  subscriptionKey = 'detail-watchlist',
  barWidth,
  header,
  emptyText = EMPTY_TEXT,
  showDelayed = false,
}) {
  const { assets, marketOpen, session, stocksAt } = usePrices()
  const { watchlistIds } = useFolders()
  const ids = assetIds ?? watchlistIds
  useAssetSubscription(subscriptionKey, ids)
  const sparks = useSparklines(ids)
  const watched = assets.filter((a) => ids.includes(a.id))
  const stockAge = stocksAt ? (Date.now() - stocksAt) / 1000 : null
  const stockDelayed = showDelayed && isStockDelayed(session, stockAge)

  // App keys <AssetDetail> by asset id, so every sidebar click remounts this
  // pane inside a fresh <aside> whose scrollTop is back at 0. Bring the row
  // for the open asset back into view once, on mount. 'nearest' does nothing
  // when the row is already visible, and on phones the aside is display:none
  // so there is no layout box and the call is a no-op.
  const currentRef = useRef(null)
  useEffect(() => {
    currentRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [])

  if (watched.length === 0) {
    return <p className="t-caption px-4 py-6 text-zinc-500">{emptyText}</p>
  }

  // `header` omitted → the fixed header; null → nothing; a node → that node.
  const head =
    header === undefined ? (
      <div
        className="flex items-baseline justify-between border-b px-4 pb-1.5 pt-3"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">Watchlist</span>
        <span className="t-micro text-zinc-500">Gap · token / stock</span>
      </div>
    ) : (
      header
    )

  return (
    <>
      {head}
      {watched.map((a) => (
        <div
          key={a.id}
          ref={a.id === currentId ? currentRef : undefined}
          aria-current={a.id === currentId ? 'true' : undefined}
          className={a.id === currentId ? 'bg-zinc-900' : undefined}
        >
          <AssetRow
            asset={a}
            onOpen={onOpen}
            spark={sparks[a.id]}
            marketOpen={marketOpen}
            barWidth={barWidth}
            delayed={stockDelayed}
          />
        </div>
      ))}
    </>
  )
}
