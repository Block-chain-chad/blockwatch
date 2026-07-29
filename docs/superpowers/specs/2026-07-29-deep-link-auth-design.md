# Deep-link auth: email links open the app

Design spec, approved 2026-07-29. Companion UI work ("feels real" package)
included — the two ship together as one round.

## Problem

Account creation feels fake, and the user (testing on a real iPhone via
TestFlight) identified why:

1. **The confirm-email dance.** Supabase's "Confirm email" gate means a new
   password does nothing until the emailed link is clicked. On iOS the link
   opens Safari — not the app — so the flow is: type password → leave app →
   tap link → Safari opens → return to app → sign in *again*. The app looks
   like it outsourced its own signup.
2. **Nothing visibly changes after sign-in.** The sheet closes; the only
   evidence anywhere is the avatar's initial. No welcome, no proof of sync.
3. **The Profile sheet contains literally fake rows.** "Notifications — On"
   and "Display currency — USD" are static, dead mockup leftovers
   (ProfileSheet.jsx:111-112). There is no push notification system.
4. **The sign-up form is thin.** No show-password, no strength feedback.
5. **Honest-error gap:** password sign-in before confirming shows the generic
   "That didn't work" because the "Email not confirmed" error isn't mapped
   (SignInSheet.jsx catch block).

Decision: **keep email confirmation** (ownership proof matters to the product)
and make the emailed link open **the app itself** via iOS Universal Links.
Approach A (disable confirmation) was considered and rejected by the user;
Approach C (this spec) was chosen.

## The experience after this ships

- **Sign up (iOS app):** email + password → "We emailed you — tap the link to
  finish" → tap the email's button in Mail → **BlockWatch opens** → welcome
  moment: signed in, email shown, "your watchlist (N assets, M alerts) now
  syncs to any device."
- **Forgot password (iOS app):** reset email → tap → app opens → set-new-
  password sheet (existing PasswordSheet recovery flow) → done, all in-app.
- **Magic link:** re-enabled on native (it was hidden solely because links
  opened Safari). Same tap-to-open behavior.
- **Web:** identical links; if the app isn't installed (or on desktop) the
  link opens the website, which confirms there. No behavior lost.

## Architecture — three pieces

### 1. Universal Links handshake

- **AASA file** at `public/.well-known/apple-app-site-association` (no
  extension), served as `application/json` via a vercel.json header rule.
  Content scopes ONLY auth paths to the app — ordinary site links must keep
  opening in the browser:

  ```json
  {
    "applinks": {
      "apps": [],
      "details": [
        {
          "appIDs": ["92Y88BW5VC.app.blockwatch"],
          "components": [{ "/": "/auth/*" }]
        }
      ]
    }
  }
  ```

- **Entitlement:** new `ios/App/App/App.entitlements` with
  `com.apple.developer.associated-domains` = `["applinks:blockwatch.app"]`,
  wired into the Xcode project (`CODE_SIGN_ENTITLEMENTS` in project.pbxproj,
  both Debug and Release). No entitlements file exists today — this creates
  it.
- **App ID capability:** Associated Domains must be enabled on the
  `app.blockwatch` identifier. Expected to happen automatically via cloud
  signing (`-allowProvisioningUpdates` + App Store Connect API key, ADMIN
  role — the existing pipeline). Fallback if export fails on a capability
  error: enable manually at developer.apple.com → Identifiers →
  app.blockwatch → Associated Domains (user action, walked through).
- **AppDelegate:** Capacitor's template already forwards
  `continue userActivity` to the web layer; verify, expect zero changes.

### 2. Native link listener

- Install **@capacitor/app** (official plugin, already planned-for in prior
  reviews).
- Cold start: `App.getLaunchUrl()` on boot. Warm: `appUrlOpen` listener
  registered at module scope in `services/supabase.js` (same early-capture
  pattern as `pendingRecovery`, and for the same reason — events can fire
  before React mounts, and AccessGate does not gate the native shell).
- Both paths feed the same handler (below).

### 3. Token-hash email links + shared confirm handler

Today's emails use `{{ .ConfirmationURL }}` → Supabase's server → 302
redirect. Apple deliberately does not open apps on redirects, so this shape
can never deep-link. Supabase's documented mobile pattern replaces it:

- **Email templates** (3: confirm signup, magic link, reset password) link to
  `https://blockwatch.app/auth/confirm?token_hash={{ .TokenHash }}&type=signup`
  (`type` = `signup` / `magiclink` / `recovery` per template). Direct link,
  no redirect — Universal Links fire. Templates keep the existing teal-button
  brand styling; full HTML handed to the user to paste into the Supabase
  dashboard (their account).
- **Shared handler** `src/services/authLinks.js`: parse URL → validate
  `token_hash` + `type` against an allowlist → call
  `supabase.auth.verifyOtp({ token_hash, type })` → returns
  `{ ok, type, error }`. One-time, short-lived token; consumed over HTTPS
  directly to Supabase. No secrets persist in the URL after handling.
