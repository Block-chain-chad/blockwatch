// Sign in with Apple and Sign in with Google.
//
// WEB: Supabase's hosted OAuth flow. signInWithOAuth sends the browser to the
// provider and back to /auth/callback with a one-time ?code=, which
// services/authLinks.js redeems (PKCE: only this browser holds the verifier;
// see AUTH_OPTIONS in ./supabase.js).
//
// iOS APP: the providers' own native sheets, through @capgo/capacitor-social-login.
// Apple requires Sign in with Apple wherever Google sign-in is offered
// (App Store guideline 4.8), and Google refuses to sign in inside an embedded
// WebView, so neither can run in the app's WebView. The native sheet returns
// an ID token, which Supabase verifies with signInWithIdToken. Google's native
// SDK runs its own consent page in a system browser session, so there is no
// redirect back into the app to catch, and no universal link or custom scheme
// that can be intercepted or fail to fire.
//
// NONCE: a fresh random value per attempt. The provider receives its SHA-256
// (hex) and writes that into the ID token; Supabase receives the raw value,
// hashes it and checks the two match. A token captured from somewhere else
// carries some other nonce and is refused.
//
// The plugin is imported only inside the native branch, so the web bundle
// never loads it.

import { supabase } from './supabase'
import { track } from './analytics'

export const SOCIAL_PROVIDERS = Object.freeze(['apple', 'google'])
export const OAUTH_CALLBACK_PATH = '/auth/callback'

// The app's bundle ID. Native Sign in with Apple codes are issued to it, and
// api/delete-account.js uses the same value when it revokes them.
export const APPLE_BUNDLE_ID = 'app.blockwatch'
// Public by design: a native OAuth client ID identifies the app, it is not a
// secret. Unset means Google has not been set up for the iPhone app yet, and
// the Google button stays hidden there.
const GOOGLE_IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID ?? ''

export const googleConfiguredOnIos = Boolean(GOOGLE_IOS_CLIENT_ID)

/**
 * Which sign-in buttons to show. Pure, so the rules are testable:
 *   - each provider needs its flag on;
 *   - in the iOS app, Google also needs its iOS client ID, and is never shown
 *     without Apple beside it (guideline 4.8);
 *   - passkeys are web only for now (the app's WebView cannot run WebAuthn;
 *     see services/passkeys.js).
 */
export function signInOptions({
  native,
  appleOn,
  googleOn,
  passkeyOn,
  passkeySupported,
  googleIos = googleConfiguredOnIos,
}) {
  const apple = Boolean(appleOn)
  const google = Boolean(googleOn) && (!native || (apple && Boolean(googleIos)))
  const passkey = Boolean(passkeyOn) && !native && Boolean(passkeySupported)
  return { apple, google, passkey }
}

/** Where the web flow comes back to. */
export function oauthRedirectUrl(origin) {
  return `${origin}${OAUTH_CALLBACK_PATH}`
}

/** A random nonce: 32 bytes, base64url, so it is safe in any URL or header. */
export function randomNonce(cryptoImpl = globalThis.crypto) {
  const bytes = new Uint8Array(32)
  cryptoImpl.getRandomValues(bytes)
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** SHA-256 of a string, as lowercase hex (the form Apple and Google expect). */
export async function sha256Hex(text, cryptoImpl = globalThis.crypto) {
  const digest = await cryptoImpl.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** True when the person closed the provider's sheet rather than it failing. */
export function isCancelled(error) {
  return /cancel|1001|12501/i.test(String(error?.message ?? error ?? ''))
}

/** Start the web flow. The browser leaves the page on success. */
export async function startWebSignIn(provider, origin = window.location.origin) {
  if (!SOCIAL_PROVIDERS.includes(provider)) throw new Error('unknown provider')
  if (!supabase) throw new Error('auth not configured')
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: oauthRedirectUrl(origin) },
  })
  if (error) throw error
}

let pluginReady = null

async function socialLogin() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  if (!pluginReady) {
    pluginReady = SocialLogin.initialize({
      // useProperTokenExchange makes the plugin hand back Apple's
      // authorization code, which account deletion needs to revoke the grant.
      // It sends nothing anywhere by itself: no redirectUrl is set.
      apple: { clientId: APPLE_BUNDLE_ID, useProperTokenExchange: true },
      ...(GOOGLE_IOS_CLIENT_ID ? { google: { iOSClientId: GOOGLE_IOS_CLIENT_ID, mode: 'online' } } : {}),
    }).catch((error) => {
      pluginReady = null // let the next tap try again
      throw error
    })
  }
  await pluginReady
  return SocialLogin
}

/** Run the native provider sheet with a hashed nonce. Returns the plugin's result. */
async function nativeLogin(provider, hashedNonce) {
  const plugin = await socialLogin()
  const { result } = await plugin.login({ provider, options: { nonce: hashedNonce } })
  return result ?? {}
}

/** Sign in inside the iOS app. Throws on failure; see isCancelled. */
export async function signInNative(provider) {
  if (!SOCIAL_PROVIDERS.includes(provider)) throw new Error('unknown provider')
  if (!supabase) throw new Error('auth not configured')
  const nonce = randomNonce()
  const result = await nativeLogin(provider, await sha256Hex(nonce))
  if (!result.idToken) throw new Error('no identity token')
  const accessToken = provider === 'google' ? result.accessToken?.token : undefined
  const { error } = await supabase.auth.signInWithIdToken({
    provider,
    token: result.idToken,
    nonce,
    // Google's ID token can carry a hash of its access token, which Supabase
    // checks when present.
    ...(accessToken ? { access_token: accessToken } : {}),
  })
  if (error) throw error
  track('sign_in_completed', { method: provider })
}

/**
 * Ask Apple for a fresh authorization code, for account deletion to revoke
 * the Sign in with Apple grant with. iOS app only.
 */
export async function appleAuthorizationCode() {
  const result = await nativeLogin('apple', await sha256Hex(randomNonce()))
  if (!result.authorizationCode) throw new Error('no authorization code')
  return result.authorizationCode
}

export { usesApple } from '../../api/_identity.js'
