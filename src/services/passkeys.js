// Face ID, Touch ID and other passkeys, through Supabase Auth's passkey
// support (experimental; enabled on the client in ./supabase.js).
//
// WEB ONLY for now. A passkey is bound to a domain (the relying party,
// onstock.app), and the browser only offers it to pages served from that
// domain. The iOS app's WebView serves the app from capacitor://localhost,
// which is not onstock.app, so WebAuthn refuses there; passkeys in the app
// need a native bridge. passkeysSupported() is therefore false in the app,
// and every passkey button with it.
//
// Nothing from a passkey (its ID, name, or the credential) is ever sent to
// analytics; the events here carry a method name and nothing else.

import { supabase } from './supabase'
import { track } from './analytics'
import { isNativeApp } from '../lib/platform'

const OFFERED_KEY = 'bw.passkey.offered.v1'

/** Can this page create and use passkeys? */
export function passkeysSupported(win = typeof window === 'undefined' ? undefined : window) {
  return !isNativeApp() && typeof win?.PublicKeyCredential === 'function' && Boolean(win?.navigator?.credentials)
}

/**
 * What to call the passkey in copy. On Apple devices the prompt people will
 * see is Face ID or Touch ID, and the words should match it; everywhere else
 * it is the device's own unlock, which "passkey" covers.
 */
export function passkeyName(userAgent = '', maxTouchPoints = 0) {
  if (/iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)) return 'Face ID'
  if (/Macintosh/.test(userAgent)) return 'Touch ID'
  return 'a passkey'
}

function need() {
  if (!supabase) throw new Error('auth not configured')
  return supabase.auth
}

/** Sign in with a saved passkey: the browser shows its own picker. */
export async function signInWithPasskey() {
  const { data, error } = await need().signInWithPasskey()
  if (error) throw error
  if (!data?.session) throw new Error('no session')
  track('sign_in_completed', { method: 'passkey' })
}

/** Add a passkey to the signed-in account. */
export async function registerPasskey() {
  const { data, error } = await need().registerPasskey()
  if (error) throw error
  track('passkey_added')
  return data
}

/** The signed-in account's passkeys: [{ id, friendly_name?, created_at, last_used_at? }]. */
export async function listPasskeys() {
  const { data, error } = await need().passkey.list()
  if (error) throw error
  return Array.isArray(data) ? data : []
}

/** Remove one passkey from the account. */
export async function removePasskey(passkeyId) {
  const { error } = await need().passkey.delete({ passkeyId })
  if (error) throw error
}

/**
 * Passkey autofill on the email field (the browser lists saved passkeys in
 * its suggestions). Only where the browser can parse WebAuthn JSON natively
 * and supports conditional requests; anywhere else it quietly does nothing
 * and the button still works. Resolves true when it signed someone in,
 * false when it gave up or was aborted.
 */
export async function startPasskeyAutofill(signal, win = typeof window === 'undefined' ? undefined : window) {
  const PKC = win?.PublicKeyCredential
  if (!supabase || !passkeysSupported(win)) return false
  if (typeof PKC.parseRequestOptionsFromJSON !== 'function') return false
  if (typeof PKC.isConditionalMediationAvailable !== 'function') return false
  try {
    if (!(await PKC.isConditionalMediationAvailable())) return false
    if (signal?.aborted) return false
    const { data: challenge, error } = await supabase.auth.passkey.startAuthentication()
    if (error || !challenge) return false
    const publicKey = PKC.parseRequestOptionsFromJSON(challenge.options)
    const credential = await win.navigator.credentials.get({ publicKey, mediation: 'conditional', signal })
    if (!credential) return false
    const { data, error: verifyError } = await supabase.auth.passkey.verifyAuthentication({
      challengeId: challenge.challenge_id,
      credential: credential.toJSON(),
    })
    if (verifyError || !data?.session) return false
    track('sign_in_completed', { method: 'passkey' })
    return true
  } catch {
    // Aborted when the sheet closed or the button took over, or the browser
    // declined. Neither is worth a message: the button is right there.
    return false
  }
}

function offeredIds() {
  try {
    const raw = JSON.parse(localStorage.getItem(OFFERED_KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

/** Has this account already been asked on this device? */
export function wasOffered(userId) {
  return offeredIds().includes(userId)
}

/** Remember that this account has been asked, so it is asked once. */
export function markOffered(userId) {
  try {
    const ids = offeredIds()
    if (!ids.includes(userId)) localStorage.setItem(OFFERED_KEY, JSON.stringify([...ids, userId].slice(-20)))
  } catch {
    // Storage blocked: the offer may come back next time, which is harmless.
  }
}

/** Forget the offer record (account deletion clears it with the rest). */
export const PASSKEY_OFFERED_KEY = OFFERED_KEY

/** True when the person dismissed the browser's passkey prompt. */
export function isPasskeyCancel(error) {
  const text = `${error?.name ?? ''} ${error?.code ?? ''} ${error?.message ?? ''}`
  return /NotAllowed|Abort|cancel/i.test(text)
}
