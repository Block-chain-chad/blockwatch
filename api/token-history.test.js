import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler, { limiters, resetBreaker, CACHE, DAYS, retryAfterSeconds, pointsFrom } from './token-history.js'

/*
 * /api/token-history fronts CoinGecko's market_chart for the gap chart's
 * token line (chart history fix brief, 2026-10-07, part A). What matters:
 * nothing off the allowlists reaches CoinGecko, nothing about the caller is
 * forwarded, a good answer is shared at the edge, and a refusal is never
 * cached, says when to come back, and stops this instance asking until then.
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
const CRCLON = 'circle-internet-group-ondo-tokenized-stock'

async function call(query, headers = {}) {
  const res = fakeRes()
  await handler({ method: 'GET', query, headers: { ...WEB, ...headers } }, res)
  return res
}

const from = (ip) => ({ 'x-vercel-forwarded-for': ip })
const ask = (over = {}) => ({ id: CRCLON, days: '1', ...over })

function upstream(status, body = {}, headers = {}) {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return { ok: status >= 200 && status < 300, status, headers: { get: (k) => lower[k.toLowerCase()] ?? null }, json: async () => body }
}

const PRICES = [
  [1_791_000_000_000, 82.55],
  [1_791_000_300_000, 82.4],
]

let fetchMock
beforeEach(() => {
  limiters.perClient.reset()
  limiters.perInstance.reset()
  resetBreaker()
  fetchMock = vi.fn(async () => upstream(200, { prices: PRICES, market_caps: [[1, 2]], total_volumes: [[1, 2]] }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.useRealTimers()
})

describe('api/token-history: a good answer', () => {
  it('asks CoinGecko for exactly that coin and range, and returns only the points', async () => {
    const res = await call(ask(), from('1.1.1.1'))
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://api.coingecko.com/api/v3/coins/${CRCLON}/market_chart?vs_currency=usd&days=1`
    )
    expect(res.body).toEqual({ prices: PRICES })
  })

  it('is edge-cacheable for each range, longer for longer ranges', async () => {
    const fresh = []
    for (const [i, days] of ['1', '7', '30', '90', '365'].entries()) {
      const res = await call(ask({ days }), from(`1.1.2.${i}`))
      expect(res.headers['Cache-Control']).toBe(CACHE[days])
      expect(res.headers['Cache-Control']).toMatch(/^public, s-maxage=\d+, stale-while-revalidate=\d+, stale-if-error=\d+$/)
      fresh.push(Number(/s-maxage=(\d+)/.exec(res.headers['Cache-Control'])[1]))
    }
    expect(fresh[0]).toBe(900) // "Past day": 15 minutes, for the Demo key's monthly allowance
    expect(fresh).toEqual([...fresh].sort((a, b) => a - b))
  })

  it('never keeps an answer longer than 24 hours, stale copies included (CoinGecko terms 6.1.1)', () => {
    const seconds = (header, name) => Number(new RegExp(`${name}=(\\d+)`).exec(header)[1])
    for (const days of ['1', '7', '30', '90', '365']) {
      const header = CACHE[days]
      const fresh = seconds(header, 's-maxage')
      expect(fresh + seconds(header, 'stale-if-error'), `${days}: s-maxage + stale-if-error`).toBeLessThanOrEqual(86_400)
      expect(fresh + seconds(header, 'stale-while-revalidate'), `${days}: s-maxage + stale-while-revalidate`).toBeLessThanOrEqual(86_400)
    }
    expect(CACHE['365']).toContain('stale-if-error=43200')
  })

  it('drops malformed points rather than relaying them', () => {
    expect(pointsFrom({ prices: [[1, 2], [null, 3], [4, 'x'], 'junk', [5, 6, 7]] })).toEqual([[1, 2], [5, 6]])
    expect(pointsFrom({})).toEqual([])
    expect(pointsFrom(null)).toEqual([])
  })
})

describe('api/token-history: what reaches CoinGecko', () => {
  it('sends only its own headers, never the caller’s address, cookies or headers', async () => {
    await call(ask(), {
      ...from('9.9.9.9'),
      'x-forwarded-for': '9.9.9.9',
      cookie: 'sb-access-token=secret',
      authorization: 'Bearer secret',
      'user-agent': 'Visitor Browser',
      referer: 'https://onstock.app/asset/x',
    })
    const init = fetchMock.mock.calls[0][1]
    expect(init.headers).toEqual({ Accept: 'application/json', 'User-Agent': 'OnStock tracker' })
  })

  it('adds the server-side demo key when one is configured, and only then', async () => {
    vi.stubEnv('COINGECKO_API_KEY', 'CG-test-key')
    await call(ask(), from('1.2.1.1'))
    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      Accept: 'application/json',
      'User-Agent': 'OnStock tracker',
      'x-cg-demo-api-key': 'CG-test-key',
    })
  })

  it('gives up on a CoinGecko that does not answer', async () => {
    await call(ask(), from('1.2.1.2'))
    expect(fetchMock.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
  })
})

describe('api/token-history: the allowlists', () => {
  it('refuses an id not in universe.json, or a case variant of one, before spending a call', async () => {
    const bad = ['bitcoin', CRCLON.toUpperCase(), 'Circle-internet-group-ondo-tokenized-stock', `${CRCLON} `, '', '__proto__']
    for (const [i, id] of bad.entries()) {
      const res = await call(ask({ id }), from(`2.2.2.${i}`))
      expect(res.statusCode, id).toBe(400)
      expect(res.headers['Cache-Control']).toBe('no-store')
    }
    expect((await call(ask({ id: [CRCLON, CRCLON] }), from('2.2.3.1'))).statusCode).toBe(400)
    expect((await call({ days: '1' }, from('2.2.3.2'))).statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a days value outside 1, 7, 30, 90 and 365', async () => {
    for (const [i, days] of ['2', '14', '0', '-1', '1.0', '01', 'max', '', ['1', '7']].entries()) {
      expect((await call(ask({ days }), from(`3.3.3.${i}`))).statusCode, String(days)).toBe(400)
    }
    expect((await call({ id: CRCLON }, from('3.3.4.1'))).statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expect([...DAYS]).toEqual(['1', '7', '30', '90', '365'])
  })

  it('refuses any unknown parameter, and a cache lane other than the app’s', async () => {
    expect((await call(ask({ vs_currency: 'eur' }), from('4.4.4.1'))).statusCode).toBe(400)
    expect((await call(ask({ x: '1' }), from('4.4.4.2'))).statusCode).toBe(400)
    expect((await call(ask({ c: 'web' }), from('4.4.4.3'))).statusCode).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await call(ask({ c: 'app' }), from('4.4.4.4'))).statusCode).toBe(200)
  })
})

describe('api/token-history: CORS', () => {
  it('answers the iPhone app on its cache lane and lets it read Retry-After', async () => {
    const res = await call(ask({ c: 'app' }), { origin: 'capacitor://localhost', host: 'onstock.app', ...from('5.5.5.1') })
    expect(res.statusCode).toBe(200)
    expect(res.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost')
    expect(res.headers['Access-Control-Expose-Headers']).toBe('Retry-After')
    expect(res.headers.Vary).toBe('Origin, X-Onstock-Client')
  })

  it('refuses a foreign origin before anything else', async () => {
    const res = await call(ask(), { origin: 'https://evil.example', host: 'onstock.app', ...from('5.5.5.2') })
    expect(res.statusCode).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('answers a preflight without charging the caller', async () => {
    for (let i = 0; i < 100; i += 1) {
      const res = fakeRes()
      await handler({ method: 'OPTIONS', query: {}, headers: { ...WEB, ...from('5.5.5.3') } }, res)
      expect(res.statusCode).toBe(204)
    }
    expect((await call(ask(), from('5.5.5.3'))).statusCode).toBe(200)
  })
})

/*
 * Fix round 1, item 5: a light gate (api/_clientGate.js) so the route does
 * not serve as an open mirror of CoinGecko's history. A deterrent, not
 * security: the website sends X-Onstock-Client, the iPhone app always sends
 * its Origin, a bare script sends neither.
 */
