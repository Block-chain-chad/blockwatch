import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

/*
 * One busy source must not take the gap history down. The Readout showed
 * "The history could not load" for NVDAx whenever CoinGecko refused the
 * history call, although the token's pool and the share history were both
 * there to draw from.
 */
const fetchTokenHistory = vi.fn()
const getTokenCandles = vi.fn()
vi.mock('../services/coingecko', async (importOriginal) => ({ ...(await importOriginal()), fetchTokenHistory }))
vi.mock('../services/candles', () => ({ getTokenCandles }))

const { loadTokenHistory, POOL_TIMEFRAME } = await import('./useChartData')
const { HistoryUnavailable } = await import('../services/coingecko')
const { mergeAssets } = await import('../lib/prices')
const { BY_ID } = await import('../data/universe')

const NOW = Date.parse('2026-09-28T16:00:00Z')
const nvdax = mergeAssets([BY_ID['nvidia-xstock']], {}, {})[0]
const candles = [
  { time: (NOW - 10 * 86_400_000) / 1000, close: 170 }, // outside the 1W window
  { time: (NOW - 2 * 3_600_000) / 1000, close: 180.1 },
  { time: (NOW - 3_600_000) / 1000, close: 180.4 },
]

beforeEach(() => {
  fetchTokenHistory.mockReset()
  getTokenCandles.mockReset()
})

describe('loadTokenHistory', () => {
  it('draws from CoinGecko when it answers, without asking the pool', async () => {
    fetchTokenHistory.mockResolvedValue([{ t: 1, v: 180 }, { t: 2, v: 181 }])
    const out = await loadTokenHistory(nvdax, '1W', NOW)
    expect(out).toEqual({ token: [{ t: 1, v: 180 }, { t: 2, v: 181 }], source: 'coingecko', problem: null })
    expect(getTokenCandles).not.toHaveBeenCalled()
  })

  it('falls back to the pool when CoinGecko is busy, clipped to the range', async () => {
    fetchTokenHistory.mockRejectedValue(new HistoryUnavailable('busy', NOW + 60_000))
    getTokenCandles.mockResolvedValue({ candles })
    const out = await loadTokenHistory(nvdax, '1W', NOW)
    expect(getTokenCandles).toHaveBeenCalledWith(nvdax, POOL_TIMEFRAME['1W'])
    expect(out.source).toBe('pool')
    expect(out.token.map((p) => p.v)).toEqual([180.1, 180.4])
    expect(out.problem).toEqual({ kind: 'busy', retryAt: NOW + 60_000 })
  })

  it('reports the problem when neither source can draw the line', async () => {
    fetchTokenHistory.mockRejectedValue(new HistoryUnavailable('unreachable', NOW + 60_000))
    getTokenCandles.mockResolvedValue(null)
    const out = await loadTokenHistory(nvdax, '1D', NOW)
    expect(out).toEqual({ token: [], source: null, problem: { kind: 'unreachable', retryAt: NOW + 60_000 } })
  })

  it('treats a pool failure like an empty pool', async () => {
    fetchTokenHistory.mockRejectedValue(new HistoryUnavailable('busy', NOW + 60_000))
    getTokenCandles.mockRejectedValue(new Error('candles 429'))
    const out = await loadTokenHistory(nvdax, '1D', NOW)
    expect(out.token).toEqual([])
    expect(out.problem.kind).toBe('busy')
  })

  it('is an empty history, not an error, when both sources answer with nothing', async () => {
    fetchTokenHistory.mockResolvedValue([])
    getTokenCandles.mockResolvedValue(null)
    expect(await loadTokenHistory(nvdax, '1D', NOW)).toEqual({ token: [], source: null, problem: null })
  })

  it('has a pool timeframe for every chart range', async () => {
    const { CHART_RANGES } = await import('./useChartData')
    expect(Object.keys(POOL_TIMEFRAME).sort()).toEqual(Object.keys(CHART_RANGES).sort())
  })
})
