import { describe, it, expect } from 'vitest'
import { passwordStrength } from './passwordStrength'

/*
 * A hint, not a gate: submission is controlled solely by the existing 8-char
 * minimum (server-enforced). This just tells the user what they're making.
 * Classes counted: lowercase, uppercase, digit, other.
 */
describe('passwordStrength', () => {
  it('under 8 chars is too short', () => {
    expect(passwordStrength('abc').label).toBe('too short')
    expect(passwordStrength('1234567').label).toBe('too short')
    expect(passwordStrength('').label).toBe('too short')
  })

  it('8+ of one character class is weak', () => {
    expect(passwordStrength('abcdefgh')).toEqual({ label: 'weak', tone: 'warn' })
    expect(passwordStrength('12345678').label).toBe('weak')
  })

  it('8-11 with 2+ classes is okay', () => {
    expect(passwordStrength('abcdef12')).toEqual({ label: 'okay', tone: 'okay' })
    expect(passwordStrength('Abcdefghijk').label).toBe('okay')
  })

  it('12+ with 2+ classes is strong', () => {
    expect(passwordStrength('abcdefghij12')).toEqual({ label: 'strong', tone: 'good' })
    expect(passwordStrength('correct-horse-battery').label).toBe('strong')
  })

  it('12+ of one class is still weak — length alone does not diversify', () => {
    expect(passwordStrength('abcdefghijkl').label).toBe('weak')
  })
})
