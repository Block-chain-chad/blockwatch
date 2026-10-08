import { describe, it, expect } from 'vitest'
import { COIN_IDS, isAllowedCoin } from './_coins.js'
import universe from '../src/data/universe.json'
import { coinsFromUniverse } from '../scripts/build-coins.mjs'

/*
 * api/_coins.js is generated from src/data/universe.json. If they drift, a
 * new token's history silently stops loading, or a removed one keeps
 * spending CoinGecko's limit. This catches a forgotten regeneration.
 */

describe('the generated coin allowlist', () => {
  it('is exactly the universe file it was generated from', () => {
    expect([...COIN_IDS]).toEqual(coinsFromUniverse(universe))
  })

  it('allows every id the client will ask about', () => {
    expect(universe.filter((a) => !isAllowedCoin(a.id)).map((a) => a.id)).toEqual([])
  })
})

describe('isAllowedCoin', () => {
  it('is exact about case', () => {
    expect(isAllowedCoin('circle-internet-group-ondo-tokenized-stock')).toBe(true)
    expect(isAllowedCoin('Circle-Internet-Group-Ondo-Tokenized-Stock')).toBe(false)
    expect(isAllowedCoin('NVIDIA-XSTOCK')).toBe(false)
  })

  it('refuses anything that is not a listed id', () => {
    for (const id of ['bitcoin', '', ' nvidia-xstock', 'nvidia-xstock/../x', 'constructor', '__proto__', ['nvidia-xstock'], undefined, null, 7]) {
      expect(isAllowedCoin(id)).toBe(false)
    }
  })
})
