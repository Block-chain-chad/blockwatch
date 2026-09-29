import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * A smoke render of the Gap Board, without a browser (the static-render
 * pattern from overlays/SwapSheet.test.jsx and components/asset/
 * GapPanel.test.jsx).
 *
 * What is being defended: an identifier used only inside JSX is invisible to
 * the production build, so a helper whose import is dropped during a refactor
 * survives every check until a user opens the screen and the error boundary
 * catches a ReferenceError. That is how `ageWords` came to be called in the
 * wrapper sub-row with no import behind it. These cases render both row
 * shapes, so every expression in the Board's markup is evaluated at least
 * once.
 *
 * Effects do not run in a static render, so this is a floor, not a substitute
 * for a real component test setup.
 */

// AssetLogo reaches the stock service, which reads window.location.origin as
// the module loads, and the Board's remembered chips read localStorage. Both
// happen while the import graph resolves, hence vi.hoisted.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const NOW = Date.UTC(2026, 8, 15, 17, 30, 0) // a Tuesday, inside regular hours

const A = (over) => ({
  issuer: 'xStocks',
  chain: 'Solana',
  type: 'stock',
  volume24h: 1_000_000,
  venues: ['Jupiter'],
  stockQuote: null,
  sharesPerToken: 1, // verified 1:1; see lib/gapCheck.js
  priceUpdatedAt: Date.now(),
  ...over,
})

// NVDA has three wrappers (so the company row carries a spread and a
// lowest-gap pointer); TSLA has one. NVDA's quote is dated, TSLA's is not, so the
// header has to speak for both.
const ASSETS = [
  A({ id: 'nvdax', ticker: 'NVDAx', name: 'NVIDIA', underlying: 'NVDA', tokenPrice: 218.49, stockPrice: 218.29, stockQuote: { price: 218.29, basis: 'trade', asOf: NOW - 12_000 } }),
  A({ id: 'nvdaon', ticker: 'NVDAon', name: 'NVIDIA', underlying: 'NVDA', issuer: 'Ondo', tokenPrice: 218.4, stockPrice: 218.29, stockQuote: { price: 218.29, basis: 'trade', asOf: NOW - 12_000 } }),
  A({ id: 'nvdab', ticker: 'NVDAb', name: 'NVIDIA', underlying: 'NVDA', issuer: 'bStocks', tokenPrice: 218.55, stockPrice: 218.29, stockQuote: { price: 218.29, basis: 'trade', asOf: NOW - 12_000 } }),
  A({ id: 'tslax', ticker: 'TSLAx', name: 'Tesla', underlying: 'TSLA', tokenPrice: 366.72, stockPrice: 365.44, stockQuote: { price: 365.44, basis: 'prevClose', asOf: null } }),
]

const priceState = { assets: ASSETS, session: 'regular', lastFetchAt: NOW - 7_000 }

vi.mock('../../state/PricesContext', () => ({
  usePrices: () => priceState,
  useAssetSubscription: () => {},
}))
vi.mock('../../state/FoldersContext', () => ({
  useFolders: () => ({ watchlistIds: [] }),
}))
vi.mock('../../services/analytics', () => ({ track: () => {} }))

// The wrapper sub-rows — the rows that carry the token price and its age —
// only exist while a company is expanded, and a static render cannot click.
// This expands every company through the real flattenRows, so the markup
// under test is the shipped markup.
vi.mock('../../lib/board', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    flattenRows: (companies) => companies.flatMap((c) => actual.flattenRows([c], c.key)),
  }
})

const { default: Board } = await import('./Board')

const render = () =>
  renderToStaticMarkup(
    <Board
      selectedId="nvdax"
      onSelect={() => {}}
      actionsRef={{ current: null }}
      lens="all"
      onLens={() => {}}
    />
  )

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW)
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('Board renders', () => {
  it('draws a company row for every underlying', () => {
    const html = render()
    expect(html).toContain('NVIDIA')
    expect(html).toContain('Tesla')
    expect(html).toContain('2 companies')
  })

  it('draws the wrapper sub-rows, each with the token leg age beside its price', () => {
    const html = render()
    // Every wrapper's ticker and issuer, and the age of the token feed —
    // the expression that had no import behind it.
    expect(html).toContain('NVDAb')
    expect(html).toContain('NVDAon')
    expect(html).toContain('TSLAx')
    expect(html).toContain('Ondo')
    expect(html).toContain('7 s ago')
  })

  it('names the lowest gap neutrally and never marks a wrapper as the one to buy', () => {
    const html = render()
    expect(html).toContain('Lowest gap')
    expect(html.toLowerCase()).not.toContain('cheapest')
    expect(html).not.toContain('text-accent')
  })

  it('dates the share leg from the quote, and says so when it cannot', () => {
    const html = render()
    // NVDA's quote is 12 s old and traded; TSLA's is a previous close with no
    // stamp, so the header counts it rather than claiming it is live.
    expect(html).toContain('12 s ago')
    expect(html).toContain('1 undated')
  })

  it('renders a closed session without claiming any share leg is live', () => {
    priceState.session = 'closed'
    try {
      const html = render()
      expect(html).toContain('share legs at last close')
      expect(html).not.toContain('share leg live')
      expect(html).toContain('7 s ago')
    } finally {
      priceState.session = 'regular'
    }
  })

  it('calls each tokenized version a token, never a wrapper', () => {
    const html = render()
    expect(html).toContain('Gap vs share · widest token')
    expect(html).toContain('>Tokens<')
    expect(html.toLowerCase()).not.toContain('wrapper')
  })

  it('renders with no token fetch time yet, rather than throwing', () => {
    priceState.lastFetchAt = null
    try {
      const html = render()
      expect(html).toContain('no price yet')
    } finally {
      priceState.lastFetchAt = NOW - 7_000
    }
  })
})
