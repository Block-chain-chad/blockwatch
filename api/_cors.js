// Shared CORS policy for the /api/* serverless functions.
//
// Why this exists: the native app (Capacitor) is NOT served from Vercel. Its
// WebView origin is `capacitor://localhost`, so every call to /api/* is a
// cross-origin request and the browser blocks the response unless we echo an
// allowed Origin back. On the website itself the calls are same-origin and
// nothing here changes anything.
//
// Allowlist, never `*`: api/finnhub.js and api/history.js front a keyed /
// quota-limited upstream, so echoing only known origins keeps third-party
// sites from proxying their traffic through our Finnhub key. Credentialed
// CORS is never enabled either — these endpoints are cookie-less.
//
// The leading underscore keeps this file from being routed as an endpoint.

// The native app's WebView origins. Exported so the waitlist function's own
// abuse gate uses the SAME list instead of hard-coding one scheme — the two
// drifting apart is how you get an origin that CORS allows and the gate 403s.
export const NATIVE_ORIGINS = new Set([
  'capacitor://localhost', // iOS native WebView (Capacitor's default scheme)
  'ionic://localhost', // Capacitor's alternate iOS scheme
])

// Both domains stay allowed while blockwatch.app redirects to onstock.app:
// build 10 on phones still calls the old host, and old emails still link to it.
const ALLOWED = new Set([
  ...NATIVE_ORIGINS,
  'https://onstock.app',
  'https://www.onstock.app',
  'https://blockwatch.app',
  'https://www.blockwatch.app',
])

/** True when this Origin is one of our own native WebView schemes. */
export function isNativeOrigin(origin) {
  return NATIVE_ORIGINS.has(origin)
}

/**
 * Decide whether `origin` may read this response. Allowed when it is on the
 * static list or when it is this very deployment (covers *.vercel.app preview
 * URLs, whose host changes per deploy).
 */
function isAllowed(origin, host) {
  if (!origin) return false
  if (ALLOWED.has(origin)) return true
  return Boolean(host) && origin === `https://${host}`
}

/**
 * Add Origin to the response's Vary header without clobbering an existing
 * value. `Vary: *` already means "never reuse this entry", so leave it alone.
 */
function varyOnOrigin(res) {
  const current = res.getHeader?.('Vary')
  if (current == null || current === '') {
    res.setHeader('Vary', 'Origin')
    return
  }
  const parts = (Array.isArray(current) ? current : String(current).split(','))
    .map((p) => String(p).trim())
    .filter(Boolean)
  if (parts.some((p) => p === '*' || p.toLowerCase() === 'origin')) return
  res.setHeader('Vary', [...parts, 'Origin'].join(', '))
}

// Native builds append `?…&c=app` to the three cached read proxies so their
// requests land on a URL — and therefore an edge cache key — that a web
// visitor's request can never produce. See API_CACHE_SUFFIX in
// src/services/apiBase.js; keep the two in sync.
export const APP_LANE_PARAM = 'c'
export const APP_LANE_VALUE = 'app'

// The ONE origin every app-lane response is addressed to, sent regardless of
// who asked. That is what makes the lane shareable: any entry stored there
// carries this value by construction, so a cache HIT is always usable by the
// app no matter which request created it. It cannot help anyone else — a page
// at any other origin gets an Access-Control-Allow-Origin that does not match
// its own, and its browser refuses to expose the response.
//
// This depends on the app having exactly one origin. If capacitor.config.json
// ever sets `server.iosScheme` (making the WebView ionic://localhost), THIS
// CONSTANT MUST CHANGE TO MATCH — a lane with two possible ACAO values would
// reintroduce the cache-collision bug this whole design exists to prevent.
export const APP_LANE_ORIGIN = 'capacitor://localhost'

/**
 * True when this request is on the native app's cache lane. Anyone can send
 * the param — it is a caching signal, never authentication, and grants
 * nothing a plain request doesn't already get.
 */
export function isAppLane(req) {
  return req?.query?.[APP_LANE_PARAM] === APP_LANE_VALUE
}

/**
 * Refuse a request that names an Origin we do not serve, before any upstream
 * call. Returns true when it answered (403); the caller must return.
 *
 * Why (security review finding 5, and the follow-up review). Every response
 * carries `Vary: Origin`, and Vercel's edge keeps a separate cache entry for
 * each Origin value; that was proven on the live site. So a script sending a
 * new made-up Origin on every request missed the cache every time and spent
 * the whole Finnhub minute. Refusing unknown origins bounds the cache keys to
 * the allowed origins plus "no Origin" (ordinary same-site browser requests,
 * which carry none), so a loop of requests is served from the edge.
 */
export function refuseForeignOrigin(req, res) {
  const origin = req.headers?.origin
  if (origin == null || origin === '' || isAllowed(origin, req.headers.host)) return false
  res.setHeader('Cache-Control', 'no-store')
  res.status(403).json({ error: 'forbidden' })
  return true
}

/**
 * Apply CORS headers: echo an allowed Origin back, or the app lane's fixed
 * one. Every response here may be cached at the edge, whoever asked:
 *
 * - `Vary: Origin` is set UNCONDITIONALLY, and Vercel's edge keys its cache on
 *   each Origin value (verified live), so an entry addressed to one origin is
 *   only ever handed to that same origin. That includes the iPhone app's own
 *   capacitor://localhost requests off the app lane, which are cached the
 *   same way as the lane itself.
 * - The app lane (`c=app`) carries one fixed Access-Control-Allow-Origin for
 *   everyone (see APP_LANE_ORIGIN), so it is safe to share even without Vary.
 * - Browsers omit Origin on same-origin GETs, so ordinary web visitors get no
 *   Access-Control-* headers at all.
 *
 * Unknown origins get no allow header here; the read proxies refuse them
 * first with refuseForeignOrigin.
 */
export function applyCors(req, res) {
  varyOnOrigin(res)

  if (isAppLane(req)) {
    res.setHeader('Access-Control-Allow-Origin', APP_LANE_ORIGIN)
    setCorsMethodHeaders(res)
    return
  }

  const origin = req.headers.origin ?? ''
  if (!isAllowed(origin, req.headers.host)) return
  res.setHeader('Access-Control-Allow-Origin', origin)
  setCorsMethodHeaders(res)
}

function setCorsMethodHeaders(res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  // Authorization: api/delete-account.js is called with the user's own access
  // token. Allowing the header grants nothing by itself; that endpoint checks
  // the token with Supabase, and no endpoint here uses cookies.
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  res.setHeader('Access-Control-Max-Age', '86400')
}

/**
 * Answer a CORS preflight. Returns true when it handled the request (the
 * caller must return immediately); false for every non-OPTIONS request.
 *
 * Must run BEFORE any method check — an OPTIONS preflight that gets a 405
 * reads as a failed preflight and the real request never fires.
 */
export function handlePreflight(req, res) {
  if (req.method !== 'OPTIONS') return false
  applyCors(req, res)
  res.status(204).end()
  return true
}
