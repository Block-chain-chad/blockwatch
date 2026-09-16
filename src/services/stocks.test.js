import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// stocks.js picks its quote provider at module load from import.meta.env.PROD,
// and reaches services/apiBase, which reads window.location as it loads. Both
// have to be in place before the import graph resolves — hence vi.hoisted
// rather than a beforeEach.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})
vi.stubEnv('PROD', true)

const { getStockPrices } = await import('./stocks')

/*
 * Round-1 finding 10: a 429 from the quote proxy rendered as a blank share
 * price rather than a retry.
 *
 * A refusal and a dead symbol used to be the same thing to this function —
 * both simply went missing from the batch. They are not the same thing. A
 * refusal says nothing about the symbol; it says the caller's bucket, or the
 * instance's, is empty for a second. Reported as "no quote" it costs the user
 * a whole rotation of blank cells, which is three minutes on a wide Board.
 *
 * These cases are about telling the caller which is which.
 */

const QUOTE = { c: 218.29, pc: 216.1, o: 217, h: 219, l: 216, t: 1_700_000_000 }

const ok = () => ({ ok: true, status: 200, json: async () => QUOTE })
const status = (code) => ({ ok: false, status: code, json: async () => ({}) })

/** Answer per ticker, matched out of the request URL. */
function router(bySymbol) {
  return vi.fn(async (url) => {
    const symbol = new URL(String(url), 'https://onstock.test').searchParams.get('symbol')
    const answer = bySymbol[symbol] ?? ok()
    return typeof answer === 'function' ? answer() : answer
  })
}

beforeEach(() => {
  vi.stubGlobal('fetch', router({}))
})
afterEach(() => vi.unstubAllGlobals())

describe('getStockPrices — telling a refusal from a dead symbol', () => {
  it('returns the quotes it got and nothing refused on a clean run', async () => {
    const { quotes, rateLimited } = await getStockPrices(['AAPL', 'NVDA'])
    expect(Object.keys(quotes).sort()).toEqual(['AAPL', 'NVDA'])
    expect(quotes.AAPL.price).toBe(218.29)
    expect(rateLimited).toEqual([])
  })

  it('names the refused ticker instead of silently dropping it', async () => {
    vi.stubGlobal('fetch', router({ NVDA: status(429) }))
    const { quotes, rateLimited } = await getStockPrices(['AAPL', 'NVDA'], 5)
    expect(Object.keys(quotes)).toEqual(['AAPL'])
    expect(rateLimited).toContain('NVDA')
  })

  it('does not call an ordinary upstream failure a refusal', async () => {
    // A 500 or a 404 is about the symbol or the provider, not about our pace.
    // Retrying it first, every cycle, would be a hot loop on a dead symbol.
    vi.stubGlobal('fetch', router({ NVDA: status(500), TSLA: status(404) }))
    const { quotes, rateLimited } = await getStockPrices(['AAPL', 'NVDA', 'TSLA'], 5)
    expect(Object.keys(quotes)).toEqual(['AAPL'])
    expect(rateLimited).toEqual([])
  })

  it('stops sending once refused, and reports what it never asked', async () => {
    // Pushing the remaining batches into an empty bucket only deepens the
    // deficit. They are unanswered either way, so they are worth asking again.
    const fetchMock = router({ B: status(429) })
    vi.stubGlobal('fetch', fetchMock)
    const { rateLimited } = await getStockPrices(['A', 'B', 'C', 'D', 'E', 'F'], 2)
    expect(fetchMock.mock.calls.length).toBe(2) // the first batch only
    expect(rateLimited).toEqual(['B', 'C', 'D', 'E', 'F'])
  })

  it('does not throw when the whole cycle was refused', async () => {
    // Throwing is the caller's signal to keep its cache and wait. A refusal is
    // the opposite signal: ask again shortly. On a cold board the difference
    // is three minutes of blank share prices.
    vi.stubGlobal('fetch', router({ AAPL: status(429), NVDA: status(429) }))
    const { quotes, rateLimited } = await getStockPrices(['AAPL', 'NVDA'], 5)
    expect(quotes).toEqual({})
    expect(rateLimited).toEqual(['AAPL', 'NVDA'])
  })

  it('still throws when every quote failed for an ordinary reason', async () => {
    vi.stubGlobal('fetch', router({ AAPL: status(500), NVDA: status(500) }))
    await expect(getStockPrices(['AAPL', 'NVDA'], 5)).rejects.toThrow('all quotes failed')
  })

  it('treats a thrown network error as ordinary, not as a refusal', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network down')
      })
    )
    await expect(getStockPrices(['AAPL'], 5)).rejects.toThrow('all quotes failed')
  })
})
