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

const ALLOWED = new Set([...NATIVE_ORIGINS, 'https://blockwatch.app', 'https://www.blockwatch.app'])

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
 * Apply CORS headers. Returns true when the response is scoped to ONE specific
 * origin and must therefore be kept out of shared caches; false when it is
 * safe to share (no CORS at all, or the fixed-ACAO app lane).
 *
 * `Vary: Origin` is set UNCONDITIONALLY — allowed origins, rejected origins,
 * app lane, and requests with no Origin header at all. This is not optional on
 * these endpoints: browsers omit Origin on same-origin GETs, so every web
 * visitor would otherwise populate Vercel's CDN (see the quote TTL in
 * ./finnhub.js — named there rather than repeated here, so there is one place
 * to change it) with an entry
 * carrying neither Access-Control-Allow-Origin nor Vary. Per RFC 9111 §4.1 a
 * stored response with no Vary matches ANY request for that URI, so a
 * capacitor://localhost request could be served that header-less entry and
 * WKWebView would block it — an intermittent, cache-timing-dependent failure.
 * The app lane makes that impossible independently of Vary; Vary stays because
 * it is correct and free.
 *
 * Off the app lane, a request with no Origin behaves exactly as it always has
 * apart from carrying Vary: no Access-Control-* headers, handler proceeds.
 */
export function applyCors(req, res) {
  varyOnOrigin(res)

  // App lane: one fixed ACAO for everyone, and shared-cacheable (see
  // APP_LANE_ORIGIN). The lane's URL cannot be produced by a web visitor, and
  // every entry in it is addressed to the app, so sharing it is safe and lets
  // all native devices ride one cached upstream call instead of one each.
  if (isAppLane(req)) {
    res.setHeader('Access-Control-Allow-Origin', APP_LANE_ORIGIN)
    setCorsMethodHeaders(res)
    return false // shared-cacheable, NOT origin-scoped
  }

  const origin = req.headers.origin ?? ''
  if (!isAllowed(origin, req.headers.host)) return false
  res.setHeader('Access-Control-Allow-Origin', origin)
  setCorsMethodHeaders(res)
  return true // response names ONE origin — must stay out of shared caches
}

function setCorsMethodHeaders(res) {
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

/**
 * Set Cache-Control for the CDN-cached read proxies, keeping Origin-scoped
 * responses out of Vercel's SHARED edge cache.
 *
 * `sharedValue` is the normal public policy (`s-maxage=…, stale-while-revalidate=…`)
 * and is emitted byte-for-byte whenever the request carries no allowed Origin —
 * i.e. ordinary web visitors cache exactly as they always have.
 *
 * `originScoped` (from applyCors) is true when the response names ONE specific
 * origin — e.g. a browser at https://blockwatch.app that sent an Origin header.
 * Such a response must never be stored where a different origin could be handed
 * it, so it becomes `private` (browser cache only) and `s-maxage`
 * (shared-cache-only) becomes the equivalent `max-age`, preserving the same
 * freshness window locally.
 *
 * The app lane is deliberately NOT origin-scoped: every response in it carries
 * the same fixed APP_LANE_ORIGIN, so it is safe to share, and sharing is the
 * point — it keeps N native devices riding one cached upstream call instead of
 * one call each against Finnhub's 60/min free tier.
 *
 * WHY `private` STAYS, even though these are public read-only quotes. The
 * bodies hold nothing origin-specific, so in principle a shared cache could
 * store one entry and serve it to every allowed origin, keyed by `Vary:
 * Origin`. That would be a free efficiency win IF the edge honours Vary
 * exactly. If it does not, an entry stamped
 * `Access-Control-Allow-Origin: https://blockwatch.app` can be handed to a
 * `capacitor://localhost` request, the WebView refuses to expose it, and the
 * native app breaks intermittently in a way that only shows up under cache
 * timing — the precise failure the app lane above exists to make impossible.
 * That trade is not worth taking blind, and it no longer buys protection
 * either: since api/finnhub.js sized its instance breaker to Finnhub's real
 * minute, the quota is bounded whether or not the edge is caching. So the
 * safe, honest policy stays, and going public is a measured change for
 * another day rather than a side effect of this one.
 */
export function setCacheControl(res, sharedValue, originScoped) {
  const value = originScoped ? `private, ${sharedValue.replace('s-maxage=', 'max-age=')}` : sharedValue
  res.setHeader('Cache-Control', value)
  return value
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
