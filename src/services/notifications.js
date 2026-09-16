// Asking the browser for permission to post alert notifications.
//
// One place, so however many screens offer the ask, the answer is recorded
// once and in one shape. The answer itself is the whole product question —
// people who say yes have a reason to come back — so it is the only thing
// sent: no asset, no account, nothing that identifies who answered.
//
// Kept out of lib/alertNotify.js on purpose: that module is pure, this one
// talks to the browser and to PostHog.

import { track } from './analytics'

/**
 * What the browser answered, in the three values the Notifications API
 * defines. Old Safari answers through a callback and can hand back nothing
 * at all, so anything unrecognised is 'default' — not asked, not answered.
 *
 * @param {unknown} result
 * @returns {'granted' | 'denied' | 'default'}
 */
export function permissionOutcome(result) {
  return result === 'granted' || result === 'denied' ? result : 'default'
}

/**
 * Ask, once, and record the answer.
 *
 * Resolves with the outcome. Rejects only when the browser refused to ask at
 * all (no user gesture, or no Notification API): nothing is recorded then, so
 * the offer can be made again rather than being counted as a no.
 *
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export function requestNotificationPermission() {
  return new Promise((resolve) => {
    // Older Safari takes a callback and returns undefined; everything current
    // returns a promise. Resolve once either way.
    const r = Notification.requestPermission(resolve)
    if (r && typeof r.then === 'function') r.then(resolve)
  }).then((result) => {
    const outcome = permissionOutcome(result)
    track('notification_permission', { result: outcome })
    return outcome
  })
}
