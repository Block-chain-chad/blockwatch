import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// The workspace reaches services/apiBase, which reads window.location as the
// module loads, and useLocalState, which reads localStorage. These run under
// node, so both have to exist before the import graph resolves — hence
// vi.hoisted rather than a beforeEach (the pattern from GapPanel.test.jsx).
vi.hoisted(() => {
  globalThis.window = {
    location: { origin: 'https://onstock.test', protocol: 'https:' },
    matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
  }
  globalThis.localStorage = {
    getItem: () => null,
    setItem() {},
    removeItem() {},
  }
  globalThis.document = { title: '', addEventListener() {}, removeEventListener() {} }
})
// services/stocks.js picks its quote provider at module load: Finnhub through
// the proxy in production, Yahoo's keyless endpoint in a dev build with no
// key. The legend reports whichever is real, so the production path is the one
// under test here — the one a user actually reads.
vi.stubEnv('PROD', true)

const NOW = Date.now()

const settings = {
  mode: 'gap',
  range: '1D',
  side: 'token',
  timeframe: '5m',
  indicators: [],
  log: false,
}

const asset = {
  id: 'nvdax',
  ticker: 'NVDAx',
  underlying: 'NVDA',
  chain: 'solana',
  mint: 'mint',
  tokenPrice: 218.49,
  stockPrice: 218.29,
  // A fresh, traded quote inside the regular session: the case where the
  // legend speaks about the quote's cadence rather than a delay.
  stockQuote: { price: 218.29, basis: 'trade', asOf: NOW - 12_000 },
  dayChange: 1.2,
}

const workspace = {
  asset,
  staticAsset: asset,
  session: 'regular',
  chart: { token: [], stock: [], premium: [], loading: false, error: null },
  info: null,
  spread: null,
  siblings: [],
  hasTokenStats: true,
  hasStockStats: true,
  bothSides: true,
}

vi.mock('../../state/PricesContext', () => ({
  usePrices: () => ({ lastFetchAt: NOW }),
}))
vi.mock('../../state/FoldersContext', () => ({
  useFolders: () => ({ watchlistIds: [], toggleWatchlist: () => {} }),
}))
vi.mock('../../hooks/useLocalState', () => ({
  useLocalState: () => [settings, () => {}],
}))
vi.mock('../../hooks/useAssetWorkspace', () => ({
  useAssetWorkspace: () => workspace,
}))
// The charts themselves are canvas; nothing here is about what they draw.
const stub = (name) => ({ default: () => <div data-stub={name} /> })
vi.mock('../DualLineChart', () => stub('dual-line'))
vi.mock('../PremiumChart', () => stub('premium'))
vi.mock('../CandlesPanel', () => stub('candles'))
vi.mock('../../overlays/SetAlertSheet', () => stub('alert-sheet'))
vi.mock('./ChartToolbar', () => stub('toolbar'))
vi.mock('./IntervalPrompt', () => stub('interval-prompt'))
vi.mock('./IndicatorDialog', () => stub('indicator-dialog'))
vi.mock('./DetailTabs', () => stub('detail-tabs'))
vi.mock('./GapHeader', () => stub('gap-header'))
vi.mock('./ChartFootStrip', () => stub('foot-strip'))

const { default: ChartWorkspace } = await import('./ChartWorkspace')

/*
 * The chart legend used to credit the share quote to Yahoo Finance. It is not
 * Yahoo's: in production the quote comes from Finnhub through api/finnhub.js,
 * and Yahoo supplies the chart HISTORY through api/history.js. The legend line
 * carrying that credit is also the line that says "Data is delayed" or names
 * the refresh cadence — statements computed from the Finnhub quote's own
 * timestamp. So the wrong name sat directly on a sentence about the other
 * source's number.
 *
 * Rendered without a browser (the static-render pattern from
 * overlays/SwapSheet.test.jsx). These cases fail if either source is ever made
 * to stand for the other again.
 */

const render = (over = {}) => {
  Object.assign(settings, { mode: 'gap', side: 'token', ...over })
  return renderToStaticMarkup(
    <ChartWorkspace assetId="nvdax" onSelectAsset={() => {}} onScrub={() => {}} />
  )
}

beforeEach(() => {
  workspace.session = 'regular'
})

describe('ChartWorkspace legend attribution', () => {
  it('credits the share quote to the provider that actually sends it', () => {
    const html = render({ mode: 'gap' })
    expect(html).toContain('NASDAQ by Finnhub')
    expect(html).not.toContain('NASDAQ by Yahoo Finance')
  })

  it('still credits Yahoo, for the share history it really does provide', () => {
    const html = render({ mode: 'gap' })
    expect(html).toContain('Share history by Yahoo Finance')
  })

  it('names both sources on the candles chart when the stock side is shown', () => {
    const html = render({ mode: 'candles', side: 'stock' })
    expect(html).toContain('NASDAQ by Finnhub')
    expect(html).toContain('Share history by Yahoo Finance')
  })

  it('does not credit Yahoo on the token side, which it has nothing to do with', () => {
    const html = render({ mode: 'candles', side: 'token' })
    expect(html).toContain('by GeckoTerminal')
    expect(html).not.toContain('Yahoo')
  })

  it('keeps the freshness words on the same line as the quote credit', () => {
    // The delayed case, so the two halves of the sentence are seen together:
    // a delay measured on a Finnhub timestamp, attributed to Finnhub.
    workspace.session = 'closed'
    const html = render({ mode: 'gap' })
    expect(html).toContain('Market closed · Data is delayed · NASDAQ by Finnhub')
  })
})
