import { useState } from 'react'
import { useAuth } from '../state/AuthContext'
import Sheet, { SheetTitle } from '../components/Sheet'
import { isNativeApp } from '../lib/platform'
import { appleAuthorizationCode, isCancelled, usesApple } from '../services/socialSignIn'

/*
 * Settings > Delete account. One confirmation step, then the server deletes
 * the account and everything tied to it (api/delete-account.js), this device
 * signs out and forgets the account's data, and the app starts fresh.
 *
 * In the iOS app, an account that signs in with Apple asks Apple for a fresh
 * authorization code first, so the server can revoke Sign in with Apple for
 * OnStock as Apple requires. Cancelling that sheet cancels the deletion.
 */
export default function DeleteAccountSheet({ onClose, reload = () => window.location.reload() }) {
  const { user, deleteAccount } = useAuth()
  const [status, setStatus] = useState('confirm') // confirm | busy | done | error
  const appleInApp = isNativeApp() && usesApple(user)

  async function confirm() {
    setStatus('busy')
    try {
      const code = appleInApp ? await appleAuthorizationCode() : undefined
      await deleteAccount({ appleAuthorizationCode: code })
      setStatus('done')
    } catch (err) {
      setStatus(appleInApp && isCancelled(err) ? 'confirm' : 'error')
    }
  }

  if (status === 'done') {
    return (
      <Sheet onClose={reload} className="z-[60]">
        <div className="px-1 py-4 text-center">
          <SheetTitle className="text-base font-semibold">Your account is deleted</SheetTitle>
          <p className="mt-1 text-sm text-zinc-500">
            You're signed out, and this device no longer keeps your folders or alerts. You can still
            use OnStock without an account.
          </p>
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

  return (
    <Sheet onClose={onClose} className="z-[60]">
      <SheetTitle className="px-1 text-base font-semibold">Delete your account?</SheetTitle>
      <p className="mt-1 px-1 text-sm leading-relaxed text-zinc-400">
        This permanently deletes your OnStock account and the data tied to it: synced folders and
        alerts, passkeys, your trading waitlist spot, and feedback sent from this email. It can't be
        undone.
      </p>
      {appleInApp && (
        <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-500">
          Apple will ask you to confirm once more, so Sign in with Apple can be turned off for OnStock.
        </p>
      )}
      {status === 'error' && (
        <p className="mt-2 px-1 text-xs leading-relaxed text-zinc-400">
          Your account wasn't deleted. Try again in a minute, or tell us through Help and feedback.
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
