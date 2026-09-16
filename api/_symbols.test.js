import { describe, it, expect } from 'vitest'
import { ALLOWED_SYMBOLS, isAllowedSymbol } from './_symbols.js'
import universe from '../src/data/universe.json'
import { symbolsFromUniverse } from '../scripts/build-symbols.mjs'

/*
 * api/_symbols.js is generated from src/data/universe.json. The two drifting
 * apart is a silent, user-visible failure in BOTH directions: a symbol added
 * to the universe but missing here stops quoting (its gap goes blank), and a
 * symbol left here after leaving the universe is quota we spend on nothing.
 * This test is the thing that catches a forgotten regeneration.
 */

describe('the generated symbol allowlist', () => {
  it('is exactly the universe file it was generated from', () => {
    expect([...ALLOWED_SYMBOLS].sort()).toEqual(symbolsFromUniverse(universe))
  })

  it('covers every asset the app can show a share price for', () => {
    const missing = universe
      .filter((a) => a.underlying)
      .filter((a) => !isAllowedSymbol(a.underlying))
      .map((a) => `${a.ticker} -> ${a.underlying}`)
    expect(missing).toEqual([])
  })

  it('is not empty, which would blank every share price at once', () => {
    expect(ALLOWED_SYMBOLS.size).toBeGreaterThan(100)
  })
})

describe('isAllowedSymbol', () => {
  it('accepts a symbol the app really asks for, dot included', () => {
    expect(isAllowedSymbol('AAPL')).toBe(true)
    expect(isAllowedSymbol('BRK.B')).toBe(true)
  })

  it('rejects the walk-the-alphabet drain the old pattern allowed', () => {
    // Every one of these matched /^[A-Z0-9.\-]{1,10}$/i and minted its own
    // edge-cache key, so each was a fresh upstream call.
    for (const junk of ['ZZZZ', 'A1', 'X.Y', 'QQQQQQQQQQ', '0', '---']) {
      expect(isAllowedSymbol(junk)).toBe(false)
    }
  })

  it('is case sensitive, because case variants are separate cache keys', () => {
    expect(isAllowedSymbol('aapl')).toBe(false)
    expect(isAllowedSymbol('AaPl')).toBe(false)
  })

  it('rejects non-strings without throwing', () => {
    for (const bad of [undefined, null, '', 0, [], {}, ['AAPL']]) {
      expect(isAllowedSymbol(bad)).toBe(false)
    }
  })
})
