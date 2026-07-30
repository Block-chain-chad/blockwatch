// Supabase auth error → user copy. Matching is substring-based because
// Supabase message text carries no stable codes at this API surface.

export function mapAuthError(message) {
  const msg = String(message ?? '')
  if (msg.includes('Email not confirmed')) {
    return { text: 'Almost there — tap the link we emailed you first, then sign in.', action: 'resend' }
  }
  if (msg.includes('Invalid login credentials')) {
    return { text: 'That email and password didn\'t match. Try again, or use "Forgot password?"', action: null }
  }
  if (msg.includes('already registered')) {
    return { text: 'That email already has an account — switch to Sign in.', action: null }
  }
  return { text: 'That didn\'t work — give it another try in a moment.', action: null }
}
