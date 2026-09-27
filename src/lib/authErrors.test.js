import { describe, it, expect } from 'vitest'
import { mapAuthError, retryAfterSeconds } from './authErrors'

/*
 * Supabase error messages → honest user copy. The one that motivated this
 * file: "Email not confirmed" used to fall through to the generic message,
 * so a brand-new password looked broken ("the password does nothing").
 */
describe('mapAuthError', () => {
  it('unconfirmed email says so, and offers resend', () => {
    const r = mapAuthError('Email not confirmed')
    expect(r.text).toBe('Almost there. Open the link we emailed you first, then sign in.')
    expect(r.action).toBe('resend')
  })

  it('wrong credentials keeps the existing copy', () => {
    const r = mapAuthError('Invalid login credentials')
    expect(r.text).toBe("That email and password didn't match. Try again, or use “Forgot password?”")
    expect(r.action).toBeNull()
  })

  it('already registered points to signing in', () => {
    const r = mapAuthError('User already registered')
    expect(r.text).toBe('That email already has an account. Sign in with its password instead.')
    expect(r.action).toBeNull()
  })

  it('anything else falls back to the generic copy', () => {
    for (const msg of ['fetch failed', '', undefined, null]) {
      const r = mapAuthError(msg)
      expect(r.text).toBe("That didn't work. Give it another try in a moment.")
      expect(r.action).toBeNull()
    }
  })
})

describe('retryAfterSeconds', () => {
  it("reads the wait out of Supabase's refusal, and nothing else", () => {
    expect(retryAfterSeconds('For security purposes, you can only request this after 57 seconds.')).toBe(57)
    expect(retryAfterSeconds('you can only request this after 1 second')).toBe(1)
    expect(retryAfterSeconds('Email rate limit exceeded')).toBeNull()
    expect(retryAfterSeconds(undefined)).toBeNull()
  })
})
