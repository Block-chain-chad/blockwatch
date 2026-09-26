// Revoke a Sign in with Apple grant, for account deletion.
//
// Apple requires an app that offers Sign in with Apple to revoke the user's
// tokens when the user deletes their account (App Store Review Guideline
// 5.1.1(v); Apple's "Revoke tokens" REST endpoint). Supabase does not do this
// when a user is deleted, so api/delete-account.js calls this first.
//
// The iOS app sends a fresh authorization code, obtained by asking Apple again
// at the moment of deletion. It is exchanged here for a refresh token, and
// that token is revoked. Both calls authenticate with a client secret: a
// short-lived ES256 JWT signed with the Sign in with Apple private key, which
// lives only in this server's environment.
//
// Pure apart from `fetchImpl` and `now`, which the tests pass in.

import { createPrivateKey, sign } from 'node:crypto'

const APPLE = 'https://appleid.apple.com'
const TIMEOUT_MS = 8000

const b64url = (buf) =>
  Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** Read the private key from an env value, tolerating "\n" written as two characters. */
export function readPrivateKey(pem) {
  return createPrivateKey(String(pem ?? '').replace(/\\n/g, '\n'))
}

/**
 * The client secret Apple asks for: a JWT signed with ES256 by the Sign in
 * with Apple key. Valid for five minutes, which is all one deletion needs.
 */
export function appleClientSecret({ teamId, keyId, privateKey, clientId, now = Date.now() }) {
  const iat = Math.floor(now / 1000)
  const header = b64url(JSON.stringify({ alg: 'ES256', kid: keyId }))
  const payload = b64url(
    JSON.stringify({ iss: teamId, iat, exp: iat + 300, aud: APPLE, sub: clientId }),
  )
  const input = `${header}.${payload}`
  const signature = sign('sha256', Buffer.from(input), { key: privateKey, dsaEncoding: 'ieee-p1363' })
  return `${input}.${b64url(signature)}`
}

async function postForm(fetchImpl, path, fields) {
  return fetchImpl(`${APPLE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(fields).toString(),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
}

/**
 * Exchange the code and revoke what it grants. Resolves true when Apple
 * accepted the revocation, false otherwise; never throws and never reports
 * any token or Apple's error text.
 */
export async function revokeAppleGrant({ code, clientId, teamId, keyId, privateKeyPem, fetchImpl = fetch, now }) {
  try {
    const privateKey = readPrivateKey(privateKeyPem)
    const clientSecret = appleClientSecret({ teamId, keyId, privateKey, clientId, now })
    const tokenRes = await postForm(fetchImpl, '/auth/token', {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
    })
    if (!tokenRes.ok) return false
    const tokens = await tokenRes.json()
    const token = tokens?.refresh_token ?? tokens?.access_token
    if (typeof token !== 'string' || !token) return false
    const revokeRes = await postForm(fetchImpl, '/auth/revoke', {
      client_id: clientId,
      client_secret: clientSecret,
      token,
      token_type_hint: tokens.refresh_token ? 'refresh_token' : 'access_token',
    })
    return revokeRes.ok
  } catch {
    return false
  }
}
