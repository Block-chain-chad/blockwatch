# Quote-Cache Retune + Sentry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ~10 concurrent testers safe on Finnhub's free tier (longer shared quote cache + a strict query-param gate that kills the cache-bypass drain attack) and make crashes reach the developer (Sentry, errors-only, fail-open).

**Architecture:** Server side: one TTL change in api/finnhub.js plus a new shared `rejectUnknownParams` helper applied to the three CDN-cached read proxies, so unknown query keys 400 before any upstream call. Client side: a new `monitoring` service dynamically imports @sentry/react after first paint and registers a `window.__bwReportError` hook that the dependency-free ErrorBoundary calls via optional chaining. Config: CSP connect-src + two workflow env blocks + Vercel/GitHub secrets (user-held).

**Tech Stack:** Vercel serverless (plain JS), vitest, @sentry/react (installed at Task 3), Vite 8.

## Global Constraints

- **NEVER `git push`** — deploys blockwatch.app. Commit locally per task; the deploy happens once at Task 5 after the user's explicit OK in chat.
- Plain JavaScript only — no TypeScript syntax.
- Spec: `docs/superpowers/specs/2026-07-30-quote-cache-sentry-design.md`. Non-goals there are binding (no Redis, no per-IP limits, no tracing/replay, no client polling changes).
- Quote cache becomes exactly `s-maxage=180, stale-while-revalidate=600`. history.js and news.js cache values are NOT changed.
- Allowed query sets exactly: finnhub `kind, symbol, c`; history `symbol, interval, range, c`; news `symbol, c`. The `c` param is legal only with exact value `app` (constants `APP_LANE_PARAM`/`APP_LANE_VALUE` from api/_cors.js — import them, never re-hardcode).
- Sentry: `sendDefaultPii: false`; environment `isNativeApp() ? 'ios' : 'web'`; NO tracing/replay integrations added; missing `VITE_SENTRY_DSN` → silent no-op; every failure path swallowed (monitoring must never break the app).
- Run `npx vitest run` and `npm run lint` before every commit (lint baseline 18 warnings, zero new; suite currently 60 tests). `npm run build` where a task touches client code.
- Commit messages: imperative, no scope prefix, ending with the trailer:
  `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`

---

### Task 1: query-param gate helper

**Files:**
- Create: `api/_params.js`
- Test: `api/_params.test.js`

**Interfaces:**
- Consumes: `APP_LANE_PARAM` (= 'c'), `APP_LANE_VALUE` (= 'app') from `api/_cors.js`
- Produces: `rejectUnknownParams(req, res, allowed: Set<string>) -> boolean` — true means "rejected, caller must return immediately"

- [ ] **Step 1: Write the failing tests**

```js
// api/_params.test.js
import { describe, it, expect, vi } from 'vitest'
import { rejectUnknownParams } from './_params.js'

/*
 * The drain attack this gate closes: every unknown query key mints a fresh
 * edge-cache key, so ?x=1, ?x=2, … converts one shared cached response into
 * unlimited upstream Finnhub calls. Unknown keys must 400 BEFORE upstream.
 */
function mockRes() {
  const res = { statusCode: null, body: null }
  res.status = vi.fn((code) => {
    res.statusCode = code
    return res
  })
  res.json = vi.fn((body) => {
    res.body = body
    return res
  })
  return res
}

const FINNHUB_ALLOWED = new Set(['kind', 'symbol', 'c'])

describe('rejectUnknownParams', () => {
  it('passes known params through untouched', () => {
    const res = mockRes()
    expect(rejectUnknownParams({ query: { kind: 'quote', symbol: 'AAPL' } }, res, FINNHUB_ALLOWED)).toBe(false)
    expect(res.status).not.toHaveBeenCalled()
  })

  it('rejects any unknown param with 400', () => {
    const res = mockRes()
    expect(
      rejectUnknownParams({ query: { kind: 'quote', symbol: 'AAPL', x: '1' } }, res, FINNHUB_ALLOWED),
    ).toBe(true)
    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: 'bad request' })
  })

  it('accepts the cache-lane marker only with its exact value', () => {
    const ok = mockRes()
    expect(
      rejectUnknownParams({ query: { kind: 'quote', symbol: 'AAPL', c: 'app' } }, ok, FINNHUB_ALLOWED),
    ).toBe(false)
    const bad = mockRes()
    expect(
      rejectUnknownParams({ query: { kind: 'quote', symbol: 'AAPL', c: 'bust1' } }, bad, FINNHUB_ALLOWED),
    ).toBe(true)
    expect(bad.statusCode).toBe(400)
  })

  it('handles empty or missing query safely', () => {
    const res = mockRes()
    expect(rejectUnknownParams({ query: {} }, res, FINNHUB_ALLOWED)).toBe(false)
    expect(rejectUnknownParams({}, res, FINNHUB_ALLOWED)).toBe(false)
    expect(res.status).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run api/_params.test.js`
