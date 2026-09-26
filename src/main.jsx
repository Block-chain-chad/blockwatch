import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initTheme } from './lib/theme'
import { isNativeApp } from './lib/platform'
import { handleAuthLink, handleOAuthCallback } from './services/authLinks'
import { initMonitoring } from './services/monitoring'
import { startFeatureFlags } from './services/featureFlags'

initTheme()

// Remote switches (the in-app swap among them) start loading before the first
// render, not after first paint like crash reporting: they decide whether a
// real-money button is on screen. Until PostHog answers, every flag sits at
// its build-time fallback, and the swap's fallback is off — so there is no
// moment where the swap is reachable because the answer had not arrived.
startFeatureFlags()

// Emailed auth links (confirm / magic / reset) land on /auth/confirm.
// Web: the URL is this page's own. Native: links arrive as Universal Link
// events instead — see the isNativeApp() branch below. The address bar is
// scrubbed immediately so the one-time token never sits in history or a screenshot.
if (!isNativeApp() && window.location.pathname === '/auth/confirm') {
  const link = window.location.href
  window.history.replaceState(null, '', '/')
  handleAuthLink(link) // result surfaces via AuthContext once mounted
}

// Sign in with Apple or Google on the web returns to /auth/callback with a
// one-time code. Same treatment: scrub the address bar, then redeem it.
if (!isNativeApp() && window.location.pathname === '/auth/callback') {
  const link = window.location.href
  window.history.replaceState(null, '', '/')
  handleOAuthCallback(link)
}

// Native: cold-start launch URL + warm appUrlOpen events. Dynamic import so
// the web bundle never loads the Capacitor plugin.
if (isNativeApp()) {
  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.getLaunchUrl().then((launch) => {
      if (launch?.url) handleAuthLink(launch.url)
    })
    CapApp.addListener('appUrlOpen', ({ url }) => {
      handleAuthLink(url)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Crash reporting starts after first paint — it can never slow launch, and
// if it fails to load the app runs exactly as before (see monitoring.js;
// the DSN is baked in at build time from VITE_SENTRY_DSN).
setTimeout(initMonitoring, 0)
