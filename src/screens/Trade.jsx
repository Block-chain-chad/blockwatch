import { useState } from 'react'
import Header from '../components/Header'
import { useWaitlist } from '../state/WaitlistContext'
import { LockIcon, CheckCircleIcon } from '../components/Icons'

export default function Trade({ onOpenProfile }) {
  const { entry, join } = useWaitlist()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!email.trim() || busy) return
    setBusy(true)
    await join(email)
    setBusy(false)
  }

  return (
    <div className="pb-24">
      <Header title="Trade" onOpenProfile={onOpenProfile} />

      <div className="flex flex-col items-center px-6 pt-10 text-center">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-400">
          <LockIcon size={28} />
          <span className="absolute -right-2 -top-2 rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-950">
            soon
          </span>
        </div>

        <h2 className="mt-5 text-xl font-semibold tracking-tight">Trading is coming</h2>
        <p className="mt-2 max-w-[260px] text-sm leading-relaxed text-zinc-400">
          Buy and sell tokenized stocks right where you already track them.
        </p>

        {entry ? (
          <div className="mt-8 w-full max-w-xs rounded-2xl bg-zinc-900 p-5 text-left">
            <div className="flex items-center gap-2">
              <CheckCircleIcon size={22} className="text-accent" />
              <span className="text-lg font-semibold">You're on the list</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              {entry.pendingSync
                ? `${entry.email} is saved on this device. We couldn't reach the waitlist server just now — we'll finish signing you up automatically.`
                : `${entry.email} — we'll email you the moment trading opens.`}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-8 w-full max-w-xs">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-accent/60 focus:ring-2"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-60"
            >
              {busy ? 'Joining…' : 'Join the waitlist'}
            </button>
            <p className="mt-3 text-[11px] text-zinc-600">
              No spam — one email when trading goes live.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
