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

const state = vi.hoisted(() => ({ native: false, user: null, deleteAccount: null, appleCode: null }))
vi.mock('../lib/platform', () => ({ isNativeApp: () => state.native }))
vi.mock('../state/AuthContext', () => ({
  useAuth: () => ({ user: state.user, deleteAccount: state.deleteAccount }),
}))
vi.mock('../services/socialSignIn', async (importOriginal) => ({
  ...(await importOriginal()),
  appleAuthorizationCode: (...a) => state.appleCode(...a),
}))
vi.mock('../services/supabase', () => ({ supabase: null }))

const { default: DeleteAccountSheet } = await import('./DeleteAccountSheet')

const EMAIL_USER = { id: 'u1', email: 'a@b.c', identities: [{ provider: 'email' }] }
const APPLE_USER = { id: 'u2', email: 'x@privaterelay.appleid.com', identities: [{ provider: 'apple' }] }

let container
let root
const reload = vi.fn()

function mount() {
  act(() => root.render(<DeleteAccountSheet onClose={() => {}} reload={reload} />))
}
const button = (text) => [...document.querySelectorAll('button')].find((b) => b.textContent === text)
const text = () => document.body.textContent

beforeEach(() => {
  state.native = false
  state.user = EMAIL_USER
  state.deleteAccount = vi.fn(async () => ({ deleted: true }))
  state.appleCode = vi.fn(async () => 'c.0.code')
  reload.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
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
})
