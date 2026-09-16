import { useState } from 'react'
import Header from '../components/Header'
import { useWaitlist } from '../state/WaitlistContext'
import { track } from '../services/analytics'
import { useFlag, LINK_OUT_FLAG, LINK_OUT_PAUSED_LINE } from '../services/featureFlags'
import { CheckCircleIcon, WalletIcon, BellIcon } from '../components/Icons'

/*
 * Rung one of the trading ladder: OnStock doesn't execute trades yet, but
 * the market is open TODAY on external venues — so point honestly at them,
 * and keep the waitlist as the promise of in-app trading to come.
 */

/*
 * Two tiers, because they are not equivalent options.
 *
 * Five venues used to render as five identical cards, four of them saying
 * "Not offered in the US" — so a screen whose whole job is routing someone
 * somewhere they can actually trade gave equal visual weight to four places
 * they cannot. The one that works now leads; the rest are a compact list with
 * their restriction stated once as a heading instead of repeated four times.
 */
const PRIMARY = {
  id: 'jupiter',
  name: 'Jupiter',
  href: 'https://jup.ag',
  icon: WalletIcon,
  blurb:
    'On-chain, from your own wallet. Open any asset ending in “x” and tap Trade on Jupiter — it lands on the exact pair.',
  tag: 'Self-custody',
}

const RESTRICTED = [
  { id: 'kraken', name: 'Kraken', href: 'https://www.kraken.com' },
  { id: 'bybit', name: 'Bybit', href: 'https://www.bybit.com' },
  { id: 'gate', name: 'Gate.io', href: 'https://www.gate.io' },
  { id: 'kucoin', name: 'KuCoin', href: 'https://www.kucoin.com' },
]

export default function Trade({ onOpenProfile }) {
  const { entry, join } = useWaitlist()
  // The Jupiter card answers to the same switch as the per-asset link-outs.
  // It carries no availability claim: the venue's own terms decide who may
  // use it, and the footer says so.
  const linkOutOn = useFlag(LINK_OUT_FLAG)
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
        <h2 className="t-title">The market is open</h2>
        <p className="t-body mt-1.5 text-zinc-400">
          Tokenized stocks trade 24/7 on the venues below. In-app trading is
          what we're building — until then, OnStock gets you to the right
          place with the right numbers.
        </p>

        {/* The on-chain route, led because it is the one OnStock can link
            straight to the pair — unless it is switched off, in which case say
            so rather than leaving a gap above the restricted list. */}
        {!linkOutOn && (
          <p
            className="t-caption mt-4 rounded-lg border p-4 text-zinc-400"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {LINK_OUT_PAUSED_LINE} We're reviewing where we can point people.
          </p>
        )}
        {linkOutOn && (
          <a
            href={PRIMARY.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('trade_out', { venue: PRIMARY.id })}
            className="mt-4 flex items-start gap-3 rounded-lg border p-4 transition-colors active:bg-zinc-900"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-accent">
              <PRIMARY.icon size={18} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="t-label text-zinc-100">{PRIMARY.name} ↗</span>
                <span className="t-micro rounded-full bg-zinc-800 px-2 py-0.5 text-zinc-400">
                  {PRIMARY.tag}
                </span>
              </span>
              <span className="t-caption mt-1 block text-zinc-500">{PRIMARY.blurb}</span>
            </span>
          </a>
        )}

        {/* The four exchanges that say in their own terms they do not serve US
            customers — stated once as a heading instead of four times. The
            heading describes THESE four and nothing above it. */}
        <h3 className="t-micro mt-6 text-zinc-500">Not offered in the US</h3>
        <div className="mt-1.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          {RESTRICTED.map((v) => (
            <a
              key={v.id}
              href={v.href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('trade_out', { venue: v.id })}
              className="hover-row flex items-center justify-between border-b py-2.5 transition-colors active:bg-zinc-900"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="t-label text-zinc-400">{v.name}</span>
              <span className="t-caption text-zinc-500">Exchange · xStocks ↗</span>
            </a>
          ))}
        </div>

        <p className="t-caption mt-5 text-zinc-500">
          <span className="font-medium text-zinc-300">In the US?</span> Those four
          exclude US customers. Join the waitlist and you'll get one email the
          moment in-app trading opens.
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
                : `${entry.email} — we'll email you when in-app trading opens.`}
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
              className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-60"
            >
              {busy ? 'Joining…' : 'Join the waitlist'}
            </button>
            <p className="mt-3 text-[11px] text-zinc-400">
              No spam — one email when trading goes live.
            </p>
          </form>
        )}

        {/* Kept out of the waitlist paragraph on purpose. The approval is real
            but it is about a registered exchange and registered securities,
            not about the tokens OnStock tracks — placed next to "Join the
            waitlist" it read as regulatory momentum behind OnStock. */}
        <div
          className="mt-8 border-t pt-4"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <p className="text-[11px] leading-relaxed text-zinc-500">
            <span className="font-medium text-zinc-400">Elsewhere in the market:</span>{' '}
            on March 18, 2026 the SEC approved a Nasdaq rule change allowing Nasdaq
            to trade registered securities in tokenized form during the DTC pilot
            program. That is a separate market from the tokens OnStock tracks, and
            it is not an approval of OnStock or of any venue listed above.
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] leading-relaxed text-zinc-400">
          External venues are independent services with their own terms and
          regional availability. OnStock routes, it never holds funds.
        </p>
      </div>
    </div>
  )
}
