// @vitest-environment jsdom

// Must be set before react-dom loads; see overlays/SwapSheet.sizing.test.jsx.
globalThis.IS_REACT_ACT_ENVIRONMENT = true

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'

/*
 * The sign-in sheet, email first. One field and Continue sends a one-time
 * link (which also creates the account when the address is new), then the
 * sheet becomes "Check your email" with a resend that waits out Supabase's
 * limit. Passwords stay one tap away for people who use them.
 */

const h = vi.hoisted(() => ({
  native: false,
  signIn: vi.fn(),
  signInPassword: vi.fn(),
  signUpPassword: vi.fn(),
  resetPassword: vi.fn(),
  resendConfirmation: vi.fn(),
  showWelcome: vi.fn(),
}))
vi.mock('../lib/platform', () => ({ isNativeApp: () => h.native }))
vi.mock('../state/AuthContext', () => ({
  useAuth: () => ({
    signIn: h.signIn,
    signInPassword: h.signInPassword,
    signUpPassword: h.signUpPassword,
    resetPassword: h.resetPassword,
    resendConfirmation: h.resendConfirmation,
    showWelcome: h.showWelcome,
    signInWithProvider: vi.fn(),
    signInPasskey: vi.fn(),
  }),
}))
vi.mock('../state/WaitlistContext', () => ({ useWaitlist: () => ({ entry: null }) }))
vi.mock('../services/passkeys', async (importOriginal) => ({
  ...(await importOriginal()),
  passkeysSupported: () => true,
  startPasskeyAutofill: vi.fn(async () => false),
}))
vi.mock('../services/supabase', () => ({ supabase: null }))

const { default: SignInSheet } = await import('./SignInSheet')
const { RESEND_COOLDOWN_SECONDS } = await import('../lib/authErrors')

let container
let root
const onClose = vi.fn()

function mount() {
  act(() => root.render(<SignInSheet onClose={onClose} />))
}
const button = (label) => [...document.querySelectorAll('button')].find((b) => b.textContent === label)
const buttonStarting = (prefix) => [...document.querySelectorAll('button')].find((b) => b.textContent.startsWith(prefix))
const text = () => document.body.textContent
const heading = () => document.querySelector('h2')?.textContent
const emailInput = () => document.querySelector('input[type="email"]')
const passwordInput = () => document.querySelector('input[autocomplete$="password"]')

