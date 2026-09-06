import { describe, it, expect } from 'vitest'
import {
  TIMEFRAMES,
  DEFAULT_TIMEFRAME_ID,
  timeframeById,
  stockRequestFor,
  candleSeconds,
  networksFor,
  scorePool,
  choosePool,
  normalizeYahooCandles,
  lastClose,
} from './candles'
import { NETWORKS, TIMEFRAME_AGGREGATES } from '../../api/_geckoterminal.js'

/*
 * Two things can go quietly wrong here. A timeframe that GeckoTerminal does
 * not serve would 400 in production only; and the pool chooser, handed the
 * real AAPLx search result, could pick the look-alike token or a pool where
 * AAPLx is the quote leg and chart the wrong thing. Both are tested against
 * copies of the live data.
 */

describe('timeframes', () => {
  it('only names buckets and aggregates GeckoTerminal serves', () => {
    for (const t of TIMEFRAMES) {
      expect(TIMEFRAME_AGGREGATES[t.timeframe]).toContain(t.aggregate)
      expect(t.limit).toBeLessThanOrEqual(1000)
      expect(t.ttlMs).toBeGreaterThan(0)
    }
  })

  it('has unique ids and a default that exists', () => {
    const ids = TIMEFRAMES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(timeframeById(DEFAULT_TIMEFRAME_ID)).not.toBeNull()
    expect(timeframeById('7w')).toBeNull()
  })

  it('caches faster candles for less time', () => {
    expect(timeframeById('5m').ttlMs).toBeLessThan(timeframeById('1h').ttlMs)
    expect(timeframeById('1h').ttlMs).toBeLessThan(timeframeById('1d').ttlMs)
  })

  it('maps onto a Yahoo request only where one exists', () => {
    // Must stay inside api/history.js's INTERVALS / RANGES allowlists.
    expect(stockRequestFor('5m')).toEqual({ interval: '5m', range: '5d' })
    expect(stockRequestFor('1d')).toEqual({ interval: '1d', range: '1y' })
    expect(stockRequestFor('4h')).toBeNull()
    expect(stockRequestFor('nope')).toBeNull()
  })

  it('knows the width of a candle in seconds', () => {
    expect(candleSeconds('1m')).toBe(60)
    expect(candleSeconds('15m')).toBe(900)
    expect(candleSeconds('4h')).toBe(14_400)
    expect(candleSeconds('1d')).toBe(86_400)
    expect(candleSeconds('x')).toBeNull()
  })
})

describe('networksFor', () => {
  it('sends xStocks to solana and Ondo to eth', () => {
    expect(networksFor({ issuer: 'xStocks' })).toEqual(['solana'])
    expect(networksFor({ issuer: 'Ondo' })).toEqual(['eth'])
  })
  it('tries every allowlisted network for anyone else, solana first', () => {
    expect(networksFor({ issuer: 'bStocks' })).toEqual(['solana', 'eth'])
    expect(networksFor(null)).toEqual([...NETWORKS])
  })
})

