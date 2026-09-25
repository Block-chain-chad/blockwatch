import { describe, it, expect } from 'vitest'
import {
  poolLiquidity,
  formatAsOf,
  wantsPoolLookup,
  cleanPoolName,
  liquidityCaption,
  STALE_AFTER_MS,
} from './poolLiquidity'

/*
 * The Pool liquidity row shows one pool's reserve and how old it is. The
 * claims worth pinning: nothing missing ever shows as $0, nothing shows
 * without a time, nothing shows for a pool that cannot be proven to trade the
 * issuer's token, and the pool's fee tier never sits next to the figure
 * looking like a spread.
 *
 * apple-xstock and tesla-xstock are real ids with real pinned mints in
 * data/verifiedMints.json; the wrapped Apple token is one of the four xStocks
 * with no pin; NVDAon stands for Ondo, which has none at all.
 */

const APPLE_MINT = 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp'
const TESLA_MINT = 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB'
const APPLE = { id: 'apple-xstock', ticker: 'AAPLx', issuer: 'xStocks', mint: APPLE_MINT }
const UNPINNED_XSTOCK = { id: 'wrapped-apple-xstock', ticker: 'WAAPLx', issuer: 'xStocks' }
const ONDO = { id: 'nvidia-ondo-tokenized-stock', ticker: 'NVDAon', issuer: 'Ondo' }

const AS_OF = '2026-09-24T14:05:00.000Z'
const resolved = (pool, asOf = AS_OF) => ({
  network: 'solana',
  pool: { address: 'x', name: 'AAPLx / USDC', baseAddress: APPLE_MINT, liquidityUsd: 1_234_567, ...pool },
  asOf,
})

describe('poolLiquidity', () => {
  it('reads the reserve, the pool name and the time for a verified pool', () => {
    expect(poolLiquidity(resolved(), APPLE)).toEqual({
      usd: 1_234_567,
      asOf: Date.parse(AS_OF),
      poolName: 'AAPLx / USDC',
    })
  })

  it("shows nothing when the pool's base token is not the verified address", () => {
    expect(poolLiquidity(resolved({ baseAddress: TESLA_MINT }), APPLE)).toBeNull()
    expect(poolLiquidity(resolved({ baseAddress: 'LookaLikeMint1111111111111111111111111111111' }), APPLE)).toBeNull()
  })

  it('shows nothing when the pool does not say which token it trades', () => {
    expect(poolLiquidity(resolved({ baseAddress: null }), APPLE)).toBeNull()
    expect(poolLiquidity(resolved({ baseAddress: undefined }), APPLE)).toBeNull()
  })

  it('shows nothing for an asset with no pinned address, whatever the pool says', () => {
    expect(poolLiquidity(resolved(), UNPINNED_XSTOCK)).toBeNull()
    expect(poolLiquidity(resolved({ baseAddress: '0x2d1f7226bd1f780af6b9a49dcc0ae00e8df4bdee' }), ONDO)).toBeNull()
    expect(poolLiquidity(resolved(), null)).toBeNull()
  })

  it('shows nothing when the asset record disagrees with its pin', () => {
    expect(poolLiquidity(resolved(), { ...APPLE, mint: TESLA_MINT })).toBeNull()
  })

  it('shows nothing for a missing reserve, rather than $0', () => {
    expect(poolLiquidity(resolved({ liquidityUsd: null }), APPLE)).toBeNull()
    expect(poolLiquidity(resolved({ liquidityUsd: undefined }), APPLE)).toBeNull()
  })

  it('shows nothing for a zero, negative or non-numeric reserve', () => {
    expect(poolLiquidity(resolved({ liquidityUsd: 0 }), APPLE)).toBeNull()
    expect(poolLiquidity(resolved({ liquidityUsd: -5 }), APPLE)).toBeNull()
    expect(poolLiquidity(resolved({ liquidityUsd: '1000' }), APPLE)).toBeNull()
    expect(poolLiquidity(resolved({ liquidityUsd: Infinity }), APPLE)).toBeNull()
  })

  it('shows nothing without a time, so an undated figure is never presented as current', () => {
    expect(poolLiquidity(resolved({}, null), APPLE)).toBeNull()
    expect(poolLiquidity(resolved({}, 'not a time'), APPLE)).toBeNull()
  })

  it('shows nothing when there is no pool', () => {
    expect(poolLiquidity(null, APPLE)).toBeNull()
    expect(poolLiquidity({ network: 'solana', pool: null, asOf: AS_OF }, APPLE)).toBeNull()
  })

  it('strips the fee tier from the pool name', () => {
    expect(poolLiquidity(resolved({ name: 'AAPLx / USDC 0.51%' }), APPLE).poolName).toBe('AAPLx / USDC')
  })

  it('keeps the figure when the pool has no name', () => {
    expect(poolLiquidity(resolved({ name: undefined }), APPLE).poolName).toBe('')
  })
})

