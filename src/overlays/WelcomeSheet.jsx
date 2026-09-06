import { useAuth } from '../state/AuthContext'
import { useFolders } from '../state/FoldersContext'
import { useAlerts } from '../state/AlertsContext'
import { CheckCircleIcon } from '../components/Icons'
import Sheet, { SheetTitle } from '../components/Sheet'

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
  const pluralSubject = assetCount !== 1 || alertCount > 0

  const expired = variant === 'expired'
  return (
    <Sheet onClose={onClose} className="z-[60]">
      {expired ? (
        <div className="px-1 py-4 text-center">
          <SheetTitle className="text-base font-semibold">That link has expired</SheetTitle>
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
          <SheetTitle className="mt-3 text-base font-semibold">You're in</SheetTitle>
          {user?.email && <p className="mt-0.5 text-sm text-zinc-400">{user.email}</p>}
          <p className="mt-2 text-sm text-zinc-500">
            {assetCount > 0
              ? `Your ${assetCount} tracked ${assetCount === 1 ? 'asset' : 'assets'}${
                  alertCount > 0 ? ` and ${alertCount} ${alertCount === 1 ? 'alert' : 'alerts'}` : ''
                } now ${pluralSubject ? 'sync' : 'syncs'} to any device you sign in on.`
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
    </Sheet>
  )
}
