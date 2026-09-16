import { describe, it, expect } from 'vitest'
import {
  groupCompanies, BOARD_SORTS, BOARD_LENSES, MAX_CREDIBLE_GAP,
  boundCandidates, CANDIDATE_CAP, freezeOrder, flattenRows, visibleWindow, headerLine,
  quoteAges,
  COMPANY_ROW_H, WRAPPER_ROW_H,
} from './board'

const A = (over) => ({
  id: over.id,
  ticker: over.ticker,
  name: over.name ?? 'Co',
  underlying: over.underlying ?? null,
  type: over.type ?? 'stock',
  issuer: over.issuer ?? 'xStocks',
  tokenPrice: over.tokenPrice ?? null,
  stockPrice: over.stockPrice ?? null,
  volume24h: over.volume24h ?? 1_000_000,
})

const NVDAX = A({ id: 'nvdax', ticker: 'NVDAx', name: 'NVIDIA', underlying: 'NVDA', tokenPrice: 218.49, stockPrice: 218.29 })
const NVDAON = A({ id: 'nvdaon', ticker: 'NVDAon', name: 'NVIDIA', underlying: 'NVDA', issuer: 'Ondo', tokenPrice: 218.4, stockPrice: 218.29 })
const NVDAB = A({ id: 'nvdab', ticker: 'NVDAb', name: 'NVIDIA', underlying: 'NVDA', issuer: 'bStocks', tokenPrice: 218.55, stockPrice: 218.29 })
const TSLAX = A({ id: 'tslax', ticker: 'TSLAx', name: 'Tesla', underlying: 'TSLA', tokenPrice: 366.72, stockPrice: 365.44 })
const HOODX = A({ id: 'hoodx', ticker: 'HOODx', name: 'Robinhood', underlying: 'HOOD', tokenPrice: 118.03, stockPrice: 118.4 })
const SPYX = A({ id: 'spyx', ticker: 'SPYx', name: 'SPDR S&P 500', underlying: 'SPY', type: 'etf', tokenPrice: 766.73, stockPrice: 764.29 })
const NAV = A({ id: 'tbill', ticker: 'TBILL', name: 'T-bill fund', tokenPrice: 1.0 })
const THIN = A({ id: 'wmkt', ticker: 'WMKTx', name: 'Walmart', underlying: 'WMT', tokenPrice: 50, stockPrice: 100, volume24h: 1_000 })
const NOQUOTE = A({ id: 'aaplx', ticker: 'AAPLx', name: 'Apple', underlying: 'AAPL', tokenPrice: 332.27 })

const ALL = [NVDAX, NVDAON, NVDAB, TSLAX, HOODX, SPYX, NAV, THIN, NOQUOTE]

