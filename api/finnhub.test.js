import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler, { limiters } from './finnhub.js'

/*
 * Risk 5 from the first-day review: "one script can blank prices for
 * everyone". Finnhub's free tier is 60 calls/min shared by every Onstock user,
 * and a drained quota takes the share price — and therefore the gap, the whole
 * product — down for all of them at once.
 *
 * So these tests are about what never reaches upstream. A symbol the app
 * cannot display must 400 before fetch, and a caller past its bucket must 429
 * before fetch, with a rejection the CDN is forbidden to hand anyone else.
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

async function call(query, headers = {}) {
  const res = fakeRes()
  await handler({ method: 'GET', query, headers: { ...WEB, ...headers } }, res)
  return res
}

/** A caller identified by IP, so cases don't share a bucket by accident. */
const from = (ip) => ({ 'x-vercel-forwarded-for': ip })

let fetchMock
beforeEach(() => {
  limiters.perClient.reset()
  limiters.perInstance.reset()
  process.env.FINNHUB_API_KEY = 'test-key'
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ c: 1 }) }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('api/finnhub — the symbol allowlist', () => {
  it('forwards a symbol the app can actually display', async () => {
    const res = await call({ kind: 'quote', symbol: 'AAPL' }, from('1.1.1.1'))
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0][0])).toContain('/quote?symbol=AAPL')
  })

  it('forwards a symbol with a dot, which the universe really contains', async () => {
    const res = await call({ kind: 'quote', symbol: 'BRK.B' }, from('1.1.1.2'))
    expect(res.statusCode).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toContain('symbol=BRK.B')
  })

  it('refuses an off-universe symbol before spending an upstream call', async () => {
    const res = await call({ kind: 'quote', symbol: 'ZZZZ' }, from('2.2.2.1'))
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'bad request' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('closes the walk-the-alphabet drain the old length check allowed', async () => {
    // Each of these matched the previous /^[A-Z0-9.-]{1,10}$/i test, and each
    // minted its own edge-cache key, so each cost a fresh upstream call.
    for (const [i, junk] of ['AAAA', 'AAAB', 'QQQQQQQQQQ', '1', '---', 'X.Y'].entries()) {
      const res = await call({ kind: 'quote', symbol: junk }, from(`3.3.3.${i}`))
      expect(res.statusCode).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a case variant, because it is a separate cache key', async () => {
    const res = await call({ kind: 'quote', symbol: 'aapl' }, from('2.2.2.2'))
    expect(res.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still refuses an unknown kind and a missing symbol', async () => {
    expect((await call({ kind: 'nope', symbol: 'AAPL' }, from('2.2.2.3'))).statusCode).toBe(400)
    expect((await call({ kind: 'quote' }, from('2.2.2.4'))).statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('applies to every kind, not just quotes', async () => {
    for (const [i, kind] of ['profile', 'metric', 'news', 'earnings', 'recommendation'].entries()) {
      const res = await call({ kind, symbol: 'NOPE' }, from(`4.4.4.${i}`))
      expect(res.statusCode).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('api/finnhub — per-caller rate limit', () => {
  it('lets a whole cold Board load through', async () => {
    // CANDIDATE_CAP is 150 underlyings; a real user must never see a 429.
    for (let i = 0; i < 150; i += 1) {
      expect((await call({ kind: 'quote', symbol: 'AAPL' }, from('5.5.5.5'))).statusCode).toBe(200)
    }
  })

  it('stops a caller that keeps going, without reaching upstream', async () => {
    for (let i = 0; i < 240; i += 1) await call({ kind: 'quote', symbol: 'AAPL' }, from('6.6.6.6'))
    const calls = fetchMock.mock.calls.length
    const res = await call({ kind: 'quote', symbol: 'AAPL' }, from('6.6.6.6'))
    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'too many requests' })
    expect(fetchMock.mock.calls.length).toBe(calls)
  })

  it('never lets the CDN cache one caller rejection for everyone', async () => {
    for (let i = 0; i < 240; i += 1) await call({ kind: 'quote', symbol: 'AAPL' }, from('7.7.7.7'))
    const res = await call({ kind: 'quote', symbol: 'AAPL' }, from('7.7.7.7'))
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('does not punish a second visitor for the first one', async () => {
    for (let i = 0; i < 241; i += 1) await call({ kind: 'quote', symbol: 'AAPL' }, from('8.8.8.8'))
    expect((await call({ kind: 'quote', symbol: 'AAPL' }, from('9.9.9.9'))).statusCode).toBe(200)
  })

  it('charges junk requests too, so a bad-symbol loop is not free', async () => {
    for (let i = 0; i < 240; i += 1) await call({ kind: 'quote', symbol: 'ZZZZ' }, from('1.2.3.4'))
    expect((await call({ kind: 'quote', symbol: 'AAPL' }, from('1.2.3.4'))).statusCode).toBe(429)
  })

  it('does not charge a CORS preflight', async () => {
    for (let i = 0; i < 300; i += 1) {
      const res = fakeRes()
      await handler({ method: 'OPTIONS', query: {}, headers: { ...WEB, ...from('5.4.3.2') } }, res)
      expect(res.statusCode).toBe(204)
    }
    expect((await call({ kind: 'quote', symbol: 'AAPL' }, from('5.4.3.2'))).statusCode).toBe(200)
  })
})

describe('api/finnhub — instance circuit breaker', () => {
  it('caps total upstream calls even when the caller key keeps changing', async () => {
    // The per-caller bucket is keyed on a header. This one is not, so forging
    // or rotating that header cannot buy more upstream calls.
    for (let i = 0; i < 600; i += 1) {
      await call({ kind: 'quote', symbol: 'AAPL' }, from(`10.0.${Math.floor(i / 250)}.${i % 250}`))
    }
    expect(fetchMock.mock.calls.length).toBe(600)
    const res = await call({ kind: 'quote', symbol: 'AAPL' }, from('10.1.1.1'))
    expect(res.statusCode).toBe(429)
    expect(fetchMock.mock.calls.length).toBe(600)
  })

  it('is spent only on calls that really go upstream', async () => {
    // Rejected symbols must not eat the shared budget, or a junk flood from
    // one caller would 429 everybody else.
    for (let i = 0; i < 600; i += 1) {
      await call({ kind: 'quote', symbol: 'ZZZZ' }, from(`11.0.${Math.floor(i / 250)}.${i % 250}`))
    }
    expect((await call({ kind: 'quote', symbol: 'AAPL' }, from('11.9.9.9'))).statusCode).toBe(200)
  })
})

describe('api/finnhub — unchanged behaviour', () => {
  it('answers a preflight before any gate', async () => {
    const res = fakeRes()
    await handler({ method: 'OPTIONS', query: {}, headers: WEB }, res)
    expect(res.statusCode).toBe(204)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects an unknown query param', async () => {
    const res = await call({ kind: 'quote', symbol: 'AAPL', x: '1' }, from('12.0.0.1'))
    expect(res.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a missing key as unconfigured, not as a bad request', async () => {
    delete process.env.FINNHUB_API_KEY
    const res = await call({ kind: 'quote', symbol: 'AAPL' }, from('12.0.0.2'))
    expect(res.statusCode).toBe(503)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still sets the shared cache policy on a good response', async () => {
    const res = await call({ kind: 'quote', symbol: 'AAPL' }, { 'x-vercel-forwarded-for': '13.0.0.1', origin: '' })
    expect(res.headers['Cache-Control']).toBe('s-maxage=180, stale-while-revalidate=600')
  })

  it('passes an upstream failure through', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
    const res = await call({ kind: 'quote', symbol: 'AAPL' }, from('13.0.0.2'))
    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'upstream error' })
  })
})
