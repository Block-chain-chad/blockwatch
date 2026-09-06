import { useLayoutEffect, useRef, useState } from 'react'
import { RANGE_IDS } from '../../lib/intervalInput'
import { INDICATORS, timeframesFor } from '../../lib/candleSeries'
import { tipProps } from '../../lib/tooltip'
import { nextDensity, DENSITY } from '../../lib/toolbarDensity'
import { FitIcon, SkipEndIcon, ResetIcon, LogIcon } from '../Icons'
import ToolbarTooltips from './Tooltip'

/*
 * The thin bar over the chart (spec §6.9, A7, A9, A12, A22): Gap | Candles,
 * then the range chips (Gap) or the side, interval and indicator chips
 * (Candles), then Auto / Latest / Reset / Log on the right. 38px tall with
 * 28px pills, TradingView's toolbar row. Every control carries a tooltip
 * with its hotkey.
 *
 * Width (§1.3): TradingView measures its toolbar and drops labels first,
 * never an overflow menu. The Candles row here is ~1,360px at full size, so
 * it measures itself after every render and steps through
 * lib/toolbarDensity.js's levels — the four view buttons go icon-only (the
 * spec's under-1280 rule, now by measurement), then the side chips keep the
 * ticker alone, the indicator chips drop their period and every pill
 * tightens. Tooltips and accessible names keep the full words at every
 * level. If even that overflows, the row scrolls; nothing is hidden.
 *
 * Interval chips the stock side cannot serve stay visible but disabled with
 * a tooltip saying why (A7) — TradingView greys what the data cannot serve.
 */
const INDICATOR_SWATCH = { sma20: 'bg-accent', ema50: 'bg-zinc-300', rsi14: 'bg-zinc-400' }
const INDICATOR_SHORT = { sma20: 'SMA', ema50: 'EMA', rsi14: 'RSI' }
const RANGE_WORDS = { '1D': 'Past day', '1W': 'Past week', '1M': 'Past month', '3M': 'Past 3 months', '1Y': 'Past year' }

/*
 * shared.jsx's Chip, one for one in look, plus the attributes a toolbar
 * control needs and Chip does not take: a tooltip, a disabled state, an id
 * for the `/` key to land on, an icon-only body, and the compact padding.
 * shared.jsx is not edited for the desktop, so the classes are repeated
 * here verbatim.
 */
function ToolChip({ active, pressed, onClick, swatch, disabled, dense, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed ?? (active == null ? undefined : active)}
      className={`t-label flex shrink-0 items-center gap-1.5 rounded-md py-1.5 transition-colors ${
        dense ? 'px-2' : 'px-3'
      } ${active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'} ${
        disabled ? 'cursor-not-allowed opacity-40' : 'hover:text-zinc-300'
      } ${className}`}
      style={active ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined}
      {...rest}
    >
      {swatch && <span className={`h-0.5 w-4 rounded ${swatch} ${active ? '' : 'opacity-40'}`} />}
      {children}
    </button>
  )
}

function Rule({ hidden }) {
  if (hidden) return null
  return <span className="mx-1 h-4 w-px shrink-0 bg-zinc-800" aria-hidden="true" />
}

/** The row's content width: every child but the spacer, plus the gaps and padding. */
function contentWidth(row) {
  const cs = getComputedStyle(row)
  const gap = parseFloat(cs.columnGap) || 0
  const pad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0)
  let w = pad
  let n = 0
  for (const el of row.children) {
    if (el.dataset.spacer != null) continue
    w += el.getBoundingClientRect().width
    n++
  }
  return w + Math.max(0, n - 1) * gap
}

