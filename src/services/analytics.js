// Product analytics — PostHog (free tier), called via its capture REST endpoint
// with plain fetch: no SDK, no autocapture, just the metrics the brief cares
// about (searches and misses, return visits, share taps).
//
// Without VITE_POSTHOG_KEY this no-ops (logging to the console in dev so the
// events are still visible while building). Analytics must never break or slow
// the app: every call is fire-and-forget and swallows all errors.
//
// Every event carries `environment`, stamped here rather than at the call
// sites so no caller can forget it or claim the wrong one. Development does
// not reach PostHog at all by default, so the counts are real users only.
// See lib/environment.js.
//
// Every event also carries the browser context PostHog needs to tell a person
// from a bot (sessionContext below). Without $raw_user_agent, PostHog filed
// every app_opened as traffic type "Automation", category "no_user_agent".
// The landing address is read once per browser tab and kept for the tab, so
// every event in a visit reports where that visit came from:
//   $raw_user_agent          the browser's user agent
//   $current_url, $pathname  the landing address, WITHOUT its query or hash
//                            (emailed sign-in links carry tokens there)
//   $referrer                the referring site's origin only, or '$direct'
//   $referring_domain        the referring site's host, or '$direct'
//   utm_source, utm_medium, utm_campaign, utm_content, utm_term
//                            from the landing address, when present; any
//                            value that holds an '@' or runs long is dropped

// EVENT CATALOG — every event Onstock sends, and the properties it carries.
// One list, so a product question can be answered without reading the app.
// Every event also carries `environment` (stamped in track below); none of
// them carries an email, a wallet address, a folder name or an asset list.
//
//   Opening the app
//     app_opened              {}                          App.jsx
//     meter_open              { home, visit, days }       desktop/MeterShell.jsx
//     meter_asset             { from }                    desktop/MeterShell.jsx
//     meter_chart_open        {}                          desktop/MeterShell.jsx
//     meter_lens              { lens }                    desktop/Board.jsx
//
//   Looking around
//     search                  { query, results }          SearchOverlay, SymbolSearch
//     search_miss             { query }                   SearchOverlay, SymbolSearch
//     chart_mode              { mode, ticker }            ChartWorkspace, AssetDetail
//     share                   { ticker, action }          ShareSheet.jsx
//     learn_open              { source: 'home' | 'news' | 'desktop', lesson }
//                                                         LearnCards.jsx
//
//   Coming back — the actions that give someone a reason to (2026-09-16)
//     folder_created          {}                          state/FoldersContext.jsx
//     folder_asset_added      { list: 'folder' | 'watchlist' }
//                                                         state/FoldersContext.jsx
//     alert_created           { type: 'drift' | 'target' }
//                                                         state/AlertsContext.jsx
//     notification_permission { result: 'granted' | 'denied' | 'default' }
//                                                         services/notifications.js
//     notification_shown      {}                          hooks/useAlertNotifications.js
//     sign_in_completed       { method: 'password' | 'signup' | 'link' | 'apple' | 'google' | 'passkey' }
//                                                         state/AuthContext.jsx, services/authLinks.js,
//                                                         services/socialSignIn.js, services/passkeys.js
//     install_prompt_shown    {}   once per page load      InstallPrompt.jsx
//     install_prompt_dismissed {}                         InstallPrompt.jsx
//
//   Accounts (2026-09-25). Nothing about the passkey or the provider account.
//     passkey_added           {}                          services/passkeys.js
//     account_deleted         {}                          state/AuthContext.jsx
//
//   Money
//     trade_out               { ticker?, venue }          TradeButton, GapHeader, Trade
//     swap_sent               {}                          services/swap.js
//     wallet_connect          {}                          state/WalletContext.jsx
//     ratio_unreadable        { source: 'jupiter_price_v3' }
//                                                         services/jupiter.js
//     ratio_refused           { reason }                  overlays/SwapSheet.jsx

import { appEnvironment, telemetryEnabled } from '../lib/environment'

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

// Anonymous per-device id (no accounts in MVP) — this is what makes
// "daily return visits" measurable. Exported because feature-flag evaluation
// keys off the same id: a flag rolled out to a slice of devices then covers
// exactly the devices the product numbers are counting.
export function deviceId() {
  try {
    let id = localStorage.getItem('bw.device.v1')
    if (!id) {
      id = crypto.randomUUID?.() ?? `d-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
      localStorage.setItem('bw.device.v1', id)
    }
    return id
  } catch {
    return 'anonymous'
  }
}

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
const MAX_UTM_LENGTH = 100
const LANDING_KEY = 'bw.landing.v1'

/**
 * Where a visit landed and came from, reduced to what cannot identify anyone:
 * the landing address without its query or hash (sign-in links carry tokens
 * there), the UTM tags, and only the origin of the referring page.
 */
export function landingContext(href, referrer) {
  const out = {}
  try {
    const url = new URL(href)
    out.$current_url = `${url.origin}${url.pathname}`
    out.$pathname = url.pathname
    for (const key of UTM_KEYS) {
      const value = url.searchParams.get(key)
      if (value && value.length <= MAX_UTM_LENGTH && !value.includes('@')) out[key] = value
    }
  } catch {
    // No usable address: send nothing about it.
  }
  let from = null
  try {
    from = referrer ? new URL(referrer) : null
  } catch {
    from = null
  }
  const web = from && (from.protocol === 'https:' || from.protocol === 'http:')
  out.$referrer = web ? `${from.origin}/` : '$direct'
  out.$referring_domain = web ? from.host : '$direct'
  return out
}

let landing = null

/**
 * The landing context for this browser tab, read once and kept in
 * sessionStorage so a reload inside the same visit still reports where the
 * visit began. Falls back to memory when storage is blocked.
 */
function landingForSession() {
  if (landing) return landing
  try {
    const saved = sessionStorage.getItem(LANDING_KEY)
    if (saved) landing = JSON.parse(saved)
  } catch {
    landing = null
  }
  if (!landing || typeof landing !== 'object') {
    landing = landingContext(globalThis.location?.href, globalThis.document?.referrer)
    try {
      sessionStorage.setItem(LANDING_KEY, JSON.stringify(landing))
    } catch {
      // Memory only for this page load.
    }
  }
  return landing
}

/** What every event carries about the browser and the visit. */
export function sessionContext() {
  const userAgent = globalThis.navigator?.userAgent
  return {
    ...landingForSession(),
    ...(typeof userAgent === 'string' && userAgent ? { $raw_user_agent: userAgent } : {}),
  }
}

export function track(event, properties = {}) {
  // Stamped last, so a caller cannot mislabel the event's environment or
  // overwrite the visit's context.
  const stamped = { ...properties, ...sessionContext(), environment: appEnvironment }
  if (!KEY || !telemetryEnabled) {
    if (import.meta.env.DEV) console.debug('[analytics]', event, stamped)
    return
  }
  try {
    fetch(`${HOST}/i/v0/e/`, {
      method: 'POST',
      keepalive: true, // survives tab close (e.g. share-then-leave)
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: KEY,
        event,
        distinct_id: deviceId(),
        properties: stamped,
      }),
    }).catch(() => {})
  } catch {
    // analytics never takes the app down
  }
}
