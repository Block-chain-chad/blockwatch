import { describe, it, expect } from 'vitest'
import {
  splitPoolName,
  parseSearchPools,
  matchingPools,
  pickPool,
  normalizeOhlcv,
  ohlcvMeta,
  searchPath,
  ohlcvPath,
  POOL_ADDRESS,
} from './_geckoterminal.js'

/*
 * The search endpoint answers a substring query, not a token lookup: the live
 * AAPLx result set (2026-09-05) contained pools where AAPLx was the quote leg,
 * an "AAPLX" look-alike on a different mint, and pools with $0 of volume. The
 * failure that matters is choosing one of those and drawing a chart of the
 * wrong thing in the same confident type as the right one.
 *
 * Fixtures below are trimmed copies of the live payloads.
 */

const pool = (name, address, h24, baseId, extra = {}) => ({
  id: `solana_${address}`,
  type: 'pool',
  attributes: {
    address,
    name,
    volume_usd: { h24: String(h24) },
    reserve_in_usd: '1000',
    ...extra,
  },
  relationships: {
    base_token: { data: { id: baseId, type: 'token' } },
    quote_token: { data: { id: 'solana_EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', type: 'token' } },
    dex: { data: { id: 'byreal', type: 'dex' } },
  },
})

const AAPL_MINT = 'solana_XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp'
const search = {
  data: [
    pool('AAPLx / USDC', 'EHdow7Yhmr1ac8Qff9Co1LhSosr38puA6zLd4cbJLdpV', 319363.87, AAPL_MINT),
    pool('AAPLx / TREE', 'DUv5LL9s1WPQQMeUqwdukuwScmM1i6PMx7t1GgMgyscG', 260810.96, AAPL_MINT),
    pool('AAPLx / SOL', '5VgwxAPD37EHPqtW6v6gWq2bznPDqvpaGDuJoyGm6aJG', 15577.43, AAPL_MINT),
    // The ticker on the QUOTE side — a GOOGLx chart, not an AAPLx one.
    pool('GOOGLx / AAPLx', '9Sc5xGG86f62aVRvhhtyVbS7xSQT6MEiqDEgYTGguk5H', 12.43, 'solana_XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN'),
    // Same letters, different case, different mint, absurd reserve.
    pool('AAPLX / USDC', 'F88VS931dMmFurgd1f7A6oF4ethPKvjZP7iep8dNxNVu', 999999999, 'solana_GQfQ2avnmJBMttz2D5nyDkQAY9rWLHGvDVq8BMRpxWh4'),
  ],
}

describe('splitPoolName', () => {
  it('splits base and quote', () => {
    expect(splitPoolName('AAPLx / USDC')).toEqual({ base: 'AAPLx', quote: 'USDC' })
  })
  it('drops a Uniswap fee tier from the quote leg', () => {
    expect(splitPoolName('NVDAon / USDC 0.9%')).toEqual({ base: 'NVDAon', quote: 'USDC' })
    expect(splitPoolName('NVDAon / WETH 0.01%')).toEqual({ base: 'NVDAon', quote: 'WETH' })
  })
  it('survives junk', () => {
    expect(splitPoolName(null)).toEqual({ base: '', quote: '' })
    expect(splitPoolName('lonely')).toEqual({ base: 'lonely', quote: '' })
  })
})

describe('parseSearchPools', () => {
  it('flattens the pool list to derived fields only', () => {
    const [first] = parseSearchPools(search)
    expect(first).toEqual({
      address: 'EHdow7Yhmr1ac8Qff9Co1LhSosr38puA6zLd4cbJLdpV',
      name: 'AAPLx / USDC',
      baseSymbol: 'AAPLx',
      baseAddress: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
      quoteSymbol: 'USDC',
      quoteAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      volume24h: 319363.87,
      liquidityUsd: 1000,
      dex: 'byreal',
    })
    expect(parseSearchPools(search)).toHaveLength(5)
  })

  it('reads eth token ids too', () => {
    const eth = {
      data: [
        {
          attributes: { address: '0xff14', name: 'NVDAon / USDC 0.9%', volume_usd: { h24: '118708.7' } },
          relationships: { base_token: { data: { id: 'eth_0x2d1f7226bd1f780af6b9a49dcc0ae00e8df4bdee' } } },
        },
      ],
    }
    const [p] = parseSearchPools(eth)
    expect(p.baseAddress).toBe('0x2d1f7226bd1f780af6b9a49dcc0ae00e8df4bdee')
    expect(p.quoteSymbol).toBe('USDC')
    expect(p.liquidityUsd).toBe(0)
    expect(p.dex).toBeNull()
  })

  it('skips rows without an address and survives junk', () => {
    expect(parseSearchPools({ data: [{ attributes: { name: 'x / y' } }] })).toEqual([])
    expect(parseSearchPools(null)).toEqual([])
    expect(parseSearchPools({ data: 'nope' })).toEqual([])
    expect(parseSearchPools({})).toEqual([])
  })

  it('treats a non-numeric volume as zero, not NaN', () => {
    const p = parseSearchPools({ data: [pool('A / B', 'addr', 'n/a', 'solana_x')] })[0]
    expect(p.volume24h).toBe(0)
  })
})

