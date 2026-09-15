import { useMemo, useRef, useState } from 'react'
import Sheet, { SheetTitle } from '../Sheet'
import {
  CATEGORIES,
  searchIndicators,
  buildKey,
  defaultParams,
  describeKey,
} from '../../lib/indicatorCatalog'
import { CheckCircleIcon, SearchIcon } from '../Icons'

/*
 * The Indicators dialog: TradingView's "Indicators, metrics and strategies",
 * opened by the toolbar button or the `/` key. A search field over the
 * catalogue, category chips, and one row per indicator that adds or removes
 * it from the chart.
 *
 * Differences from TradingView's, on purpose:
 *   - Categories are chips, not a left column. Six categories do not earn a
 *     column at this width, and chips are already how this app filters lists.
 *   - A row TOGGLES rather than adding a second copy. Adding two SMAs is
 *     worth having, but not before there is a way to give the second one a
 *     different length — a duplicate row that looks identical and cannot be
 *     told apart is worse than not being able to make one.
 *   - The dialog stays open after a click, as TradingView's does: adding two
 *     indicators is the common case, and each one lands on the chart behind.
 */

/* The rows the arrows move through; also what Enter acts on. */
function useHighlight(count) {
  const [index, setIndex] = useState(0)
  const clamped = count === 0 ? -1 : Math.min(index, count - 1)
  return [clamped, setIndex]
}

export default function IndicatorDialog({ active = [], onChange, onClose }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')
  const listRef = useRef(null)

  const results = useMemo(() => {
    const found = searchIndicators(query)
    return category === 'all' ? found : found.filter((e) => e.category === category)
  }, [query, category])

  const [highlight, setHighlight] = useHighlight(results.length)

  // The key a row would add: always the entry's defaults. Two instances of
  // one indicator need the settings dialog, which is where lengths live.
  const keyFor = (entry) => buildKey(entry.id, defaultParams(entry))

  function toggle(entry) {
    const key = keyFor(entry)
    if (!key) return
    onChange(active.includes(key) ? active.filter((k) => k !== key) : [...active, key])
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const delta = e.key === 'ArrowDown' ? 1 : -1
      const next = Math.min(results.length - 1, Math.max(0, highlight + delta))
      setHighlight(next)
      listRef.current?.children[next]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter' && results[highlight]) {
      e.preventDefault()
      toggle(results[highlight])
    }
  }

  return (
    <Sheet onClose={onClose} pad={0} size="lg">
      <div className="px-5 pt-5">
        <SheetTitle className="t-title text-zinc-100">Indicators</SheetTitle>
        <p className="t-caption mt-1 text-zinc-500">
          {active.length === 0
            ? 'Search, then click one to put it on the chart.'
            : `${active.length} on the chart: ${active.map(describeKey).join(', ')}`}
        </p>

        <div
          className="mt-3 flex items-center gap-2 rounded-md px-3 py-2"
          style={{ boxShadow: 'inset 0 0 0 1px var(--border-subtle)' }}
        >
          <SearchIcon size={16} className="shrink-0 text-zinc-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHighlight(0)
            }}
            onKeyDown={onKeyDown}
            placeholder="Search indicators"
            aria-label="Search indicators"
            className="t-label w-full bg-transparent text-zinc-100 outline-none placeholder:text-zinc-600"
          />
        </div>

        {/* Category chips, the same rounded-md control shape as the toolbar's.
            "All" first so the default state is a real chip rather than none
            of them being lit. */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {['all', ...CATEGORIES].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCategory(c)
                setHighlight(0)
              }}
              aria-pressed={category === c}
              className={`t-label rounded-md px-2.5 py-1 transition-colors ${
                category === c ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
              style={category === c ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
            >
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={listRef}
        role="listbox"
        aria-label="Indicators"
        className="mt-3 max-h-[min(60vh,26rem)] overflow-y-auto border-t"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {results.map((entry, i) => {
          const key = keyFor(entry)
          const on = active.includes(key)
          return (
            <button
              key={entry.id}
              type="button"
              role="option"
              aria-selected={on}
              onClick={() => toggle(entry)}
              onMouseEnter={() => setHighlight(i)}
              onKeyDown={onKeyDown}
              className={`flex w-full items-center gap-3 border-b px-5 py-2.5 text-left transition-colors ${
                i === highlight ? 'bg-zinc-900' : ''
              }`}
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="t-label flex items-baseline gap-2">
                  <span className={on ? 'text-accent' : 'text-zinc-100'}>{entry.name}</span>
                  <span className="t-micro shrink-0 text-zinc-600">{entry.short}</span>
                </div>
                <div className="t-caption mt-0.5 text-zinc-500">{entry.description}</div>
              </div>
              <span className="t-micro shrink-0 text-zinc-600">
                {entry.pane === 'separate' ? 'New pane' : 'On price'}
              </span>
              {/* The only fixed-width slot on the row, so names do not shift
                  left and right as things are added and removed. */}
              <span className="flex w-5 shrink-0 justify-end text-accent">
                {on && <CheckCircleIcon size={16} />}
              </span>
            </button>
          )
        })}

        {results.length === 0 && (
          <p className="t-caption px-5 py-8 text-center text-zinc-500">
            Nothing matches “{query}”.
          </p>
        )}
      </div>

      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ boxShadow: 'inset 0 1px 0 var(--border-subtle)' }}
      >
        <span className="t-micro text-zinc-600">↑↓ to move · Enter to add · Esc to close</span>
        <button
          type="button"
          onClick={onClose}
          className="t-label rounded-md px-3 py-1.5 text-zinc-300 transition-colors hover:bg-zinc-900"
        >
          Done
        </button>
      </div>
    </Sheet>
  )
}
