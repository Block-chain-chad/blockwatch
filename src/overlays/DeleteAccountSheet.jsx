import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import Sheet, { SheetTitle } from '../components/Sheet'
import { isNativeApp } from '../lib/platform'
import { useFlag, SIGN_IN_PASSKEY_FLAG } from '../services/featureFlags'
import { appleAuthorizationCode, isCancelled, usesApple } from '../services/socialSignIn'

const PRIVACY_URL = 'https://onstock.app/privacy.html'

/*
 * Settings > Delete account. One confirmation step, then the server deletes
 * the account and everything saved to it (api/delete-account.js), this device
 * signs out and forgets the account's data, and the app starts fresh.
 *
 * Deleting needs a sign-in from the last 10 minutes; the server enforces it
 * and this sheet asks for it up front ('reauth') so nobody gets as far as
 * the button only to be refused. In the iOS app, an account that signs in
 * with Apple asks Apple for a fresh authorization code instead, which also
 * lets the server revoke Sign in with Apple for Onstock as Apple requires.
 * Cancelling Apple's sheet cancels the deletion.
 *
 * When the server could not turn off Sign in with Apple (always on the web,
 * and on any failure in the app), the done screen says how to do it by hand.
 * The wording comes from the Compliance Reviewer's account deletion review.
 */
export default function DeleteAccountSheet({ onClose, reload = () => window.location.reload() }) {
  const { user, deleteAccount, signOut, signedInRecently } = useAuth()
  const appleAccount = usesApple(user)
  const appleInApp = isNativeApp() && appleAccount
  const passkeysOn = useFlag(SIGN_IN_PASSKEY_FLAG)
  // confirm | busy | done | error | reauth
  const [status, setStatus] = useState(() => (appleInApp || signedInRecently?.() !== false ? 'confirm' : 'reauth'))
  const [appleResult, setAppleResult] = useState(null)

  async function confirm() {
    setStatus('busy')
    try {
      const code = appleInApp ? await appleAuthorizationCode() : undefined
      const result = await deleteAccount({ appleAuthorizationCode: code })
      setAppleResult(result?.apple ?? null)
      setStatus('done')
    } catch (err) {
      if (appleInApp && isCancelled(err)) setStatus('confirm')
      else setStatus(err?.status === 403 ? 'reauth' : 'error')
    }
  }

  async function signOutToReauth() {
    await signOut?.().catch(() => {})
    reload()
  }

  if (status === 'done') {
    return (
      <Sheet onClose={reload} className="z-[60]">
        <div className="px-1 py-4 text-center">
          <SheetTitle className="text-base font-semibold">Your account is deleted</SheetTitle>
          <p className="mt-1 text-sm text-zinc-500">
            You're signed out, and this device no longer keeps your folders, alerts or waitlist entry. You can
            still use Onstock without an account.
          </p>
          {appleAccount && appleResult !== 'revoked' && (
            <p className="mt-3 text-left text-sm leading-relaxed text-zinc-400">
              We couldn't turn off Sign in with Apple for Onstock automatically. To do it yourself on iPhone, open
              Settings, tap your name, tap Sign in with Apple, choose Onstock, then tap Delete.
            </p>
          )}
          <button
            onClick={reload}
            className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
          >
            Done
          </button>
        </div>
      </Sheet>
    )
  }

  if (status === 'reauth') {
    return (
      <Sheet onClose={onClose} className="z-[60]">
        <SheetTitle className="px-1 text-base font-semibold">Sign in again first</SheetTitle>
        <p className="mt-1 px-1 text-sm leading-relaxed text-zinc-400">
          To keep your account safe, deleting it needs a sign-in from the last 10 minutes. Sign out, sign back
          in, then come back to Profile and tap Delete account.
        </p>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-medium text-zinc-200 transition-colors active:bg-zinc-700"
          >
            Cancel
          </button>
          <button
            onClick={signOutToReauth}
            className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
          >
            Sign out
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet onClose={onClose} className="z-[60]">
      <SheetTitle className="px-1 text-base font-semibold">Delete your account?</SheetTitle>
      <p className="mt-1 px-1 text-sm leading-relaxed text-zinc-400">
        This permanently deletes your Onstock account and everything saved to it: your synced folders and
        alerts, your passkeys, and your sign-in details. If your account email is confirmed, it also deletes the
        trading waitlist entry and any feedback sent with that same email address. This can't be undone.
      </p>
      <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-500">
        Some records are not part of your account and are not deleted here: usage analytics tied to a random
        device ID, error reports, records of emails we already sent you, and emails you sent us. Our{' '}
        <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline">
          privacy policy
        </a>{' '}
        explains each one and how long we keep it. To ask us to remove them too, email contact@onstock.app.
      </p>
      {passkeysOn && (
        <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-500">
          Passkeys saved on your devices stay in your password manager. You can remove them there.
        </p>
      )}
      {appleInApp && (
        <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-500">
          Apple will ask you to confirm once more, so Sign in with Apple can be turned off for Onstock.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">
          Your account wasn't deleted. Try again in a minute. If it keeps failing, email contact@onstock.app and
          we'll delete it for you.
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          onClick={onClose}
          disabled={status === 'busy'}
          className="flex-1 rounded-xl bg-zinc-800 py-3 text-sm font-medium text-zinc-200 transition-colors active:bg-zinc-700 disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={confirm}
          disabled={status === 'busy'}
          className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition-colors active:bg-red-700 disabled:opacity-40"
        >
          {status === 'busy' ? 'Deleting…' : 'Delete my account'}
        </button>
      </div>
    </Sheet>
  )
}
