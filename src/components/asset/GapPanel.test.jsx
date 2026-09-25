import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// GapPanel reaches components/shared, which pulls in AssetLogo → the stock
// service → services/apiBase, and that reads window.location.origin as the
// module loads. These tests run under node, so the window has to exist before
// the import graph resolves — hence vi.hoisted rather than a beforeEach.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const { default: GapPanel } = await import('./GapPanel')
const { applyFlags, SWAP_FLAG, RATIO_LINE_FLAG } = await import('../../services/featureFlags')

/*
 * The panel that carries the gap number, rendered without a browser (the
 * static-render pattern from overlays/SwapSheet.test.jsx).
 *
 * What is being defended: a user reading the gap has to be able to tell
 * whether the share price beside it is live, delayed, or a close, and how
 * old it is. The panel used to date the share leg from the token feed's
 * fetch time, so an hours-old quote rendered as "12 s ago · live". These
 * cases fail if that ever comes back.
 */

const NOW = Date.now()

const asset = (quote) => ({
  id: 'nvdax',
  ticker: 'NVDAx',
  underlying: 'NVDA',
  mint: 'mint',
  tokenPrice: 218.49,
  stockPrice: quote?.price ?? null,
  stockQuote: quote,
  volume24h: 2_000_000,
})

const traded = (secondsAgo) => ({ price: 218.29, basis: 'trade', asOf: NOW - secondsAgo * 1000 })

const render = (quote, session) =>
  renderToStaticMarkup(<GapPanel asset={asset(quote)} scrub={null} session={session} lastFetchAt={NOW} />)

describe('GapPanel share leg', () => {
  it('says live, with the age, only for a fresh quote in the open session', () => {
    const html = render(traded(12), 'regular')
    expect(html).toContain('12 s ago · live')
    expect(html).not.toContain('Delayed')
  })

  it('badges a stale quote during the open session instead of calling it live', () => {
    const html = render(traded(900), 'regular')
    expect(html).toContain('Delayed')
    expect(html).toContain('15 m ago · delayed')
    expect(html).not.toContain('· live')
  })

  it('badges an undated quote rather than inventing an age for it', () => {
    const html = render({ price: 218.29, basis: 'trade', asOf: null }, 'regular')
    expect(html).toContain('Undated')
    expect(html).toContain('age unknown')
    expect(html).not.toContain('· live')
    expect(html).not.toContain('· delayed')
  })

  it('marks a previous-close fallback as one, in the open session', () => {
    const html = render({ price: 218.29, basis: 'prevClose', asOf: null }, 'regular')
    expect(html).toContain('Prev close')
    expect(html).not.toContain('· live')
  })

  it('shows the close, and its age, when the market is shut', () => {
    const html = render(traded(7200), 'closed')
    expect(html).toContain('last close · 2 h ago')
    expect(html).not.toContain('· live')
  })

  it('shows no share leg at all for a product with no underlying', () => {
    const nav = { id: 'tbill', ticker: 'TBILL', underlying: null, tokenPrice: 1, stockPrice: null, stockQuote: null }
    const html = renderToStaticMarkup(
      <GapPanel asset={nav} scrub={null} session="closed" lastFetchAt={NOW} />
    )
    expect(html).toContain('NAV-based')
    expect(html).not.toContain('share')
  })
})

/*
 * The issuer's share-per-token ratio.
 *
 * 66 of the 103 pinned mints are not 1:1, so "one token is one share" is false
 * for most of the universe, and the two legs this panel prints are only
 * comparable once the reader knows the ratio.
 *
 * The sentence is the Compliance Reviewer's, and it is gated: this panel
 * renders for every visitor from AssetDetail and the desktop readout with no
 * flag of its own, and the wording describes what a tokenized security
 * represents. It rides the swap flag until a lawyer rules on the noun.
 *
 * Real ids from data/verifiedMints.json on purpose — a regeneration that
 * dropped the ratios fails here too.
 */
describe('GapPanel issuer ratio line', () => {
  beforeEach(() => applyFlags({ [RATIO_LINE_FLAG]: true }))
  afterEach(() => applyFlags(null))

  const withId = (id, ticker, underlying) =>
    renderToStaticMarkup(
      <GapPanel
        asset={{
          id,
          ticker,
          underlying,
          tokenPrice: 76.98,
          stockPrice: 76.41,
          stockQuote: traded(12),
          volume24h: 2_000_000,
        }}
        scrub={null}
        session="regular"
        lastFetchAt={NOW}
      />
    )

  it('states what a split-ratio token tracks, and when Backed changed it', () => {
    const html = withId('netflix-xstock', 'NFLXx', 'NFLX')
    expect(html).toContain('Issuer ratio: 1 token tracks the value of 10 NFLX shares.')
    expect(html).toContain('Backed last changed this ratio on 16 Nov 2025.')
  })

  it('states a fractional ratio the same way, naming no corporate action', () => {
    const html = withId('coca-cola-xstock', 'KOx', 'KO')
    expect(html).toMatch(/1 token tracks the value of 1\.0\d+ KO shares/)
    expect(html).not.toMatch(/split|dividend/i)
  })

  it('never claims the token IS shares', () => {
    expect(withId('netflix-xstock', 'NFLXx', 'NFLX')).not.toContain('1 token = ')
  })

  it('says nothing at all when one token tracks one share', () => {
    expect(withId('tesla-xstock', 'TSLAx', 'TSLA')).not.toContain('Issuer ratio')
  })

  it('says nothing for an asset with no pinned ratio, such as an Ondo wrapper', () => {
    expect(withId('nvidia-ondo-tokenized-stock', 'NVDAon', 'NVDA')).not.toContain('Issuer ratio')
  })

  it('still renders the gap itself alongside the ratio', () => {
    const html = withId('netflix-xstock', 'NFLXx', 'NFLX')
    expect(html).toContain('Gap vs NFLX')
    expect(html).toContain('NFLXx token')
  })
})

describe('GapPanel issuer ratio line is gated', () => {
  const render = () =>
    renderToStaticMarkup(
      <GapPanel
        asset={{
          id: 'netflix-xstock',
          ticker: 'NFLXx',
          underlying: 'NFLX',
          tokenPrice: 76.98,
          stockPrice: 76.41,
          stockQuote: traded(12),
          volume24h: 2_000_000,
        }}
        scrub={null}
        session="regular"
        lastFetchAt={NOW}
      />
    )

  it('is absent with its own flag off', () => {
    applyFlags({ [RATIO_LINE_FLAG]: false })
    expect(render()).not.toContain('Issuer ratio')
  })

  it('does NOT ride the swap flag, so enabling the swap cannot ship it', () => {
    applyFlags({ [SWAP_FLAG]: true })
    expect(render()).not.toContain('Issuer ratio')
  })

  it('is present with its own flag on, and the swap still off', () => {
    applyFlags({ [RATIO_LINE_FLAG]: true, [SWAP_FLAG]: false })
    expect(render()).toContain('Issuer ratio: 1 token tracks the value of 10 NFLX shares.')
  })

  it('is absent when no flag has answered, so it fails closed', () => {
    applyFlags(null)
    const html = render()
    expect(html).not.toContain('Issuer ratio')
    // The rest of the panel is unaffected by the gate.
    expect(html).toContain('Gap vs NFLX')
  })
})
