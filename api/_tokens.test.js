import { describe, it, expect } from 'vitest'
import { TOKEN_NETWORKS, isAllowedToken } from './_tokens.js'
import universe from '../src/data/universe.json'
import { tokensFromUniverse } from '../scripts/build-tokens.mjs'
import { networksFor } from '../src/lib/candles.js'

/*
 * api/_tokens.js is generated from src/data/universe.json. If they drift, a
 * new token's chart silently stops resolving, or a removed one keeps spending
 * GeckoTerminal's shared limit. This catches a forgotten regeneration.
 */

describe('the generated token allowlist', () => {
  it('is exactly the universe file it was generated from', () => {
    expect([...TOKEN_NETWORKS.entries()]).toEqual(tokensFromUniverse(universe))
  })

  it('allows every ticker and network the client will ask about', () => {
    const missing = universe.flatMap((a) =>
      networksFor(a)
        .filter((n) => !isAllowedToken(a.ticker, n))
        .map((n) => `${a.ticker} on ${n}`)
    )
    expect(missing).toEqual([])
  })
})

describe('isAllowedToken', () => {
  it('is exact about case and network', () => {
    expect(isAllowedToken('AAPLx', 'solana')).toBe(true)
    expect(isAllowedToken('aaplx', 'solana')).toBe(false)
    expect(isAllowedToken('AAPLx', 'eth')).toBe(false)
    expect(isAllowedToken('NVDAon', 'eth')).toBe(true)
  })

  it('refuses anything that is not a listed ticker', () => {
    for (const t of ['ZZZZQ', '', 'constructor', '__proto__', ['AAPLx'], undefined]) {
      expect(isAllowedToken(t, 'solana')).toBe(false)
    }
  })
})
