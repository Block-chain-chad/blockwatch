import { describe, it, expect } from 'vitest'
import { verifiedToken, VERIFIED_MINTS, VERIFIED_AT } from './verifiedMints'
import { ASSETS, BY_ID } from './universe'

/*
 * The pinned list is the difference between buying TSLAx and buying whatever
 * a bad CoinGecko record pointed at. Two things are worth guarding: the
 * lookup fails closed, and the checked-in data still agrees with the universe
 * it was generated from.
 */

const anyId = Object.keys(VERIFIED_MINTS)[0]

describe('verifiedToken', () => {
  it('returns the pinned address and its on-chain decimals', () => {
    const token = verifiedToken(BY_ID[anyId])
    expect(token.mint).toBe(VERIFIED_MINTS[anyId].mint)
    expect(Number.isSafeInteger(token.decimals)).toBe(true)
  })

  it('returns nothing for an asset that was never verified', () => {
    expect(verifiedToken({ id: 'not-a-real-asset', mint: 'SomeMint' })).toBe(null)
    expect(verifiedToken({ id: 'spacex-reality-protocol' })).toBe(null)
    expect(verifiedToken(null)).toBe(null)
    expect(verifiedToken({})).toBe(null)
  })

  it('fails closed when the asset record disagrees with the pin', () => {
    // A universe rebuild that produced a different address is exactly what
    // this list exists to catch. No swap until someone re-verifies.
    expect(verifiedToken({ ...BY_ID[anyId], mint: 'DifferentMintEntirely' })).toBe(null)
  })
})

describe('the pinned list itself', () => {
  it('records when it was checked, in Coordinated Universal Time', () => {
    expect(VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/)
  })

  it('pins an address and decimals for every entry', () => {
    for (const [id, token] of Object.entries(VERIFIED_MINTS)) {
      expect(typeof token.mint, id).toBe('string')
      expect(token.mint.length, id).toBeGreaterThan(31)
      expect(Number.isSafeInteger(token.decimals), id).toBe(true)
      expect(token.decimals, id).toBeGreaterThanOrEqual(0)
      // The issuer's own symbol must be the ticker we print next to it, or
      // the user is looking at one token and buying another.
      expect(token.symbol, id).toBe(token.ticker)
    }
  })

  it('still agrees with the universe it was generated from', () => {
    for (const [id, token] of Object.entries(VERIFIED_MINTS)) {
      const asset = BY_ID[id]
      expect(asset, `${id} is missing from the universe`).toBeTruthy()
      expect(asset.mint, id).toBe(token.mint)
      expect(asset.ticker, id).toBe(token.ticker)
    }
  })

  it('never pins the same address to two assets', () => {
    const mints = Object.values(VERIFIED_MINTS).map((t) => t.mint)
    expect(new Set(mints).size).toBe(mints.length)
  })

  it('leaves unverified assets tradeable only through the external venue', () => {
    // Not a failure — a reminder that the number is meant to be small and
    // that every rebuild needs scripts/verify-mints.mjs run after it.
    const withMint = ASSETS.filter((a) => a.mint)
    const unverified = withMint.filter((a) => !verifiedToken(a))
    expect(unverified.length).toBe(0)
  })
})
