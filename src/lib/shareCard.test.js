import { describe, it, expect } from 'vitest'
import { drawGapLines, fitFont, CARD, CARD_MARGIN } from './shareCard'
import { shareGapLines } from './sessionCopy'

/*
 * The saved share image drew "vs GOOGL at Wednesday's close · Market closed"
 * as one 52 px line from x 84 on a 1080 px canvas; it ended near 1225 px in
 * Arial, so "Market closed" was cut off. This mock measures every character
 * at 0.62 of the font size, wider than Arial, the way a fallback font is.
 */
function mockContext(charWidth = 0.62) {
  const drawn = []
  const ctx = {
    font: '',
    measureText(text) {
      const size = Number(/(\d+)px/.exec(this.font)[1])
      return { width: text.length * size * charWidth }
    },
    fillText(text, x) {
      drawn.push({ text, x, right: x + this.measureText(text).width, font: this.font })
    },
    beginPath() {},
    roundRect() {},
    stroke() {},
  }
  return { ctx, drawn }
}

const WEDNESDAY_AFTER_HOLIDAY = Date.parse('2026-11-26T18:00:00Z') // Thanksgiving: "Wednesday's close"
const asset = (underlying) => ({ ticker: `${underlying}x`, underlying, stockQuote: null })

describe('drawGapLines', () => {
  it.each(['GOOGL', 'ABCDEFGHIJKL'])('keeps every line inside the card for %s at the longest weekday', (underlying) => {
    const lines = shareGapLines(asset(underlying), WEDNESDAY_AFTER_HOLIDAY)
    expect(lines.line).toContain('Wednesday’s close')
    const { ctx, drawn } = mockContext()
    drawGapLines(ctx, lines)
    expect(drawn.map((d) => d.text)).toEqual([lines.line, 'Market closed'])
    for (const d of drawn) {
      expect(d.x).toBeGreaterThanOrEqual(CARD_MARGIN)
      expect(d.right).toBeLessThanOrEqual(CARD - CARD_MARGIN)
    }
  })

  it('draws the open-market line exactly as before: one line, 52 px, no tag', () => {
    const { ctx, drawn } = mockContext()
    drawGapLines(ctx, shareGapLines(asset('NVDA'), Date.parse('2026-09-15T17:30:00Z')))
    expect(drawn).toEqual([{ text: 'vs NVDA stock', x: 84, right: 84 + 13 * 52 * 0.62, font: '400 52px sans-serif' }])
  })
})

describe('fitFont', () => {
  it('keeps the size when the text fits and steps down when it does not', () => {
    const { ctx } = mockContext(0.5)
    expect(fitFont(ctx, 'short', 400, 52)).toBe(52)
    expect(fitFont(ctx, 'x'.repeat(40), 400, 52, 912)).toBe(44) // 40 * 44 * 0.5 = 880
    expect(ctx.font).toBe('400 44px sans-serif')
  })
})
