// Pure glue between the shared candle shape and what a candlestick chart
// draws: series data in Lightweight Charts' format, indicator overlays as
// line data, and the rules for which timeframes each side of the gap can
// offer. No DOM, no library import — the chart component owns both. Kept in
// lib/ so plain node can test it (services/apiBase.js reads window at import,
// so nothing that touches a service can be).
//
// Lightweight Charts wants each series strictly ascending in `time` with no
// duplicates and no holes in a bar's four prices, and it treats a missing
// value as whitespace only when the row carries `time` alone. So the rules
// here: a duplicate timestamp keeps the LAST row (the newer fetch of the same
// bucket), a row with a non-finite leg is dropped rather than zero-filled,
// and an indicator's null warm-up is omitted from its line rather than sent
// as 0 — a zero would plot a line along the floor.

import { TIMEFRAMES, DEFAULT_TIMEFRAME_ID, candleSeconds, timeframeById } from './candles'
import { sma, ema, rsi } from './indicators'

const isBar = (c) =>
  c != null &&
  Number.isFinite(c.time) &&
  Number.isFinite(c.open) &&
  Number.isFinite(c.high) &&
  Number.isFinite(c.low) &&
  Number.isFinite(c.close)

/**
 * The candles a chart can actually draw: complete bars, ascending, one per
 * timestamp. Input order is not trusted — both sources sort, but a merge of
 * two fetches might not.
 */
export function cleanCandles(candles) {
  if (!Array.isArray(candles)) return []
  const byTime = new Map()
  for (const c of candles) {
    if (!isBar(c)) continue
    byTime.set(c.time, c) // later row for the same bucket wins
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time)
}

/** Candlestick series data: { time, open, high, low, close }. */
export function toCandlestickData(candles) {
  return cleanCandles(candles).map(({ time, open, high, low, close }) => ({
    time,
    open,
    high,
    low,
    close,
  }))
}

/**
 * Volume histogram data, coloured by the bar's direction. A bar with no
 * volume figure draws as zero height (volume really was nothing, or the
 * source does not report it); a negative or non-finite figure is treated the
 * same way rather than inverted.
 */
export function toVolumeData(candles, colors = { up: '#3fb950', down: '#f85149' }) {
  return cleanCandles(candles).map((c) => ({
    time: c.time,
    value: Number.isFinite(c.volume) && c.volume > 0 ? c.volume : 0,
    color: c.close >= c.open ? colors.up : colors.down,
  }))
}

/**
 * Line data from an index-aligned indicator output: { time, value } for every
 * position where the indicator is defined, nothing for the warm-up. `times`
 * and `values` are aligned by index (that is the indicators' contract).
 */
export function toLineData(times, values) {
  const out = []
  const n = Math.min(times?.length ?? 0, values?.length ?? 0)
  for (let i = 0; i < n; i++) {
    const t = times[i]
    const v = values[i]
    if (Number.isFinite(t) && Number.isFinite(v)) out.push({ time: t, value: v })
  }
  return out
}

/** The indicator set the chart offers. Periods are the usual defaults. */
export const INDICATORS = Object.freeze([
  Object.freeze({ id: 'sma20', label: 'SMA 20', kind: 'overlay' }),
  Object.freeze({ id: 'ema50', label: 'EMA 50', kind: 'overlay' }),
  Object.freeze({ id: 'rsi14', label: 'RSI 14', kind: 'pane' }),
])

/**
 * Every indicator as line data over one clean series. Computed together so
 * the closes are extracted once; the chart shows or hides each by toggle.
 * On a series too short for an indicator the line is simply empty.
 */
export function indicatorLines(candles) {
  const clean = cleanCandles(candles)
  const times = clean.map((c) => c.time)
  const closes = clean.map((c) => c.close)
  return {
    sma20: toLineData(times, sma(closes, 20)),
    ema50: toLineData(times, ema(closes, 50)),
    rsi14: toLineData(times, rsi(closes, 14)),
  }
}

// --- Which timeframes each side can offer -----------------------------------

/**
 * Timeframes for a series kind. The token side gets every GeckoTerminal
 * bucket; the stock side gets only the ones /api/history has an interval
 * for, because that proxy's allowlist is the whole vocabulary there.
 */
export function timeframesFor(series) {
  return series === 'stock' ? TIMEFRAMES.filter((t) => t.stock != null) : [...TIMEFRAMES]
}

/**
 * The timeframe to show after switching series: the same one when the new
 * side offers it, otherwise the offered one nearest in bar length (on a log
 * scale, so 1h lands on 5m and 4h on 1D rather than everything collapsing to
 * one end). Falls back to the default when the id is unknown.
 */
export function coerceTimeframe(id, series) {
  const offered = timeframesFor(series)
  if (offered.some((t) => t.id === id)) return id
  const want = candleSeconds(id) ?? candleSeconds(DEFAULT_TIMEFRAME_ID)
  let best = offered[0]
  let bestDist = Infinity
  for (const t of offered) {
    const d = Math.abs(Math.log(candleSeconds(t.id)) - Math.log(want))
    if (d < bestDist) {
      best = t
      bestDist = d
    }
  }
  return best.id
}

/** Whether a timeframe's bars are shorter than a day (the axis shows clock time). */
export function isIntraday(id) {
  const s = candleSeconds(id)
  return s != null && s < 86_400
}

/** Human name of a proxy network id, for the caption under a token chart. */
export function networkName(network) {
  return { solana: 'Solana', eth: 'Ethereum' }[network] ?? null
}

/** The label a timeframe shows on its chip, or the id when unknown. */
export function timeframeLabel(id) {
  return timeframeById(id)?.label ?? id
}
