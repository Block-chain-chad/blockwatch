import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import AboutSheet from './AboutSheet'

/*
 * The "what Onstock is" sentence appears in two places that have to agree:
 * the About sheet and the published privacy policy. Since September 30, 2026
 * both say it the same way: not a broker, does not hold funds, does not
 * execute trades, does not give investment advice. The swap that made
 * "does not execute trades" need a qualifier is switched off, and describing
 * an unavailable feature is its own problem on the App Store.
 *
 * The About sheet also used to call tokens "real stocks". The issuers
 * describe them as tracker certificates and notes, so it now says they track
 * shares and are not the shares themselves (compliance wording item 5).
 */

// Whitespace collapsed, so a rewrapped line cannot break a phrase check.
const privacy = readFileSync(new URL('../../public/privacy.html', import.meta.url), 'utf8').replace(/\s+/g, ' ')
const NOT_A_BROKER = 'is not a broker, does not hold your funds, does not execute trades and does not give investment advice'

// Sheet reads document.activeElement while rendering, to restore focus on
// close. Effects do not run in a static render, so this one field is the
// whole shim.
beforeEach(() => vi.stubGlobal('document', { activeElement: null }))
afterEach(() => vi.unstubAllGlobals())

describe('AboutSheet', () => {
  const render = () => renderToStaticMarkup(<AboutSheet onClose={() => {}} />)

  it('says tokens track shares and are not the shares themselves', () => {
    const html = render()
    expect(html).toContain('built to track the price of a share or fund')
    expect(html).toContain('They are not the shares themselves.')
    expect(html).not.toContain('Real stocks')
    expect(html).not.toContain('the actual stock')
  })

  it('offers no trading and promises none', () => {
    const html = render()
    expect(html).toContain('Onstock is a tracker. It does not offer trading.')
    expect(html).not.toContain('waitlist')
    expect(html).not.toContain('prepares the transaction')
  })

  it('names every price source and what Onstock is not', () => {
    const html = render()
    for (const source of ['CoinGecko', 'Jupiter', 'GeckoTerminal', 'Finnhub', 'Yahoo Finance']) {
      expect(html).toContain(source)
    }
    expect(html).toContain('may be delayed or wrong')
    expect(html).toContain(`Onstock ${NOT_A_BROKER}`)
  })
})

describe('privacy.html', () => {
  it('makes the same claims about what Onstock is as the About sheet', () => {
    expect(privacy).toContain(`Onstock ${NOT_A_BROKER}`)
  })

  it('reads as a finished policy under the current name and address', () => {
    expect(privacy).toContain('Last updated September 30, 2026')
    expect(privacy).not.toMatch(/OnStock|mailto:contact@blockwatch|\[[A-Z]|Reviewer note|DRAFT/)
    expect(privacy).not.toContain('—')
    expect(privacy).toContain('mailto:contact@onstock.app')
  })

  it('describes the closed waitlist and sends no marketing email', () => {
    expect(privacy).toContain('closed to new sign-ups on September 30, 2026')
    expect(privacy).toContain('one email only if in-app trading ever launches')
    expect(privacy).toContain('We do not send newsletters or marketing email.')
    expect(privacy).not.toContain('welcome email')
  })

  it('names every service that receives data, and what analytics carries', () => {
    for (const name of ['Vercel', 'Supabase', 'PostHog', 'Sentry', 'Resend', 'Cloudflare', 'Apple']) {
      expect(privacy).toContain(`<td>${name}</td>`)
    }
    expect(privacy).toContain('user agent')
    expect(privacy).toContain('campaign tags (UTM parameters)')
    expect(privacy).toContain('PostHog keeps the IP address')
  })

  it('says account deletion needs a recent sign-in', () => {
    expect(privacy).toContain('this needs a recent sign-in')
  })

  it('does not claim the app never touches location, since PostHog estimates it', () => {
    expect(privacy).not.toContain('location access')
    expect(privacy).toContain('only if you grant permission when asked')
  })
})
