import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The Trade screen's copy, rendered without a browser (the static-render
 * pattern from overlays/SwapSheet.test.jsx).
 *
 * What is being defended is a compliance finding, not a layout. The screen
 * used to promise in-app trading, say Onstock "routes", point people to "the
 * right place", sell self-custody, and ask United States readers to join a
 * waitlist for tokens the issuers do not offer them. It also placed an
 * accurate regulator fact beside that waitlist, where it read as an approval
 * of what Onstock is building. These cases fail if any of it returns.
 */

// The screen reaches Header -> AuthContext -> the Supabase client, which reads
// window as the module loads. Node has no window, so it has to exist before
// the import graph resolves.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const { default: Trade } = await import('./Trade')
const { applyFlags, LINK_OUT_FLAG } = await import('../services/featureFlags')

const render = () => renderToStaticMarkup(<Trade onOpenProfile={() => {}} />)

beforeEach(() => applyFlags({ [LINK_OUT_FLAG]: true }))
afterEach(() => applyFlags(null))

describe('Trade screen wording', () => {
  it('describes where tokens trade without offering, routing or recommending', () => {
    const html = render()
    expect(html).toContain('Where tokens trade')
    expect(html).toContain('does not operate, check or recommend any of them')
    expect(html).toContain('does not route orders, hold funds or execute trades')
    for (const gone of ['The market is open', 'the right place', 'Onstock routes', 'In-app trading is']) {
      expect(html).not.toContain(gone)
    }
  })

  it('describes Jupiter without a selling point or an availability claim', () => {
    const html = render()
    expect(html).toContain('Jupiter ↗')
    expect(html).toContain('does not operate it or check whether you may use it')
    expect(html).not.toContain('Self-custody')
    expect(html).not.toContain('Open to you')
    expect(html).not.toContain('exact pair')
  })

  it('keeps the restriction heading, which describes the four exchanges below it', () => {
    const html = render()
    expect(html).toContain('Not offered in the United States')
    for (const name of ['Kraken', 'Bybit', 'Gate.io', 'KuCoin']) {
      expect(html).toContain(name)
    }
  })

  it('asks nobody for an email, because the waitlist is closed', () => {
    const html = render()
    expect(html).not.toContain('type="email"')
    expect(html).not.toContain('Join the waitlist')
    expect(html).not.toContain('In the US?')
    expect(html).not.toContain('trading goes live')
  })

  it('shows only the paused line where the card was when the link-out is off', () => {
    applyFlags({ [LINK_OUT_FLAG]: false })
    const html = render()
    expect(html).toContain('Links out to trading venues are paused.')
    expect(html).not.toContain('jup.ag')
    expect(html).not.toContain('where we can point people')
  })
})

describe('Trade screen regulator reference', () => {
  it('states what the Nasdaq approval actually covers, with the order linked', () => {
    const html = render()
    expect(html).toContain('March 18, 2026')
    expect(html).toContain('Securities and Exchange Commission')
    expect(html).toContain('registered securities in tokenized form')
    expect(html).toContain('Depository Trust Company pilot')
    expect(html).toContain('not an approval of Onstock')
    expect(html).toContain('https://www.sec.gov/files/rules/sro/nasdaq/2026/34-105047.pdf')
  })
})
