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

export const SESSION_DOT = {
  regular: 'var(--color-session-open)',
  pre: 'var(--color-session-overnight)',
  post: 'var(--color-session-overnight)',
  closed: 'var(--color-session-closed)',
}

export const SESSION_NOTE = {
  regular: 'US market open — both sides live, so the gap is a real spread right now.',
  pre: 'Pre-market — the stock is trading again, but our price is still the last close, so gaps read wider than they are.',
  post: 'After hours — the stock is still trading, but our price is the 4pm close, so gaps read wider than they are.',
  closed: 'Overnight — the market is shut, tokens still trade.',
}

// The one- or two-word form for a 48px bar, where the sentence is a tooltip.
export const SESSION_SHORT = {
  regular: 'Open',
  pre: 'Pre-market',
  post: 'After hours',
  closed: 'Overnight',
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
