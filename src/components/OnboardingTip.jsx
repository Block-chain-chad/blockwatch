import { useState } from 'react'
import { usePrices } from '../state/PricesContext'
import { CloseIcon } from './Icons'

const FLAG = 'bw.tip.premium.v1'

/*
 * The app's single onboarding tip (brief: one contextual tip max, shown once,
 * at the moment it's relevant). It explains the premium pill — the one concept
 * a stock person won't already know — and appears only once real pills are on
 * screen.
 *
 * It was dropped in "Redesign round one", where the per-row STOCK/TOKEN pairs
 * and this card were both replaced by one printed column header. That header
 * fixed the LABEL — you can see the column is a gap — but not the MEANING:
 * what the colours say, and that a row opens both price lines charted
 * together. A first-time tester on 2026-08-20 got stuck exactly there, so the
 * tip is back, with the objection that removed it taken seriously:
 *
 *   - It is no longer a card. The redesign banned nested surfaces ("not a
 *     single shadow or nested card here"), so this is a hairline caption row
 *     like the session strip above it — about a third of the old height.
 *   - It is still dismiss-once, so the cost lands on the first run only.
 */
export default function OnboardingTip() {
  const { status } = usePrices()
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(FLAG) === '1'
    } catch {
      return true
    }
  })

  if (dismissed || (status !== 'live' && status !== 'stale')) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(FLAG, '1')
    } catch {
      // session-only dismissal is fine
    }
  }

  return (
    <div
      className="mx-4 flex items-start gap-2 border-b pb-2.5 pt-2.5"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-accent" />
      <p className="t-caption flex-1 text-zinc-400">
        The number on each row is the token's gap against the share it tracks.{' '}
        <span className="text-gain">Green</span> trades above it,{' '}
        <span className="text-loss">red</span> trades below it, and gray means they match. Tap any row to see both
        prices charted together.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="-m-2 shrink-0 p-2 text-zinc-500 transition-colors active:text-zinc-300"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  )
}
