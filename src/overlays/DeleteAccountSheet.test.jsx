// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * Settings > Delete account. One confirmation, then the deletion; in the iOS
 * app an Apple account is asked for a fresh Apple code first, and cancelling
 * Apple's sheet cancels the deletion rather than deleting without revoking.
 */

const state = vi.hoisted(() => ({ native: false, user: null, deleteAccount: null, appleCode: null, recent: true, signOut: null }))
vi.mock('../lib/platform', () => ({ isNativeApp: () => state.native }))
vi.mock('../state/AuthContext', () => ({
  useAuth: () => ({
    user: state.user,
    deleteAccount: state.deleteAccount,
    signOut: state.signOut,
    signedInRecently: () => state.recent,
  }),
}))
vi.mock('../services/socialSignIn', async (importOriginal) => ({
  ...(await importOriginal()),
  appleAuthorizationCode: (...a) => state.appleCode(...a),
}))
vi.mock('../services/supabase', () => ({ supabase: null }))

const flags = await import('../services/featureFlags')
const { default: DeleteAccountSheet } = await import('./DeleteAccountSheet')

const EMAIL_USER = { id: 'u1', email: 'a@b.c', identities: [{ provider: 'email' }] }
const APPLE_USER = { id: 'u2', email: 'x@privaterelay.appleid.com', identities: [{ provider: 'apple' }] }

let container
let root
const reload = vi.fn()

function mount() {
  act(() => root.render(<DeleteAccountSheet onClose={() => {}} reload={reload} />))
}
/** A fresh sheet, as if opened again, for a second case inside one test. */
function remount() {
  act(() => root.unmount())
  root = createRoot(container)
  mount()
}
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent === text)
const text = () => document.body.textContent

beforeEach(() => {
  state.native = false
  state.user = EMAIL_USER
  state.deleteAccount = vi.fn(async () => ({ deleted: true }))
  state.appleCode = vi.fn(async () => 'c.0.code')
  state.recent = true
  state.signOut = vi.fn(async () => {})
  flags.applyFlags(null)
  reload.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  flags.applyFlags(null)
  act(() => root.unmount())
  container.remove()
})

describe('DeleteAccountSheet', () => {
  it('asks once, then deletes', async () => {
    mount()
    expect(text()).toContain('Delete your account?')
    expect(state.deleteAccount).not.toHaveBeenCalled()
    await act(async () => button('Delete my account').click())
    expect(state.deleteAccount).toHaveBeenCalledWith({ appleAuthorizationCode: undefined })
    expect(text()).toContain('Your account is deleted')
    await act(async () => button('Done').click())
    expect(reload).toHaveBeenCalled()
  })

  it('says the account was not deleted when the server refuses', async () => {
    state.deleteAccount = vi.fn(async () => {
      throw new Error('delete-account 502')
    })
    mount()
    await act(async () => button('Delete my account').click())
    expect(text()).toContain("Your account wasn't deleted")
  })

  it('does not ask Apple on the web', async () => {
    state.user = APPLE_USER
    mount()
    await act(async () => button('Delete my account').click())
    expect(state.appleCode).not.toHaveBeenCalled()
  })

  it('in the app, gets a fresh Apple code first and sends it', async () => {
    state.native = true
    state.user = APPLE_USER
    mount()
    expect(text()).toContain('Apple will ask you to confirm once more')
    await act(async () => button('Delete my account').click())
    expect(state.appleCode).toHaveBeenCalled()
    expect(state.deleteAccount).toHaveBeenCalledWith({ appleAuthorizationCode: 'c.0.code' })
  })

  it("cancelling Apple's sheet cancels the deletion", async () => {
    state.native = true
    state.user = APPLE_USER
    state.appleCode = vi.fn(async () => {
      throw new Error('The user canceled the authorization attempt (1001)')
    })
    mount()
    await act(async () => button('Delete my account').click())
    expect(state.deleteAccount).not.toHaveBeenCalled()
    expect(text()).toContain('Delete your account?')
    expect(text()).not.toContain("wasn't deleted")
  })

  it('says what is deleted, what is kept, and links the privacy policy, spelled Onstock', () => {
    mount()
    expect(text()).toContain(
      'This permanently deletes your Onstock account and everything saved to it: your synced folders, alerts and holdings, your passkeys, and your sign-in details. If your account email is confirmed, it also deletes the trading waitlist entry and any feedback sent with that same email address. This can\'t be undone.',
    )
    expect(text()).toContain('Some records are not part of your account')
    expect(document.querySelector('a[href="https://onstock.app/privacy.html"]').textContent).toBe('privacy policy')
    expect(text()).not.toMatch(/OnStock|\u2014/)
  })

  it('mentions passkeys in password managers only while passkeys are switched on', () => {
    mount()
    expect(text()).not.toContain('stay in your password manager')
    act(() => flags.applyFlags({ 'sign-in-passkey': true }))
    expect(text()).toContain('Passkeys saved on your devices stay in your password manager.')
  })

  it('points to email when the server refuses', async () => {
    state.deleteAccount = vi.fn(async () => {
      throw Object.assign(new Error('delete-account 502'), { status: 502 })
    })
    mount()
    await act(async () => button('Delete my account').click())
    expect(text()).toContain("If it keeps failing, email contact@onstock.app and we'll delete it for you.")
  })
})

describe('DeleteAccountSheet: recent sign-in', () => {
  it('asks for a fresh sign-in up front, and never offers the delete button', async () => {
    state.recent = false
    mount()
    expect(text()).toContain('Sign in again first')
    expect(button('Delete my account')).toBeUndefined()
    await act(async () => button('Sign out').click())
    expect(state.signOut).toHaveBeenCalled()
    expect(reload).toHaveBeenCalled()
  })

  it('switches to the sign-in-again screen when the server says the sign-in is too old', async () => {
    state.deleteAccount = vi.fn(async () => {
      throw Object.assign(new Error('delete-account 403'), { status: 403 })
    })
    mount()
    await act(async () => button('Delete my account').click())
    expect(text()).toContain('Sign in again first')
  })

  it('lets an Apple account in the app go ahead, because the fresh Apple code proves it', () => {
    state.native = true
    state.user = APPLE_USER
    state.recent = false
    mount()
    expect(button('Delete my account')).toBeDefined()
  })
})

describe('DeleteAccountSheet: Sign in with Apple result', () => {
  const MANUAL = 'open Settings, tap your name, tap Sign in with Apple, choose Onstock, then tap Delete'

  it('shows the manual steps when Apple was not revoked', async () => {
    for (const apple of ['no-code', 'failed', 'not-configured', undefined]) {
      state.user = APPLE_USER
      state.deleteAccount = vi.fn(async () => ({ deleted: true, apple }))
      remount()
      await act(async () => button('Delete my account').click())
      expect(text()).toContain(MANUAL)
    }
  })

  it('does not show them when Apple was revoked, or for an account without Apple', async () => {
    state.native = true
    state.user = APPLE_USER
    state.deleteAccount = vi.fn(async () => ({ deleted: true, apple: 'revoked' }))
    mount()
    await act(async () => button('Delete my account').click())
    expect(text()).toContain('Your account is deleted')
    expect(text()).not.toContain(MANUAL)

    state.native = false
    state.user = EMAIL_USER
    state.deleteAccount = vi.fn(async () => ({ deleted: true, apple: 'not-used' }))
    remount()
    await act(async () => button('Delete my account').click())
    expect(text()).not.toContain(MANUAL)
  })
})
