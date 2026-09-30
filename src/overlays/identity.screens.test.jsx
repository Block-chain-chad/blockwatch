import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * A Sign in with Apple account that chose Hide My Email must be shown by its
 * name, not by the random relay address: in the profile header, the avatar
 * letter and the "You're in" sheet. The address stays as a quieter line.
 */

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const RELAY = 'w7k6vt4yj9@privaterelay.appleid.com'
const h = vi.hoisted(() => ({ user: null }))
vi.mock('../state/AuthContext', () => ({ useAuth: () => ({ user: h.user, available: true, signOut: vi.fn() }) }))
vi.mock('../state/WaitlistContext', () => ({ useWaitlist: () => ({ entry: null }) }))
vi.mock('../state/WalletContext', () => ({ useWallet: () => ({ available: false }), shortAddress: (a) => a }))
vi.mock('../state/FoldersContext', () => ({ useFolders: () => ({ watchlistIds: [], folders: [] }) }))
vi.mock('../state/AlertsContext', () => ({ useAlerts: () => ({ rules: {} }) }))
vi.mock('../services/supabase', () => ({ supabase: null }))

const { default: ProfileSheet } = await import('./ProfileSheet')
const { default: WelcomeSheet } = await import('./WelcomeSheet')
const { AvatarButton } = await import('../components/Header')

beforeEach(() => vi.stubGlobal('document', { activeElement: null }))
afterEach(() => vi.unstubAllGlobals())

const profile = () => renderToStaticMarkup(<ProfileSheet onClose={() => {}} onGoToTrade={() => {}} />)
const welcome = () =>
  renderToStaticMarkup(<WelcomeSheet variant="success" onClose={() => {}} onOpenSignIn={() => {}} />)
const avatar = () => renderToStaticMarkup(<AvatarButton onClick={() => {}} />)
// The visible text of the avatar button, without the icon markup.
const avatarText = () => avatar().replace(/<svg[\s\S]*<\/svg>/, '').replace(/<[^>]+>/g, '')

describe('Apple Hide My Email accounts', () => {
  it('lead with the name from user_metadata and keep the relay address as a second line', () => {
    h.user = { id: 'u1', email: RELAY, user_metadata: { full_name: 'Marcus LoTempio' } }
    const p = profile()
    expect(p).toMatch(/<h2[^>]*>Marcus LoTempio<\/h2>/)
    expect(p).toContain(RELAY)
    expect(p.indexOf('Marcus LoTempio')).toBeLessThan(p.indexOf(RELAY))
    expect(avatarText()).toBe('M')
    const w = welcome()
    expect(w).toContain('Marcus LoTempio')
    expect(w.indexOf('Marcus LoTempio')).toBeLessThan(w.indexOf(RELAY))
  })

  it('say "Signed in with Apple" when Apple sent no name, with no relay letter in the avatar', () => {
    h.user = { id: 'u1', email: RELAY, user_metadata: {} }
    expect(profile()).toContain('Signed in with Apple')
    expect(welcome()).toContain('Signed in with Apple')
    expect(avatarText()).toBe('')
    expect(avatar()).toContain('<svg')
  })
})

describe('email accounts', () => {
  it('still show the email when there is no name', () => {
    h.user = { id: 'u1', email: 'zoe@example.com' }
    expect(profile()).toMatch(/<h2[^>]*>zoe@example.com<\/h2>/)
    expect(welcome()).toContain('zoe@example.com')
    expect(avatarText()).toBe('Z')
  })

  it('show a guest as Guest with the person icon', () => {
    h.user = null
    expect(profile()).toContain('Guest')
    expect(avatarText()).toBe('')
  })
})
