// A light gate on /api/token-history: a deterrent against the route working
// as an open mirror of CoinGecko's history for all 711 coins, not security.
// Anyone can send what it checks for. CoinGecko's terms (clause 4.1.6) do
// not allow re-distributing or syndicating access to its API, so a request
// has to look like it came from Onstock itself:
//
//   - the website sends CLIENT_HEADER on its same-origin requests. A custom
//     header needs no CORS preflight on a same-origin request, and every
//     browser sends one, including Safari versions without fetch metadata
//     (Sec-Fetch-Site), which is why the gate does not rely on that;
//   - the iPhone app's requests are cross-origin, so its WebView always sends
//     Origin (capacitor://localhost). An Origin header passes: by the time
//     this runs, api/_cors.js refuseForeignOrigin has refused any origin that
//     is not ours. The app sends no custom header, so it never preflights.
//
// A request with neither, like a bare script, is refused. That holds for
// edge-cached answers too, because the route answers with
// `Vary: Origin, X-Onstock-Client`, and Vercel's edge adds the request
// headers a response names in Vary to its cache key (docs: caching/cdn-cache,
// "Vary header"). A request without them is a different cache key, one that
// never holds a stored answer, since a refusal is never cached.
//
// Shared with the client (src/services/coingecko.js), so the two spellings
// cannot drift. Pure: no Node APIs.

export const CLIENT_HEADER = 'X-Onstock-Client'
export const CLIENT_HEADER_VALUE = 'web'

/** The Vary value the gated route must send on every answer. */
export const GATE_VARY = `Origin, ${CLIENT_HEADER}`

/** True when the request carries an Origin or the website's header. */
export function passesClientGate(req) {
  const headers = req?.headers ?? {}
  const origin = headers.origin
  if (typeof origin === 'string' && origin !== '') return true
  return headers[CLIENT_HEADER.toLowerCase()] === CLIENT_HEADER_VALUE
}
