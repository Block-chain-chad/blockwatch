// Crash reporting (Sentry), errors only. Four hard rules:
//   1. Never in the critical path — dynamically imported after first paint,
//      so the initial bundle carries zero Sentry bytes.
//   2. Fail-open — no DSN, failed import, failed init: the app neither knows
//      nor cares. Same null-object pattern as services/supabase.js.
//   3. Never ship a live auth token. An error thrown while /auth/confirm or
//      /auth/callback is being handled could carry token_hash or an OAuth
//      code in a URL; scrub them everywhere.
//   4. Every event says where it came from. The environment is resolved once
//      in lib/environment.js, and development is excluded by default so the
//      issue list is only what real users hit.
//   5. No IP addresses. Marcus decided (September 30, 2026) that neither
//      Sentry nor PostHog stores a visitor's IP address. sendDefaultPii stays
//      false, so the SDK never asks Sentry to infer one ("{{auto}}"), and
//      beforeSend drops any ip_address that reaches an event anyway. The
//      Sentry organization setting is a second lock, not the only one.
// No tracing, no replay, no performance — errors only, free-tier friendly
// and consistent with the privacy policy.

import { appEnvironment, telemetryEnabled } from '../lib/environment'

// token_hash from emailed links (/auth/confirm) and the one-time OAuth code
// from /auth/callback.
const TOKEN_RE = /\b(token_hash|code)=[^&#\s]+/g
export const scrub = (s) => (typeof s === 'string' ? s.replace(TOKEN_RE, '$1=[redacted]') : s)

/**
 * Clean one event before it leaves the browser: no auth tokens in URLs,
 * breadcrumbs or messages (rule 3), and no IP address (rule 5).
 */
export function beforeSend(event) {
  if (event.request?.url) event.request.url = scrub(event.request.url)
  for (const crumb of event.breadcrumbs ?? []) {
    if (crumb.data?.url) crumb.data.url = scrub(crumb.data.url)
    if (typeof crumb.message === 'string') crumb.message = scrub(crumb.message)
  }
  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === 'string') ex.value = scrub(ex.value)
  }
  if (event.user) {
    delete event.user.ip_address
    if (Object.keys(event.user).length === 0) delete event.user
  }
  return event
}

/** Everything Sentry.init gets, kept pure so the privacy settings are tested. */
export function sentryOptions(dsn) {
  return { dsn, sendDefaultPii: false, environment: appEnvironment, beforeSend }
}

export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  // Rule 4: a laptop is not a user. Development stays out of Sentry unless
  // VITE_TELEMETRY_IN_DEV says otherwise, so the issue list is only ever
  // things real people hit. See lib/environment.js.
  if (!dsn || !telemetryEnabled) return
  import('@sentry/react')
    .then((Sentry) => {
      Sentry.init(sentryOptions(dsn))
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
