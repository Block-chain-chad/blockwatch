import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The Trade screen's copy, rendered without a browser (the static-render
 * pattern from overlays/SwapSheet.test.jsx).
 *
 * What is being defended is a compliance finding, not a layout. The screen
 * used to badge Jupiter "Open to you" for every reader in every country,
 * which is a per-user availability claim OnStock cannot support and which
 * Jupiter's own terms contradict for US wallets. It also placed an accurate
 * SEC fact immediately above "Join the waitlist", where it read as an
 * approval of what OnStock is building. These cases fail if either returns.
 */

// The screen reaches Header -> AuthContext -> the Supabase client, which reads
// window as the module loads. Node has no window, so it has to exist before
// the import graph resolves.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

// The waitlist context default is null, and the screen destructures it.
vi.mock('../state/WaitlistContext', () => ({
  useWaitlist: () => ({ entry: null, join: async () => {} }),
}))

const { default: Trade } = await import('./Trade')
const { applyFlags, LINK_OUT_FLAG } = await import('../services/featureFlags')

const render = () => renderToStaticMarkup(<Trade onOpenProfile={() => {}} />)

beforeEach(() => applyFlags({ [LINK_OUT_FLAG]: true }))
afterEach(() => applyFlags(null))

describe('Trade screen venue copy', () => {
  it('claims availability for nobody on the Jupiter card', () => {
    const html = render()
    expect(html).toContain('Jupiter')
    expect(html).not.toContain('Open to you')
    // The neutral replacement describes the venue, not the reader.
    expect(html).toContain('Self-custody')
  })

  it('keeps the restriction heading, which describes the four exchanges below it', () => {
    const html = render()
    expect(html).toContain('Not offered in the US')
    // Still true of exactly the four it heads.
    for (const name of ['Kraken', 'Bybit', 'Gate.io', 'KuCoin']) {
      expect(html).toContain(name)
    }
  })

  it('says nothing about availability when the link-out is switched off', () => {
    applyFlags({ [LINK_OUT_FLAG]: false })
    const html = render()
    expect(html).not.toContain('Open to you')
    expect(html).not.toContain('Self-custody')
  })
})

describe('Trade screen SEC reference', () => {
  it('states what the Nasdaq approval actually covers', () => {
    const html = render()
    expect(html).toContain('March 18, 2026')
    expect(html).toContain('registered securities in tokenized form')
    expect(html).toContain('DTC pilot')
    expect(html).toContain('not an approval of OnStock')
  })

  it('keeps the approval out of the waitlist paragraph', () => {
    const html = render()
    const waitlistParagraph = html.slice(html.indexOf('In the US?'), html.indexOf('Join the waitlist') + 20)
    expect(waitlistParagraph).not.toContain('SEC')
    expect(waitlistParagraph).not.toContain('Nasdaq')
    // And the fact sits after the signup, not above it.
    expect(html.indexOf('Nasdaq')).toBeGreaterThan(html.indexOf('Join the waitlist'))
  })
})
