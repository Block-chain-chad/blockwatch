import { describe, it, expect } from 'vitest'
import { groupCompanies, BOARD_SORTS, BOARD_LENSES, MAX_CREDIBLE_GAP } from './board'

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
