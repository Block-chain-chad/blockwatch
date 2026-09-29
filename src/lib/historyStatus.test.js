import { describe, it, expect } from 'vitest'
import { historyProblem, POOL_SOURCE_NOTE, poolSourceNote, daysShortOfRange } from './historyStatus'

describe('historyProblem', () => {
  const NOW = 1_000_000

  it('says the source is busy and counts down to the retry', () => {
    const { text, retry } = historyProblem({ kind: 'busy', retryAt: NOW + 41_200 }, NOW)
    expect(text).toContain('is busy right now')
    expect(text).toContain('The prices above still update.')
    expect(retry).toEqual({ disabled: true, label: 'Try again in 42 s' })
  })

  it('enables the retry once the cooldown has passed', () => {
    expect(historyProblem({ kind: 'unreachable', retryAt: NOW - 1 }, NOW).retry).toEqual({
      disabled: false,
      label: 'Try again',
    })
    expect(historyProblem({ kind: 'unreachable', retryAt: null }, NOW).retry.disabled).toBe(false)
  })

  it('offers no retry when the source has no history for the token', () => {
    const { text, retry } = historyProblem({ kind: 'missing', retryAt: null }, NOW)
    expect(text).toBe('The price source has no history for this token yet, so there is no gap history to draw.')
    expect(retry).toBeNull()
  })

  it('treats an unknown or absent problem as unreachable rather than blank', () => {
    expect(historyProblem(null, NOW).text).toContain('could not be reached')
  })

  it('writes no dashes and no abbreviations', () => {
    const all = ['busy', 'unreachable', 'missing'].map((kind) => historyProblem({ kind, retryAt: NOW + 5_000 }, NOW).text)
    for (const t of [...all, POOL_SOURCE_NOTE]) {
      expect(t).not.toMatch(/[\u2013\u2014]/)
      expect(t).not.toMatch(/\bDEX\b|\bAPI\b/)
    }
  })
})

describe('poolSourceNote', () => {
  const DAY = 86_400_000
  const span = (days) => [{ t: 0, v: 1 }, { t: days * DAY, v: 1 }]

  it('names the source alone when the pool covers the range', () => {
    expect(poolSourceNote(span(7), 7)).toBe(POOL_SOURCE_NOTE)
    expect(poolSourceNote(span(30), 30)).toBe(POOL_SOURCE_NOTE)
  })

  it('says a pool-drawn year covers only about 300 days', () => {
    expect(daysShortOfRange(span(299), 365)).toBe(299)
    expect(poolSourceNote(span(299), 365)).toBe(`${POOL_SOURCE_NOTE} It covers the past 299 days, not the whole range.`)
  })
})
