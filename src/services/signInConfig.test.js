import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'

/*
 * The settings the new sign-in methods depend on that live outside the code
 * paths: the auth client's options, the /auth/callback route on Vercel, the
 * universal-link exclusion that keeps that route in the browser, the Sign in
 * with Apple entitlement, the native plugin's provider list, and the scrubbing
 * of one-time codes from crash reports.
 */

vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }))

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

describe('auth client options', () => {
  it('uses PKCE and redeems callbacks explicitly, with passkeys enabled', async () => {
    const { AUTH_OPTIONS } = await import('./supabase')
    expect(AUTH_OPTIONS).toEqual({ flowType: 'pkce', detectSessionInUrl: false, experimental: { passkey: true } })
  })
})

describe('web and iOS configuration', () => {
  it('serves the app at /auth/callback', () => {
    const vercel = JSON.parse(read('vercel.json'))
    expect(vercel.rewrites).toContainEqual({ source: '/auth/callback', destination: '/index.html' })
  })

  it('keeps /auth/callback in the browser, and the emailed links in the app', () => {
    const aasa = JSON.parse(read('public/.well-known/apple-app-site-association'))
    const components = aasa.applinks.details[0].components
    expect(components[0]).toMatchObject({ '/': '/auth/callback', exclude: true })
    expect(components[1]).toEqual({ '/': '/auth/*' })
  })

  it('has the Sign in with Apple entitlement', () => {
    const entitlements = read('ios/App/App/App.entitlements')
    expect(entitlements).toMatch(/<key>com\.apple\.developer\.applesignin<\/key>\s*<array>\s*<string>Default<\/string>/)
  })

  it('bundles only the Apple and Google providers of the native plugin', () => {
    const cap = JSON.parse(read('capacitor.config.json'))
    expect(cap.plugins.SocialLogin.providers).toEqual({ apple: true, google: true, facebook: false, twitter: false })
  })
})

describe('crash report scrubbing', () => {
  it('redacts OAuth codes and emailed-link token hashes', async () => {
    const { scrub } = await import('./monitoring')
    expect(scrub('https://onstock.app/auth/callback?code=abc123&state=x')).toBe(
      'https://onstock.app/auth/callback?code=[redacted]&state=x',
    )
    expect(scrub('https://onstock.app/auth/confirm?token_hash=pkce_abc&type=signup')).toBe(
      'https://onstock.app/auth/confirm?token_hash=[redacted]&type=signup',
    )
    expect(scrub('error_code=bad_oauth_state')).toBe('error_code=bad_oauth_state')
  })
})
