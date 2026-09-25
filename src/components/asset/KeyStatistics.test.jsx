// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * The Pool size row. It appears only when there is a figure and a time
 * for it, and the pool is looked up once per asset while the screen is open:
 * not before Key statistics is opened, not again when it is closed and
 * reopened, and not on every price tick.
 */

const resolvePool = vi.fn()
vi.mock('../../services/candles', () => ({ resolvePool: (...args) => resolvePool(...args) }))

const { default: KeyStatistics } = await import('./KeyStatistics')

const AS_OF = '2026-09-24T14:05:00.000Z'
// Real ids and pinned mints from data/verifiedMints.json: the row only vouches
// for a pool whose base token is the verified address.
const APPLE_MINT = 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp'
const TESLA_MINT = 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB'
const ASSET = {
  id: 'apple-xstock',
  ticker: 'AAPLx',
  issuer: 'xStocks',
  underlying: 'AAPL',
  mint: APPLE_MINT,
  tokenStats: { supply: 1000 },
}
const OTHER = { ...ASSET, id: 'tesla-xstock', ticker: 'TSLAx', underlying: 'TSLA', mint: TESLA_MINT }
const found = (pool = {}, asOf = AS_OF) => ({
  network: 'solana',
  pool: { address: 'x', name: 'AAPLx / USDC', baseAddress: APPLE_MINT, liquidityUsd: 2_500_000, ...pool },
  asOf,
})
const foundTesla = (pool = {}) =>
  found({ name: 'TSLAx / USDC', baseAddress: TESLA_MINT, liquidityUsd: 900_000, ...pool })

let container
let root

async function render(props = {}) {
  await act(async () => {
    root.render(
      <KeyStatistics
        asset={ASSET}
        info={{}}
        spread={null}
        hasTokenStats
        hasStockStats={false}
        bothSides={false}
        open
        {...props}
      />,
    )
  })
}

const text = () => container.textContent

