import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initTheme } from './lib/theme'
import { isNativeApp } from './lib/platform'
import { handleAuthLink } from './services/authLinks'

initTheme()

// Emailed auth links (confirm / magic / reset) land on /auth/confirm.
// Web: the URL is this page's own. Native: links arrive as Universal Link
// events instead — see the isNativeApp() branch below. The address bar is
// scrubbed immediately so the one-time token never sits in history or a screenshot.
if (!isNativeApp() && window.location.pathname === '/auth/confirm') {
  const link = window.location.href
  window.history.replaceState(null, '', '/')
  handleAuthLink(link) // result surfaces via AuthContext once mounted
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
