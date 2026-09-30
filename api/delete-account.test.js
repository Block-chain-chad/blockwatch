import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import handler, { limiters, rowDeletions, exactImatch } from './delete-account.js'

/*
 * Account deletion. The claims worth pinning:
 *   - only the account behind the caller's own access token can be deleted;
 *   - every row keyed to the account goes, then the auth user, in that order,
 *     and a failed row delete leaves the user in place for a retry;
 *   - the session must have signed in within 10 minutes (amr, not iat), or,
 *     in the iOS app, prove it with a fresh Apple code for this Apple ID;
 *   - Sign in with Apple is revoked only for this account's own Apple ID,
 *     and only after the account is gone, and a failed revoke says so;
 *   - nothing personal is logged;
 *   - it refuses cleanly when not configured, not signed in, or hammered.
 */

const URL_ = 'https://proj.supabase.co'
const KEY = 'sb_secret_test'
const b64url = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const jwt = (claims) => `${b64url({ alg: 'HS256' })}.${b64url(claims)}.signature-part`
const nowSec = () => Math.floor(Date.now() / 1000)
/** An access token whose last sign-in was `ageSeconds` ago; iat is always fresh. */
const tokenSignedIn = (ageSeconds) =>
  jwt({ sub: 'x', iat: nowSec(), amr: [{ method: 'password', timestamp: nowSec() - ageSeconds }] })
const TOKEN = tokenSignedIn(60)
const STALE = tokenSignedIn(11 * 60)
const USER = {
  id: '11111111-2222-4333-8444-555555555555',
  email: 'Someone_Name@Example.com',
  email_confirmed_at: '2026-09-01T12:00:00Z',
  identities: [{ provider: 'email' }],
  app_metadata: { providers: ['email'] },
}
const APPLE_SUB = '001234.abcdef.0987'
const APPLE_USER = {
  ...USER,
  identities: [{ provider: 'apple', id: APPLE_SUB, identity_id: 'row-uuid', identity_data: { sub: APPLE_SUB } }],
  app_metadata: { providers: ['apple'] },
}
const pem = generateKeyPairSync('ec', { namedCurve: 'P-256' }).privateKey.export({ type: 'pkcs8', format: 'pem' })

function fakeRes() {
  const headers = {}
  const res = {
    statusCode: null,
    body: null,
    headers,
    setHeader: (k, v) => {
      headers[k] = v
    },
    getHeader: (k) => headers[k],
    status(code) {
      res.statusCode = code
      return res
    },
    json(b) {
      res.body = b
      return res
    },
    end() {
      return res
    },
  }
  return res
}

async function call({ method = 'POST', auth = `Bearer ${TOKEN}`, body = {}, headers = {} } = {}) {
  const res = fakeRes()
  await handler({ method, headers: { ...(auth ? { authorization: auth } : {}), ...headers }, body, query: {} }, res)
  return res
}

/** A fetch that plays Supabase (and Apple), recording what was asked. */
function upstream({ user = USER, failOn = null, appleOk = true, revokeOk = appleOk, appleSub = APPLE_SUB } = {}) {
  return vi.fn(async (url, init = {}) => {
    const method = init.method ?? 'GET'
    if (url.startsWith('https://appleid.apple.com/auth/token')) {
      return { ok: appleOk, json: async () => ({ refresh_token: 'r.tok', id_token: jwt({ sub: appleSub }) }) }
    }
    if (url.startsWith('https://appleid.apple.com/auth/revoke')) return { ok: revokeOk }
    if (url === `${URL_}/auth/v1/user`) {
      return user ? { ok: true, json: async () => user } : { ok: false, status: 401, json: async () => ({}) }
    }
    if (failOn && url.includes(failOn)) return { ok: false, status: 500 }
    return { ok: true, status: method === 'DELETE' ? 204 : 200 }
  })
}

