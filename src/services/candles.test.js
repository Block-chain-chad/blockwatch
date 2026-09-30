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
              sig: 'signed-by-the-proxy',
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

describe('getTokenCandles — the pool signature', () => {
  it('passes back the signature the proxy gave the pool, or the proxy refuses the pool', async () => {
    const getTokenCandles = await freshService(NFLX)
    await getTokenCandles(NFLX, '5m')
    const ohlcv = globalThis.fetch.mock.calls
      .map(([url]) => new URL(String(url), 'https://onstock.test'))
      .find((u) => u.searchParams.get('op') === 'ohlcv')
    expect(ohlcv.searchParams.get('sig')).toBe('signed-by-the-proxy')
  })
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

/*
 * An unverified Solana mint. Every one of the 103 is pinned today, so this
 * path cannot fire in production — it fires when a universe rebuild adds a
 * mint before verify-mints runs again, or when verification rejects one.
 * Drawing those candles at an assumed ratio of 1.0 is how a ratio-10 mint
 * ends up plotted at 757 under a $76 share.
 */
describe('getTokenCandles — an unpinned mint draws nothing', () => {
  const UNPINNED = {
    id: 'not-verified-xstock',
    ticker: 'FAKEx',
    issuer: 'xStocks',
    underlying: 'FAKE',
    mint: 'UnverifiedMintAddress11111111111111111111111',
  }

  it('returns null rather than assuming one token is one share', async () => {
    const getTokenCandles = await freshService(UNPINNED)
    expect(await getTokenCandles(UNPINNED, '5m')).toBeNull()
  })

})

/*
 * Ondo. An Ondo token tracks sValue shares, pinned from Ondo's own oracle in
 * data/verifiedOndo.json: NFLXon is 10 after Netflix's 10-for-1 split, which
 * is why its pool printed around 711 beside a 71 share and the chart drew
 * candles from 700 to 2,000. The ids below are real pins; the pool prices are
 * fixtures.
 */
describe('getTokenCandles: Ondo pools, per share', () => {
  it("divides NFLXon's pool candles by its pinned sValue of 10", async () => {
    const NFLXON = { id: 'netflix-ondo-tokenized-stock', ticker: 'NFLXon', issuer: 'Ondo', underlying: 'NFLX' }
    const getTokenCandles = await freshService(NFLXON)
    const out = await getTokenCandles(NFLXON, '5m')
    expect(out.candles[0].open).toBeCloseTo(75.745, 4)
    expect(out.candles[0].close).toBeCloseTo(76.0, 4)
  })

  it('applies a dividend-sized sValue too', async () => {
    const NVDAON = { id: 'nvidia-ondo-tokenized-stock', ticker: 'NVDAon', issuer: 'Ondo', underlying: 'NVDA' }
    const getTokenCandles = await freshService(NVDAON)
    const out = await getTokenCandles(NVDAON, '5m')
    expect(out.candles[0].open).toBeCloseTo(757.45 / 1.000932054247057, 6)
  })

  it('refuses an Ondo token with no verified sValue, and any other issuer', async () => {
    const UNPINNED = { id: 'not-pinned-ondo', ticker: 'XYZon', issuer: 'Ondo', underlying: 'XYZ' }
    expect(await (await freshService(UNPINNED))(UNPINNED, '5m')).toBeNull()
    const BSTOCK = { id: 'some-bstock', ticker: 'XYZb', issuer: 'bStocks', underlying: 'XYZ' }
    expect(await (await freshService(BSTOCK))(BSTOCK, '5m')).toBeNull()
  })
})

/*
 * One pool lookup, shared. Key statistics asks resolvePool for the pool's
 * liquidity; the candle chart asks it for the pool to draw. Opening both, in
 * either order or at the same moment, must be one call to the resolve lane,
 * which spends the shared GeckoTerminal budget on an edge-cache miss.
 */
describe('resolvePool: shared with the candle chart, and carries asOf', () => {
  const AS_OF = '2026-09-24T14:05:00.000Z'

  function countingService(asset, resolveBody) {
    const fetchMock = vi.fn(async (url) => {
      const u = new URL(String(url), 'https://onstock.test')
      if (u.searchParams.get('op') === 'resolve') {
        return { ok: true, status: 200, json: async () => resolveBody }
      }
      return { ok: true, status: 200, json: async () => ({ candles: BASE_CANDLES }) }
    })
    vi.stubGlobal('fetch', fetchMock)
    const resolveCalls = () =>
      fetchMock.mock.calls.filter(([url]) => new URL(String(url), 'https://onstock.test').searchParams.get('op') === 'resolve')
        .length
    return { resolveCalls }
  }

  const body = (asset, extra = {}) => ({
    candidates: [
      {
        address: 'PooLaddressBase58xxxxxxxxxxxxxxxxxxxxxxxxx',
        name: `${asset.ticker} / USDC`,
        baseSymbol: asset.ticker,
        baseAddress: asset.mint,
        quoteSymbol: 'USDC',
        volume24h: 1_000_000,
        liquidityUsd: 2_500_000,
      },
    ],
    asOf: AS_OF,
    ...extra,
  })

  it('makes one resolve call when Key statistics and the chart ask at the same moment', async () => {
    const { resolveCalls } = countingService(TSLA, body(TSLA))
    const { resolvePool, getTokenCandles } = await import('./candles')
    const [resolved, candles] = await Promise.all([resolvePool(TSLA), getTokenCandles(TSLA, '5m')])
    expect(resolved.pool.liquidityUsd).toBe(2_500_000)
    expect(candles).not.toBeNull()
    expect(resolveCalls()).toBe(1)
  })

  it('makes one resolve call when the chart opens after Key statistics, and the other way round', async () => {
    const { resolveCalls } = countingService(TSLA, body(TSLA))
    const { resolvePool, getTokenCandles } = await import('./candles')
    await resolvePool(TSLA)
    await getTokenCandles(TSLA, '5m')
    await resolvePool(TSLA)
    expect(resolveCalls()).toBe(1)
  })

  it('passes the time the proxy stamped through to the caller', async () => {
    countingService(TSLA, body(TSLA))
    const { resolvePool } = await import('./candles')
    expect((await resolvePool(TSLA)).asOf).toBe(AS_OF)
  })

  it('gives asOf as null for a cached answer from before the proxy sent it', async () => {
    countingService(TSLA, body(TSLA, { asOf: undefined }))
    const { resolvePool } = await import('./candles')
    expect((await resolvePool(TSLA)).asOf).toBeNull()
  })

  it('gives asOf as null when the stamp is not a time', async () => {
    countingService(TSLA, body(TSLA, { asOf: 'yesterday-ish' }))
    const { resolvePool } = await import('./candles')
    expect((await resolvePool(TSLA)).asOf).toBeNull()
  })
})
