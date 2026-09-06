import { describe, it, expect } from 'vitest'
import { nextDensity, DENSITY, MAX_DENSITY } from './toolbarDensity'

describe('nextDensity', () => {
  it('steps one level denser while the content overflows', () => {
    expect(nextDensity(0, 1363, 841)).toBe(1)
    expect(nextDensity(1, 1213, 841)).toBe(2)
  })

  it('stays at the last level even when that still overflows (the row scrolls)', () => {
    expect(nextDensity(MAX_DENSITY, 900, 841)).toBe(MAX_DENSITY)
  })

  it('stays where it fits', () => {
    expect(nextDensity(2, 830, 841, { 0: 1363, 1: 1213 })).toBe(2)
    expect(nextDensity(0, 800, 841)).toBe(0)
  })

  it('steps back out to the loosest level known to fit as the window widens', () => {
    expect(nextDensity(2, 830, 1300, { 0: 1363, 1: 1213 })).toBe(1)
    expect(nextDensity(2, 830, 1400, { 0: 1363, 1: 1213 })).toBe(0)
    expect(nextDensity(1, 1213, 1400, { 0: 1363 })).toBe(0)
  })

  it('does not guess about a level it has not measured', () => {
    expect(nextDensity(2, 830, 1400, {})).toBe(2)
    expect(nextDensity(2, 830, 1400, { 1: NaN })).toBe(2)
  })

  it('names the three levels', () => {
    expect(DENSITY).toEqual({ FULL: 0, ICONS: 1, COMPACT: 2 })
  })
})
