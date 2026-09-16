// Product analytics — PostHog (free tier), called via its capture REST endpoint
// with plain fetch: no SDK, no autocapture, just the four metrics the brief
// cares about (searches + misses, waitlist signups, return visits, share taps).
//
// Without VITE_POSTHOG_KEY this no-ops (logging to the console in dev so the
// events are still visible while building). Analytics must never break or slow
// the app: every call is fire-and-forget and swallows all errors.
//
// Every event carries `environment`, stamped here rather than at the call
// sites so no caller can forget it or claim the wrong one. Development does
// not reach PostHog at all by default, so the counts are real users only.
// See lib/environment.js.

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

export function track(event, properties = {}) {
  // Stamped last, so a caller passing its own `environment` cannot mislabel
  // the event.
  const stamped = { ...properties, environment: appEnvironment }
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
