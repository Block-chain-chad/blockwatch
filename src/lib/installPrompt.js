// Should this browser be told how to put Onstock on its Home Screen?
//
// Only iPhone and iPad Safari, in a normal tab. Android and desktop browsers
// offer their own install prompt from the manifest, so they are left alone.
// On iOS only Safari's Share sheet is guaranteed to have "Add to Home Screen"
// (other browsers and in-app browsers either lack it or label it
// differently), so the instruction would be wrong anywhere else. Already
// launched from the Home Screen, or inside the native app, there is nothing
// to install. Pure: the caller passes in what the browser reports.

// Browsers on iOS that are not Safari. Every iOS browser is WebKit and most
// copy Safari's user agent, so each is recognised by the token it adds.
const NOT_SAFARI = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|GSA\/|YaBrowser|DuckDuckGo|Brave|FBAN|FBAV|Instagram|Line\/|Snapchat|Twitter|LinkedInApp|TikTok|musical_ly/i

/**
 * True for Safari on iPhone, iPod or iPad. iPadOS asks for desktop sites by
 * default and then reports itself as a Mac, so a "Macintosh" with a touch
 * screen is an iPad.
 */
export function isIosSafari({ userAgent = '', maxTouchPoints = 0 } = {}) {
  const ios = /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && maxTouchPoints > 1)
  // Safari itself carries both tokens; an in-app web view usually drops them.
  const safari = /Version\//.test(userAgent) && /Safari\//.test(userAgent)
  return ios && safari && !NOT_SAFARI.test(userAgent)
}

/**
 * Show the Add to Home Screen instruction?
 *   standalone: launched from the Home Screen (navigator.standalone on iOS,
 *     or the display-mode media query).
 *   native: inside the Capacitor app (lib/platform.js).
 */
export function shouldOfferInstall({ userAgent, maxTouchPoints, standalone, native }) {
  if (native || standalone) return false
  return isIosSafari({ userAgent, maxTouchPoints })
}

/** Read the live browser into the shape shouldOfferInstall takes. */
export function browserInstallContext(win = typeof window === 'undefined' ? undefined : window) {
  const nav = win?.navigator
  let displayStandalone = false
  try {
    displayStandalone = win?.matchMedia?.('(display-mode: standalone)')?.matches === true
  } catch {
    // an old browser without matchMedia is not standalone
  }
  return {
    userAgent: typeof nav?.userAgent === 'string' ? nav.userAgent : '',
    maxTouchPoints: Number(nav?.maxTouchPoints) || 0,
    standalone: nav?.standalone === true || displayStandalone,
  }
}
