import { describe, it, expect } from 'vitest'
import { poolCoverage, POOL_MAX_AGE_SHARE, POOL_MIN_SPAN_SHARE, POOL_MAX_GAP_SHARE } from './poolCoverage'

/*
 * Chart history fix brief (2026-10-07), part C. The fixture is the real case:
 * the only five 5-minute candles in the past day of the CRCLon / USDC 1% pool
 * on Ethereum, checked at about 9:30 PM Arizona time on October 7, 2026.
 */

const HOUR = 3_600_000
const DAY = 24 * HOUR
// 9:30 PM Arizona (UTC-7) on October 7 is 04:30 UTC on October 8.
const NOW = Date.parse('2026-10-08T04:30:00Z')

// Closes, Eastern (UTC-4): 4:55 AM $82.55, 7:00 AM $82.21, 7:30 AM $81.88,
// 7:45 AM $81.60, 11:25 AM $80.21.
const CRCLON_POOL_DAY = [
  { t: Date.parse('2026-10-07T08:55:00Z'), v: 82.55 },
  { t: Date.parse('2026-10-07T11:00:00Z'), v: 82.21 },
  { t: Date.parse('2026-10-07T11:30:00Z'), v: 81.88 },
  { t: Date.parse('2026-10-07T11:45:00Z'), v: 81.6 },
  { t: Date.parse('2026-10-07T15:25:00Z'), v: 80.21 },
]

/** One point every `step` ms from `from` to `to`, inclusive. */
function every(step, from, to) {
  const out = []
  for (let t = from; t <= to; t += step) out.push({ t, v: 80 })
  return out
}

describe('poolCoverage', () => {
  it('has the thresholds the brief set', () => {
    expect([POOL_MAX_AGE_SHARE, POOL_MIN_SPAN_SHARE, POOL_MAX_GAP_SHARE]).toEqual([0.1, 0.5, 0.1])
  })

  it('refuses the CRCLon pool of October 7 on all three checks', () => {
    // Newest point 13 h 5 min old, span 6 h 30 min, longest gap 3 h 40 min,
    // against limits of 2.4 h, 12 h and 2.4 h on a 24-hour window.
    expect(poolCoverage(CRCLON_POOL_DAY, DAY, NOW)).toEqual({ ok: false, failed: ['fresh', 'span', 'gaps'] })
  })

  it('accepts a busy pool: 5-minute candles across the whole day', () => {
    expect(poolCoverage(every(5 * 60_000, NOW - DAY, NOW - 60_000), DAY, NOW)).toEqual({ ok: true, failed: [] })
  })

  it('accepts a 1Y pool of 300 daily candles, short of a year', () => {
    expect(poolCoverage(every(DAY, NOW - 300 * DAY, NOW - HOUR), 365 * DAY, NOW).ok).toBe(true)
  })

  it('fails only freshness when a dense pool stopped trading 3 hours ago', () => {
    expect(poolCoverage(every(5 * 60_000, NOW - DAY, NOW - 3 * HOUR), DAY, NOW)).toEqual({ ok: false, failed: ['fresh'] })
  })

  it('fails only span when a dense pool covers the last 11 hours', () => {
    expect(poolCoverage(every(5 * 60_000, NOW - 11 * HOUR, NOW), DAY, NOW)).toEqual({ ok: false, failed: ['span'] })
  })

  it('fails only gaps when a dense pool went quiet for 3 hours in the middle', () => {
    const points = [...every(5 * 60_000, NOW - DAY, NOW - 14 * HOUR), ...every(5 * 60_000, NOW - 11 * HOUR, NOW)]
    expect(poolCoverage(points, DAY, NOW)).toEqual({ ok: false, failed: ['gaps'] })
  })

  it('passes at the limits and fails just past them', () => {
    const edge = [{ t: NOW - 12 * HOUR - 2.4 * HOUR, v: 1 }, ...every(2.4 * HOUR, NOW - 12 * HOUR, NOW - 2.4 * HOUR)]
    expect(poolCoverage(every(2.4 * HOUR, NOW - 12 * HOUR, NOW), DAY, NOW).ok).toBe(true) // span exactly 12 h
    expect(poolCoverage(edge, DAY, NOW).ok).toBe(true) // newest exactly 2.4 h old, gaps exactly 2.4 h
    expect(poolCoverage(every(2.4 * HOUR + 1, NOW - 15 * HOUR, NOW), DAY, NOW).failed).toEqual(['gaps'])
  })

  it('counts only points inside the window', () => {
    const old = { t: NOW - 3 * DAY, v: 1 }
    expect(poolCoverage([old, ...CRCLON_POOL_DAY.slice(-1)], DAY, NOW).ok).toBe(false)
    expect(poolCoverage([old, ...every(5 * 60_000, NOW - DAY, NOW)], DAY, NOW).ok).toBe(true)
  })

  it('refuses fewer than two points, or none', () => {
    expect(poolCoverage([{ t: NOW - 60_000, v: 1 }], DAY, NOW).ok).toBe(false)
    expect(poolCoverage([], DAY, NOW).ok).toBe(false)
    expect(poolCoverage(null, DAY, NOW).ok).toBe(false)
  })
})
