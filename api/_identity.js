// Facts about a Supabase user record and its tokens, shared by the app and the
// server. Pure, with no Node or browser imports, so both sides can load it (the
// app already imports ./_geckoterminal.js the same way).
//
// Nothing here verifies a signature. The server only reads a token that
// Supabase Auth (or Apple, over its own authenticated call) has already
// accepted, and the app only reads its own session to decide what to show.

/** Whether this account signs in with Apple (and so has a grant to revoke). */
export function usesApple(user) {
  if (user?.identities?.some((i) => i?.provider === 'apple')) return true
  const providers = user?.app_metadata?.providers
  return Array.isArray(providers) && providers.includes('apple')
}

/**
 * The Apple user ids ("sub") this account's Apple identity is known by.
 * Supabase returns the provider's id as `id` on an identity (with its own row
 * id in `identity_id`), newer versions also as `provider_id`, and Apple's own
 * claims keep it as identity_data.sub.
 */
export function appleSubjects(user) {
  const out = new Set()
  for (const i of user?.identities ?? []) {
    if (i?.provider !== 'apple') continue
    for (const v of [i.provider_id, i.id, i.identity_data?.sub]) {
      if (typeof v === 'string' && v) out.add(v)
    }
  }
  return out
}

/** The claims of a JWT, or null when it is not one. */
export function jwtClaims(token) {
  if (typeof token !== 'string') return null
  const part = token.split('.')[1]
  if (!part) return null
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(part.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const claims = JSON.parse(new TextDecoder().decode(bytes))
    return claims && typeof claims === 'object' ? claims : null
  } catch {
    return null
  }
}

// How recent a sign-in must be to delete the account.
export const RECENT_SIGN_IN_SECONDS = 10 * 60
// Leeway for a device clock that runs a little ahead of the server's.
const CLOCK_SKEW_SECONDS = 60

/**
 * When this session last proved who it is, in Unix seconds, or null. Read from
 * the access token's `amr` entries (one per way the person signed in, each
 * with its time), not from `iat`: a token refresh renews `iat` every hour
 * without anyone signing in again, while `amr` keeps the real sign-in times.
 */
export function lastSignInAt(accessToken) {
  const amr = jwtClaims(accessToken)?.amr
  if (!Array.isArray(amr)) return null
  const times = amr.map((a) => a?.timestamp).filter((t) => Number.isFinite(t))
  return times.length ? Math.max(...times) : null
}

/** True when this session signed in within RECENT_SIGN_IN_SECONDS. */
export function signedInRecently(accessToken, now = Date.now()) {
  const at = lastSignInAt(accessToken)
  if (at == null) return false
  const age = now / 1000 - at
  return age <= RECENT_SIGN_IN_SECONDS && age >= -CLOCK_SKEW_SECONDS
}
