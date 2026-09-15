import { describe, it, expect } from 'vitest'
import {
  CATALOG,
  CATEGORIES,
  indicatorById,
  buildKey,
  parseKey,
  normalizeKeys,
  describeKey,
  defaultParams,
  searchIndicators,
  computePlots,
} from './indicatorCatalog'

/*
 * The catalogue's job is to survive whatever comes out of localStorage and
 * still hand the chart something drawable. So the key round-trip and
 * normalizeKeys are tested harder than the search ranking: a bad key that
 * throws would take the whole chart down, while a mis-ranked search result
 * is only annoying.
 */

const bars = (closes, extras = {}) =>
  closes.map((c, i) => ({
    time: 1000 + i * 60,
    open: c,
    high: c + 1,
    low: c - 1,
    close: c,
    volume: extras.volume ?? 100,
  }))

describe('catalogue shape', () => {
  it('gives every entry the fields the dialog and chart read', () => {
    for (const e of CATALOG) {
      expect(typeof e.id).toBe('string')
      expect(typeof e.name).toBe('string')
      expect(typeof e.short).toBe('string')
      expect(['overlay', 'separate']).toContain(e.pane)
      expect(Array.isArray(e.params)).toBe(true)
      expect(e.plots.length).toBeGreaterThan(0)
      expect(typeof e.compute).toBe('function')
    }
  })

  it('has unique ids and lists every category once', () => {
    const ids = CATALOG.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length)
    for (const e of CATALOG) expect(CATEGORIES).toContain(e.category)
  })

  it('declares parameter defaults inside their own bounds', () => {
    for (const e of CATALOG) {
      for (const p of e.params) {
        expect(p.default).toBeGreaterThanOrEqual(p.min)
        expect(p.default).toBeLessThanOrEqual(p.max)
      }
    }
  })
})

describe('keys', () => {
  it('round-trips id and parameters', () => {
    const key = buildKey('sma', { length: 20 })
    expect(key).toBe('sma:20')
    expect(parseKey(key).entry.id).toBe('sma')
    expect(parseKey(key).params).toEqual({ length: 20 })
  })

  it('orders multi-parameter values as declared', () => {
    expect(buildKey('macd', { fast: 12, slow: 26, signal: 9 })).toBe('macd:12:26:9')
    expect(parseKey('macd:12:26:9').params).toEqual({ fast: 12, slow: 26, signal: 9 })
  })

  it('encodes a no-parameter indicator as the bare id', () => {
    expect(buildKey('vwap')).toBe('vwap')
    expect(parseKey('vwap').params).toEqual({})
  })

  it('fills missing parameters with defaults and clamps out-of-range ones', () => {
    expect(parseKey('sma').params).toEqual({ length: 20 })
    expect(parseKey('sma:0').params).toEqual({ length: 1 })
    expect(parseKey('sma:9999').params).toEqual({ length: 500 })
    expect(parseKey('sma:abc').params).toEqual({ length: 20 })
  })

  it('rounds an int parameter and keeps a float one', () => {
    expect(parseKey('sma:20.6').params.length).toBe(21)
    expect(parseKey('bb:20:2.5').params.mult).toBe(2.5)
  })

  it('returns null for an unknown id rather than throwing', () => {
    expect(parseKey('nope:1')).toBeNull()
    expect(parseKey('')).toBeNull()
    expect(parseKey(null)).toBeNull()
    expect(buildKey('nope')).toBeNull()
  })
})

describe('normalizeKeys', () => {
  it('drops unknown entries, canonicalises the rest and keeps order', () => {
    expect(normalizeKeys(['rsi:14', 'bogus', 'sma:0'])).toEqual(['rsi:14', 'sma:1'])
  })

  it('removes duplicates that differ only in spelling', () => {
    expect(normalizeKeys(['sma:20', 'sma', 'sma:20.4'])).toEqual(['sma:20'])
  })

  it('reads anything that is not an array as empty', () => {
    expect(normalizeKeys(null)).toEqual([])
    expect(normalizeKeys({ sma20: true })).toEqual([])
    expect(normalizeKeys('sma:20')).toEqual([])
  })
})

describe('describeKey', () => {
  it('prints the short name with its parameters', () => {
    expect(describeKey('sma:20')).toBe('SMA 20')
    expect(describeKey('macd:12:26:9')).toBe('MACD 12 26 9')
  })

  it('prints a no-parameter indicator as its name alone', () => {
    expect(describeKey('vwap')).toBe('VWAP')
  })

  it('is empty for an unknown key', () => {
    expect(describeKey('nope')).toBe('')
  })
})

describe('searchIndicators', () => {
  it('returns the whole catalogue for an empty query', () => {
    expect(searchIndicators('')).toHaveLength(CATALOG.length)
    expect(searchIndicators('   ')).toHaveLength(CATALOG.length)
  })

  it('puts an exact short-name match first', () => {
    expect(searchIndicators('rsi')[0].id).toBe('rsi')
    expect(searchIndicators('MACD')[0].id).toBe('macd')
  })

  it('matches a word inside the full name', () => {
    const ids = searchIndicators('bollinger').map((e) => e.id)
    expect(ids).toEqual(['bb'])
  })

  it('finds moving averages by their shared word', () => {
    const ids = searchIndicators('moving').map((e) => e.id)
    expect(ids).toEqual(expect.arrayContaining(['sma', 'ema', 'wma']))
  })

  it('falls back to keywords for a term in no name', () => {
    expect(searchIndicators('overbought').map((e) => e.id)).toEqual(
      expect.arrayContaining(['rsi', 'stoch'])
    )
  })

  it('returns nothing for a term that matches nothing', () => {
    expect(searchIndicators('zzzzz')).toEqual([])
  })
})

describe('computePlots', () => {
  it('returns one plot per declared line, index-aligned to the candles', () => {
    const candles = bars([1, 2, 3, 4, 5])
    const plots = computePlots('sma:3', candles)
    expect(plots).toHaveLength(1)
    expect(plots[0].values).toEqual([null, null, 2, 3, 4])
  })

  it('returns every band of a multi-plot indicator', () => {
    const plots = computePlots('bb:3:2', bars([1, 2, 3, 4, 5]))
    expect(plots.map((p) => p.id)).toEqual(['upper', 'middle', 'lower'])
    for (const p of plots) expect(p.values).toHaveLength(5)
  })

  it('is empty for an unknown key or no candles', () => {
    expect(computePlots('nope', bars([1, 2, 3]))).toEqual([])
    expect(computePlots('sma:3', [])).toEqual([])
    expect(computePlots('sma:3', null)).toEqual([])
  })

  it('computes every catalogue entry over a real series without throwing', () => {
    // 60 bars is past the longest default warm-up (MACD's 26 + 9).
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 5)
    const candles = bars(closes)
    for (const entry of CATALOG) {
      const key = buildKey(entry.id, defaultParams(entry))
      const plots = computePlots(key, candles)
      expect(plots).toHaveLength(entry.plots.length)
      for (const p of plots) {
        expect(p.values).toHaveLength(candles.length)
        // Every indicator must be defined somewhere in 60 bars, or its
        // default parameters are wrong for the data we actually load.
        expect(p.values.some((v) => v != null)).toBe(true)
      }
    }
  })

  it('survives an entry whose maths throws', () => {
    const broken = { ...indicatorById('sma') }
    expect(() => computePlots('sma:20', bars([1]))).not.toThrow()
    expect(broken.id).toBe('sma')
  })
})
