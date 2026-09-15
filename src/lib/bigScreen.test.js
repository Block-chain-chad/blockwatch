import { describe, it, expect } from 'vitest'
import { bigScreen, ruleTicks, BIG_SCREEN_BASE, GAP_COLUMN_EXTRA, CONTENT_MAX } from './bigScreen'

const BASE = {
  rule: 144, gapColumn: 224, readout: 'min(560px, 39vw)', history: 164,
  boardTicks: false, readoutTicks: false, contentMax: null,
}

describe('bigScreen', () => {
  it("keeps today's layout below 1440, and for a missing width", () => {
    expect(bigScreen(1024)).toEqual(BASE)
    expect(bigScreen(1439)).toEqual(BASE)
    expect(bigScreen(0)).toEqual(BASE)
    expect(bigScreen(undefined)).toEqual(BASE)
    expect(bigScreen(NaN)).toEqual(BASE)
    expect(BIG_SCREEN_BASE).toEqual(BASE)
    expect(Object.isFrozen(BIG_SCREEN_BASE)).toBe(true)
  })

  it('1440 to 1679: the rule grows to 240, the Readout pins at 560, the history stays 164', () => {
    const b = { rule: 240, gapColumn: 320, readout: '560px', history: 164, boardTicks: false, readoutTicks: true, contentMax: null }
    expect(bigScreen(1440)).toEqual(b)
    expect(bigScreen(1679)).toEqual(b)
  })

  it('1680 to 1919: rule 400, history 220, and the Board header gains its ticks', () => {
    const b = { rule: 400, gapColumn: 480, readout: '560px', history: 220, boardTicks: true, readoutTicks: true, contentMax: null }
    expect(bigScreen(1680)).toEqual(b)
    expect(bigScreen(1919)).toEqual(b)
  })

  it('1920 to 2559: rule 560, Readout 640, history 260', () => {
    const b = { rule: 560, gapColumn: 640, readout: '640px', history: 260, boardTicks: true, readoutTicks: true, contentMax: null }
    expect(bigScreen(1920)).toEqual(b)
    expect(bigScreen(2559)).toEqual(b)
  })

  it('2560 and up: the rule caps at 560, Readout 800, history 320, and the shell centres in 2560', () => {
    const b = { rule: 560, gapColumn: 640, readout: '800px', history: 320, boardTicks: true, readoutTicks: true, contentMax: 2560 }
    expect(bigScreen(2560)).toEqual(b)
    expect(bigScreen(3440)).toEqual(b)
    expect(CONTENT_MAX).toBe(2560)
  })

  it('the gap column is the rule plus the 12 px gap, the 56 px label and 12 px trailing', () => {
    expect(GAP_COLUMN_EXTRA).toBe(80)
    for (const w of [1024, 1440, 1680, 1920, 2560]) {
      expect(bigScreen(w).gapColumn).toBe(bigScreen(w).rule + 80)
    }
  })

  it('leaves the company column its 160 px minimum at every named width', () => {
    // Board grid: company · 120 · gap · 104 · 80 · 24 inside 24 px gutters,
    // beside the Readout and its 1 px border. The arithmetic of spec §2.1.
    const fixed = (b) => 120 + b.gapColumn + 104 + 80 + 24 + 48 + 1
    const readoutPx = { 1440: 560, 1680: 560, 1920: 640, 2560: 800 }
    for (const [w, r] of Object.entries(readoutPx)) {
      const b = bigScreen(Number(w))
      expect(Number(w) - r - fixed(b)).toBeGreaterThanOrEqual(160)
    }
  })
})

describe('ruleTicks', () => {
  it("has seven labels at the square-root scale's real positions", () => {
    const t = ruleTicks()
    expect(t.map((x) => x.pct)).toEqual([-2, -1, -0.5, 0, 0.5, 1, 2])
    expect(t.map((x) => x.label)).toEqual(['−2%', '−1%', '−0.5%', '0', '+0.5%', '+1%', '+2%'])
    const positions = t.map((x) => x.position)
    ;[-100, -70.71, -50, 0, 50, 70.71, 100].forEach((p, i) => expect(positions[i]).toBeCloseTo(p, 1))
    const lefts = t.map((x) => x.left)
    ;[0, 14.645, 25, 50, 75, 85.355, 100].forEach((l, i) => expect(lefts[i]).toBeCloseTo(l, 2))
  })

  it('uses a true minus sign, never a hyphen', () => {
    for (const x of ruleTicks()) expect(x.label).not.toMatch(/-/)
  })

  it('follows the scale', () => {
    const t = ruleTicks(4)
    expect(t.map((x) => x.pct)).toEqual([-4, -2, -1, 0, 1, 2, 4])
    expect(t.map((x) => x.label)).toEqual(['−4%', '−2%', '−1%', '0', '+1%', '+2%', '+4%'])
    expect(t[1].position).toBeCloseTo(-70.71, 1)
    expect(t[5].left).toBeCloseTo(85.355, 2)
  })
})
