import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * Where the Learn list sits on Home. Home's comments explain why nothing may
 * sit above the first price row, so the claim under test is the order: the
 * watchlist first, then the Learn list, then the disclaimer.
 *
 * The contexts are stubbed to one watched asset and a live feed. The header,
 * the tip, the yield curve and the timestamp are stubbed out because none of
 * them is what this file is about and each reads a provider or the network of
 * its own. apiBase reads window at import, which a node test does not have.
 */

vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
vi.mock('../components/Header', () => ({ default: () => null }))
vi.mock('../components/OnboardingTip', () => ({ default: () => null }))
vi.mock('../components/TreasuryYields', () => ({ default: () => null }))
vi.mock('../services/apiBase', () => ({ API_BASE: '', WEB_BASE: 'https://example.test' }))
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

describe('Home', () => {
  const html = renderToStaticMarkup(
    <Home onOpenProfile={() => {}} onOpenAsset={() => {}} onOpenSearch={() => {}} />,
  )

  it('shows the Learn list once', () => {
    expect(html.split('Learn the basics').length - 1).toBe(1)
  })

  it('puts it below the watchlist and the timestamp, above the disclaimer', () => {
    const row = html.indexOf(`>${WATCHED.ticker}<`)
    const updated = html.indexOf('UPDATED-AGO')
    const learn = html.indexOf('Learn the basics')
    const disclaimer = html.indexOf('Prices are informational only')
    expect(row).toBeGreaterThan(-1)
    expect(row).toBeLessThan(learn)
    expect(updated).toBeLessThan(learn)
    expect(learn).toBeLessThan(disclaimer)
  })
})
