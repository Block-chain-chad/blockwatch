// src/components/desktop/ChartFootStrip.jsx
import { RANGE_IDS } from '../../lib/intervalInput'
import { IndicatorsIcon, LogIcon } from '../Icons'

/*
 * The one strip of chart chrome on the Meter (spec §3.2 "The drill-in"),
 * 40 px at the chart's foot: Gap | Candles, the range words (Gap) or the
 * side and bar-length words (Candles), the Indicators button with its
 * count, Log scale, and the Shortcuts hint. No interval codes; every chip
 * is a word.
 */
const RANGE_WORDS = { '1D': 'Past day', '1W': 'Past week', '1M': 'Past month', '3M': 'Past 3 months', '1Y': 'Past year' }
const BAR_WORDS = { '1m': '1 min', '5m': '5 min', '15m': '15 min', '1h': '1 hour', '4h': '4 hours', '1d': '1 day' }
const CHIP = 't-label flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 transition-colors'
const on = (active) => (active ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300')
const onStyle = (active) => (active ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined)

function Rule() {
  return <span className="mx-2 h-4 w-px shrink-0 bg-zinc-800" aria-hidden="true" />
}

export default function ChartFootStrip({
  mode, onMode, range, onRange, side, onSide, timeframe, onTimeframe, offeredTimeframes,
  log, onLog, indicatorCount, onOpenIndicators, onShortcuts, hasStock, ticker, underlying,
}) {
  const candles = mode === 'candles'
  return (
    <div
      className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-t px-3 [scrollbar-width:none]"
      style={{ borderColor: 'var(--border-default)' }}
    >
      <button type="button" onClick={() => onMode('gap')} aria-pressed={!candles} className={`${CHIP} ${on(!candles)}`} style={onStyle(!candles)}>Gap</button>
      <button type="button" onClick={() => onMode('candles')} aria-pressed={candles} className={`${CHIP} ${on(candles)}`} style={onStyle(candles)}>Candles</button>
      <Rule />
      {!candles &&
        RANGE_IDS.map((r) => (
          <button key={r} type="button" onClick={() => onRange(r)} aria-pressed={range === r} className={`${CHIP} ${on(range === r)}`} style={onStyle(range === r)}>
            {RANGE_WORDS[r]}
          </button>
        ))}
      {candles && (
        <>
          <button type="button" onClick={() => onSide('token')} aria-pressed={side === 'token'} className={`${CHIP} ${on(side === 'token')}`} style={onStyle(side === 'token')}>
            {ticker} token
          </button>
          {hasStock && (
            <button type="button" onClick={() => onSide('stock')} aria-pressed={side === 'stock'} className={`${CHIP} ${on(side === 'stock')}`} style={onStyle(side === 'stock')}>
              {underlying} share
            </button>
          )}
          <Rule />
          {offeredTimeframes.map((t) => (
            <button key={t.id} type="button" onClick={() => onTimeframe(t.id)} aria-pressed={timeframe === t.id} className={`${CHIP} ${on(timeframe === t.id)}`} style={onStyle(timeframe === t.id)}>
              {BAR_WORDS[t.id] ?? t.label}
            </button>
          ))}
          <Rule />
          <button type="button" onClick={onOpenIndicators} className={`${CHIP} ${on(indicatorCount > 0)}`} style={onStyle(indicatorCount > 0)}>
            <IndicatorsIcon size={16} />
            Indicators
            {indicatorCount > 0 && (
              <span className="num flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] text-zinc-950">
                {indicatorCount}
              </span>
            )}
          </button>
          <button type="button" onClick={onLog} aria-pressed={log} className={`${CHIP} ${on(log)}`} style={onStyle(log)}>
            <LogIcon size={16} />
            Log scale
          </button>
        </>
      )}
      <div className="flex-1" />
      <button type="button" onClick={onShortcuts} className="t-caption flex items-center gap-2 whitespace-nowrap text-zinc-500 hover:text-zinc-300">
        Shortcuts
        <kbd className="rounded border px-1 font-mono text-[11px]" style={{ borderColor: 'var(--border-default)' }}>?</kbd>
      </button>
    </div>
  )
}