describe('matchingPools / pickPool', () => {
  const pools = parseSearchPools(search)

  it('keeps only pools where the ticker is the base token, busiest first', () => {
    const names = matchingPools(pools, 'AAPLx').map((p) => p.name)
    expect(names).toEqual(['AAPLx / USDC', 'AAPLx / TREE', 'AAPLx / SOL'])
  })

  it('is case-sensitive: AAPLX is a different token', () => {
    expect(matchingPools(pools, 'AAPLX').map((p) => p.name)).toEqual(['AAPLX / USDC'])
    expect(pickPool(pools, 'AAPLx').name).toBe('AAPLx / USDC')
  })

  it('never returns a pool where the ticker is the quote leg', () => {
    expect(matchingPools(pools, 'AAPLx').some((p) => p.name === 'GOOGLx / AAPLx')).toBe(false)
  })

  it('is null when nothing matches', () => {
    expect(pickPool(pools, 'TSLAx')).toBeNull()
    expect(pickPool(pools, '')).toBeNull()
    expect(pickPool([], 'AAPLx')).toBeNull()
  })
})

describe('normalizeOhlcv', () => {
  // Live shape: newest first, [unix_seconds, open, high, low, close, volume].
  const ohlcv = {
    data: {
      attributes: {
        ohlcv_list: [
          [1788653100, 320.765, 322.561, 320.765, 321.987, 344.376],
          [1788652800, 320.946, 322.166, 320.548, 320.765, 903.977],
          [1788652500, 321.114, 321.114, 320.346, 320.946, 407.635],
        ],
      },
    },
    meta: {
      base: { name: 'Apple xStock', symbol: 'AAPLx', address: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp' },
      quote: { name: 'USD Coin', symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    },
  }

  it('reverses to ascending time and names the legs', () => {
    const rows = normalizeOhlcv(ohlcv)
    expect(rows.map((r) => r.time)).toEqual([1788652500, 1788652800, 1788653100])
    expect(rows[2]).toEqual({
      time: 1788653100,
      open: 320.765,
      high: 322.561,
      low: 320.765,
      close: 321.987,
      volume: 344.376,
    })
  })

  it('drops rows with a missing price leg rather than zero-filling', () => {
    const holey = {
      data: {
        attributes: {
          ohlcv_list: [
            [1788653100, 320, 322, null, 321, 5],
            [1788652800, 320, 322, 319, 321, 5],
            [1788652500, 320, 'x', 319, 321, 5],
            'not a row',
            [1788652200, 320, 322, 319, 321],
          ],
        },
      },
    }
    expect(normalizeOhlcv(holey).map((r) => r.time)).toEqual([1788652800])
  })

  it('keeps a zero-volume candle (a quiet bucket is still a candle)', () => {
    const quiet = { data: { attributes: { ohlcv_list: [[1788652800, 1, 1, 1, 1, 0]] } } }
    expect(normalizeOhlcv(quiet)).toEqual([{ time: 1788652800, open: 1, high: 1, low: 1, close: 1, volume: 0 }])
    const noVol = { data: { attributes: { ohlcv_list: [[1788652800, 1, 1, 1, 1, null]] } } }
    expect(normalizeOhlcv(noVol)[0].volume).toBe(0)
  })

  it('keeps the later row for a duplicated timestamp', () => {
    const dup = {
      data: { attributes: { ohlcv_list: [[10, 1, 1, 1, 2, 1], [10, 1, 1, 1, 9, 1]] } },
    }
    const rows = normalizeOhlcv(dup)
    expect(rows).toHaveLength(1)
    expect(rows[0].close).toBe(9)
  })

  it('survives junk', () => {
    expect(normalizeOhlcv(null)).toEqual([])
    expect(normalizeOhlcv({})).toEqual([])
    expect(normalizeOhlcv({ data: { attributes: { ohlcv_list: 'no' } } })).toEqual([])
  })

  it('reports which tokens the candles price', () => {
    expect(ohlcvMeta(ohlcv)).toEqual({
      base: { symbol: 'AAPLx', address: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp' },
      quote: { symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    })
    expect(ohlcvMeta({})).toEqual({ base: { symbol: null, address: null }, quote: { symbol: null, address: null } })
  })
})

describe('paths and address shapes', () => {
  it('builds the documented search and ohlcv paths', () => {
    expect(searchPath('AAPLx', 'solana')).toBe('/search/pools?query=AAPLx&network=solana')
    expect(ohlcvPath('solana', 'EHdow', 'minute', 5, 300)).toBe(
      '/networks/solana/pools/EHdow/ohlcv/minute?aggregate=5&limit=300'
    )
  })

  it('url-encodes anything odd rather than relaying it', () => {
    expect(searchPath('a b&c=d', 'solana')).toBe('/search/pools?query=a%20b%26c%3Dd&network=solana')
  })

  it('recognises solana base58 and both eth pool id widths', () => {
    expect(POOL_ADDRESS.solana.test('EHdow7Yhmr1ac8Qff9Co1LhSosr38puA6zLd4cbJLdpV')).toBe(true)
    expect(POOL_ADDRESS.solana.test('0xff145fd4d52ebd0e758393740aea7eb6228569285b348176c1cdfc5363793b72')).toBe(false)
    expect(POOL_ADDRESS.solana.test('EHdow7Yhmr1ac8Qff9Co1LhSosr38puA6zLd4cbJLdp0')).toBe(false) // 0 is not base58
    expect(POOL_ADDRESS.eth.test('0xf5294094bce435bfbd0ec488be5c462aaf32bc7a')).toBe(true)
    expect(POOL_ADDRESS.eth.test('0xff145fd4d52ebd0e758393740aea7eb6228569285b348176c1cdfc5363793b72')).toBe(true)
    expect(POOL_ADDRESS.eth.test('0xf5294094bce435bfbd0ec488be5c462aaf32bc7')).toBe(false)
    expect(POOL_ADDRESS.eth.test('../../etc/passwd')).toBe(false)
  })
})
