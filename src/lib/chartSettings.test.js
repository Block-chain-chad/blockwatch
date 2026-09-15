import { describe, it, expect } from 'vitest'
import {
  DEFAULT_CHART_SETTINGS,
  normalizeChartSettings,
  migrateIndicators,
  secondsToBarClose,
  formatCountdown,
  legendChange,
} from './chartSettings'
import { TIMEFRAMES } from './candles'
import { RANGE_IDS } from './intervalInput'

describe('normalizeChartSettings', () => {
  it('returns the defaults for nothing, garbage, or an empty object', () => {
    expect(normalizeChartSettings(undefined)).toEqual(DEFAULT_CHART_SETTINGS)
    expect(normalizeChartSettings(null)).toEqual(DEFAULT_CHART_SETTINGS)
    expect(normalizeChartSettings('x')).toEqual(DEFAULT_CHART_SETTINGS)
    expect(normalizeChartSettings({})).toEqual(DEFAULT_CHART_SETTINGS)
  })

  it('keeps every valid value and is idempotent', () => {
    const s = {
      mode: 'candles',
      range: '1W',
      side: 'stock',
      timeframe: '5m',
      indicators: ['sma:20', 'rsi:14'],
      log: true,
    }
    expect(normalizeChartSettings(s)).toEqual(s)
    expect(normalizeChartSettings(normalizeChartSettings(s))).toEqual(s)
  })

  it('replaces an unknown chip with the default rather than selecting nothing', () => {
    const n = normalizeChartSettings({ mode: 'line', range: '5Y', side: 'both', timeframe: '2h' })
    expect(n.mode).toBe('gap')
    expect(n.range).toBe('1D')
    expect(n.side).toBe('token')
    expect(n.timeframe).toBe(DEFAULT_CHART_SETTINGS.timeframe)
  })

  it('coerces the log flag to a boolean and drops extras', () => {
    const n = normalizeChartSettings({ log: 'true', extra: 1 })
    expect(n.log).toBe(false)
    expect(n).not.toHaveProperty('extra')
  })

  it('drops indicator keys the catalogue does not know', () => {
    expect(normalizeChartSettings({ indicators: ['sma:20', 'made-up'] }).indicators).toEqual([
      'sma:20',
    ])
  })
})

/*
 * The stored shape changed from three booleans to a key list. Anyone who had
 * indicators on before the change still has the old object in localStorage,
 * and silently clearing their chart would read as the feature breaking.
 */
describe('migrateIndicators', () => {
  it('turns the old boolean object into the equivalent keys', () => {
    expect(migrateIndicators({ sma20: true, ema50: false, rsi14: true })).toEqual([
      'sma:20',
      'rsi:14',
    ])
  })

  it('keeps the old chip order', () => {
    expect(migrateIndicators({ rsi14: true, sma20: true, ema50: true })).toEqual([
      'sma:20',
      'ema:50',
      'rsi:14',
    ])
  })

  it('ignores truthy-but-not-true values, as the old normalizer did', () => {
    expect(migrateIndicators({ sma20: 1, ema50: 'yes' })).toEqual([])
  })

  it('ignores legacy keys that were never real', () => {
    expect(migrateIndicators({ vwap: true, sma20: true })).toEqual(['sma:20'])
  })

  it('passes a list straight through, normalised', () => {
    expect(migrateIndicators(['rsi:14', 'nope', 'sma:0'])).toEqual(['rsi:14', 'sma:1'])
  })

  it('reads anything else as empty', () => {
    expect(migrateIndicators(undefined)).toEqual([])
    expect(migrateIndicators('sma:20')).toEqual([])
    expect(migrateIndicators(7)).toEqual([])
  })

  it('accepts every timeframe and range the chips offer', () => {
    for (const t of TIMEFRAMES) expect(normalizeChartSettings({ timeframe: t.id }).timeframe).toBe(t.id)
    for (const r of RANGE_IDS) expect(normalizeChartSettings({ range: r }).range).toBe(r)
  })
})

describe('secondsToBarClose', () => {
  it('counts down inside the latest bar', () => {
    expect(secondsToBarClose(1000, 60, 1000)).toBe(60)
    expect(secondsToBarClose(1000, 60, 1030)).toBe(30)
    expect(secondsToBarClose(1000, 60, 1059)).toBe(1)
  })

  it('rolls the grid forward when the feed is behind, never sticking at 0', () => {
    expect(secondsToBarClose(1000, 60, 1060)).toBe(60)
    expect(secondsToBarClose(1000, 60, 1090)).toBe(30)
    expect(secondsToBarClose(1000, 60, 1000 + 60 * 10 + 15)).toBe(45)
  })

  it('is null without a grid', () => {
    expect(secondsToBarClose(null, 60, 1000)).toBeNull()
    expect(secondsToBarClose(1000, 0, 1000)).toBeNull()
    expect(secondsToBarClose(1000, 60, NaN)).toBeNull()
  })
})

describe('formatCountdown', () => {
  it('reads mm:ss under an hour and h:mm:ss above', () => {
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(5)).toBe('00:05')
    expect(formatCountdown(754)).toBe('12:34')
    expect(formatCountdown(3599)).toBe('59:59')
    expect(formatCountdown(3600)).toBe('1:00:00')
    expect(formatCountdown(86_399)).toBe('23:59:59')
  })

  it('is empty for nonsense', () => {
    expect(formatCountdown(-1)).toBe('')
    expect(formatCountdown(NaN)).toBe('')
  })
})

describe('legendChange', () => {
  const bars = [
    { time: 1, open: 10, high: 11, low: 9, close: 10.5 },
    { time: 2, open: 10.5, high: 12, low: 10, close: 11.55 },
  ]

  it('measures against the previous close when there is one', () => {
    const c = legendChange(bars, bars[1])
    expect(c.delta).toBeCloseTo(1.05)
    expect(c.pct).toBeCloseTo(10)
  })

  it('falls back to the bar’s own open for the first bar or an unknown bar', () => {
    expect(legendChange(bars, bars[0])).toEqual({ delta: 0.5, pct: 5 })
    const c = legendChange(bars, { time: 99, open: 20, close: 21 })
    expect(c.pct).toBeCloseTo(5)
    expect(legendChange([], { time: 1, open: 8, close: 8.8 }).pct).toBeCloseTo(10)
  })

  it('is null without a usable bar or base', () => {
    expect(legendChange(bars, null)).toBeNull()
    expect(legendChange(bars, { time: 5, close: NaN })).toBeNull()
    expect(legendChange([], { time: 5, open: 0, close: 1 })).toBeNull()
  })
})
