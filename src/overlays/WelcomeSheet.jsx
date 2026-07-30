import { useAuth } from '../state/AuthContext'
import { useFolders } from '../state/FoldersContext'
import { useAlerts } from '../state/AlertsContext'
import { CheckCircleIcon } from '../components/Icons'

/*
 * The proof-of-reality moment. Signing in used to close a sheet and change
 * one avatar letter; testers read that as fake. This surface states what
 * just happened and what the account now does, with the user's real data.
 *
 * variant 'success': session just started from a user action (email link,
 * password sign-in, magic link). variant 'expired': the emailed link was
 * dead — say so honestly and point at the fix, never a blank screen.
 */
export default function WelcomeSheet({ variant, onClose, onOpenSignIn }) {
  const { user } = useAuth()
  const { watchlistIds, folders } = useFolders()
  const { rules } = useAlerts()

  const assetCount = new Set([...watchlistIds, ...folders.flatMap((f) => f.assetIds ?? [])]).size
  const alertCount = Object.keys(rules).filter((id) => rules[id]?.drift || rules[id]?.price).length

  const expired = variant === 'expired'
  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />

        {expired ? (
          <div className="px-1 py-4 text-center">
            <h2 className="text-base font-semibold">That link has expired</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Email links are single-use and short-lived. Request a fresh one from the sign-in screen.
            </p>
            <button
              onClick={() => {
                onClose()
                onOpenSignIn()
              }}
              className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
            >
              Open sign in
            </button>
          </div>
        ) : (
          <div className="px-1 py-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <CheckCircleIcon size={28} />
            </span>
            <h2 className="mt-3 text-base font-semibold">You're in</h2>
            {user?.email && <p className="mt-0.5 text-sm text-zinc-400">{user.email}</p>}
            <p className="mt-2 text-sm text-zinc-500">
              {assetCount > 0
                ? `Your ${assetCount} tracked ${assetCount === 1 ? 'asset' : 'assets'}${
                    alertCount > 0 ? ` and ${alertCount} ${alertCount === 1 ? 'alert' : 'alerts'}` : ''
                  } now sync to any device you sign in on.`
                : 'Anything you track or set an alert on now syncs to any device you sign in on.'}
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
