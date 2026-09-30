import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The trading waitlist closed to new sign-ups on September 30, 2026. Profile
 * no longer invites anyone to join; people already on the list see the one
 * promise still owed to them, worded so it promises nothing else.
 */

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const h = vi.hoisted(() => ({ entry: null }))
vi.mock('../state/AuthContext', () => ({ useAuth: () => ({ user: null, available: true, signOut: vi.fn() }) }))
vi.mock('../state/WaitlistContext', () => ({ useWaitlist: () => ({ entry: h.entry }) }))
vi.mock('../state/WalletContext', () => ({ useWallet: () => ({ available: false }), shortAddress: (a) => a }))
vi.mock('../services/supabase', () => ({ supabase: null }))

const { default: ProfileSheet } = await import('./ProfileSheet')

const NEUTRAL_LINE = 'You&#x27;re on the list. One email if in-app trading ever launches where you live.'

beforeEach(() => {
  vi.stubGlobal('document', { activeElement: null })
  h.entry = null
})
afterEach(() => vi.unstubAllGlobals())

const render = () => renderToStaticMarkup(<ProfileSheet onClose={() => {}} />)

describe('ProfileSheet trading waitlist', () => {
  it('invites nobody to join', () => {
    const html = render()
    expect(html).not.toContain('Trading waitlist')
    expect(html).not.toContain('Be first')
    expect(html).not.toContain('>Join<')
  })

  it('tells someone already on the list only the neutral promise', () => {
    h.entry = { email: 'a@b.c', position: 12, pendingSync: false }
    const html = render()
    expect(html).toContain('Trading waitlist')
    expect(html).toContain(NEUTRAL_LINE)
    expect(html).not.toContain('when in-app trading opens')
  })

  it('does not tell a device whose join never reached the server that it is on the list', () => {
    h.entry = { email: 'a@b.c', position: null, pendingSync: true }
    const html = render()
    expect(html).not.toContain('Trading waitlist')
    expect(html).not.toContain('on the list')
  })
})