function type(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  act(() => {
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}
async function submit() {
  await act(async () => document.querySelector('form').requestSubmit())
}
async function tap(label) {
  await act(async () => button(label).click())
}
async function sendLinkTo(email) {
  type(emailInput(), email)
  await submit()
}

beforeEach(() => {
  h.native = false
  for (const fn of Object.values(h)) if (typeof fn === 'function') fn.mockReset()
  onClose.mockReset()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
})
afterEach(() => {
  act(() => root.unmount())
  container.remove()
  vi.useRealTimers()
})

describe('email step', () => {
  it('asks for one email, labelled, with Continue and no password field', () => {
    mount()
    expect(heading()).toBe('Sign in or create an account')
    const label = document.querySelector(`label[for="${emailInput().id}"]`)
    expect(label.textContent).toBe('Email')
    expect(passwordInput()).toBeNull()
    expect(button('Continue')).toBeTruthy()
    expect(button('Use a password instead')).toBeTruthy()
    // No more Sign in / Create account tabs.
    expect(button('Create account')).toBeUndefined()
  })

  it('keeps Continue off until the address looks like an email', () => {
    mount()
    expect(button('Continue').disabled).toBe(true)
    type(emailInput(), 'a@b.co')
    expect(button('Continue').disabled).toBe(false)
  })

  it('sends a one-time link and shows Check your email', async () => {
    h.signIn.mockResolvedValue()
    mount()
    await sendLinkTo('person@example.com')
    expect(h.signIn).toHaveBeenCalledWith('person@example.com')
    expect(heading()).toBe('Check your email')
    expect(text()).toContain('We sent a sign-in link to person@example.com. Open it on this device to finish.')
    expect(emailInput()).toBeNull()
  })

  it('says "this phone" in the iOS app', async () => {
    h.native = true
    h.signIn.mockResolvedValue()
    mount()
    await sendLinkTo('person@example.com')
    expect(text()).toContain('Open it on this phone to finish.')
  })

  it('stays on the email step and explains a refusal that names a wait', async () => {
    h.signIn.mockRejectedValue(new Error('For security purposes, you can only request this after 42 seconds.'))
    mount()
    await sendLinkTo('person@example.com')
    expect(heading()).toBe('Sign in or create an account')
    expect(text()).toContain('We sent a link to this address a moment ago. Check your email, or ask for another in 42 seconds.')
  })

  it('explains any other failure without a dash', async () => {
    h.signIn.mockRejectedValue(new Error('fetch failed'))
    mount()
    await sendLinkTo('person@example.com')
    expect(text()).toContain("Couldn't send the link. Sign-in emails are limited, so wait a minute and try again.")
    expect(text()).not.toMatch(/[–—]/)
  })
})

describe('check your email', () => {
  it('holds Resend for the cooldown, counting down, then sends again', async () => {
    vi.useFakeTimers()
    h.signIn.mockResolvedValue()
    mount()
    await sendLinkTo('person@example.com')
    const resend = () => buttonStarting('Resend link')
    expect(resend().textContent).toBe(`Resend link in ${RESEND_COOLDOWN_SECONDS} seconds`)
    expect(resend().disabled).toBe(true)

    act(() => vi.advanceTimersByTime(59_000))
    expect(resend().textContent).toBe('Resend link in 1 second')
    expect(resend().disabled).toBe(true)

    act(() => vi.advanceTimersByTime(1_000))
    expect(resend().textContent).toBe('Resend link')
    expect(resend().disabled).toBe(false)

    await act(async () => resend().click())
    expect(h.signIn).toHaveBeenCalledTimes(2)
    expect(text()).toContain('A new link is on its way.')
    expect(resend().textContent).toBe(`Resend link in ${RESEND_COOLDOWN_SECONDS} seconds`)
  })

  it('takes the wait Supabase names when a resend is refused', async () => {
    vi.useFakeTimers()
    h.signIn.mockResolvedValueOnce()
    mount()
    await sendLinkTo('person@example.com')
    act(() => vi.advanceTimersByTime(RESEND_COOLDOWN_SECONDS * 1000))
    h.signIn.mockRejectedValueOnce(new Error('For security purposes, you can only request this after 30 seconds.'))
    await act(async () => buttonStarting('Resend link').click())
    expect(text()).toContain('You can ask for another link in 30 seconds.')
    expect(buttonStarting('Resend link').textContent).toBe('Resend link in 30 seconds')
    expect(heading()).toBe('Check your email')
  })

  it('goes back to the email step with the address kept', async () => {
    h.signIn.mockResolvedValue()
    mount()
    await sendLinkTo('typo@example.con')
    await tap('Wrong email? Re-enter it')
    expect(heading()).toBe('Sign in or create an account')
    expect(emailInput().value).toBe('typo@example.con')
  })
})

describe('password view', () => {
  it('reveals a password field, Sign in and Forgot password', async () => {
    mount()
    await tap('Use a password instead')
    expect(passwordInput().getAttribute('autocomplete')).toBe('current-password')
    expect(button('Sign in')).toBeTruthy()
    expect(button('Forgot password?')).toBeTruthy()
    expect(button('New here? Create an account with a password')).toBeTruthy()
  })

  it('signs in with a password, closes and welcomes', async () => {
    h.signInPassword.mockResolvedValue()
    mount()
    await tap('Use a password instead')
    type(emailInput(), 'person@example.com')
    type(passwordInput(), 'correct horse')
    await submit()
    expect(h.signInPassword).toHaveBeenCalledWith('person@example.com', 'correct horse')
    expect(onClose).toHaveBeenCalled()
    expect(h.showWelcome).toHaveBeenCalled()
  })

  it('maps a wrong password to plain words', async () => {
    h.signInPassword.mockRejectedValue(new Error('Invalid login credentials'))
    mount()
    await tap('Use a password instead')
    type(emailInput(), 'person@example.com')
    type(passwordInput(), 'wrong password')
    await submit()
    expect(text()).toContain("That email and password didn't match.")
    expect(onClose).not.toHaveBeenCalled()
  })

  it('offers to resend the confirmation for an unconfirmed account', async () => {
    h.signInPassword.mockRejectedValue(new Error('Email not confirmed'))
    h.resendConfirmation.mockResolvedValue()
    mount()
    await tap('Use a password instead')
    type(emailInput(), 'person@example.com')
    type(passwordInput(), 'correct horse')
    await submit()
    await tap('Resend the email')
    expect(h.resendConfirmation).toHaveBeenCalledWith('person@example.com')
    expect(text()).toContain('A fresh link is on its way to person@example.com.')
  })

  it('sends a reset link from Forgot password', async () => {
    h.resetPassword.mockResolvedValue()
    mount()
    await tap('Use a password instead')
    await tap('Forgot password?')
    expect(heading()).toBe('Reset your password')
    type(emailInput(), 'person@example.com')
    await submit()
    expect(h.resetPassword).toHaveBeenCalledWith('person@example.com')
    expect(text()).toContain('If person@example.com has an account, a reset link is on its way.')
    await tap('← Back to sign in')
    expect(button('Sign in')).toBeTruthy()
  })

  it('returns to the link from Email me a link instead', async () => {
    mount()
    await tap('Use a password instead')
    await tap('Email me a link instead')
    expect(passwordInput()).toBeNull()
    expect(button('Continue')).toBeTruthy()
  })
})

describe('create an account with a password', () => {
  async function openSignup() {
    mount()
    await tap('Use a password instead')
    await tap('New here? Create an account with a password')
  }

  it('asks for a new password and shows its strength', async () => {
    await openSignup()
    expect(heading()).toBe('Create an account with a password')
    expect(passwordInput().getAttribute('autocomplete')).toBe('new-password')
    type(passwordInput(), 'abc')
    expect(text()).toContain('Password strength:')
    expect(button('Create account').disabled).toBe(true)
  })

  it('asks the person to confirm by email', async () => {
    h.signUpPassword.mockResolvedValue('confirm')
    await openSignup()
    type(emailInput(), 'new@example.com')
    type(passwordInput(), 'a long new password')
    await submit()
    expect(h.signUpPassword).toHaveBeenCalledWith('new@example.com', 'a long new password')
    expect(text()).toContain('Almost there. We emailed new@example.com.')
  })

  it('sends an existing address to the password sign-in, without a dash', async () => {
    h.signUpPassword.mockResolvedValue('exists')
    await openSignup()
    type(emailInput(), 'old@example.com')
    type(passwordInput(), 'a long new password')
    await submit()
    expect(button('Sign in')).toBeTruthy()
    expect(text()).toContain('That email already has an account. Sign in with its password')
    expect(text()).not.toMatch(/[–—]/)
  })
})
