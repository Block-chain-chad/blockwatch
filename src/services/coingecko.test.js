import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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
