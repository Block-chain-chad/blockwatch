import { describe, it, expect } from 'vitest'
import {
  parseIntervalInput,
  intervalSeconds,
  intervalLabel,
  RANGE_IDS,
  RANGE_SECONDS,
} from './intervalInput'
import { TIMEFRAMES, candleSeconds } from './candles'

/*
 * The §6.11 contract, line by line, then the two chip vocabularies round-
 * tripping: every timeframe id and every range id must parse back to itself
 * exactly, or a chip the toolbar offers could never be typed.
 */

describe('parseIntervalInput — the spec examples', () => {
  it("'15' candles → 15m exact", () => {
    expect(parseIntervalInput('15', 'candles')).toEqual({ kind: 'timeframe', id: '15m', exact: true })
  })

  it("'30' candles → 15m, not exact (a tie on the log scale goes to the shorter bar)", () => {
    expect(parseIntervalInput('30', 'candles')).toEqual({ kind: 'timeframe', id: '15m', exact: false })
  })

  it("'D' candles → 1d exact", () => {
    expect(parseIntervalInput('D', 'candles')).toEqual({ kind: 'timeframe', id: '1d', exact: true })
  })

  it("'1440' candles → 1d exact", () => {
    expect(parseIntervalInput('1440', 'candles')).toEqual({ kind: 'timeframe', id: '1d', exact: true })
  })

  it("'1W' gap → 1W exact", () => {
    expect(parseIntervalInput('1W', 'gap')).toEqual({ kind: 'range', id: '1W', exact: true })
  })

  it("'2W' gap → 1W, not exact", () => {
    expect(parseIntervalInput('2W', 'gap')).toEqual({ kind: 'range', id: '1W', exact: false })
  })

  it("'' → null in either mode", () => {
    expect(parseIntervalInput('', 'candles')).toBeNull()
    expect(parseIntervalInput('', 'gap')).toBeNull()
    expect(parseIntervalInput(undefined, 'gap')).toBeNull()
  })

  it("'xyz' → null in either mode", () => {
    expect(parseIntervalInput('xyz', 'candles')).toBeNull()
    expect(parseIntervalInput('xyz', 'gap')).toBeNull()
  })
})

describe('parseIntervalInput — grammar', () => {
  it('accepts either case and the m/h/d suffixes in candles mode', () => {
    expect(parseIntervalInput('5M', 'candles').id).toBe('5m')
    expect(parseIntervalInput('1h', 'candles')).toEqual({ kind: 'timeframe', id: '1h', exact: true })
    expect(parseIntervalInput('4H', 'candles')).toEqual({ kind: 'timeframe', id: '4h', exact: true })
    expect(parseIntervalInput('1d', 'candles').id).toBe('1d')
    expect(parseIntervalInput(' 60 ', 'candles').id).toBe('1h')
    expect(parseIntervalInput('240', 'candles').id).toBe('4h')
  })

  it('reads m as months in gap mode and minutes in candles mode', () => {
    expect(parseIntervalInput('1m', 'gap')).toEqual({ kind: 'range', id: '1M', exact: true })
    expect(parseIntervalInput('3m', 'gap')).toEqual({ kind: 'range', id: '3M', exact: true })
    expect(parseIntervalInput('1m', 'candles')).toEqual({ kind: 'timeframe', id: '1m', exact: true })
  })

  it('treats a bare number as days in gap mode', () => {
    expect(parseIntervalInput('7', 'gap')).toEqual({ kind: 'range', id: '1W', exact: true })
    expect(parseIntervalInput('365', 'gap')).toEqual({ kind: 'range', id: '1Y', exact: true })
  })

  it('snaps what the chips do not offer to the nearest by log-seconds', () => {
    expect(parseIntervalInput('2', 'candles')).toEqual({ kind: 'timeframe', id: '1m', exact: false })
    expect(parseIntervalInput('3h', 'candles')).toEqual({ kind: 'timeframe', id: '4h', exact: false })
    expect(parseIntervalInput('1w', 'candles')).toEqual({ kind: 'timeframe', id: '1d', exact: false })
    expect(parseIntervalInput('1y', 'candles')).toEqual({ kind: 'timeframe', id: '1d', exact: false })
    expect(parseIntervalInput('5', 'gap')).toEqual({ kind: 'range', id: '1W', exact: false })
    expect(parseIntervalInput('5y', 'gap')).toEqual({ kind: 'range', id: '1Y', exact: false })
    expect(parseIntervalInput('1h', 'gap')).toEqual({ kind: 'range', id: '1D', exact: false })
  })

  it('refuses zero, negatives, unknown units and dangling punctuation', () => {
    expect(parseIntervalInput('0', 'candles')).toBeNull()
    expect(parseIntervalInput('-5', 'candles')).toBeNull()
    expect(parseIntervalInput('5x', 'candles')).toBeNull()
    expect(parseIntervalInput('5 m x', 'candles')).toBeNull()
    expect(parseIntervalInput(',', 'candles')).toBeNull()
  })

  it('treats an unknown mode as candles', () => {
    expect(parseIntervalInput('15', undefined)).toEqual({ kind: 'timeframe', id: '15m', exact: true })
  })
})

describe('round trips', () => {
  it('every TIMEFRAMES id parses back to itself exactly in candles mode', () => {
    for (const t of TIMEFRAMES) {
      expect(parseIntervalInput(t.id, 'candles')).toEqual({ kind: 'timeframe', id: t.id, exact: true })
      expect(parseIntervalInput(t.label, 'candles')).toEqual({ kind: 'timeframe', id: t.id, exact: true })
      expect(intervalSeconds(t.id, 'candles')).toBe(candleSeconds(t.id))
    }
  })

  it('every CHART_RANGES key parses back to itself exactly in gap mode', () => {
    expect(RANGE_IDS).toEqual(['1D', '1W', '1M', '3M', '1Y'])
    for (const id of RANGE_IDS) {
      expect(parseIntervalInput(id, 'gap')).toEqual({ kind: 'range', id, exact: true })
      expect(intervalSeconds(id, 'gap')).toBe(RANGE_SECONDS[id])
    }
  })
})

describe('intervalLabel', () => {
  it('names the chip a parse lands on', () => {
    expect(intervalLabel(parseIntervalInput('1440', 'candles'))).toBe('1D')
    expect(intervalLabel(parseIntervalInput('5', 'candles'))).toBe('5m')
    expect(intervalLabel(parseIntervalInput('2w', 'gap'))).toBe('1W')
    expect(intervalLabel(null)).toBe('')
  })
})
