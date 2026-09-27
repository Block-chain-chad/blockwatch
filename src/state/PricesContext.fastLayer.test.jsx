// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * The live Jupiter layer, through the real provider. On 2026-09-26 it fed
 * AMDx at 518.69 from a thin pool straight into the gap, and the header named
 * "-17.75%". The provider must keep CoinGecko's price when the two disagree,
 * use Jupiter's when they agree, and never let an agreeing pool re-date a
 * stale CoinGecko price as fresh.
 */

const h = vi.hoisted(() => ({ cg: {}, jup: {} }))
vi.mock('../services/coingecko', () => ({
  POLL_MS: 60_000,
  fetchTokenMarkets: vi.fn(async (ids) => Object.fromEntries(ids.filter((id) => h.cg[id]).map((id) => [id, h.cg[id]]))),
  loadPriceCache: () => null,
  savePriceCache: () => {},
}))
vi.mock('../services/jupiter', () => ({
  FAST_POLL_MS: 20,
  fetchFastPrices: vi.fn(async () => h.jup),
}))
vi.mock('../services/stocks', () => ({
  STOCK_POLL_MS: 60_000,
  CLOSED_MARKET_REFRESH_MS: 30 * 60_000,
  getStockPrices: vi.fn(async () => ({ quotes: { AMD: { price: 630.63, basis: 'trade', asOf: Date.now() } }, rateLimited: [] })),
  loadStockCache: () => null,
  saveStockCache: () => {},
}))

const { PricesProvider, usePrices, useAssetSubscription } = await import('./PricesContext')
const { BY_ID } = await import('../data/universe')

const AMDX = 'amd-xstock'
const MINT = BY_ID[AMDX].mint
const cgRow = (price, updatedAt) => ({
  tokenPrice: price,
  feedPrice: price,
  feedUpdatedAt: updatedAt,
  priceUpdatedAt: updatedAt,
  volume24h: 260_503,
})

let container
let root
let latest

function Probe() {
  useAssetSubscription('test', [AMDX])
  latest = usePrices().byId[AMDX]
  return null
}

async function runFor(ms) {
  await act(async () => {
    await new Promise((r) => setTimeout(r, ms))
  })
}

beforeEach(() => {
  localStorage.clear()
  latest = null
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
})

async function mount() {
  await act(async () =>
    root.render(
      <PricesProvider>
        <Probe />
      </PricesProvider>,
    ),
  )
  await runFor(300)
}

describe('PricesContext fast layer', () => {
  it("keeps CoinGecko's price when Jupiter disagrees (AMDx 518.69 against 630.73)", async () => {
    h.cg = { [AMDX]: cgRow(630.73, Date.now() - 60_000) }
    h.jup = { [MINT]: 518.689 }
    await mount()
    expect(latest.tokenPrice).toBe(630.73)
  })

  it("uses Jupiter's price when a current CoinGecko price agrees", async () => {
    h.cg = { [AMDX]: cgRow(630.73, Date.now() - 60_000) }
    h.jup = { [MINT]: 631.2 }
    await mount()
    expect(latest.tokenPrice).toBe(631.2)
  })

  it('does not re-date a stale CoinGecko price because a pool echoes it', async () => {
    const threeMonthsAgo = Date.now() - 90 * 24 * 60 * 60 * 1000
    h.cg = { [AMDX]: cgRow(630.73, threeMonthsAgo) }
    h.jup = { [MINT]: 630.8 }
    await mount()
    expect(latest.tokenPrice).toBe(630.73)
    expect(latest.priceUpdatedAt).toBe(threeMonthsAgo)
  })
})
