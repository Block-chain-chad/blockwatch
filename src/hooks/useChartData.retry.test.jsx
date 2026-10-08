// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * Chart history fix brief (2026-10-07), part B: after CoinGecko refuses, the
 * chart asks again by itself once the wait is over. When CoinGecko answers,
 * the line, the gap history and the source switch over without the loading
 * skeleton; a second refusal keeps what is shown. At most two automatic
 * retries per asset and range, none for 'missing', and no timer outlives the
 * chart or its asset and range.
 */

const fetchTokenHistory = vi.fn()
const getTokenCandles = vi.fn()
const getStockHistory = vi.fn()
vi.mock('../services/coingecko', async (importOriginal) => ({ ...(await importOriginal()), fetchTokenHistory }))
vi.mock('../services/candles', () => ({ getTokenCandles }))
vi.mock('../services/stocks', () => ({ getStockHistory }))

const { useChartData, AUTO_RETRY_LIMIT, AUTO_RETRY_SPREAD_MS } = await import('./useChartData')
const { HistoryUnavailable } = await import('../services/coingecko')
const { mergeAssets } = await import('../lib/prices')
const { BY_ID } = await import('../data/universe')

const T0 = Date.parse('2026-10-08T04:30:00Z')
const MIN = 60_000
const asset = {
  ...mergeAssets([BY_ID['circle-internet-group-ondo-tokenized-stock']], {}, {})[0],
  tokenPrice: 80.4,
  stockPrice: 81.3,
  priceUpdatedAt: T0 - MIN,
}

/** CoinGecko's answer for the past day, in token units (CRCLon tracks one share). */
const geckoDay = Array.from({ length: 288 }, (_, i) => [T0 - (287 - i) * 5 * MIN, 80 + i / 1000]).map(([t, v]) => ({ t, v }))
/** A busy pool: 5-minute candles across the whole day. */
const densePool = { candles: geckoDay.map((p) => ({ time: p.t / 1000, close: p.v })) }
/** The CRCLon pool of October 7: five trades, refused by lib/poolCoverage.js. */
const thinPool = {
  candles: ['2026-10-07T08:55:00Z', '2026-10-07T11:00:00Z', '2026-10-07T11:30:00Z', '2026-10-07T11:45:00Z', '2026-10-07T15:25:00Z'].map(
    (iso, i) => ({ time: Date.parse(iso) / 1000, close: 82.55 - i }),
  ),
}

const busy = (after = MIN) => new HistoryUnavailable('busy', Date.now() + after)
/** An answer that takes a second to arrive, as a real one does, so a skeleton would get to render. */
const slowly = (value) => () => new Promise((resolve) => setTimeout(() => resolve(value), 1_000))

let container
let root
let seen

const otherAsset = { ...mergeAssets([BY_ID['nvidia-ondo-tokenized-stock']], {}, {})[0], stockPrice: 180, tokenPrice: 1800, priceUpdatedAt: T0 - MIN }

function Probe({ a = asset, range = '1D', retryKey = 0 }) {
  const chart = useChartData(a, range, retryKey)
  seen.push(chart)
  return null
}

