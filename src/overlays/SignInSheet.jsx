import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { useWaitlist } from '../state/WaitlistContext'
import { isNativeApp } from '../lib/platform'

const MIN_PASSWORD = 8

/*
 * Sign in / create account with email + password (the familiar path), with a
 * one-time email link as the passwordless fallback. Forgot-password sends a
 * recovery link; opening it prompts for a new password (see PasswordSheet).
 *
 * NATIVE: password only. An emailed link opens in Safari, not in the app —
 * there is no deep-link handler — so the session would start in the browser
 * and the app would never see it. The magic-link option is therefore hidden
 * on native; password sign-in works identically everywhere. Forgot-password
 * stays (finishing it in Safari is fine, you come back and sign in), but the
 * copy says so instead of implying you'll land back here signed in.
 */
export default function SignInSheet({ onClose }) {
  const { signIn, signInPassword, signUpPassword, resetPassword } = useAuth()
  const { entry } = useWaitlist()
  const [mode, setMode] = useState('signin') // signin | signup
  const [email, setEmail] = useState(entry?.email ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null) // { kind: 'error' | 'sent', text }

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
      } else {
        const result = await signUpPassword(email, password)
        if (result === 'signed-in') {
          onClose()
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
              ? `Almost there — we emailed ${email.trim()}. The link opens in your browser and confirms your account; then come back here and sign in with your password.`
              : `Almost there — we emailed ${email.trim()}. Click the link inside to confirm your account and you'll be signed in.`,
          })
        }
      }
    } catch (err) {
      const msg = String(err?.message ?? '')
      setNote({
        kind: 'error',
        text: msg.includes('Invalid login credentials')
          ? "That email and password didn't match. Try again, or use “Forgot password?”"
          : msg.includes('already registered')
            ? 'That email already has an account — switch to Sign in.'
            : "That didn't work — give it another try in a moment.",
      })
    }
    setBusy(false)
  }

  async function forgot() {
    if (!emailOk || busy) {
      setNote({ kind: 'error', text: 'Type your email above first, then tap Forgot password.' })
      return
    }
    setBusy(true)
    setNote(null)
    try {
      await resetPassword(email)
      setNote({
        kind: 'sent',
        text: native
          ? `Reset link sent to ${email.trim()}. It opens in your browser — set your new password there, then come back here and sign in with it.`
          : `Reset link sent to ${email.trim()} — open it and you'll be asked to set a new password.`,
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
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />

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

        <p className="mt-3 px-1 text-xs leading-relaxed text-zinc-500">
          {mode === 'signin'
            ? 'Your folders and alerts sync to every device you sign in on.'
            : 'One account, every device — your folders and alerts follow you.'}
        </p>

        <form onSubmit={submit}>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-accent/60 focus:ring-2"
          />
          <input
            type="password"
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={mode === 'signin' ? 'Password' : `Password (at least ${MIN_PASSWORD} characters)`}
            className="mt-2 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-accent/60 focus:ring-2"
          />

          {note && (
            <p className={`mt-2 px-1 text-xs leading-relaxed ${note.kind === 'sent' ? 'text-accent' : 'text-zinc-400'}`}>
              {note.text}
            </p>
          )}

          <button
            type="submit"
            disabled={!emailOk || !passwordOk || busy}
            className="bw-glow mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
          >
            {busy ? 'Working…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between px-1 text-xs">
          {mode === 'signin' ? (
            <button onClick={forgot} className="text-zinc-400 transition-colors active:text-zinc-200">
              Forgot password?
            </button>
          ) : (
            <span />
          )}
          {/* Hidden on native: the emailed link opens in Safari, so tapping
              this would send someone to a browser session the app can't see. */}
          {!native && (
            <button onClick={magicLink} className="text-zinc-400 transition-colors active:text-zinc-200">
              Email me a sign-in link instead
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