beforeEach(() => {
  resolvePool.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

describe('KeyStatistics pool liquidity', () => {
  it('shows the charted pool, its liquidity and when it was measured', async () => {
    resolvePool.mockResolvedValue(found())
    await render()
    expect(text()).toContain('Pool size (one pool)')
    expect(text()).toContain(
      "Not how much you can trade: larger trades move the price more, and other pools and exchanges aren't included.",
    )
    expect(text()).toContain('$2.5m')
    expect(text()).toContain('AAPLx / USDC pool, as of Sep 24,')
  })

  it('shows no row when the pool has no reserve figure', async () => {
    resolvePool.mockResolvedValue(found({ liquidityUsd: null }))
    await render()
    expect(text()).not.toContain('Pool size')
    expect(text()).not.toContain('$0')
  })

  it('shows no row when the figure has no time', async () => {
    resolvePool.mockResolvedValue(found({}, null))
    await render()
    expect(text()).not.toContain('Pool size')
  })

  it('shows no row when there is no pool', async () => {
    resolvePool.mockResolvedValue(null)
    await render()
    expect(text()).not.toContain('Pool size')
  })

  it('does not look the pool up until Key statistics is opened', async () => {
    resolvePool.mockResolvedValue(found())
    await render({ open: false })
    expect(resolvePool).not.toHaveBeenCalled()
    await render({ open: true })
    expect(resolvePool).toHaveBeenCalledTimes(1)
  })

  it('looks up once per asset, across closing, reopening and price ticks', async () => {
    resolvePool.mockResolvedValue(found())
    await render({ open: true })
    await render({ open: false })
    await render({ open: true })
    // A price tick hands in a new asset object for the same asset.
    await render({ open: true, asset: { ...ASSET, tokenPrice: 201 } })
    expect(resolvePool).toHaveBeenCalledTimes(1)
    expect(text()).toContain('$2.5m')
  })

  it('looks up again for a different asset, and never shows the previous one', async () => {
    let finish
    resolvePool.mockResolvedValueOnce(found())
    resolvePool.mockReturnValueOnce(new Promise((r) => (finish = r)))
    await render()
    expect(text()).toContain('$2.5m')
    await render({ asset: OTHER })
    expect(resolvePool).toHaveBeenCalledTimes(2)
    expect(text()).not.toContain('Pool size')
    await act(async () => finish(foundTesla()))
    expect(text()).toContain('$900k')
  })

  it('ignores a slow answer for the asset the screen has already left', async () => {
    let finishFirst
    resolvePool.mockReturnValueOnce(new Promise((r) => (finishFirst = r)))
    resolvePool.mockResolvedValueOnce(foundTesla())
    await render()
    await render({ asset: OTHER })
    expect(text()).toContain('$900k')
    await act(async () => finishFirst(found()))
    expect(text()).toContain('$900k')
    expect(text()).not.toContain('$2.5m')
  })

  it('shows no row for a pool trading a different token than the verified one', async () => {
    resolvePool.mockResolvedValue(found({ baseAddress: TESLA_MINT }))
    await render()
    expect(text()).not.toContain('Pool size')
  })

  it('drops the fee tier from the pool name', async () => {
    resolvePool.mockResolvedValue(found({ name: 'AAPLx / USDC 0.51%' }))
    await render()
    expect(text()).toContain('AAPLx / USDC pool, as of')
    expect(text()).not.toContain('0.51%')
  })

  it('says the figure may be out of date when it is more than a day old', async () => {
    resolvePool.mockResolvedValue(found({}, new Date(Date.now() - 25 * 60 * 60_000).toISOString()))
    await render()
    expect(text()).toContain('may be out of date')
  })

  it('does not say so when the figure is fresh', async () => {
    resolvePool.mockResolvedValue(found({}, new Date(Date.now() - 60_000).toISOString()))
    await render()
    expect(text()).toContain('Pool size')
    expect(text()).not.toContain('out of date')
  })

  it('does not look up an asset with no pinned address', async () => {
    await render({ asset: { ...ASSET, id: 'wrapped-apple-xstock', ticker: 'WAAPLx', mint: undefined } })
    await render({ asset: { ...ASSET, id: 'nvidia-ondo-tokenized-stock', ticker: 'NVDAon', issuer: 'Ondo', mint: undefined } })
    expect(resolvePool).not.toHaveBeenCalled()
  })

  it('does not look up for an issuer whose chain is not known', async () => {
    await render({ asset: { ...ASSET, issuer: 'Other' } })
    expect(resolvePool).not.toHaveBeenCalled()
  })

  it('does not look up when the asset has no token statistics', async () => {
    await render({ hasTokenStats: false, hasStockStats: true })
    expect(resolvePool).not.toHaveBeenCalled()
  })
})

describe('KeyStatistics bid/ask spread', () => {
  it('says the spread comes from a test quote of a stated size', async () => {
    resolvePool.mockResolvedValue(null)
    await render({ spread: { spreadPct: 0.4321, refUsd: 200, bid: 1, ask: 1.004 } })
    expect(text()).toContain('Bid/ask spread (from a $200 test quote)0.4%')
    expect(text()).not.toContain('trade)')
  })

  it('shows no spread row without a quote', async () => {
    resolvePool.mockResolvedValue(null)
    await render({ spread: null })
    expect(text()).not.toContain('Bid/ask spread')
  })
})

/*
 * The desktop keeps Key statistics open, so it asks for a wait before the
 * lookup: clicking down the Board must not resolve a pool for every row it
 * passes. The phone passes no wait and looks up on open, as above.
 */
describe('KeyStatistics pool liquidity on the desktop', () => {
  const DELAY = 1000

  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('waits for the selection to settle before looking up', async () => {
    resolvePool.mockResolvedValue(found())
    await render({ poolLookupDelayMs: DELAY })
    await act(async () => vi.advanceTimersByTime(DELAY - 1))
    expect(resolvePool).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1))
    expect(resolvePool).toHaveBeenCalledTimes(1)
    expect(resolvePool.mock.calls[0][0].id).toBe('apple-xstock')
    expect(text()).toContain('$2.5m')
  })

  it('cancels when the selection changes first, and looks up only the one it lands on', async () => {
    resolvePool.mockResolvedValue(foundTesla())
    await render({ poolLookupDelayMs: DELAY })
    await act(async () => vi.advanceTimersByTime(DELAY / 2))
    await render({ poolLookupDelayMs: DELAY, asset: OTHER })
    await act(async () => vi.advanceTimersByTime(DELAY - 1))
    expect(resolvePool).not.toHaveBeenCalled()
    await act(async () => vi.advanceTimersByTime(1))
    expect(resolvePool).toHaveBeenCalledTimes(1)
    expect(resolvePool.mock.calls[0][0].id).toBe('tesla-xstock')
  })

  it('does not restart the wait on a price tick', async () => {
    resolvePool.mockResolvedValue(found())
    await render({ poolLookupDelayMs: DELAY })
    await act(async () => vi.advanceTimersByTime(DELAY / 2))
    await render({ poolLookupDelayMs: DELAY, asset: { ...ASSET, tokenPrice: 201 } })
    await act(async () => vi.advanceTimersByTime(DELAY / 2))
    expect(resolvePool).toHaveBeenCalledTimes(1)
  })

  it('looks up nothing when the screen closes during the wait', async () => {
    await render({ poolLookupDelayMs: DELAY })
    act(() => root.unmount())
    root = createRoot(container)
    await act(async () => vi.advanceTimersByTime(DELAY * 2))
    expect(resolvePool).not.toHaveBeenCalled()
  })

  it('still looks up at once on the phone, with no wait', async () => {
    resolvePool.mockResolvedValue(found())
    await render()
    expect(resolvePool).toHaveBeenCalledTimes(1)
  })
})
