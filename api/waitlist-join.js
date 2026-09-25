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
//
// ABUSE: this endpoint makes us send mail to an address a stranger chose, so
// it is rate limited per caller, per address, AND on how much mail this
// instance will send in total (see api/_rateLimit.js — the limits are
// best-effort and per-instance; read that file before quoting the numbers to
// anyone). The first two are keyed on things the caller picks and can be
// dodged by rotating both; the third cannot.

import { applyCors, handlePreflight, isNativeOrigin } from './_cors.js'
import {
  clientKey,
  createRateLimiter,
  opaqueKey,
  sendTooManyRequests,
} from './_rateLimit.js'

// Two buckets, because they stop different things.
//
// Per caller: joining is a once-in-a-lifetime action, so 5 with a slow refill
// is generous for a real person who mistyped, hit send twice, or came back on
// a second device, and hostile to a loop. The client has no retry queue — a
// 429 surfaces as a failed join — so this is deliberately not tighter.
const perClient = createRateLimiter({ capacity: 5, refillPerSecond: 5 / 3600 })

// Per address: the one that actually protects an inbox. The Origin gate below
// is forgeable and the per-caller bucket resets on every cold start or new
// instance, so without this a script could still ask us to mail one stranger
// repeatedly. Keyed on a hash, never the address itself — see opaqueKey.
// Note this bucket is spent on ATTEMPTS, not sends: is_new already means a
// re-join mails nothing, and this keeps the attempts from reaching Supabase.
const perEmail = createRateLimiter({ capacity: 3, refillPerSecond: 3 / 3600 })

// The ceiling on SENDS for this whole instance, and the only one of the three
// that a caller cannot split. The two above are keyed on things the caller
// chooses — a header and an address — so rotating both buys an unbounded
// number of welcome emails to an unbounded number of strangers: 200 rotating
// callers with 200 rotating addresses sent 200 emails and were refused
// nothing. This one is keyed on a constant.
//
// 60 burst, refilling at one a minute. A pre-launch waitlist does not see 60
// genuine first-time joins in a burst, let alone one every minute forever, so
// it should never touch real traffic. Per instance like everything else in
// ./_rateLimit.js, so it is a floor on how much mail one instance can be made
// to send, not a global cap — read that file before quoting the number.
//
// Spent at the moment an email is about to go out, never on an attempt: a
// re-join mails nothing, and must not eat the budget of someone who would.
const perInstanceSend = createRateLimiter({ capacity: 60, refillPerSecond: 1 / 60, maxKeys: 1 })

// Exported for the tests, which need a known-empty bucket per case.
export const limiters = { perClient, perEmail, perInstanceSend }

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
  // quota. It is NOT a security control and never was — anything that is not a
  // browser sets this header to whatever it likes, so treat it as a filter for
  // accidents and drive-by scripts only. What actually bounds the damage from
  // a caller that does forge it: the buckets above, the is_new flag (a re-join
  // mails nothing), and Resend's own limits.
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

  // Counted before anything is parsed, so a loop of junk bodies costs the
  // same as a loop of real ones.
  const client = perClient.take(clientKey(req))
  if (!client.ok) return sendTooManyRequests(res, client.retryAfter)

  // Length is checked BEFORE the pattern: the local part is unbounded in the
  // regex, so a megabyte-long address would otherwise be backtracked over
  // before being thrown away.
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (email.length > 254 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: 'invalid email' })
  }

  const address = perEmail.take(opaqueKey(email))
  if (!address.ok) return sendTooManyRequests(res, address.retryAfter)

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
    // The instance ceiling, spent here and nowhere else, because this is the
    // one line where mail actually leaves.
    //
    // Running out does NOT fail the join. The address is already saved by
    // this point, and telling someone their signup failed when it did not is
    // a worse outcome than a missing welcome email — so the response below is
    // unchanged and only the mail is dropped. Loudly: a silent stop to every
    // welcome email is exactly the kind of thing nobody notices.
    const budget = perInstanceSend.take('all')
    if (!budget.ok) {
      console.error(
        'welcome-email ceiling reached on this instance; this welcome was not sent. Seconds until the next one:',
        budget.retryAfter
      )
    } else {
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
  }
  // isNew === false → nothing sent and nothing logged: a log line here would
  // either be noise or leak which address re-joined.

  // Response shape is unchanged for the client (services/waitlist.js reads
  // `position`). A weird position is not worth failing a successful join over,
  // so it goes out as-is; the email template already guards the number.
  res.setHeader('Cache-Control', 'no-store')
  return res.status(200).json({ position: Number.isFinite(position) ? position : null })
}
