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
    expect(privacy).toContain('Last updated October 8, 2026')
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
    expect(privacy).toContain('Sends our sign-in, confirmation, password reset and waitlist emails')
  })

  it('says PostHog and Sentry are set not to store IP addresses', () => {
    expect(privacy).toContain('We have set both PostHog and Sentry not to store IP addresses.')
    expect(privacy).toContain('We have set Sentry not to store IP addresses.')
    expect(privacy).not.toContain('PostHog keeps the IP address')
  })

  it('offers deletion by email while in-app deletion is switched off', () => {
    expect(privacy).toContain('You can delete your account by emailing us. In-app deletion is coming soon.')
    expect(privacy).toContain("from your account's address and we will delete it")
    expect(privacy).not.toContain('tap Delete account')
    expect(privacy).not.toContain('in the app or by email')
  })

  it('states the retention periods Marcus approved', () => {
    expect(privacy).toContain('until September 30, 2028, whichever comes first')
    expect(privacy).toContain('<strong>Feedback:</strong> 24 months after we receive it')
    expect(privacy).toContain('24 months after our last message in that conversation')
    expect(privacy).toContain('backups for a limited time')
    expect(privacy).not.toContain('as long as we need it')
  })

  it('sets the minimum age at 13', () => {
    expect(privacy).toContain('Onstock is meant for people 13 and older.')
    expect(privacy).toContain('not directed at children under 13')
  })

  it('does not limit Apple sharing a name to the website', () => {
    expect(privacy).toContain('The first time you sign in with Apple, Apple may also share your name')
  })

  it('does not claim the app never touches location', () => {
    expect(privacy).not.toContain('location access')
    expect(privacy).toContain('only if you grant permission when asked')
  })
})
