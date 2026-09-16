import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// candles.js reaches services/apiBase, which reads window.location as it
// loads, and picks its transport from import.meta.env.PROD. Both have to be
// in place before the import graph resolves.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})
vi.stubEnv('PROD', true)

/*
 * The unit boundary. GeckoTerminal serves pool OHLCV, and a pool trades BASE
 * tokens; one base token is `multiplier` shares. Everything downstream of
 * this service — the candle panel, the price line beside it, the gap — is per
 * share.
 *
 * Measured on mainnet 2026-09-16: the NFLXx pool priced one base token around
 * 757 USD while NFLX itself traded at 76.41, because the issuer set the ratio
 * to 10 after a 10-for-1 split. Before this conversion the candle panel drew
 * 757 beside a 76 readout.
 *
 * netflix-xstock and tesla-xstock are real ids in data/verifiedMints.json,
 * pinned at ratios of 10 and 1. They are used deliberately rather than
 * fixtures, so a regeneration that dropped the ratios fails here too.
 */

const BASE_CANDLES = [
  { time: 1_757_000_000, open: 757.45, high: 762.1, low: 751.0, close: 760.0, volume: 12345 },
  { time: 1_757_000_300, open: 760.0, high: 764.0, low: 758.5, close: 761.2, volume: 999 },
]

const NFLX = {
  id: 'netflix-xstock',
  ticker: 'NFLXx',
  issuer: 'xStocks',
  underlying: 'NFLX',
  mint: 'XsEH7wWfJJu2ZT3UCFeVfALnVA6CP5ur7Ee11KmzVpL',
}
const TSLA = {
  id: 'tesla-xstock',
  ticker: 'TSLAx',
  issuer: 'xStocks',
  underlying: 'TSLA',
  mint: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',
}

/** The two calls getTokenCandles makes in prod: resolve a pool, then OHLCV. */
function mockFetch(asset, candles = BASE_CANDLES) {
  return vi.fn(async (url) => {
    const u = new URL(String(url), 'https://onstock.test')
    if (u.searchParams.get('op') === 'resolve') {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              address: 'PooLaddressBase58xxxxxxxxxxxxxxxxxxxxxxxxx',
              baseSymbol: asset.ticker,
              baseAddress: asset.mint,
              quoteSymbol: 'USDC',
              volume24h: 1_000_000,
            },
          ],
        }),
      }
    }
    return { ok: true, status: 200, json: async () => ({ candles }) }
  })
}

/** A module instance with empty caches — candles.js memoises pools and series
 *  in module-level Maps, and a hit would skip the conversion under test. */
async function freshService(asset, candles) {
  vi.resetModules()
  vi.stubGlobal('fetch', mockFetch(asset, candles))
  return (await import('./candles')).getTokenCandles
}

beforeEach(() => {
  vi.resetModules()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('getTokenCandles — pool candles arrive per share, not per base token', () => {
  it('divides a 10x ratio down so NFLXx candles sit beside a 76 price line', async () => {
    const getTokenCandles = await freshService(NFLX)
    const out = await getTokenCandles(NFLX, '5m')
    expect(out).not.toBeNull()
    expect(out.candles[0].open).toBeCloseTo(75.745, 4)
    expect(out.candles[0].high).toBeCloseTo(76.21, 4)
    expect(out.candles[0].low).toBeCloseTo(75.1, 4)
    expect(out.candles[0].close).toBeCloseTo(76.0, 4)
    expect(out.candles[1].close).toBeCloseTo(76.12, 4)
    // The bug this replaces: 757 on a screen whose readout says 76.
    expect(out.candles[0].open).toBeLessThan(100)
  })

  it('leaves volume in dollars, because dollars do not rescale', async () => {
    const getTokenCandles = await freshService(NFLX)
    const out = await getTokenCandles(NFLX, '5m')
    expect(out.candles[0].volume).toBe(12345)
    expect(out.candles[1].volume).toBe(999)
  })

  it('changes nothing for an asset the issuer left at 1.0', async () => {
    const getTokenCandles = await freshService(TSLA)
    const out = await getTokenCandles(TSLA, '5m')
    expect(out.candles[0].open).toBe(757.45)
    expect(out.candles[0].close).toBe(760.0)
    expect(out.candles[1].close).toBe(761.2)
  })

  it('keeps time and the candle shape untouched', async () => {
    const getTokenCandles = await freshService(NFLX)
    const out = await getTokenCandles(NFLX, '5m')
    expect(out.candles[0].time).toBe(1_757_000_000)
    expect(out.candles).toHaveLength(2)
    expect(out.timeframe).toBe('5m')
  })

  it('still returns null when there are no candles at all', async () => {
    const getTokenCandles = await freshService(NFLX, [])
    expect(await getTokenCandles(NFLX, '5m')).toBeNull()
  })
})
