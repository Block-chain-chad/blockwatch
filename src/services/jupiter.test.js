import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/*
 * getTokenSpread derives bid and ask from two Jupiter QUOTES, and quotes are
 * raw integer amounts — per BASE token. The numbers are printed next to the
 * share price and the gap, which are per SHARE. One base token is `multiplier`
 * shares, so for NFLXx the readout said "Bid $757 · Ask $775" under a $77
 * price until this conversion existed.
 *
 * spreadPct is a ratio of the two and must NOT move: rescaling both sides
 * leaves it alone, and a test says so.
 */

const NFLX_MINT = 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL' // pinned ratio 10
const TSLA_MINT = 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB' // pinned ratio 1
const DECIMALS = 8

/**
 * The three calls getTokenSpread makes: a price lookup for decimals, then a
 * buy quote and a sell quote. Shaped on the real responses.
 *
 * `basePrice` is USD per BASE token; the buy quote is built backwards from it
 * for a $200 reference trade, and the sell quote returns slightly less, which
 * is the spread.
 */
function mockFetch(mint, basePrice, spreadFraction = 0.01) {
  return vi.fn(async (url) => {
    const u = String(url)
    if (u.includes('/price/v3')) {
      return { ok: true, status: 200, json: async () => ({ [mint]: { usdPrice: 1, decimals: DECIMALS } }) }
    }
    const params = new URL(u).searchParams
    const buying = params.get('inputMint') !== mint
    if (buying) {
      const tokens = 200 / basePrice
      return {
        ok: true,
        status: 200,
        json: async () => ({ outAmount: String(Math.round(tokens * 10 ** DECIMALS)) }),
      }
    }
    // Selling those tokens back returns a little less than $200.
    return {
      ok: true,
      status: 200,
      json: async () => ({ outAmount: String(Math.round(200 * (1 - spreadFraction) * 1e6)) }),
    }
  })
}

async function freshSpread(mint, basePrice, spreadFraction) {
  vi.resetModules()
  vi.stubGlobal('fetch', mockFetch(mint, basePrice, spreadFraction))
  const { getTokenSpread } = await import('./jupiter')
  return getTokenSpread(mint)
}

beforeEach(() => vi.resetModules())
afterEach(() => vi.unstubAllGlobals())

describe('getTokenSpread — bid and ask come out per share', () => {
  it('divides a 10x ratio down to share level', async () => {
    // A pool price of 764 per base token is 76.4 per share, which is what
    // NFLX actually traded at when this was measured.
    const s = await freshSpread(NFLX_MINT, 764)
    expect(s).not.toBeNull()
    expect(s.ask).toBeCloseTo(76.4, 2)
    expect(s.bid).toBeCloseTo(75.64, 1)
    expect(s.ask).toBeLessThan(100) // the bug: 764 beside a 76 price
  })

  it('leaves the spread percentage alone, because it is a ratio', async () => {
    const scaled = await freshSpread(NFLX_MINT, 764, 0.01)
    const flat = await freshSpread(TSLA_MINT, 764, 0.01)
    expect(scaled.spreadPct).toBeCloseTo(flat.spreadPct, 6)
    expect(scaled.spreadPct).toBeCloseTo(1, 2)
  })

  it('changes nothing for an asset the issuer left at 1.0', async () => {
    const s = await freshSpread(TSLA_MINT, 366.72)
    expect(s.ask).toBeCloseTo(366.72, 2)
  })

  it('keeps the reference trade size, which is dollars and does not rescale', async () => {
    const s = await freshSpread(NFLX_MINT, 764)
    expect(s.refUsd).toBe(200)
  })

  it('returns null rather than a price in the wrong unit when a leg fails', async () => {
    vi.resetModules()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })))
    const { getTokenSpread } = await import('./jupiter')
    expect(await getTokenSpread(NFLX_MINT)).toBeNull()
  })
})
