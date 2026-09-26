// src/components/desktop/Board.jsx
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { usePrices, useAssetSubscription } from '../../state/PricesContext'
import { useFolders } from '../../state/FoldersContext'
import { useLocalState } from '../../hooks/useLocalState'
import { useNow } from '../../hooks/useNow'
import { track } from '../../services/analytics'
import { ASSETS } from '../../data/universe'
import {
  BOARD_LENSES, BOARD_SORTS, groupCompanies, lensCandidates, lensHasNoShares, freezeOrder, flattenRows,
  visibleWindow, headerLine, quoteAges,
} from '../../lib/board'
import { ageWords, shareFreshness } from '../../lib/provenance'
import { formatPct, formatPrice } from '../../lib/format'
import { GAP_STATUS_LABEL } from '../../lib/gapCheck'
import { GapBar } from '../shared'
import { BIG_SCREEN_BASE } from '../../lib/bigScreen'
import RuleTicks from './RuleTicks'
import { ChevronRight, ChevronDown } from '../Icons'
import AssetLogo from '../AssetLogo'
import PriceText from '../PriceText'

/*
 * The Gap Board (spec §3.2 region B, §3.4 #1): one row per company, its
 * widest wrapper's gap as a rule on a shared zero axis, the share price with
 * its age, how many issuers and how far apart, and the cheapest. A company
 * expands into one sub-row per wrapper on the same column grid, so the zero
 * tick lines up. Rows past the viewport are not rendered (lib/board.js's
 * visibleWindow); order is frozen once every company is in.
 *
 * Column grid: company flexes (min 160px) · share 120 · gap (the rule plus
 * 80: 12 gap, the 56 px signed label, 12 trailing; 224 at 1440 and below,
 * lib/bigScreen.js decides above that) · wrappers 104 · cheapest 80 ·
 * chevron 24, inside 24 px gutters.
 */
const gridFor = (gapColumn) => `minmax(160px, 1fr) 120px ${gapColumn}px 104px 80px 24px`
const CHIP = 't-label flex h-7 shrink-0 items-center rounded-md px-2.5 transition-colors'
const CHIP_ON = 'bg-zinc-800 text-zinc-100'
const CHIP_OFF = 'text-zinc-500 hover:text-zinc-300'
const chipStyle = (on) => (on ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined)

