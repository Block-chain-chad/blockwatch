import { useAuth } from '../state/AuthContext'
import { useFolders } from '../state/FoldersContext'
import { useAlerts } from '../state/AlertsContext'
import { CheckCircleIcon } from '../components/Icons'
import Sheet, { SheetTitle } from '../components/Sheet'
import { usePasskeyOffer } from '../hooks/usePasskeyOffer'
import { passkeyName } from '../services/passkeys'

/*
 * The proof-of-reality moment. Signing in used to close a sheet and change
 * one avatar letter; testers read that as fake. This surface states what
 * just happened and what the account now does, with the user's real data.
 *
 * variant 'success': session just started from a user action (email link,
 * password sign-in, magic link, Apple, Google, passkey). variant 'expired':
 * the emailed link was dead, so say so honestly and point at the fix, never
 * a blank screen. variant 'failed': a web sign-in with Apple or Google came
 * back without a session. variant 'other-browser': an emailed link was opened
 * in a different browser from the one that asked for it, so its one-time code
 * cannot be redeemed here.
 *
 * After a success it also carries the one-time offer to add Face ID (a
 * passkey) for next time; see hooks/usePasskeyOffer.js.
 */
export default function WelcomeSheet({ variant, onClose, onOpenSignIn }) {
  const { user } = useAuth()
  const { watchlistIds, folders } = useFolders()
  const { rules } = useAlerts()

  const assetCount = new Set([...watchlistIds, ...folders.flatMap((f) => f.assetIds ?? [])]).size
  const alertCount = Object.keys(rules).filter((id) => rules[id]?.drift || rules[id]?.price).length
  const pluralSubject = assetCount !== 1 || alertCount > 0

  const expired = variant === 'expired'
  const failed = variant === 'failed'
  const otherBrowser = variant === 'other-browser'
  const offer = usePasskeyOffer(user, variant === 'success')
  const unlock = passkeyName(
    typeof navigator === 'undefined' ? '' : navigator.userAgent,
    typeof navigator === 'undefined' ? 0 : navigator.maxTouchPoints,
  )
  return (
    <Sheet onClose={onClose} className="z-[60]">
      {otherBrowser ? (
        <div className="px-1 py-4 text-center">
          <SheetTitle className="text-base font-semibold">Open the link where you asked for it</SheetTitle>
          <p className="mt-1 text-sm text-zinc-500">
            For your security, a sign-in link only works in the browser that requested it. Send a new
            link from here and open it on this device.
          </p>
          <button
            onClick={() => {
              onClose()
              onOpenSignIn()
            }}
            className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
          >
            Send a new link
          </button>
        </div>
      ) : failed ? (
        <div className="px-1 py-4 text-center">
          <SheetTitle className="text-base font-semibold">Sign-in didn't finish</SheetTitle>
          <p className="mt-1 text-sm text-zinc-500">
            Nothing was changed. Try again from the sign-in screen, or use your email instead.
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
      ) : expired ? (
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
          {offer.status === 'hidden' ? (
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
            >
              Done
            </button>
          ) : offer.status === 'added' ? (
            <>
              <p className="mt-4 text-sm text-accent">
                Done. Next time, sign in with {unlock === 'a passkey' ? 'your passkey' : unlock}.
              </p>
              <button
                onClick={onClose}
                className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
              >
                Done
              </button>
            </>
          ) : (
            <div className="mt-4 rounded-xl bg-zinc-900 p-3 text-left">
              <p className="text-sm font-medium text-zinc-200">Use {unlock} to sign in next time?</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                No password or email link needed. You can remove it any time in your profile.
              </p>
              {offer.status === 'error' && (
                <p className="mt-1 text-xs text-zinc-400">That didn't work. You can try again, or skip it for now.</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-sm font-medium text-zinc-300 transition-colors active:bg-zinc-700"
                >
                  Not now
                </button>
                <button
                  onClick={offer.accept}
                  disabled={offer.status === 'busy'}
                  className="flex-1 rounded-xl bg-accent py-2.5 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
                >
                  {offer.status === 'busy' ? 'Waiting…' : `Use ${unlock === 'a passkey' ? 'a passkey' : unlock}`}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </Sheet>
  )
}
