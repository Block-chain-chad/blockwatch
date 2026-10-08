import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// coingecko.js reaches services/apiBase, which reads window.location as it
// loads. This file tests the development transport (PROD is false here);
// coingecko.history.test.js covers production.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})
import { loadPriceCache, fetchTokenMarkets } from './coingecko'
import { TOKEN_PRICE_MAX_AGE_MS } from '../lib/gapCheck'

/*
 * The token price feed's two new duties: every row says when CoinGecko last
 * saw the token trade (lib/gapCheck.js refuses a gap on anything older than a
 * day, or undated), and the reload cache is not allowed to repaint prices of
 * any age.
 */

let store
beforeEach(() => {
  store = {}
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => {
      store[k] = String(v)
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('loadPriceCache', () => {
  it('returns a recent cache', () => {
    store['bw.priceCache.v1'] = JSON.stringify({ at: Date.now() - 60_000, data: { x: { tokenPrice: 1 } } })
    expect(loadPriceCache()?.data.x.tokenPrice).toBe(1)
  })

  it('drops a cache older than a token price may be', () => {
    store['bw.priceCache.v1'] = JSON.stringify({ at: Date.now() - TOKEN_PRICE_MAX_AGE_MS - 1, data: { x: {} } })
    expect(loadPriceCache()).toBeNull()
  })
})

describe('fetchTokenMarkets', () => {
  it("dates each row with CoinGecko's own last_updated, and keeps its price as the reference", async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => [
          { id: 'planet-labs-xstock', current_price: 25.95, last_updated: '2026-06-26T16:57:10.000Z' },
          { id: 'undated', current_price: 1 },
        ],
      })),
    )
    const map = await fetchTokenMarkets(['planet-labs-xstock', 'undated'])
    expect(map['planet-labs-xstock']).toMatchObject({
      tokenPrice: 25.95,
      feedPrice: 25.95,
      feedUpdatedAt: Date.parse('2026-06-26T16:57:10.000Z'),
      priceUpdatedAt: Date.parse('2026-06-26T16:57:10.000Z'),
    })
    expect(map.undated.priceUpdatedAt).toBeNull()
  })
})

/*
 * Token history when CoinGecko refuses. On 2026-09-29 the keyless API
 * answered a burst with 429 and Retry-After 58, and no CORS header, so a
 * browser sees a network error. The Readout's retry used to fire straight
 * back into that limit.
 */
describe('fetchTokenHistory', () => {
  const ok = (prices) => ({ ok: true, status: 200, json: async () => ({ prices }) })
  const status = (code) => ({ ok: false, status: code, json: async () => ({}) })

  beforeEach(async () => {
    const { resetHistoryState } = await import('./coingecko')
    resetHistoryState()
  })

  it('returns the series and serves a repeat from the cache', async () => {
    const { fetchTokenHistory } = await import('./coingecko')
    const fetch = vi.fn(async () => ok([[1, 10], [2, 11]]))
    vi.stubGlobal('fetch', fetch)
    expect(await fetchTokenHistory('nvidia-xstock', 7)).toEqual([{ t: 1, v: 10 }, { t: 2, v: 11 }])
    // Development asks CoinGecko itself, without our gate header (which would
    // make CoinGecko answer a CORS preflight first).
    expect(String(fetch.mock.calls[0][0])).toMatch(/^https:\/\/api\.coingecko\.com\/api\/v3\/coins\/nvidia-xstock\/market_chart/)
    expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('X-Onstock-Client')
    await fetchTokenHistory('nvidia-xstock', 7)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('shares one request between concurrent callers', async () => {
    const { fetchTokenHistory } = await import('./coingecko')
    const fetch = vi.fn(async () => ok([[1, 10], [2, 11]]))
    vi.stubGlobal('fetch', fetch)
    await Promise.all([fetchTokenHistory('nvidia-xstock', 1), fetchTokenHistory('nvidia-xstock', 1)])
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reads a network failure as unreachable and cools down before asking again', async () => {
    const { fetchTokenHistory, HISTORY_COOLDOWN_MS } = await import('./coingecko')
    const fetch = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    vi.stubGlobal('fetch', fetch)
    const before = Date.now()
    const first = await fetchTokenHistory('nvidia-xstock', 7).catch((e) => e)
    expect(first).toMatchObject({ kind: 'unreachable' })
    expect(first.retryAt).toBeGreaterThanOrEqual(before + HISTORY_COOLDOWN_MS)
    // A retry inside the cooldown fails at once and spends nothing.
    const second = await fetchTokenHistory('nvidia-xstock', 30).catch((e) => e)
    expect(second).toMatchObject({ kind: 'busy', retryAt: first.retryAt })
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('reads a 429 as busy', async () => {
    const { fetchTokenHistory } = await import('./coingecko')
    vi.stubGlobal('fetch', vi.fn(async () => status(429)))
    const err = await fetchTokenHistory('nvidia-xstock', 7).catch((e) => e)
    expect(err.kind).toBe('busy')
    expect(err.retryAt).toBeGreaterThan(Date.now())
  })

  it('reads a 404 as missing, with no retry and no cooldown', async () => {
    const { fetchTokenHistory } = await import('./coingecko')
    const fetch = vi.fn(async () => status(404))
    vi.stubGlobal('fetch', fetch)
    const err = await fetchTokenHistory('no-such-coin', 7).catch((e) => e)
    expect(err).toMatchObject({ kind: 'missing', retryAt: null })
    await fetchTokenHistory('no-such-coin', 30).catch(() => {})
    expect(fetch).toHaveBeenCalledTimes(2)
  })
})
