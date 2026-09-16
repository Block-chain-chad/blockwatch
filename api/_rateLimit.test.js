import { describe, it, expect, vi } from 'vitest'
import {
  clientKey,
  createRateLimiter,
  opaqueKey,
  sendTooManyRequests,
} from './_rateLimit.js'

/*
 * The bucket is best-effort by design (per instance, lost on cold start), so
 * what these tests pin down is the part that must be exactly right: the
 * arithmetic, the memory bound, and the fact that a 429 is never cacheable.
 * Time is injected everywhere — a limiter test that sleeps is a flaky test.
 */

function mockRes() {
  const res = { statusCode: null, body: null, headers: {} }
  res.setHeader = vi.fn((k, v) => {
    res.headers[k] = v
  })
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

describe('createRateLimiter', () => {
  it('allows exactly `capacity` requests in a burst, then refuses', () => {
    const limiter = createRateLimiter({ capacity: 3, refillPerSecond: 1 })
    expect(limiter.take('a', 0).ok).toBe(true)
    expect(limiter.take('a', 0).ok).toBe(true)
    expect(limiter.take('a', 0).ok).toBe(true)
    expect(limiter.take('a', 0).ok).toBe(false)
  })

  it('refills at the configured rate', () => {
    const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 1 })
    limiter.take('a', 0)
    limiter.take('a', 0)
    expect(limiter.take('a', 500).ok).toBe(false) // half a token
    expect(limiter.take('a', 1000).ok).toBe(true) // one token back
    expect(limiter.take('a', 1000).ok).toBe(false)
  })

  it('never refills past capacity, so an idle caller cannot bank a flood', () => {
    const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 1 })
    limiter.take('a', 0)
    limiter.take('a', 0)
    // An hour idle would be 3600 tokens if the cap were not enforced.
    expect(limiter.take('a', 3_600_000).ok).toBe(true)
    expect(limiter.take('a', 3_600_000).ok).toBe(true)
    expect(limiter.take('a', 3_600_000).ok).toBe(false)
  })

  it('keeps callers independent', () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1 })
    expect(limiter.take('a', 0).ok).toBe(true)
    expect(limiter.take('a', 0).ok).toBe(false)
    expect(limiter.take('b', 0).ok).toBe(true)
  })

  it('reports whole seconds until the next token', () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 0.5 })
    limiter.take('a', 0)
    // Empty bucket, half a token per second: 2s for the next one.
    expect(limiter.take('a', 0).retryAfter).toBe(2)
    // Never zero — a Retry-After of 0 invites an instant retry loop.
    const fast = createRateLimiter({ capacity: 1, refillPerSecond: 1000 })
    fast.take('b', 0)
    expect(fast.take('b', 0).retryAfter).toBe(1)
  })

  it('bounds memory when a caller rotates keys', () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1, maxKeys: 10 })
    for (let i = 0; i < 1000; i += 1) limiter.take(`key-${i}`, 0)
    expect(limiter.size).toBeLessThanOrEqual(10)
  })

  it('evicts the least recently used key, not the busiest one', () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1, maxKeys: 2 })
    limiter.take('heavy', 0) // spent
    limiter.take('idle', 0)
    limiter.take('heavy', 0) // touch again -> 'idle' is now least recent
    limiter.take('newcomer', 0) // evicts 'idle'
    // 'heavy' survived, so it is still empty and still refused.
    expect(limiter.take('heavy', 0).ok).toBe(false)
  })

  it('does not drain a bucket when the clock steps backwards', () => {
    const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 1 })
    limiter.take('a', 10_000)
    // Same bucket, an earlier timestamp: negative elapsed must not subtract.
    expect(limiter.take('a', 9_000).ok).toBe(true)
    expect(limiter.take('a', 9_000).ok).toBe(false)
  })

  it('stays bounded even when every single request is refused', () => {
    // A capacity below one refuses on first contact, so the allowed path never
    // runs. The map must still not grow without limit.
    const limiter = createRateLimiter({ capacity: 0, refillPerSecond: 1, maxKeys: 5 })
    for (let i = 0; i < 500; i += 1) expect(limiter.take(`key-${i}`, 0).ok).toBe(false)
    expect(limiter.size).toBeLessThanOrEqual(5)
  })

  it('forgets everything on reset', () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1 })
    limiter.take('a', 0)
    expect(limiter.take('a', 0).ok).toBe(false)
    limiter.reset()
    expect(limiter.take('a', 0).ok).toBe(true)
  })
})

describe('clientKey', () => {
  it('prefers the header Vercel sets itself', () => {
    const req = {
      headers: {
        'x-vercel-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
        'x-forwarded-for': '3.3.3.3',
      },
    }
    expect(clientKey(req)).toBe('1.1.1.1')
  })

  it('falls back in order', () => {
    expect(clientKey({ headers: { 'x-real-ip': '2.2.2.2' } })).toBe('2.2.2.2')
    expect(clientKey({ headers: { 'x-forwarded-for': '3.3.3.3' } })).toBe('3.3.3.3')
  })

  it('takes the client end of a proxy chain', () => {
    expect(clientKey({ headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1, 10.0.0.2' } })).toBe(
      '9.9.9.9'
    )
  })

  it('buckets unidentifiable callers together rather than exempting them', () => {
    expect(clientKey({ headers: {} })).toBe('unknown')
    expect(clientKey({})).toBe('unknown')
    expect(clientKey({ headers: { 'x-forwarded-for': '   ' } })).toBe('unknown')
  })

  it('handles a header parsed into an array', () => {
    expect(clientKey({ headers: { 'x-forwarded-for': ['4.4.4.4', '5.5.5.5'] } })).toBe('4.4.4.4')
  })
})

describe('opaqueKey', () => {
  it('is stable for the same value and different for others', () => {
    expect(opaqueKey('a@example.com')).toBe(opaqueKey('a@example.com'))
    expect(opaqueKey('a@example.com')).not.toBe(opaqueKey('b@example.com'))
  })

  it('does not contain the original value', () => {
    expect(opaqueKey('someone@example.com')).not.toContain('someone')
    expect(opaqueKey('someone@example.com')).not.toContain('@')
  })
})

describe('sendTooManyRequests', () => {
  it('sends 429 with Retry-After and forbids caching the rejection', () => {
    const res = mockRes()
    sendTooManyRequests(res, 42)
    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'too many requests' })
    expect(res.headers['Retry-After']).toBe('42')
    // A cached 429 would hand every visitor behind that edge one caller's
    // rejection. This assertion is the whole reason the helper exists.
    expect(res.headers['Cache-Control']).toBe('no-store')
  })
})
