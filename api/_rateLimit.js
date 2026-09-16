// Best-effort rate limiting for the public /api/* functions.
//
// WHAT THIS IS, HONESTLY
// ---------------------
// A token bucket held in the Node process's own memory. Vercel runs these
// functions as serverless instances, so:
//
//   * state is PER INSTANCE. Vercel starts more instances under load, and each
//     one begins with a full bucket, so the real ceiling is roughly
//     (limit x instances), not (limit). Traffic heavy enough to fan out across
//     many instances is exactly the traffic that gets the loosest limit.
//   * state is LOST on cold start. An idle deployment forgets every bucket.
//   * counting is therefore a floor, never a guarantee.
//
// That is still worth having: it turns "one script can issue unlimited
// requests" into "one script can issue a bounded number per instance", which
// is the difference between a drained Finnhub quota and a slow afternoon. It
// is NOT a defence against a distributed attacker, and nothing here should be
// described to anyone as one.
//
// THE UPGRADE PATH, when this stops being enough: move the buckets to a shared
// store so every instance counts against the same number. Upstash Redis or
// Vercel KV both do this in one round trip (INCR + EXPIRE, or a Lua token
// bucket) and both cost money, so it is Terra's call. The call sites below
// would not change shape — only `take()` becomes async.
//
// MEMORY: the bucket map is bounded (maxKeys) and evicts least-recently-used.
// Without that bound, a caller rotating fake keys would grow the map until the
// instance ran out of memory, which is a worse outage than the one this file
// prevents.

import { createHash } from 'node:crypto'

/**
 * A token bucket per key. `capacity` is the burst; `refillPerSecond` is the
 * sustained rate. Keys past `maxKeys` evict least-recently-used.
 */
export function createRateLimiter({ capacity, refillPerSecond, maxKeys = 5000 }) {
  const buckets = new Map()

  return {
    /**
     * Spend one token for `key`. Returns { ok, retryAfter } where retryAfter is
     * whole seconds until the next token, and is only meaningful when !ok.
     */
    take(key, now = Date.now()) {
      const prior = buckets.get(key)
      // Re-inserting moves the key to the end of the Map's insertion order,
      // which is what makes the eviction below least-recently-used.
      if (prior) buckets.delete(key)

      // Elapsed is clamped at zero: a clock that steps backwards must not
      // quietly drain a bucket it never touched.
      const tokens = prior
        ? Math.min(capacity, prior.tokens + (Math.max(0, now - prior.at) / 1000) * refillPerSecond)
        : capacity
      const ok = tokens >= 1

      buckets.set(key, { tokens: ok ? tokens - 1 : tokens, at: now })
      // Checked on every path, not just the allowed one, so the map stays
      // bounded no matter how the limiter is configured.
      if (buckets.size > maxKeys) buckets.delete(buckets.keys().next().value)

      return ok
        ? { ok: true, retryAfter: 0 }
        : { ok: false, retryAfter: Math.max(1, Math.ceil((1 - tokens) / refillPerSecond)) }
    },

    /** Test seam: forget every bucket. */
    reset() {
      buckets.clear()
    },

    get size() {
      return buckets.size
    },
  }
}

/**
 * Who to count this request against.
 *
 * `x-vercel-forwarded-for` is set by Vercel's own proxy on the way in; the
 * other two are the conventional fallbacks for running anywhere else. A caller
 * that forges the header only splits its OWN bucket — the same thing it
 * achieves for free by landing on a second instance — so this is a fair-use
 * key, never an identity. Requests with no usable header share the 'unknown'
 * bucket, which is deliberately strict rather than exempt.
 */
export function clientKey(req) {
  const headers = req?.headers ?? {}
  const raw =
    headers['x-vercel-forwarded-for'] ?? headers['x-real-ip'] ?? headers['x-forwarded-for'] ?? ''
  // x-forwarded-for is a list; the client is the leftmost entry.
  const first = String(Array.isArray(raw) ? raw[0] : raw).split(',')[0].trim()
  return first || 'unknown'
}

/**
 * A stable key for a value that must not sit in memory in the clear — an email
 * address, in practice. Truncated because this only ever needs to be a bucket
 * name, never reversible or collision-proof against an adversary.
 */
export function opaqueKey(value) {
  return createHash('sha256').update(String(value)).digest('hex').slice(0, 32)
}

/**
 * Send the 429. `no-store` is not optional: api/finnhub.js responses are
 * CDN-cached, and a cached 429 would hand every visitor behind that edge the
 * rejection meant for one caller.
 */
export function sendTooManyRequests(res, retryAfter) {
  res.setHeader('Retry-After', String(retryAfter))
  res.setHeader('Cache-Control', 'no-store')
  return res.status(429).json({ error: 'too many requests' })
}
