import { describe, it, expect, vi } from 'vitest'

// The hook's services read window.location as they load.
vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const { buildPremiumSeries, gatedPremium } = await import('./useChartData')
const { mergeAssets } = await import('../lib/prices')
const { BY_ID } = await import('../data/universe')

/*
 * The gap history is held to the same rules as the live gap: no history for
 * an asset whose live gap is not shown, and no point past the plausibility
 * bound. PLx (stale, +49%) used to chart +49% on the phone's Premium history,
 * the desktop gap chart and the Readout's percentile.
 */

const NOW = Date.parse('2026-09-26T01:30:00Z')
const priced = (id, over) => ({ ...mergeAssets([BY_ID[id]], {}, {})[0], volume24h: 1e6, ...over })
const series = [
  { t: 1, v: 1.2 },
  { t: 2, v: -0.4 },
]

describe('gatedPremium', () => {
  it('passes the history through while the live gap checks out', () => {
    const nflx = priced('netflix-xstock', { tokenPrice: 71.2, stockPrice: 71.145, priceUpdatedAt: NOW - 60_000 })
    expect(gatedPremium(nflx, series, NOW)).toBe(series)
  })

  it('shows no history for a stale token price (PLx)', () => {
    const plx = priced('planet-labs-xstock', {
      tokenPrice: 25.95,
      stockPrice: 17.43,
      priceUpdatedAt: Date.parse('2026-06-26T16:57:10Z'),
    })
    expect(gatedPremium(plx, series, NOW)).toEqual([])
  })

  it('shows no history for an unverified ratio', () => {
    const bstock = Object.values(BY_ID).find((a) => a.issuer === 'bStocks' && a.underlying)
    expect(gatedPremium(priced(bstock.id, { tokenPrice: 100, stockPrice: 100, priceUpdatedAt: NOW }), series, NOW)).toEqual([])
  })
})

describe('buildPremiumSeries', () => {
  it('drops points past the plausibility bound and keeps the rest', () => {
    const token = [
      { t: 10, v: 101 }, // +1%
      { t: 20, v: 149 }, // +49%, a bad print
      { t: 30, v: 81 }, // -19%, inside the bound
      { t: 40, v: 79 }, // -21%
    ]
    const stock = [{ t: 0, v: 100 }]
    expect(buildPremiumSeries(token, stock, null).map((p) => p.t)).toEqual([10, 30])
  })
})
