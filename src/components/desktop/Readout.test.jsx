import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// The Readout reaches services/apiBase, which reads window.location as it
// loads; the static render runs under node, so that has to exist first.
vi.hoisted(() => {
  globalThis.window = {
    location: { origin: 'https://onstock.test', protocol: 'https:' },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  }
})
vi.stubEnv('PROD', true)

/*
 * Chart history fix brief (2026-10-07), criteria 6 and 7, on the Readout's
 * gap history pane: a line drawn from a busy pool carries the pool note; a
 * pool too thin to stand in (useChartData then reports the problem) shows
 * the busy message with its countdown and no gap history.
 */

const NOW = Date.parse('2026-10-08T04:30:00Z')
const asset = {
  id: 'circle-internet-group-ondo-tokenized-stock',
  ticker: 'CRCLon',
  name: 'Circle Internet Group',
  underlying: 'CRCL',
  issuer: 'Ondo',
  sharesPerToken: 1,
  tokenPrice: 80.4,
  stockPrice: 81.3,
  priceUpdatedAt: NOW - 60_000,
  volume24h: 2_000_000,
  stockQuote: { price: 81.3, basis: 'trade', asOf: NOW - 60_000 },
}
const day = Array.from({ length: 288 }, (_, i) => ({ t: NOW - (287 - i) * 300_000, v: -1 + i / 1000 }))
const workspace = { asset, chart: null, info: null, spread: null, siblings: [], hasTokenStats: false, hasStockStats: false, bothSides: true }

vi.mock('../../state/PricesContext', () => ({ usePrices: () => ({ session: 'closed', lastFetchAt: NOW }) }))
vi.mock('../../state/FoldersContext', () => ({ useFolders: () => ({ folders: [], watchlistIds: [], toggleWatchlist() {} }) }))
vi.mock('../../state/AlertsContext', () => ({ useAlerts: () => ({ rules: {} }) }))
vi.mock('../../hooks/useAssetWorkspace', () => ({ useAssetWorkspace: () => workspace, alertLabelFor: () => 'Set alert' }))
vi.mock('../../hooks/useLocalState', () => ({ useLocalState: (_key, initial) => [initial, () => {}] }))
vi.mock('../../hooks/useNow', () => ({ useNow: () => NOW }))
const stub = (name) => ({ default: () => <div data-stub={name} /> })
vi.mock('../PremiumChart', () => stub('premium'))
vi.mock('../asset/TradeButton', () => stub('trade'))
vi.mock('./DetailTabs', () => stub('detail-tabs'))
vi.mock('../../overlays/AddToFolderSheet', () => stub('folder-sheet'))
vi.mock('../../overlays/SetAlertSheet', () => stub('alert-sheet'))
vi.mock('../../overlays/ShareSheet', () => stub('share-sheet'))

const { default: Readout } = await import('./Readout')
const { POOL_SOURCE_NOTE } = await import('../../lib/historyStatus')

function render(chart) {
  workspace.chart = { token: [], stock: [], premium: [], loading: false, error: false, problem: null, tokenSource: null, ...chart }
  return renderToStaticMarkup(<Readout assetId={asset.id} onSelectAsset={() => {}} onOpenChart={() => {}} onSheet={() => {}} />)
}

describe('Readout gap history and the pool', () => {
  it('draws a dense pool line with the pool note', () => {
    const html = render({ tokenSource: 'pool', token: day, premium: day })
    expect(html).toContain('data-stub="premium"')
    expect(html).toContain(POOL_SOURCE_NOTE)
  })

  it('shows the busy message with its countdown, and no gap history, when the pool was too thin', () => {
    const html = render({ error: true, problem: { kind: 'busy', retryAt: NOW + 58_000 } })
    expect(html).toContain('The price source for this token’s history is busy right now')
    expect(html).toContain('Try again in 58 s')
    expect(html).not.toContain('data-stub="premium"')
    expect(html).not.toContain(POOL_SOURCE_NOTE)
  })

  it('says nothing about the pool for a CoinGecko line', () => {
    expect(render({ tokenSource: 'coingecko', token: day, premium: day })).not.toContain(POOL_SOURCE_NOTE)
  })
})