describe('api/token-history: the client gate', () => {
  const bare = { host: 'onstock.app' }

  it('refuses a request with neither an Origin nor the website’s header, before anything else', async () => {
    const res = await call(ask(), { origin: undefined, ...bare, ...from('9.1.1.1') })
    expect(res.statusCode).toBe(403)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('serves the website’s same-origin request, which carries the header but often no Origin', async () => {
    const res = await call(ask(), { origin: undefined, ...bare, 'x-onstock-client': 'web', ...from('9.1.1.2') })
    expect(res.statusCode).toBe(200)
  })

  it('refuses a header with any other value', async () => {
    for (const [i, value] of ['1', 'Web', '', 'web '].entries()) {
      const res = await call(ask(), { origin: undefined, ...bare, 'x-onstock-client': value, ...from(`9.1.2.${i}`) })
      expect(res.statusCode, JSON.stringify(value)).toBe(403)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('serves the iPhone app, which sends its Origin and no custom header', async () => {
    const res = await call(ask({ c: 'app' }), { origin: 'capacitor://localhost', host: 'onstock.app', ...from('9.1.3.1') })
    expect(res.statusCode).toBe(200)
  })

  it('names both gating headers in Vary on every answer, so the edge never hands a passed answer to a refused request', async () => {
    const ok = await call(ask(), { origin: undefined, ...bare, 'x-onstock-client': 'web', ...from('9.1.4.1') })
    const refused = await call(ask(), { origin: undefined, ...bare, ...from('9.1.4.2') })
    expect(ok.headers.Vary).toBe('Origin, X-Onstock-Client')
    expect(ok.headers['Cache-Control']).toBe(CACHE['1'])
    expect(refused.headers.Vary).toBe('Origin, X-Onstock-Client')
  })

  it('still refuses a foreign Origin, which the gate alone would let through', async () => {
    const res = await call(ask(), { origin: 'https://evil.example', host: 'onstock.app', 'x-onstock-client': 'web', ...from('9.1.5.1') })
    expect(res.statusCode).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('api/token-history: refusals and failures', () => {
  it('turns a CoinGecko 429 into an uncached 503 carrying CoinGecko’s own Retry-After', async () => {
    fetchMock.mockResolvedValueOnce(upstream(429, {}, { 'Retry-After': '58' }))
    const res = await call(ask(), from('6.6.6.1'))
    expect(res.statusCode).toBe(503)
    expect(res.headers['Retry-After']).toBe('58')
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('says 60 seconds when CoinGecko gives no Retry-After', async () => {
    fetchMock.mockResolvedValueOnce(upstream(429))
    const res = await call(ask(), from('6.6.6.2'))
    expect(res.headers['Retry-After']).toBe('60')
  })

  it('stops calling CoinGecko after a 429 until its Retry-After has passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(Date.parse('2026-10-08T04:30:00Z'))
    fetchMock.mockResolvedValueOnce(upstream(429, {}, { 'Retry-After': '30' }))
    await call(ask(), from('6.6.7.1'))
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 10_000)
    // Another coin and another caller: the breaker is about CoinGecko, not them.
    const held = await call(ask({ id: 'nvidia-xstock', days: '7' }), from('6.6.7.2'))
    expect(held.statusCode).toBe(503)
    expect(held.headers['Retry-After']).toBe('20')
    expect(held.headers['Cache-Control']).toBe('no-store')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    vi.setSystemTime(Date.now() + 20_000)
    expect((await call(ask(), from('6.6.7.3'))).statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('reads a Retry-After given as a date, and bounds it', () => {
    const now = Date.parse('2026-10-08T04:30:00Z')
    expect(retryAfterSeconds(new Date(now + 45_000).toUTCString(), now)).toBe(45)
    expect(retryAfterSeconds('86400', now)).toBe(600)
    expect(retryAfterSeconds('0', now)).toBe(1)
    expect(retryAfterSeconds('soon', now)).toBe(60)
    expect(retryAfterSeconds(null, now)).toBe(60)
  })

  it('holds this instance to CoinGecko’s 30-a-minute demo budget', async () => {
    for (let i = 0; i < 30; i += 1) expect((await call(ask(), from(`6.6.8.${i}`))).statusCode).toBe(200)
    const res = await call(ask(), from('6.6.9.1'))
    expect(res.statusCode).toBe(503)
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
    expect(fetchMock).toHaveBeenCalledTimes(30)
  })

  it('passes a CoinGecko 404 on as an uncached 404 with no Retry-After', async () => {
    fetchMock.mockResolvedValueOnce(upstream(404))
    const res = await call(ask(), from('7.7.7.1'))
    expect(res.statusCode).toBe(404)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(res.headers['Retry-After']).toBeUndefined()
  })

  it('reads any other upstream failure, or none at all, as an uncached 502 with Retry-After', async () => {
    fetchMock.mockResolvedValueOnce(upstream(500))
    const failed = await call(ask(), from('7.7.7.2'))
    expect(failed.statusCode).toBe(502)
    expect(failed.headers['Retry-After']).toBe('60')
    expect(failed.headers['Cache-Control']).toBe('no-store')

    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))
    const unreachable = await call(ask(), from('7.7.7.3'))
    expect(unreachable.statusCode).toBe(502)
    expect(unreachable.headers['Retry-After']).toBe('60')
    expect(unreachable.headers['Cache-Control']).toBe('no-store')
  })

  it('refuses a caller past its own bucket without reaching CoinGecko', async () => {
    for (let i = 0; i < 60; i += 1) await call(ask({ id: 'bitcoin' }), from('8.8.8.8'))
    const res = await call(ask(), from('8.8.8.8'))
    expect(res.statusCode).toBe(429)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
