// Shared Supabase client (auth + per-user sync). Null when env isn't
// configured — every consumer must handle that (the app then behaves as
// a purely anonymous, localStorage-only tracker).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/(rest\/v1\/?)?$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Auth options, exported for the test that pins them.
//
// flowType 'pkce': Sign in with Apple and Google on the web come back to
// /auth/callback with a one-time ?code=, which only this browser can redeem,
// because the matching code verifier never left its storage. The implicit
// flow would put the tokens themselves in the address bar instead.
//
// detectSessionInUrl false: the callback is redeemed explicitly by
// services/authLinks.js, which also scrubs the address bar, exactly like the
// emailed /auth/confirm links. Letting the client redeem it on its own as
// well would race that and spend the one-time code twice.
//
// experimental.passkey: turns on the passkey methods in supabase-js. It only
// makes them callable; the passkey buttons stay behind their own flag
// (services/featureFlags.js) until the dashboard side is configured.
export const AUTH_OPTIONS = Object.freeze({
  flowType: 'pkce',
  detectSessionInUrl: false,
  experimental: Object.freeze({ passkey: true }),
})

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { ...AUTH_OPTIONS } })
    : null

// PASSWORD_RECOVERY fires when a recovery link is redeemed (services/
// authLinks.js), which on gated deployments can happen while the access-gate
// lock screen is still up, before any React subscriber exists. Capture it at
// module scope so AuthProvider can pick it up on mount.
export let pendingRecovery = false
supabase?.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') pendingRecovery = true
})
