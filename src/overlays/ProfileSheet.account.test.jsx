import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * Settings rows for accounts: Delete account for anyone signed in while its
 * switch is on (the server answers 503 until it is configured), Face ID and
 * passkeys only where passkeys work and their switch is on, and neither for a
 * guest.
 */

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const h = vi.hoisted(() => ({ user: null, supported: true }))
vi.mock('../state/AuthContext', () => ({ useAuth: () => ({ user: h.user, available: true, signOut: vi.fn() }) }))
vi.mock('../state/WaitlistContext', () => ({ useWaitlist: () => ({ entry: null }) }))
vi.mock('../state/WalletContext', () => ({ useWallet: () => ({ available: false }), shortAddress: (a) => a }))
vi.mock('../services/passkeys', async (importOriginal) => ({
  ...(await importOriginal()),
  passkeysSupported: () => h.supported,
}))
vi.mock('../services/supabase', () => ({ supabase: null }))

const flags = await import('../services/featureFlags')
const { default: ProfileSheet } = await import('./ProfileSheet')

beforeEach(() => {
  vi.stubGlobal('document', { activeElement: null })
  h.user = { id: 'u1', email: 'a@b.c' }
  h.supported = true
  flags.applyFlags({ 'sign-in-passkey': true, 'account-deletion': true })
})
afterEach(() => {
  vi.unstubAllGlobals()
  flags.applyFlags(null)
})

const render = () => renderToStaticMarkup(<ProfileSheet onClose={() => {}} />)

describe('ProfileSheet account rows', () => {
  it('offers Delete account and passkeys to a signed-in user', () => {
    const html = render()
    expect(html).toContain('Delete account')
    expect(html).toContain('Face ID and passkeys')
  })

  it('shows neither to a guest', () => {
    h.user = null
    const html = render()
    expect(html).not.toContain('Delete account')
    expect(html).not.toContain('Face ID and passkeys')
  })

  it('hides passkeys while the switch is off or where they do not work', () => {
    flags.applyFlags({ 'account-deletion': true })
    expect(render()).not.toContain('Face ID and passkeys')
    flags.applyFlags({ 'sign-in-passkey': true, 'account-deletion': true })
    h.supported = false
    expect(render()).not.toContain('Face ID and passkeys')
    expect(render()).toContain('Delete account')
  })

  it('hides Delete account until its switch is on, including before PostHog answers', () => {
    flags.applyFlags(null)
    expect(render()).not.toContain('Delete account')
    flags.applyFlags({ 'account-deletion': false })
    expect(render()).not.toContain('Delete account')
    flags.applyFlags({ 'account-deletion': true })
    expect(render()).toContain('Delete account')
  })

  it('copes with an account that has no email address', () => {
    h.user = { id: 'u1', email: '' }
    expect(render()).toContain('Signed in')
  })
})
