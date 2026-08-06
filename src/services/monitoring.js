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
          for (const ex of event.exception?.values ?? []) {
            if (typeof ex.value === 'string') ex.value = scrub(ex.value)
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