export default function ChartToolbar({
  asset,
  settings,
  onMode,
  onRange,
  onSide,
  onTimeframe,
  onIndicators,
  onLog,
  auto,
  onAuto,
  onLatest,
  onReset,
}) {
  const rootRef = useRef(null)
  const rowRef = useRef(null)
  const [level, setLevel] = useState(DENSITY.FULL)
  const needed = useRef({})
  const { mode, range, side, timeframe, indicators, log } = settings
  const candles = mode === 'candles'
  const offered = timeframesFor(side)
  const dense = level >= DENSITY.COMPACT
  const icons = level >= DENSITY.ICONS

  // The chip set changes with the asset (ticker length), the mode and the
  // side; what each level needed is measured again from full size.
  const setKey = `${asset.id}|${mode}|${side}`
  useLayoutEffect(() => {
    needed.current = {}
    setLevel(DENSITY.FULL)
  }, [setKey])

  // Measure after every render and when the row resizes; setLevel before
  // paint, so a step never flashes. The window's resize event backs up the
  // ResizeObserver: a background tab may hold observer callbacks until it
  // is shown again, and the row must be right the moment it is.
  useLayoutEffect(() => {
    const row = rowRef.current
    if (!row) return undefined
    const measure = () => {
      const w = contentWidth(row)
      needed.current[level] = w
      const next = nextDensity(level, w, row.clientWidth, needed.current)
      if (next !== level) setLevel(next)
    }
    measure()
    window.addEventListener('resize', measure)
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    ro?.observe(row)
    return () => {
      window.removeEventListener('resize', measure)
      ro?.disconnect()
    }
  })

  return (
    <div ref={rootRef} className="relative shrink-0">
      <div
        ref={rowRef}
        data-density={level}
        className={`flex h-[38px] items-center overflow-x-auto border-b [scrollbar-width:none] ${
          dense ? 'gap-1 px-4' : 'gap-2 px-6'
        }`}
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <ToolChip dense={dense} active={mode === 'gap'} onClick={() => onMode('gap')} {...tipProps('Gap chart')}>
          Gap
        </ToolChip>
        <ToolChip dense={dense} active={candles} onClick={() => onMode('candles')} {...tipProps('Candles')}>
          Candles
        </ToolChip>

        <Rule hidden={dense} />

        {!candles &&
          RANGE_IDS.map((r) => (
            <ToolChip
              key={r}
              dense={dense}
              active={range === r}
              onClick={() => onRange(r)}
              {...tipProps(RANGE_WORDS[r], [r])}
            >
              {r}
            </ToolChip>
          ))}

        {candles && (
          <>
            <ToolChip
              dense={dense}
              active={side === 'token'}
              onClick={() => onSide('token')}
              {...tipProps(`${asset.ticker} token candles`)}
            >
              {dense ? asset.ticker : `${asset.ticker} token`}
            </ToolChip>
            {asset.underlying && (
              <ToolChip
                dense={dense}
                active={side === 'stock'}
                onClick={() => onSide('stock')}
                {...tipProps(`${asset.underlying} share candles`)}
              >
                {dense ? asset.underlying : `${asset.underlying} stock`}
              </ToolChip>
            )}

            <Rule hidden={dense} />

            {timeframesFor('token').map((t) => {
              const served = offered.some((o) => o.id === t.id)
              const typed = t.id === '1d' ? 'D' : String(t.aggregate * (t.timeframe === 'hour' ? 60 : 1))
              return (
                <ToolChip
                  key={t.id}
                  dense={dense}
                  active={timeframe === t.id}
                  disabled={!served}
                  onClick={() => served && onTimeframe(t.id)}
                  title={served ? undefined : `No ${t.label} bars for the stock side`}
                  {...tipProps(
                    served ? `${t.label} bars` : `No ${t.label} bars for the stock side`,
                    served ? [typed] : undefined
                  )}
                >
                  {t.label}
                </ToolChip>
              )
            })}

            <Rule hidden={dense} />

            {INDICATORS.map((d, i) => (
              <ToolChip
                key={d.id}
                id={`desktop-indicator-${d.id}`}
                dense={dense}
                active={!!indicators[d.id]}
                swatch={INDICATOR_SWATCH[d.id]}
                onClick={() => onIndicators({ ...indicators, [d.id]: !indicators[d.id] })}
                {...tipProps(d.label, i === 0 ? ['/'] : undefined)}
              >
                {dense ? INDICATOR_SHORT[d.id] : d.label}
              </ToolChip>
            ))}
          </>
        )}

        <div className="flex-1" data-spacer="" />

        {candles && (
          <>
            <ToolChip dense={dense} active={auto} onClick={onAuto} {...tipProps('Auto (fits data to screen)')}>
              <FitIcon size={16} />
              {!icons && <span>Auto</span>}
            </ToolChip>
            <ToolChip dense={dense} onClick={onLatest} {...tipProps('Scroll to the most recent bar')}>
              <SkipEndIcon size={16} />
              {!icons && <span>Latest</span>}
            </ToolChip>
            <ToolChip dense={dense} onClick={onReset} {...tipProps('Reset chart view', ['Alt', 'R'])}>
              <ResetIcon size={16} />
              {!icons && <span>Reset</span>}
            </ToolChip>
            <ToolChip dense={dense} active={log} onClick={onLog} {...tipProps('Logarithmic', ['Alt', 'L'])}>
              <LogIcon size={16} />
              {!icons && <span>Log</span>}
            </ToolChip>
          </>
        )}
      </div>
      <ToolbarTooltips containerRef={rootRef} />
    </div>
  )
}
