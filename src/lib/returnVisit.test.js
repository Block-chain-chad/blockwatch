import { describe, it, expect } from 'vitest'
import { classifyVisit, RETURN_WINDOW_DAYS } from './returnVisit'

const DAY = 86_400_000

describe('classifyVisit', () => {
  it('is a first visit without a stamp', () => {
    expect(classifyVisit({ lastSeenMs: null, nowMs: 10 * DAY })).toEqual({ kind: 'first', days: null })
  })
  it('is a return within the window and lapsed past it', () => {
    expect(classifyVisit({ lastSeenMs: 8 * DAY, nowMs: 10 * DAY })).toEqual({ kind: 'return', days: 2 })
    expect(classifyVisit({ lastSeenMs: 1 * DAY, nowMs: 10 * DAY })).toEqual({ kind: 'lapsed', days: 9 })
    expect(classifyVisit({ lastSeenMs: 3 * DAY, nowMs: 10 * DAY })).toEqual({ kind: 'return', days: 7 })
    expect(RETURN_WINDOW_DAYS).toBe(7)
  })
})
