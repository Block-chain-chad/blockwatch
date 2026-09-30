import { describe, it, expect } from 'vitest'
import { beforeSend, sentryOptions } from './monitoring'

/*
 * Marcus's rule: Sentry never stores a visitor's IP address. The SDK must not
 * ask Sentry to infer one (sendDefaultPii false), and any ip_address that
 * reaches an event is dropped in the browser, whatever the dashboard says.
 */

describe('Sentry privacy settings', () => {
  it('never asks Sentry to infer personal data such as the IP address', () => {
    const options = sentryOptions('https://key@o0.ingest.sentry.io/1')
    expect(options.sendDefaultPii).toBe(false)
    expect(options.beforeSend).toBe(beforeSend)
  })

  it('drops an IP address from the event, including the "infer it" placeholder', () => {
    for (const ip of ['203.0.113.7', '{{auto}}']) {
      const event = beforeSend({ user: { ip_address: ip, id: 'device-1' } })
      expect(event.user).toEqual({ id: 'device-1' })
    }
    expect(beforeSend({ user: { ip_address: '{{auto}}' } }).user).toBeUndefined()
  })

  it('still scrubs sign-in tokens from URLs, breadcrumbs and messages', () => {
    const event = beforeSend({
      request: { url: 'https://onstock.app/auth/confirm?token_hash=abc&type=signup' },
      breadcrumbs: [{ data: { url: '/auth/callback?code=xyz' }, message: 'code=xyz' }],
      exception: { values: [{ value: 'failed at /auth/confirm?token_hash=abc' }] },
    })
    expect(JSON.stringify(event)).not.toMatch(/abc|xyz/)
  })

  it('passes an ordinary event through', () => {
    const event = { message: 'boom' }
    expect(beforeSend(event)).toEqual({ message: 'boom' })
  })
})
