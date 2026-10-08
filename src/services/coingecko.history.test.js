import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Production transport. apiBase reads window.location and the platform as it
// loads, and coingecko.js picks its transport from import.meta.env.PROD, so
// all three are in place before the import graph resolves.
const native = vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
  return { value: false }
})
vi.stubEnv('PROD', true)
vi.mock('../lib/platform', () => ({ isNativeApp: () => native.value }))

/*
 * Chart history fix brief (2026-10-07), part A, client side: in production
 * the browser never asks CoinGecko for market_chart. History comes from our
 * own /api/token-history, and its answers map onto HistoryUnavailable with
 * retryAt taken from the route's Retry-After. Live prices still come from
 * CoinGecko.
 */

const ok = (prices) => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({ prices }) })
const status = (code, retryAfter = null) => ({
  ok: false,
  status: code,
  headers: { get: (k) => (k.toLowerCase() === 'retry-after' ? retryAfter : null) },
  json: async () => ({}),
})

const T0 = Date.parse('2026-10-08T04:30:00Z')

async function load() {
  vi.resetModules()
  return import('./coingecko')
}

beforeEach(() => {
  native.value = false
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(T0)
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('fetchTokenHistory in production', () => {
  it('asks our own route, not CoinGecko, and parses its points', async () => {
    const { fetchTokenHistory } = await load()
    const fetch = vi.fn(async () => ok([[1, 10], [2, 11]]))
    vi.stubGlobal('fetch', fetch)
    expect(await fetchTokenHistory('circle-internet-group-ondo-tokenized-stock', 1)).toEqual([
      { t: 1, v: 10 },
      { t: 2, v: 11 },
    ])
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch.mock.calls[0][0]).toBe('/api/token-history?id=circle-internet-group-ondo-tokenized-stock&days=1')
    // The website says it is the website (api/_clientGate.js).
    expect(fetch.mock.calls[0][1].headers).toEqual({ accept: 'application/json', 'X-Onstock-Client': 'web' })
  })

  it('uses the app’s address and cache lane in the iPhone app', async () => {
    native.value = true
    vi.stubEnv('VITE_API_BASE', 'https://onstock.app')
    try {
      const { fetchTokenHistory } = await load()
      const fetch = vi.fn(async () => ok([[1, 10], [2, 11]]))
      vi.stubGlobal('fetch', fetch)
      await fetchTokenHistory('nvidia-xstock', 7)
      expect(fetch.mock.calls[0][0]).toBe('https://onstock.app/api/token-history?id=nvidia-xstock&days=7&c=app')
      // No custom header in the app: it would cost a CORS preflight, and the
      // app's Origin already passes the gate.
      expect(fetch.mock.calls[0][1].headers).toEqual({ accept: 'application/json' })
    } finally {
      vi.unstubAllEnvs()
      vi.stubEnv('PROD', true)
    }
  })

  it('keeps live prices on CoinGecko', async () => {
    const { fetchTokenMarkets } = await load()
    const fetch = vi.fn(async () => ({ ok: true, status: 200, json: async () => [] }))
    vi.stubGlobal('fetch', fetch)
    await fetchTokenMarkets(['nvidia-xstock'])
    expect(String(fetch.mock.calls[0][0])).toMatch(/^https:\/\/api\.coingecko\.com\/api\/v3\/coins\/markets\?/)
  })

  it.each([429, 503])('reads %i as busy, with retryAt from Retry-After, and holds further calls until then', async (code) => {
    const { fetchTokenHistory } = await load()
    const fetch = vi.fn(async () => status(code, '58'))
    vi.stubGlobal('fetch', fetch)
    const err = await fetchTokenHistory('nvidia-xstock', 1).catch((e) => e)
    expect(err).toMatchObject({ kind: 'busy', retryAt: T0 + 58_000 })
    const again = await fetchTokenHistory('nvidia-xstock', 7).catch((e) => e)
    expect(again).toMatchObject({ kind: 'busy', retryAt: T0 + 58_000 })
    expect(fetch).toHaveBeenCalledTimes(1)
    vi.setSystemTime(T0 + 58_001)
    vi.stubGlobal('fetch', vi.fn(async () => ok([[1, 10], [2, 11]])))
    expect(await fetchTokenHistory('nvidia-xstock', 1)).toHaveLength(2)
  })

  it('reads any other failure as unreachable, retryAt from Retry-After', async () => {
    const { fetchTokenHistory } = await load()
    vi.stubGlobal('fetch', vi.fn(async () => status(502, '60')))
    expect(await fetchTokenHistory('nvidia-xstock', 1).catch((e) => e)).toMatchObject({
      kind: 'unreachable',
      retryAt: T0 + 60_000,
    })
  })

  it('falls back to its own cooldown when a refusal carries no Retry-After', async () => {
    const { fetchTokenHistory, HISTORY_COOLDOWN_MS } = await load()
    vi.stubGlobal('fetch', vi.fn(async () => status(503)))
    const err = await fetchTokenHistory('nvidia-xstock', 1).catch((e) => e)
    expect(err.kind).toBe('busy')
    expect(err.retryAt).toBeGreaterThanOrEqual(T0 + HISTORY_COOLDOWN_MS)
  })

  it('reads a network error as unreachable', async () => {
    const { fetchTokenHistory } = await load()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    const err = await fetchTokenHistory('nvidia-xstock', 1).catch((e) => e)
    expect(err.kind).toBe('unreachable')
    expect(err.retryAt).toBeGreaterThan(T0)
  })

  it('reads 404 as missing, with no retry', async () => {
    const { fetchTokenHistory } = await load()
    vi.stubGlobal('fetch', vi.fn(async () => status(404)))
    expect(await fetchTokenHistory('nvidia-xstock', 1).catch((e) => e)).toMatchObject({ kind: 'missing', retryAt: null })
  })
})
