import { describe, it, expect } from 'vitest'
import { TIP_KEYS, TIP_COPY, tipAnchors, currentTip, readSeen, writeSeen } from './tips'
import { BY_ID } from '../data/universe'
import { sharesPerToken, gapCheck } from './gapCheck'

/*
 * Every rule in section 3 of the tip bubbles brief. Times are UTC; the
 * comments give New York time (EDT, UTC-4).
 */

const OPEN = Date.parse('2026-09-30T15:00:00Z') // Wed 11:00
const AFTER_HOURS = Date.parse('2026-10-01T21:00:00Z') // Thu 17:00
const WEEKEND = Date.parse('2026-10-03T15:00:00Z') // Sat 11:00

/** A real universe asset, priced fresh at `now`, its share leg stamped at `asOf`. */
function priced(id, now, over = {}) {
  const seed = BY_ID[id]
  return {
    ...seed,
    sharesPerToken: sharesPerToken(seed),
    tokenPrice: 181.24,
    stockPrice: 180.83,
    volume24h: 5_000_000,
    priceUpdatedAt: now - 60_000,
    stockQuote: { price: 180.83, asOf: null },
    ...over,
  }
}

const NVDAX = 'nvidia-xstock'
const TSLAX = 'tesla-xstock'

const NONE_SEEN = { gap: false, closed: false }
const GAP_SEEN = { gap: true, closed: false }
const ALL_SEEN = { gap: true, closed: true }

function tip(over) {
  return currentTip({ seen: NONE_SEEN, status: 'live', covered: false, anchors: { gap: ['a', 'b'], closed: [] }, ...over })
}

describe('tipAnchors', () => {
  it('lists only rows whose gap is confirmed, in list order', () => {
    const ok = priced(NVDAX, OPEN)
    const unverified = { ...priced(TSLAX, OPEN), sharesPerToken: null } // "Ratio unverified"
    const stale = priced(TSLAX, OPEN, { priceUpdatedAt: OPEN - 3 * 86_400_000 }) // "Gap not confirmed"
    const loading = priced(TSLAX, OPEN, { stockPrice: null }) // skeleton
    const noShare = { ...priced(TSLAX, OPEN), underlying: null } // nothing to compare
    expect([unverified, stale, loading, noShare, ok].map((a) => gapCheck(a, OPEN).status)).toEqual([
      'ratio-unverified', 'price-check-failed', 'pending', 'none', 'ok',
    ])
    const anchors = tipAnchors([unverified, stale, loading, noShare, ok], OPEN)
    expect(anchors.gap).toEqual([ok.id])
  })

  it('has no closed anchors while the market is open', () => {
    expect(tipAnchors([priced(NVDAX, OPEN)], OPEN).closed).toEqual([])
  })

  it('lists the rows showing the Market closed pill on a weekend and after hours', () => {
    const rows = [priced(NVDAX, WEEKEND), priced(TSLAX, WEEKEND)]
    expect(tipAnchors(rows, WEEKEND)).toEqual({ gap: [rows[0].id, rows[1].id], closed: [rows[0].id, rows[1].id] })
    expect(tipAnchors([priced(NVDAX, AFTER_HOURS)], AFTER_HOURS).closed).toEqual([BY_ID[NVDAX].id])
  })

  it('never lists a pill-less row as closed: an unconfirmed gap shows no pill', () => {
    const failed = priced(NVDAX, WEEKEND, { tokenPrice: 400 }) // +121%, not confirmed
    expect(tipAnchors([failed], WEEKEND)).toEqual({ gap: [], closed: [] })
  })

  it('takes an empty or missing list', () => {
    expect(tipAnchors([], OPEN)).toEqual({ gap: [], closed: [] })
    expect(tipAnchors(undefined, OPEN)).toEqual({ gap: [], closed: [] })
  })
})

