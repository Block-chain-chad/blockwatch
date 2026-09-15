import { describe, it, expect } from 'vitest'
import {
  SIZES, formatSize, gapDollars, readingSentence, roundTrip, gapPercentile, percentileCaption, RANGE_WORDS,
} from './reading'

const MINUS = '−'

describe('gapDollars / formatSize', () => {
  it('is the size times the gap', () => {
    expect(gapDollars(0.0916, 1000)).toBeCloseTo(0.916, 3)
    expect(gapDollars(-2.14, 1000)).toBeCloseTo(-21.4, 3)
    expect(gapDollars(null, 1000)).toBeNull()
    expect(SIZES).toEqual([100, 1000, 10000])
    expect(formatSize(1000)).toBe('$1,000')
    expect(formatSize(100)).toBe('$100')
  })
})

describe('readingSentence', () => {
  const base = { ticker: 'NVDAx', companyName: 'NVIDIA', size: 1000, thin: false, volume24h: 5_000_000 }

  it('says the gap in dollars at the size, more or less', () => {
    expect(readingSentence({ ...base, gapPct: 0.0916 })).toBe(
      'On $1,000 of NVIDIA, NVDAx costs $0.92 more than the shares right now.'
    )
    expect(readingSentence({ ...base, gapPct: -2.14 })).toBe(
      'On $1,000 of NVIDIA, NVDAx costs $21.40 less than the shares right now.'
    )
    expect(readingSentence({ ...base, gapPct: -2.14, size: 100 })).toBe(
      'On $100 of NVIDIA, NVDAx costs $2.14 less than the shares right now.'
    )
  })

  it('calls parity the same', () => {
    expect(readingSentence({ ...base, gapPct: 0.02 })).toBe(
      'On $1,000 of NVIDIA, NVDAx costs the same as the shares right now.'
    )
  })

  it('refuses to price noise', () => {
    expect(readingSentence({ ...base, gapPct: 18, thin: true, volume24h: 12_000 })).toBe(
      'The gap on NVDAx reads +18.00% but only $12k traded today; treat it as noise.'
    )
    expect(readingSentence({ ...base, gapPct: -40 })).toBe(
      `The gap on NVDAx reads ${MINUS}40.00% and no real wrapper drifts that far; treat it as noise.`
    )
    expect(readingSentence({ ...base, gapPct: 18, thin: true, volume24h: null })).toBe(
      'The gap on NVDAx reads +18.00% but almost nothing traded today; treat it as noise.'
    )
  })

  it('says when there is no share price', () => {
    expect(readingSentence({ ...base, gapPct: null })).toBe('No share price for NVDAx yet.')
  })
})

describe('roundTrip', () => {
  it('adds the gap and the DEX spread at the size', () => {
    expect(roundTrip({ gapPct: 0.0916, spreadPct: 0.046, size: 1000 })).toEqual({
      gapUsd: expect.closeTo(0.916, 3),
      spreadUsd: expect.closeTo(0.46, 3),
      total: expect.closeTo(1.376, 3),
    })
    expect(roundTrip({ gapPct: -1, spreadPct: 0.5, size: 100 }).gapUsd).toBeCloseTo(1, 6)
  })

  it('is null without a spread or a gap', () => {
    expect(roundTrip({ gapPct: 0.1, spreadPct: null, size: 1000 })).toBeNull()
    expect(roundTrip({ gapPct: null, spreadPct: 0.1, size: 1000 })).toBeNull()
  })
})

describe('gapPercentile / percentileCaption', () => {
  const series = [-0.4, -0.2, 0, 0.1, 0.3, 0.6, 0.9, 1.2].map((v, i) => ({ t: i, v }))

  it('is the share of readings narrower than now, by absolute value', () => {
    expect(gapPercentile(series, 0.5)).toBe(63)
    expect(gapPercentile(series, 2)).toBe(100)
    expect(gapPercentile(series, 0)).toBe(0)
    expect(gapPercentile([], 0.5)).toBeNull()
    expect(gapPercentile(series, null)).toBeNull()
  })

  it('captions with the range\'s granularity, never a bare "of the past year"', () => {
    expect(percentileCaption('1W', 71)).toBe('Wider than 71% of its half-hour readings this week.')
    expect(percentileCaption('1W', 29)).toBe('Narrower than 71% of its half-hour readings this week.')
    expect(percentileCaption('1D', 50)).toBe('Wider than 50% of its five-minute readings today.')
    expect(percentileCaption('1M', 82)).toBe('Wider than 82% of its daily close-to-close readings this month.')
    expect(percentileCaption('1Y', 82)).toBe('Wider than 82% of its daily close-to-close readings this year.')
    expect(percentileCaption('1W', null)).toBe('')
    expect(RANGE_WORDS['1D']).toBe('Past day')
  })
})
