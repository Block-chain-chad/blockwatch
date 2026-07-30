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
