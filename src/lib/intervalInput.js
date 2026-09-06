// Typed-interval parsing for the desktop chart (spec §6.11). A digit or `,`
// opens a small prompt; what the user types here becomes a timeframe chip in
// Candles mode or a range chip in Gap mode. Pure: no React, no services.
//
// Candles mode speaks TradingView's grammar — a bare number is minutes,
// `D` is a day — and snaps anything the chips do not offer to the nearest
// one by bar length on a log scale, the same rule coerceTimeframe uses when
// the stock side lacks a bucket. Gap mode speaks the range chips' own ids
// (1D 1W 1M 3M 1Y); a bare number there is days.

import { TIMEFRAMES, candleSeconds } from './candles'

const DAY = 86_400

/**
 * The Gap chart's ranges, in seconds. Mirrors CHART_RANGES in
 * hooks/useChartData.js (days 1 / 7 / 30 / 90 / 365) — mirrored rather than
 * imported because that hook pulls in the services, which read `window` at
 * import and so cannot load under vitest.
 */
export const RANGE_SECONDS = Object.freeze({
  '1D': DAY,
  '1W': 7 * DAY,
  '1M': 30 * DAY,
  '3M': 90 * DAY,
  '1Y': 365 * DAY,
})

export const RANGE_IDS = Object.freeze(Object.keys(RANGE_SECONDS))

// What each unit letter means per mode. `m` is the one that differs:
// minutes on a candle chart, months on a range picker. `mo` is a month in
// either mode, for people who type it out.
const UNITS = {
  candles: { '': 60, m: 60, h: 3600, d: DAY, w: 7 * DAY, mo: 30 * DAY, y: 365 * DAY },
  gap: { '': DAY, m: 30 * DAY, h: 3600, d: DAY, w: 7 * DAY, mo: 30 * DAY, y: 365 * DAY },
}

const TOKEN = /^\s*(\d+(?:\.\d+)?)?\s*([a-z]*)\s*$/i

/**
 * The typed text as a number of seconds, or null when it is not an interval.
 * A bare unit (`D`, `w`) counts as one of it; a bare number takes the mode's
 * default unit; anything else — letters that are not a unit, zero, blank —
 * is null.
 */
export function intervalSeconds(text, mode) {
  const units = UNITS[mode] ?? UNITS.candles
  const m = TOKEN.exec(text ?? '')
  if (!m) return null
  const [, num, rawUnit] = m
  if (num == null && rawUnit === '') return null
  const unit = rawUnit.toLowerCase()
  if (!(unit in units)) return null
  const n = num == null ? 1 : Number(num)
  if (!Number.isFinite(n) || n <= 0) return null
  return n * units[unit]
}

// Two log distances that differ by less than this are the same distance:
// 30m sits exactly ln 2 from both 15m and 1h, and float rounding must not
// decide which wins.
const TIE = 1e-9

/**
 * The offered id nearest `want` seconds on a log scale; a tie goes to the
 * shorter one (the first in input order), as coerceTimeframe's strict `<`.
 */
function nearest(offered, want) {
  let best = null
  let bestDist = Infinity
  for (const [id, seconds] of offered) {
    const d = Math.abs(Math.log(seconds) - Math.log(want))
    if (d < bestDist - TIE) {
      best = { id, exact: seconds === want }
      bestDist = d
    }
  }
  return best
}

/**
 * parseIntervalInput('15', 'candles')   → { kind: 'timeframe', id: '15m', exact: true }
 * parseIntervalInput('30', 'candles')   → { kind: 'timeframe', id: '15m', exact: false }
 * parseIntervalInput('D', 'candles')    → { kind: 'timeframe', id: '1d',  exact: true }
 * parseIntervalInput('1440', 'candles') → { kind: 'timeframe', id: '1d',  exact: true }
 * parseIntervalInput('1W', 'gap')       → { kind: 'range',     id: '1W',  exact: true }
 * parseIntervalInput('2W', 'gap')       → { kind: 'range',     id: '1W',  exact: false }
 * parseIntervalInput('', any)           → null
 * parseIntervalInput('xyz', any)        → null
 */
export function parseIntervalInput(text, mode) {
  const kind = mode === 'gap' ? 'range' : 'timeframe'
  const want = intervalSeconds(text, kind === 'range' ? 'gap' : 'candles')
  if (want == null) return null
  const offered =
    kind === 'range'
      ? RANGE_IDS.map((id) => [id, RANGE_SECONDS[id]])
      : TIMEFRAMES.map((t) => [t.id, candleSeconds(t.id)])
  const hit = nearest(offered, want)
  return hit ? { kind, ...hit } : null
}

/** The chip label a parse result lands on, for the prompt's live preview. */
export function intervalLabel(parsed) {
  if (!parsed) return ''
  if (parsed.kind === 'range') return parsed.id
  return TIMEFRAMES.find((t) => t.id === parsed.id)?.label ?? parsed.id
}
