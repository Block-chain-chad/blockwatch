import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import handler, { limiters } from './news.js'

/*
 * /api/news relays Google News RSS. Keyless upstream, so the loss from an open
 * proxy is Vercel invocations and a deployment relaying searches for strangers
 * — not a drained quota. But the symbol lane used to accept any
 * /^[A-Z0-9.\-]{1,10}$/i symbol with no limit, and every distinct symbol is a
 * distinct edge-cache key, so the cache-key space and the invocation count
 * were both unbounded.
 *
 * Two things are being defended here. The symbol lane must take only symbols
 * the app can display, in the canonical dotted spelling the client sends (this
 * lane, unlike api/history.js, gets the underlying straight out of
 * universe.json). And a caller past its bucket must 429 before any fetch —
 * which matters more here than elsewhere, because one topic request fans out
 * to six upstream fetches.
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
    send(b) {
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

const FEED = `<?xml version="1.0"?><rss><channel>
  <item><title>Something happened - Reuters</title>
    <link>https://example.test/a</link>
    <pubDate>${new Date().toUTCString()}</pubDate></item>
</channel></rss>`

let fetchMock
beforeEach(() => {
  limiters.perClient.reset()
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, text: async () => FEED }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('api/news — the symbol allowlist', () => {
  it('forwards a symbol the app can actually show news for', async () => {
    const res = await call({ symbol: 'AAPL' }, from('1.1.1.1'))
    expect(res.statusCode).toBe(200)
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(decodeURIComponent(String(fetchMock.mock.calls[0][0]))).toContain('"AAPL" stock')
  })

  it('takes the class share in the spelling the client sends here', async () => {
    // src/services/stocks.js passes the underlying unchanged to this lane, so
    // it is the dotted Finnhub spelling — the opposite of api/history.js.
    const res = await call({ symbol: 'BRK.B' }, from('1.1.1.2'))
    expect(res.statusCode).toBe(200)
    expect(decodeURIComponent(String(fetchMock.mock.calls[0][0]))).toContain('"BRK.B" stock')
  })

  it('refuses an off-universe symbol before spending an upstream call', async () => {
    const res = await call({ symbol: 'ZZZZ' }, from('2.2.2.1'))
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'bad request' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses the whole shape the old pattern waved through', async () => {
    for (const [i, junk] of ['A1', 'X.Y', 'QQQQQQQQQQ', '0', '---', 'aapl'].entries()) {
      expect((await call({ symbol: junk }, from(`3.3.3.${i}`))).statusCode).toBe(400)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leaves the topic lane working, and still refuses an unknown topic', async () => {
    const ok = await call({ topic: 'tokenized' }, from('4.4.4.1'))
    expect(ok.statusCode).toBe(200)
    expect(fetchMock.mock.calls.length).toBe(6) // the fan-out, unchanged
    const bad = await call({ topic: 'anything-else' }, from('4.4.4.2'))
    expect(bad.statusCode).toBe(400)
    expect(fetchMock.mock.calls.length).toBe(6)
  })
})

describe('api/news — per-caller rate limit', () => {
  it('does not refuse a person opening asset after asset', async () => {
    for (let i = 0; i < 30; i += 1) {
      expect((await call({ symbol: 'AAPL' }, from('5.5.5.5'))).statusCode).toBe(200)
    }
  })

  it('stops a caller that keeps going, without reaching upstream', async () => {
    for (let i = 0; i < 30; i += 1) await call({ symbol: 'AAPL' }, from('6.6.6.6'))
    const spent = fetchMock.mock.calls.length
    const res = await call({ symbol: 'AAPL' }, from('6.6.6.6'))
    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'too many requests' })
    expect(fetchMock.mock.calls.length).toBe(spent)
  })

  it('bounds the six-way topic fan-out too, which is the expensive lane', async () => {
    for (let i = 0; i < 30; i += 1) await call({ topic: 'tokenized' }, from('7.7.7.7'))
    const spent = fetchMock.mock.calls.length
    expect(spent).toBe(180) // 30 requests x 6 queries, and not one more
    const res = await call({ topic: 'tokenized' }, from('7.7.7.7'))
    expect(res.statusCode).toBe(429)
    expect(fetchMock.mock.calls.length).toBe(180)
  })

  it('never lets the CDN cache one caller rejection for everyone', async () => {
    for (let i = 0; i < 30; i += 1) await call({ symbol: 'AAPL' }, from('8.8.8.1'))
    const res = await call({ symbol: 'AAPL' }, from('8.8.8.1'))
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(Number(res.headers['Retry-After'])).toBeGreaterThan(0)
  })

  it('does not punish a second visitor for the first one', async () => {
    for (let i = 0; i < 31; i += 1) await call({ symbol: 'AAPL' }, from('8.8.8.8'))
    expect((await call({ symbol: 'AAPL' }, from('9.9.9.9'))).statusCode).toBe(200)
  })

  it('charges junk requests too, so a bad-symbol loop is not free', async () => {
    for (let i = 0; i < 30; i += 1) await call({ symbol: 'ZZZZ' }, from('1.2.3.4'))
    expect((await call({ symbol: 'AAPL' }, from('1.2.3.4'))).statusCode).toBe(429)
  })

  it('refills at one every two seconds, so a stopped caller is not locked out', async () => {
    const t0 = Date.now()
    for (let i = 0; i < 30; i += 1) expect(limiters.perClient.take('x', t0).ok).toBe(true)
    expect(limiters.perClient.take('x', t0).ok).toBe(false)
    expect(limiters.perClient.take('x', t0 + 1_000).ok).toBe(false)
    expect(limiters.perClient.take('x', t0 + 2_000).ok).toBe(true)
  })

  it('does not charge a CORS preflight', async () => {
    for (let i = 0; i < 100; i += 1) {
      const res = fakeRes()
      await handler({ method: 'OPTIONS', query: {}, headers: { ...WEB, ...from('5.4.3.2') } }, res)
      expect(res.statusCode).toBe(204)
    }
    expect((await call({ symbol: 'AAPL' }, from('5.4.3.2'))).statusCode).toBe(200)
  })
})
