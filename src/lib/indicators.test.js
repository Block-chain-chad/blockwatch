import { describe, it, expect } from 'vitest'
import {
  sma,
  ema,
  rsi,
  vwap,
  wma,
  stdev,
  bollinger,
  macd,
  stochastic,
  atr,
  roc,
  obv,
} from './indicators'

/*
 * Indicators are compared against values worked out by hand in the comments,
 * plus one published series for RSI. The alignment rule — same length as the
 * input, null through the warm-up — is tested as hard as the arithmetic,
 * because an off-by-one there draws the line a candle to the left of where
 * the price actually was.
 */

const round = (arr, dp = 2) => arr.map((v) => (v == null ? null : Number(v.toFixed(dp))))

describe('sma', () => {
  it('averages a sliding window, null through the warm-up', () => {
    // windows: [1,2,3]=2, [2,3,4]=3, [3,4,5]=4
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('handles n = 1 as identity and a window longer than the data as all null', () => {
    expect(sma([7, 8], 1)).toEqual([7, 8])
    expect(sma([7, 8], 5)).toEqual([null, null])
  })

  it('nulls only the windows that contain a hole', () => {
    // hole at index 2 poisons windows ending at 2, 3, 4 (n=3); index 5 is clean again
    expect(sma([1, 2, null, 4, 5, 6], 3)).toEqual([null, null, null, null, null, 5])
  })

  it('survives junk', () => {
    expect(sma(null, 3)).toEqual([])
    expect(sma([1, 2, 3], 0)).toEqual([null, null, null])
  })
})

describe('ema', () => {
  it('seeds with the SMA then smooths with k = 2/(n+1)', () => {
    // n=3, k=0.5. seed at i=2: (1+2+3)/3 = 2.
    // i=3: 2 + 0.5*(4-2) = 3; i=4: 3 + 0.5*(5-3) = 4; i=5: 4 + 0.5*(10-4) = 7
    expect(ema([1, 2, 3, 4, 5, 10], 3)).toEqual([null, null, 2, 3, 4, 7])
  })

  it('equals the input for n = 1', () => {
    expect(ema([3, 9, 4], 1)).toEqual([3, 9, 4])
  })

  it('restarts the seed after a hole instead of carrying a guess across it', () => {
    // seed at 2 = 2, i=3 -> 3; hole at 4; needs 3 clean values again: seed at 7 = (6+7+8)/3 = 7
    expect(ema([1, 2, 3, 4, null, 6, 7, 8], 3)).toEqual([null, null, 2, 3, null, null, null, 7])
  })
})

describe('rsi', () => {
  it('reproduces the published StockCharts 14-day worked example', () => {
    // Closes and expected RSI values from StockCharts' "Relative Strength
    // Index" article (the standard worked example, Wilder smoothing).
    const closes = [
      44.3389, 44.0902, 44.1497, 43.6124, 44.3278, 44.8264, 45.0955, 45.4245, 45.8433, 46.0826, 45.8931,
      46.0328, 45.614, 46.282, 46.282, 46.0028, 46.0328, 46.4116, 46.2222, 45.6439, 46.2122, 46.2521,
      45.7137, 46.4515, 45.7835, 45.3548, 44.0288, 44.1783, 44.2181, 44.5672, 43.4205, 42.6628, 43.1314,
    ]
    const expected = [
      ...new Array(14).fill(null),
      70.53, 66.32, 66.55, 69.41, 66.36, 57.97, 62.93, 63.26, 56.06, 62.38, 54.71, 50.42, 39.99, 41.46,
      41.87, 45.46, 37.3, 33.08, 37.77,
    ]
    expect(round(rsi(closes, 14))).toEqual(expected)
  })

  it('matches a hand computation for a short period', () => {
    // n=2. changes: +1, -3, +2, +2
    // i=2: avgGain=(1+0)/2=0.5, avgLoss=(0+3)/2=1.5, RS=1/3, RSI=100-100/(4/3)=25
    // i=3: avgGain=(0.5*1+2)/2=1.25, avgLoss=(1.5*1+0)/2=0.75, RS=5/3, RSI=100-100/(8/3)=62.5
    // i=4: avgGain=(1.25+2)/2=1.625, avgLoss=0.375, RS=13/3, RSI=100-100/(16/3)=81.25
    expect(round(rsi([10, 11, 8, 10, 12], 2), 6)).toEqual([null, null, 25, 62.5, 81.25])
  })

  it('pins to 100 with no losses and 0 with no gains', () => {
    expect(rsi([1, 2, 3, 4], 3)).toEqual([null, null, null, 100])
    expect(rsi([4, 3, 2, 1], 3)).toEqual([null, null, null, 0])
  })

  it('is all null when there are not enough closes or a close is missing', () => {
    expect(rsi([1, 2, 3], 14)).toEqual([null, null, null])
    expect(rsi([1, 2, null, 4], 2)).toEqual([null, null, null, null])
    expect(rsi(null, 14)).toEqual([])
  })
})

describe('vwap', () => {
  const c = (high, low, close, volume) => ({ high, low, close, volume })

  it('accumulates typical price weighted by volume', () => {
    // typical: 10 and 20. after one: 10. after two: (10*100 + 20*300)/400 = 17.5
    expect(vwap([c(11, 9, 10, 100), c(22, 18, 20, 300)])).toEqual([10, 17.5])
  })

  it('is null until the first traded candle, then ignores broken rows', () => {
    // no volume at 0 -> null; index 2 has a null high -> skipped, carries 10
    expect(vwap([c(11, 9, 10, 0), c(11, 9, 10, 5), c(null, 9, 10, 5), c(22, 18, 20, 5)])).toEqual([
      null,
      10,
      10,
      15,
    ])
  })

  it('survives junk', () => {
    expect(vwap(null)).toEqual([])
    expect(vwap([null, {}])).toEqual([null, null])
  })
})

describe('wma', () => {
  it('weights the newest value heaviest', () => {
    // (1*1 + 2*2 + 3*3) / 6 = 14/6; (2*1 + 3*2 + 4*3) / 6 = 20/6
    expect(round(wma([1, 2, 3, 4], 3), 4)).toEqual([null, null, 2.3333, 3.3333])
  })

  it('nulls a window containing a hole', () => {
    // Only [3,4,5] is whole: (3*1 + 4*2 + 5*3) / 6 = 26/6
    expect(round(wma([1, null, 3, 4, 5], 3), 4)).toEqual([null, null, null, null, 4.3333])
  })

  it('survives junk', () => {
    expect(wma(null, 3)).toEqual([])
    expect(wma([1, 2, 3], 0)).toEqual([null, null, null])
  })
})

describe('stdev', () => {
  it('is the population deviation, not the sample one', () => {
    // mean 2, deviations -1,0,1 -> sqrt(2/3) = 0.8165 (sample would be 1)
    expect(round(stdev([1, 2, 3], 3), 4)).toEqual([null, null, 0.8165])
  })

  it('is zero on a flat window', () => {
    expect(stdev([5, 5, 5], 3)).toEqual([null, null, 0])
  })
})

describe('bollinger', () => {
  it('puts the bands mult deviations either side of the basis', () => {
    const { middle, upper, lower } = bollinger([1, 2, 3], 3, 2)
    expect(round(middle, 4)).toEqual([null, null, 2])
    expect(round(upper, 4)).toEqual([null, null, 3.633])
    expect(round(lower, 4)).toEqual([null, null, 0.367])
  })

  it('nulls all three arrays through the warm-up', () => {
    const r = bollinger([1, 2, 3, 4], 3, 2)
    for (const arr of [r.middle, r.upper, r.lower]) {
      expect(arr).toHaveLength(4)
      expect(arr.slice(0, 2)).toEqual([null, null])
    }
  })
})

describe('macd', () => {
  it('is the fast EMA minus the slow one', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + i)
    const { macd: line } = macd(closes, 3, 6, 4)
    const fast = ema(closes, 3)
    const slow = ema(closes, 6)
    expect(round(line, 6)[39]).toBe(Number((fast[39] - slow[39]).toFixed(6)))
  })

  it('seeds the signal from the MACD line, not from its warm-up nulls', () => {
    const closes = Array.from({ length: 40 }, (_, i) => 100 + Math.sin(i) * 3)
    const { macd: line, signal, histogram } = macd(closes, 3, 6, 4)
    // The slow EMA needs 6 bars, then the signal needs 4 MACD values: the
    // first signal must land at index 8, not somewhere past bar 40.
    const firstLine = line.findIndex((v) => v != null)
    const firstSignal = signal.findIndex((v) => v != null)
    expect(firstLine).toBe(5)
    expect(firstSignal).toBe(firstLine + 3)
    expect(histogram[firstSignal]).toBeCloseTo(line[firstSignal] - signal[firstSignal], 10)
  })

  it('returns three arrays the length of the input', () => {
    const r = macd([1, 2, 3], 12, 26, 9)
    expect(r.macd).toHaveLength(3)
    expect(r.signal).toHaveLength(3)
    expect(r.histogram).toHaveLength(3)
  })
})

