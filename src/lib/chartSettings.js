// The desktop chart's remembered settings and the legend's arithmetic (spec
// §1.4, §6.9, A13): settings belong to the chart slot and follow the user
// across symbols, so they live in one localStorage object; what comes back
// out of storage is validated here so a hand-edited or stale value can never
// select a chip that does not exist. Pure: no React, no services.

import { TIMEFRAMES, DEFAULT_TIMEFRAME_ID } from './candles'
import { RANGE_IDS } from './intervalInput'

export const CHART_MODES = Object.freeze(['gap', 'candles'])
export const CHART_SIDES = Object.freeze(['token', 'stock'])
export const INDICATOR_IDS = Object.freeze(['sma20', 'ema50', 'rsi14'])

export const DEFAULT_CHART_SETTINGS = Object.freeze({
  mode: 'gap',
  range: '1D',
  side: 'token',
  timeframe: DEFAULT_TIMEFRAME_ID,
  indicators: Object.freeze({ sma20: false, ema50: false, rsi14: false }),
  log: false,
})

const TIMEFRAME_IDS = TIMEFRAMES.map((t) => t.id)

/**
 * A settings object with every field valid: unknown or missing fields take
 * the default, extra fields are dropped. Idempotent on a valid object.
 */
export function normalizeChartSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  const d = DEFAULT_CHART_SETTINGS
  const indicators = {}
  for (const id of INDICATOR_IDS) indicators[id] = r.indicators?.[id] === true
  return {
    mode: CHART_MODES.includes(r.mode) ? r.mode : d.mode,
    range: RANGE_IDS.includes(r.range) ? r.range : d.range,
    side: CHART_SIDES.includes(r.side) ? r.side : d.side,
    timeframe: TIMEFRAME_IDS.includes(r.timeframe) ? r.timeframe : d.timeframe,
    indicators,
    log: r.log === true,
  }
}

// --- Countdown to bar close (A13) -------------------------------------------

/**
 * Seconds until the bar containing `nowSeconds` closes, on a grid of
 * `barSeconds` anchored at `lastBarTime` (the open of the latest bar). When
 * the feed is behind — the latest bar closed a while ago — the grid still
 * rolls forward from it, so the countdown never reads 0 for long. Null when
 * the inputs cannot make a grid.
 */
export function secondsToBarClose(lastBarTime, barSeconds, nowSeconds) {
  if (!Number.isFinite(lastBarTime) || !Number.isFinite(barSeconds) || barSeconds <= 0) return null
  if (!Number.isFinite(nowSeconds)) return null
  let close = lastBarTime + barSeconds
  if (nowSeconds >= close) {
    const behind = Math.floor((nowSeconds - close) / barSeconds) + 1
    close += behind * barSeconds
  }
  return Math.max(0, Math.round(close - nowSeconds))
}

/** 'mm:ss' under an hour, 'h:mm:ss' from an hour up (a daily bar reads 23:59:59). */
export function formatCountdown(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const s = Math.floor(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// --- The legend's change figure (A8) ------------------------------------------

/**
 * The change the legend prints for `bar`: against the previous bar's close
 * when the series has one (TradingView's rule), else against the bar's own
 * open. Returns { delta, pct } or null without a usable bar.
 */
export function legendChange(candles, bar) {
  if (!bar || !Number.isFinite(bar.close)) return null
  let base = Number.isFinite(bar.open) ? bar.open : null
  if (Array.isArray(candles) && candles.length > 0) {
    const i = candles.findIndex((c) => c.time === bar.time)
    const prev = i > 0 ? candles[i - 1] : null
    if (prev && Number.isFinite(prev.close)) base = prev.close
  }
  if (base == null || base === 0) return null
  const delta = bar.close - base
  return { delta, pct: (delta / base) * 100 }
}
