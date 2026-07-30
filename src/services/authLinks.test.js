import { describe, it, expect } from 'vitest'
import { parseAuthLink } from './authLinks'

/*
 * The emailed links are the only input this parser will ever see:
 * {{ .SiteURL }}/auth/confirm?token_hash=…&type=signup|magiclink|recovery
 * Everything else — other paths, missing params, unknown types — must be
 * rejected with null, never a throw: this runs on raw appUrlOpen input.
 */
describe('parseAuthLink', () => {
  it('accepts each of the three emailed link types', () => {
    for (const type of ['signup', 'magiclink', 'recovery']) {
      expect(
        parseAuthLink(`https://blockwatch.app/auth/confirm?token_hash=abc123&type=${type}`),
      ).toEqual({ tokenHash: 'abc123', type })
    }
  })

  it('rejects other paths — ordinary site links must not be treated as auth', () => {
    expect(parseAuthLink('https://blockwatch.app/privacy.html')).toBeNull()
    expect(parseAuthLink('https://blockwatch.app/')).toBeNull()
    expect(parseAuthLink('https://blockwatch.app/auth/other?token_hash=x&type=signup')).toBeNull()
  })

  it('rejects missing or empty params', () => {
    expect(parseAuthLink('https://blockwatch.app/auth/confirm?type=signup')).toBeNull()
    expect(parseAuthLink('https://blockwatch.app/auth/confirm?token_hash=&type=signup')).toBeNull()
    expect(parseAuthLink('https://blockwatch.app/auth/confirm?token_hash=abc123')).toBeNull()
  })

  it('rejects types outside the allowlist', () => {
    for (const bad of ['email', 'invite', 'email_change', 'SIGNUP', 'x']) {
      expect(
        parseAuthLink(`https://blockwatch.app/auth/confirm?token_hash=abc123&type=${bad}`),
      ).toBeNull()
    }
  })

  it('never throws on garbage', () => {
    for (const garbage of ['', 'not a url', null, undefined, 'capacitor://localhost']) {
      expect(parseAuthLink(garbage)).toBeNull()
    }
  })

  it('ignores extra params', () => {
    expect(
      parseAuthLink('https://blockwatch.app/auth/confirm?utm=x&token_hash=abc123&type=recovery'),
    ).toEqual({ tokenHash: 'abc123', type: 'recovery' })
  })
})

import { vi, beforeEach } from 'vitest'
import { handleAuthLink, consumePendingAuthResult, subscribeAuthLinks } from './authLinks'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({
  supabase: { auth: { verifyOtp: vi.fn() } },
}))

describe('handleAuthLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumePendingAuthResult() // drain any leftover pending state between tests
  })

  it('non-auth URLs: returns false, calls nothing, stores nothing', async () => {
    expect(await handleAuthLink('https://blockwatch.app/privacy.html')).toBe(false)
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled()
    expect(consumePendingAuthResult()).toBeNull()
  })

  it('signup link → verifyOtp with token_hash, pending welcome', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
    const ok = await handleAuthLink('https://blockwatch.app/auth/confirm?token_hash=t1&type=signup')
    expect(ok).toBe(true)
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 't1', type: 'signup' })
    expect(consumePendingAuthResult()).toEqual({ kind: 'welcome' })
    expect(consumePendingAuthResult()).toBeNull() // one-shot
  })

  it('recovery link → pending recovery, not welcome', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
    await handleAuthLink('https://blockwatch.app/auth/confirm?token_hash=t2&type=recovery')
    expect(consumePendingAuthResult()).toEqual({ kind: 'recovery' })
  })

  it('expired/used token → pending expired', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Token has expired or is invalid' } })
    await handleAuthLink('https://blockwatch.app/auth/confirm?token_hash=t3&type=magiclink')
    expect(consumePendingAuthResult()).toEqual({ kind: 'expired' })
  })

  it('delivers to a live subscriber instead of storing', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
    const cb = vi.fn()
    const unsub = subscribeAuthLinks(cb)
    await handleAuthLink('https://blockwatch.app/auth/confirm?token_hash=t4&type=signup')
    expect(cb).toHaveBeenCalledWith({ kind: 'welcome' })
    expect(consumePendingAuthResult()).toBeNull()
    unsub()
  })

  it('same link delivered twice → verifyOtp called once, no second result', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
    const url = 'https://blockwatch.app/auth/confirm?token_hash=tdup&type=signup'
    expect(await handleAuthLink(url)).toBe(true)
    expect(await handleAuthLink(url)).toBe(true)
    expect(supabase.auth.verifyOtp).toHaveBeenCalledTimes(1)
    expect(consumePendingAuthResult()).toEqual({ kind: 'welcome' })
    expect(consumePendingAuthResult()).toBeNull()
  })
})
