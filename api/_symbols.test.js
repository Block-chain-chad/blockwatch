import { describe, it, expect } from 'vitest'
import {
  ALLOWED_SYMBOLS,
  ALLOWED_YAHOO_SYMBOLS,
  isAllowedSymbol,
  isAllowedYahooSymbol,
} from './_symbols.js'
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

/*
 * The Yahoo spelling. api/history.js fronts Yahoo's chart endpoint, and the
 * client rewrites BRK.B to BRK-B before calling it (src/services/stocks.js,
 * src/services/candles.js). Reusing ALLOWED_SYMBOLS there unchanged would 400
 * every request for that symbol and blank its chart, so the list carries the
 * transformed spelling too — derived from the same data, not maintained by
 * hand beside it.
 */
describe('the Yahoo spelling of the allowlist', () => {
  it('holds one Yahoo spelling per symbol, so none is unreachable', () => {
    // A collision would silently drop a symbol from /api/history. The sizes
    // matching is what proves the mapping is one-to-one.
    expect(ALLOWED_YAHOO_SYMBOLS.size).toBe(ALLOWED_SYMBOLS.size)
  })

  it('matches what the client sends, for every symbol in the universe', () => {
    // The transform mirrored from src/services/stocks.js and
    // src/services/candles.js. If either side ever changes, this fails.
    const unreachable = [...ALLOWED_SYMBOLS].filter(
      (s) => !isAllowedYahooSymbol(s.replace('.', '-'))
    )
    expect(unreachable).toEqual([])
  })

  it('takes the dashed class share and not the dotted one', () => {
    expect(isAllowedYahooSymbol('BRK-B')).toBe(true)
    // Yahoo's chart endpoint does not answer to BRK.B, and accepting both
    // spellings would double that symbol's edge-cache keys for nothing.
    expect(isAllowedYahooSymbol('BRK.B')).toBe(false)
  })

  it('leaves an ordinary symbol alone', () => {
    expect(isAllowedYahooSymbol('AAPL')).toBe(true)
    expect(isAllowedYahooSymbol('NVDA')).toBe(true)
  })

  it('rejects the walk-the-alphabet drain the old pattern allowed', () => {
    for (const junk of ['ZZZZ', 'A1', 'X-Y', 'QQQQQQQQQQ', '0', '---', 'aapl']) {
      expect(isAllowedYahooSymbol(junk)).toBe(false)
    }
  })

  it('rejects non-strings without throwing', () => {
    for (const bad of [undefined, null, '', 0, [], {}, ['AAPL']]) {
      expect(isAllowedYahooSymbol(bad)).toBe(false)
    }
  })
})
