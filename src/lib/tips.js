// Home's two tip bubbles: which one shows now, and on which row. Pure apart
// from the two storage helpers, which take the storage as an argument.
//
// Each bubble points at one thing a newcomer cannot guess, is closed once
// and never shown again, and only one shows at a time (brief:
// claude/team/tips-build-brief.md, approved 2026-10-03):
//
//   1. 'gap'     the gap figure on the first row whose gap is confirmed.
//   2. 'closed'  the "Market closed" pill beside a gap, which explains itself
//                only through a title attribute that phones never show.
//
// The rules, all of them here:
//   - Only while prices are live or stale, and never while a sheet or an
//     overlay covers Home (the bubble comes back when it closes).
//   - Only when its subject is in the list: the first row with an 'ok' gap,
//     or the first row showing the pill. No such row, no bubble.
//   - 'gap' first. 'closed' never shows before 'gap' is closed. On a closed
//     market's first visit it follows straight away; otherwise it waits for
//     the first visit with a pill on screen. Every pill sits beside an 'ok'
//     gap, so whenever 'closed' has a row, 'gap' has one too.
//   - Seen is a device display preference, never synced. Storage that throws
//     counts as seen, so a private window shows nothing rather than a bubble
//     that comes back on every visit.

import { gapCheck } from './gapCheck'
import { closedGapLabelFor } from './sessionCopy'

/** Storage keys. 'gap' reuses the old inline caption's key on purpose. */
export const TIP_KEYS = Object.freeze({ gap: 'bw.tip.premium.v1', closed: 'bw.tip.closed.v1' })

/** The fixed copy for each bubble. The 'closed' title and body come from the pill's own label. */
export const TIP_COPY = Object.freeze({
  gap: {
    title: 'The gap',
    body: 'How far the token’s price sits from the price of the share it tracks: green above, red below, gray when they match. Tap a row to see both prices. A gap describes prices, not what to buy or sell.',
    link: "What's a premium?",
    lesson: 'premium',
  },
  closed: {
    link: 'Why weekend prices drift',
    lesson: 'weekend',
  },
})

/**
 * The ids of the rows each bubble may point at, in list order:
 *   gap     rows whose gap is confirmed (gapCheck 'ok'), never "Gap not
 *           confirmed", "Ratio unverified", "No share to compare" or a skeleton;
 *   closed  those of them showing the "Market closed" pill.
 */
export function tipAnchors(assets, now = Date.now()) {
  const gap = []
  const closed = []
  for (const a of assets ?? []) {
    if (gapCheck(a, now).status !== 'ok') continue
    gap.push(a.id)
    if (closedGapLabelFor(a, now)) closed.push(a.id)
  }
  return { gap, closed }
}

/**
 * Which bubble shows now: null, { tip: 'gap', assetId } or { tip: 'closed', assetId }.
 *   seen     { gap, closed } booleans (readSeen)
 *   status   the price feed's status; only 'live' and 'stale' show a bubble
 *   covered  true while any sheet or overlay is open over Home
 *   anchors  tipAnchors() of the rows Home is showing
 */
export function currentTip({ seen, status, covered, anchors }) {
  if (covered || (status !== 'live' && status !== 'stale')) return null
  if (!seen.gap) return anchors.gap.length ? { tip: 'gap', assetId: anchors.gap[0] } : null
  if (!seen.closed) return anchors.closed.length ? { tip: 'closed', assetId: anchors.closed[0] } : null
  return null
}

/** How far past the two-thirds line a row must be before its bubble changes side. */
export const SIDE_HYSTERESIS_PX = 40

/**
 * Which side of its row a bubble sits on: 'below' or 'above'. Window
 * coordinates in px, from getBoundingClientRect.
 *   - Above only when it fits between the row and the top of Home's list, so
 *     it never covers the search field or the market status line.
 *   - Otherwise above once the row's bottom is in the lowest third of the
 *     window. With a side already chosen (`current`), it changes only when
 *     the row is SIDE_HYSTERESIS_PX past that line, so a row resting near
 *     the line does not flip the bubble on every scroll event.
 */
export function tipSide({ current = null, rowTop, rowBottom, listTop, bubbleHeight, viewportHeight, gap }) {
  if (rowTop - gap - bubbleHeight < listTop) return 'below'
  const line = viewportHeight * (2 / 3)
  if (current === 'above') return rowBottom < line - SIDE_HYSTERESIS_PX ? 'below' : 'above'
  if (current === 'below') return rowBottom > line + SIDE_HYSTERESIS_PX ? 'above' : 'below'
  return rowBottom > line ? 'above' : 'below'
}

/** { gap, closed } seen flags. A read that throws counts as seen. */
export function readSeen(getStorage) {
  const seen = {}
  for (const [tip, key] of Object.entries(TIP_KEYS)) {
    try {
      seen[tip] = getStorage().getItem(key) === '1'
    } catch {
      seen[tip] = true
    }
  }
  return seen
}

/** Remember that a bubble was closed. A write that throws closes it for this visit only. */
export function writeSeen(getStorage, tip) {
  try {
    getStorage().setItem(TIP_KEYS[tip], '1')
  } catch {
    // The caller already hides it; nothing else to do.
  }
}
