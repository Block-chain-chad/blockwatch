import { describe, it, expect } from 'vitest'
import {
  formatPrice,
  formatPct,
  formatCompact,
  thinVolumeText,
  formatCount,
  changeColor,
  isPlausiblePct,
  isMissing,
  EM_DASH,
} from './format'

/*
 * The number contract. Adapted from DefiLlama's shipped formatter, with the
 * corrections documented in docs/design-system.md.
 *
 * These are cheap tests for an expensive class of bug: nothing here crashes
 * when it breaks, it just quietly tells the user something untrue. The two
 * that matter most are the missing-data rule and the compaction ban.
 */

const MINUS = '−' // U+2212, not hyphen-minus

describe('missing data is never a number', () => {
  // DefiLlama renders null as $0 — 119 times on one page — so "no data" and
  // "measured zero" look identical. Here that would be worse: a failed
  // underlying quote would render a 0.00% gap that looks like a real reading.
  it('renders an em dash, never a zero', () => {
    for (const bad of [null, undefined, NaN, Infinity, -Infinity, 'abc', {}]) {
      expect(formatPrice(bad)).toBe(EM_DASH)
      expect(formatPct(bad)).toBe(EM_DASH)
      expect(formatCompact(bad)).toBe(EM_DASH)
    }
  })

  it('classifies missing consistently', () => {
    expect(isMissing(null)).toBe(true)
    expect(isMissing(NaN)).toBe(true)
    expect(isMissing(0)).toBe(false)
  })

  it('colours missing as tertiary, not as a gain', () => {
    expect(changeColor(null)).toBe('text-zinc-500')
    expect(changeColor(NaN)).toBe('text-zinc-500')
  })
})

describe('formatPrice', () => {
  it('holds two decimals at or above a dollar so columns align', () => {
    expect(formatPrice(313.94)).toBe('$313.94')
    expect(formatPrice(1)).toBe('$1.00')
    expect(formatPrice(1234.5)).toBe('$1,234.50')
  })

  it('gains precision below a dollar instead of collapsing', () => {
    // $0.058 must not round to $0.06 — sub-dollar tokens are real.
    expect(formatPrice(0.058)).toBe('$0.058')
    expect(formatPrice(0.0012)).toBe('$0.0012')
  })

  it('uses a true minus sign, not a hyphen', () => {
    expect(formatPrice(-5)).toContain(MINUS)
    expect(formatPrice(-5)).not.toContain('-')
  })
})

describe('formatPct', () => {
  it('always carries an explicit sign in both directions', () => {
    expect(formatPct(0.29)).toBe('+0.29%')
    expect(formatPct(-0.07)).toBe(`${MINUS}0.07%`)
  })

  it('renders exact zero as a bare 0%', () => {
    expect(formatPct(0)).toBe('0%')
    expect(formatPct(-0)).toBe('0%') // negative zero normalised
  })

  it('shows a threshold rather than a lying rounded zero', () => {
    // 0.001% is not zero. Rendering it as "0.00%" would assert parity that
    // does not exist.
    expect(formatPct(0.001)).toBe('<0.01%')
    expect(formatPct(-0.001)).toBe(`${MINUS}<0.01%`)
  })

  it('drops cents above 100%, where they are noise', () => {
    expect(formatPct(150)).toBe('+150%')
    expect(formatPct(-150)).toBe(`${MINUS}150%`)
  })
})

describe('compaction is scoped', () => {
  it('abbreviates large aggregates with a lowercase suffix', () => {
    expect(formatCompact(4.9e9)).toBe('$4.9b')
    expect(formatCompact(890.2e6)).toBe('$890.2m')
  })

  it('does not compact below a thousand', () => {
    expect(formatCompact(500)).toBe('$500')
  })

  it('NEVER compacts a price or a percentage', () => {
    // This is exactly how TradingView ships "259.37 K%" on their flagship
    // symbol page: one generic K/M/B/T helper wired into every numeric slot
    // without asking what unit it carries.
    expect(formatPrice(4.9e9)).not.toMatch(/[kmbt]/i)
    expect(formatPct(1260)).not.toMatch(/[kmbt]/i)
    expect(formatPct(1260)).toBe('+1,260%')
  })

  it('groups plain counts without abbreviating', () => {
    expect(formatCount(711)).toBe('711')
    expect(formatCount(1234)).toBe('1,234')
  })
})

describe('outlier gate on headline figures', () => {
  // The digest published "Biggest 24h move — WMKT −50.50%" in the same
  // confident voice as everything else. A superlative is a claim; the raw
  // figure still shows on the asset's own row, where it is data.
  it('rejects magnitudes beyond the default bound', () => {
    expect(isPlausiblePct(-50.5)).toBe(false)
    expect(isPlausiblePct(30)).toBe(false)
  })

  it('accepts ordinary readings', () => {
    expect(isPlausiblePct(1.96)).toBe(true)
    expect(isPlausiblePct(-0.07)).toBe(true)
  })

  it('leaves the tighter judgement to the caller', () => {
    // The default bound (±25) is deliberately loose: a 20% premium can be
    // real on a dislocated token. A 20% DAILY move on an index product
    // cannot, which is why the digest passes its own bound rather than
    // relying on this one — and why chasing the bound downward never fixed
    // it. See DailyDigest, where the noisy superlative was removed entirely.
    expect(isPlausiblePct(-20.8)).toBe(true)
    expect(isPlausiblePct(-20.8, 12)).toBe(false)
  })

  it('rejects missing values rather than treating them as zero', () => {
    expect(isPlausiblePct(null)).toBe(false)
    expect(isPlausiblePct(NaN)).toBe(false)
  })

  it('honours a caller-supplied bound', () => {
    expect(isPlausiblePct(8.5, 12)).toBe(true)
    expect(isPlausiblePct(15, 12)).toBe(false)
  })
})

describe('direction colour reinforces the sign, never replaces it', () => {
  it('maps direction to the reserved tokens', () => {
    expect(changeColor(1)).toBe('text-gain')
    expect(changeColor(-1)).toBe('text-loss')
  })

  it('leaves exact zero neutral', () => {
    expect(changeColor(0)).toBe('text-zinc-400')
  })
})

describe('thinVolumeText', () => {
  it('states the amount when there is one', () => {
    expect(thinVolumeText(12_400)).toBe('About $12.4k changed hands in 24 hours')
  })

  it('has its own wording when volume is zero, rounds to zero, or is unknown', () => {
    for (const v of [0, -0, 0.3, null, undefined, NaN, -5]) {
      expect(thinVolumeText(v)).toBe('Very little of this token changed hands in 24 hours')
    }
  })
})
