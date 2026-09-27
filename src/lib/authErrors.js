// Supabase auth error → user copy. Matching is substring-based because
// Supabase message text carries no stable codes at this API surface.

export function mapAuthError(message) {
  const msg = String(message ?? '')
  if (msg.includes('Email not confirmed')) {
    return { text: 'Almost there. Open the link we emailed you first, then sign in.', action: 'resend' }
  }
  if (msg.includes('Invalid login credentials')) {
    return { text: "That email and password didn't match. Try again, or use “Forgot password?”", action: null }
  }
  if (msg.includes('already registered')) {
    return { text: 'That email already has an account. Sign in with its password instead.', action: null }
  }
  return { text: "That didn't work. Give it another try in a moment.", action: null }
}

// Supabase refuses a second auth email to the same address inside 60 seconds
// (its default minimum interval per user). The sign-in sheet's resend button
// waits that long, and when Supabase's refusal names a wait, that number wins.
export const RESEND_COOLDOWN_SECONDS = 60

/** The wait in Supabase's "you can only request this after N seconds" refusal, or null. */
export function retryAfterSeconds(message) {
  const m = /after (\d+) seconds?/i.exec(String(message ?? ''))
  return m ? Number(m[1]) : null
}
