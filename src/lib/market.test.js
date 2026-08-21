import { describe, it, expect } from 'vitest'
import { getMarketSession, isUsMarketOpen, isExtendedHours } from './market'

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