describe('groupCompanies', () => {
  it('makes one row per underlying, and none for NAV products or unquoted shares', () => {
    const rows = groupCompanies(ALL)
    expect(rows.map((r) => r.underlying)).toEqual(['TSLA', 'SPY', 'HOOD', 'NVDA', 'WMT'])
    expect(rows.find((r) => r.underlying === 'AAPL')).toBeUndefined()
  })

  it('reads the widest wrapper as the lead and names the cheapest', () => {
    const nvda = groupCompanies(ALL).find((r) => r.underlying === 'NVDA')
    expect(nvda.wrappers.map((w) => w.asset.ticker)).toEqual(['NVDAb', 'NVDAx', 'NVDAon'])
    expect(nvda.leadAsset.ticker).toBe('NVDAb')
    expect(nvda.lead).toBeCloseTo(0.119, 3)
    expect(nvda.cheapestAsset.ticker).toBe('NVDAon')
    expect(nvda.wrappers.find((w) => w.cheapest).asset.ticker).toBe('NVDAon')
    expect(nvda.spreadBp).toBe(7)
  })

  it('has no cheapest and no spread for a single wrapper', () => {
    const tsla = groupCompanies(ALL).find((r) => r.underlying === 'TSLA')
    expect(tsla.cheapestAsset).toBeNull()
    expect(tsla.spreadBp).toBeNull()
    expect(tsla.wrappers).toHaveLength(1)
  })

  it('prices the gap in dollars per wrapper', () => {
    const nvda = groupCompanies(ALL).find((r) => r.underlying === 'NVDA')
    const x = nvda.wrappers.find((w) => w.asset.ticker === 'NVDAx')
    expect(x.diffUsd).toBeCloseTo(0.2, 6)
  })

  it('mutes thin and implausible wrappers and sinks them below credible rows', () => {
    const rows = groupCompanies(ALL)
    const wmt = rows[rows.length - 1]
    expect(wmt.underlying).toBe('WMT')
    expect(wmt.muted).toBe(true)
    expect(wmt.wrappers[0].muted).toBe(true)
    expect(MAX_CREDIBLE_GAP).toBe(25)
  })

  it('with credibleOnly off, a muted wrapper still counts toward the lead', () => {
    const rows = groupCompanies(ALL, { credibleOnly: false })
    expect(rows[0].underlying).toBe('WMT')
    expect(rows[0].muted).toBe(false)
  })

  it('sorts by each BOARD_SORTS id', () => {
    const by = (sort) => groupCompanies(ALL, { sort }).map((r) => r.underlying)
    expect(by('widest')).toEqual(['TSLA', 'SPY', 'HOOD', 'NVDA', 'WMT'])
    expect(by('premium')).toEqual(['TSLA', 'SPY', 'NVDA', 'HOOD', 'WMT'])
    expect(by('discount')).toEqual(['HOOD', 'NVDA', 'SPY', 'TSLA', 'WMT'])
    expect(BOARD_SORTS.map((s) => s.id)).toEqual(['widest', 'premium', 'discount', 'traded'])
  })

  it('ranks by summed token volume under traded', () => {
    const rows = groupCompanies(ALL, { sort: 'traded' })
    expect(rows[0].underlying).toBe('NVDA')
    expect(rows[0].volume24h).toBe(3_000_000)
  })

  it('under discount and premium the lead is the extreme in that direction', () => {
    const nvda = groupCompanies(ALL, { sort: 'discount' }).find((r) => r.underlying === 'NVDA')
    expect(nvda.leadAsset.ticker).toBe('NVDAon')
    const nvda2 = groupCompanies(ALL, { sort: 'premium' }).find((r) => r.underlying === 'NVDA')
    expect(nvda2.leadAsset.ticker).toBe('NVDAb')
  })

  it('filters by lens: type chips and the Watching lens', () => {
    expect(groupCompanies(ALL, { lens: 'etf' }).map((r) => r.underlying)).toEqual(['SPY'])
    expect(groupCompanies(ALL, { lens: 'stock' }).map((r) => r.underlying)).not.toContain('SPY')
    const watching = groupCompanies(ALL, { lens: 'watching', watchlistIds: ['hoodx', 'nvdaon'] })
    expect(watching.map((r) => r.underlying)).toEqual(['HOOD', 'NVDA'])
    expect(watching.find((r) => r.underlying === 'NVDA').wrappers).toHaveLength(1)
    expect(BOARD_LENSES.map((l) => l.id)).toEqual(['all', 'stock', 'etf', 'bond', 'watching'])
  })

  it('keys each row by its underlying so order can be frozen', () => {
    expect(groupCompanies(ALL).map((r) => r.key)).toEqual(['TSLA', 'SPY', 'HOOD', 'NVDA', 'WMT'])
  })
})

const S = (id, underlying, vol, extra = {}) => ({ id, ticker: id.toUpperCase(), underlying, vol, ...extra })