Expected: FAIL — cannot resolve `./_params.js`

- [ ] **Step 3: Implement**

```js
// api/_params.js
// Strict query allowlist for the CDN-cached read proxies. Unknown params are
// rejected BEFORE any upstream call: every unrecognized key mints a fresh
// edge-cache key, so junk params (?x=1) would otherwise convert one shared
// cached response into unlimited upstream calls against Finnhub's shared
// 60/min budget — a free deliberate-drain attack. The `c` cache-lane marker
// is legal only with its exact value (see APP_LANE_VALUE in ./_cors.js).

import { APP_LANE_PARAM, APP_LANE_VALUE } from './_cors.js'

/**
 * Returns true when the request was rejected (400 already sent — caller must
 * return immediately); false when every param is recognized.
 */
export function rejectUnknownParams(req, res, allowed) {
  const query = req?.query ?? {}
  for (const key of Object.keys(query)) {
    if (!allowed.has(key)) {
      res.status(400).json({ error: 'bad request' })
      return true
    }
  }
  if (APP_LANE_PARAM in query && query[APP_LANE_PARAM] !== APP_LANE_VALUE) {
    res.status(400).json({ error: 'bad request' })
    return true
  }
  return false
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run api/_params.test.js`
Expected: PASS (4 tests). Then full suite: `npx vitest run` → 64 tests pass.

- [ ] **Step 5: Lint, then commit**

Run: `npm run lint` (18 warnings, none new)

```bash
git add api/_params.js api/_params.test.js
git commit -m "Reject unknown query params before they reach upstream"
```

---

### Task 2: wire the gate into the three proxies + quote TTL retune

**Files:**
- Modify: `api/finnhub.js` (gate + the one TTL line)
- Modify: `api/history.js` (gate)
- Modify: `api/news.js` (gate)

**Interfaces:**
- Consumes: `rejectUnknownParams(req, res, allowed) -> boolean` (Task 1)

- [ ] **Step 1: finnhub.js**

Add to imports: `import { rejectUnknownParams } from './_params.js'`

Add below the `ALLOWED` table:

```js
const ALLOWED_PARAMS = new Set(['kind', 'symbol', 'c'])
```

In `handler`, directly after `if (handlePreflight(req, res)) return`, add:

```js
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return
```

Change the quote line in the `ALLOWED` table from:

```js
  quote: { path: '/quote', cache: 's-maxage=55, stale-while-revalidate=300' },
```

to:

```js
  // 180s shared cache: ~50 polled symbols become ~17 upstream calls/min per
  // edge-cache copy, so several concurrent tester regions fit Finnhub's
  // 60/min free tier. The client's UpdatedAgo pulse shows the honest age.
  quote: { path: '/quote', cache: 's-maxage=180, stale-while-revalidate=600' },
```

- [ ] **Step 2: history.js**

Add to imports: `import { rejectUnknownParams } from './_params.js'`

Add below the `RANGES` set:

```js
const ALLOWED_PARAMS = new Set(['symbol', 'interval', 'range', 'c'])
```

In `handler`, directly after `if (handlePreflight(req, res)) return`, add:

```js
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return
```

Do NOT change history.js's cache values.

- [ ] **Step 3: news.js**

Add to imports: `import { rejectUnknownParams } from './_params.js'`

Add above the handler:

```js
const ALLOWED_PARAMS = new Set(['symbol', 'c'])
```

In `handler`, directly after `if (handlePreflight(req, res)) return`, add:

```js
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return
```

Do NOT change news.js's cache values.

- [ ] **Step 4: Verify**

Run: `npx vitest run` → 64 pass. `npm run lint` → 18 baseline. `npm run build` → exit 0 (client untouched but proves nothing broke).

- [ ] **Step 5: Commit**

```bash
git add api/finnhub.js api/history.js api/news.js
git commit -m "Gate proxy query params and stretch the quote cache to 3 minutes"
```

---

### Task 3: monitoring service (Sentry, errors-only, fail-open)

**Files:**
- Create: `src/services/monitoring.js`
- Modify: `src/main.jsx` (import + one call after render)
- Modify: `src/components/ErrorBoundary.jsx` (one line in componentDidCatch)
- Modify: `package.json` / `package-lock.json` (npm install)

**Interfaces:**
- Consumes: `isNativeApp()` from `src/lib/platform.js`
- Produces: `initMonitoring() -> void`; global `window.__bwReportError?: (error, componentStack?) => void`

