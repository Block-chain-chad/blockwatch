// The Gap Board's rules, kept pure so vitest runs them under node: how live
// assets become one row per company, which wrapper leads the row, which is
// cheapest, how far apart the issuers price the same share, and what may be
// asserted. No React, no services.
//
// A company is keyed by its underlying ticker. Products with no underlying
// (NAV-based funds) have no share to compare against and are not on the
// Board; the Readout still opens them from search.

import { premiumPct, isThinlyTraded } from './prices'
import { isPlausiblePct } from './format'

/** Past this the number is a stale print, not a mispricing (Screener's rule). */
export const MAX_CREDIBLE_GAP = 25

export const BOARD_SORTS = Object.freeze([
  { id: 'widest', label: 'Widest gap', hint: 'Furthest from the share price, either direction' },
  { id: 'premium', label: 'Most expensive', hint: 'Token costs the most above its share' },
  { id: 'discount', label: 'Cheapest', hint: 'Token costs the least against its share' },
  { id: 'traded', label: 'Most traded', hint: 'Most token volume in 24 hours, all wrappers' },
])

export const BOARD_LENSES = Object.freeze([
  { id: 'all', label: 'All' },
  { id: 'stock', label: 'Stocks' },
  { id: 'etf', label: 'ETFs' },
  { id: 'bond', label: 'Bonds' },
  { id: 'watching', label: 'Watching' },
])

function inLens(asset, lens, watchlistIds) {
  if (lens === 'all') return true
  if (lens === 'watching') return watchlistIds.includes(asset.id)
  return asset.type === lens
}

/** The wrapper whose gap is the extreme the sort asks for. */
function pickLead(wrappers, sort) {
  if (wrappers.length === 0) return null
  const by = {
    premium: (a, b) => b.gap - a.gap,
    discount: (a, b) => a.gap - b.gap,
  }[sort] ?? ((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
  return [...wrappers].sort(by)[0]
}

/**
 * groupCompanies(assets, { lens, sort, credibleOnly, watchlistIds })
 *
 * One row per underlying, wrappers sorted widest-first inside it. A wrapper
 * is `muted` when its market is thin or its gap is outside ±MAX_CREDIBLE_GAP.
 * With `credibleOnly` (the default) muted wrappers are shown but do not
 * decide the row's lead, cheapest or spread; a row with no credible wrapper
 * is itself muted and sorts after every credible row. With it off, every
 * wrapper counts.
 */
export function groupCompanies(
  assets,
  { lens = 'all', sort = 'widest', credibleOnly = true, watchlistIds = [] } = {}
) {
  const byUnderlying = new Map()
  for (const asset of assets ?? []) {
    if (!asset.underlying) continue
    if (!inLens(asset, lens, watchlistIds)) continue
    const gap = premiumPct(asset)
    if (gap == null) continue
    const muted = isThinlyTraded(asset) || !isPlausiblePct(gap, MAX_CREDIBLE_GAP)
    const wrapper = {
      asset,
      gap,
      diffUsd: asset.tokenPrice - asset.stockPrice,
      muted,
      cheapest: false,
    }
    if (!byUnderlying.has(asset.underlying)) byUnderlying.set(asset.underlying, [])
    byUnderlying.get(asset.underlying).push(wrapper)
  }

  const rows = []
  for (const [underlying, wrappers] of byUnderlying) {
    wrappers.sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))
    const counted = credibleOnly ? wrappers.filter((w) => !w.muted) : wrappers
    const lead = pickLead(counted, sort)
    let cheapest = null
    let spreadBp = null
    if (counted.length > 1) {
      cheapest = counted.reduce((m, w) => (w.gap < m.gap ? w : m))
      cheapest.cheapest = true
      const gaps = counted.map((w) => w.gap)
      spreadBp = Math.round((Math.max(...gaps) - Math.min(...gaps)) * 100)
    }
    rows.push({
      key: underlying,
      underlying,
      name: wrappers[0].asset.name,
      logoAsset: wrappers[0].asset,
      wrappers,
      lead: lead ? lead.gap : null,
      leadAsset: lead ? lead.asset : null,
      cheapestAsset: cheapest ? cheapest.asset : null,
      spreadBp,
      muted: lead == null,
      volume24h: wrappers.reduce((s, w) => s + (w.asset.volume24h ?? 0), 0),
    })
  }

  const cmp = {
    widest: (a, b) => Math.abs(b.lead) - Math.abs(a.lead),
    premium: (a, b) => b.lead - a.lead,
    discount: (a, b) => a.lead - b.lead,
    traded: (a, b) => b.volume24h - a.volume24h,
  }[sort] ?? ((a, b) => Math.abs(b.lead) - Math.abs(a.lead))

  return rows.sort((a, b) => {
    if (a.muted !== b.muted) return a.muted ? 1 : -1
    if (a.muted && b.muted) return Math.abs(b.wrappers[0].gap) - Math.abs(a.wrappers[0].gap)
    return cmp(a, b)
  })
}