- **Native entry:** handler invoked from the piece-2 listener. On success:
  `type === 'recovery'` → existing recovery flow (PasswordSheet);
  `signup`/`magiclink` → welcome moment. The type allowlist is exactly
  `signup | magiclink | recovery` — the three the templates emit.
- **Web entry:** on boot, if `location.pathname === '/auth/confirm'`, run the
  same handler, then `history.replaceState` to `/` (token never lingers in
  the address bar / history). Requires a vercel.json rewrite:
  `/auth/confirm` → `/index.html` (static SPA has no server routes).
- **Expired/used token:** friendly failure state — "That link has expired —
  request a fresh one" with a resend action. Never a blank screen.
- `AUTH_REDIRECT` / `emailRedirectTo` stays in code (harmless; Supabase
  ignores it once templates stop using `{{ .ConfirmationURL }}`).

## The "feels real" UI package

- **Welcome moment.** When a session starts from a user-visible action (email
  link confirm, password sign-in, magic link — NOT silent session restore on
  app relaunch), show a success surface: avatar initial, email, and sync
  proof pulled live from FoldersContext/AlertsContext ("N watchlist assets
  and M alerts now sync to any device you sign in on"). Implemented as ONE
  shared surface — a lightweight `WelcomeSheet` rendered at App level,
  styled per docs/design-system.md — used by every path (email-link confirm,
  password sign-in, magic link). SignInSheet closes; WelcomeSheet appears.
- **Delete the dead rows.** Remove "Notifications — On" and "Display
  currency — USD" from ProfileSheet. Nothing replaces them until the features
  exist.
- **Form credibility (SignInSheet):** show/hide-password toggle (eye icon);
  live strength hint on the signup password field (client-side heuristic:
  length + character variety → weak / okay / strong, never blocks submission
  beyond the existing 8-char minimum which matches the server rule); copy
  tightened around what an account does.
- **Honest errors:** map Supabase's "Email not confirmed" to "Almost there —
  tap the link we emailed you first", with a **Resend email** button
  (`supabase.auth.resend({ type: 'signup', email })`, respecting Supabase's
  rate limit in copy). Existing native signup copy ("opens in your browser…
  come back and sign in") updated to the new reality ("opens the app").

## Who does what

**User (their accounts; walked through, per standing rule):**
1. Paste 3 updated email templates into Supabase dashboard → Auth → Emails.
2. Only if CI hits a capability error: flip Associated Domains on the App ID
   in the Apple developer portal.

**Assistant:** everything else — AASA + vercel.json, entitlements + pbxproj,
@capacitor/app + listener, authLinks handler + web boot hook, all UI work,
tests, then TestFlight build 7 via the existing
`.github/workflows/ios-testflight.yml` (manual dispatch, build_number=7).

## Sequencing (matters — Apple caches the AASA)

1. Ship web-side first: AASA, rewrite, handler, UI. Deploy (push to main).
2. Verify AASA serves correctly (curl content-type + an AASA validator).
3. User pastes email templates; verify a fresh signup email's link shape.
4. Then build 7 → TestFlight. Apple's CDN fetches AASA at install time;
   propagation can take hours — building after the deploy absorbs the wait.
5. Device test (below).

## Risks, stated honestly

- **Apple CDN propagation:** a freshly-installed build may open links in
  Safari for a few hours after the AASA first deploys. Sequencing above
  minimizes this; it self-resolves.
- **Gmail app's in-app browser** (and some others) doesn't hand links to
  apps. Fallback is the web confirm page — works, just not magical. Apple
  Mail (the user's client) handles Universal Links correctly.
- **CI capability registration** may fail on first attempt (entitlement newly
  added). Known fallback documented above; costs one extra workflow run.
- **Long-press behavior:** iOS users who long-press and choose "Open in
  Safari" get the web fallback by design. Not a defect.

## Testing

- **Unit (vitest, joins the existing 39):** authLinks URL parsing (valid,
  missing params, bogus type, extra params), strength heuristic boundaries,
  "Email not confirmed" error mapping. verifyOtp itself is mocked — network
  isn't unit-testable here.
- **Static checks:** AASA well-formed + content-type after deploy; pbxproj
  entitlement wiring compiles in CI (stage-1 workflow validates before the
  signed build).
- **Device (user, build 7):** delete test account → fresh signup → tap email
  link → app opens → welcome moment shows real counts; forgot-password
  round-trip in-app; magic link visible and working on native; expired-link
  path shows the friendly error.

## Out of scope (deliberate)

- Android deep links (`assetlinks.json`) — same pattern later, not now.
- Deep-linking arbitrary screens (asset pages etc.) — AASA is scoped to
  `/auth/*` only, so ordinary shared links keep opening the website.
- Disabling email confirmation (Approach A) — rejected by user.
- Push notifications — the removed "Notifications" row returns only when the
  real feature exists (roadmap §3.3).