describe('currentTip', () => {
  it('shows the gap tip first, on the first eligible row', () => {
    expect(tip()).toEqual({ tip: 'gap', assetId: 'a' })
  })

  it('never shows the closed tip before the gap tip is closed, even with a pill on screen', () => {
    expect(tip({ anchors: { gap: ['a'], closed: ['a'] } })).toEqual({ tip: 'gap', assetId: 'a' })
  })

  it('shows the closed tip right after the gap tip on a closed market', () => {
    expect(tip({ seen: GAP_SEEN, anchors: { gap: ['a', 'b'], closed: ['b'] } })).toEqual({ tip: 'closed', assetId: 'b' })
  })

  it('waits for a pill: with the market open and the gap tip done, nothing shows', () => {
    expect(tip({ seen: GAP_SEEN, anchors: { gap: ['a'], closed: [] } })).toBeNull()
  })

  it('shows nothing once both are seen', () => {
    expect(tip({ seen: ALL_SEEN, anchors: { gap: ['a'], closed: ['a'] } })).toBeNull()
  })

  it('shows nothing without an eligible row (empty watchlist, no ok gap, a filter with none)', () => {
    expect(tip({ anchors: { gap: [], closed: [] } })).toBeNull()
    expect(tip({ seen: GAP_SEEN, anchors: { gap: [], closed: [] } })).toBeNull()
  })

  it('moves to the new first eligible row when a filter removes the old one', () => {
    expect(tip({ anchors: { gap: ['b'], closed: [] } })).toEqual({ tip: 'gap', assetId: 'b' })
  })

  it('shows nothing while a sheet or overlay is open, and comes back after', () => {
    expect(tip({ covered: true })).toBeNull()
    expect(tip({ covered: false })).toEqual({ tip: 'gap', assetId: 'a' })
  })

  it('shows only while prices are live or stale', () => {
    expect(tip({ status: 'stale' })).toEqual({ tip: 'gap', assetId: 'a' })
    for (const status of ['loading', 'error', 'offline', undefined]) expect(tip({ status })).toBeNull()
  })
})

describe('seen flags', () => {
  function memory(initial = {}) {
    const data = { ...initial }
    return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => { data[k] = String(v) } }
  }

  it('reuses the old caption key for the gap tip and adds one for the closed tip', () => {
    expect(TIP_KEYS).toEqual({ gap: 'bw.tip.premium.v1', closed: 'bw.tip.closed.v1' })
  })

  it('reads fresh storage as nothing seen', () => {
    const s = memory()
    expect(readSeen(() => s)).toEqual(NONE_SEEN)
  })

  it('treats someone who closed the old caption as having seen the gap tip', () => {
    const s = memory({ 'bw.tip.premium.v1': '1' })
    expect(readSeen(() => s)).toEqual(GAP_SEEN)
  })

  it('writes 1 under the tip’s key, for each way of closing it', () => {
    const s = memory()
    writeSeen(() => s, 'gap')
    expect(s.data).toEqual({ 'bw.tip.premium.v1': '1' })
    writeSeen(() => s, 'closed')
    expect(readSeen(() => s)).toEqual(ALL_SEEN)
  })

  it('counts storage that throws as seen, so no bubble shows', () => {
    const throwing = () => {
      throw new Error('SecurityError')
    }
    const broken = { getItem: throwing, setItem: throwing }
    expect(readSeen(throwing)).toEqual(ALL_SEEN)
    expect(readSeen(() => broken)).toEqual(ALL_SEEN)
    expect(() => writeSeen(() => broken, 'gap')).not.toThrow()
    expect(currentTip({ seen: readSeen(throwing), status: 'live', covered: false, anchors: { gap: ['a'], closed: ['a'] } })).toBeNull()
  })
})

describe('copy', () => {
  it('uses the approved gap tip text', () => {
    expect(TIP_COPY.gap.title).toBe('The gap')
    expect(TIP_COPY.gap.body).toBe(
      'How far the token’s price sits from the price of the share it tracks: green above, red below, gray when they match. Tap a row to see both prices. A gap describes prices, not what to buy or sell.',
    )
  })

  it('links each tip to its lesson', () => {
    expect(TIP_COPY.gap).toMatchObject({ link: "What's a premium?", lesson: 'premium' })
    expect(TIP_COPY.closed).toMatchObject({ link: 'Why weekend prices drift', lesson: 'weekend' })
  })

  it('has no dashes', () => {
    expect(JSON.stringify(TIP_COPY)).not.toMatch(/[–—]/)
  })
})
