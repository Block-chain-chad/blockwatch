import { useState } from 'react'
import Header from '../components/Header'
import { useWaitlist } from '../state/WaitlistContext'
import { track } from '../services/analytics'
import { CheckCircleIcon, GlobeIcon, WalletIcon, BellIcon } from '../components/Icons'

/*
 * Rung one of the trading ladder: BlockWatch doesn't execute trades yet, but
 * the market is open TODAY on external venues — so point honestly at them,
 * and keep the waitlist as the promise of in-app trading to come.
 */

const VENUES = [
  {
    id: 'jupiter',
    name: 'Jupiter',
    href: 'https://jup.ag',
    icon: WalletIcon,
    blurb:
      'On-chain, from your own wallet. Open any asset ending in “x” here and tap Trade on Jupiter — it lands on the exact pair.',
    tag: 'Self-custody',
  },
  {
    id: 'kraken',
    name: 'Kraken',
    href: 'https://www.kraken.com',
    icon: GlobeIcon,
    blurb: 'Exchange trading for xStocks with a Kraken account.',
    tag: 'Not offered in the US',
  },
  {
    id: 'bybit',
    name: 'Bybit',
    href: 'https://www.bybit.com',
    icon: GlobeIcon,
    blurb: 'Exchange trading for xStocks with a Bybit account.',
    tag: 'Not offered in the US',
  },
  {
    id: 'gate',
    name: 'Gate.io',
    href: 'https://www.gate.io',
    icon: GlobeIcon,
    blurb: 'Exchange trading for xStocks with a Gate account.',
    tag: 'Not offered in the US',
  },
  {
    id: 'kucoin',
    name: 'KuCoin',
    href: 'https://www.kucoin.com',
    icon: GlobeIcon,
    blurb: 'Exchange trading for xStocks with a KuCoin account.',
    tag: 'Not offered in the US',
  },
]

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

      <div className="px-4 pt-4">
        <h2 className="text-xl font-semibold tracking-tight">The market is open</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
          Tokenized stocks trade 24/7 on the venues below. In-app trading is
          what we're building — until then, BlockWatch gets you to the right
          place with the right numbers.
        </p>

        <div className="mt-4 space-y-2.5">
          {VENUES.map((v) => (
            <a
              key={v.id}
              href={v.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('trade_out', { venue: v.id })}
              className="flex items-start gap-3 rounded-2xl bg-zinc-900 p-4 transition-colors active:bg-zinc-800"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-accent">
                <v.icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-zinc-100">{v.name} ↗</span>
                  <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                    {v.tag}
                  </span>
                </span>
                <span className="mt-0.5 block text-xs leading-relaxed text-zinc-500">{v.blurb}</span>
              </span>
            </a>
          ))}
        </div>

        <p className="mt-4 rounded-2xl bg-zinc-900/60 p-4 text-xs leading-relaxed text-zinc-500">
          <span className="font-medium text-zinc-300">In the US?</span> Today's
          venues exclude US customers — but regulated tokenized trading is
          rolling out (the SEC approved Nasdaq's version in March 2026). Join
          the waitlist and you'll get one email the moment you can trade here.
        </p>

        {entry ? (
          <div className="mt-4 rounded-2xl bg-zinc-900 p-5">
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
          <form onSubmit={submit} className="mt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
              <BellIcon size={16} className="text-accent" />
              Be first in line for in-app trading
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-accent/60 focus:ring-2"
            />
            <button
              type="submit"
              disabled={busy}
              className="bw-glow mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-60"
            >
              {busy ? 'Joining…' : 'Join the waitlist'}
            </button>
            <p className="mt-3 text-[11px] text-zinc-400">
              No spam — one email when trading goes live.
            </p>
          </form>
        )}

        <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-400">
          External venues are independent services with their own terms and
          regional availability. BlockWatch routes, it never holds funds.
        </p>
      </div>
    </div>
  )
}