let fetchMock
let errors
beforeEach(() => {
  limiters.perClient.reset()
  limiters.perAccount.reset()
  vi.stubEnv('SUPABASE_URL', URL_)
  vi.stubEnv('SUPABASE_SECRET_KEY', KEY)
  vi.stubEnv('APPLE_TEAM_ID', 'TEAM123456')
  vi.stubEnv('APPLE_SIGN_IN_KEY_ID', 'KEY1234567')
  vi.stubEnv('APPLE_SIGN_IN_PRIVATE_KEY', pem)
  fetchMock = upstream()
  vi.stubGlobal('fetch', fetchMock)
  errors = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  errors.mockRestore()
})

const urls = () => fetchMock.mock.calls.map(([u, i]) => `${i?.method ?? 'GET'} ${u}`)

describe('api/delete-account: refusals', () => {
  it('answers the preflight, allowing the Authorization header', async () => {
    const res = fakeRes()
    await handler({ method: 'OPTIONS', headers: { origin: 'capacitor://localhost' }, query: {} }, res)
    expect(res.statusCode).toBe(204)
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('takes POST only', async () => {
    expect((await call({ method: 'GET' })).statusCode).toBe(405)
  })

  it('needs a bearer token', async () => {
    expect((await call({ auth: null })).statusCode).toBe(401)
    expect((await call({ auth: 'Basic abc' })).statusCode).toBe(401)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a token Supabase does not recognise, and deletes nothing', async () => {
    fetchMock = upstream({ user: null })
    vi.stubGlobal('fetch', fetchMock)
    expect((await call()).statusCode).toBe(401)
    expect(urls().some((u) => u.startsWith('DELETE'))).toBe(false)
  })

  it('checks the token with Supabase Auth as the caller, not as the server', async () => {
    await call()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${URL_}/auth/v1/user`)
    expect(init.headers.Authorization).toBe(`Bearer ${TOKEN}`)
  })

  it('answers 503 and does nothing when the secret key is not set', async () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '')
    expect((await call()).statusCode).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects a malformed Apple code before calling anyone', async () => {
    expect((await call({ body: { appleAuthorizationCode: 'has spaces and <tags>' } })).statusCode).toBe(400)
    expect((await call({ body: { appleAuthorizationCode: 42 } })).statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rate limits a caller who keeps asking', async () => {
    const statuses = []
    for (let i = 0; i < 7; i++) statuses.push((await call({ headers: { 'x-forwarded-for': '9.9.9.9' } })).statusCode)
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200])
    expect(statuses.slice(5)).toEqual([429, 429])
  })
})

describe('api/delete-account: deleting', () => {
  it("deletes the account's rows, then the user, with the secret key", async () => {
    const res = await call()
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ deleted: true, apple: 'not-used' })
    expect(urls()).toEqual([
      `GET ${URL_}/auth/v1/user`,
      `DELETE ${URL_}/rest/v1/user_folders?user_id=eq.${USER.id}`,
      `DELETE ${URL_}/rest/v1/user_alerts?user_id=eq.${USER.id}`,
      `DELETE ${URL_}/rest/v1/waitlist?email=eq.someone_name%40example.com`,
      `DELETE ${URL_}/rest/v1/feedback?email=imatch.${encodeURIComponent('^Someone_Name@Example\\.com$')}`,
      `DELETE ${URL_}/auth/v1/admin/users/${USER.id}`,
    ])
    for (const [, init] of fetchMock.mock.calls.slice(1)) {
      expect(init.headers.apikey).toBe(KEY)
      expect(init.headers.Authorization).toBe(`Bearer ${KEY}`)
    }
  })

  it('leaves the user in place when a row delete fails, so a retry can finish', async () => {
    fetchMock = upstream({ failOn: 'user_alerts' })
    vi.stubGlobal('fetch', fetchMock)
    const res = await call()
    expect(res.statusCode).toBe(502)
    expect(urls().some((u) => u.includes('/auth/v1/admin/users/'))).toBe(false)
  })

  it('reports a failed user delete', async () => {
    fetchMock = upstream({ failOn: '/auth/v1/admin/users/' })
    vi.stubGlobal('fetch', fetchMock)
    expect((await call()).statusCode).toBe(502)
  })

  it('never logs an email, a token or the user id', async () => {
    fetchMock = upstream({ failOn: 'feedback' })
    vi.stubGlobal('fetch', fetchMock)
    await call()
    const logged = JSON.stringify(errors.mock.calls)
    expect(errors).toHaveBeenCalled()
    for (const secret of [USER.email, USER.email.toLowerCase(), TOKEN, USER.id, KEY]) {
      expect(logged).not.toContain(secret)
    }
  })
})

describe('api/delete-account: Sign in with Apple', () => {
  beforeEach(() => {
    fetchMock = upstream({ user: APPLE_USER })
    vi.stubGlobal('fetch', fetchMock)
  })

  const CODE = { appleAuthorizationCode: 'c.0.abc' }

  it('revokes the grant last, after the account is gone', async () => {
    const res = await call({ body: CODE })
    expect(res.body).toEqual({ deleted: true, apple: 'revoked' })
    const order = urls()
    expect(order.indexOf('POST https://appleid.apple.com/auth/token')).toBeLessThan(
      order.findIndex((u) => u.includes('/rest/v1/user_folders')),
    )
    expect(order.at(-1)).toBe('POST https://appleid.apple.com/auth/revoke')
    expect(order.findIndex((u) => u.includes('/auth/v1/admin/users/'))).toBe(order.length - 2)
    const exchange = new URLSearchParams(fetchMock.mock.calls.find(([u]) => u.endsWith('/auth/token'))[1].body)
    expect(exchange.get('client_id')).toBe('app.blockwatch')
  })

  it('revokes nothing when the code belongs to a different Apple ID, and says so', async () => {
    fetchMock = upstream({ user: APPLE_USER, appleSub: 'someone.else' })
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ body: CODE })
    expect(res.statusCode).toBe(200)
    expect(res.body.apple).toBe('failed')
    expect(urls()).not.toContain('POST https://appleid.apple.com/auth/revoke')
    expect(urls().some((u) => u.includes('/auth/v1/admin/users/'))).toBe(true)
  })

  it('matches the Apple ID however Supabase spells the identity', async () => {
    for (const identity of [{ provider: 'apple', provider_id: APPLE_SUB }, { provider: 'apple', identity_data: { sub: APPLE_SUB } }]) {
      fetchMock = upstream({ user: { ...APPLE_USER, identities: [identity] } })
      vi.stubGlobal('fetch', fetchMock)
      limiters.perAccount.reset()
      expect((await call({ body: CODE })).body.apple).toBe('revoked')
    }
  })

  it('still deletes the account when Apple refuses the code, and says so', async () => {
    fetchMock = upstream({ user: APPLE_USER, appleOk: false })
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ body: CODE })
    expect(res.statusCode).toBe(200)
    expect(res.body.apple).toBe('failed')
    expect(urls().some((u) => u.includes('/auth/v1/admin/users/'))).toBe(true)
  })

  it('reports a failed revoke after the account is already deleted', async () => {
    fetchMock = upstream({ user: APPLE_USER, revokeOk: false })
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ body: CODE })
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ deleted: true, apple: 'failed' })
  })

  it('revokes nothing when the account could not be deleted', async () => {
    for (const failOn of ['user_folders', '/auth/v1/admin/users/']) {
      fetchMock = upstream({ user: APPLE_USER, failOn })
      vi.stubGlobal('fetch', fetchMock)
      limiters.perAccount.reset()
      expect((await call({ body: CODE })).statusCode).toBe(502)
      expect(urls()).not.toContain('POST https://appleid.apple.com/auth/revoke')
    }
  })

  it('says when no code came (the web) or Apple is not configured', async () => {
    expect((await call()).body.apple).toBe('no-code')
    vi.stubEnv('APPLE_SIGN_IN_PRIVATE_KEY', '')
    expect((await call({ body: CODE })).body.apple).toBe('not-configured')
  })

  it('ignores a code for an account that does not use Apple', async () => {
    fetchMock = upstream()
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ body: CODE })
    expect(res.body.apple).toBe('not-used')
    expect(urls().some((u) => u.includes('appleid.apple.com'))).toBe(false)
  })
})

describe('api/delete-account: recent sign-in', () => {
  const deletedAnything = () => urls().some((u) => u.startsWith('DELETE '))

  it('refuses a session that signed in more than 10 minutes ago, even with a fresh iat', async () => {
    const res = await call({ auth: `Bearer ${STALE}` })
    expect(res.statusCode).toBe(403)
    expect(res.body).toEqual({ error: 'sign in again' })
    expect(deletedAnything()).toBe(false)
  })

  it('refuses a token with no sign-in times at all', async () => {
    const res = await call({ auth: `Bearer ${jwt({ sub: 'x', iat: nowSec() })}` })
    expect(res.statusCode).toBe(403)
    expect(deletedAnything()).toBe(false)
  })

  it('takes the latest sign-in when there are several', async () => {
    const token = jwt({ amr: [{ method: 'password', timestamp: nowSec() - 3600 }, { method: 'otp', timestamp: nowSec() - 30 }] })
    expect((await call({ auth: `Bearer ${token}` })).statusCode).toBe(200)
  })

  it('accepts a fresh Apple code for this Apple ID in place of a recent sign-in', async () => {
    fetchMock = upstream({ user: APPLE_USER })
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ auth: `Bearer ${STALE}`, body: { appleAuthorizationCode: 'c.0.abc' } })
    expect(res.statusCode).toBe(200)
    expect(res.body.apple).toBe('revoked')
  })

  it('does not accept an Apple code for a different Apple ID in place of a recent sign-in', async () => {
    fetchMock = upstream({ user: APPLE_USER, appleSub: 'someone.else' })
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ auth: `Bearer ${STALE}`, body: { appleAuthorizationCode: 'c.0.abc' } })
    expect(res.statusCode).toBe(403)
    expect(deletedAnything()).toBe(false)
    expect(urls()).not.toContain('POST https://appleid.apple.com/auth/revoke')
  })
})

describe('api/delete-account: unconfirmed email', () => {
  it("deletes an unconfirmed account without touching someone else's waitlist or feedback rows", async () => {
    fetchMock = upstream({ user: { ...USER, email_confirmed_at: null } })
    vi.stubGlobal('fetch', fetchMock)
    const res = await call()
    expect(res.statusCode).toBe(200)
    expect(urls()).toEqual([
      `GET ${URL_}/auth/v1/user`,
      `DELETE ${URL_}/rest/v1/user_folders?user_id=eq.${USER.id}`,
      `DELETE ${URL_}/rest/v1/user_alerts?user_id=eq.${USER.id}`,
      `DELETE ${URL_}/auth/v1/admin/users/${USER.id}`,
    ])
  })
})

describe('helpers', () => {
  it('builds a pattern that matches only the exact address, * included', () => {
    expect(exactImatch('a_b%c*d\\e+f.g@x.com')).toBe('^a_b%c\\*d\\\\e\\+f\\.g@x\\.com$')
    const re = new RegExp(exactImatch('A*b@x.com'), 'i')
    expect(re.test('a*B@X.com')).toBe(true)
    expect(re.test('aab@x.com')).toBe(false)
    expect(re.test('xa*b@x.com')).toBe(false)
  })

  it('skips the email-keyed tables for an account with no email', () => {
    expect(rowDeletions({ id: USER.id }).map(([label]) => label)).toEqual(['folders', 'alerts'])
  })

  it('skips the email-keyed tables when the email was never confirmed', () => {
    const unconfirmed = { ...USER, email_confirmed_at: null }
    expect(rowDeletions(unconfirmed).map(([label]) => label)).toEqual(['folders', 'alerts'])
    expect(rowDeletions({ ...USER, email_confirmed_at: undefined }).map(([label]) => label)).toEqual(['folders', 'alerts'])
  })
})
