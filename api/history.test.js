import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler, { limiters, INTERVALS, RANGES } from './history.js'

/*
 * /api/history fronts Yahoo's chart endpoint. Yahoo needs no key, so there is
 * no quota of ours to drain here — what an open proxy costs instead is Vercel
 * invocations and a deployment that happily relays arbitrary symbols for
 * anyone who asks.
 *
 * The handler used to accept any /^[A-Z0-9.\-]{1,10}$/i symbol with no limit
 * at all, and every distinct symbol is a distinct edge-cache key, so a script
 * walking the alphabet turned one cached response into unbounded upstream
 * calls and unbounded invocations. These tests are about what never gets that
 * far: an off-universe symbol must 400 before fetch, and a caller past its
 * bucket must 429 before fetch with a rejection the CDN is forbidden to hand
 * to anybody else.
 *
 * The one subtlety worth a test of its own: the client rewrites BRK.B to
 * BRK-B before calling here (src/services/stocks.js, src/services/candles.js),
 * so the allowlist this endpoint checks is the Yahoo spelling, not the one
 * api/finnhub.js uses.
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

/** A caller identified by IP, so cases never share a bucket by accident. */
const from = (ip) => ({ 'x-vercel-forwarded-for': ip })

const chart = (over = {}) => ({ symbol: 'AAPL', interval: '1d', range: '1mo', ...over })

let fetchMock
beforeEach(() => {
  limiters.perClient.reset()
  fetchMock = vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ chart: { result: [{ timestamp: [1] }] } }),
  }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('api/history — the symbol allowlist', () => {
  it('forwards a symbol the app can actually chart', async () => {
    const res = await call(chart(), from('1.1.1.1'))
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0][0])).toContain('/chart/AAPL?')
  })

  it("takes the class share in the spelling the client actually sends", async () => {
    const res = await call(chart({ symbol: 'BRK-B' }), from('1.1.1.2'))
    expect(res.statusCode).toBe(200)
    expect(String(fetchMock.mock.calls[0][0])).toContain('/chart/BRK-B?')
  })

  it('refuses the Finnhub spelling of that same share, which Yahoo cannot answer', async () => {
    const res = await call(chart({ symbol: 'BRK.B' }), from('1.1.1.3'))
    expect(res.statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses an off-universe symbol before spending an upstream call', async () => {
    const res = await call(chart({ symbol: 'ZZZZ' }), from('2.2.2.1'))
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'bad request' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses the whole shape the old pattern waved through', async () => {
    // Every one of these matched /^[A-Z0-9.\-]{1,10}$/i and minted its own
    // edge-cache key, so each was a fresh upstream call and a fresh invocation.
    for (const [i, junk] of ['A1', 'X.Y', 'QQQQQQQQQQ', '0', '---', 'aapl'].entries()) {
      const res = await call(chart({ symbol: junk }), from(`3.3.3.${i}`))
      expect(res.statusCode).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('still refuses an interval or range off its own allowlists', async () => {
    expect((await call(chart({ interval: '1m' }), from('4.4.4.1'))).statusCode).toBe(400)
    expect((await call(chart({ range: '10y' }), from('4.4.4.2'))).statusCode).toBe(400)
    expect((await call({ symbol: 'AAPL' }, from('4.4.4.3'))).statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('bounds the cache-key space to something countable', async () => {
    // The point of the allowlist, stated as a number: the edge can now hold at
    // most this many distinct objects for this endpoint, where the old pattern
    // left it unbounded.
    expect(INTERVALS.size * RANGES.size).toBe(15)
  })
})

describe('api/history — per-caller rate limit', () => {
  it('does not refuse a person browsing charts', async () => {
    // Sixty chart views before the bucket says anything, and the client caches
    // each for five minutes on top of that.
    for (let i = 0; i < 60; i += 1) {
      expect((await call(chart(), from('5.5.5.5'))).statusCode).toBe(200)
    }
  })

  it('stops a caller that keeps going, without reaching upstream', async () => {
    for (let i = 0; i < 60; i += 1) await call(chart(), from('6.6.6.6'))
    const spent = fetchMock.mock.calls.length
    const res = await call(chart(), from('6.6.6.6'))
    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'too many requests' })
    expect(fetchMock.mock.calls.length).toBe(spent)
  })

  it('never lets the CDN cache one caller rejection for everyone', async () => {
    for (let i = 0; i < 60; i += 1) await call(chart(), from('7.7.7.7'))
    const res = await call(chart(), from('7.7.7.7'))
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('does not punish a second visitor for the first one', async () => {
    for (let i = 0; i < 61; i += 1) await call(chart(), from('8.8.8.8'))
    expect((await call(chart(), from('9.9.9.9'))).statusCode).toBe(200)
  })

  it('charges junk requests too, so a bad-symbol loop is not free', async () => {
    for (let i = 0; i < 60; i += 1) await call(chart({ symbol: 'ZZZZ' }), from('1.2.3.4'))
    expect((await call(chart(), from('1.2.3.4'))).statusCode).toBe(429)
  })

  it('refills at one a second, so a stopped caller is not locked out', async () => {
    const t0 = Date.now()
    for (let i = 0; i < 60; i += 1) expect(limiters.perClient.take('x', t0).ok).toBe(true)
    expect(limiters.perClient.take('x', t0).ok).toBe(false)
    expect(limiters.perClient.take('x', t0 + 1_000).ok).toBe(true)
  })

  it('does not charge a CORS preflight', async () => {
    for (let i = 0; i < 100; i += 1) {
      const res = fakeRes()
      await handler({ method: 'OPTIONS', query: {}, headers: { ...WEB, ...from('5.4.3.2') } }, res)
      expect(res.statusCode).toBe(204)
    }
    expect((await call(chart(), from('5.4.3.2'))).statusCode).toBe(200)
  })
})
