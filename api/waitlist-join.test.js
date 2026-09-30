import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler from './waitlist-join.js'

/*
 * The trading waitlist is closed. This endpoint must never save an address or
 * send an email again, whatever the caller sends, and must say "closed"
 * clearly so older app builds stop retrying.
 */

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

const WEB = { origin: 'https://onstock.app', host: 'onstock.app' }

async function call(method, body, headers = WEB) {
  const res = fakeRes()
  await handler({ method, body, headers }, res)
  return res
}

let fetchMock
beforeEach(() => {
  process.env.VITE_SUPABASE_URL = 'https://project.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key'
  process.env.RESEND_API_KEY = 'resend-key'
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('api/waitlist-join (closed)', () => {
  it('answers every join with 410 closed and touches neither Supabase nor Resend', async () => {
    for (const headers of [WEB, { origin: 'capacitor://localhost' }, { origin: 'https://evil.example' }, {}]) {
      const res = await call('POST', { email: 'someone@example.com' }, headers)
      expect(res.statusCode).toBe(410)
      expect(res.body).toEqual({ error: 'waitlist closed' })
      expect(res.headers['Cache-Control']).toBe('no-store')
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not care what the body holds', async () => {
    for (const body of [undefined, null, {}, { email: 'x'.repeat(10_000) }]) {
      expect((await call('POST', body)).statusCode).toBe(410)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still answers the native app preflight', async () => {
    const res = await call('OPTIONS', undefined, { origin: 'capacitor://localhost' })
    expect(res.statusCode).toBe(204)
  })

  it('refuses a method that is not POST', async () => {
    expect((await call('GET')).statusCode).toBe(405)
  })
})
