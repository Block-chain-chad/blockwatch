import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import candles from './candles.js'
import finnhub from './finnhub.js'
import history from './history.js'
import news from './news.js'
import rates from './rates.js'

/*
 * Every read proxy refuses an Origin it does not serve BEFORE calling its
 * upstream. Vercel caches separately for each Origin value, so without this a
 * script sending a new made-up Origin each time would miss the cache every
 * time and spend the shared upstream quota (security review finding 5).
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

const PROXIES = [
  ['candles', candles, { op: 'resolve', ticker: 'AAPLx', network: 'solana' }],
  ['finnhub', finnhub, { kind: 'quote', symbol: 'AAPL' }],
  ['history', history, { symbol: 'AAPL', interval: '1d', range: '1mo' }],
  ['news', news, { symbol: 'AAPL' }],
  ['rates', rates, {}],
]

let fetchMock
beforeEach(() => {
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({}) }))
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => vi.unstubAllGlobals())

describe('read proxies refuse unknown origins', () => {
  for (const [name, handler, query] of PROXIES) {
    it(`${name}: 403 for a made-up Origin, without calling upstream`, async () => {
      for (const origin of ['https://evil.example', 'null', 'https://onstock.app.evil.example']) {
        const res = fakeRes()
        await handler({ method: 'GET', query, headers: { origin, host: 'onstock.app' } }, res)
        expect(res.statusCode).toBe(403)
        expect(res.body).toEqual({ error: 'forbidden' })
      }
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it(`${name}: lets our own origins and plain same-site requests through the gate`, async () => {
      for (const headers of [{}, { origin: 'https://onstock.app' }, { origin: 'capacitor://localhost' }]) {
        const res = fakeRes()
        await handler({ method: 'GET', query, headers: { host: 'onstock.app', ...headers } }, res)
        expect(res.statusCode).not.toBe(403)
      }
    })
  }
})
