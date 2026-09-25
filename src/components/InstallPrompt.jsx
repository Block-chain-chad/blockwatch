import { useEffect, useState } from 'react'
import { CloseIcon, ShareIcon } from './Icons'
import { track } from '../services/analytics'
import { isNativeApp } from '../lib/platform'
import { browserInstallContext, shouldOfferInstall } from '../lib/installPrompt'

const FLAG = 'bw.tip.install.v1'

// install_prompt_shown counts page loads that showed the row, not mounts:
// Home unmounts and remounts on every tab switch (App.jsx), and counting each
// of those would inflate the number the day-2 question divides by.
let shownThisLoad = false

function alreadyDismissed() {
  try {
    return localStorage.getItem(FLAG) === '1'
  } catch {
    // No storage: treat it as dismissed rather than nag on every visit.
    return true
  }
}

/*
 * One line telling iPhone Safari users how to put OnStock on their Home
 * Screen, so coming back is one tap instead of a typed address. Safari has
 * no install prompt of its own, and this is the only way a web visitor gets
 * an icon. Same shape and dismiss-once rule as OnboardingTip: a hairline
 * caption row, not a card, and gone for good once closed.
 *
 * Share sits in the toolbar on older iPhones; Safari's compact layout on
 * iOS 26 moves it under the ··· menu, so the copy names both.
 *
 * Who sees it is decided in lib/installPrompt.js: Safari on iOS, in a normal
 * tab, not in the native app. Everyone else renders nothing.
 */
export default function InstallPrompt() {
  const [visible, setVisible] = useState(
    () =>
      !alreadyDismissed() &&
      shouldOfferInstall({ ...browserInstallContext(), native: isNativeApp() }),
  )

  useEffect(() => {
    if (!visible || shownThisLoad) return
    shownThisLoad = true
    track('install_prompt_shown')
  }, [visible])

  if (!visible) return null

  function dismiss() {
    setVisible(false)
    track('install_prompt_dismissed')
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
        Open OnStock in one tap: tap Share{' '}
        <ShareIcon size={14} className="inline-block -translate-y-px align-middle text-zinc-300" /> (under
        ··· on newer iPhones), then Add to Home Screen.
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
