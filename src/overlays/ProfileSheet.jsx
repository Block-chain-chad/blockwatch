import { useState } from 'react'
import { useWaitlist } from '../state/WaitlistContext'
import FeedbackSheet from './FeedbackSheet'
import {
  CloseIcon,
  BellIcon,
  GlobeIcon,
  MoonIcon,
  WalletIcon,
  HelpIcon,
} from '../components/Icons'
import { ListRow } from '../components/shared'

export default function ProfileSheet({ onClose, onGoToTrade }) {
  const { entry } = useWaitlist()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  return (
    <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end justify-center">
      <button
        aria-label="Close profile"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />
      <div className="relative w-full rounded-t-3xl bg-zinc-950 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-800" />

        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-base font-semibold text-zinc-300">
              M
            </div>
            <div>
              <div className="font-semibold">Guest</div>
              <div className="text-xs text-zinc-500">No account needed to track</div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <div className="mx-4 mt-4 rounded-2xl bg-zinc-900 p-4">
          {entry ? (
            <>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Trading waitlist</div>
              {entry.position != null ? (
                <div className="mt-1 text-2xl font-semibold tabular-nums text-accent">
                  #{entry.position}
                </div>
              ) : (
                <div className="mt-1 text-lg font-semibold text-accent">Spot reserved</div>
              )}
              <div className="mt-1 text-xs text-zinc-500">
                {entry.position != null
                  ? "You're in line — we'll email you at launch."
                  : 'Saved on this device — position syncs automatically.'}
              </div>
            </>
          ) : (
            <button onClick={onGoToTrade} className="flex w-full items-center justify-between gap-3 text-left">
              <div>
                <div className="text-sm font-semibold">Trading waitlist</div>
                <div className="mt-0.5 text-xs text-zinc-500">Reserve your spot before launch</div>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-zinc-950">
                Join
              </span>
            </button>
          )}
        </div>

        <div className="mt-4 divide-y divide-zinc-900">
          <ListRow icon={<BellIcon size={20} />} label="Notifications" value="On" />
          <ListRow icon={<GlobeIcon size={20} />} label="Display currency" value="USD" />
          <ListRow icon={<MoonIcon size={20} />} label="Appearance" value="Dark" />
          <ListRow icon={<WalletIcon size={20} />} label="Connect wallet" value="Coming soon" muted />
          <ListRow
            icon={<HelpIcon size={20} />}
            label="Help & feedback"
            onClick={() => setFeedbackOpen(true)}
          />
        </div>

        <div className="px-4 pt-3 text-center text-[11px] text-zinc-600">BlockWatch v0.1 · MVP preview</div>
      </div>

      {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}
    </div>
  )
}
