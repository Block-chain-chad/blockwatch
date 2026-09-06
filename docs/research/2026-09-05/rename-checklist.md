# BlockWatch → OnStock: everything outside the code

Written 2026-09-05, alongside the `feat/rename-onstock` branch. That branch
changes only what the app *says* its name is. Every step below is something
the code cannot do for you, and most of them are in a dashboard you sign into.
Do them roughly in the order listed — the domain first, because nearly
everything else waits on it.

## What was checked before writing this

| Fact | Status |
| --- | --- |
| `onstock.app` | **available** |
| `onstock.io`, `onstock.co`, `onstock.finance` | available |
| `onstock.com` | taken |
| `github.com/onstock` | taken |
| App Store | there is already a finance app called **"ON STOCK"** by ATON Inc. The full store name **"OnStock: Tokenized Stocks"** is distinct, but Apple is the one who decides — see step 7 |

## What the code branch already does, and what it leaves alone

Changed (all copy, nothing a machine keys on): the browser tab title and
web-manifest name, the header wordmark, the beta lock screen, About, Profile,
the Disclaimer, the custody Learn card, the wallet and swap sheets, the Trade
tab, the share card and its saved filename, the privacy page's product name,
the README, the waitlist welcome email, the three Supabase auth email
templates in `docs/email-templates.md`, the roadmap, and the SQL file headers.

Deliberately **not** changed, because each one still points at something real:

- `app.blockwatch` (bundle id, AASA, entitlements) — changing it makes a
  different app as far as Apple is concerned. Keep it forever; users never see it.
- `package.json` name `blockwatch` — never shown to anyone.
- `bw.*` localStorage keys — renaming them would log every beta user out and
  drop their folders.
- Every `blockwatch.app` URL and `contact@blockwatch.app` address — that is the
  live domain until step 1 and 2 are done.
- The CSP `connect-src`, the CORS allowlist in `api/_cors.js`, `VITE_API_BASE`
  in `.env.ios`, Sentry and PostHog config, the `BlockWatch tracker`
  User-Agent in `api/history.js`.
- `capacitor.config.json` `appName`, `ios/`, `.github/` — native, owner's step 8.
- `supabase/waitlist-newflag.sql` still says "pick the BlockWatch project"
  because that is the project's real name in the Supabase dashboard (step 5).
- `docs/superpowers/` — history; it said BlockWatch when it was written.
- `docs/design-system.md` H1 — internal; rename whenever convenient.

## The steps

### 1. Buy `onstock.app`

- Any registrar. `.app` is an HSTS-preloaded TLD, so it only ever serves over
  HTTPS — that is fine, the site already forces HTTPS.
- Consider also taking `onstock.io` and `onstock.co` so nobody squats a
  lookalike; `.finance` is optional.
- Do NOT let `blockwatch.app` lapse. It has to keep resolving for at least a
  year (step 2).

### 2. Add the domain to Vercel, redirect the old one

- Vercel → project → Settings → Domains → add `onstock.app` and
  `www.onstock.app`. Vercel tells you the DNS records to set at the registrar.
- Make `onstock.app` the primary domain and set `www.onstock.app` to redirect
  to it.
- Keep `blockwatch.app` attached and set it to **redirect (301) to
  `onstock.app`** — Vercel has a "Redirect to" option on the domain row. Keep
  this for **at least a year**: TestFlight release notes, every email already
  sent, the Phantom allowlist submission and the App Store privacy-policy URL
  all name `blockwatch.app`.
- After the redirect is live, open `https://blockwatch.app/privacy.html` on
  your phone and confirm it lands on the OnStock privacy page.

### 3. Security headers and universal links on the new domain

These are in the repo, so they are a small follow-up branch once the domain
resolves (they are not in `feat/rename-onstock` because the domain does not
exist yet):

- `vercel.json` → `Content-Security-Policy` → `connect-src`: add
  `https://onstock.app https://www.onstock.app`. Leave the blockwatch entries
  in for the redirect year.
- `api/_cors.js` → `ALLOWED`: add the two onstock origins the same way.
- `public/.well-known/apple-app-site-association`: no change needed — it keys
  on `92Y88BW5VC.app.blockwatch`, which stays. But it must be **served from
  the new domain** too; Vercel does that automatically once the domain is
  attached. Check `https://onstock.app/.well-known/apple-app-site-association`
  returns the JSON.
- `ios/App/App/App.entitlements`: add `applinks:onstock.app` next to the
  existing `applinks:blockwatch.app` (keep both). The workflow step "Verify
  Universal Links entitlement" greps for `applinks:blockwatch.app`; extend it
  to accept either. This is the one place `.github/` needs a line.

