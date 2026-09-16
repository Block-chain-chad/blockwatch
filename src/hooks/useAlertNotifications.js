// src/hooks/useAlertNotifications.js
import { useEffect, useRef } from 'react'
import { useAlerts } from '../state/AlertsContext'
import { alertNotification, unseenEvents, shouldPost } from '../lib/alertNotify'
import { track } from '../services/analytics'

/**
 * A fired alert becomes one system notification (spec 2026-09-15 §4.1).
 * Mounted once by MeterShell, desktop only. Watches AlertsProvider's events
 * for ones newer than the last it has seen and, when permission is granted
 * and the tab is hidden or unfocused, posts `new Notification(title, {
 * body, tag })`; the tag collapses repeats for one wrapper. With the tab
 * focused nothing posts — the bell dot and the News feed already say it —
 * but the cursor still advances, so a later blur never replays old events.
 *
 * Events already stored when the shell mounts are not replayed: the cursor
 * starts at the newest of them. No service worker, no push: this fires
 * only while a tab is open.
 *
 * There is deliberately no freshness check here. A drift event only exists if
 * lib/alertRules.js let it be born (the regular session, against a share quote
 * the app would print as live), and AlertsContext is the only thing that
 * makes one — so every event reaching this hook is already one we stand
 * behind. Gating twice would only let the two rules disagree.
 */
export function useAlertNotifications() {
  const { events } = useAlerts()
  const sinceRef = useRef(null)

  useEffect(() => {
    if (sinceRef.current == null) {
      sinceRef.current = Math.max(0, ...events.map((e) => e.at))
      return
    }
    const fresh = unseenEvents(events, sinceRef.current)
    if (fresh.length === 0) return
    sinceRef.current = fresh[fresh.length - 1].at
    if (typeof Notification === 'undefined' || typeof document === 'undefined') return
    if (!shouldPost({ permission: Notification.permission, hidden: document.hidden, focused: document.hasFocus() })) return
    for (const event of fresh) {
      const { title, body, tag } = alertNotification(event)
      try {
        new Notification(title, { body, tag })
        // Only after the browser accepted it. A notification the user never
        // saw is not a reason to come back, so a throw below counts nothing.
        track('notification_shown')
      } catch {
        // an insecure context, or a browser that refuses page-created
        // notifications: the feed and the bell still have it
      }
    }
  }, [events])
}

export default useAlertNotifications
