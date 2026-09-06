// How the chart toolbar shrinks (spec §1.3): TradingView measures its own
// toolbar and drops labels first, then pills, never a "…" menu. OnStock's
// Candles toolbar carries 17 chips at the design system's chip size — about
// 1,360px, more than any center under a 1,900px window — so the same rule
// applies here, by measurement rather than by breakpoint. Pure, so the
// stepping logic is tested without a DOM.

/** Density levels, cumulative. */
export const DENSITY = Object.freeze({
  FULL: 0, // every label
  ICONS: 1, // Auto / Latest / Reset / Log as icons with tooltips
  COMPACT: 2, // side chips ticker-only, indicators period-less, tighter pills
})
export const MAX_DENSITY = DENSITY.COMPACT

/**
 * The level to render next, given the level just measured, the width its
 * content needed, the width available, and what earlier levels needed
 * (`needed[level]`, filled in as levels are visited — always in order from
 * 0, so every level below the current one is known).
 *
 *   - overflowing and not at the last level → one level denser
 *   - fitting → the loosest level known to fit (stepping back out as the
 *     window widens), else stay
 */
export function nextDensity(level, contentWidth, available, needed = {}) {
  const fits = (w) => Number.isFinite(w) && w <= available + 0.5
  if (!fits(contentWidth)) return level < MAX_DENSITY ? level + 1 : level
  for (let l = 0; l < level; l++) if (fits(needed[l])) return l
  return level
}