describe('cleanPoolName', () => {
  it('drops a trailing fee percentage', () => {
    expect(cleanPoolName('NVDAon / USDC 0.51%')).toBe('NVDAon / USDC')
    expect(cleanPoolName('NVDAon / WETH 0.01%')).toBe('NVDAon / WETH')
    expect(cleanPoolName('NVDAon / USDC 1%')).toBe('NVDAon / USDC')
  })

  it('leaves a name with no fee alone', () => {
    expect(cleanPoolName('AAPLx / USDC')).toBe('AAPLx / USDC')
  })

  it('copes with a name that is not a pair, or no name', () => {
    expect(cleanPoolName('lonely 0.3%')).toBe('lonely')
    expect(cleanPoolName(undefined)).toBe('')
  })
})

describe('formatAsOf', () => {
  it('prints a short date and time', () => {
    expect(formatAsOf(Date.parse(AS_OF), 'UTC')).toBe('Sep 24, 2:05 PM')
    expect(formatAsOf(Date.parse(AS_OF), 'America/New_York')).toBe('Sep 24, 10:05 AM')
  })
})

describe('liquidityCaption', () => {
  const asOf = Date.parse(AS_OF)
  const row = { poolName: 'AAPLx / USDC', asOf }

  it('names the pool and the time', () => {
    expect(liquidityCaption(row, asOf + 60_000, 'UTC')).toBe('AAPLx / USDC pool, as of Sep 24, 2:05 PM')
  })

  it('stays plain up to a day old', () => {
    expect(liquidityCaption(row, asOf + STALE_AFTER_MS, 'UTC')).not.toContain('out of date')
  })

  it('says it may be out of date once older than a day', () => {
    expect(liquidityCaption(row, asOf + STALE_AFTER_MS + 1, 'UTC')).toBe(
      'AAPLx / USDC pool, as of Sep 24, 2:05 PM, may be out of date',
    )
  })

  it('leaves the pool out when it has no name', () => {
    expect(liquidityCaption({ poolName: '', asOf }, asOf, 'UTC')).toBe('as of Sep 24, 2:05 PM')
  })
})

describe('wantsPoolLookup', () => {
  it('looks up an asset with a verified address on a known chain', () => {
    expect(wantsPoolLookup(APPLE)).toBe(true)
  })

  it('skips assets whose row could never show: no pinned address', () => {
    expect(wantsPoolLookup(UNPINNED_XSTOCK)).toBe(false)
    expect(wantsPoolLookup(ONDO)).toBe(false)
  })

  it('skips an asset whose record disagrees with its pin', () => {
    expect(wantsPoolLookup({ ...APPLE, mint: TESLA_MINT })).toBe(false)
  })

  it('skips issuers that would need a search on both networks', () => {
    expect(wantsPoolLookup({ id: 'apple-xstock', ticker: 'AAPLx', issuer: 'Other' })).toBe(false)
  })

  it('skips an asset with no ticker', () => {
    expect(wantsPoolLookup({ id: 'apple-xstock', issuer: 'xStocks' })).toBe(false)
    expect(wantsPoolLookup(null)).toBe(false)
  })
})
