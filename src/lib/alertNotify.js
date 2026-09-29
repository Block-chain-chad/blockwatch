// src/lib/alertNotify.js
// What a fired alert says through the operating system (spec 2026-09-15
// §4.1), and the small rules around it. Pure; hooks/useAlertNotifications
// posts the result and overlays/SetAlertSheet asks the permission.
//
// The words are the News feed's own (screens/News.jsx) so a notification
// and the feed entry it mirrors read the same. News wraps its figures in a
// tabular-figure span, which a notification body cannot carry, so the
// sentence is composed here as plain text rather than lifted from the
// phone screen.

import { formatPct, formatPrice } from './format'
import { meterHeadline } from './pageTitle'

/** The answer to the one-time ask: 'on' | 'declined'; absent = never asked. */
export const NOTIFY_KEY = 'bw.meter.notify.v1'

/** The one-time ask's sentence (spec §4.1): both the question and the honesty about a tab being open. */
export const NOTIFY_OFFER_COPY = 'Get a system notification when this fires, while OnStock is open in a tab?'

/**
 * alertNotification(event) → { title, body, tag }
 *   drift  title 'NVDAx +1.42% gap' (the Meter headline, no product suffix)
 *          body  'NVDAx drifted +1.42% from NVDA. Crossed your ±1% drift alert.'
 *   price  title 'NVDAx crossed $220.00'
 *          body  'Your price target hit. Trading at $220.50.'
 * `tag` is the asset id, so repeats for one wrapper collapse into one.
 */
export function alertNotification(event) {
  if (event.type === 'price') {
    return {
      title: `${event.ticker} crossed ${formatPrice(event.target)}`,
      body: `Your price target hit. Trading at ${formatPrice(event.price)}.`,
      tag: event.assetId,
    }
  }
  return {
    title: meterHeadline({ ticker: event.ticker, gapPct: event.premium }),
    body: `${event.ticker} drifted ${formatPct(event.premium)} from ${event.underlying}. Crossed your ±${event.threshold}% drift alert.`,
    tag: event.assetId,
  }
}

/** The events newer than `sinceAt`, oldest first. AlertsContext keeps its list newest first. */
export function unseenEvents(events, sinceAt) {
  return (events ?? []).filter((e) => e.at > sinceAt).sort((a, b) => a.at - b.at)
}

/**
 * Whether the alert sheet may show the one-time ask: the browser has not
 * been asked (`permission` is 'default') and this app has not been told no.
 * A remembered 'on' with a browser back at 'default' (site data cleared) is
 * asked again; 'declined' never is.
 */
export function notifyOfferVisible({ permission, saved }) {
  return permission === 'default' && saved !== 'declined'
}

/** Whether a fired alert may post right now: granted, and the reader is not looking at the tab. */
export function shouldPost({ permission, hidden, focused }) {
  return permission === 'granted' && (hidden || !focused)
}
