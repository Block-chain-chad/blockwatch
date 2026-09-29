// The share card's gap lines, drawn on a 2D canvas context. Pure apart from
// the context it is handed, so a test can pass one with a mocked
// measureText. ShareSheet owns the canvas and everything else on the card.

export const CARD = 1080 // square PNG, social-friendly
export const CARD_MARGIN = 84
/** Widest a line may run: the card less its margin on both sides. */
export const CARD_LINE_MAX = CARD - 2 * CARD_MARGIN

const GAP_LINE_Y = 776
const GAP_LINE_SIZE = 52
const TAG_SIZE = 38
const TAG_TOP = 808
const TAG_HEIGHT = 56
const TAG_PAD = 22
const MIN_SIZE = 24

/**
 * Sets ctx.font to `weight size px sans-serif`, stepping the size down until
 * `text` measures within `maxWidth` (or MIN_SIZE is reached). Returns the
 * size used. A text that already fits keeps its size, so the open-market
 * card draws exactly as before.
 */
export function fitFont(ctx, text, weight, size, maxWidth = CARD_LINE_MAX) {
  let s = size
  ctx.font = `${weight} ${s}px sans-serif`
  while (s > MIN_SIZE && ctx.measureText(text).width > maxWidth) {
    s -= 2
    ctx.font = `${weight} ${s}px sans-serif`
  }
  return s
}

/**
 * The line under the headline gap ("vs NVDA stock", or "vs NVDA at Friday’s
 * close") and, while the market is closed, the "Market closed" tag on a line
 * of its own as an outlined pill. `lines` is shareGapLines' result.
 */
export function drawGapLines(ctx, { line, tag }) {
  ctx.fillStyle = '#a1a1aa'
  fitFont(ctx, line, 400, GAP_LINE_SIZE)
  ctx.fillText(line, CARD_MARGIN, GAP_LINE_Y)
  if (!tag) return

  fitFont(ctx, tag, 500, TAG_SIZE, CARD_LINE_MAX - 2 * TAG_PAD)
  const width = ctx.measureText(tag).width + 2 * TAG_PAD
  ctx.strokeStyle = '#52525b'
  ctx.lineWidth = 2
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(CARD_MARGIN, TAG_TOP, width, TAG_HEIGHT, TAG_HEIGHT / 2)
    ctx.stroke()
  }
  ctx.fillStyle = '#d4d4d8'
  ctx.fillText(tag, CARD_MARGIN + TAG_PAD, TAG_TOP + 40)
}
