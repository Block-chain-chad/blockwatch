import { describe, it, expect } from 'vitest'
import { judgePinAge, PIN_FILES } from './check-pin-age.mjs'
import { MAX_PIN_AGE_DAYS } from '../src/lib/multiplier'

/*
 * The staleness rule, separated from the calendar so the rule itself can be
 * tested without a test that expires. The script that uses it is a named CI
 * step, so a stale pin reports as a stale pin rather than as a failing unit
 * suite.
 */
const NOW = Date.parse('2026-09-30T00:00:00.000Z')
const daysBefore = (d) => new Date(NOW - d * 86_400_000).toISOString()

describe('judgePinAge', () => {
  it('passes a fresh pin and reports its age', () => {
    const v = judgePinAge(daysBefore(3), NOW)
    expect(v.ok).toBe(true)
    expect(v.ageDays).toBeCloseTo(3, 6)
  })

  it('passes right up to the limit', () => {
    expect(judgePinAge(daysBefore(MAX_PIN_AGE_DAYS - 0.01), NOW).ok).toBe(true)
  })

  it('fails once past it, and says how old', () => {
    const v = judgePinAge(daysBefore(MAX_PIN_AGE_DAYS + 1), NOW)
    expect(v.ok).toBe(false)
    expect(v.reason).toMatch(/days old/)
  })

  it('fails an unreadable timestamp rather than treating it as fresh', () => {
    for (const bad of [undefined, null, '', 'soon', 42]) {
      expect(judgePinAge(bad, NOW).ok, `accepted ${JSON.stringify(bad)}`).toBe(false)
    }
  })

  it('fails a timestamp from the future, which means a broken write', () => {
    expect(judgePinAge(daysBefore(-1), NOW).ok).toBe(false)
  })
})

describe('which pins are checked', () => {
  it('checks the Ondo multipliers as well as the xStocks mints', () => {
    expect(PIN_FILES.map((p) => p.file)).toEqual(['verifiedMints.json', 'verifiedOndo.json'])
  })

  it('names the file whose timestamp it could not read', () => {
    expect(judgePinAge(undefined, NOW, 'verifiedOndo.json').reason).toMatch(/verifiedOndo\.json/)
  })
})
