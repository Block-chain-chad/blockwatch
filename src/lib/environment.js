// One answer to "where is this build running", shared by crash reporting
// (services/monitoring.js) and product analytics (services/analytics.js) so
// the two always agree.
//
// Why this exists: every web build used to report the Sentry environment
// "web", so a crash on a laptop at localhost:5173 was indistinguishable from
// one a real user hit in production (three of the four open issues were
// local). PostHog events carried no environment at all, so a developer
// clicking around counted as product usage.
//
// Signals, in the order they are trusted:
//   1. import.meta.env.DEV, true only under `vite dev`. That is the laptop.
//   2. The Capacitor WebView, which is the shipped iOS app.
//   3. VERCEL_ENV ("production" | "preview" | "development"), which Vercel
//      sets on the build. vite.config.js copies it into VITE_VERCEL_ENV,
//      because only VITE_-prefixed variables reach the browser.
//
// Anything else is treated as production on purpose. Labelling a local
// `vite preview` production costs nothing; labelling real production as local
// would quietly hide the errors that matter most.

import { isNativeApp } from './platform'

/**
 * @param {{ dev?: boolean, native?: boolean, vercelEnv?: string }} signals
 * @returns {'development' | 'preview' | 'production' | 'ios'}
 */
export function resolveEnvironment({ dev = false, native = false, vercelEnv = '' } = {}) {
  if (dev) return 'development'
  if (native) return 'ios'
  const vercel = typeof vercelEnv === 'string' ? vercelEnv.trim().toLowerCase() : ''
  if (vercel === 'preview') return 'preview'
  if (vercel === 'development') return 'development'
  return 'production'
}

/**
 * Should this build talk to the real Sentry and PostHog projects?
 *
 * Development is off by default. It was most of the noise in Sentry, and it
 * inflates every PostHog number with a developer's own clicking. Set
 * VITE_TELEMETRY_IN_DEV=true in .env.local when the telemetry itself is what
 * you are testing. Vite passes env values through as strings, so accept both.
 */
export function shouldSendTelemetry(environment, allowInDev) {
  if (environment !== 'development') return true
  return allowInDev === true || allowInDev === 'true'
}

export const appEnvironment = resolveEnvironment({
  dev: import.meta.env.DEV,
  native: isNativeApp(),
  vercelEnv: import.meta.env.VITE_VERCEL_ENV,
})

export const telemetryEnabled = shouldSendTelemetry(
  appEnvironment,
  import.meta.env.VITE_TELEMETRY_IN_DEV,
)
