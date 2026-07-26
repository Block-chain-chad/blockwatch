import { isNativeApp } from '../lib/platform'

// Where the /api serverless functions live. Empty on the website itself
// (same-origin relative paths); native app builds (Capacitor) aren't served
// from Vercel, so they set VITE_API_BASE to the deployed site's absolute URL
// at build time.
export const API_BASE = import.meta.env.VITE_API_BASE ?? ''

// Cache-key marker appended to the three CDN-cached read proxies (/api/finnhub,
// /api/history, /api/news) on native builds only. Never on /api/waitlist-join
// (POST, no-store) or /api/csp-report.
//
// Why: those responses are cached at Vercel's edge. A web visitor's request
// carries no Origin header, so its cached entry has no Access-Control-Allow-Origin
// — and if the edge ignores `Vary: Origin`, the native app can be served that
// entry and WKWebView blocks it. Putting native requests on a different URL
// makes the two cache key spaces disjoint, so native correctness no longer
// depends on the CDN honouring Vary at all.
//
// It is a CONSTANT, not a nonce: every native request uses the same URL, so
// they share one cache lane instead of busting the cache and burning the
// Finnhub quota. Empty string on web, so web URLs are byte-identical to what
// they have always been — existing shared cache entries are untouched.
//
// Server side reads this as the `c` query param; see APP_LANE_PARAM in
// api/_cors.js. Keep the two in sync.
export const API_CACHE_SUFFIX = isNativeApp() ? '&c=app' : ''

// Absolute URL of the real website. Use this for links that must open OUTSIDE
// the app (privacy policy, marketing pages): inside the native WebView a
// relative "/privacy.html" resolves against capacitor://localhost, which the
// system browser can't open — you get a blank sheet. On the web this is just
// the current origin, so nothing changes there.
export const WEB_BASE = API_BASE || window.location.origin