describe('boundCandidates', () => {
  const universe = [
    S('a1', 'A', 10), S('a2', 'A', 5),         // two wrappers of A
    S('b1', 'B', 1_000),                      // one wrapper, big volume
    S('c1', 'C', 1), S('c2', 'C', 1),         // two wrappers of C
    S('d1', 'D', 500),
    S('nav', null, 9_999),                    // no underlying: never a candidate
  ]

  it('takes the watchlist first, then every wrapper of multi-wrapper companies, then by volume', () => {
    const ids = boundCandidates(universe, { watchlistIds: ['d1'], cap: 10 })
    expect(ids.slice(0, 1)).toEqual(['d1'])
    expect(ids).toEqual(expect.arrayContaining(['a1', 'a2', 'c1', 'c2', 'b1']))
    expect(ids).not.toContain('nav')
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('caps by distinct underlying and keeps every wrapper of a chosen company', () => {
    const ids = boundCandidates(universe, { watchlistIds: [], cap: 2 })
    const unders = new Set(ids.map((id) => universe.find((a) => a.id === id).underlying))
    expect(unders.size).toBe(2)
    expect(unders.has('A')).toBe(true)
    expect(unders.has('C')).toBe(true)
    expect(ids).toEqual(expect.arrayContaining(['a1', 'a2', 'c1', 'c2']))
    expect(CANDIDATE_CAP).toBe(150)
  })
})

describe('freezeOrder', () => {
  const rows = (keys) => keys.map((key) => ({ key }))

  it('keeps the previous order when the same companies come back in a new order', () => {
    const r = freezeOrder(['NVDA', 'TSLA', 'SPY'], rows(['TSLA', 'SPY', 'NVDA']))
    expect(r.companies.map((c) => c.key)).toEqual(['NVDA', 'TSLA', 'SPY'])
    expect(r.keys).toEqual(['NVDA', 'TSLA', 'SPY'])
  })

  it('drops companies that are gone', () => {
    const r = freezeOrder(['NVDA', 'TSLA', 'SPY'], rows(['SPY', 'NVDA']))
    expect(r.companies.map((c) => c.key)).toEqual(['NVDA', 'SPY'])
    expect(r.keys).toEqual(['NVDA', 'SPY'])
  })

  it('re-sorts freely while new companies are still arriving', () => {
    const r = freezeOrder(['NVDA'], rows(['TSLA', 'NVDA']))
    expect(r.companies.map((c) => c.key)).toEqual(['TSLA', 'NVDA'])
    expect(r.keys).toEqual(['TSLA', 'NVDA'])
  })

  it('takes the fresh order with no previous keys', () => {
    const r = freezeOrder([], rows(['B', 'A']))
    expect(r.keys).toEqual(['B', 'A'])
  })
})

describe('flattenRows / visibleWindow', () => {
  const company = (key, n) => ({
    key,
    wrappers: Array.from({ length: n }, (_, i) => ({ asset: { id: `${key}${i}` } })),
  })

  it('flattens companies and expands one', () => {
    const rows = flattenRows([company('A', 2), company('B', 1)], 'A')
    expect(rows.map((r) => r.type)).toEqual(['company', 'wrapper', 'wrapper', 'company'])
    expect(rows.map((r) => r.key)).toEqual(['A', 'A/A0', 'A/A1', 'B'])
    expect(rows.map((r) => r.height)).toEqual([COMPANY_ROW_H, WRAPPER_ROW_H, WRAPPER_ROW_H, COMPANY_ROW_H])
    expect(rows[1].wrapper.asset.id).toBe('A0')
    expect(rows[1].company.key).toBe('A')
  })

  it('windows rows to the viewport with overscan and spacer heights', () => {
    const heights = Array(100).fill(56)
    const w = visibleWindow(heights, 560, 280, 2)
    expect(w.start).toBe(8)
    expect(w.end).toBe(17)
    expect(w.top).toBe(8 * 56)
    expect(w.bottom).toBe((100 - 17) * 56)
  })

  it('never windows past the ends', () => {
    const heights = [56, 40, 40, 56]
    expect(visibleWindow(heights, 0, 1000, 6)).toEqual({ start: 0, end: 4, top: 0, bottom: 0 })
    expect(visibleWindow([], 0, 100, 6)).toEqual({ start: 0, end: 0, top: 0, bottom: 0 })
  })
})

describe('headerLine', () => {
  it('says the share leg state in the session\'s words', () => {
    expect(headerLine({ count: 459, session: 'closed', stockAgeSeconds: 9000 })).toBe(
      '459 companies · share legs at last close'
    )
    expect(headerLine({ count: 12, session: 'regular', stockAgeSeconds: 12 })).toBe(
      '12 companies · share leg live'
    )
    expect(headerLine({ count: 12, session: 'regular', stockAgeSeconds: 900 })).toBe(
      '12 companies · share leg stale, refreshing'
    )
    // Not "4pm close": the calendar knows about the 1pm days, so the strip
    // names the close without timing it.
    expect(headerLine({ count: 3, session: 'post', stockAgeSeconds: 12 })).toBe(
      '3 companies · share legs at today’s close, after hours'
    )
    expect(headerLine({ count: 1, session: 'pre', stockAgeSeconds: 12 })).toBe(
      '1 company · share legs at last close, pre-market'
    )
  })

  it('counts the rows the freshness claim does not cover', () => {
    // The old line collapsed to 'stale, refreshing' whenever ANY row was
    // undated, which on a real board is always, so the warning stopped
    // meaning anything. The age now speaks for the dated rows and the count
    // speaks for the rest.
    expect(
      headerLine({ count: 150, session: 'regular', stockAgeSeconds: 12, undatedCount: 3 })
    ).toBe('150 companies · share leg live · 3 undated')
    expect(
      headerLine({ count: 150, session: 'regular', stockAgeSeconds: 900, undatedCount: 3 })
    ).toBe('150 companies · share leg stale, refreshing · 3 undated')
  })

  it('says nothing about undated rows when there are none', () => {
    expect(headerLine({ count: 12, session: 'regular', stockAgeSeconds: 12, undatedCount: 0 })).toBe(
      '12 companies · share leg live'
    )
  })

  it('leaves the closed-session line alone', () => {
    // Outside the regular session every quote is a close, so the count would
    // read '150 undated' all night and qualify a claim nobody made.
    expect(
      headerLine({ count: 150, session: 'closed', stockAgeSeconds: null, undatedCount: 150 })
    ).toBe('150 companies · share legs at last close')
  })
})

describe('quoteAges', () => {
  const now = 1_000_000_000_000
  const co = (asOf) => ({ logoAsset: { stockQuote: asOf == null ? null : { asOf } } })

  it('reports the worst DATED row, not the best', () => {
    expect(quoteAges([co(now - 5_000), co(now - 300_000), co(now - 60_000)], now)).toEqual({
      oldest: 300,
      undated: 0,
    })
  })

  it('keeps speaking for the dated rows when some rows are undated', () => {
    // A prevClose quote always has asOf null, so on a 150-company board this
    // used to return null and the strip warned about staleness all session.
    expect(quoteAges([co(now - 5_000), co(null), { logoAsset: null }], now)).toEqual({
      oldest: 5,
      undated: 2,
    })
  })

  it('has no age to give when nothing is dated', () => {
    expect(quoteAges([co(null), co(null)], now)).toEqual({ oldest: null, undated: 2 })
    expect(quoteAges([], now)).toEqual({ oldest: null, undated: 0 })
  })
})
