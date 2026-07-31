// Strict query allowlist for the CDN-cached read proxies. Unknown params are
// rejected BEFORE any upstream call: every unrecognized key mints a fresh
// edge-cache key, so junk params (?x=1) would otherwise convert one shared
// cached response into unlimited upstream calls against Finnhub's shared
// 60/min budget — a free deliberate-drain attack. The `c` cache-lane marker
// is legal only with its exact value (see APP_LANE_VALUE in ./_cors.js).

import { APP_LANE_PARAM, APP_LANE_VALUE } from './_cors.js'

/**
 * Returns true when the request was rejected (400 already sent — caller must
 * return immediately); false when every param is recognized.
 */
export function rejectUnknownParams(req, res, allowed) {
  const query = req?.query ?? {}
  for (const key of Object.keys(query)) {
    if (!allowed.has(key)) {
      res.status(400).json({ error: 'bad request' })
      return true
    }
  }
  if (APP_LANE_PARAM in query && query[APP_LANE_PARAM] !== APP_LANE_VALUE) {
    res.status(400).json({ error: 'bad request' })
    return true
  }
  return false
}
