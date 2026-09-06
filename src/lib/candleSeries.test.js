import { describe, it, expect } from 'vitest'
import {
  cleanCandles,
  toCandlestickData,
  toVolumeData,
  toLineData,
  indicatorLines,
  INDICATORS,
  timeframesFor,
  coerceTimeframe,
  isIntraday,
  networkName,
  timeframeLabel,
} from './candleSeries'
import { TIMEFRAMES, STOCK_INTERVALS } from './candles'
import { sma } from './indicators'

/*
 * Lightweight Charts throws on a series that is not strictly ascending in
 * time and draws a zero-valued point as a real reading, so the conversions
 * here are tested for exactly those two failure modes: order and holes.
 */

const bar = (time, close, extra = {}) => ({
  time,
  open: close - 1,
  high: close + 2,
  low: close - 2,
  close,
  volume: 100,
  ...extra,
})

describe('cleanCandles', () => {
  it('sorts ascending and keeps the later row for a duplicate timestamp', () => {
    const out = cleanCandles([bar(300, 3), bar(100, 1), bar(200, 2), bar(100, 9)])
    expect(out.map((c) => c.time)).toEqual([100, 200, 300])
    expect(out[0].close).toBe(9)
  })

  it('drops a bar with a missing price leg rather than zero-filling it', () => {
    const out = cleanCandles([bar(100, 1), { ...bar(200, 2), low: null }, bar(300, 3, { high: NaN })])
    expect(out.map((c) => c.time)).toEqual([100])
  })

  it('tolerates junk input', () => {
    expect(cleanCandles(null)).toEqual([])
    expect(cleanCandles([null, 42, 'x', {}])).toEqual([])
  })
})

describe('toCandlestickData', () => {
  it('emits only the four prices and time, ascending', () => {
    const out = toCandlestickData([bar(200, 2), bar(100, 1)])
    expect(out).toEqual([
      { time: 100, open: 0, high: 3, low: -1, close: 1 },
      { time: 200, open: 1, high: 4, low: 0, close: 2 },
    ])
    expect(Object.keys(out[0])).not.toContain('volume')
  })
})

describe('toVolumeData', () => {
  it('colours by direction and clamps a missing or negative volume to 0', () => {
    const colors = { up: 'U', down: 'D' }
    const out = toVolumeData(
      [
        { time: 1, open: 1, high: 2, low: 0, close: 2, volume: 10 }, // up
        { time: 2, open: 2, high: 2, low: 0, close: 1, volume: -5 }, // down, bad volume
        { time: 3, open: 1, high: 2, low: 0, close: 1 }, // flat counts as up, no volume
      ],
      colors
    )
    expect(out).toEqual([
      { time: 1, value: 10, color: 'U' },
      { time: 2, value: 0, color: 'D' },
      { time: 3, value: 0, color: 'U' },
    ])
  })
})

describe('toLineData', () => {
  it('omits the null warm-up instead of sending zeros', () => {
    const times = [1, 2, 3, 4]
    const values = sma([10, 20, 30, 40], 2) // [null, 15, 25, 35]
    expect(toLineData(times, values)).toEqual([
      { time: 2, value: 15 },
      { time: 3, value: 25 },
      { time: 4, value: 35 },
    ])
  })

  it('stops at the shorter of the two arrays and skips non-finite times', () => {
    expect(toLineData([1, NaN, 3], [1, 2, 3, 4])).toEqual([
      { time: 1, value: 1 },
      { time: 3, value: 3 },
    ])
    expect(toLineData(null, [1])).toEqual([])
  })
})

describe('indicatorLines', () => {
  it('returns one line per offered indicator, each aligned to the candle times', () => {
    const candles = Array.from({ length: 60 }, (_, i) => bar(1000 + i * 60, 100 + Math.sin(i)))
    const lines = indicatorLines(candles)
    expect(Object.keys(lines).sort()).toEqual(INDICATORS.map((d) => d.id).sort())
    // SMA 20 is defined from the 20th bar, EMA 50 from the 50th, RSI 14 from the 15th.
    expect(lines.sma20).toHaveLength(60 - 19)
    expect(lines.ema50).toHaveLength(60 - 49)
    expect(lines.rsi14).toHaveLength(60 - 14)
    expect(lines.sma20[0].time).toBe(1000 + 19 * 60)
    expect(lines.rsi14[0].time).toBe(1000 + 14 * 60)
    for (const p of lines.rsi14) {
      expect(p.value).toBeGreaterThanOrEqual(0)
      expect(p.value).toBeLessThanOrEqual(100)
    }
  })

  it('is empty, not broken, on a series too short to warm up', () => {
    const lines = indicatorLines([bar(1, 1), bar(2, 2)])
    expect(lines.sma20).toEqual([])
    expect(lines.ema50).toEqual([])
    expect(lines.rsi14).toEqual([])
  })

  it('names exactly one pane indicator and the rest overlays', () => {
    expect(INDICATORS.filter((d) => d.kind === 'pane').map((d) => d.id)).toEqual(['rsi14'])
    expect(INDICATORS.filter((d) => d.kind === 'overlay').map((d) => d.id)).toEqual(['sma20', 'ema50'])
  })
})

describe('timeframesFor', () => {
  it('offers every timeframe to the token side', () => {
    expect(timeframesFor('token').map((t) => t.id)).toEqual(TIMEFRAMES.map((t) => t.id))
  })

  it('offers the stock side only timeframes /api/history can serve', () => {
    const stock = timeframesFor('stock')
    expect(stock.length).toBeGreaterThan(0)
    for (const t of stock) {
      expect(t.stock).not.toBeNull()
      expect(STOCK_INTERVALS).toContain(t.stock.interval)
    }
    expect(stock.map((t) => t.id)).toEqual(['5m', '1d'])
  })
})

describe('coerceTimeframe', () => {
  it('keeps a timeframe the new side offers', () => {
    expect(coerceTimeframe('5m', 'stock')).toBe('5m')
    expect(coerceTimeframe('1d', 'stock')).toBe('1d')
    expect(coerceTimeframe('4h', 'token')).toBe('4h')
  })

  it('moves to the nearest offered bar length on a log scale', () => {
    expect(coerceTimeframe('1m', 'stock')).toBe('5m')
    expect(coerceTimeframe('15m', 'stock')).toBe('5m')
    expect(coerceTimeframe('1h', 'stock')).toBe('5m') // 12x from 5m, 24x from 1D
    expect(coerceTimeframe('4h', 'stock')).toBe('1d') // 48x from 5m, 6x from 1D
  })

  it('falls back to the default for an unknown id', () => {
    expect(coerceTimeframe('nope', 'token')).toBe('1h')
    expect(coerceTimeframe(undefined, 'stock')).toBe('5m')
  })
})

describe('small helpers', () => {
  it('knows which timeframes show clock time on the axis', () => {
    expect(isIntraday('1m')).toBe(true)
    expect(isIntraday('4h')).toBe(true)
    expect(isIntraday('1d')).toBe(false)
    expect(isIntraday('nope')).toBe(false)
  })

  it('names the proxy networks and nothing else', () => {
    expect(networkName('solana')).toBe('Solana')
    expect(networkName('eth')).toBe('Ethereum')
    expect(networkName('base')).toBeNull()
  })

  it('labels a timeframe by its chip text', () => {
    expect(timeframeLabel('1d')).toBe('1D')
    expect(timeframeLabel('zzz')).toBe('zzz')
  })
})
