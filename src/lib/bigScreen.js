// Big-screen widths for the Meter (spec 2026-09-15 §2): the only three
// things that scale with the window are the Board's gap rule, the Readout's
// width and the gap history's height. One pure function decides all three
// so the Board, the Readout and the shell can never disagree; the shell
// measures window.innerWidth (hooks/useWindowWidth) and passes the result
// down as a prop. Components never read the window themselves.
//
// Bands (window width → rule / Readout track / history height):
//   1024–1439  144  min(560px, 39vw)  164   today, unchanged
//   1440–1679  240  560px             164
//   1680–1919  400  560px             220
//   1920–2559  560  640px             260
//   2560 up    560  800px             320   and the shell centres in 2560

/** The Board's gap track is the rule plus 12 px gap, the 56 px signed label and 12 px trailing (Board.jsx). */
export const GAP_COLUMN_EXTRA = 80
/** Past this the shell centres with plain page-background margins (spec §2.4). */
export const CONTENT_MAX = 2560

const BASE_READOUT = 'min(560px, 39vw)'

const BANDS = [
  { min: 2560, rule: 560, readout: '800px', history: 320, contentMax: CONTENT_MAX },
  { min: 1920, rule: 560, readout: '640px', history: 260, contentMax: null },
  { min: 1680, rule: 400, readout: '560px', history: 220, contentMax: null },
  { min: 1440, rule: 240, readout: '560px', history: 164, contentMax: null },
  { min: 0, rule: 144, readout: BASE_READOUT, history: 164, contentMax: null },
]

/**
 * bigScreen(width) → { rule, gapColumn, readout, history, boardTicks, readoutTicks, contentMax }
 *   rule          px width of the Board's GapBar
 *   gapColumn     px width of the Board's gap grid track (rule + GAP_COLUMN_EXTRA)
 *   readout       the CSS grid track for the Readout column
 *   history       px height of the Readout's gap-history pane
 *   boardTicks    the Board's column header carries the seven tick labels (1680 up)
 *   readoutTicks  the Readout's rule carries the seven tick labels (1440 up)
 *   contentMax    px max-width for the shell, or null below 2560
 * A missing or non-finite width is the base band.
 */
export function bigScreen(width) {
  const w = Number.isFinite(width) ? width : 0
  const band = BANDS.find((b) => w >= b.min)
  return {
    rule: band.rule,
    gapColumn: band.rule + GAP_COLUMN_EXTRA,
    readout: band.readout,
    history: band.history,
    boardTicks: w >= 1680,
    readoutTicks: w >= 1440,
    contentMax: band.contentMax,
  }
}

/** Today's layout, for a Board or Readout rendered without a measured width. */
export const BIG_SCREEN_BASE = Object.freeze(bigScreen(0))

const MINUS = '−' // U+2212, the same glyph format.js prints
const TICK_STEPS = [1, 0.5, 0.25]

/**
 * The tick labels that make the rule's square-root scale legible (spec §2.2).
 * GapBar fills sqrt(|pct| / scale) of the half track, so ±scale sits at the
 * ends, ±scale/2 at 70.7 % of the half track and ±scale/4 at 50 %. Seven
 * ticks, negative to positive:
 *   { pct, position, left, label }
 *   position  signed percent of the HALF track (−100 … 100), as the spec states it
 *   left      percent of the FULL track (0 … 100), what a CSS `left` needs
 *   label     '−2%' … '0' … '+2%': a true minus sign, no trailing zeros
 */
export function ruleTicks(scale = 2) {
  const tick = (pct) => {
    const position = pct === 0 ? 0 : Math.sign(pct) * Math.sqrt(Math.abs(pct) / scale) * 100
    const label = pct === 0 ? '0' : `${pct < 0 ? MINUS : '+'}${Math.abs(pct)}%`
    return { pct, position, left: 50 + position / 2, label }
  }
  const magnitudes = TICK_STEPS.map((s) => scale * s) // [2, 1, 0.5] at the default scale
  return [...magnitudes.map((m) => -m), 0, ...magnitudes.slice().reverse()].map(tick)
}