- [ ] **Step 1: Install the SDK**

Run: `npm install @sentry/react`
Expected: installs cleanly. Note the installed major version in your report.

- [ ] **Step 2: Create the service**

```js
// src/services/monitoring.js
// Crash reporting (Sentry), errors only. Three hard rules:
//   1. Never in the critical path — dynamically imported after first paint,
//      so the initial bundle carries zero Sentry bytes.
//   2. Fail-open — no DSN, failed import, failed init: the app neither knows
//      nor cares. Same null-object pattern as services/supabase.js.
//   3. Never ship a live auth token — an error thrown while /auth/confirm is
//      being handled could carry token_hash in a URL; scrub it everywhere.
// No tracing, no replay, no performance — errors only, free-tier friendly
// and consistent with the privacy policy (sendDefaultPii false).

import { isNativeApp } from '../lib/platform'

const TOKEN_RE = /token_hash=[^&#\s]+/g
const scrub = (s) => (typeof s === 'string' ? s.replace(TOKEN_RE, 'token_hash=[redacted]') : s)

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn) return
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init({
        dsn,
        sendDefaultPii: false,
        environment: isNativeApp() ? 'ios' : 'web',
        beforeSend(event) {
          if (event.request?.url) event.request.url = scrub(event.request.url)
          for (const crumb of event.breadcrumbs ?? []) {
            if (crumb.data?.url) crumb.data.url = scrub(crumb.data.url)
            if (typeof crumb.message === 'string') crumb.message = scrub(crumb.message)
          }
          return event
        },
      })
      // The ErrorBoundary reports through this hook (optional-chained there),
      // keeping the boundary itself dependency-free — it must render even
      // when monitoring is the thing that broke.
      window.__bwReportError = (error, componentStack) => {
        try {
          Sentry.captureException(
            error,
            componentStack ? { contexts: { react: { componentStack } } } : undefined,
          )
        } catch {
          // reporting must never throw
        }
      }
    })
    .catch(() => {
      // monitoring is optional; the app never depends on it
    })
}
```

- [ ] **Step 3: Call it from main.jsx**

Add to imports in `src/main.jsx`:

```js
import { initMonitoring } from './services/monitoring'
```

After the `createRoot(...).render(...)` call, add:

```js
// Crash reporting starts after first paint — it can never slow launch, and
// if it fails to load the app runs exactly as before (see monitoring.js).
setTimeout(initMonitoring, 0)
```

- [ ] **Step 4: Hook the ErrorBoundary**

In `src/components/ErrorBoundary.jsx`, `componentDidCatch` currently reads:

```js
  componentDidCatch(error, info) {
    // Console only — no network call, nothing that could throw in turn.
    console.error('App crashed:', error, info?.componentStack)
  }
```

Replace with:

```js
  componentDidCatch(error, info) {
    console.error('App crashed:', error, info?.componentStack)
    // Also reach the developer, when monitoring is up. Optional-chained global
    // set lazily by services/monitoring.js — the boundary stays free of
    // imports so it renders even when a dependency is what broke.
    window.__bwReportError?.(error, info?.componentStack)
  }
```

Also update the file's header comment: change the line "it imports no context, no analytics and no app state" — append ", and reports crashes only through an optional global set by services/monitoring.js".

- [ ] **Step 5: Verify**

Run: `npx vitest run` → 64 pass. `npm run lint` → 18 baseline. `npm run build` → exit 0 AND confirm the output lists a separate chunk for Sentry (dynamic import) — grep the build output for a chunk not named index that appears only after this change; note it in your report. Also verify with `grep -c "sentry" dist/assets/index*.js` that the MAIN bundle has no sentry code when VITE_SENTRY_DSN is unset (expect 0 matches; the dynamic chunk file is allowed to exist).

- [ ] **Step 6: Commit**

```bash
git add src/services/monitoring.js src/main.jsx src/components/ErrorBoundary.jsx package.json package-lock.json
git commit -m "Report crashes to Sentry, errors only, fail-open"
```

---

### Task 4: config plumbing — CSP + workflow env

**Files:**
- Modify: `vercel.json` (CSP connect-src)
- Modify: `.github/workflows/ios-testflight.yml` (env block ~line 111-114 + secrets doc comment ~line 51-52)
- Modify: `.github/workflows/ios-build.yml` (env block ~line 39-42 + secrets doc comment ~line 13)

- [ ] **Step 1: CSP**

In `vercel.json`, in the `Content-Security-Policy-Report-Only` value, change the connect-src list — after `https://eu.i.posthog.com` and before `; font-src` — to also include:

