// Shared Supabase client (auth + per-user sync). Null when env isn't
// configured — every consumer must handle that (the app then behaves as
// a purely anonymous, localStorage-only tracker).

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/(rest\/v1\/?)?$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null

// The password-recovery event fires as soon as the client parses the email
// link's tokens out of the URL — on gated deployments that's while the
// access-gate lock screen is still up, before any React subscriber exists.
// Capture it at module scope so AuthProvider can pick it up on mount.
export let pendingRecovery = false
supabase?.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') pendingRecovery = true
})