### 4. `VITE_API_BASE` for native builds

- `.env.ios` sets `VITE_API_BASE=https://blockwatch.app`. Once `onstock.app`
  is live, change it to `https://onstock.app`. This is also what the app uses
  as the auth redirect (`AuthContext.jsx` → `AUTH_REDIRECT`), so step 5 must
  be done before a native build with the new value ships, or sign-in emails
  from the phone will bounce.
- Web builds need nothing: they use the page's own origin.

### 5. Supabase

Dashboard → the project currently named **BlockWatch**:

- Settings → General → rename the project to OnStock (cosmetic; the URL and
  keys do not change, so no env vars move).
- Authentication → URL Configuration:
  - **Site URL** → `https://onstock.app` (after step 2; the auth emails link
    straight here with a `token_hash`).
  - **Redirect URLs** → add `https://onstock.app/**` and keep the
    `https://blockwatch.app/**` entry for the redirect year.
- Authentication → Emails → paste the three updated templates from
  `docs/email-templates.md` (subjects and bodies now say OnStock).
- Authentication → SMTP / sender: change the **sender name** to `OnStock`.
  The sender address can stay `contact@blockwatch.app` until the mailbox
  moves (step 10).
- Then update `supabase/waitlist-newflag.sql` line 10 to say "pick the
  OnStock project".

### 6. Sentry

- Sentry → project → Settings → Security & Privacy → **Allowed Domains**: add
  `onstock.app` and `www.onstock.app`. Leave `blockwatch.app` in place.
- Rename the Sentry project to OnStock if you like; the DSN does not change,
  so `VITE_SENTRY_DSN` stays as it is.

### 7. App Store Connect — name and subtitle

- App Store Connect → the app → App Information → **Name**:
  `OnStock: Tokenized Stocks`. Apple checks names for conflicts when you save;
  if it is rejected because of ATON's "ON STOCK", the fallback is to keep the
  subtitle carrying the distinctness, e.g. name `OnStock` + subtitle
  `Tokenized stock tracker`, and if that is rejected too, `OnStock Tracker`.
- **Subtitle** (30 characters max): `Tokenized stocks vs the real thing` is
  34 — use `Tokens vs the real share` or `Tokenized stock tracker`.
- Privacy Policy URL: change to `https://onstock.app/privacy.html` once the
  redirect is live (the old URL keeps working either way).
- The bundle id `app.blockwatch` and SKU stay. Nobody sees them.

### 8. Info.plist display name, then build 11

This is the name under the icon on the iPhone. It is native and lives in
`ios/`, which the code branch does not touch:

- `ios/App/App/Info.plist` → `CFBundleDisplayName` → `OnStock`.
- `capacitor.config.json` → `appName` → `OnStock` at the same time, so the
  two agree.
- Run the `ios-testflight` workflow with `build_number` = **11**. Build 10 is
  what the current tester is on; do not re-upload as 10.

### 9. TestFlight "What to Test" for build 11

Paste something like:

> The app is now called OnStock — same app, same account, same watchlist.
> Nothing you saved is lost. If you still see "BlockWatch" anywhere, tell us
> where. Links in older emails still work.

The draft in `docs/roadmap.md` §1.2 already says OnStock.

### 10. Contact email

- Create `contact@onstock.app` (or whatever mailbox provider handles
  `onstock.app`) and forward `contact@blockwatch.app` to it for the redirect
  year.
- Then, in one follow-up branch: `public/privacy.html` (two links),
  `api/waitlist-join.js` (`from:`), Resend's verified sender domain, the
  Supabase sender address (step 5), and App Store Connect's feedback email.

### 11. GitHub repo — optional

- `github.com/onstock` is taken, so the org name is not available; the repo
  can still be renamed in place (Settings → Rename → `onstock`). GitHub
  redirects the old URL and old `git remote` URLs keep working, so nothing
  breaks and there is no hurry.
- If renamed, update `.claude/launch.json`'s `blockwatch-dev` name whenever
  convenient. It is a local label only.

### 12. X handle

- Manual. Check whether `@onstock` / `@onstockapp` is free and claim it before
  announcing the name. Nothing in the app links to it today.

## Order of operations, condensed

1. Buy domain → 2. attach to Vercel + 301 the old one → 5. Supabase Site URL,
redirects, templates, sender name → 3. CSP / CORS / entitlements branch →
4. `.env.ios` → 8. Info.plist + build 11 → 9. What-to-Test → 7. App Store
name → 6. Sentry → 10. email → 11/12 optional.

Nothing after step 2 is blocking for web users: the moment the domain
redirects, the web app is already OnStock end to end.
