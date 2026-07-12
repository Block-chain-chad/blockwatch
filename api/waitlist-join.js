// Vercel serverless function: waitlist join + welcome email.
// Production join path: saves the email (same idempotent RPC the client used
// to call directly) and then sends the welcome email through Resend — all
// server-side, so the Resend key never reaches a browser.
//
// Needs env at deploy time: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (already
// part of the standard set) and RESEND_API_KEY (create a "Sending access" key
// in Resend for this). A missing RESEND_API_KEY degrades gracefully: joins
// still work, welcomes just don't send.

const WELCOME_HTML = `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#18181b">
  <div style="font-size:15px;font-weight:700;letter-spacing:-0.2px;margin-bottom:24px">BlockWatch</div>
  <h1 style="font-size:22px;margin:0 0 12px">You're on the list ✓</h1>
  <p style="font-size:15px;line-height:1.6;color:#52525b;margin:0 0 12px">
    Trading on BlockWatch is coming. You'll get one email from us the moment it
    opens — nothing else in between.
  </p>
  <p style="font-size:15px;line-height:1.6;color:#52525b;margin:0 0 24px">
    Meanwhile, the tracker is free: live tokenized stock prices, side by side
    with the real thing.
  </p>
  <a href="https://blockwatch.app"
     style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:10px">
    Open BlockWatch
  </a>
  <p style="font-size:12px;line-height:1.6;color:#a1a1aa;margin:32px 0 0">
    You're receiving this because this address joined the waitlist at
    blockwatch.app. Wasn't you? Just ignore this email.
  </p>
</div>
`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'invalid email' })
  }

  const supabaseUrl = (process.env.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '').replace(
    /\/(rest\/v1\/?)?$/,
    ''
  )
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) return res.status(503).json({ error: 'waitlist not configured' })

  // Save the signup (idempotent: rejoining returns the original position).
  const joinRes = await fetch(`${supabaseUrl}/rest/v1/rpc/join_waitlist`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_email: email }),
  })
  if (!joinRes.ok) return res.status(502).json({ error: 'join failed' })
  const position = await joinRes.json()

  // Welcome email — best effort. A failed send must never fail the signup.
  // (Rejoining from a second device re-sends the welcome; harmless.)
  const resendKey = process.env.RESEND_API_KEY
  if (resendKey) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'BlockWatch <contact@blockwatch.app>',
          to: [email],
          subject: "You're on the BlockWatch waitlist",
          html: WELCOME_HTML,
        }),
      })
    } catch {
      // logged nowhere on purpose — the join succeeded, that's what matters
    }
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ position })
}
