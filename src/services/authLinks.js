// Emailed auth links land here. The templates (docs/email-templates.md) link
// to {{ .SiteURL }}/auth/confirm?token_hash=…&type=… — a DIRECT link, no
// Supabase redirect, because iOS Universal Links refuse to open the app on a
// redirect. The token_hash is one-time and short-lived; verifyOtp consumes it.

// eslint-disable-next-line no-unused-vars
import { supabase } from './supabase'

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
