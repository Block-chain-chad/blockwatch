// The session strip's copy, shared by the phone Home (the sentence under the
// search bar) and the desktop top bar (dot + short word, sentence as the
// tooltip). Pure: no React, no services.
//
// Four states, not two. Pre and post used to fall into "overnight", which was
// wrong in the one way that matters: overnight the stock genuinely is not
// moving, so comparing a live token against the last close is fair. Between
// 04:00-09:30 and 16:00-20:00 the stock IS moving and our feed cannot see it
// (Finnhub /quote is regular-session only), so the same comparison invents a
// premium — loudest right after an earnings release, which is exactly when
// someone is looking. See lib/market.js.

import { premiumPct, isThinlyTraded } from './prices'
import { getMarketSession, lastCloseDay, etDate } from './market'

export const SESSION_DOT = {
  regular: 'var(--color-session-open)',
  pre: 'var(--color-session-overnight)',
  post: 'var(--color-session-overnight)',
  closed: 'var(--color-session-closed)',
}

export const SESSION_NOTE = {
  regular: 'US market open. Both prices are live, so the gap is a real spread right now.',
  pre: 'Pre-market. The share is trading again, but our share price is still the last close, so gaps read wider than they are.',
  post: 'After hours. The share is still trading, but our share price is today’s close, so gaps read wider than they are.',
  closed: 'US market closed. Tokens still trade, so each gap is measured against the last close.',
}

// The one- or two-word form for a 48px bar, where the sentence is a tooltip.
// Closed says so rather than "Overnight", which was wrong all weekend.
export const SESSION_SHORT = {
  regular: 'Open',
  pre: 'Pre-market',
  post: 'After hours',
  closed: 'Market closed',
}

/** The tag set beside a gap figure whenever its share leg is a close. */
export const MARKET_CLOSED_TAG = 'Market closed'

let labelCache = { bucket: null, value: null }

/**
 * How a gap figure is labelled while its share leg is a close rather than a
 * live price, or null during the regular session, when nothing changes.
 *
 *   { tag: 'Market closed', vs: 'vs Friday’s close', close: 'Friday’s close', title }
 *
 * A reviewer read a large overnight gap as a live opportunity; the banner at
 * the top was the only signal. So every surface that prints a gap in these
 * hours prints this beside it. `vs` names the close the share leg holds:
 * "today’s" after the close on a trading day, otherwise that day's weekday
 * (Friday's on a weekend or a holiday Monday, Monday's before Tuesday's
 * open), both from the exchange calendar in lib/market.js. It falls back to
 * "last close" when the calendar cannot say, or when the quote's own stamp
 * is from a different day than that close, because then the share leg is
 * older than the calendar alone would claim.
 *
 * `quoteAsOf` is the share quote's timestamp in ms, when there is one.
 */
export function closedGapLabel({ now = Date.now(), quoteAsOf = null } = {}) {
  const bucket = Math.floor(now / 60_000)
  if (labelCache.bucket !== bucket) {
    const at = new Date(now)
    const session = getMarketSession(at)
    labelCache = { bucket, value: session === 'regular' ? null : { session, close: lastCloseDay(at) } }
  }
  const state = labelCache.value
  if (!state) return null
  const { session, close } = state
  const agrees = close != null && (!Number.isFinite(quoteAsOf) || etDate(quoteAsOf) === close.date)
  const whose = !agrees ? 'last' : close.today ? 'today’s' : `${close.weekday}’s`
  const title =
    session === 'closed'
      ? `The US market is closed. This gap compares the token’s price with the share’s ${whose} close, so it is not a live spread.`
      : `The share is trading outside regular hours, but this gap compares the token with the share’s ${whose} close, so it can read wider than it is.`
  return { tag: MARKET_CLOSED_TAG, vs: `vs ${whose} close`, close: agrees ? `${whose} close` : 'the last close', title }
}

/**
 * The "Widest gap" candidate, or null. Same rule as Home's session line:
 * liquid tokens only, a gap of at least 0.15% so parity noise never wins,
 * and a sanity band — no real tokenized stock drifts 20% overnight, so
 * bigger gaps are stale prints on illiquid tokens. In pre/post the band
 * tightens to 5%, because a third source of big numbers appears: the stock
 * itself moving while our quote sits at the close. We cannot tell that
 * apart from a genuine premium, and naming a "widest gap" is a claim.
 *
 * Regular hours are null by default: on the phone Home every open-market
 * gap is a real spread and the pill was a story for the shut market. The
 * desktop masthead wants the opposite (spec 2026-09-15 §3.1) — during the
 * open session the number is most trustworthy, so it passes
 * `includeRegular: true` and gets the widest gap inside the 5% band.
 *
 * Returns { asset, p } (p = the gap in %) or null.
 */
export function widestCredibleGap(assets, session, { includeRegular = false } = {}) {
  if (session === 'regular' && !includeRegular) return null
  const bound = session === 'closed' ? 20 : 5
  const candidates = (assets ?? [])
    .filter((a) => !isThinlyTraded(a))
    .map((a) => ({ asset: a, p: premiumPct(a) }))
    .filter((x) => x.p != null && Math.abs(x.p) >= 0.15 && Math.abs(x.p) <= bound)
  return candidates.length
    ? candidates.reduce((m, x) => (Math.abs(x.p) > Math.abs(m.p) ? x : m))
    : null
}

/** The masthead pill's label: in the open session it says the number is live. */
export function widestGapLabel(session) {
  return session === 'regular' ? 'Widest gap right now' : 'Widest gap'
}

/**
 * closedGapLabel for one asset's gap: null for an asset with no listed share
 * (there is no share leg to be a close), otherwise dated by its own quote.
 */
export function closedGapLabelFor(asset, now = Date.now()) {
  if (!asset?.underlying) return null
  return closedGapLabel({ now, quoteAsOf: asset.stockQuote?.asOf ?? null })
}

/**
 * The lines under the share card's gap: { line, tag }. `line` says which
 * share it is measured against, and while the share leg is a close, which
 * close; `tag` is then "Market closed" (null otherwise), drawn on its own
 * line, so a shared image never passes an overnight gap off as a live one.
 */
export function shareGapLines(asset, now = Date.now()) {
  const closed = closedGapLabelFor(asset, now)
  return closed
    ? { line: `vs ${asset.underlying} at ${closed.close}`, tag: closed.tag }
    : { line: `vs ${asset.underlying} stock`, tag: null }
}
