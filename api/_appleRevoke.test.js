import { describe, it, expect, vi } from 'vitest'
import { generateKeyPairSync, verify } from 'node:crypto'
import { appleClientSecret, exchangeAppleCode, readPrivateKey, revokeAppleToken } from './_appleRevoke.js'

/*
 * Revoking Sign in with Apple on account deletion. The client secret must be
 * a valid ES256 JWT with the claims Apple checks, the code is exchanged for a
 * token plus the Apple user id it belongs to, the token can be revoked, and
 * any failure comes back as null or false rather than a throw or a leaked
 * token.
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

const idToken = (claims) =>
  `${Buffer.from('{"alg":"RS256"}').toString('base64url')}.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.sig`

describe('exchangeAppleCode', () => {
  const base = { code: 'c.0.code', clientId: 'app.blockwatch', teamId: 'T', keyId: 'K', privateKeyPem: pem, now: NOW }
  const answering = (body, ok = true) => vi.fn(async () => ({ ok, json: async () => body }))

  it('exchanges the code and returns the refresh token with the Apple user id', async () => {
    const fetchImpl = answering({ refresh_token: 'r.1', access_token: 'a.1', id_token: idToken({ sub: 'apple.sub' }) })
    const grant = await exchangeAppleCode({ ...base, fetchImpl })
    expect(grant).toMatchObject({ token: 'r.1', tokenType: 'refresh_token', sub: 'apple.sub' })
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://appleid.apple.com/auth/token')
    const body = new URLSearchParams(init.body)
    expect(body.get('grant_type')).toBe('authorization_code')
    expect(body.get('code')).toBe('c.0.code')
    expect(body.get('client_id')).toBe('app.blockwatch')
  })

  it('falls back to the access token when Apple gives no refresh token', async () => {
    const grant = await exchangeAppleCode({ ...base, fetchImpl: answering({ access_token: 'a.1', id_token: idToken({ sub: 's' }) }) })
    expect(grant).toMatchObject({ token: 'a.1', tokenType: 'access_token' })
  })

  it('returns null, without throwing, on every failure', async () => {
    expect(await exchangeAppleCode({ ...base, fetchImpl: answering({ error: 'invalid_grant' }, false) })).toBeNull()
    expect(await exchangeAppleCode({ ...base, fetchImpl: answering({ refresh_token: 'r' }) })).toBeNull() // no id_token
    expect(await exchangeAppleCode({ ...base, fetchImpl: answering({ refresh_token: 'r', id_token: 'junk' }) })).toBeNull()
    const down = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    expect(await exchangeAppleCode({ ...base, fetchImpl: down })).toBeNull()
    expect(await exchangeAppleCode({ ...base, privateKeyPem: 'not a key', fetchImpl: down })).toBeNull()
  })
})

describe('revokeAppleToken', () => {
  const grant = { token: 'r.1', tokenType: 'refresh_token', sub: 's', clientSecret: 'secret' }

  it('revokes the token it was given', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }))
    expect(await revokeAppleToken({ clientId: 'app.blockwatch', grant, fetchImpl })).toBe(true)
    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe('https://appleid.apple.com/auth/revoke')
    const body = new URLSearchParams(init.body)
    expect(body.get('token')).toBe('r.1')
    expect(body.get('token_type_hint')).toBe('refresh_token')
    expect(body.get('client_secret')).toBe('secret')
  })

  it('returns false, without throwing, when Apple refuses or cannot be reached', async () => {
    expect(await revokeAppleToken({ clientId: 'x', grant, fetchImpl: vi.fn(async () => ({ ok: false })) })).toBe(false)
    const down = vi.fn(async () => {
      throw new Error('ECONNRESET')
    })
    expect(await revokeAppleToken({ clientId: 'x', grant, fetchImpl: down })).toBe(false)
  })
})
