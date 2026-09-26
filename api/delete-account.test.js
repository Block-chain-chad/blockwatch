import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateKeyPairSync } from 'node:crypto'
import handler, { limiters, rowDeletions, exactIlike } from './delete-account.js'

/*
 * Account deletion. The claims worth pinning:
 *   - only the account behind the caller's own access token can be deleted;
 *   - every row keyed to the account goes, then the auth user, in that order,
 *     and a failed row delete leaves the user in place for a retry;
 *   - Sign in with Apple is revoked when a code is sent, and a failed revoke
 *     does not block the deletion;
 *   - nothing personal is logged;
 *   - it refuses cleanly when not configured, not signed in, or hammered.
 */

const URL_ = 'https://proj.supabase.co'
const KEY = 'sb_secret_test'
const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.signature-part'
const USER = {
  id: '11111111-2222-4333-8444-555555555555',
  email: 'Someone_Name@Example.com',
  identities: [{ provider: 'email' }],
  app_metadata: { providers: ['email'] },
}
const APPLE_USER = { ...USER, identities: [{ provider: 'apple' }], app_metadata: { providers: ['apple'] } }
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
function upstream({ user = USER, failOn = null, appleOk = true } = {}) {
  return vi.fn(async (url, init = {}) => {
    const method = init.method ?? 'GET'
    if (url.startsWith('https://appleid.apple.com/auth/token')) {
      return { ok: appleOk, json: async () => ({ refresh_token: 'r.tok' }) }
    }
    if (url.startsWith('https://appleid.apple.com/auth/revoke')) return { ok: appleOk }
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
      `DELETE ${URL_}/rest/v1/feedback?email=ilike.Someone%5C_Name%40Example.com`,
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

  it('revokes the grant first when the app sends a code', async () => {
    const res = await call({ body: { appleAuthorizationCode: 'c.0.abc' } })
    expect(res.body).toEqual({ deleted: true, apple: 'revoked' })
    const order = urls()
    expect(order.indexOf('POST https://appleid.apple.com/auth/revoke')).toBeLessThan(
      order.findIndex((u) => u.includes('/rest/v1/user_folders')),
    )
    const exchange = new URLSearchParams(fetchMock.mock.calls.find(([u]) => u.endsWith('/auth/token'))[1].body)
    expect(exchange.get('client_id')).toBe('app.blockwatch')
  })

  it('still deletes the account when Apple refuses, and says so', async () => {
    fetchMock = upstream({ user: APPLE_USER, appleOk: false })
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ body: { appleAuthorizationCode: 'c.0.abc' } })
    expect(res.statusCode).toBe(200)
    expect(res.body.apple).toBe('failed')
    expect(urls().some((u) => u.includes('/auth/v1/admin/users/'))).toBe(true)
  })

  it('says when no code came (the web) or Apple is not configured', async () => {
    expect((await call()).body.apple).toBe('no-code')
    vi.stubEnv('APPLE_SIGN_IN_PRIVATE_KEY', '')
    expect((await call({ body: { appleAuthorizationCode: 'c.0.abc' } })).body.apple).toBe('not-configured')
  })

  it('ignores a code for an account that does not use Apple', async () => {
    fetchMock = upstream()
    vi.stubGlobal('fetch', fetchMock)
    const res = await call({ body: { appleAuthorizationCode: 'c.0.abc' } })
    expect(res.body.apple).toBe('not-used')
    expect(urls().some((u) => u.includes('appleid.apple.com'))).toBe(false)
  })
})

describe('helpers', () => {
  it('escapes pattern characters so feedback matches the exact address', () => {
    expect(exactIlike('a_b%c*d\\e@x.com')).toBe('a\\_b\\%c\\*d\\\\e@x.com')
  })

  it('skips the email-keyed tables for an account with no email', () => {
    expect(rowDeletions({ id: USER.id }).map(([label]) => label)).toEqual(['folders', 'alerts'])
  })
})
