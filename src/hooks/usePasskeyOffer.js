import { useEffect, useState } from 'react'
import { useFlag, SIGN_IN_PASSKEY_FLAG } from '../services/featureFlags'
import {
  listPasskeys,
  markOffered,
  passkeysSupported,
  registerPasskey,
  wasOffered,
} from '../services/passkeys'

/**
 * The one-time "Use Face ID to sign in next time?" offer after a sign-in.
 *
 * Offered once per account per device, only where passkeys work (see
 * services/passkeys.js), only while the passkey switch is on, and only to an
 * account with no passkey yet. It counts as offered the moment it is shown,
 * so closing the sheet is the same as "Not now".
 *
 * Returns { status, accept }, where status is
 *   'hidden'  nothing to offer
 *   'offer'   show the offer
 *   'busy'    the browser's passkey prompt is up
 *   'added'   done
 *   'error'   it did not work; the offer stays so they can try again
 */
export function usePasskeyOffer(user, active) {
  const flagOn = useFlag(SIGN_IN_PASSKEY_FLAG)
  const [status, setStatus] = useState('hidden')
  const userId = user?.id

  useEffect(() => {
    if (!active || !flagOn || !userId || !passkeysSupported() || wasOffered(userId)) return undefined
    let cancelled = false
    listPasskeys()
      .then((existing) => {
        if (cancelled || existing.length > 0) return
        markOffered(userId)
        setStatus('offer')
      })
      .catch(() => {
        // Could not tell whether they already have one; do not ask blind.
      })
    return () => {
      cancelled = true
    }
  }, [active, flagOn, userId])

  async function accept() {
    setStatus('busy')
    try {
      await registerPasskey()
      setStatus('added')
    } catch {
      setStatus('error')
    }
  }

  return { status, accept }
}
