# Quote-cache retune + Sentry: survive the first testers

Design spec, approved 2026-07-30. Scope: the free-tier configuration that
makes ~10 concurrent TestFlight/web testers safe. The paid-tier path (central
Redis cache, per-IP rate limiting, possibly a paid Finnhub tier) is a
deliberate NON-GOAL until the user upgrades plans at launch — roadmap Phase 1.5
territory, alongside Vercel Pro.

## Problem

1. **Finnhub free tier = 60 calls/min shared across every user.** The app
   polls up to 50 stock symbols/min. Quotes are edge-cached (s-maxage=55) but
   cache copies multiply: web lane × app lane (deliberate CORS design) ×
   Vercel edge region. ~50 upstream/min per copy ≈ the whole budget before a
   second copy exists. Two testers in different cities → silent stale prices,
   indistinguishable from the CORS bug.
2. **No request hygiene:** any query param not understood is ignored, so
   `?x=123` mints a fresh cache key and an upstream call — a trivial
   deliberate-drain vector (standing debt from the security review).
3. **Nothing reports errors to the developer.** ErrorBoundary tells the
   *user*; console.error tells nobody. A tester's crash is a bug that never
   existed. Async errors and rejected promises aren't even caught for the
   user.

User decision: ~3-minute stock-price staleness is acceptable for beta (token
prices are unaffected — Jupiter fast lane keeps ticking live). The existing
UpdatedAgo pulse shows honest FETCH age (not per-quote age: the stock leg can be up to ~4 min older than the label implies, and drift alerts may fire on a stock leg that stale — accepted within the 3-minute decision); no client change needed.

## Design

### 1. Cache retune (api/finnhub.js)

One line in the ALLOWED table:

- `quote`: `s-maxage=55, stale-while-revalidate=300` → **`s-maxage=180,
  stale-while-revalidate=600`**.

All other kinds keep their current values (profile/metric/earnings/
recommendation are hours-long already; news is 30 min). api/history.js keeps
its current values (candles are range-scoped and long-cached; confirmed at
plan time by reading the file).

Effect: worst case ≈ 17 quote calls/min per cache copy (50 symbols / 3 min),
so ~3 concurrent cache copies fit the 60/min budget with headroom, vs ~1
today. stale-while-revalidate=600 means bursts and Finnhub hiccups serve a
stale-but-real price instead of an error or a gap.

### 2. Strict query-param gate (new api/_params.js + all read proxies)

- New shared helper `api/_params.js`: `export function rejectUnknownParams(
  req, res, allowed)` — `allowed` is a Set of permitted query keys. Any key
  outside the set, or a `c` param present with value ≠ `app`, sends
  `400 {error:'bad request'}` and returns true (caller returns immediately).
  Runs BEFORE any upstream fetch and before cache headers are set.
- Applied to `api/finnhub.js` (allowed: kind, symbol, c), `api/history.js`
  and `api/news.js` (allowed sets confirmed from each file's actual query
  reads at plan time). POST endpoints (waitlist-join, csp-report) are
  untouched — they are no-store and Origin-gated already.
- Pure logic lives in the helper and gets vitest coverage (the repo's first
  api-side unit test; vitest's default include pattern picks up
  `api/_params.test.js`).

This closes the junk-param cache-bypass hole at zero infra cost. Per-IP rate
limiting stays a NON-GOAL until the Redis tier exists (documented above).

### 3. Sentry (errors only, load-late, fail-open)

- New `src/services/monitoring.js`: `initMonitoring()` called from main.jsx
  AFTER first paint (setTimeout(…, 0) post-render). Dynamically imports
  `@sentry/react`; if the import or init throws, the app never notices
  (try/catch, no rethrow). No Sentry code in the critical path, ~0 bytes in
  the initial bundle (separate chunk).
- `Sentry.init` config: `dsn: import.meta.env.VITE_SENTRY_DSN` (publishable;
  absent → init is a silent no-op, exactly like the supabase-null pattern),
  default error integrations ONLY (global error handler + unhandledrejection
  — no browserTracing, no replay, no performance), `sendDefaultPii: false`,
  `environment: isNativeApp() ? 'ios' : 'web'`, `beforeSend` scrubs
  `token_hash=[^&]+` from every URL-bearing field (request url, breadcrumb
  urls) — an error thrown during /auth/confirm handling must never ship a
  live token.
- ErrorBoundary stays dependency-free: `componentDidCatch` adds ONE line —
  `window.__bwReportError?.(error, info?.componentStack)` (optional-chained
  global, set by monitoring.js when Sentry is ready). Errors thrown before
  Sentry loads are lost by design — the boundary still renders its recovery
  screen regardless.
- CSP (report-only header in vercel.json): `connect-src` gains
  `https://*.ingest.sentry.io https://*.ingest.us.sentry.io`.
- Config plumbing: `VITE_SENTRY_DSN` goes to (a) blockwatch/.env.local,
  (b) Vercel env Production+Preview, (c) a GitHub Actions secret consumed by
  both iOS workflows' build steps — native builds bake it like the Supabase
  keys.

### 4. Who does what

- **User:** create the free Sentry account (sentry.io → new project → React),
  hand over the DSN; paste it into Vercel env and the GitHub secret (walked
  through, their accounts). Later, watch the test error arrive in their
  dashboard — the acceptance moment.
- **Assistant:** everything else, same SDD loop as the deep-link round
  (branch, per-task review, final review, deploy gate before any push).

## Verification

- Unit: `api/_params.test.js` — allowed sets pass, unknown key 400s, `c=app`
  passes, `c=anything-else` 400s, no-param requests pass.
- Live post-deploy curls: `/api/finnhub?kind=quote&symbol=AAPL` header shows
  `s-maxage=180, stale-while-revalidate=600`; same URL + `&x=1` returns 400;
  `&c=app` still returns 200 with the fixed app-lane ACAO.
- Sentry: one deliberate test error (dev console `throw` via a temporary
  button or `window.__bwReportError(new Error('sentry-wiring-test'))`)
  visible in the user's Sentry dashboard, tagged with the right environment.
- Suite + lint + build green throughout (63+ tests after the new file).

## Non-goals (explicit, per user decision "for now until i upgrade to paid plans")

- Central Redis/KV cache and per-IP rate limiting — launch tier.
- Paid Finnhub (research pricing against measured usage when upgrading).
- Client polling changes, UpdatedAgo changes — already honest.
- Sentry performance tracing/replay — errors only on the free tier.
- CSP enforcement flip — separate errand, unchanged by this round beyond the
  connect-src addition.

Deployed to production 2026-07-31.
