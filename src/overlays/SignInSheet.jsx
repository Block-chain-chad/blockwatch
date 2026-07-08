import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import { useWaitlist } from '../state/WaitlistContext'

/* Email magic-link sign-in: type email → click the emailed link → signed in. */
export default function SignInSheet({ onClose }) {
  const { signIn } = useAuth()
  const { entry } = useWaitlist()
  const [email, setEmail] = useState(entry?.email ?? '')
  const [status, setStatus] = useState('idle') // idle | sending | sent | error

  async function submit(e) {
    e.preventDefault()
    if (!email.trim() || status === 'sending') return
    setStatus('sending')
    try {
      await signIn(email)
      setStatus('sent')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />

        {status === 'sent' ? (
          <div className="px-1 py-6 text-center">
            <h2 className="text-base font-semibold">Check your email</h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-500">
              We sent a sign-in link to <span className="text-zinc-300">{email.trim()}</span>.
              Open it on this device and you're in — no password needed.
            </p>
            <button
              onClick={onClose}
              className="mt-5 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="px-1 text-base font-semibold">Sign in</h2>
            <p className="mt-0.5 px-1 text-xs leading-relaxed text-zinc-500">
              Your folders and alerts will sync to every device you sign in on. No password —
              we email you a link.
            </p>
            <input
              autoFocus
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-accent/60 focus:ring-2"
            />
            {status === 'error' && (
              <p className="mt-2 px-1 text-xs text-zinc-400">
                That didn't go through — our fault, not yours. Wait a minute and try again
                (sign-in emails are rate-limited).
              </p>
            )}
            <button
              type="submit"
              disabled={!email.trim() || status === 'sending'}
              className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
            >
              {status === 'sending' ? 'Sending link…' : 'Email me a sign-in link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
