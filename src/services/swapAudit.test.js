import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { recordSwap, readSwapAudit, swapKey } from './swapAudit'

/*
 * The audit trail is what a support conversation reads when a user asks
 * "where did my money go". Two properties matter: it must keep every record
 * (an outcome never overwrites its attempt), and it must never, on any path,
 * cost someone their trade by throwing.
 */

function fakeStorage() {
  const map = new Map()
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, String(v)),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', fakeStorage())
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('swapKey', () => {
  it('is the same for the same intended trade and different otherwise', () => {
    const trade = { wallet: 'W', side: 'buy', mint: 'M', amountRaw: '1000000' }
    expect(swapKey(trade)).toBe(swapKey({ ...trade }))
    expect(swapKey(trade)).not.toBe(swapKey({ ...trade, amountRaw: '1000001' }))
    expect(swapKey(trade)).not.toBe(swapKey({ ...trade, side: 'sell' }))
    expect(swapKey(trade)).not.toBe(swapKey({ ...trade, wallet: 'W2' }))
  })
})

describe('recordSwap', () => {
  it('appends rather than replaces, so an attempt survives its outcome', () => {
    recordSwap('submitted', { key: 'K', amountRaw: '1000000' })
    recordSwap('sent', { key: 'K', signature: 'SIG' })
    const trail = readSwapAudit()
    expect(trail.map((r) => r.event)).toEqual(['submitted', 'sent'])
    expect(trail[0].amountRaw).toBe('1000000')
    expect(trail[1].signature).toBe('SIG')
  })

  it('stamps Coordinated Universal Time', () => {
    const record = recordSwap('submitted', { key: 'K' })
    expect(record.at).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
  })

  it('keeps amounts as the integer strings that were submitted', () => {
    // A float here would be a different number from the one on chain.
    recordSwap('submitted', { key: 'K', amountRaw: '12345678901234567890' })
    expect(readSwapAudit()[0].amountRaw).toBe('12345678901234567890')
  })

  it('caps the trail instead of growing without bound', () => {
    for (let i = 0; i < 250; i++) recordSwap('submitted', { key: `K${i}` })
    const trail = readSwapAudit()
    expect(trail).toHaveLength(200)
    // The cap drops the OLDEST, so the most recent trade is always there.
    expect(trail.at(-1).key).toBe('K249')
  })

  it('survives storage that is unavailable, full, or holding junk', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => 'not json at all',
      setItem: () => {
        throw new Error('QuotaExceededError')
      },
    })
    expect(() => recordSwap('submitted', { key: 'K' })).not.toThrow()
    expect(readSwapAudit()).toEqual([])

    vi.unstubAllGlobals() // no localStorage global at all
    expect(() => recordSwap('submitted', { key: 'K' })).not.toThrow()
    expect(readSwapAudit()).toEqual([])
  })
})

/*
 * The repeat guard has to survive the ratio moving underneath it.
 *
 * A sell is sized by the issuer's share-per-token ratio, which the sheet reads
 * live and falls back to the pin for. One typed amount therefore has two
 * possible raw sizes — CRMx's real pair is 99455809 off the pin and 99333694
 * off the live read. Keyed on raw units, the same trade tapped twice across a
 * flip in the ratio source looks like two different trades.
 */
describe('swapKey identifies the trade the user asked for', () => {
  const base = { wallet: 'W', side: 'sell', mint: 'M' }

  it('is the same key for one typed amount sized two different ways', () => {
    const viaPin = swapKey({ ...base, amountRaw: '99455809', typedAmount: '1' })
    const viaLive = swapKey({ ...base, amountRaw: '99333694', typedAmount: '1' })
    expect(viaPin).toBe(viaLive)
  })

  it('still separates genuinely different amounts', () => {
    expect(swapKey({ ...base, amountRaw: '1', typedAmount: '1' })).not.toBe(
      swapKey({ ...base, amountRaw: '2', typedAmount: '2' })
    )
  })

  it('still separates wallet, side and mint', () => {
    const k = swapKey({ ...base, typedAmount: '1' })
    expect(k).not.toBe(swapKey({ ...base, wallet: 'W2', typedAmount: '1' }))
    expect(k).not.toBe(swapKey({ ...base, side: 'buy', typedAmount: '1' }))
    expect(k).not.toBe(swapKey({ ...base, mint: 'M2', typedAmount: '1' }))
  })

  it('falls back to raw units for a caller that states no typed amount', () => {
    expect(swapKey({ ...base, amountRaw: '99455809' })).toBe('W:sell:M:99455809')
  })
})
