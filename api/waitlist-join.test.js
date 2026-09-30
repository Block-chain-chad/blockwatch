import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler, { limiters } from './waitlist-join.js'

/*
 * Risk 6 from the first-day review: "the waitlist can mail arbitrary
 * addresses". This endpoint is the one place Onstock sends email to an address
 * a stranger chose, so the tests care about two things above all: how many
 * attempts one caller gets, and how many times one address can be mailed.
 *
 * The Origin gate is deliberately NOT treated as a defence here — it is
 * forgeable, so every rate-limit case below sends a perfectly valid Origin, as
 * a real attacker would.
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

const WEB = { origin: 'https://blockwatch.app', host: 'blockwatch.app' }

async function post(email, headers = {}) {
  const res = fakeRes()
  await handler({ method: 'POST', body: { email }, headers: { ...WEB, ...headers } }, res)
  return res
}

const from = (ip) => ({ 'x-vercel-forwarded-for': ip })

const isJoin = (url) => String(url).includes('join_waitlist')
const isSend = (url) => String(url).includes('api.resend.com')
const sends = () => fetchMock.mock.calls.filter(([url]) => isSend(url))
const joins = () => fetchMock.mock.calls.filter(([url]) => isJoin(url))

let fetchMock
let joinPayload
beforeEach(() => {
  limiters.perClient.reset()
  limiters.perEmail.reset()
  limiters.perInstanceSend.reset()
  process.env.VITE_SUPABASE_URL = 'https://project.supabase.co'
  process.env.VITE_SUPABASE_ANON_KEY = 'anon-key'
  process.env.RESEND_API_KEY = 'resend-key'
  joinPayload = { position: 7, is_new: true }
  fetchMock = vi.fn(async (url) => ({
    ok: true,
    status: 200,
    json: async () => (isJoin(url) ? joinPayload : { id: 'sent' }),
  }))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('api/waitlist-join — a normal join', () => {
  it('saves the address and mails the welcome once', async () => {
    const res = await post('someone@example.com', from('1.1.1.1'))
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ position: 7 })
    expect(joins()).toHaveLength(1)
    expect(sends()).toHaveLength(1)
  })

  it('mails from onstock.app, links back to the site it came from, and uses no em dashes', async () => {
    await post('someone@example.com', { ...from('1.1.1.3'), origin: 'https://onstock.app', host: 'onstock.app' })
    const mail = JSON.parse(sends()[0][1].body)
    expect(mail.from).toBe('OnStock <contact@onstock.app>')
    expect(mail.html).toContain('href="https://onstock.app"')
    expect(`${mail.from} ${mail.subject} ${mail.html}`).not.toMatch(/blockwatch|\u2014/i)
  })

  it('normalizes the address before using it as a key', async () => {
    await post('  Someone@Example.COM  ', from('1.1.1.2'))
    expect(JSON.parse(joins()[0][1].body)).toEqual({ p_email: 'someone@example.com' })
  })
})

describe('api/waitlist-join — the is_new flag decides whether we mail', () => {
  it('mails a first-time address', async () => {
    joinPayload = { position: 7, is_new: true }
    await post('new@example.com', from('2.2.2.1'))
    expect(sends()).toHaveLength(1)
  })

  it('mails nothing on a re-join, but still reports the position', async () => {
    joinPayload = { position: 7, is_new: false }
    const res = await post('back@example.com', from('2.2.2.2'))
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ position: 7 })
    expect(sends()).toHaveLength(0)
  })

  it('fails closed when the flag is missing, rather than mailing everyone', async () => {
    joinPayload = { position: 7 }
    const res = await post('unsure@example.com', from('2.2.2.3'))
    expect(res.statusCode).toBe(200)
    expect(sends()).toHaveLength(0)
    expect(console.error).toHaveBeenCalled() // silence here would be the real bug
  })

  it('does not put the address in the log when it complains', async () => {
    joinPayload = { position: 7 }
    await post('private@example.com', from('2.2.2.4'))
    const logged = console.error.mock.calls.flat().join(' ')
    expect(logged).not.toContain('private@example.com')
  })

  it('keeps the legacy bare-integer shape working', async () => {
    joinPayload = 12
    const res = await post('legacy@example.com', from('2.2.2.5'))
    expect(res.body).toEqual({ position: 12 })
    expect(sends()).toHaveLength(1)
  })
})

describe('api/waitlist-join — per-caller rate limit', () => {
  it('gives a real person room to fumble the form', async () => {
    for (let i = 0; i < 5; i += 1) {
      const res = await post(`try${i}@example.com`, from('3.3.3.3'))
      expect(res.statusCode).toBe(200)
    }
  })

  it('cuts off a loop, and reaches neither Supabase nor Resend', async () => {
    for (let i = 0; i < 5; i += 1) await post(`spam${i}@example.com`, from('4.4.4.4'))
    const before = fetchMock.mock.calls.length
    const res = await post('spam6@example.com', from('4.4.4.4'))
    expect(res.statusCode).toBe(429)
    expect(fetchMock.mock.calls.length).toBe(before)
  })

  it('answers 429 with Retry-After and no-store', async () => {
    for (let i = 0; i < 5; i += 1) await post(`x${i}@example.com`, from('5.5.5.5'))
    const res = await post('x6@example.com', from('5.5.5.5'))
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('charges invalid addresses too, so a junk loop is not free', async () => {
    for (let i = 0; i < 5; i += 1) {
      expect((await post('not-an-email', from('6.6.6.6'))).statusCode).toBe(400)
    }
    expect((await post('real@example.com', from('6.6.6.6'))).statusCode).toBe(429)
  })

  it('does not punish the next visitor', async () => {
    for (let i = 0; i < 6; i += 1) await post(`y${i}@example.com`, from('7.7.7.7'))
    expect((await post('fresh@example.com', from('8.8.8.8'))).statusCode).toBe(200)
  })
})

describe('api/waitlist-join — per-address rate limit', () => {
  it('stops one inbox being targeted from a rotating set of callers', async () => {
    // The point of this bucket: a caller who spreads across addresses-per-IP
    // limits still cannot keep asking us to mail one stranger.
    const victim = 'victim@example.com'
    for (let i = 0; i < 3; i += 1) {
      expect((await post(victim, from(`9.0.0.${i}`))).statusCode).toBe(200)
    }
    const before = fetchMock.mock.calls.length
    const res = await post(victim, from('9.0.0.9'))
    expect(res.statusCode).toBe(429)
    expect(fetchMock.mock.calls.length).toBe(before)
  })

  it('counts the normalized address, so case and spacing cannot dodge it', async () => {
    for (const spelling of ['dodge@example.com', 'DODGE@example.com', '  Dodge@Example.com ']) {
      await post(spelling, from(`9.1.1.${spelling.length}`))
    }
    expect((await post('dodge@example.com', from('9.1.9.9'))).statusCode).toBe(429)
  })

  it('leaves other addresses alone', async () => {
    for (let i = 0; i < 4; i += 1) await post('one@example.com', from(`9.2.2.${i}`))
    expect((await post('two@example.com', from('9.2.9.9'))).statusCode).toBe(200)
  })
})

describe('api/waitlist-join — whole-instance send ceiling', () => {
  it('stops a rotating flood mailing an unbounded number of strangers', async () => {
    // Both of the other buckets are keyed on something the caller picks, so a
    // fresh source address and a fresh victim address together dodge both.
    // Driven this way the endpoint sent 200 welcome emails and refused none.
    for (let i = 0; i < 200; i += 1) {
      await post(`victim${i}@example.com`, from(`50.0.${Math.floor(i / 100)}.${i % 100}`))
    }
    expect(sends()).toHaveLength(60)
  })

  it('still saves the join once the ceiling is spent', async () => {
    // The address is already in Supabase by then. Dropping the welcome is the
    // right failure; telling someone their signup failed is not.
    for (let i = 0; i < 60; i += 1) await post(`early${i}@example.com`, from(`51.0.0.${i}`))
    const res = await post('late@example.com', from('51.1.1.1'))
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ position: 7 })
    expect(joins()).toHaveLength(61)
    expect(sends()).toHaveLength(60)
  })

  it('is spent only on mail that really goes out', async () => {
    // A re-join mails nothing, so it must not eat the budget of someone whose
    // welcome would actually be sent.
    joinPayload = { position: 7, is_new: false }
    for (let i = 0; i < 100; i += 1) await post(`rejoin${i}@example.com`, from(`52.0.0.${i}`))
    expect(sends()).toHaveLength(0)
    joinPayload = { position: 7, is_new: true }
    await post('first-timer@example.com', from('52.9.9.9'))
    expect(sends()).toHaveLength(1)
  })
})

describe('api/waitlist-join — input and origin handling', () => {
  it('answers the preflight before any gate, and does not charge for it', async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = fakeRes()
      await handler({ method: 'OPTIONS', headers: { ...WEB, ...from('1.4.1.4') } }, res)
      expect(res.statusCode).toBe(204)
    }
    expect((await post('after@example.com', from('1.4.1.4'))).statusCode).toBe(200)
  })

  it('refuses a method that is not POST', async () => {
    const res = fakeRes()
    await handler({ method: 'GET', headers: WEB }, res)
    expect(res.statusCode).toBe(405)
  })

  it('refuses a request with no Origin, and one from somewhere else', async () => {
    expect((await post('a@example.com', { origin: '' })).statusCode).toBe(403)
    expect((await post('a@example.com', { origin: 'https://evil.example' })).statusCode).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still lets the native app in', async () => {
    const res = await post('app@example.com', { origin: 'capacitor://localhost' })
    expect(res.statusCode).toBe(200)
  })

  it('rejects malformed and oversized addresses before Supabase', async () => {
    const tooLong = `${'a'.repeat(250)}@example.com`
    for (const [i, bad] of ['', 'nope', 'a@b', 'a b@c.d', tooLong, null].entries()) {
      const res = fakeRes()
      await handler({ method: 'POST', body: { email: bad }, headers: { ...WEB, ...from(`2.5.0.${i}`) } }, res)
      expect(res.statusCode).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('survives a missing body', async () => {
    const res = fakeRes()
    await handler({ method: 'POST', headers: { ...WEB, ...from('2.6.0.1') } }, res)
    expect(res.statusCode).toBe(400)
  })
})

describe('api/waitlist-join — failures degrade the right way', () => {
  it('reports a Supabase failure as a retryable 502', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) })
    const res = await post('down@example.com', from('3.1.0.1'))
    expect(res.statusCode).toBe(502)
    expect(sends()).toHaveLength(0)
  })

  it('still joins when the welcome email fails', async () => {
    fetchMock.mockImplementation(async (url) => {
      if (isJoin(url)) return { ok: true, status: 200, json: async () => joinPayload }
      throw new Error('resend down')
    })
    const res = await post('mailfail@example.com', from('3.1.0.2'))
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ position: 7 })
  })

  it('still joins when Resend is not configured at all', async () => {
    delete process.env.RESEND_API_KEY
    const res = await post('nokey@example.com', from('3.1.0.3'))
    expect(res.statusCode).toBe(200)
    expect(sends()).toHaveLength(0)
  })

  it('reports an unconfigured Supabase without touching the network', async () => {
    delete process.env.VITE_SUPABASE_URL
    delete process.env.SUPABASE_URL
    const res = await post('nodb@example.com', from('3.1.0.4'))
    expect(res.statusCode).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
