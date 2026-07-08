// Waitlist backend: Supabase, called through its REST (PostgREST) endpoint with
// plain fetch — no SDK dependency for a single RPC. The anon key can only
// execute join_waitlist(email) (see supabase/waitlist.sql); it cannot read the
// table, so stored emails stay private.

// Accept the bare project URL, tolerating a pasted trailing slash or /rest/v1 path.
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/(rest\/v1\/?)?$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const waitlistConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

/** Insert-or-fetch the email's spot; returns the 1-based position number. */
export async function joinWaitlist(email) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/join_waitlist`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_email: email }),
  })
  if (!res.ok) throw new Error(`waitlist ${res.status}`)
  return res.json()
}
