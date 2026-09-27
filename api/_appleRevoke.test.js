import { describe, it, expect, vi } from 'vitest'
import { generateKeyPairSync, verify } from 'node:crypto'
import { appleClientSecret, readPrivateKey, revokeAppleGrant } from './_appleRevoke.js'

/*
 * Revoking Sign in with Apple on account deletion. The client secret must be
 * a valid ES256 JWT with the claims Apple checks, the code is exchanged and
 * the resulting token revoked, and any failure comes back as false rather
 * than a throw or a leaked token.
 */

const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' })
const NOW = Date.parse('2026-09-25T12:00:00Z')

const decode = (part) => JSON.parse(Buffer.from(part, 'base64url').toString('utf8'))

describe('appleClientSecret', () => {
  it('is an ES256 JWT with the claims Apple checks, and a valid signature', () => {
    const jwt = appleClientSecret({ teamId: 'TEAM123456', keyId: 'KEY1234567', privateKey: readPrivateKey(pem), clientId: 'app.blockwatch', now: NOW })
    const [h, p, s] = jwt.split('.')
    expect(decode(h)).toEqual({ alg: 'ES256', kid: 'KEY1234567' })
    expect(decode(p)).toEqual({
      iss: 'TEAM123456',
      iat: NOW / 1000,
      exp: NOW / 1000 + 300,
      aud: 'https://appleid.apple.com',
      sub: 'app.blockwatch',
    })
    const ok = verify('sha256', Buffer.from(`${h}.${p}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(s, 'base64url'))
    expect(ok).toBe(true)
  })

  it('reads a key stored with literal \\n sequences', () => {
    const flattened = pem.replace(/\n/g, '\\n')
    expect(() => readPrivateKey(flattened)).not.toThrow()
  })
})

describe('revokeAppleGrant', () => {
  const base = { code: 'c.0.code', clientId: 'app.blockwatch', teamId: 'T', keyId: 'K', privateKeyPem: pem, now: NOW }

  it('exchanges the code, then revokes the refresh token', async () => {
    const fetchImpl = vi.fn(async (url) =>
      url.endsWith('/auth/token')
        ? { ok: true, json: async () => ({ refresh_token: 'r.1', access_token: 'a.1' }) }
        : { ok: true },
    )
    expect(await revokeAppleGrant({ ...base, fetchImpl })).toBe(true)
    const [tokenCall, revokeCall] = fetchImpl.mock.calls
    expect(tokenCall[0]).toBe('https://appleid.apple.com/auth/token')
    const tokenBody = new URLSearchParams(tokenCall[1].body)
    expect(tokenBody.get('grant_type')).toBe('authorization_code')
    expect(tokenBody.get('code')).toBe('c.0.code')
    expect(tokenBody.get('client_id')).toBe('app.blockwatch')
    expect(revokeCall[0]).toBe('https://appleid.apple.com/auth/revoke')
    const revokeBody = new URLSearchParams(revokeCall[1].body)
    expect(revokeBody.get('token')).toBe('r.1')
    expect(revokeBody.get('token_type_hint')).toBe('refresh_token')
  })

  it('revokes the access token when Apple gives no refresh token', async () => {
    const fetchImpl = vi.fn(async (url) =>
      url.endsWith('/auth/token') ? { ok: true, json: async () => ({ access_token: 'a.1' }) } : { ok: true },
    )
    expect(await revokeAppleGrant({ ...base, fetchImpl })).toBe(true)
    const revokeBody = new URLSearchParams(fetchImpl.mock.calls[1][1].body)
    expect(revokeBody.get('token')).toBe('a.1')
    expect(revokeBody.get('token_type_hint')).toBe('access_token')
  })

  it('returns false, without throwing, on every failure', async () => {
    const refused = vi.fn(async () => ({ ok: false, json: async () => ({ error: 'invalid_grant' }) }))
    expect(await revokeAppleGrant({ ...base, fetchImpl: refused })).toBe(false)
    const down = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    expect(await revokeAppleGrant({ ...base, fetchImpl: down })).toBe(false)
    expect(await revokeAppleGrant({ ...base, privateKeyPem: 'not a key', fetchImpl: refused })).toBe(false)
    const revokeFails = vi.fn(async (url) =>
      url.endsWith('/auth/token') ? { ok: true, json: async () => ({ refresh_token: 'r' }) } : { ok: false },
    )
    expect(await revokeAppleGrant({ ...base, fetchImpl: revokeFails })).toBe(false)
  })
})
