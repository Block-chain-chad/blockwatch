import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

// GapPanel reaches components/shared, which pulls in AssetLogo → the stock
// service → services/apiBase, and that reads window.location.origin as the
// module loads. These tests run under node, so the window has to exist before
// the import graph resolves — hence vi.hoisted rather than a beforeEach.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const { default: GapPanel } = await import('./GapPanel')

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
 * 66 of the 103 pinned mints are not 1:1, and six are 2x or more, so "one
 * token is one share" is false for most of the universe. Where it is false
 * the panel has to say so, because the two legs it prints are only
 * comparable once the reader knows the ratio. Where it is true it says
 * nothing, since that is what everyone already assumes.
 *
 * Real ids from data/verifiedMints.json on purpose — a regeneration that
 * dropped the ratios fails here too.
 */
describe('GapPanel issuer ratio line', () => {
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

  it('states the ratio and its date for a token that has split', () => {
    const html = withId('netflix-xstock', 'NFLXx', 'NFLX')
    expect(html).toContain('1 token = 10 shares')
    expect(html).toContain('since a split on 16 Nov 2025')
  })

  it('states a fractional ratio from a dividend', () => {
    const html = withId('coca-cola-xstock', 'KOx', 'KO')
    expect(html).toMatch(/1 token = 1\.0\d+ shares since a dividend on/)
  })

  it('says nothing at all when one token really is one share', () => {
    const html = withId('tesla-xstock', 'TSLAx', 'TSLA')
    expect(html).not.toContain('1 token =')
  })

  it('says nothing for an asset with no pinned ratio, such as an Ondo wrapper', () => {
    const html = withId('nvidia-ondo-tokenized-stock', 'NVDAon', 'NVDA')
    expect(html).not.toContain('1 token =')
  })

  it('still renders the gap itself alongside the ratio', () => {
    const html = withId('netflix-xstock', 'NFLXx', 'NFLX')
    expect(html).toContain('Gap vs NFLX')
    expect(html).toContain('NFLXx token')
  })
})