```
 https://*.ingest.sentry.io https://*.ingest.us.sentry.io
```

(Exactly two additions, space-separated, inside connect-src. Touch nothing else in the header. The rest of the CSP string must remain byte-identical — edit surgically, do not retype the line.)

- [ ] **Step 2: ios-testflight.yml**

In the `Build web app (ios mode) and sync` step's `env:` block (currently VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_POSTHOG_KEY), add:

```yaml
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}
```

And update the header comment that lists stage-1 secrets ("Plus the three already set for stage 1: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_POSTHOG_KEY.") to read "Plus the four already set for stage 1: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_POSTHOG_KEY, VITE_SENTRY_DSN."

- [ ] **Step 3: ios-build.yml**

Same two changes: add the `VITE_SENTRY_DSN` line to the build step's `env:` block, and update the required-secrets doc comment to include VITE_SENTRY_DSN.

- [ ] **Step 4: Verify + commit**

`git diff --check` clean; `npm run lint` 18 baseline (yaml not linted, but prove no accidental JS edits).

```bash
git add vercel.json .github/workflows/ios-testflight.yml .github/workflows/ios-build.yml
git commit -m "Let the CSP and iOS builds carry the Sentry DSN"
```

---

### Task 5: deploy gate + live verification + Sentry account (controller + user)

No implementer dispatch — controller-run with user checkpoints.

- [ ] **Step 1: STOP — user creates the Sentry account**

User (their account): sentry.io → sign up (free) → Create project → platform **React** → name `blockwatch`. The project page shows a **DSN** (https://…@…ingest…sentry.io/…). User pastes the DSN into chat (it is publishable — safe to share and to ship).

- [ ] **Step 2: User adds the DSN where it lives**

Walked through, their accounts: (a) Vercel → blockwatch project → Settings → Environment Variables → add `VITE_SENTRY_DSN` = the DSN, Production + Preview; (b) GitHub → repo Settings → Secrets and variables → Actions → New repository secret `VITE_SENTRY_DSN` = the DSN. Local: controller appends `VITE_SENTRY_DSN=…` to `blockwatch/.env.local` (git-ignored).

- [ ] **Step 3: STOP — ask deploy permission**

Exactly this decision: "Ready to deploy the cache retune + param gate + Sentry to blockwatch.app?" Do not push until the user says yes. Then merge branch → main, push.

- [ ] **Step 4: Live verification (controller)**

```bash
curl -sD - -o /dev/null "https://blockwatch.app/api/finnhub?kind=quote&symbol=AAPL" | grep -i "cache-control\|HTTP/"
```
Expected: 200 + `s-maxage=180, stale-while-revalidate=600`.

```bash
curl -s -o /dev/null -w "%{http_code}" "https://blockwatch.app/api/finnhub?kind=quote&symbol=AAPL&x=1"
```
Expected: `400`.

```bash
curl -sD - -o /dev/null "https://blockwatch.app/api/finnhub?kind=quote&symbol=AAPL&c=app" | grep -i "access-control-allow-origin"
```
Expected: `capacitor://localhost` (app lane intact).

```bash
curl -s -o /dev/null -w "%{http_code}" "https://blockwatch.app/api/finnhub?kind=quote&symbol=AAPL&c=nope"
```
Expected: `400`.

- [ ] **Step 5: Sentry end-to-end (user sees it land)**

On the deployed site (user signed in to Sentry): open blockwatch.app, open devtools console, run `window.__bwReportError(new Error('sentry-wiring-test'))`. Within a minute the error appears in the user's Sentry dashboard, environment `web`. That moment is acceptance. (If the user prefers not to open devtools, controller triggers it from the Browser pane instead and the user just watches the dashboard.)

- [ ] **Step 6: Ledger + memory update, close the round**

Record completion; note that the next native build (whenever one ships) bakes the DSN via the new secret — no build is forced by this round.

---

## Self-review (done at write time)

- **Spec coverage:** TTL retune ✓(T2) param gate + helper + tests ✓(T1-2) c-value rule ✓(T1) Sentry service/fail-open/scrub/environment ✓(T3) ErrorBoundary hook ✓(T3) post-paint init ✓(T3) CSP ✓(T4) env plumbing ✓(T4, T5 step 2) verification curls + dashboard moment ✓(T5) non-goals untouched ✓ (no Redis/limits/tracing/client changes anywhere).
- **Type consistency:** `rejectUnknownParams(req, res, allowed)` identical in T1 def and T2 call sites; `window.__bwReportError(error, componentStack)` identical in T3 service and boundary; `initMonitoring` name identical in service and main.jsx.
- **Placeholder scan:** clean — every step carries exact code, exact strings, or exact commands.
