// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * The sign-in sheet's quick options. Each button appears only when its switch
 * is on, the "Or continue with email" divider only when at least one button
 * does, email sign-in is always there underneath, a cancelled provider sheet
 * says nothing, and a real failure says so in plain words.
 */

const h = vi.hoisted(() => ({
  native: false,
  supported: true,
  signInWithProvider: vi.fn(),
  signInPasskey: vi.fn(),
  showWelcome: vi.fn(),
}))
vi.mock('../lib/platform', () => ({ isNativeApp: () => h.native }))
vi.mock('../state/AuthContext', () => ({
  useAuth: () => ({
    signIn: vi.fn(),
    signInPassword: vi.fn(),
    signUpPassword: vi.fn(),
    resetPassword: vi.fn(),
    resendConfirmation: vi.fn(),
    showWelcome: h.showWelcome,
    signInWithProvider: h.signInWithProvider,
    signInPasskey: h.signInPasskey,
  }),
}))
vi.mock('../state/WaitlistContext', () => ({ useWaitlist: () => ({ entry: null }) }))
vi.mock('../services/passkeys', async (importOriginal) => ({
  ...(await importOriginal()),
  passkeysSupported: () => h.supported,
  startPasskeyAutofill: vi.fn(async () => false),
}))
vi.mock('../services/supabase', () => ({ supabase: null }))

const flags = await import('../services/featureFlags')
const { default: SignInSheet } = await import('./SignInSheet')

let container
let root
const onClose = vi.fn()

function mount() {
  act(() => root.render(<SignInSheet onClose={onClose} />))
}
const button = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent === label)
const text = () => document.body.textContent

beforeEach(() => {
  h.native = false
  h.supported = true
  for (const fn of [h.signInWithProvider, h.signInPasskey, h.showWelcome, onClose]) fn.mockReset()
  flags.applyFlags({ 'sign-in-apple': true, 'sign-in-google': true, 'sign-in-passkey': true })
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  flags.applyFlags(null)
})

describe('SignInSheet quick options', () => {
  it('shows Apple, Google and passkey above email when all are on', () => {
    mount()
    expect(button('Continue with Apple')).toBeTruthy()
    expect(button('Continue with Google')).toBeTruthy()
    expect(button('Continue with Face ID or passkey')).toBeTruthy()
    expect(text()).toContain('Or continue with email')
    const order = [...document.querySelectorAll('button, input')].map((el) => el.textContent || el.type)
    expect(order.indexOf('Continue with Apple')).toBeLessThan(order.indexOf('email'))
    expect(document.querySelector('input[type="email"]')).toBeTruthy()
  })

  it('shows only email when every switch is off', () => {
    flags.applyFlags(null)
    mount()
    expect(button('Continue with Apple')).toBeUndefined()
    expect(button('Continue with Google')).toBeUndefined()
    expect(button('Continue with Face ID or passkey')).toBeUndefined()
    expect(text()).not.toContain('Or continue with email')
    expect(document.querySelector('input[type="email"]')).toBeTruthy()
  })

  it('shows the divider when only one provider is on', () => {
    flags.applyFlags({ 'sign-in-google': true })
    mount()
    expect(button('Continue with Google')).toBeTruthy()
    expect(button('Continue with Apple')).toBeUndefined()
    expect(text()).toContain('Or continue with email')
  })

  it('hides the divider in the iOS app when the only switch on is passkeys', () => {
    h.native = true
    flags.applyFlags({ 'sign-in-passkey': true })
    mount()
    expect(button('Continue with Face ID or passkey')).toBeUndefined()
    expect(text()).not.toContain('Or continue with email')
  })

  it('offers the email field to passkey autofill only when passkeys are on', () => {
    mount()
    expect(document.querySelector('input[type="email"]').getAttribute('autocomplete')).toBe('username webauthn')
    act(() => root.unmount())
    root = createRoot(container)
    flags.applyFlags({ 'sign-in-apple': true })
    mount()
    expect(document.querySelector('input[type="email"]').getAttribute('autocomplete')).toBe('email')
  })

  it('starts the provider flow on tap', async () => {
    h.signInWithProvider.mockResolvedValue()
    mount()
    await act(async () => button('Continue with Google').click())
    expect(h.signInWithProvider).toHaveBeenCalledWith('google')
  })

  it('closes and welcomes after a native sign-in', async () => {
    h.native = true
    h.signInWithProvider.mockResolvedValue()
    mount()
    await act(async () => button('Continue with Apple').click())
    expect(onClose).toHaveBeenCalled()
    expect(h.showWelcome).toHaveBeenCalled()
  })

  it('says nothing when the person cancels, and explains a real failure', async () => {
    h.signInWithProvider.mockRejectedValueOnce(new Error('The user canceled the sign-in flow.'))
    mount()
    await act(async () => button('Continue with Apple').click())
    expect(text()).not.toContain("Couldn't sign in")
    h.signInWithProvider.mockRejectedValueOnce(new Error('provider is not enabled'))
    await act(async () => button('Continue with Apple').click())
    expect(text()).toContain("Couldn't sign in with Apple. Try again, or use your email.")
  })

  it('signs in with a passkey and welcomes', async () => {
    h.signInPasskey.mockResolvedValue()
    mount()
    await act(async () => button('Continue with Face ID or passkey').click())
    expect(h.signInPasskey).toHaveBeenCalled()
    expect(h.showWelcome).toHaveBeenCalled()
  })

  it('hides the passkey button in the iOS app', () => {
    h.native = true
    mount()
    expect(button('Continue with Face ID or passkey')).toBeUndefined()
  })
})
