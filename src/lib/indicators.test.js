import { describe, it, expect } from 'vitest'
import { sma, ema, rsi, vwap } from './indicators'

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
