// Am I running inside the native app, or in a normal browser?
//
// Deliberately dependency-free: it reads the WebView's own origin rather than
// importing @capacitor/core, so it costs nothing on the web, works before any
// plugin has loaded, and can be called from anywhere (including code that must
// keep working if Capacitor isn't present at all).
//
// Capacitor serves the app from capacitor://localhost on iOS (ionic://localhost
// with the alternate scheme). A normal browser is always http: or https:, so
// this is false on the website — every web path behaves exactly as before.

const NATIVE_PROTOCOLS = new Set(['capacitor:', 'ionic:'])

/** True only inside the Capacitor WebView. */
export function isNativeApp() {
  if (typeof window === 'undefined' || !window.location) return false
  return NATIVE_PROTOCOLS.has(window.location.protocol)
}
