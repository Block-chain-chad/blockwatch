// Feedback delivery: one INSERT into the Supabase feedback table (see
// supabase/feedback.sql). Write-only from the client — the anon key has no
// read access to what users submit.

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '').replace(/\/(rest\/v1\/?)?$/, '')
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const feedbackConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export async function sendFeedback(message, email) {
  if (!feedbackConfigured) throw new Error('feedback backend not configured')
  const res = await fetch(`${SUPABASE_URL}/rest/v1/feedback`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal', // no read-back needed (and RLS wouldn't allow it)
    },
    body: JSON.stringify({ message, email }),
  })
  if (!res.ok) throw new Error(`feedback ${res.status}`)
}
