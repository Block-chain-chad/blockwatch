import { useEffect, useId, useRef, useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { useWaitlist } from '../state/WaitlistContext'
import { isNativeApp } from '../lib/platform'
import { passwordStrength } from '../lib/passwordStrength'
import { mapAuthError, retryAfterSeconds, RESEND_COOLDOWN_SECONDS } from '../lib/authErrors'
import { EnvelopeIcon, EyeIcon, EyeOffIcon } from '../components/Icons'
import Sheet, { SheetTitle } from '../components/Sheet'
import { AppleSignInButton, GoogleSignInButton, PasskeySignInButton } from '../components/SocialSignInButtons'
import {
  useFlag,
  SIGN_IN_APPLE_FLAG,
  SIGN_IN_GOOGLE_FLAG,
  SIGN_IN_PASSKEY_FLAG,
} from '../services/featureFlags'
import { isCancelled, signInOptions } from '../services/socialSignIn'
import { isPasskeyCancel, passkeysSupported, startPasskeyAutofill } from '../services/passkeys'

const MIN_PASSWORD = 8

const PROVIDER_NAME = { apple: 'Apple', google: 'Google' }

const seconds = (n) => `${n} ${n === 1 ? 'second' : 'seconds'}`

const LINK =
  'inline-flex min-h-11 items-center px-1 text-[13px] text-zinc-400 transition-colors active:text-zinc-200'
const FIELD =
  'h-12 w-full rounded-xl bg-zinc-900 px-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2'

/*
 * One screen for signing in and creating an account, email first.
 *
 *   email     Apple, Google and passkey where each is switched on (see
 *             services/featureFlags.js and signInOptions in
 *             services/socialSignIn.js), then one email field and Continue.
 *             Continue emails a one-time link that signs the person in, and
 *             creates the account if the address is new.
 *   sent      "Check your email", with a resend that waits out Supabase's
 *             limit, and a way back to fix a mistyped address.
 *   password  The same email field plus a password, for people who have one.
 *   signup    Create an account with a password instead of a link.
 *   forgot    Send a recovery link; opening it asks for a new password (see
 *             PasswordSheet).
 *
 * NATIVE: every emailed link (sign-in, confirm, reset) points straight at
 * /auth/confirm with a one-time token hash, so it works on any device and
 * opens the iOS app through Universal Links. See services/authLinks.js.
 */
export default function SignInSheet({ onClose }) {
  const {
    signIn,
    signInPassword,
    signUpPassword,
    resetPassword,
    showWelcome,
    resendConfirmation,
    signInWithProvider,
    signInPasskey,
  } = useAuth()
  const { entry } = useWaitlist()
  const [view, setView] = useState('email') // email | sent | password | signup | forgot
  const [email, setEmail] = useState(entry?.email ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null) // { kind: 'error' | 'sent', text, action? }
  const [showPw, setShowPw] = useState(false)
  // Resend cooldown, as a deadline so a backgrounded tab still counts true.
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(0)
  const emailId = useId()
  const passwordId = useId()

  const emailOk = /\S+@\S+\.\S+/.test(email)
  const passwordOk = password.length >= MIN_PASSWORD
  const native = isNativeApp()
  const options = signInOptions({
    native,
    appleOn: useFlag(SIGN_IN_APPLE_FLAG),
    googleOn: useFlag(SIGN_IN_GOOGLE_FLAG),
    passkeyOn: useFlag(SIGN_IN_PASSKEY_FLAG),
    passkeySupported: passkeysSupported(),
  })
  const anyQuick = options.apple || options.google || options.passkey
  // Passkey autofill: while a sign-in view is open, the browser may list
  // saved passkeys in the email field's suggestions. Aborted when the sheet
  // closes, the view changes, or the passkey button takes over.
  const autofill = useRef(null)
  const autofillOn = options.passkey && (view === 'email' || view === 'password')

  const waitSeconds = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const cooling = view === 'sent' && waitSeconds > 0

  useEffect(() => {
    if (!autofillOn) return undefined
    const controller = new AbortController()
    autofill.current = controller
    startPasskeyAutofill(controller.signal).then((signedIn) => {
      if (!signedIn || controller.signal.aborted) return
      onClose()
      showWelcome()
    })
    return () => controller.abort()
    // onClose and showWelcome are stable for the life of the sheet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autofillOn])

  useEffect(() => {
    if (!cooling) return undefined
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [cooling])

  function startCooldown(wait) {
    const t = Date.now()
    setNow(t)
    setResendAt(t + wait * 1000)
  }

  function go(next) {
    setView(next)
    setNote(null)
  }

  async function withProvider(provider) {
    if (busy) return
    setBusy(true)
    setNote(null)
    try {
      await signInWithProvider(provider)
      // The web flow has left the page by now; only the app gets here.
      if (native) {
        onClose()
        showWelcome()
      }
    } catch (err) {
      if (!isCancelled(err)) {
        setNote({ kind: 'error', text: `Couldn't sign in with ${PROVIDER_NAME[provider]}. Try again, or use your email.` })
      }
      setBusy(false)
    }
  }

  async function withPasskey() {
    if (busy) return
    autofill.current?.abort()
    setBusy(true)
    setNote(null)
    try {
      await signInPasskey()
      onClose()
      showWelcome()
    } catch (err) {
      if (!isPasskeyCancel(err)) {
        setNote({ kind: 'error', text: "Couldn't sign in with a passkey. Try again, or use your email." })
      }
      setBusy(false)
    }
  }

  /** Email a one-time sign-in link. Supabase creates the account if the address is new. */
  async function sendLink({ resend }) {
    if (!emailOk || busy) return
    setBusy(true)
    setNote(null)
    try {
      await signIn(email)
      startCooldown(RESEND_COOLDOWN_SECONDS)
      setView('sent')
      if (resend) setNote({ kind: 'sent', text: 'A new link is on its way.' })
    } catch (err) {
      const wait = retryAfterSeconds(err?.message)
      if (wait) {
        startCooldown(wait)
        setNote({
          kind: 'error',
          text: resend
            ? `You can ask for another link in ${seconds(wait)}.`
            : `We sent a link to this address a moment ago. Check your email, or ask for another in ${seconds(wait)}.`,
        })
      } else {
        setNote({ kind: 'error', text: "Couldn't send the link. Sign-in emails are limited, so wait a minute and try again." })
      }
    }
    setBusy(false)
  }

  async function submitPassword(e) {
    e.preventDefault()
    if (!emailOk || !passwordOk || busy) return
    setBusy(true)
    setNote(null)
    try {
      if (view === 'password') {
        await signInPassword(email, password)
        onClose()
        showWelcome()
      } else {
        const result = await signUpPassword(email, password)
        if (result === 'signed-in') {
          onClose()
          showWelcome()
        } else if (result === 'exists') {
          setView('password')
          setNote({
            kind: 'error',
            text: 'That email already has an account. Sign in with its password, or use “Forgot password?” to set one.',
          })
        } else {
          setNote({
            kind: 'sent',
            text: native
              ? `Almost there. We emailed ${email.trim()}. Tap the link on this phone and the app will open with you signed in.`
              : `Almost there. We emailed ${email.trim()}. Open the link inside to confirm your account and you'll be signed in.`,
          })
        }
      }
    } catch (err) {
      const mapped = mapAuthError(err?.message)
      setNote({ kind: 'error', text: mapped.text, action: mapped.action })
    }
    setBusy(false)
  }

  async function submitForgot(e) {
    e.preventDefault()
    if (!emailOk || busy) return
    setBusy(true)
    setNote(null)
    try {
      await resetPassword(email)
      setNote({
        kind: 'sent',
        text: native
          ? `If ${email.trim()} has an account, a reset link is on its way. Tap it on this phone and the app will ask for your new password.`
          : `If ${email.trim()} has an account, a reset link is on its way. Open it and you'll be asked to set a new password.`,
      })
    } catch {
      setNote({ kind: 'error', text: "Couldn't send the reset email. Wait a minute and try again." })
    }
    setBusy(false)
  }

  async function resendConfirmationEmail() {
    setBusy(true)
    try {
      await resendConfirmation(email)
      setNote({ kind: 'sent', text: `A fresh link is on its way to ${email.trim()}.` })
    } catch {
      setNote({
        kind: 'error',
        text: "Couldn't resend just now. Confirmation emails are limited, so wait a minute and try again.",
      })
    }
    setBusy(false)
  }

  const noteView = note && (
    <div className="mt-2 px-1" aria-live="polite">
      <p className={`text-xs leading-relaxed ${note.kind === 'sent' ? 'text-accent' : 'text-zinc-400'}`}>{note.text}</p>
      {note.action === 'resend' && (
        <button
          type="button"
          disabled={busy}
          onClick={resendConfirmationEmail}
          className="inline-flex min-h-11 items-center text-xs font-medium text-accent disabled:opacity-40"
        >
          Resend the email
        </button>
      )}
    </div>
  )

  const emailField = (
    <>
      <label htmlFor={emailId} className="block px-1 text-xs font-medium text-zinc-400">
        Email
      </label>
      <input
        id={emailId}
        type="email"
        required
        autoComplete={autofillOn ? 'username webauthn' : 'email'}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        className={`mt-1.5 ${FIELD}`}
      />
    </>
  )

  if (view === 'sent') {
    return (
      <Sheet onClose={onClose} className="z-[55]">
        <div className="flex flex-col items-center px-2 pt-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-accent">
            <EnvelopeIcon size={26} />
          </div>
          <SheetTitle className="mt-4 text-2xl font-semibold text-zinc-100">Check your email</SheetTitle>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            We sent a sign-in link to <span className="font-medium text-zinc-200">{email.trim()}</span>. Open it on{' '}
            {native ? 'this phone' : 'this device'} to finish.
          </p>
          {noteView}
          <button
            type="button"
            onClick={() => sendLink({ resend: true })}
            disabled={busy || cooling}
            className="mt-5 h-12 w-full rounded-xl bg-zinc-900 text-sm font-medium text-zinc-200 transition-colors active:bg-zinc-800 disabled:opacity-50"
          >
            {busy ? 'Sending…' : cooling ? `Resend link in ${seconds(waitSeconds)}` : 'Resend link'}
          </button>
          <button type="button" onClick={() => go('email')} className={`mt-1 ${LINK}`}>
            Wrong email? Re-enter it
          </button>
        </div>
      </Sheet>
    )
  }

  if (view === 'forgot') {
    return (
      <Sheet onClose={onClose} className="z-[55]">
        <button type="button" onClick={() => go('password')} className={LINK}>
          ← Back to sign in
        </button>
        <SheetTitle className="mt-1 px-1 text-lg font-semibold text-zinc-100">Reset your password</SheetTitle>
        <p className="mt-1 px-1 text-xs text-zinc-500">
          Enter your account email and we'll send a link to set a new password.
        </p>
        <form onSubmit={submitForgot} className="mt-4">
          {emailField}
          {noteView}
          <button
            type="submit"
            disabled={!emailOk || busy}
            className="mt-3 h-12 w-full rounded-xl bg-accent text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
          >
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      </Sheet>
    )
  }

  const signup = view === 'signup'
  const primary = {
    email: busy ? 'Sending…' : 'Continue',
    password: busy ? 'Signing in…' : 'Sign in',
    signup: busy ? 'Creating…' : 'Create account',
  }[view]

  return (
    <Sheet onClose={onClose} className="z-[55]">
      <SheetTitle className="px-1 text-lg font-semibold text-zinc-100">
        {signup ? 'Create an account with a password' : 'Sign in or create an account'}
      </SheetTitle>
      <p className="mt-1 px-1 text-xs leading-relaxed text-zinc-500">
        Your folders and alerts sync to every device you sign in on.
      </p>

      {anyQuick && (
        <div className="mt-4 space-y-2">
          {options.apple && <AppleSignInButton onClick={() => withProvider('apple')} disabled={busy} />}
          {options.google && <GoogleSignInButton onClick={() => withProvider('google')} disabled={busy} />}
          {options.passkey && <PasskeySignInButton onClick={withPasskey} disabled={busy} />}
          <div className="flex items-center gap-3 pt-2 text-xs text-zinc-500">
            <span className="h-px flex-1 bg-zinc-800" />
            Or continue with email
            <span className="h-px flex-1 bg-zinc-800" />
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          if (view !== 'email') return submitPassword(e)
          e.preventDefault()
          return sendLink({ resend: false })
        }}
        className="mt-4"
      >
        {emailField}
        {view !== 'email' && (
          <>
            <label htmlFor={passwordId} className="mt-3 block px-1 text-xs font-medium text-zinc-400">
              Password
            </label>
            <div className="relative mt-1.5">
              <input
                id={passwordId}
                type={showPw ? 'text' : 'password'}
                required
                autoComplete={signup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={signup ? `At least ${MIN_PASSWORD} characters` : ''}
                className={`${FIELD} pr-12`}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 active:text-zinc-300"
              >
                {showPw ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
              </button>
            </div>
          </>
        )}
        {signup && password.length > 0 && (
          <p
            className={`mt-1.5 px-1 text-xs ${
              {
                dim: 'text-zinc-500',
                warn: 'text-amber-500',
                okay: 'text-zinc-400',
                good: 'text-accent',
              }[passwordStrength(password).tone]
            }`}
          >
            Password strength: {passwordStrength(password).label}
          </p>
        )}

        {noteView}

        <button
          type="submit"
          disabled={view === 'email' ? !emailOk || busy : !emailOk || !passwordOk || busy}
          className="mt-3 h-12 w-full rounded-xl bg-accent text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
        >
          {primary}
        </button>
      </form>

      {view === 'email' && (
        <div className="mt-1 flex justify-center">
          <button type="button" onClick={() => go('password')} className={LINK}>
            Use a password instead
          </button>
        </div>
      )}
      {view === 'password' && (
        <>
          <div className="mt-1 flex items-center justify-between">
            <button type="button" onClick={() => go('forgot')} className={LINK}>
              Forgot password?
            </button>
            <button type="button" onClick={() => go('email')} className={LINK}>
              Email me a link instead
            </button>
          </div>
          <div className="flex justify-center">
            <button type="button" onClick={() => go('signup')} className={LINK}>
              New here? Create an account with a password
            </button>
          </div>
        </>
      )}
      {signup && (
        <div className="mt-1 flex items-center justify-between">
          <button type="button" onClick={() => go('password')} className={LINK}>
            Have a password? Sign in
          </button>
          <button type="button" onClick={() => go('email')} className={LINK}>
            Email me a link instead
          </button>
        </div>
      )}
    </Sheet>
  )
}
