import { describe, it, expect } from 'vitest'
import { judgeUnits } from './check-multiplier-units.mjs'

/*
 * judgeUnits is the reconciliation rule: it decides whether two price feeds
 * that are both supposed to quote per SHARE actually do. A miss here means a
 * unit artifact gets displayed as a trading opportunity next to a Buy button,
 * so the boundary cases are pinned.
 *
 * Numbers are the real ones measured off mainnet and the live feeds on
 * 2026-09-16.
 */

describe('judgeUnits', () => {
  it('passes when both feeds agree, whatever the ratio is', () => {
    // NFLXx: multiplier 10, CoinGecko 76.98, Jupiter 75.78, NFLX share 76.41.
    // Both per share, so the +0.75% gap the app shows is real.
    expect(judgeUnits({ ticker: 'NFLXx', multiplier: '10', cg: 76.98, jup: 75.78 }).ok).toBe(true)
  })

  it('passes a genuine few-percent premium', () => {
    expect(judgeUnits({ ticker: 'KOx', multiplier: '1.0226', cg: 90.33, jup: 90.1 }).ok).toBe(true)
  })

  it('does not test a ratio too close to 1 to be separable from noise', () => {
    // AAPLx at 1.0033: "per share" and "per base token" are 0.33% apart,
    // which is inside the spread between two honest feeds. A verdict here
    // would be a coin flip, so it is skipped rather than guessed.
    const v = judgeUnits({ ticker: 'AAPLx', multiplier: '1.0033', cg: 333.64, jup: 332.9 })
    expect(v.ok).toBe(true)
    expect(v.skipped).toBe(true)
  })

  it('flags CoinGecko quoting per base token on a split ratio', () => {
    // What it would look like if CoinGecko had NOT scaled NFLXx: ten times
    // Jupiter's per-share number.
    const v = judgeUnits({ ticker: 'NFLXx', multiplier: '10', cg: 757.8, jup: 75.78 })
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(/CoinGecko looks unscaled/)
  })

  it('flags Jupiter quoting per base token', () => {
    const v = judgeUnits({ ticker: 'NFLXx', multiplier: '10', cg: 76.98, jup: 769.8 })
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(/Jupiter looks unscaled/)
  })

  it('flags a small dividend ratio that is off by exactly the multiplier', () => {
    // The live CMCSAx case: CoinGecko 26.25 against a 23.73 share with a
    // 1.0877 ratio. Either a 10% premium or an unscaled feed.
    const v = judgeUnits({ ticker: 'CMCSAx', multiplier: '1.0877', cg: 26.25, jup: 24.13 })
    expect(v.ok).toBe(false)
  })

  it('does not flag a fractional ratio when both feeds agree', () => {
    expect(judgeUnits({ ticker: 'AZNx', multiplier: '0.5111', cg: 166.25, jup: 160.84 }).ok).toBe(true)
  })

  it('flags a fractional ratio when one feed is unscaled', () => {
    const v = judgeUnits({ ticker: 'AZNx', multiplier: '0.5111', cg: 84.51, jup: 165.3 })
    expect(v.ok).toBe(false)
  })

  it('skips rather than flags when a price is missing', () => {
    const v = judgeUnits({ ticker: 'X', multiplier: '2', cg: null, jup: 10 })
    expect(v.ok).toBe(true)
    expect(v.skipped).toBe(true)
  })

  it('refuses an unreadable multiplier', () => {
    expect(judgeUnits({ ticker: 'X', multiplier: 'bad', cg: 10, jup: 10 }).ok).toBe(false)
    expect(judgeUnits({ ticker: 'X', multiplier: '0', cg: 10, jup: 10 }).ok).toBe(false)
  })
})
