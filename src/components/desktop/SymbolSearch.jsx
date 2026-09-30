import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import { popularSearches } from '../../data/mock'
import { usePrices } from '../../state/PricesContext'
import { useFolders } from '../../state/FoldersContext'
import { track } from '../../services/analytics'
import { formatPrice } from '../../lib/format'
import { rankAssets, popularPick, assetSubtitle } from '../../lib/search'
import { getRecentViews } from '../../lib/recentViews'
import { isMacPlatform } from '../../lib/desktopKeys'
import { SearchIcon, PlusIcon, CheckCircleIcon } from '../Icons'
import AssetLogo from '../AssetLogo'

/*
 * The top bar's symbol search (spec §6.6): an input styled like the phone
 * SearchBar with a results popover under it. Ranking is lib/search.js — the
 * same scoring the phone overlay uses — and the empty query shows the same
 * "Recently viewed" and "Popular" groups, without the phone's two discovery
 * shelves so the popover stays short.
 *
 * Keys, TradingView's: ↑/↓ move the highlight, Enter selects, Esc closes and
 * blurs; a click outside closes. The shell reaches in through `ref` —
 * focus(prefill) opens it with a letter already typed (any bare letter on
 * the desktop lands here) and close() shuts it from the Esc handler.
 */
const MAX_RESULTS = 12

export default function SymbolSearch({ ref, onSelectAsset }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const inputRef = useRef(null)
  const rootRef = useRef(null)
  const listId = 'desktop-symbol-search-list'
  const { assets } = usePrices()
  const { watchlistIds, toggleWatchlist } = useFolders()

  const q = query.trim().toLowerCase()
  const results = q ? rankAssets(assets, q).slice(0, MAX_RESULTS) : null

  // Empty query: this device's recent views, then the popular shortcuts
  // (one liquid version per underlying), minus anything already listed.
  let recent = []
  let popular = []
  if (!q) {
    recent = getRecentViews()
      .map((id) => assets.find((a) => a.id === id))
      .filter(Boolean)
    const seen = new Set(recent.map((a) => a.id))
    popular = popularSearches
      .map((t) => popularPick(assets, t))
      .filter((a) => a && !seen.has(a.id))
  }
  const rows = results ?? [...recent, ...popular]
  const highlighted = rows[Math.min(index, Math.max(rows.length - 1, 0))] ?? null

  function close() {
    const was = open
    setOpen(false)
    return was
  }

  function select(asset) {
    onSelectAsset(asset.id)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  useImperativeHandle(ref, () => ({
    focus(prefill = '') {
      setQuery(prefill)
      setIndex(0)
      setOpen(true)
      const el = inputRef.current
      if (el) {
        el.focus()
        // Put the caret after the letter the shortcut typed for the user.
        requestAnimationFrame(() => el.setSelectionRange?.(el.value.length, el.value.length))
      }
    },
    close,
  }))

  // Clicking anywhere outside closes the popover; the input keeps its text.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  // Settled searches are logged the way the phone overlay logs them; misses
  // tell us what people want tokenized next.
  useEffect(() => {
    if (!q || q.length < 2) return
    const t = setTimeout(() => {
      if (results.length > 0) track('search', { query: q, results: results.length })
      else track('search_miss', { query: q })
    }, 800)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q])

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) setOpen(true)
      if (rows.length) setIndex((i) => (i + 1) % rows.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (rows.length) setIndex((i) => (i - 1 + rows.length) % rows.length)
    } else if (e.key === 'Enter') {
      if (highlighted) {
        e.preventDefault()
        select(highlighted)
      }
    } else if (e.key === 'Escape') {
      // Handled here so the shell's Esc (fullscreen off) does not also fire.
      e.preventDefault()
      e.stopPropagation()
      setOpen(false)
      setQuery('')
      inputRef.current?.blur()
    }
  }

  const modKey = isMacPlatform() ? '⌘K' : 'Ctrl+K'

  const showList = open && rows.length > 0
  const showMiss = open && q.length > 0 && rows.length === 0

  return (
    <div ref={rootRef} className="relative w-[240px] shrink-0 min-[1440px]:w-[320px]">
      <div className="flex items-center gap-2.5 rounded-xl bg-zinc-900 px-3.5 py-2">
        <SearchIcon size={18} className="shrink-0 text-zinc-500" />
        <input
          ref={inputRef}
          role="combobox"
          aria-label="Symbol search"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && highlighted ? `${listId}-${highlighted.id}` : undefined}
          data-tooltip="Symbol search"
          value={query}
          placeholder={`Search tickers or companies · ${modKey}`}
          onChange={(e) => {
            setQuery(e.target.value)
            setIndex(0)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
        />
      </div>

      {(showList || showMiss) && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-[60vh] overflow-y-auto rounded-xl bg-zinc-950 ring-1 ring-zinc-800/70"
          // Keep the input focused through a click inside the popover; the
          // buttons' own onClick still fires.
          onMouseDown={(e) => e.preventDefault()}
        >
          {showMiss ? (
            <p className="t-caption px-4 py-3 text-zinc-500">No tokenized version of “{query}” yet.</p>
          ) : (
            <ul id={listId} role="listbox" className="py-1">
              {!q && recent.length > 0 && <GroupLabel>Recently viewed</GroupLabel>}
              {rows.map((a, i) => {
                const isPopularHead = !q && i === recent.length && popular.length > 0
                const included = watchlistIds.includes(a.id)
                const active = i === index
                return (
                  <li key={a.id} role="presentation">
                    {isPopularHead && <GroupLabel>Popular</GroupLabel>}
                    <div
                      id={`${listId}-${a.id}`}
                      role="option"
                      aria-selected={active}
                      className={`flex items-stretch ${active ? 'bg-zinc-900' : ''}`}
                      onMouseEnter={() => setIndex(i)}
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => select(a)}
                        className="flex min-w-0 flex-1 items-center gap-2.5 px-3 py-2 text-left"
                      >
                        <AssetLogo asset={a} size={28} />
                        <div className="min-w-0 flex-1">
                          <div className="t-label text-zinc-100">{a.ticker}</div>
                          <div className="t-caption truncate text-zinc-500">{assetSubtitle(a)}</div>
                        </div>
                        {a.tokenPrice != null && (
                          <div className="num t-caption shrink-0 text-zinc-300">
                            {formatPrice(a.tokenPrice)}
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        onClick={() => toggleWatchlist(a.id)}
                        aria-label={
                          included
                            ? `Remove ${a.ticker} from watchlist`
                            : `Add ${a.ticker} to watchlist`
                        }
                        className="flex items-center px-3 text-accent transition-colors hover:bg-zinc-900"
                      >
                        {included ? <CheckCircleIcon size={20} /> : <PlusIcon size={18} />}
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function GroupLabel({ children }) {
  return <div className="t-micro px-3 pb-1 pt-2 text-zinc-500">{children}</div>
}
