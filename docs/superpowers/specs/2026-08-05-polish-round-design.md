# Polish round: honest iOS wallet row, waitlist story, review crumbs, CSP enforce

Design spec, approved in conversation 2026-08-05 (user: "Ok so lets start" on the
presented Batch A + B). Small round; scale of ceremony matched to scale of change.

## Problems being fixed

1. **iOS wallet row lies to wallet owners.** ProfileSheet shows "Get a wallet —
   Phantom" on the iPhone app, where window.phantom can never inject —
   including for users who own Phantom (the user hit this personally on
   2026-08-05). Known native gap; the row's copy must state the truth.
2. **Waitlist copy contradicts the Trade links.** "We'll email you the moment
   trading opens" (ProfileSheet, Trade joined-state, AboutSheet) sits next to
   working venue links — reads as contradictory. The waitlist's real pitch is
   IN-APP trading (one tap, without leaving BlockWatch). Trade.jsx's join form
   already says "Be first in line for in-app trading" — align the rest.
3. **Review crumbs** (deferred minors from the July 29-31 rounds): leading
   self-referencing filename comments in authErrors.js/authErrors.test.js;
   resend-success leaves the "tap the link we emailed you first" note text
   stale (only the button label flips); monitoring.js beforeSend does not
   scrub exception MESSAGES (request/breadcrumb urls only).
4. **CSP still report-only.** Policy live since 2026-07-24, planned enforce
   after ~a week clean; it is 2026-08-05. Gate: user checks Vercel function
   logs for "CSP violation" entries before the flip (the report sink logs
   there). Enforce = rename the header key in vercel.json; rollback is the
   same one-word change reversed.

## Changes

### A1 — copy (3 files)
- ProfileSheet wallet row, native only (`isNativeApp()`): when no injected
  wallet is available on native, render `ListRow` icon WalletIcon, label
  `Wallet connect`, value `Coming to iPhone`, NO onClick. (Honest limitation
  stated; differs from the deleted fake rows, which claimed nonexistent
  features worked.) Web behavior byte-identical.
- ProfileSheet waitlist card: joined-state subtext → `One tap, without
  leaving BlockWatch — we'll email you when in-app trading opens.`
  (pendingSync branch unchanged); join row subtext → `Be first when in-app
  trading opens`.
- Trade.jsx joined-state line → `${entry.email} — we'll email you when
  in-app trading opens.`
- AboutSheet line → `In-app trading isn't live yet — the Trade tab has a
  waitlist, and everyone on it hears` (only the leading words change).

### A2 — crumbs (3 files)
- Delete the `// src/lib/authErrors.js` / `// src/lib/authErrors.test.js`
  first-line comments.
- SignInSheet resend success: alongside `setResent(true)`, also
  `setNote({ kind: 'sent', text: `A fresh link is on its way to
  ${email.trim()}.` })`.
- monitoring.js beforeSend: add exception-message scrub —
  `for (const ex of event.exception?.values ?? []) { if (typeof ex.value ===
  'string') ex.value = scrub(ex.value) }`.

### B — CSP enforce (1 file, user-gated)
- vercel.json: `Content-Security-Policy-Report-Only` → `Content-Security-Policy`
  (value untouched, report-uri stays so violations keep logging).
- Pre-flip gate: user reports Vercel function logs clean of "CSP violation".
- Post-deploy verification: browse prod home + an asset detail in the pane;
  zero console CSP errors; Sentry chunk loads; curl confirms the header name.

## Non-goals
Native wallet deeplink/MWA (rung-3 work); new explainer sheets; contrast
sweep and modal a11y (standing debts, separately scheduled); any Trade.jsx
join-form copy (already right).

## Approval note
Exact user-facing strings above are shown to the user again at the deploy
gate before push.
