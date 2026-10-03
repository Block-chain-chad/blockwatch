import { describe, it, expect } from 'vitest'
import {
  SESSION_DOT, SESSION_NOTE, SESSION_SHORT, widestCredibleGap, widestGapLabel, closedGapLabel, closedGapLabelFor, shareGapLines,
} from './sessionCopy'
import { THIN_VOLUME_USD } from './prices'

const SESSIONS = ['regular', 'pre', 'post', 'closed']

describe('session copy tables', () => {
  it('cover exactly the four sessions each', () => {
    for (const table of [SESSION_DOT, SESSION_NOTE, SESSION_SHORT]) {
      expect(Object.keys(table).sort()).toEqual([...SESSIONS].sort())
    }
  })

  it('use the session tokens, never a direction colour', () => {
    for (const v of Object.values(SESSION_DOT)) expect(v).toMatch(/^var\(--color-session-/)
    expect(SESSION_DOT.pre).toBe(SESSION_DOT.post)
  })

  it('has the short words the top bar shows', () => {
    expect(SESSION_SHORT).toEqual({
      regular: 'Open',
      pre: 'Pre-market',
      post: 'After hours',
      closed: 'Market closed',
    })
  })

  it('are plain sentences with no dashes', () => {
    for (const note of Object.values(SESSION_NOTE)) expect(note).not.toMatch(/[\u2013\u2014]/)
  })

  it('every short word opens its own sentence', () => {
    for (const s of SESSIONS) {
      const head = SESSION_NOTE[s].split('. ')[0]
      expect(head.toLowerCase()).toContain(SESSION_SHORT[s].toLowerCase())
    }
  })
})

const liquid = (id, tokenPrice, stockPrice, over = {}) => ({
  id,
  ticker: id.toUpperCase(),
  underlying: id.toUpperCase().replace(/X$/, ''),
  tokenPrice,
  stockPrice,
  volume24h: THIN_VOLUME_USD * 10,
  sharesPerToken: 1, // verified 1:1; see lib/gapCheck.js
  priceUpdatedAt: Date.now(),
  ...over,
})

describe('widestCredibleGap', () => {
  it('is null during regular hours by default, whatever the gaps', () => {
    expect(widestCredibleGap([liquid('ax', 110, 100)], 'regular')).toBeNull()
    expect(widestCredibleGap([liquid('ax', 101, 100)], 'regular', {})).toBeNull()
    expect(widestCredibleGap([liquid('ax', 101, 100)], 'regular', { includeRegular: false })).toBeNull()
  })

  it('names the widest gap in regular hours when asked, inside the pre/post 5% band', () => {
    const assets = [liquid('ax', 101, 100), liquid('bx', 96, 100), liquid('cx', 110, 100)]
    const top = widestCredibleGap(assets, 'regular', { includeRegular: true })
    expect(top.asset.id).toBe('bx')
    expect(top.p).toBeCloseTo(-4)
    expect(widestCredibleGap([liquid('cx', 110, 100)], 'regular', { includeRegular: true })).toBeNull()
  })

  it('keeps the floor and the thin-market exclusion in regular hours', () => {
    const thin = liquid('ax', 104, 100, { volume24h: THIN_VOLUME_USD / 2 })
    expect(widestCredibleGap([liquid('bx', 100.1, 100)], 'regular', { includeRegular: true })).toBeNull()
    expect(widestCredibleGap([thin], 'regular', { includeRegular: true })).toBeNull()
    expect(widestCredibleGap([thin, liquid('cx', 100.2, 100)], 'regular', { includeRegular: true })?.asset.id).toBe('cx')
  })

  it('leaves the shut-market sessions exactly as before with the option on', () => {
    const wide = liquid('ax', 110, 100)
    const huge = liquid('bx', 130, 100)
    expect(widestCredibleGap([wide, huge], 'closed', { includeRegular: true })?.asset.id).toBe('ax')
    expect(widestCredibleGap([wide, huge], 'pre', { includeRegular: true })).toBeNull()
  })

  it('picks the biggest absolute gap inside the band', () => {
    const assets = [liquid('ax', 101, 100), liquid('bx', 97, 100), liquid('cx', 102, 100)]
    const top = widestCredibleGap(assets, 'closed')
    expect(top.asset.id).toBe('bx')
    expect(top.p).toBeCloseTo(-3)
  })

  it('ignores parity noise under 0.15%', () => {
    expect(widestCredibleGap([liquid('ax', 100.1, 100)], 'closed')).toBeNull()
    expect(widestCredibleGap([liquid('ax', 100.2, 100)], 'closed')?.asset.id).toBe('ax')
  })

  it('caps at 20% overnight and 5% in pre/post', () => {
    const wide = liquid('ax', 110, 100) // +10%
    const huge = liquid('bx', 130, 100) // +30%
    expect(widestCredibleGap([wide, huge], 'closed')?.asset.id).toBe('ax')
    expect(widestCredibleGap([wide, huge], 'pre')).toBeNull()
    expect(widestCredibleGap([wide, huge], 'post')).toBeNull()
    expect(widestCredibleGap([liquid('cx', 104, 100), wide], 'post')?.asset.id).toBe('cx')
  })

  it('skips thin tokens and assets without both prices', () => {
    const thin = liquid('ax', 110, 100, { volume24h: THIN_VOLUME_USD / 2 })
    const noStock = liquid('bx', 110, null)
    expect(widestCredibleGap([thin, noStock], 'closed')).toBeNull()
    expect(widestCredibleGap([], 'closed')).toBeNull()
    expect(widestCredibleGap(undefined, 'closed')).toBeNull()
  })
})

describe('widestGapLabel', () => {
  it('says the number is live only in regular hours', () => {
    expect(widestGapLabel('regular')).toBe('Widest gap right now')
    for (const s of ['pre', 'post', 'closed']) expect(widestGapLabel(s)).toBe('Widest gap')
  })
})

/*
 * The label beside every gap figure while the share leg is a close. Times are
 * UTC; the comments give New York time. September 2026 is EDT (UTC-4),
 * November and December are EST (UTC-5).
 */
describe('closedGapLabel', () => {
  const at = (iso) => ({ now: Date.parse(iso) })
  const vs = (iso, quoteAsOf) => closedGapLabel({ now: Date.parse(iso), quoteAsOf })?.vs ?? null

  it('adds nothing during regular hours', () => {
    expect(closedGapLabel(at('2026-09-15T17:30:00Z'))).toBeNull() // Tue 13:30
    expect(closedGapLabel(at('2026-09-15T13:30:00Z'))).toBeNull() // Tue 09:30, the open
  })

  it('names today’s close after hours on a weekday, and tags it Market closed', () => {
    const label = closedGapLabel(at('2026-09-15T21:00:00Z')) // Tue 17:00
    expect(label).toMatchObject({ tag: 'Market closed', vs: 'vs today’s close' })
    expect(label.title).toBe(
      'The share is trading outside regular hours, but this gap compares the token’s latest price with the share price at today’s close, so it may not match where the share is trading now.',
    )
    expect(vs('2026-09-15T20:00:00Z')).toBe('vs today’s close') // Tue 16:00, the close itself
  })

  it('still names today’s close overnight, after the extended session', () => {
    const label = closedGapLabel(at('2026-09-16T02:00:00Z')) // Tue 22:00
    expect(label.vs).toBe('vs today’s close')
    expect(label.title).toBe(
      'The US market is closed. This gap compares the token’s latest price with the share price at today’s close, so the two prices are from different times.',
    )
  })

  it('names the previous trading day before the open', () => {
    expect(vs('2026-09-16T07:00:00Z')).toBe('vs Tuesday’s close') // Wed 03:00, overnight
    expect(vs('2026-09-16T12:00:00Z')).toBe('vs Tuesday’s close') // Wed 08:00, pre-market
    expect(vs('2026-09-21T11:00:00Z')).toBe('vs Friday’s close') // Mon 07:00, after a weekend
  })

  it('names Friday’s close in the hover text on a weekend, with one possessive', () => {
    const label = closedGapLabel(at('2026-09-19T16:00:00Z')) // Sat noon
    expect(label.title).toBe(
      'The US market is closed. This gap compares the token’s latest price with the share price at Friday’s close, so the two prices are from different times.',
    )
    expect(label.title).not.toContain('share’s Friday’s')
    expect(label).toMatchObject({ tag: 'Market closed', vs: 'vs Friday’s close', close: 'Friday’s close' })
  })

  it('names Friday’s close in the pre-market hover text on a Monday', () => {
    const label = closedGapLabel(at('2026-09-21T12:00:00Z')) // Mon 08:00
    expect(label.title).toBe(
      'The share is trading outside regular hours, but this gap compares the token’s latest price with the share price at Friday’s close, so it may not match where the share is trading now.',
    )
  })

  it('names Friday’s close on Saturday and on Sunday', () => {
    expect(vs('2026-09-19T16:00:00Z')).toBe('vs Friday’s close') // Sat noon
    expect(vs('2026-09-20T23:00:00Z')).toBe('vs Friday’s close') // Sun 19:00
  })

  it('skips market holidays', () => {
    expect(vs('2026-09-07T16:00:00Z')).toBe('vs Friday’s close') // Labor Day Monday
    expect(vs('2026-09-08T11:00:00Z')).toBe('vs Friday’s close') // Tue 07:00 after Labor Day
    expect(vs('2026-11-26T18:00:00Z')).toBe('vs Wednesday’s close') // Thanksgiving
  })

  it('counts an early close from 1:00 pm', () => {
    expect(vs('2026-11-27T13:00:00Z')).toBe('vs Wednesday’s close') // Fri 08:00, before the open
    expect(closedGapLabel(at('2026-11-27T17:30:00Z'))).toBeNull() // Fri 12:30, still open
    expect(vs('2026-11-27T18:30:00Z')).toBe('vs today’s close') // Fri 13:30, after the early close
    expect(vs('2026-12-24T19:00:00Z')).toBe('vs today’s close') // Christmas Eve 14:00
    expect(vs('2026-12-25T15:00:00Z')).toBe('vs Thursday’s close') // Christmas Day
  })

  it('agrees with a quote stamped at that close', () => {
    const fridayClose = Date.parse('2026-09-18T20:00:00Z') // Fri 16:00
    expect(vs('2026-09-19T16:00:00Z', fridayClose)).toBe('vs Friday’s close')
  })

  it('says last close when the quote is from a different day than the close', () => {
    const thursdayClose = Date.parse('2026-09-17T20:00:00Z')
    const label = closedGapLabel({ now: Date.parse('2026-09-19T16:00:00Z'), quoteAsOf: thursdayClose })
    expect(label.vs).toBe('vs last close')
    expect(label.title).toBe(
      'The US market is closed. This gap compares the token’s latest price with the share price at the last close, so the two prices are from different times.',
    )
  })

  it('says last close past the end of the calendar', () => {
    expect(vs('2028-01-08T16:00:00Z')).toBe('vs last close') // a Saturday in 2028
  })

  it('writes no dashes', () => {
    const label = closedGapLabel(at('2026-09-19T16:00:00Z'))
    expect(JSON.stringify(label)).not.toMatch(/[\u2013\u2014]/)
  })
})

describe('closedGapLabelFor and shareGapLine', () => {
  const saturday = Date.parse('2026-09-19T16:00:00Z')
  const tuesdayOpen = Date.parse('2026-09-15T17:30:00Z')
  const nvdax = { ticker: 'NVDAx', underlying: 'NVDA', stockQuote: { asOf: Date.parse('2026-09-18T20:00:00Z') } }

  it('has no label for a product with no listed share', () => {
    expect(closedGapLabelFor({ ticker: 'TBILL', underlying: null }, saturday)).toBeNull()
  })

  it('dates the label from the asset’s own quote', () => {
    expect(closedGapLabelFor(nvdax, saturday).close).toBe('Friday’s close')
  })

  it('says which close a shared card measures against', () => {
    expect(shareGapLines(nvdax, saturday)).toEqual({ line: 'vs NVDA at Friday’s close', tag: 'Market closed' })
    expect(shareGapLines(nvdax, tuesdayOpen)).toEqual({ line: 'vs NVDA stock', tag: null })
  })
})
