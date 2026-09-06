// Vercel serverless function: waitlist join + welcome email.
// Production join path: saves the email (same idempotent RPC the client used
// to call directly) and then sends the welcome email through Resend — all
// server-side, so the Resend key never reaches a browser.
//
// Needs env at deploy time: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (already
// part of the standard set) and RESEND_API_KEY (create a "Sending access" key
// in Resend for this). A missing RESEND_API_KEY degrades gracefully: joins
// still work, welcomes just don't send.
//
// CORS: the native app POSTs this from capacitor://localhost, which makes it a
// cross-origin request with a preflight. The preflight must be answered before
// the 405/403 gates below (see api/_cors.js).

import { applyCors, handlePreflight, isNativeOrigin } from './_cors.js'

const welcomeHtml = (siteUrl, siteHost, position) => `
<div style="font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#18181b">
  <div style="font-size:15px;font-weight:700;letter-spacing:-0.2px;margin-bottom:24px">
    <span style="color:#0d9488">▲</span> OnStock
  </div>
  <h1 style="font-size:22px;margin:0 0 12px">You're on the list ✓</h1>
  ${
    Number.isFinite(position) && position > 0
      ? `<p style="font-size:15px;line-height:1.6;color:#52525b;margin:0 0 12px">
    You're <strong style="color:#18181b">#${position}</strong> in line. Early
    counts for something around here.
  </p>`
      : ''
  }
  <p style="font-size:15px;line-height:1.6;color:#52525b;margin:0 0 12px">
    Trading on OnStock is coming. You'll get one email from us the moment it
    opens — nothing else in between, no newsletters, no noise.
  </p>
  <p style="font-size:15px;line-height:1.6;color:#52525b;margin:0 0 24px">
    Meanwhile, the tracker is free: 700+ tokenized stocks, live, side by side
    with the real thing — premiums, gaps, and the market that trades while
    Wall Street sleeps.
  </p>
  <a href="${siteUrl}"
     style="display:inline-block;background:#0d9488;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:12px 24px;border-radius:10px">
    Open OnStock
  </a>
  <p style="font-size:12px;line-height:1.6;color:#a1a1aa;margin:32px 0 0">
    You're receiving this one-time email because this address joined the
    waitlist at ${siteHost}. Wasn't you? Just ignore this — you won't hear
    from us again.
  </p>
</div>
`

export default async function handler(req, res) {
  // Preflight first: an OPTIONS request that gets a 405 below reads to the
  // browser as a failed preflight, and the real POST never fires. Answers
  // 204 with the CORS headers only — no Supabase, no Resend, no body.
  if (handlePreflight(req, res)) return
  applyCors(req, res)

  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' })

  // Cheap abuse gate: browsers always send an Origin header on POSTs, and it
  // must be this deployment. Blocks naked curl-spam from burning the Resend
  // quota. Not bulletproof (Origin is forgeable) — it raises the floor, the
  // idempotent RPC and Resend's own limits do the rest.
  // The native app's WebView isn't served from Vercel, so its Origin is a
  // Capacitor scheme rather than this host. The accepted set comes from
  // api/_cors.js so this gate and the CORS allowlist cannot drift apart —
  // an origin CORS allows but this gate 403s is a silent native-only outage.
  const origin = req.headers.origin ?? ''
  const originHost = (() => {
    try {
      return new URL(origin).host
    } catch {
      return null
    }
  })()
  const sameOrigin = originHost && originHost === req.headers.host
  const nativeApp = isNativeOrigin(origin)
  if (!sameOrigin && !nativeApp) {
    return res.status(403).json({ error: 'forbidden' })
  }

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
  // Wrapped: an unhandled reject here (Supabase unreachable, non-JSON 200)
  // would take the whole function down with a 500 instead of the 502 the
  // client already knows how to queue and retry.
  let payload
  try {
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
    payload = await joinRes.json()
  } catch (err) {
    console.error('waitlist join failed:', err?.message ?? err)
    return res.status(502).json({ error: 'join failed' })
  }

  // Two shapes, on purpose. The original function returns a bare integer
  // position; supabase/waitlist-newflag.sql upgrades it to
  // { position, is_new }. Until that migration is run in the Supabase SQL
  // editor we can't tell a first join from a re-join, so the legacy shape
  // keeps today's exact behavior (always send).
  const isObject = payload !== null && typeof payload === 'object'
  const position = isObject ? Number(payload.position) : Number(payload)
  let isNew
  if (!isObject) {
    isNew = true // legacy integer shape — today's behavior, every join sends
  } else if (typeof payload.is_new === 'boolean') {
    isNew = payload.is_new
  } else {
    // Object shape with no boolean flag = the migration was mis-pasted or
    // only partly applied. Fail CLOSED (send nothing) — mailing everyone on
    // every join is the worse failure — but say so loudly, because silently
    // switching off every welcome email forever is exactly the kind of thing
    // nobody notices. No address in the log; keys only.
    isNew = false
    console.error(
      'join_waitlist returned an object with no boolean is_new — welcome emails are OFF until supabase/waitlist-newflag.sql is applied correctly. payload keys:',
      Object.keys(payload).join(',') || '(none)'
    )
  }

  // Welcome email — best effort. A failed send must never fail the signup.
  // Sent once per address: a re-join (same address, second device, or someone
  // mashing the form) returns is_new=false and mails nothing.
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    // Deliberately not logging the address — emails stay out of Vercel logs.
    console.warn('RESEND_API_KEY not set; welcome email skipped')
  } else if (isNew) {
    // Link back to wherever this deployment actually serves from — a
    // *.vercel.app preview, or onstock.app in production. Vercel routes
    // requests by Host, so this header is always one of the project's own
    // domains; blockwatch.app keeps redirecting here for old links.
    const siteHost = req.headers.host || 'onstock.app'
    const siteUrl = `https://${siteHost}`
    try {
      const sendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // The address stays on blockwatch.app until Resend has verified
          // onstock.app; sending from an unverified domain is rejected outright.
          from: 'OnStock <contact@blockwatch.app>',
          to: [email],
          subject: "You're on the OnStock waitlist",
          html: welcomeHtml(siteUrl, siteHost, position),
        }),
      })
      if (!sendRes.ok) {
        // Status only — Resend error bodies can echo the recipient address,
        // and addresses don't belong in function logs.
        console.error('welcome email rejected:', sendRes.status)
      }
    } catch (err) {
      // The join succeeded, that's what matters — but leave a trace in the
      // function logs so send failures are debuggable instead of invisible.
      console.error('welcome email failed:', err)
    }
  }
  // isNew === false → nothing sent and nothing logged: a log line here would
  // either be noise or leak which address re-joined.

  // Response shape is unchanged for the client (services/waitlist.js reads
  // `position`). A weird position is not worth failing a successful join over,
  // so it goes out as-is; the email template already guards the number.
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ position: Number.isFinite(position) ? position : null })
}
