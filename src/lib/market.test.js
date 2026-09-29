import { describe, it, expect } from 'vitest'
import {
  getMarketSession,
  getMarketDay,
  isUsMarketOpen,
  isExtendedHours,
  US_MARKET_HOLIDAYS,
  US_EARLY_CLOSES,
  CALENDAR_THROUGH,
} from './market'

/*
 * Session boundaries. Cheap tests for an expensive class of bug: getting these
 * wrong does not crash anything, it silently changes whether the app asserts a
 * gap it cannot measure.
 *
 * All fixtures are UTC instants with the expected America/New_York wall time in
 * the name, and every boundary is tested on both sides. August dates run in
 * EDT (UTC-4), January in EST (UTC-5) — the pair is what proves the DST
 * handling rather than a hardcoded offset.
 */

const at = (iso) => new Date(iso)

describe('getMarketSession', () => {
  it('classifies the four weekday sessions (EDT)', () => {
    expect(getMarketSession(at('2026-08-20T13:00:00Z'))).toBe('pre') // Thu 09:00 ET
    expect(getMarketSession(at('2026-08-20T14:00:00Z'))).toBe('regular') // Thu 10:00
    expect(getMarketSession(at('2026-08-20T21:00:00Z'))).toBe('post') // Thu 17:00
    expect(getMarketSession(at('2026-08-21T01:00:00Z'))).toBe('closed') // Thu 21:00
  })

  it('classifies the same wall-clock times in EST', () => {
    expect(getMarketSession(at('2026-01-15T14:00:00Z'))).toBe('pre') // Thu 09:00 ET
    expect(getMarketSession(at('2026-01-15T15:00:00Z'))).toBe('regular') // Thu 10:00
    expect(getMarketSession(at('2026-01-15T22:00:00Z'))).toBe('post') // Thu 17:00
  })

  it('treats weekends as closed regardless of hour', () => {
    expect(getMarketSession(at('2026-08-22T14:00:00Z'))).toBe('closed') // Sat 10:00 ET
    expect(getMarketSession(at('2026-08-23T14:00:00Z'))).toBe('closed') // Sun 10:00 ET
  })

  it('is exact on both sides of every boundary (EDT)', () => {
    // pre opens 04:00
    expect(getMarketSession(at('2026-08-20T07:59:00Z'))).toBe('closed') // 03:59
    expect(getMarketSession(at('2026-08-20T08:00:00Z'))).toBe('pre') // 04:00
    // regular opens 09:30
    expect(getMarketSession(at('2026-08-20T13:29:00Z'))).toBe('pre') // 09:29
    expect(getMarketSession(at('2026-08-20T13:30:00Z'))).toBe('regular') // 09:30
    // regular closes 16:00, post begins
    expect(getMarketSession(at('2026-08-20T19:59:00Z'))).toBe('regular') // 15:59
    expect(getMarketSession(at('2026-08-20T20:00:00Z'))).toBe('post') // 16:00
    // post closes 20:00
    expect(getMarketSession(at('2026-08-20T23:59:00Z'))).toBe('post') // 19:59
    expect(getMarketSession(at('2026-08-21T00:00:00Z'))).toBe('closed') // 20:00
  })
})

describe('isUsMarketOpen', () => {
  it('is true only in the regular session', () => {
    expect(isUsMarketOpen(at('2026-08-20T14:00:00Z'))).toBe(true) // 10:00
    expect(isUsMarketOpen(at('2026-08-20T13:00:00Z'))).toBe(false) // 09:00 pre
    expect(isUsMarketOpen(at('2026-08-20T21:00:00Z'))).toBe(false) // 17:00 post
    expect(isUsMarketOpen(at('2026-08-22T14:00:00Z'))).toBe(false) // Sat
  })
})

describe('isExtendedHours', () => {
  it('covers pre and post only — not regular, not overnight', () => {
    expect(isExtendedHours(at('2026-08-20T13:00:00Z'))).toBe(true) // pre
    expect(isExtendedHours(at('2026-08-20T21:00:00Z'))).toBe(true) // post
    expect(isExtendedHours(at('2026-08-20T14:00:00Z'))).toBe(false) // regular
    expect(isExtendedHours(at('2026-08-21T01:00:00Z'))).toBe(false) // overnight
    expect(isExtendedHours(at('2026-08-22T14:00:00Z'))).toBe(false) // weekend
  })
})

/*
 * The exchange calendar. Before it existed, a holiday weekday ran the full
 * session model: at 11am on Thanksgiving the app called the market open and
 * presented November's last close against a live token price as a real
 * spread. These fixtures are the days that used to lie.
 */
