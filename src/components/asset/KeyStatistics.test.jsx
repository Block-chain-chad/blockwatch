// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * The Pool liquidity row. It appears only when there is a figure and a time
 * for it, and the pool is looked up once per asset while the screen is open:
 * not before Key statistics is opened, not again when it is closed and
 * reopened, and not on every price tick.
 */

const resolvePool = vi.fn()
vi.mock('../../services/candles', () => ({ resolvePool: (...args) => resolvePool(...args) }))

const { default: KeyStatistics } = await import('./KeyStatistics')

const AS_OF = '2026-09-24T14:05:00.000Z'
const ASSET = {
  id: 'apple-xstock',
  ticker: 'AAPLx',
  issuer: 'xStocks',
  underlying: 'AAPL',
  tokenStats: { supply: 1000 },
}
const found = (pool = {}, asOf = AS_OF) => ({
  network: 'solana',
  pool: { address: 'x', name: 'AAPLx / USDC', liquidityUsd: 2_500_000, ...pool },
  asOf,
})

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
    expect(text()).toContain('Pool liquidity (charted pool)')
    expect(text()).toContain('$2.5m')
    expect(text()).toContain('AAPLx / USDC pool, as of Sep 24,')
  })

  it('shows no row when the pool has no reserve figure', async () => {
    resolvePool.mockResolvedValue(found({ liquidityUsd: null }))
    await render()
    expect(text()).not.toContain('Pool liquidity')
    expect(text()).not.toContain('$0')
  })

  it('shows no row when the figure has no time', async () => {
    resolvePool.mockResolvedValue(found({}, null))
    await render()
    expect(text()).not.toContain('Pool liquidity')
  })

  it('shows no row when there is no pool', async () => {
    resolvePool.mockResolvedValue(null)
    await render()
    expect(text()).not.toContain('Pool liquidity')
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
    const OTHER = { ...ASSET, id: 'tesla-xstock', ticker: 'TSLAx', underlying: 'TSLA' }
    await render({ asset: OTHER })
    expect(resolvePool).toHaveBeenCalledTimes(2)
    expect(text()).not.toContain('Pool liquidity')
    await act(async () => finish(found({ name: 'TSLAx / USDC', liquidityUsd: 900_000 })))
    expect(text()).toContain('$900k')
  })

  it('ignores a slow answer for the asset the screen has already left', async () => {
    let finishFirst
    resolvePool.mockReturnValueOnce(new Promise((r) => (finishFirst = r)))
    resolvePool.mockResolvedValueOnce(found({ name: 'TSLAx / USDC', liquidityUsd: 900_000 }))
    await render()
    const OTHER = { ...ASSET, id: 'tesla-xstock', ticker: 'TSLAx', underlying: 'TSLA' }
    await render({ asset: OTHER })
    expect(text()).toContain('$900k')
    await act(async () => finishFirst(found()))
    expect(text()).toContain('$900k')
    expect(text()).not.toContain('$2.5m')
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
