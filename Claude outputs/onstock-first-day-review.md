# Onstock: first-day engineering review

Written by the Onstock Software Engineer on September 15, 2026. Read-only: nothing in the repository or any service was changed.

> **Checked afterward by Claude:** the app's line about the Securities and Exchange Commission approving Nasdaq's tokenized trading in March 2026 is accurate. The commission approved Nasdaq's rule change that month ([CoinDesk](https://www.coindesk.com/policy/2026/03/18/sec-approves-nasdaq-s-move-to-allow-tokenized-securities-trading), [Federal Register](https://www.federalregister.gov/documents/2026/03/23/2026-05563/self-regulatory-organizations-the-nasdaq-stock-market-llc-order-approving-a-proposed-rule-change-as)). The other swap concerns below still stand.

## Onstock today
A tracker showing each tokenized stock (711 assets: xStocks, Ondo, bStocks) beside its real share and the gap between them. No holdings or portfolio values; "folders" are watchlists. It has a real-money path: an in-app non-custodial swap (Jupiter builds the transaction, the user's Phantom wallet signs), on `main` (added July 23).

Stack: JavaScript, React 19, Vite 8, Tailwind 4, npm, Node 22. Vercel serverless proxies in `api/`, Supabase email accounts with row level security, PostHog, Sentry, Capacitor 8 iOS shell. Prices: CoinGecko and Finnhub every 60 seconds, Jupiter every 2.5 seconds.

Configuration names: `VITE_FINNHUB_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`, `VITE_SENTRY_DSN`, `VITE_COINGECKO_API_KEY`, `VITE_API_BASE`, `VITE_ACCESS_HASH`; server `FINNHUB_API_KEY`, `RESEND_API_KEY`.

Git: GitHub `Block-chain-chad/blockwatch`. Branch `feat/desktop-big-screen` (HEAD `72603f1`, today) has no upstream and is 63 commits ahead of `main` (last updated August 20); 11 of today's commits are on no remote branch. The 153 "modified" files differ only in line endings; `.github/workflows/ci.yml` and some docs are untracked.

## Health
Installed dependencies are Windows-only native builds, so the checks ran on Node 22 against a clean export of the current commit, outside the repository.
- `npm ci`: pass
- `npm run lint`: pass, 0 errors, 18 warnings
- `npm test`: pass, 441 tests
- `npm run build`: pass
- Type checker: not present
- `npm audit`: 7 advisories; the only high one is in Capacitor's command-line tool, which is not shipped
- `ci.yml` was never committed, so GitHub runs no checks

## Risks found
1. **Swap lacks money controls.** `src/services/swap.js:116-140` hands whatever Jupiter returns to the wallet without checking it against the quote, and writes no audit record (only an analytics event, `swap.js:141`). Token addresses come unverified from CoinGecko (`scripts/build-universe.mjs:276`); a wrong one buys the wrong token. The double-submit guard reads React state (`src/overlays/SwapSheet.jsx:209`). Medium.
2. **Stale share prices labeled live.** `src/components/asset/GapPanel.jsx:50-56` (on `main`: `AssetDetail.jsx:217`) marks the share "live" using the token feed's fetch time. `src/services/stocks.js:37,45,72,80` stamps undated quotes with the current time and falls back to previous close. `src/lib/market.js:19-44` ignores holidays, early closes, and halts, so on Thanksgiving the prior close reads as a live spread. The proxy serves quotes up to 13 minutes old (`api/finnhub.js:17`). Medium.
3. **Alerts fire on phantom gaps.** `src/state/AlertsContext.jsx:180-218` evaluates drift after hours and pre-market, where the app itself says gaps are unreliable; today's commit turns these into system notifications (`src/hooks/useAlertNotifications.js:33-37`). Small.
4. **No corporate actions.** `src/lib/prices.js:22-25` assumes one token equals one share; splits, dividends, or issuer ratios create false gaps. Medium.
5. **Finnhub quota can be drained.** `api/finnhub.js:37` accepts any 1 to 10 character symbol, each a new cache key, unthrottled, so one script can blank share prices for everyone. Small.
6. **Waitlist can mail arbitrary addresses.** The Origin check in `api/waitlist-join.js:69-81` is forgeable and unthrottled; if `supabase/waitlist-newflag.sql` was never applied, repeat joins re-send. Small.
7. **Privacy policy out of date.** `public/privacy.html` omits Sentry, Jupiter, and wallet connection, and says push-notification access is disabled, yet `src/overlays/SetAlertSheet.jsx:197` requests notification permission. Small.
8. **Floating point for displayed money.** `swap.js:197-199`, `src/services/jupiter.js:49-66`, `src/lib/reading.js:34-37`. Transaction sizing correctly uses BigInt. Small.
9. **Access gate is not security.** `src/components/AccessGate.jsx:15-23` is client-side and bypassable by editing local storage. Small.

Clean: no secrets in tracked files or any of 183 commits (pattern scan), no Finnhub key in the local bundle, database timestamps in Coordinated Universal Time, and row level security in the SQL files looks correct.

## Connected services
- **Sentry:** 4 unresolved issues in 14 days, 8 events; top is BLOCKWATCH-A (5 events, missing module export). Three of the four come from `localhost:5173`. Development and production share environment `web`.
- **Vercel:** not checked: no `.vercel/project.json`, and listing teams returns none.
- **Supabase:** "BlockWatch" is paused. Code expects `user_folders`, `user_alerts` (plus `rule` jsonb), `feedback`, `waitlist`, the `join_waitlist` function, and email auth. Sign-in, sync, feedback, and waitlist joins fail while paused.
- **PostHog:** data flowing: 302 `app_opened` from 99 device IDs in 30 days, latest today. `waitlist_join`, `wallet_connect`, and `swap_sent` never recorded. Events carry no environment.
- **Resend:** `blockwatch.app` verified, sending enabled. No sent emails.

## Top 5 tasks recommended
1. **Swap safety:** verify the built transaction matches the quote, pin issuer-verified token addresses, write an audit record, lock against double submits. Why: real user funds. Medium.
2. **Honest freshness:** per-quote timestamps, no current-time fallback, a holiday and early-close calendar, a stale badge on the phone gap panel. Why: users decide on this number. Medium.
3. **Gate drift alerts and notifications** to the regular session with a fresh quote. Why: false alerts teach users to ignore real ones. Small.
4. **Commit `ci.yml`, push today's work, tag analytics and Sentry by environment.** Why: unbacked work, no checks, blind monitoring. Small.
5. **Harden public endpoints:** symbol allowlist and rate limits for `api/finnhub.js` and the waitlist. Why: one script can blank prices or spam inboxes. Small.

## Decisions for Terra
1. **Keep the in-app swap reachable before legal review?** Anyone, in any region, can swap tokenized stocks inside Onstock. `src/screens/Trade.jsx` labels Jupiter "Open to you" beside venues that exclude US customers. This touches securities law, regional access, and disclosures. Recommendation: switch it off until task 1 is done and a lawyer has weighed in.
2. **Restore Supabase?** Accounts and the waitlist are down. Recommendation: restore when you want accounts live, then have the engineer verify the schema and migrations.
3. **Pay for extended-hours share data?** Recommendation: not yet; label pre-market and after-hours gaps honestly first.