describe('holidays and early closes', () => {
  it('is shut all day on a holiday that falls on a weekday', () => {
    // Thanksgiving 2026 is a Thursday.
    expect(getMarketSession(at('2026-11-26T16:00:00Z'))).toBe('closed') // 11:00 ET
    expect(getMarketSession(at('2026-11-26T13:00:00Z'))).toBe('closed') // 08:00, no pre
    expect(getMarketSession(at('2026-11-26T22:00:00Z'))).toBe('closed') // 17:00, no post
    expect(isUsMarketOpen(at('2026-11-26T16:00:00Z'))).toBe(false)
    expect(isExtendedHours(at('2026-11-26T22:00:00Z'))).toBe(false)
  })

  it('names the holiday, so the share leg can say which one', () => {
    expect(getMarketDay(at('2026-11-26T16:00:00Z'))).toEqual({
      date: '2026-11-26',
      kind: 'holiday',
      reason: 'Thanksgiving Day',
      closeMinute: null,
    })
    expect(getMarketDay(at('2026-08-22T14:00:00Z')).kind).toBe('weekend')
    expect(getMarketDay(at('2026-08-20T14:00:00Z'))).toEqual({
      date: '2026-08-20',
      kind: 'normal',
      reason: null,
      closeMinute: 16 * 60,
    })
  })

  it('closes at 1pm on an early-close day, and runs post until 5pm', () => {
    // Friday after Thanksgiving 2026 (EST, UTC-5).
    expect(getMarketSession(at('2026-11-27T17:59:00Z'))).toBe('regular') // 12:59
    expect(getMarketSession(at('2026-11-27T18:00:00Z'))).toBe('post') // 13:00
    expect(getMarketSession(at('2026-11-27T21:59:00Z'))).toBe('post') // 16:59
    expect(getMarketSession(at('2026-11-27T22:00:00Z'))).toBe('closed') // 17:00
    expect(isUsMarketOpen(at('2026-11-27T19:00:00Z'))).toBe(false) // 14:00, shut
    expect(getMarketDay(at('2026-11-27T18:00:00Z')).closeMinute).toBe(13 * 60)
  })

  it('still opens pre-market normally on an early-close day', () => {
    expect(getMarketSession(at('2026-11-27T13:00:00Z'))).toBe('pre') // 08:00
    expect(getMarketSession(at('2026-11-27T15:00:00Z'))).toBe('regular') // 10:00
  })

  it('carries the days a US equity calendar must have', () => {
    // Spot checks against NYSE's published calendar, including the two the
    // weekday-only model got wrong most often: an observed holiday on a
    // Friday, and Good Friday, which no federal calendar lists.
    expect(US_MARKET_HOLIDAYS['2026-07-03']).toBe('Independence Day') // Jul 4 is a Saturday
    expect(US_MARKET_HOLIDAYS['2026-04-03']).toBe('Good Friday')
    expect(US_MARKET_HOLIDAYS['2027-06-18']).toBe('Juneteenth') // Jun 19 is a Saturday
    expect(US_EARLY_CLOSES['2026-12-24']).toBe('Christmas Eve')
    // Every entry is an ISO date with words a user can read.
    for (const [date, reason] of [...Object.entries(US_MARKET_HOLIDAYS), ...Object.entries(US_EARLY_CLOSES)]) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(reason.length).toBeGreaterThan(3)
    }
  })

  it('still covers the next 90 days', () => {
    // A deliberate alarm clock, not a flake: when this fails, the calendar
    // above has run out and needs next year's dates pasted in. It fails a
    // quarter before the app would start calling a holiday a normal session.
    const horizon = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10)
    expect(CALENDAR_THROUGH >= horizon).toBe(true)
  })
})

describe('lastCloseDay', () => {
  it('is today after the close and the prior trading day before it', async () => {
    const { lastCloseDay } = await import('./market')
    expect(lastCloseDay(new Date('2026-09-15T21:00:00Z'))).toEqual({ date: '2026-09-15', weekday: 'Tuesday', today: true })
    expect(lastCloseDay(new Date('2026-09-15T17:30:00Z'))).toEqual({ date: '2026-09-14', weekday: 'Monday', today: false })
  })

  it('is null where the calendar cannot vouch for the day', async () => {
    const { lastCloseDay } = await import('./market')
    expect(lastCloseDay(new Date('2028-01-05T21:00:00Z'))).toBeNull()
  })
})
