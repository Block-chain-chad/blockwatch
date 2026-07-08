import { useState } from 'react'
import { usePrices } from '../state/PricesContext'
import { CloseIcon } from './Icons'

const FLAG = 'bw.tip.premium.v1'

/*
 * The app's single onboarding tooltip (brief: one contextual tip max, shown
 * once, at the moment it's relevant). It explains the premium pill — the one
 * concept a stock person won't already know — and appears only after real
 * pills are on screen.
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
    <div className="mx-4 mb-1 mt-2 flex items-start gap-3 rounded-2xl bg-zinc-900 p-3.5 ring-1 ring-accent/25">
      <p className="flex-1 text-xs leading-relaxed text-zinc-400">
        The pill on each row is the token's gap vs. the real stock —{' '}
        <span className="text-gain">green</span> trades above it,{' '}
        <span className="text-loss">red</span> below, gray is 1:1. Tap any row to see both
        prices charted together.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="mt-0.5 shrink-0 text-zinc-500 transition-colors active:text-zinc-300"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
