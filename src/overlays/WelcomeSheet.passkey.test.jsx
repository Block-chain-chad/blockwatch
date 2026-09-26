// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * "Use Face ID to sign in next time?" after a sign-in: shown once per
 * account, only where passkeys work and the switch is on, never to an account
 * that already has one, and a yes registers a passkey.
 */

const h = vi.hoisted(() => ({
  supported: true,
  offered: new Set(),
  list: vi.fn(),
  register: vi.fn(),
}))
vi.mock('../state/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1', email: 'a@b.c' } }) }))
vi.mock('../state/FoldersContext', () => ({ useFolders: () => ({ watchlistIds: [], folders: [] }) }))
vi.mock('../state/AlertsContext', () => ({ useAlerts: () => ({ rules: {} }) }))
vi.mock('../services/passkeys', async (importOriginal) => ({
  ...(await importOriginal()),
  passkeysSupported: () => h.supported,
  listPasskeys: (...a) => h.list(...a),
  registerPasskey: (...a) => h.register(...a),
  wasOffered: (id) => h.offered.has(id),
  markOffered: (id) => h.offered.add(id),
}))
vi.mock('../services/supabase', () => ({ supabase: null }))

const flags = await import('../services/featureFlags')
const { default: WelcomeSheet } = await import('./WelcomeSheet')

let container
let root

async function mount(variant = 'success') {
  await act(async () => root.render(<WelcomeSheet variant={variant} onClose={() => {}} onOpenSignIn={() => {}} />))
}
const text = () => document.body.textContent
const button = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent === label)

beforeEach(() => {
  h.supported = true
  h.offered = new Set()
  h.list.mockReset().mockResolvedValue([])
  h.register.mockReset().mockResolvedValue({ id: 'pk' })
  flags.applyFlags({ 'sign-in-passkey': true })
  Object.defineProperty(window.navigator, 'userAgent', {
    value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X)',
    configurable: true,
  })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  flags.applyFlags(null)
  delete window.navigator.userAgent
})

describe('WelcomeSheet passkey offer', () => {
  it('asks once, in the words the device will use', async () => {
    await mount()
    expect(text()).toContain('Use Face ID to sign in next time?')
    expect(h.offered.has('u1')).toBe(true)
  })

  it('registers a passkey on yes', async () => {
    await mount()
    await act(async () => button('Use Face ID').click())
    expect(h.register).toHaveBeenCalled()
    expect(text()).toContain('Next time, sign in with Face ID.')
  })

  it('does not ask an account that was already asked on this device', async () => {
    h.offered.add('u1')
    await mount()
    expect(text()).not.toContain('sign in next time?')
    expect(h.list).not.toHaveBeenCalled()
  })

  it('does not ask an account that already has a passkey', async () => {
    h.list.mockResolvedValue([{ id: 'pk-1' }])
    await mount()
    expect(text()).not.toContain('sign in next time?')
  })

  it('does not ask while the switch is off, or where passkeys do not work', async () => {
    flags.applyFlags(null)
    await mount()
    expect(text()).not.toContain('sign in next time?')
    act(() => root.unmount())
    root = createRoot(container)
    flags.applyFlags({ 'sign-in-passkey': true })
    h.supported = false
    await mount()
    expect(text()).not.toContain('sign in next time?')
  })

  it('shows the failed variant for a web sign-in that did not finish', async () => {
    await mount('failed')
    expect(text()).toContain("Sign-in didn't finish")
    expect(text()).not.toContain('sign in next time?')
  })
})
