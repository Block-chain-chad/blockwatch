import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/*
 * PostHog files an event with no user agent as "Automation". Every event must
 * carry the browser's user agent and where the visit landed, and none of it
 * may carry a sign-in token, an email or a query string.
 */

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'

let storage
beforeEach(() => {
  vi.resetModules()
  storage = new Map()
  vi.stubGlobal('sessionStorage', {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
  })
  vi.stubGlobal('navigator', { userAgent: UA })
  vi.stubGlobal('location', {
    href: 'https://onstock.app/auth/confirm?token_hash=secret123&type=magiclink&utm_source=x&utm_medium=social#access_token=abc',
  })
  vi.stubGlobal('document', { referrer: 'https://mail.example.com/inbox/message/42?user=someone@example.com' })
})
afterEach(() => vi.unstubAllGlobals())

describe('landingContext', () => {
  it('keeps the landing path and UTM tags, and drops the query, hash and referrer path', async () => {
    const { landingContext } = await import('./analytics')
    expect(landingContext(location.href, document.referrer)).toEqual({
      $current_url: 'https://onstock.app/auth/confirm',
      $pathname: '/auth/confirm',
      utm_source: 'x',
      utm_medium: 'social',
      $referrer: 'https://mail.example.com/',
      $referring_domain: 'mail.example.com',
    })
  })

  it('marks a visit with no referrer, or a non-web one, as direct', async () => {
    const { landingContext } = await import('./analytics')
    for (const ref of ['', undefined, 'not a url', 'android-app://com.google.android.gm/']) {
      expect(landingContext('https://onstock.app/', ref)).toMatchObject({ $referrer: '$direct', $referring_domain: '$direct' })
    }
  })

  it('drops a UTM value that holds an email address or runs long', async () => {
    const { landingContext } = await import('./analytics')
    const ctx = landingContext(`https://onstock.app/?utm_content=a@b.co&utm_term=${'x'.repeat(101)}&utm_campaign=launch`, '')
    expect(ctx.utm_content).toBeUndefined()
    expect(ctx.utm_term).toBeUndefined()
    expect(ctx.utm_campaign).toBe('launch')
  })

  it('survives an address it cannot read', async () => {
    const { landingContext } = await import('./analytics')
    expect(landingContext(undefined, undefined)).toEqual({ $referrer: '$direct', $referring_domain: '$direct' })
  })
})

describe('sessionContext', () => {
  it('carries the raw user agent PostHog classifies traffic by', async () => {
    const { sessionContext } = await import('./analytics')
    expect(sessionContext().$raw_user_agent).toBe(UA)
  })

  it('reads the landing address once per tab, even after the page moves on', async () => {
    const first = (await import('./analytics')).sessionContext()
    vi.stubGlobal('location', { href: 'https://onstock.app/somewhere-else?utm_source=later' })
    vi.resetModules() // a reload in the same tab: fresh module, same sessionStorage
    const again = (await import('./analytics')).sessionContext()
    expect(again.$current_url).toBe(first.$current_url)
    expect(again.utm_source).toBe('x')
  })

  it('never carries a token, an email or a query string', async () => {
    const { sessionContext } = await import('./analytics')
    const text = JSON.stringify(sessionContext())
    for (const bad of ['secret123', 'token_hash', 'access_token', 'someone@example.com', '?', '#']) {
      expect(text).not.toContain(bad)
    }
  })

  it('still works when storage is blocked', async () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    })
    const { sessionContext } = await import('./analytics')
    expect(sessionContext().$current_url).toBe('https://onstock.app/auth/confirm')
  })
})

describe('track', () => {
  it('sends the context with every event, and a caller cannot overwrite it', async () => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test')
    vi.stubEnv('VITE_TELEMETRY_IN_DEV', 'true')
    const fetchMock = vi.fn(async () => ({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('localStorage', { getItem: () => 'device-1', setItem: () => {} })
    const { track } = await import('./analytics')
    track('app_opened', { $raw_user_agent: 'curl/8', $current_url: 'https://evil.example/' })
    const { properties } = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(properties).toMatchObject({
      $raw_user_agent: UA,
      $current_url: 'https://onstock.app/auth/confirm',
      $referring_domain: 'mail.example.com',
      utm_source: 'x',
    })
    vi.unstubAllEnvs()
  })
})
