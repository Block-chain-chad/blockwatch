// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * Everything Home stacks under the watchlist, as an iPhone Safari visitor
 * sees it: the rows, the timestamp, the Add to Home Screen row, the Learn
 * list, the disclaimer. Home's comments explain why nothing may sit above
 * the first price row; this pins the order below it with the install row
 * actually rendering, which the node test in Home.test.jsx cannot do because
 * it has no browser to detect.
 *
 * The contexts are stubbed to one watched asset and a live feed. The header,
 * the onboarding tip, the yield curve and the timestamp are stubbed because
 * each reads a provider or the network of its own; the timestamp keeps a
 * marker so its position can be checked.
 */

vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
vi.mock('../lib/platform', () => ({ isNativeApp: () => false }))
vi.mock('../components/Header', () => ({ default: () => null }))
vi.mock('../components/OnboardingTip', () => ({ default: () => null }))
vi.mock('../components/TreasuryYields', () => ({ default: () => null }))
vi.mock('../components/UpdatedAgo', () => ({ default: () => <p>UPDATED-AGO</p> }))
vi.mock('../hooks/useSparklines', () => ({ useSparklines: () => ({}) }))

const { ASSETS } = await import('../data/universe')
const WATCHED = ASSETS[0]

vi.mock('../state/PricesContext', () => ({
  usePrices: () => ({ assets: [WATCHED], marketOpen: true, session: 'regular', status: 'live' }),
  useAssetSubscription: () => {},
}))
vi.mock('../state/FoldersContext', () => ({
  useFolders: () => ({ watchlistIds: [WATCHED.id] }),
}))

const { default: Home } = await import('./Home')

const IPHONE_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1'
const NAV = { userAgent: IPHONE_SAFARI, maxTouchPoints: 5, standalone: false }

let container
let root

beforeAll(() => {
  for (const [k, value] of Object.entries(NAV)) {
    Object.defineProperty(window.navigator, k, { value, configurable: true })
  }
  window.matchMedia = () => ({ matches: false })
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {}, removeItem: () => {} })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root.render(<Home onOpenProfile={() => {}} onOpenAsset={() => {}} onOpenSearch={() => {}} />))
})
afterAll(() => {
  act(() => root.unmount())
  container.remove()
  vi.unstubAllGlobals()
  for (const k of Object.keys(NAV)) delete window.navigator[k]
  delete window.matchMedia
})

describe('Home on iPhone Safari', () => {
  it('stacks rows, timestamp, install row, Learn list, disclaimer, in that order', () => {
    const text = container.textContent
    const at = (s) => {
      const i = text.indexOf(s)
      expect(i, s).toBeGreaterThan(-1)
      return i
    }
    const order = [
      at(WATCHED.name),
      at('UPDATED-AGO'),
      at('Add to Home Screen'),
      at('Learn the basics'),
      at('Prices are informational only'),
    ]
    expect(order).toEqual([...order].sort((a, b) => a - b))
  })
})
