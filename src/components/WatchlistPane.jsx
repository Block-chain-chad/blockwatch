import { useEffect, useRef } from 'react'
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { useSparklines } from '../hooks/useSparklines'
import { shareFreshness } from '../lib/provenance'
import { AssetRow } from './shared'
import { TrashIcon } from './Icons'

const EMPTY_TEXT = 'Your watchlist is empty. Add the tokens you care about.'

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
 *
 * `onRemove` adds the row's remove button (TradingView reveals its own on
 * row hover). It is a prop rather than a call to toggleWatchlist here
 * because the pane also renders a FOLDER's rows: only the caller knows
 * which list a row is being taken out of. Omitted, no button renders and
 * the DOM is unchanged.
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
  onRemove,
  removeLabel = 'Remove from watchlist',
}) {
  const { assets, marketOpen, session } = usePrices()
  const { watchlistIds } = useFolders()
  const ids = assetIds ?? watchlistIds
  useAssetSubscription(subscriptionKey, ids)
  const sparks = useSparklines(ids)
  const watched = assets.filter((a) => ids.includes(a.id))
  // Per row, from that row's own quote timestamp: the quote set is capped
  // and rotates, so one batch age for every row would mark fresh symbols
  // stale and stale ones fresh.
  const isDelayed = (a) => showDelayed && shareFreshness({ quote: a.stockQuote, session }).state !== 'live'

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
          className={`group relative ${a.id === currentId ? 'bg-zinc-900' : ''}`}
        >
          <AssetRow
            asset={a}
            onOpen={onOpen}
            spark={sparks[a.id]}
            marketOpen={marketOpen}
            barWidth={barWidth}
            delayed={isDelayed(a)}
          />
          {/* Sits over the row's right edge, which is where the prices are,
              so it only appears on hover or keyboard focus — the numbers are
              what the row is for. Removal is undoable from the folders
              toast, so it asks nothing first. */}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(a)
              }}
              aria-label={`${removeLabel}: ${a.ticker}`}
              title={removeLabel}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-zinc-950/90 p-1.5 text-zinc-500 opacity-0 transition-opacity hover:text-loss focus-visible:opacity-100 group-hover:opacity-100"
            >
              <TrashIcon size={15} />
            </button>
          )}
        </div>
      ))}
    </>
  )
}
