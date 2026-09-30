import { useEffect, useRef, useState } from 'react'
import { usePrices } from '../../state/PricesContext'
import { useFolders } from '../../state/FoldersContext'
import { useLocalState } from '../../hooks/useLocalState'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import { resolveListSource, WATCHLIST_SOURCE } from '../../lib/desktopState'
import { FilterChips, filterAssets } from '../shared'
import { ChevronDown } from '../Icons'
import TreasuryYields from '../TreasuryYields'
import WatchlistPane from '../WatchlistPane'
import AssetNumbers from './AssetNumbers'

const WATCHLIST_EMPTY = 'Your watchlist is empty. Add the tokens you care about.'
const FOLDER_EMPTY = 'No assets here yet.'

/*
 * The right column (spec §6.8): TradingView's watchlist over its Details
 * panel, with the gap in every slot it reserves for price. The list-name menu
 * lets a folder drive the rows without leaving the chart; the All / Stocks /
 * ETFs / Bonds chips and the Treasury curve under Bonds are the phone Home's,
 * moved. The watchlist block keeps at least 200px and the column scrolls when
 * the numbers below need more than what is left (§7 Q4).
 */
export default function RightColumn({
  assetId,
  onSelectAsset,
  listSource,
  onListSource,
  scrub,
  onVisibleIds,
}) {
  const { assets } = usePrices()
  const { folders, watchlistIds, toggleWatchlist, toggleAssetInFolder } = useFolders()
  const [filter, setFilter] = useLocalState('bw.desktop.filter.v1', 'all')
  const wide = useMediaQuery('(min-width: 80rem)')

  const list = resolveListSource(listSource, folders, watchlistIds)

  // A remembered folder that no longer exists: show the watchlist and stop
  // remembering it.
  useEffect(() => {
    if (list.missing) onListSource(WATCHLIST_SOURCE)
  }, [list.missing, onListSource])

  const members = assets.filter((a) => list.assetIds.includes(a.id))
  const ids = filterAssets(members, filter).map((a) => a.id)

  // The shell steps ↓/↑ through exactly the rows on screen (§6.8); report
  // them when they change, not on every price tick.
  const idsKey = ids.join('\n')
  useEffect(() => {
    onVisibleIds?.(idsKey ? idsKey.split('\n') : [])
  }, [idsKey, onVisibleIds])
  const emptyText = list.isFolder
    ? FOLDER_EMPTY
    : members.length === 0
      ? WATCHLIST_EMPTY
      : 'Nothing on your watchlist in this category yet.'

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className="flex shrink-0 items-center justify-between border-b px-4 py-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <ListMenu current={list} folders={folders} onPick={onListSource} />
        <span className="t-micro text-zinc-500">Gap · token / stock</span>
      </div>

      <div className="shrink-0">
        <FilterChips value={filter} onChange={setFilter} />
      </div>

      <div className="min-h-[200px] flex-1 overflow-y-auto">
        {filter === 'bond' && <TreasuryYields />}
        <WatchlistPane
          assetIds={ids}
          subscriptionKey="desktop-watchlist"
          currentId={assetId}
          onOpen={(a) => onSelectAsset(a.id)}
          barWidth={wide ? 88 : 64}
          header={null}
          emptyText={emptyText}
          showDelayed
          onRemove={(a) =>
            list.isFolder ? toggleAssetInFolder(list.id, a.id) : toggleWatchlist(a.id)
          }
          removeLabel={list.isFolder ? `Remove from ${list.name}` : 'Remove from watchlist'}
        />
      </div>

      {assetId && (
        <div className="shrink-0 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <AssetNumbers assetId={assetId} scrub={scrub} />
        </div>
      )}
    </div>
  )
}

/* "Open list…": the watchlist, then every folder. TradingView's list-name
   menu; choosing one makes it the active list. */
function ListMenu({ current, folders, onPick }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const listId = 'desktop-list-menu'

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
        rootRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const options = [
    { id: WATCHLIST_SOURCE, name: 'Watchlist' },
    ...folders.map((f) => ({ id: f.id, name: f.name })),
  ]

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        title="Open list"
        className="t-micro flex items-center gap-1 text-zinc-500 transition-colors hover:text-zinc-300"
      >
        <span className="max-w-[160px] truncate">{current.name}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Open list"
          className="absolute left-0 top-full z-30 mt-1 max-h-[50vh] min-w-[180px] overflow-y-auto rounded-xl bg-zinc-950 py-1 ring-1 ring-zinc-800/70"
        >
          {options.map((o) => {
            const active = o.id === current.id
            return (
              <li key={o.id} role="presentation">
                <button
                  role="option"
                  aria-selected={active}
                  aria-current={active ? 'true' : undefined}
                  onClick={() => {
                    onPick(o.id)
                    setOpen(false)
                  }}
                  className={`t-label w-full truncate px-3 py-2 text-left transition-colors hover:bg-zinc-900 ${
                    active ? 'text-zinc-100' : 'text-zinc-400'
                  }`}
                >
                  {o.name}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