describe('stochastic', () => {
  const bar = (high, low, close) => ({ high, low, close })

  it('reads 100 at the top of the range and 0 at the bottom', () => {
    const up = [bar(10, 0, 5), bar(10, 0, 5), bar(10, 0, 10)]
    expect(stochastic(up, 3, 1, 1).k[2]).toBe(100)
    const down = [bar(10, 0, 5), bar(10, 0, 5), bar(10, 0, 0)]
    expect(stochastic(down, 3, 1, 1).k[2]).toBe(0)
  })

  it('reads 50 on a flat range rather than dividing by zero', () => {
    const flat = [bar(5, 5, 5), bar(5, 5, 5), bar(5, 5, 5)]
    expect(stochastic(flat, 3, 1, 1).k[2]).toBe(50)
  })

  it('smooths %K and averages it again for %D', () => {
    const candles = Array.from({ length: 20 }, (_, i) => bar(10 + i, i, 5 + i))
    const { k, d } = stochastic(candles, 5, 3, 3)
    expect(k).toHaveLength(20)
    expect(d).toHaveLength(20)
    // %D trails %K by dLen - 1 more bars.
    expect(d.findIndex((v) => v != null) - k.findIndex((v) => v != null)).toBe(2)
  })
})

describe('atr', () => {
  const bar = (high, low, close) => ({ high, low, close })

  it('averages the true range, which spans the previous close', () => {
    // Every bar: high-low = 2, and the gap never widens it. ATR = 2.
    const candles = Array.from({ length: 20 }, () => bar(11, 9, 10))
    expect(atr(candles, 3)[19]).toBeCloseTo(2, 10)
  })

  it('counts a gap through the previous close', () => {
    // bar 1 opens far above bar 0's close: TR = |high - prevClose| = 10
    const candles = [bar(11, 9, 10), bar(20, 19, 19), bar(20, 19, 19), bar(20, 19, 19)]
    // TRs at 1,2,3 = 10, 1, 1 -> seed mean over 3 = 4
    expect(atr(candles, 3)[3]).toBeCloseTo(4, 10)
  })

  it('is null when there are not enough bars', () => {
    expect(atr([bar(1, 1, 1), bar(1, 1, 1)], 14)).toEqual([null, null])
    expect(atr(null, 14)).toEqual([])
  })
})

describe('roc', () => {
  it('is the percentage change n bars back', () => {
    expect(roc([100, 110, 121], 1)).toEqual([null, 10, 10])
  })

  it('is null when the base is zero or missing', () => {
    expect(roc([0, 5], 1)).toEqual([null, null])
    expect(roc([null, 5], 1)).toEqual([null, null])
  })
})

describe('obv', () => {
  const bar = (close, volume) => ({ close, volume })

  it('adds volume on an up close and subtracts it on a down close', () => {
    expect(obv([bar(10, 0), bar(11, 5), bar(10, 3), bar(10, 7)])).toEqual([0, 5, 2, 2])
  })

  it('carries the line forward across an unusable bar', () => {
    expect(obv([bar(10, 0), bar(11, 5), bar(null, 3), bar(12, 4)])).toEqual([0, 5, 5, 5])
  })

  it('survives junk', () => {
    expect(obv(null)).toEqual([])
    expect(obv([])).toEqual([])
  })
})
