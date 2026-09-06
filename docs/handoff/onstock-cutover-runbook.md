# OnStock cutover — day-of runbook

Do these in order. Each step says who does it and how to check it worked.
Nothing before step 4 changes what anyone sees.

## 0. Before the day
- [ ] PR #6 (release) reviewed and green. Do not merge yet.
- [ ] PR #7 (this cutover) reviewed and green. Do not merge yet.
- [ ] Vercel: confirm the GitHub integration made a **preview deployment** for
      `feat/domain-onstock` and it built. That proves `vercel.json` parses —
      the redirect rules can't be tested locally.

## 1. Buy the domain — you
Register `onstock.app` at any registrar (Cloudflare, Namecheap, Porkbun).
`.app` is HTTPS-only by design; Vercel handles the certificate.
Optional but cheap: `onstock.io` and `onstock.co`, so nobody squats them.

## 2. Attach it to Vercel — you (I can talk you through it)
Vercel → project → Settings → Domains → Add `onstock.app` and `www.onstock.app`.
Vercel shows the DNS records to create at the registrar (an A record for the
apex, a CNAME for www). Create them; wait until Vercel shows both as **Valid**
with a certificate. Usually minutes, sometimes an hour.
- Check: `https://onstock.app` loads the site (still saying BlockWatch — fine).

## 3. Merge PR #6 (release) — me, on your word
The site says OnStock at both hosts. Candles, desktop pane, code debts go live.
- Check: `https://onstock.app` → "OnStock" in the title; `/api/rates` 200.

## 4. Merge PR #7 (cutover) — me, on your word
Redirects turn on; CORS and CSP know the new host; iPhone files carry both.
- Check: `curl -I https://blockwatch.app/` → `301` to `https://onstock.app/`
- Check: `curl -I https://blockwatch.app/.well-known/apple-app-site-association`
  → **200**, not a redirect (build 10's universal links depend on it)
- Check: `https://blockwatch.app/api/finnhub?kind=quote&symbol=AAPL&c=app`
  → 200 with `Access-Control-Allow-Origin: capacitor://localhost`
  (build 10 keeps working until testers update)
- Check: `https://www.onstock.app` → 301 to the apex.

## 5. Dashboards — you (five minutes total; I can't reach these)
- **Supabase** → Authentication → URL Configuration: Site URL
  `https://onstock.app`; add `https://onstock.app/auth/*` to Redirect URLs.
  Keep the blockwatch.app entries for a month so old emails still work.
  Email templates: paste the updated versions from `docs/email-templates.md`.
- **Sentry** → project settings → Security & Privacy → Allowed Domains:
  add `onstock.app`.
- **Resend** → Domains → add `onstock.app`, create the DNS records it asks
  for, wait for **Verified**. Only then does the sender address move (step 8).
- **Email**: set up `contact@onstock.app` (forwarding to your inbox is enough)
  before you put it on anything public.

## 6. GitHub secret for native builds — me
`VITE_API_BASE` → `https://onstock.app`. Build 11 bakes it in.

## 7. Build 11 — me
Dispatch `ios-testflight.yml` with build number **11**. It carries the OnStock
display name, both universal-link domains, and every merged PR. Attach it to
Friends with a "What to Test" that leads with the new name; approval should be
instant, as with 9 and 10. This also retires the Nov 19 expiry of build 10.
- Check: TestFlight shows **OnStock** as the app name on your phone.

## 8. Sender address — me, after Resend shows Verified
One-line change: `from: 'OnStock <contact@onstock.app>'` in
`api/waitlist-join.js`. Send yourself a test join.

## 9. App Store Connect — you
App Information → Name: **OnStock: Tokenized Stocks** (check Apple accepts it
next to ATON's "ON STOCK"; fallbacks are in `rename-checklist.md`). Subtitle
and TestFlight test information to match.

## 10. Phantom review — you, with the drafted text
`docs/research/2026-09-05/phantom-blowfish-submission.md` has the form fields
and paste-ready text for `onstock.app`. Before filing, fix the three things
that get a request refused on sight: make the repo public (or publish the
gist), make sure production isn't behind the access code, and add the wallet
paragraph to the privacy page.

## 11. Afterwards
- Keep `blockwatch.app` registered and redirecting for at least a year.
- Update memory / README; delete the `handoff/2026-09-05` branch on GitHub.
- Tell your tester the app has a new name (build 11's notes do this).
