import { describe, it, expect } from 'vitest'
import { searchScore, popularPick, rankAssets } from './search'
import { THIN_VOLUME_USD } from './prices'

const LIQUID = THIN_VOLUME_USD * 10
const THIN = THIN_VOLUME_USD / 10

const asset = (over) => ({
  id: over.ticker.toLowerCase(),
  name: 'Some Company',
  issuer: 'xStocks',
  underlying: null,
  volume24h: LIQUID,
  ...over,
})

const MU = asset({ ticker: 'MUx', name: 'Micron Technology', underlying: 'MU' })
const MUOND = asset({ id: 'mu-ondo', ticker: 'MUon', name: 'Micron Technology', underlying: 'MU', issuer: 'Ondo' })
const MSTR = asset({ ticker: 'MSTRx', name: 'MicroStrategy', underlying: 'MSTR' })
const AMD = asset({ ticker: 'AMDx', name: 'Advanced Micro Devices', underlying: 'AMD' })
const SAMU = asset({ ticker: 'SAMUx', name: 'Samu Holdings', underlying: 'SAMU' })
const TBILL = asset({ ticker: 'USTBL', name: 'Treasury Bill Fund', underlying: null })

describe('searchScore', () => {
  it('ranks exact ticker or underlying above everything', () => {
    expect(searchScore(MU, 'mux')).toBe(5)
    expect(searchScore(MU, 'mu')).toBe(5)
  })

  it('then ticker/underlying prefix, then name prefix', () => {
    expect(searchScore(MSTR, 'ms')).toBe(4)
    expect(searchScore(AMD, 'adv')).toBe(3)
  })

  it('then ticker substring, then name substring, else 0', () => {
    expect(searchScore(SAMU, 'amu')).toBe(2)
    expect(searchScore(AMD, 'micro')).toBe(1)
    expect(searchScore(AMD, 'zzz')).toBe(0)
  })

  it('tolerates a missing underlying', () => {
    expect(searchScore(TBILL, 'ustbl')).toBe(5)
    expect(searchScore(TBILL, 'bill')).toBe(1)
  })
})

describe('popularPick', () => {
  it('prefers a liquid xStocks listing', () => {
    expect(popularPick([MUOND, MU], 'MU')).toBe(MU)
  })

  it('falls back to any liquid version, then anything', () => {
    const thinX = asset({ ticker: 'MUx', underlying: 'MU', volume24h: THIN })
    expect(popularPick([thinX, MUOND], 'MU')).toBe(MUOND)
    const thinOnly = asset({ ticker: 'MUx', underlying: 'MU', volume24h: null })
    expect(popularPick([thinOnly], 'MU')).toBe(thinOnly)
  })

  it('is undefined when nothing tokenizes the underlying', () => {
    expect(popularPick([MU, AMD], 'TSLA')).toBeUndefined()
  })
})

describe('rankAssets', () => {
  const universe = [AMD, MSTR, SAMU, MU, MUOND, TBILL]

  it('returns matches best first, stable within a score', () => {
    // "mu": MUx and MUon exact on underlying (5), SAMUx substring (2),
    // MSTRx no (ticker "mstrx" has no "mu"), AMD name "...Micro..." no "mu".
    expect(rankAssets(universe, 'mu').map((a) => a.ticker)).toEqual(['MUx', 'MUon', 'SAMUx'])
  })

  it('normalises the query and drops non-matches', () => {
    expect(rankAssets(universe, '  AMD ')).toEqual([AMD])
    expect(rankAssets(universe, 'nothing-here')).toEqual([])
  })

  it('matches nothing for a blank query', () => {
    expect(rankAssets(universe, '')).toEqual([])
    expect(rankAssets(universe, '   ')).toEqual([])
    expect(rankAssets(universe, undefined)).toEqual([])
  })

  it('agrees with searchScore ordering on every result', () => {
    const q = 'm'
    const scores = rankAssets(universe, q).map((a) => searchScore(a, q))
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i - 1])
  })
})