export default function Board({ selectedId, onSelect, actionsRef, lens, onLens, big = BIG_SCREEN_BASE }) {
  const { assets, session, lastFetchAt } = usePrices()
  const { watchlistIds } = useFolders()
  const [sort, setSort] = useLocalState('bw.meter.sort.v1', 'widest')
  const [credibleOnly, setCredibleOnly] = useLocalState('bw.meter.credible.v1', true)
  const [expandedKey, setExpandedKey] = useState(null)
  // Tracked by row key, not index: index-based focus lands on the wrong row
  // whenever expanding/collapsing a company shifts everything below it.
  const [focusKey, setFocusKey] = useState(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportH, setViewportH] = useState(800)
  const now = useNow() // ages tick once a second, not only on a price re-render
  const scrollRef = useRef(null)
  const scrollTopRef = useRef(0)
  const orderRef = useRef({ sig: '', keys: [] })
  const rowsRef = useRef([])

  // The bounded quote set (spec §3.4 #1): the watchlist, every multi-wrapper
  // company, then by static volume, at most 150 underlyings. Static so the
  // set does not churn with every price tick.
  const watchKey = watchlistIds.join('|')
  const candidateIds = useMemo(
    () => lensCandidates(ASSETS, lens, { watchlistIds: watchKey ? watchKey.split('|') : [] }),
    [watchKey, lens]
  )
  useAssetSubscription('meter-board', candidateIds)

  const companies = useMemo(() => {
    const fresh = groupCompanies(assets, { lens, sort, credibleOnly, watchlistIds })
    const sig = `${lens}|${sort}|${credibleOnly}`
    if (orderRef.current.sig !== sig) orderRef.current = { sig, keys: [] }
    const frozen = freezeOrder(orderRef.current.keys, fresh)
    orderRef.current.keys = frozen.keys
    return frozen.companies
  }, [assets, lens, sort, credibleOnly, watchlistIds])

  const rows = useMemo(() => flattenRows(companies, expandedKey), [companies, expandedKey])
  // Latest rows for effects that must not re-run on every price tick (rows
  // is a fresh array each refresh, since freezeOrder/flattenRows rebuild it).
  rowsRef.current = rows
  const heights = useMemo(() => rows.map((r) => r.height), [rows])
  const win = visibleWindow(heights, scrollTop, viewportH)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return undefined
    const measure = () => {
      setViewportH(el.clientHeight)
      // MeterShell hides the Board (display:none) behind the chart drill-in
      // rather than unmounting it. Browsers may drop a hidden scroller's
      // position, so on re-show put back the last one the reader had.
      if (el.clientHeight > 0 && el.scrollTop === 0 && scrollTopRef.current > 0) el.scrollTop = scrollTopRef.current
    }
    measure()
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(el)
    return () => ro?.disconnect()
  }, [])

  // Keep the focused row inside the viewport when the keys move it. Deps are
  // [focusKey] only — reading `rows` via a ref means a price-tick re-render
  // (rows is rebuilt every ~2.5 s while subscribed mints refresh) never
  // re-runs this and snaps the reader's manual scroll back to the focus.
  useEffect(() => {
    const el = scrollRef.current
    if (!el || focusKey == null) return
    const currentRows = rowsRef.current
    const idx = currentRows.findIndex((r) => r.key === focusKey)
    if (idx === -1) return
    let y = 0
    for (let i = 0; i < idx; i++) y += currentRows[i].height
    const h = currentRows[idx].height
    if (y < el.scrollTop) el.scrollTop = y
    else if (y + h > el.scrollTop + el.clientHeight) el.scrollTop = y + h - el.clientHeight
  }, [focusKey])

  const rowAssetId = (row) => (row.type === 'wrapper' ? row.wrapper.asset.id : row.company.leadAsset?.id ?? null)

  function selectRow(row, from) {
    const id = rowAssetId(row)
    if (id) onSelect(id, { from })
  }

  // What the key map can do to the Board (hooks/useMeterShortcuts). Focus is
  // resolved from focusKey to an index fresh each call, so it survives rows
  // being rebuilt by an expand/collapse between one key press and the next.
  useEffect(() => {
    actionsRef.current = {
      step: (delta) => {
        const idx = rows.findIndex((r) => r.key === focusKey)
        const next =
          idx === -1
            ? delta > 0
              ? 0
              : rows.length - 1
            : Math.max(0, Math.min(rows.length - 1, idx + delta))
        const row = rows[next]
        if (row) setFocusKey(row.key)
      },
      expand: (open) => {
        const idx = rows.findIndex((r) => r.key === focusKey)
        const row = rows[idx]
        if (!row) return
        setExpandedKey(open ? row.company.key : null)
        if (!open && row.type === 'wrapper') {
          setFocusKey(row.company.key)
        }
      },
      select: () => {
        const idx = rows.findIndex((r) => r.key === focusKey)
        const row = rows[idx]
        if (row) selectRow(row, 'keys')
      },
      focusedId: () => {
        const idx = rows.findIndex((r) => r.key === focusKey)
        return rows[idx] ? rowAssetId(rows[idx]) : selectedId
      },
    }
    return () => {
      actionsRef.current = null
    }
  })

  // The strip claims "share leg live" for the whole board, so it has to speak
  // for the OLDEST quote on it, not for the batch fetch time: a rotating,
  // capped quote set leaves symbols at very different ages. Rows the claim
  // cannot cover at all — an undated quote, which every prevClose row is —
  // are counted beside it rather than collapsing the whole line.
  const { oldest: stockAge, undated: undatedCount } = quoteAges(companies, now)
  const tokenAge = lastFetchAt ? (now - lastFetchAt) / 1000 : null
  const activeSort = BOARD_SORTS.find((s) => s.id === sort) ?? BOARD_SORTS[0]
  const grid = gridFor(big.gapColumn)
  const header = headerLine({
    count: companies.length,
    session,
    stockAgeSeconds: stockAge,
    undatedCount,
  })

  return (
    <section aria-label="Gap Board" className="flex h-full min-h-0 flex-col">
      <div
        className="flex h-10 shrink-0 items-center gap-1 border-b px-6"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {BOARD_LENSES.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => {
              onLens(l.id)
              track('meter_lens', { lens: l.id })
            }}
            aria-pressed={lens === l.id}
            className={`${CHIP} ${lens === l.id ? CHIP_ON : CHIP_OFF}`}
            style={chipStyle(lens === l.id)}
          >
            {l.label}
          </button>
        ))}
        <span className="mx-2 h-4 w-px bg-zinc-800" aria-hidden="true" />
        <SortMenu value={activeSort} onPick={(id) => setSort(id)} />
        <span className="mx-2 h-4 w-px bg-zinc-800" aria-hidden="true" />
        <label className="t-label flex shrink-0 items-center gap-2 whitespace-nowrap text-zinc-400">
          <input
            type="checkbox"
            checked={credibleOnly}
            onChange={(e) => setCredibleOnly(e.target.checked)}
            className="accent-[var(--color-accent)]"
          />
          Credible only
        </label>
        <div className="flex-1" />
        <span className="num t-caption min-w-0 truncate text-right text-zinc-500" title={header}>
          {header}
        </span>
      </div>

      <div
        className="grid h-8 shrink-0 items-center border-b px-6"
        style={{ gridTemplateColumns: grid, borderColor: 'var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-500">Company</span>
        <span className="t-micro text-zinc-500">Share · age</span>
        {big.boardTicks ? (
          <div className="flex flex-col gap-1">
            <span className="t-micro text-zinc-500">Gap vs share · widest wrapper</span>
            <RuleTicks width={big.rule} />
          </div>
        ) : (
          <span className="t-micro text-zinc-500">Gap vs share · widest wrapper</span>
        )}
        <span className="t-micro text-zinc-500">Wrappers</span>
        <span className="t-micro text-zinc-500">Cheapest</span>
        <span />
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          // A hidden scroller reports 0; that is not a position to remember.
          if (e.currentTarget.clientHeight === 0) return
          scrollTopRef.current = e.currentTarget.scrollTop
          setScrollTop(e.currentTarget.scrollTop)
        }}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        {rows.length === 0 && (
          <p className="t-body px-6 py-12 text-center text-zinc-400">
            {lensHasNoShares(ASSETS, lens)
              ? 'Nothing here tracks a listed share, so there is no gap to rank.'
              : lens !== 'watching'
              ? 'No gaps to rank yet. Prices are still loading.'
              : watchlistIds.length > 0
                ? 'Your Watching list is loading its share prices.'
                : 'Nothing on your Watching list yet — switch to All and press W on any row to add it.'}
          </p>
        )}
        <div style={{ height: win.top }} aria-hidden="true" />
        {rows.slice(win.start, win.end).map((row) => {
          const focused = row.key === focusKey
          if (row.type === 'company') {
            const c = row.company
            const open = c.key === expandedKey
            const selectedHere = c.wrappers.some((w) => w.asset.id === selectedId)
            return (
              <div
                key={row.key}
                role="button"
                tabIndex={-1}
                data-board-row=""
                aria-expanded={open}
                onClick={() => {
                  setFocusKey(row.key)
                  setExpandedKey(open ? null : c.key)
                  selectRow(row, 'board')
                }}
                className={`hover-row grid h-14 cursor-pointer items-center border-b px-6 ${
                  focused ? 'bg-zinc-900' : selectedHere ? 'bg-zinc-900/60' : ''
                } ${c.muted ? 'opacity-60' : ''}`}
                style={{ gridTemplateColumns: grid, borderColor: open ? 'transparent' : 'var(--border-subtle)' }}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <AssetLogo asset={c.logoAsset} size={36} />
                  <div className="min-w-0">
                    <div className="t-label text-zinc-100">{c.underlying}</div>
                    <div className="t-caption truncate text-zinc-500">{c.name}</div>
                  </div>
                </div>
                <div>
                  <div className="num t-label text-zinc-100">
                    <PriceText value={c.logoAsset.stockPrice} />
                  </div>
                  <div className="t-caption text-zinc-500">{shareFreshness({ quote: c.logoAsset.stockQuote, session, now }).words}</div>
                </div>
                <div className="flex items-center gap-3">
                  <GapBar pct={c.lead} thin={c.muted} width={big.rule} height={6} tone="accent" />
                  {c.lead == null && GAP_STATUS_LABEL[c.wrappers[0].status] ? (
                    <span className="t-caption text-right text-zinc-500">{GAP_STATUS_LABEL[c.wrappers[0].status]}</span>
                  ) : (
                    <span className={`num t-label w-14 text-right ${c.muted ? 'text-zinc-500' : 'text-zinc-100'}`}>
                      {formatPct(c.lead)}
                    </span>
                  )}
                </div>
                <div className="num t-caption text-zinc-400">{wrappersCell(c)}</div>
                <div>
                  {c.cheapestAsset && (
                    <span className="t-caption rounded-md border px-2 py-0.5 text-zinc-300" style={{ borderColor: 'var(--border-default)' }}>
                      {c.cheapestAsset.ticker}
                    </span>
                  )}
                </div>
                {open ? (
                  <ChevronDown size={16} className="text-zinc-400" />
                ) : (
                  <ChevronRight size={16} className="text-zinc-600" />
                )}
              </div>
            )
          }
          const w = row.wrapper
          const a = w.asset
          const selected = a.id === selectedId
          return (
            <div
              key={row.key}
              role="button"
              tabIndex={-1}
              data-board-row=""
              onClick={() => {
                setFocusKey(row.key)
                selectRow(row, 'board')
              }}
              className={`hover-row grid h-10 cursor-pointer items-center border-b px-6 ${
                focused ? 'bg-zinc-800' : 'bg-zinc-900'
              } ${w.muted ? 'opacity-60' : ''}`}
              style={{
                gridTemplateColumns: grid,
                borderColor: 'var(--border-subtle)',
                boxShadow: selected ? 'inset 0 0 0 1px var(--border-strong)' : undefined,
              }}
            >
              <div className="flex items-baseline gap-2 pl-12">
                <span className="t-label text-zinc-100">{a.ticker}</span>
                <span className="t-caption text-zinc-500">
                  {a.issuer}
                  {a.chain ? ` · ${a.chain}` : ''}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="num t-label text-zinc-100">
                  <PriceText value={a.tokenPrice} />
                </span>
                <span className="num t-caption text-zinc-500">
                  {ageWords(tokenAge)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <GapBar pct={w.gap} thin={w.muted} width={big.rule} height={6} tone="accent" />
                {GAP_STATUS_LABEL[w.status] ? (
                  <span className="t-caption text-right text-zinc-500">{GAP_STATUS_LABEL[w.status]}</span>
                ) : (
                  <span className={`num t-label w-14 text-right ${w.muted ? 'text-zinc-500' : 'text-zinc-100'}`}>
                    {formatPct(w.gap)}
                  </span>
                )}
              </div>
              <div className="num t-caption text-zinc-400">
                {w.diffUsd != null && `${formatPrice(Math.abs(w.diffUsd))} ${w.diffUsd >= 0 ? 'above' : 'below'}`}
              </div>
              <div>
                {w.cheapest ? (
                  <span className="t-caption rounded-md border px-2 py-0.5 text-accent" style={{ borderColor: 'color-mix(in oklab, var(--color-accent) 40%, transparent)' }}>
                    cheapest
                  </span>
                ) : (
                  <span className="t-caption text-zinc-500">{a.venues?.[0] ?? ''}</span>
                )}
              </div>
              <span />
            </div>
          )
        })}
        <div style={{ height: win.bottom }} aria-hidden="true" />
      </div>
    </section>
  )
}

