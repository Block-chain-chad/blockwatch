// Vercel serverless function: delete the caller's own OnStock account.
//
// POST /api/delete-account
//   Authorization: Bearer <the user's Supabase access token>
//   body: {} or { "appleAuthorizationCode": "<fresh code from the iOS app>" }
//
// Deleting an auth user takes Supabase's secret key, which must never reach a
// browser, so this runs here. The caller proves who they are with their own
// access token, which Supabase Auth checks; nobody can name someone else's
// account. In order:
//
//   1. Sign in with Apple: when the account uses Apple and the app sent a
//      code, revoke the grant (see ./_appleRevoke.js). A failure here does not
//      stop the deletion; the answer says so and the person can remove
//      OnStock from their Apple ID settings.
//   2. The account's rows: folders and alerts (keyed by user id), and the
//      waitlist entry and feedback sent from the account's email. Folders and
//      alerts would also go with the user through their foreign keys; they are
//      deleted by name so a future table without that cascade cannot keep
//      data behind.
//   3. The auth user itself, which takes its identities, sessions and passkeys
//      with it.
//   If step 2 fails, the user is not deleted, so a retry finds everything
//   still in place and can finish the job.
//
// Env (server only, never VITE_): SUPABASE_SECRET_KEY, plus SUPABASE_URL (or
// the VITE_SUPABASE_URL the build already has). For step 1: APPLE_TEAM_ID,
// APPLE_SIGN_IN_KEY_ID, APPLE_SIGN_IN_PRIVATE_KEY. Without the Supabase pair
// this answers 503 and deletes nothing.
//
// PRIVACY: nothing here logs an email, a token, a user id or Apple's replies.
// The only log lines name the step that failed and the HTTP status.

import { applyCors, handlePreflight } from './_cors.js'
import { clientKey, createRateLimiter, opaqueKey, sendTooManyRequests } from './_rateLimit.js'
import { revokeAppleGrant } from './_appleRevoke.js'
import { usesApple } from './_identity.js'

// Native Sign in with Apple codes are issued to the app's bundle ID. Keep in
// step with APPLE_BUNDLE_ID in src/services/socialSignIn.js.
export const APPLE_CLIENT_ID = 'app.blockwatch'

// Deleting an account is a once-in-a-lifetime action. Per caller, a few tries
// an hour covers a person retrying after a network drop; per account, the
// same again, so rotating addresses does not buy more attempts at one account.
const perClient = createRateLimiter({ capacity: 5, refillPerSecond: 5 / 3600 })
const perAccount = createRateLimiter({ capacity: 5, refillPerSecond: 5 / 3600 })
export const limiters = { perClient, perAccount }

const TIMEOUT_MS = 10000
// An Apple authorization code is a short opaque string of these characters.
const APPLE_CODE = /^[A-Za-z0-9._-]{1,512}$/
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function config() {
  const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').replace(/\/(rest\/v1\/?)?$/, '')
  const key = process.env.SUPABASE_SECRET_KEY ?? ''
  return url && key ? { url, key } : null
}

function adminHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra }
}

/** PostgREST ilike pattern that matches exactly this text, case-insensitively. */
export function exactIlike(text) {
  return String(text).replace(/[\\%_*]/g, (c) => `\\${c}`)
}

async function call(url, init) {
  return fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) })
}

/** Who is asking: the Supabase user for this access token, or null. */
async function userForToken({ url, key }, token) {
  const res = await call(`${url}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const user = await res.json()
  return typeof user?.id === 'string' && USER_ID.test(user.id) ? user : null
}

/** The row deletions, as [label, path] pairs, for one user. */
export function rowDeletions(user) {
  const id = encodeURIComponent(user.id)
  const steps = [
    ['folders', `/rest/v1/user_folders?user_id=eq.${id}`],
    ['alerts', `/rest/v1/user_alerts?user_id=eq.${id}`],
  ]
  const email = typeof user.email === 'string' ? user.email.trim() : ''
  if (email) {
    // The waitlist stores addresses lowercased (supabase/waitlist.sql);
    // feedback stores them as typed, so it is matched without regard to case.
    steps.push(['waitlist', `/rest/v1/waitlist?email=eq.${encodeURIComponent(email.toLowerCase())}`])
    steps.push(['feedback', `/rest/v1/feedback?email=ilike.${encodeURIComponent(exactIlike(email))}`])
  }
  return steps
}

function bearer(req) {
  const header = req.headers?.authorization ?? ''
  const m = /^Bearer ([A-Za-z0-9._-]{20,4096})$/.exec(header)
  return m ? m[1] : null
}

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  applyCors(req, res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const client = perClient.take(clientKey(req))
  if (!client.ok) return sendTooManyRequests(res, client.retryAfter)

  const token = bearer(req)
  if (!token) return res.status(401).json({ error: 'sign in first' })

  const appleCode = req.body?.appleAuthorizationCode
  if (appleCode != null && (typeof appleCode !== 'string' || !APPLE_CODE.test(appleCode))) {
    return res.status(400).json({ error: 'bad request' })
  }

  const cfg = config()
  if (!cfg) return res.status(503).json({ error: 'account deletion not configured' })

  let user
  try {
    user = await userForToken(cfg, token)
  } catch {
    console.error('delete-account: user lookup failed')
    return res.status(502).json({ error: 'try again' })
  }
  if (!user) return res.status(401).json({ error: 'sign in first' })

  const account = perAccount.take(opaqueKey(user.id))
  if (!account.ok) return sendTooManyRequests(res, account.retryAfter)

  // 1. Sign in with Apple.
  let apple = 'not-used'
  if (usesApple(user)) {
    const { APPLE_TEAM_ID, APPLE_SIGN_IN_KEY_ID, APPLE_SIGN_IN_PRIVATE_KEY } = process.env
    if (!appleCode) apple = 'no-code'
    else if (!APPLE_TEAM_ID || !APPLE_SIGN_IN_KEY_ID || !APPLE_SIGN_IN_PRIVATE_KEY) apple = 'not-configured'
    else {
      const revoked = await revokeAppleGrant({
        code: appleCode,
        clientId: APPLE_CLIENT_ID,
        teamId: APPLE_TEAM_ID,
        keyId: APPLE_SIGN_IN_KEY_ID,
        privateKeyPem: APPLE_SIGN_IN_PRIVATE_KEY,
      })
      apple = revoked ? 'revoked' : 'failed'
      if (!revoked) console.error('delete-account: apple revoke failed')
    }
  }

  // 2. Rows.
  for (const [label, path] of rowDeletions(user)) {
    try {
      const r = await call(`${cfg.url}${path}`, {
        method: 'DELETE',
        headers: adminHeaders(cfg.key, { Prefer: 'return=minimal' }),
      })
      if (!r.ok) {
        console.error(`delete-account: ${label} delete failed`, r.status)
        return res.status(502).json({ error: 'try again' })
      }
    } catch {
      console.error(`delete-account: ${label} delete failed`)
      return res.status(502).json({ error: 'try again' })
    }
  }

  // 3. The user.
  try {
    const r = await call(`${cfg.url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
      method: 'DELETE',
      headers: adminHeaders(cfg.key),
    })
    if (!r.ok) {
      console.error('delete-account: user delete failed', r.status)
      return res.status(502).json({ error: 'try again' })
    }
  } catch {
    console.error('delete-account: user delete failed')
    return res.status(502).json({ error: 'try again' })
  }

  return res.status(200).json({ deleted: true, apple })
}
