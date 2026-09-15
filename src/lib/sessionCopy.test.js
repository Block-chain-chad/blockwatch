import { describe, it, expect } from 'vitest'
import { SESSION_DOT, SESSION_NOTE, SESSION_SHORT, widestCredibleGap } from './sessionCopy'
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
      closed: 'Overnight',
    })
  })

  it('every short word opens its own sentence', () => {
    for (const s of SESSIONS) {
      const head = SESSION_NOTE[s].split(' — ')[0]
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
  ...over,
})

describe('widestCredibleGap', () => {
  it('is null during regular hours, whatever the gaps', () => {
    expect(widestCredibleGap([liquid('ax', 110, 100)], 'regular')).toBeNull()
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