/* The Wrappers cell's copy: one wrapper never claims a spread; several
   wrappers with only one credible leg can't claim "apart" either — the
   second (muted) wrapper isn't a real comparison point. */
function wrappersCell(company) {
  const n = company.wrappers.length
  if (n <= 1) return '1 issuer'
  if (company.spreadBp != null) return `${n} · ${company.spreadBp} bp apart`
  return `${n} · 1 credible`
}

function SortMenu({ value, onPick }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="t-label flex h-7 items-center gap-1 whitespace-nowrap text-zinc-300 hover:text-zinc-100"
      >
        Sort: {value.label.toLowerCase()}
        <ChevronDown size={14} />
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label="Sort the Board"
          className="absolute left-0 top-full z-30 mt-1 min-w-[220px] rounded-xl bg-zinc-950 py-1 ring-1 ring-zinc-800/70"
        >
          {BOARD_SORTS.map((s) => (
            <li key={s.id} role="presentation">
              <button
                role="option"
                aria-selected={s.id === value.id}
                onClick={() => {
                  onPick(s.id)
                  setOpen(false)
                }}
                className={`w-full px-3 py-2 text-left hover:bg-zinc-900 ${s.id === value.id ? 'text-zinc-100' : 'text-zinc-400'}`}
              >
                <div className="t-label">{s.label}</div>
                <div className="t-caption text-zinc-500">{s.hint}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
