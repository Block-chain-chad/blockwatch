// When a drift alert is allowed to speak. The sibling module alertNotify.js
// says what a fired alert sounds like; this one decides whether it fires at
// all. Pure: state/AlertsContext.jsx is the only caller.
//
// Why a gate exists (review 2026-09-15, risk 3). Everywhere else the app
// already refuses to pass off an untrustworthy number as a live one:
// lib/market.js says which session we are in, lib/provenance.js says how old
// the share quote is, and the gap panel prints "last close · 17 h ago" rather
// than "live". Alerts were the one surface that read neither. A drift rule
// evaluated at 3am compared a live token against yesterday's 4pm close and
// called the difference a gap; since 2026-09-15 it also pushed that to the
// operating system. Those are the notifications that teach someone to swipe
// without reading, and the next one they ignore is a real one.
//
// The rule: a drift alert may fire only when the app would itself present
// the gap as reliable — the regular session, and a share quote that
// shareFreshness calls 'live'. Same inputs, same verdict, one place.
//
// What the gate costs. api/finnhub.js shares one quote for 180 seconds, so
// inside the session a quote is younger than LIVE_QUOTE_SECONDS (60s) for
// roughly the first third of each cache cycle. Evaluation runs every 2.5s,
// so a crossing is caught within about two minutes of the gap opening rather
// than instantly. For a rule that already carries a ten-minute cooldown that
// is a fair trade: a gap worth naming outlives two minutes, and one that does
// not is the blip we never wanted to push.
//
// A share that simply is not trading — thin, or halted — never produces a
// young quote, so its drift alerts stay quiet. That is the honest reading of
// "we do not know what this share is worth right now", and it is how
// lib/market.js says halts surface on every other screen.
//
// Token price targets are deliberately NOT gated. They read asset.tokenPrice
// only, and the token trades 24/7 on a feed that refreshes every 2.5 seconds,
// so a target crossing at 3am is a true statement about a real trade. Gating
// them would silence a genuinely live market for seventeen hours a day. If a
// share-side price target is ever added it is a different animal and must
// come through canAlertOnGap like drift does.

import { shareFreshness } from './provenance'

// Anti-spam for drift alerts under fast (2.5s) evaluation: re-arm only when
// the gap falls clearly back inside the band, and rate-limit repeat fires.
export const REARM_RATIO = 0.8
export const DRIFT_COOLDOWN_MS = 10 * 60_000

/**
 * Whether a gap between a token and its share is trustworthy enough to alert
 * on. `quote` is the merged asset's stockQuote, `session` the value
 * PricesContext publishes ('pre' | 'regular' | 'post' | 'closed').
 */
export function canAlertOnGap({ quote, session, now = Date.now() }) {
  if (session !== 'regular') return false
  return shareFreshness({ quote, session, now }).state === 'live'
}

/**
 * One drift rule's step, as a pure function of everything that decides it.
 *
 *   → { state, fire }   state is the rule's next 'inside'/'outside'
 *
 * `allowed` is canAlertOnGap's verdict. A disallowed pass returns the state
 * untouched, which is the whole point: it must not fire, and it must not
 * quietly advance the machine either. Advancing on a number we would not
 * print would consume a genuine excursion (marking a phantom overnight gap
 * as 'outside', so the real one at 10am never fires) or re-arm on one
 * (marking a phantom return as 'inside'). A gated pass is not a reading.
 *
 * Inside the gate the two anti-spam guards apply, unchanged: hysteresis, so
 * a premium hovering on the threshold cannot oscillate the machine every
 * 2.5s tick, and a cooldown of one fire per asset per ten minutes. A fire
 * suppressed by the cooldown HOLDS 'inside' so the same crossing re-attempts
 * once the cooldown expires — dropped, not rate-limited, is the bug.
 */
export function driftStep({ premium, threshold, state = 'inside', lastFiredAt = 0, now, allowed }) {
  if (!allowed || premium == null) return { state, fire: false }
  const outside = Math.abs(premium) >= threshold
  const backInside = Math.abs(premium) < threshold * REARM_RATIO
  const next = outside ? 'outside' : backInside ? 'inside' : state
  if (outside && state === 'inside') {
    if (now - lastFiredAt > DRIFT_COOLDOWN_MS) return { state: next, fire: true }
    return { state, fire: false }
  }
  return { state: next, fire: false }
}

/**
 * The drift tab's promise about when an alert can reach someone. It lives
 * beside the gate so the words and the rule cannot drift apart: a silent
 * gate is indistinguishable from broken alerts to the person who set one.
 *
 * Three of the six places that open the alert sheet do not check that the
 * asset has an underlying first, so `underlying` can be null on a NAV-based
 * token; the sentence says "share" rather than printing it.
 */
export function driftWindowNote(underlying) {
  const name = underlying ? `${underlying} quote` : 'share quote'
  return `These only fire while the US market is open and the ${name} is live. Outside those hours the gap is not a real spread, so we stay quiet.`
}
