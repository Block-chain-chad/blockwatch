import { describe, it, expect } from 'vitest'
import { poolLiquidity, formatAsOf, wantsPoolLookup } from './poolLiquidity'

/*
 * The Pool liquidity row shows one pool's reserve and how old it is. The
 * claims worth pinning: nothing missing ever shows as $0, and nothing shows
 * without a time to say when it was measured.
 */

const AS_OF = '2026-09-24T14:05:00.000Z'
const resolved = (pool, asOf = AS_OF) => ({
  network: 'solana',
  pool: { address: 'x', name: 'AAPLx / USDC', liquidityUsd: 1_234_567, ...pool },
  asOf,
})

describe('poolLiquidity', () => {
  it('reads the reserve, the pool name and the time', () => {
    expect(poolLiquidity(resolved())).toEqual({
      usd: 1_234_567,
      asOf: Date.parse(AS_OF),
      poolName: 'AAPLx / USDC',
    })
  })

  it('shows nothing for a missing reserve, rather than $0', () => {
    expect(poolLiquidity(resolved({ liquidityUsd: null }))).toBeNull()
    expect(poolLiquidity(resolved({ liquidityUsd: undefined }))).toBeNull()
  })

  it('shows nothing for a zero, negative or non-numeric reserve', () => {
    expect(poolLiquidity(resolved({ liquidityUsd: 0 }))).toBeNull()
    expect(poolLiquidity(resolved({ liquidityUsd: -5 }))).toBeNull()
    expect(poolLiquidity(resolved({ liquidityUsd: '1000' }))).toBeNull()
    expect(poolLiquidity(resolved({ liquidityUsd: Infinity }))).toBeNull()
  })

  it('shows nothing without a time, so an undated figure is never presented as current', () => {
    expect(poolLiquidity(resolved({}, null))).toBeNull()
    expect(poolLiquidity(resolved({}, 'not a time'))).toBeNull()
  })

  it('shows nothing when there is no pool', () => {
    expect(poolLiquidity(null)).toBeNull()
    expect(poolLiquidity({ network: 'solana', pool: null, asOf: AS_OF })).toBeNull()
  })

  it('keeps the figure when the pool has no name', () => {
    expect(poolLiquidity(resolved({ name: undefined })).poolName).toBe('')
  })
})

describe('formatAsOf', () => {
  it('prints a short date and time', () => {
    expect(formatAsOf(Date.parse(AS_OF), 'UTC')).toBe('Sep 24, 2:05 PM')
    expect(formatAsOf(Date.parse(AS_OF), 'America/New_York')).toBe('Sep 24, 10:05 AM')
  })
})

describe('wantsPoolLookup', () => {
  it('looks up issuers whose chain is known', () => {
    expect(wantsPoolLookup({ ticker: 'AAPLx', issuer: 'xStocks' })).toBe(true)
    expect(wantsPoolLookup({ ticker: 'NVDAon', issuer: 'Ondo' })).toBe(true)
  })

  it('skips issuers that would need a search on both networks', () => {
    expect(wantsPoolLookup({ ticker: 'XYZ', issuer: 'Other' })).toBe(false)
    expect(wantsPoolLookup({ ticker: 'XYZb', issuer: 'bStocks' })).toBe(false)
  })

  it('skips an asset with no ticker', () => {
    expect(wantsPoolLookup({ issuer: 'xStocks' })).toBe(false)
    expect(wantsPoolLookup(null)).toBe(false)
  })
})
