import { describe, it, expect } from 'vitest'
import { resolveEnvironment, shouldSendTelemetry } from './environment'

/*
 * These two functions decide what every Sentry issue and every PostHog event
 * is labelled with, so the properties worth pinning are:
 *
 *   1. A developer's laptop never claims to be production. That was the bug:
 *      localhost and the live site shared one environment name.
 *   2. Real production is never mislabelled as something quieter. If the
 *      Vercel signal goes missing, the answer must still be "production",
 *      because the opposite failure hides user-facing crashes.
 *   3. Development stays out of the real projects unless asked in.
 */

describe('resolveEnvironment', () => {
  it('calls the vite dev server development, whatever else is set', () => {
    expect(resolveEnvironment({ dev: true })).toBe('development')
    expect(resolveEnvironment({ dev: true, vercelEnv: 'production' })).toBe('development')
    expect(resolveEnvironment({ dev: true, native: true })).toBe('development')
  })

  it('calls the Capacitor WebView ios', () => {
    expect(resolveEnvironment({ native: true })).toBe('ios')
    expect(resolveEnvironment({ native: true, vercelEnv: 'production' })).toBe('ios')
  })

  it('reads the Vercel environment for deployed web builds', () => {
    expect(resolveEnvironment({ vercelEnv: 'production' })).toBe('production')
    expect(resolveEnvironment({ vercelEnv: 'preview' })).toBe('preview')
    expect(resolveEnvironment({ vercelEnv: 'development' })).toBe('development')
  })

  it('tolerates the casing and padding an env var can arrive with', () => {
    expect(resolveEnvironment({ vercelEnv: ' Preview ' })).toBe('preview')
    expect(resolveEnvironment({ vercelEnv: 'PRODUCTION' })).toBe('production')
  })

  it('falls back to production when the Vercel signal is missing or junk', () => {
    // The dangerous direction. A missing signal must not silence production.
    expect(resolveEnvironment()).toBe('production')
    expect(resolveEnvironment({})).toBe('production')
    expect(resolveEnvironment({ vercelEnv: '' })).toBe('production')
    expect(resolveEnvironment({ vercelEnv: undefined })).toBe('production')
    expect(resolveEnvironment({ vercelEnv: 'staging' })).toBe('production')
    expect(resolveEnvironment({ vercelEnv: 42 })).toBe('production')
  })
})

describe('shouldSendTelemetry', () => {
  it('sends from every environment a real user can be in', () => {
    expect(shouldSendTelemetry('production')).toBe(true)
    expect(shouldSendTelemetry('preview')).toBe(true)
    expect(shouldSendTelemetry('ios')).toBe(true)
  })

  it('stays quiet in development by default', () => {
    expect(shouldSendTelemetry('development')).toBe(false)
    expect(shouldSendTelemetry('development', false)).toBe(false)
    expect(shouldSendTelemetry('development', '')).toBe(false)
    expect(shouldSendTelemetry('development', 'false')).toBe(false)
  })

  it('can be opted back in for testing the telemetry itself', () => {
    expect(shouldSendTelemetry('development', true)).toBe(true)
    expect(shouldSendTelemetry('development', 'true')).toBe(true)
  })
})
