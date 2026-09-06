import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { useWaitlist } from '../state/WaitlistContext'
import { isNativeApp } from '../lib/platform'
import { passwordStrength } from '../lib/passwordStrength'
import { mapAuthError } from '../lib/authErrors'
import { EyeIcon, EyeOffIcon } from '../components/Icons'
import Sheet, { SheetTitle } from '../components/Sheet'

const MIN_PASSWORD = 8

/*
 * Sign in / create account with email + password (the familiar path), with a
 * one-time email link as the passwordless fallback. Forgot-password sends a
 * recovery link; opening it prompts for a new password (see PasswordSheet).
 *
 * NATIVE: emailed links (magic, confirm, reset) open the app directly via
 * Universal Links — see services/authLinks.js. The magic-link option is
 * therefore available everywhere.
 */
export default function SignInSheet({ onClose }) {
  const { signIn, signInPassword, signUpPassword, resetPassword, showWelcome, resendConfirmation } =
    useAuth()
  const { entry } = useWaitlist()
  const [mode, setMode] = useState('signin') // signin | signup | forgot
  const [email, setEmail] = useState(entry?.email ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null) // { kind: 'error' | 'sent', text }
  const [showPw, setShowPw] = useState(false)

  const emailOk = /\S+@\S+\.\S+/.test(email)
  const passwordOk = password.length >= MIN_PASSWORD
  // Evaluated once per render; false in every browser, so the web UI is
  // byte-identical to what it was.
  const native = isNativeApp()

  async function submit(e) {
    e.preventDefault()
    if (!emailOk || !passwordOk || busy) return
    setBusy(true)
    setNote(null)
    try {
      if (mode === 'signin') {
        await signInPassword(email, password)
        onClose()
        showWelcome()
      } else {
        const result = await signUpPassword(email, password)
        if (result === 'signed-in') {
          onClose()
          showWelcome()
        } else if (result === 'exists') {
          setMode('signin')
          setNote({
            kind: 'error',
            text: 'That email already has an account — sign in with its password, or use “Forgot password?” to set one.',
          })
        } else {
          setNote({
            kind: 'sent',
            text: native
              ? `Almost there — we emailed ${email.trim()}. Tap the link on this phone and the app will open with you signed in.`
              : `Almost there — we emailed ${email.trim()}. Click the link inside to confirm your account and you'll be signed in.`,
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
          ? `If ${email.trim()} has an account, a reset link is on its way. Tap it on this phone — the app opens and asks for your new password.`
          : `If ${email.trim()} has an account, a reset link is on its way — open it and you'll be asked to set a new password.`,
      })
    } catch {
      setNote({ kind: 'error', text: "Couldn't send the reset email — wait a minute and try again." })
    }
    setBusy(false)
  }

  async function magicLink() {
    if (!emailOk || busy) {
      setNote({ kind: 'error', text: 'Type your email above first.' })
      return
    }
    setBusy(true)
    setNote(null)
    try {
      await signIn(email)
      setNote({ kind: 'sent', text: `Sign-in link sent to ${email.trim()} — open it on this device and you're in, no password needed.` })
    } catch {
      setNote({ kind: 'error', text: "Couldn't send the link — wait a minute and try again (sign-in emails are rate-limited)." })
    }
    setBusy(false)
  }

  return (
    <Sheet
      onClose={onClose}
      className="z-[55]"
      // Only the forgot view has a heading; the other two are named by their tab.
      label={mode === 'forgot' ? undefined : mode === 'signin' ? 'Sign in' : 'Create account'}
    >
      {mode === 'forgot' ? (
        <button
          onClick={() => {
            setMode('signin')
            setNote(null)
          }}
          className="text-xs text-zinc-400 transition-colors active:text-zinc-200"
        >
          ← Back to sign in
        </button>
      ) : (
        <div className="flex rounded-xl bg-zinc-900 p-1">
          {[
            { id: 'signin', label: 'Sign in' },
            { id: 'signup', label: 'Create account' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setMode(t.id)
                setNote(null)
              }}
              className={`flex-1 rounded-lg py-2 text-[13px] font-medium transition-colors ${
                mode === t.id ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {mode === 'forgot' ? (
        <>
          <SheetTitle className="mt-3 px-1 text-base font-semibold">Reset your password</SheetTitle>
          <p className="mt-0.5 px-1 text-xs text-zinc-500">
            Enter your account email and we'll send a link to set a new password.
          </p>
        </>
      ) : (
        <p className="mt-3 px-1 text-xs leading-relaxed text-zinc-500">
          {mode === 'signin'
            ? 'Your folders and alerts sync to every device you sign in on.'
            : 'One account, every device — your folders and alerts follow you.'}
        </p>
      )}

      <form onSubmit={mode === 'forgot' ? submitForgot : submit}>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
        />
        {mode !== 'forgot' && (
          <div className="relative mt-2">
            <input
              type={showPw ? 'text' : 'password'}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signin' ? 'Password' : `Password (at least ${MIN_PASSWORD} characters)`}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 pr-12 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
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
        )}
        {mode === 'signup' && password.length > 0 && (
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

        {note && (
          <div className="mt-2 px-1">
            <p className={`text-xs leading-relaxed ${note.kind === 'sent' ? 'text-accent' : 'text-zinc-400'}`}>
              {note.text}
            </p>
            {note.action === 'resend' && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await resendConfirmation(email)
                    setNote({ kind: 'sent', text: `A fresh link is on its way to ${email.trim()}.` })
                  } catch {
                    setNote({
                      kind: 'error',
                      text: "Couldn't resend just now — confirmation emails are rate-limited, wait a minute and try again.",
                    })
                  }
                  setBusy(false)
                }}
                className="mt-1 text-xs font-medium text-accent disabled:opacity-40"
              >
                Resend the email
              </button>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={mode === 'forgot' ? !emailOk || busy : !emailOk || !passwordOk || busy}
          className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
        >
          {mode === 'forgot'
            ? busy
              ? 'Sending…'
              : 'Send reset link'
            : busy
              ? 'Working…'
              : mode === 'signin'
                ? 'Sign in'
                : 'Create account'}
        </button>
      </form>

      {mode !== 'forgot' && (
        <div className="mt-3 flex items-center justify-between px-1 text-xs">
          {mode === 'signin' ? (
            <button
              onClick={() => {
                setMode('forgot')
                setNote(null)
              }}
              className="text-zinc-400 transition-colors active:text-zinc-200"
            >
              Forgot password?
            </button>
          ) : (
            <span />
          )}
          <button onClick={magicLink} className="text-zinc-400 transition-colors active:text-zinc-200">
            Email me a sign-in link instead
          </button>
        </div>
      )}
    </Sheet>
  )
}