async function mount(props) {
  await act(async () => root.render(<Probe {...props} />))
}
const last = () => seen[seen.length - 1]
const advance = (ms) => act(async () => vi.advanceTimersByTimeAsync(ms))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(T0)
  vi.spyOn(Math, 'random').mockReturnValue(0)
  fetchTokenHistory.mockReset()
  getTokenCandles.mockReset()
  getStockHistory.mockReset().mockResolvedValue([])
  seen = []
  container = document.createElement('div')
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useChartData automatic retry', () => {
  it('switches from the pool line to CoinGecko by itself once retryAt has passed, with no skeleton', async () => {
    fetchTokenHistory.mockRejectedValueOnce(busy()).mockImplementation(slowly(geckoDay))
    getTokenCandles.mockResolvedValue(densePool)
    await mount()
    expect(last()).toMatchObject({ loading: false, error: false, tokenSource: 'pool' })
    const shownSoFar = seen.length

    await advance(MIN - 1)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(2)
    expect(last()).toMatchObject({ loading: false, tokenSource: 'pool' }) // still the pool while CoinGecko answers
    await advance(1_000)
    expect(last()).toMatchObject({ loading: false, error: false, tokenSource: 'coingecko' })
    expect(last().token).toHaveLength(288)
    expect(last().premium.length).toBeGreaterThan(0)
    expect(seen.slice(shownSoFar).some((s) => s.loading)).toBe(false)
  })

  it('draws the line by itself after the busy message, when CoinGecko answers', async () => {
    fetchTokenHistory.mockRejectedValueOnce(busy()).mockImplementation(slowly(geckoDay))
    getTokenCandles.mockResolvedValue(thinPool)
    await mount()
    expect(last()).toMatchObject({ error: true, problem: { kind: 'busy' }, tokenSource: null, premium: [] })
    const shownSoFar = seen.length
    await advance(MIN)
    expect(last()).toMatchObject({ loading: false, error: true })
    await advance(1_000)
    expect(last()).toMatchObject({ error: false, tokenSource: 'coingecko' })
    expect(seen.slice(shownSoFar).some((s) => s.loading)).toBe(false)
  })

  it('keeps what is shown when CoinGecko refuses again, and moves the countdown on', async () => {
    fetchTokenHistory
      .mockRejectedValueOnce(busy())
      .mockImplementationOnce(async () => {
        throw busy(2 * MIN)
      })
      .mockResolvedValue(geckoDay)
    getTokenCandles.mockResolvedValue(thinPool)
    await mount()
    const first = last().problem.retryAt
    await advance(MIN)
    expect(last()).toMatchObject({ error: true, tokenSource: null })
    expect(last().problem.retryAt).toBe(first + 2 * MIN)
    await advance(2 * MIN)
    expect(last()).toMatchObject({ error: false, tokenSource: 'coingecko' })
  })

  it('keeps the pool line when a retry is refused', async () => {
    fetchTokenHistory.mockRejectedValue(busy())
    getTokenCandles.mockResolvedValue(densePool)
    await mount()
    const shown = last()
    await advance(MIN)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(2)
    expect(last().tokenSource).toBe('pool')
    expect(last().token).toBe(shown.token)
  })

  it('stops after two automatic retries', async () => {
    fetchTokenHistory.mockImplementation(async () => {
      throw busy()
    })
    getTokenCandles.mockResolvedValue(thinPool)
    await mount()
    await advance(60 * MIN)
    expect(AUTO_RETRY_LIMIT).toBe(2)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(1 + AUTO_RETRY_LIMIT)
    expect(last()).toMatchObject({ error: true, problem: { kind: 'busy' } })
  })

  it('never retries by itself for missing', async () => {
    fetchTokenHistory.mockRejectedValue(new HistoryUnavailable('missing', null))
    getTokenCandles.mockResolvedValue(null)
    await mount()
    expect(last()).toMatchObject({ error: true, problem: { kind: 'missing' } })
    await advance(60 * MIN)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(1)
  })

  it('waits for retryAt plus the random spread', async () => {
    Math.random.mockReturnValue(1)
    fetchTokenHistory.mockRejectedValueOnce(busy()).mockResolvedValue(geckoDay)
    getTokenCandles.mockResolvedValue(densePool)
    await mount()
    await advance(MIN + AUTO_RETRY_SPREAD_MS - 1)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(1)
    await advance(1)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(2)
  })

  it('clears its timer on unmount', async () => {
    fetchTokenHistory.mockRejectedValue(busy())
    getTokenCandles.mockResolvedValue(densePool)
    await mount()
    act(() => root.unmount())
    root = createRoot(container)
    await advance(60 * MIN)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(1)
  })

  it('clears its timer when the range or the asset changes', async () => {
    fetchTokenHistory.mockImplementation(async () => {
      throw busy()
    })
    getTokenCandles.mockResolvedValue(densePool)
    await mount({ range: '1D' })
    await mount({ range: '1W' })
    await mount({ a: otherAsset, range: '1W' })
    fetchTokenHistory.mockClear()
    await advance(MIN)
    // Only the asset and range now on screen are asked about again.
    expect(fetchTokenHistory.mock.calls).toEqual([['nvidia-ondo-tokenized-stock', 7]])
  })

  it('still asks at once when Try again is pressed, after the automatic retries are spent', async () => {
    fetchTokenHistory.mockImplementation(async () => {
      throw busy()
    })
    getTokenCandles.mockResolvedValue(thinPool)
    await mount({ retryKey: 0 })
    await advance(60 * MIN)
    fetchTokenHistory.mockClear()
    await mount({ retryKey: 1 })
    expect(fetchTokenHistory).toHaveBeenCalledTimes(1)
    await advance(60 * MIN)
    expect(fetchTokenHistory).toHaveBeenCalledTimes(1)
  })
})
