// Emailed auth links land here. The templates (docs/email-templates.md) link
// to {{ .SiteURL }}/auth/confirm?token_hash=…&type=… — a DIRECT link, no
// Supabase redirect, because iOS Universal Links refuse to open the app on a
// redirect. The token_hash is one-time and short-lived; verifyOtp consumes it.

import { supabase } from './supabase'
import { track } from './analytics'

// Exactly the three types our email templates emit. Reject everything else.
const LINK_TYPES = new Set(['signup', 'magiclink', 'recovery'])

/** Parse an incoming URL. Returns { tokenHash, type } or null — never throws. */
export function parseAuthLink(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.pathname !== '/auth/confirm') return null
  const tokenHash = parsed.searchParams.get('token_hash')
  const type = parsed.searchParams.get('type')
  if (!tokenHash || !LINK_TYPES.has(type)) return null
  return { tokenHash, type }
}

// Result of the most recent handled link. AuthProvider may not be mounted yet
// (web: AccessGate wraps it; native: cold-start link handled during boot), so
// results park here until consumed — same early-capture reasoning as
// pendingRecovery in ./supabase.js.
let pendingResult = null
const subscribers = new Set()

function emit(result) {
  if (subscribers.size > 0) {
    for (const cb of subscribers) cb(result)
  } else {
    pendingResult = result
  }
}

/** One-shot: returns the parked result (if any) and clears it. */
export function consumePendingAuthResult() {
  const r = pendingResult
  pendingResult = null
  return r
}

/** Live delivery for links that arrive after mount (native warm opens). */
export function subscribeAuthLinks(cb) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

// A single emailed link can arrive twice on iOS cold start: getLaunchUrl()
// and the retained appUrlOpen event both deliver it. The token is single-use,
// so the second exchange would always fail and flash "expired" over a
// successful sign-in — swallow repeats instead.
const handledTokens = new Set()

/**
 * Handle a possibly-auth URL. Returns true when the URL was an auth link
 * (so callers know it was consumed), false otherwise. Outcomes surface via
 * consumePendingAuthResult/subscribeAuthLinks, never thrown.
 */
export async function handleAuthLink(url) {
  const link = parseAuthLink(url)
  if (!link) return false
  if (handledTokens.has(link.tokenHash)) return true
  handledTokens.add(link.tokenHash)
  if (!supabase) {
    emit({ kind: 'expired' }) // auth unconfigured — treat as a dead link
    return true
  }
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: link.tokenHash,
      type: link.type,
    })
    if (error || !data?.session) {
      emit({ kind: 'expired' })
    } else if (link.type === 'recovery') {
      emit({ kind: 'recovery' })
    } else {
      // A magic link or a signup confirmation: the session exists, so this is
      // a completed sign-in. handledTokens above makes it once per link even
      // when iOS delivers the same URL twice.
      track('sign_in_completed', { method: 'link' })
      emit({ kind: 'welcome' })
    }
  } catch {
    emit({ kind: 'expired' })
  }
  return true
}

// Sign in with Apple and Google on the web come back to /auth/callback (see
// services/socialSignIn.js): ?code=… on success, ?error=… when the person
// declined or the provider failed. Web only: the iOS app signs in with the
// providers' native sheets and never receives this URL.
const OAUTH_PROVIDERS = new Set(['apple', 'google'])

/** Parse an OAuth callback URL: { code }, { error }, or null. Never throws. */
export function parseOAuthCallback(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.pathname !== '/auth/callback') return null
  const error = parsed.searchParams.get('error')
  if (error) return { error }
  const code = parsed.searchParams.get('code')
  return code ? { code } : null
}

const handledCodes = new Set()

/**
 * Redeem an OAuth callback. Returns true when the URL was one (consumed),
 * false otherwise. Outcomes surface the same way as emailed links: 'welcome'
 * on success, 'failed' when the exchange did not produce a session, and
 * nothing at all when the person simply said no at the provider.
 */
export async function handleOAuthCallback(url) {
  const cb = parseOAuthCallback(url)
  if (!cb) return false
  if (cb.error) {
    if (cb.error !== 'access_denied') emit({ kind: 'failed' })
    return true
  }
  if (handledCodes.has(cb.code)) return true
  handledCodes.add(cb.code)
  if (!supabase) {
    emit({ kind: 'failed' })
    return true
  }
  try {
    const { data, error } = await supabase.auth.exchangeCodeForSession(cb.code)
    if (error || !data?.session) {
      emit({ kind: 'failed' })
      return true
    }
    // The provider name comes from Supabase's record of the account, checked
    // against the two this path serves, so nothing from the URL reaches
    // analytics.
    const provider = data.user?.app_metadata?.provider
    if (OAUTH_PROVIDERS.has(provider)) track('sign_in_completed', { method: provider })
    emit({ kind: 'welcome' })
  } catch {
    emit({ kind: 'failed' })
  }
  return true
}