describe('pool choice', () => {
  const MINT = 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp'
  const p = (name, quoteSymbol, volume24h, baseAddress = MINT) => {
    const baseSymbol = name.split(' / ')[0]
    return { address: name, name, baseSymbol, baseAddress, quoteSymbol, volume24h }
  }
  // Trimmed from the live AAPLx search on 2026-09-05.
  const candidates = [
    p('AAPLx / USDC', 'USDC', 319363),
    p('AAPLx / TREE', 'TREE', 260810),
    p('AAPLx / SOL', 'SOL', 15577),
    p('GOOGLx / AAPLx', 'AAPLx', 12, 'XsCPL9dNWBMvFtTmwcCA5v3xWPSMEBCszbQdiLLq6aN'),
    p('AAPLX / USDC', 'USDC', 999999999, 'GQfQ2avnmJBMttz2D5nyDkQAY9rWLHGvDVq8BMRpxWh4'),
  ]
  const aapl = { ticker: 'AAPLx', issuer: 'xStocks', mint: MINT }

  it('picks the busiest stable-quoted pool of the right token', () => {
    expect(choosePool(candidates, aapl).name).toBe('AAPLx / USDC')
  })

  it('refuses the look-alike even when it reports the most volume', () => {
    expect(scorePool(candidates[4], aapl)).toBe(-Infinity)
    expect(scorePool(candidates[4], { ticker: 'AAPLx' })).toBe(-Infinity) // wrong case, no mint needed
  })

  it('refuses a pool where the ticker is the quote leg', () => {
    expect(scorePool(candidates[3], aapl)).toBe(-Infinity)
  })

  it('refuses a right-symbol pool on the wrong mint when the asset has one', () => {
    const impostor = p('AAPLx / USDC', 'USDC', 5_000_000, 'GQfQ2avnmJBMttz2D5nyDkQAY9rWLHGvDVq8BMRpxWh4')
    expect(scorePool(impostor, aapl)).toBe(-Infinity)
    // Without a mint on the asset there is nothing to check against.
    expect(scorePool(impostor, { ticker: 'AAPLx' })).toBeGreaterThan(0)
  })

  it('prefers a dollar quote over a volatile one at comparable volume', () => {
    const a = p('TSLAx / USDC', 'USDC', 100_000)
    const b = p('TSLAx / SOL', 'SOL', 150_000)
    expect(choosePool([b, a], { ticker: 'TSLAx' })).toBe(a)
    // …but not at any price: a dead USDC pool loses to a live SOL one.
    const dead = p('TSLAx / USDC', 'USDC', 3)
    expect(choosePool([dead, b], { ticker: 'TSLAx' })).toBe(b)
  })

  it('never chooses a pool with no volume', () => {
    expect(choosePool([p('AAPLx / USDC', 'USDC', 0)], aapl)).toBeNull()
  })

  it('is null on junk', () => {
    expect(choosePool([], aapl)).toBeNull()
    expect(choosePool(null, aapl)).toBeNull()
    expect(choosePool(candidates, null)).toBeNull()
    expect(scorePool(null, aapl)).toBe(-Infinity)
  })
})

describe('normalizeYahooCandles', () => {
  const yahoo = {
    chart: {
      result: [
        {
          timestamp: [1788652800, 1788653100, 1788653400, 1788653700],
          indicators: {
            quote: [
              {
                open: [320.1, 320.5, null, 321.0],
                high: [321.0, 321.2, 322.0, 321.5],
                low: [319.9, 320.2, 320.0, 320.7],
                close: [320.5, 320.9, 321.1, 321.2],
                volume: [1000, 2000, 3000, null],
              },
            ],
          },
        },
      ],
    },
  }

  it('zips the parallel arrays into candles and drops holes', () => {
    const rows = normalizeYahooCandles(yahoo)
    expect(rows.map((r) => r.time)).toEqual([1788652800, 1788653100, 1788653700])
    expect(rows[0]).toEqual({ time: 1788652800, open: 320.1, high: 321.0, low: 319.9, close: 320.5, volume: 1000 })
  })

  it('reads a missing volume as zero but a missing price as no candle', () => {
    const rows = normalizeYahooCandles(yahoo)
    expect(rows[2].volume).toBe(0)
    expect(rows.some((r) => r.time === 1788653400)).toBe(false)
  })

  it('survives junk', () => {
    expect(normalizeYahooCandles(null)).toEqual([])
    expect(normalizeYahooCandles({ chart: { result: [] } })).toEqual([])
    expect(normalizeYahooCandles({ chart: { result: [{ timestamp: [1] }] } })).toEqual([])
  })
})

describe('lastClose', () => {
  it('is the final close or null', () => {
    expect(lastClose([{ close: 1 }, { close: 2.5 }])).toBe(2.5)
    expect(lastClose([])).toBeNull()
    expect(lastClose(null)).toBeNull()
    expect(lastClose([{ close: 'x' }])).toBeNull()
  })
})
