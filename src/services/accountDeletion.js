// Delete the signed-in account, from Settings.
//
// The deleting itself happens in api/delete-account.js: removing an auth user
// takes Supabase's secret key, which must never reach a browser. This side
// sends the person's own access token (proof of who is asking), and after the
// server confirms, signs out locally and clears what this device kept for the
// account.

import { API_BASE } from './apiBase'
import { PASSKEY_OFFERED_KEY } from './passkeys'

/** What this device keeps that belongs to an account, besides display settings. */
export function accountStorageKeys(userId) {
  return [
    'bw.folders.v1',
    `bw.folders.u.${userId}`,
    'bw.alerts.v1',
    'bw.waitlist.v1',
    PASSKEY_OFFERED_KEY,
  ]
}

/** Remove the account's data from this device. Display settings stay. */
export function clearAccountStorage(userId, storage = globalThis.localStorage) {
  for (const key of accountStorageKeys(userId)) {
    try {
      storage?.removeItem(key)
    } catch {
      // Blocked storage has nothing in it to clear.
    }
  }
}

/**
 * Ask the server to delete the account. Resolves with the server's answer
 * ({ deleted: true, apple }) or throws an Error carrying the HTTP `status`.
 * A 403 means the session needs a fresh sign-in first.
 */
export async function requestAccountDeletion({ accessToken, appleAuthorizationCode, fetchImpl = fetch }) {
  if (!accessToken) throw new Error('not signed in')
  const res = await fetchImpl(`${API_BASE}/api/delete-account`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(appleAuthorizationCode ? { appleAuthorizationCode } : {}),
  })
  if (!res.ok) {
    const err = new Error(`delete-account ${res.status}`)
    err.status = res.status
    throw err
  }
  return res.json().catch(() => ({ deleted: true }))
}
