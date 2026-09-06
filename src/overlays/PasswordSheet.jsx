import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import Sheet, { SheetTitle } from '../components/Sheet'

const MIN_PASSWORD = 8

/*
 * Set a new password — used both from the profile ("Change password") and
 * when arriving via a password-recovery email link (recovery mode).
 */
export default function PasswordSheet({ recoveryMode = false, onClose }) {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('idle') // idle | done | error

  async function submit(e) {
    e.preventDefault()
    if (password.length < MIN_PASSWORD || busy) return
    setBusy(true)
    try {
      await updatePassword(password)
      setStatus('done')
    } catch {
      setStatus('error')
    }
    setBusy(false)
  }

  return (
    <Sheet onClose={onClose} className="z-[60]">
      {status === 'done' ? (
        <div className="px-1 py-4 text-center">
          <SheetTitle className="text-base font-semibold">Password updated ✓</SheetTitle>
          <p className="mt-1 text-sm text-zinc-500">Use it next time you sign in.</p>
          <button
            onClick={onClose}
            className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <SheetTitle className="px-1 text-base font-semibold">
            {recoveryMode ? 'Set a new password' : 'Change password'}
          </SheetTitle>
          <p className="mt-0.5 px-1 text-xs text-zinc-500">
            {recoveryMode
              ? "You're signed in via your recovery link — choose the new password now."
              : 'Takes effect immediately on your next sign-in.'}
          </p>
          <input
            autoFocus
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={`New password (at least ${MIN_PASSWORD} characters)`}
            className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
          />
          {status === 'error' && (
            <p className="mt-2 px-1 text-xs text-zinc-400">
              That didn't save — give it another try in a moment.
            </p>
          )}
          <button
            type="submit"
            disabled={password.length < MIN_PASSWORD || busy}
            className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
          >
            {busy ? 'Saving…' : 'Save password'}
          </button>
        </form>
      )}
    </Sheet>
  )
}
