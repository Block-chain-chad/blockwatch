import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * A gap the app cannot vouch for is said in words wherever a gap is shown,
 * and is never replaced by another number (the row pill used to fall back to
 * the 24h change, which reads as a gap).
 */

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const { PremiumValue, PremiumPill } = await import('./shared')

const base = {
  id: 'x',
  ticker: 'XYZb',
  underlying: 'XYZ',
  issuer: 'bStocks',
  tokenPrice: 110,
  stockPrice: 100,
  dayChange: 3.2,
  volume24h: 1_000_000,
  priceUpdatedAt: Date.now(),
}

describe('gap status in rows', () => {
  it('says "Ratio unverified" for a token nobody has verified, not its 24h change', () => {
    const html = renderToStaticMarkup(<PremiumValue asset={{ ...base, sharesPerToken: null }} />)
    expect(html).toContain('Ratio unverified')
    expect(html).not.toContain('3.2')
    expect(html).not.toContain('10.00')
  })

  it('says "Price check failed" for an implausible gap', () => {
    const html = renderToStaticMarkup(<PremiumPill asset={{ ...base, sharesPerToken: 1, tokenPrice: 150 }} />)
    expect(html).toContain('Price check failed')
  })

  it('shows the gap as a number when it checks out', () => {
    const html = renderToStaticMarkup(<PremiumValue asset={{ ...base, sharesPerToken: 1, tokenPrice: 101 }} />)
    expect(html).toContain('+1.00%')
  })
})
