// Vercel serverless function: the trading waitlist, now closed to new entries.
//
// Marcus closed the waitlist on September 30, 2026. Existing rows in
// public.waitlist stay as they are; nothing new is saved and no email is ever
// sent from here. The function stays deployed so older app builds that still
// post here get a clear answer instead of a 404 they would retry forever.
//
// Every POST gets 410 Gone with { error: 'waitlist closed' }. Nothing reads the
// body, calls Supabase or calls Resend, so there is nothing left to abuse.
// supabase/migrations/20260930000000_launch_limits.sql revokes direct access
// to join_waitlist, which closes the database side too.
//
// CORS: the native app posts from capacitor://localhost, a cross-origin
// request with a preflight, so the preflight is answered first (api/_cors.js).

import { applyCors, handlePreflight } from './_cors.js'

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  applyCors(req, res)
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })
  res.setHeader('Cache-Control', 'no-store')
  return res.status(410).json({ error: 'waitlist closed' })
}
