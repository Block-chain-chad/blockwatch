// The Gap Board's rules, kept pure so vitest runs them under node: how live
// assets become one row per company, which wrapper leads the row, which is
// cheapest, how far apart the issuers price the same share, and what may be
// asserted. No React, no services.
//
// A company is keyed by its underlying ticker. Products with no underlying
// (NAV-based funds) have no share to compare against and are not on the
// Board; the Readout still opens them from search.

import { isThinlyTraded } from './prices'
import { gapCheck } from './gapCheck'
import { isPlausiblePct } from './format'
import { isStockDelayed } from './provenance'

/**
 * Past this the number is a stale print, not a mispricing (Screener's rule).
 *
 * Left at 25 deliberately, and worth revisiting once rather than drifting.
 * Six xStocks carry an issuer ratio of 2x or more — NFLXx and PPLTx at 10,
 * PALLx at 5, CRWDx at 4, TQQQx at 2.0090, AZNx at 0.5111 — and any surface
 * that priced them per BASE token instead of per share produced gaps of -90%
 * to +96%, which this threshold quietly swallowed as "not credible". That was
 * masking a unit bug rather than catching a stale print.
 *
 * The unit bug is now fixed at its sources: services/candles.js converts pool
 * candles, services/jupiter.js converts quote-derived bid and ask, and the
 * CoinGecko feed that actually drives premiumPct was already per share (see
 * hooks/useChartData.js for the measurement). So this threshold is no longer
 * load-bearing for those six names, and their gaps should now sit in single
 * digits like everything else.
 *
 * Nothing here changes in this round: the threshold still earns its keep
 * against genuinely stale quotes on thin wrappers, and lowering it is a
 * product judgement about how much of the tail to hide, not a bug fix.
 */
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

/** A wrapper's gap size for sorting; one with no gap sorts last. */
const absGap = (w) => (w.gap == null ? -1 : Math.abs(w.gap))

/**
 * groupCompanies(assets, { lens, sort, credibleOnly, watchlistIds })
 *
 * One row per underlying, wrappers sorted widest-first inside it. A wrapper
 * is `muted` when its market is thin, its gap is outside ±MAX_CREDIBLE_GAP, or
 * lib/gapCheck.js will not vouch for its gap at all (then `gap` is null and
 * `status` says why).
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
    // A wrapper whose gap cannot be vouched for (lib/gapCheck.js) is still
    // listed, with its status instead of a number, and never counts toward
    // the row's lead, cheapest or spread, whatever credibleOnly says.
    const check = gapCheck(asset)
    if (check.status === 'pending' || check.status === 'none') continue
    const ok = check.status === 'ok'
    const gap = ok ? check.gap : null
    const muted = !ok || isThinlyTraded(asset) || !isPlausiblePct(gap, MAX_CREDIBLE_GAP)
    const wrapper = {
      asset,
      gap,
      status: check.status,
      // In share units, so a token that tracks ten shares is not "$640 above".
      diffUsd: ok ? check.tokenPerShare - asset.stockPrice : null,
      muted,
      cheapest: false,
    }
    if (!byUnderlying.has(asset.underlying)) byUnderlying.set(asset.underlying, [])
    byUnderlying.get(asset.underlying).push(wrapper)
  }

  const rows = []
  for (const [underlying, wrappers] of byUnderlying) {
    wrappers.sort((a, b) => absGap(b) - absGap(a))
    const counted = wrappers.filter((w) => w.gap != null && (!credibleOnly || !w.muted))
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
    if (a.muted && b.muted) return absGap(b.wrappers[0]) - absGap(a.wrappers[0])
    return cmp(a, b)
  })
}

/**
 * Finnhub's shared 60/min cannot quote 459 underlyings. The Board asks for
 * a bounded set, in this order: the watchlist, every wrapper of every
 * company with more than one wrapper (the issuer spread is the Board's
 * reason to exist), then single-wrapper companies by static volume. The
 * cap counts distinct UNDERLYINGS, because that is what a quote costs;
 * every wrapper of a chosen company comes along.
 */
export const CANDIDATE_CAP = 150

export function boundCandidates(staticAssets, { watchlistIds = [], cap = CANDIDATE_CAP } = {}) {
  const byUnder = new Map()
  for (const a of staticAssets ?? []) {
    if (!a.underlying) continue
    if (!byUnder.has(a.underlying)) byUnder.set(a.underlying, [])
    byUnder.get(a.underlying).push(a)
  }
  const chosen = new Set()
  const ids = []
  const take = (underlying) => {
    if (chosen.has(underlying) || chosen.size >= cap) return
    chosen.add(underlying)
    for (const a of byUnder.get(underlying) ?? []) ids.push(a.id)
  }
  const byId = new Map((staticAssets ?? []).map((a) => [a.id, a]))
  for (const id of watchlistIds) {
    const a = byId.get(id)
    if (a?.underlying) take(a.underlying)
  }
  for (const [u, list] of byUnder) if (list.length > 1) take(u)
  const rest = [...byUnder.entries()]
    .filter(([u]) => !chosen.has(u))
    .sort(([, a], [, b]) => (b[0].vol ?? 0) - (a[0].vol ?? 0))
  for (const [u] of rest) take(u)
  return ids
}

/**
 * The quote set for the lens on screen. Under All and Watching it is
 * boundCandidates as is. Under a type lens the cap is spent on that type
 * first: the one bond with a listed share (USFRon, $56k a day) ranked below
 * the 150-underlying cap on the whole universe, so its share was never
 * quoted and the Bonds lens sat on "still loading" for good.
 */
export function lensCandidates(staticAssets, lens, { watchlistIds = [], cap = CANDIDATE_CAP } = {}) {
  if (lens === 'all' || lens === 'watching') return boundCandidates(staticAssets, { watchlistIds, cap })
  const inLens = (staticAssets ?? []).filter((a) => a.type === lens)
  return boundCandidates(inLens, { watchlistIds, cap })
}

/** True when nothing under this lens has a listed share, so no gap can ever rank. */
export function lensHasNoShares(staticAssets, lens) {
  if (lens === 'all' || lens === 'watching') return false
  return !(staticAssets ?? []).some((a) => a.type === lens && a.underlying)
}

/**
 * Sort order is frozen once every company has arrived: the 50-quote rotor
 * refreshes rows in place and must never reorder the Board under the
 * reader. While companies are still arriving (a key not in `prevKeys`) the
 * fresh order stands, so the first paint is never a junk order.
 */
export function freezeOrder(prevKeys, companies) {
  const fresh = { companies, keys: companies.map((c) => c.key) }
  if (!prevKeys || prevKeys.length === 0) return fresh
  const byKey = new Map(companies.map((c) => [c.key, c]))
  if (companies.some((c) => !prevKeys.includes(c.key))) return fresh
  const kept = prevKeys.filter((k) => byKey.has(k))
  return { companies: kept.map((k) => byKey.get(k)), keys: kept }
}

export const COMPANY_ROW_H = 56
export const WRAPPER_ROW_H = 40

/** The Board's rows in order: each company, and under the expanded one its wrappers. */
export function flattenRows(companies, expandedKey) {
  const out = []
  for (const company of companies) {
    out.push({ type: 'company', key: company.key, height: COMPANY_ROW_H, company })
    if (company.key !== expandedKey) continue
    for (const wrapper of company.wrappers) {
      out.push({
        type: 'wrapper',
        key: `${company.key}/${wrapper.asset.id}`,
        height: WRAPPER_ROW_H,
        company,
        wrapper,
      })
    }
  }
  return out
}

/**
 * Which rows to render for a scroll position: the first index at or above
 * the viewport top, the index past the viewport bottom, each padded by
 * `overscan` rows, plus the spacer heights that keep the scrollbar honest.
 */
export function visibleWindow(heights, scrollTop, viewportHeight, overscan = 6) {
  const n = heights.length
  if (n === 0) return { start: 0, end: 0, top: 0, bottom: 0 }
  let y = 0
  let start = 0
  while (start < n && y + heights[start] <= scrollTop) {
    y += heights[start]
    start++
  }
  let end = start
  let seen = y
  while (end < n && seen < scrollTop + viewportHeight) {
    seen += heights[end]
    end++
  }
  start = Math.max(0, start - overscan)
  end = Math.min(n, end + overscan)
  let top = 0
  for (let i = 0; i < start; i++) top += heights[i]
  let bottom = 0
  for (let i = end; i < n; i++) bottom += heights[i]
  return { start, end, top, bottom }
}

/**
 * Two numbers about the board's share quotes: the age in seconds of the
 * OLDEST DATED one, and how many rows carry no timestamp at all.
 *
 * It used to be one number that went null the moment any single row was
 * undated. That sounds strict and reads as nothing: a quote with
 * basis 'prevClose' always has asOf null, so on a 150-company board the
 * header said "share leg stale, refreshing" all session, every session. A
 * badge that is always on is a badge nobody reads, and it hid the real thing
 * it was meant to warn about.
 *
 * So the two facts are kept apart. The age speaks for the worst DATED row,
 * which is a true statement about the quotes we can actually date, and the
 * count says plainly how many rows it does not cover. Neither one pretends to
 * be the other.
 */
export function quoteAges(companies, now) {
  let oldest = null
  let undated = 0
  for (const c of companies) {
    const at = c.logoAsset?.stockQuote?.asOf
    if (!Number.isFinite(at)) {
      undated += 1
      continue
    }
    const age = (now - at) / 1000
    if (oldest == null || age > oldest) oldest = age
  }
  return { oldest, undated }
}

/**
 * The control strip's honesty count: how many companies, what the share leg is
 * right now, and how many rows the freshness claim does not cover.
 *
 * The undated count is appended in the regular session only. That is the one
 * session where the line makes a claim about liveness for the count to
 * qualify; outside it every quote is a close by definition and the number
 * would just be noise on the strip all night.
 */
export function headerLine({ count, session, stockAgeSeconds, undatedCount = 0 }) {
  const noun = count === 1 ? 'company' : 'companies'
  const head = `${count} ${noun}`
  if (session === 'regular') {
    const leg = isStockDelayed(session, stockAgeSeconds)
      ? 'share leg stale, refreshing'
      : 'share leg live'
    const undated = undatedCount > 0 ? ` · ${undatedCount} undated` : ''
    return `${head} · ${leg}${undated}`
  }
  // "4pm close" was a lie on the eight 1pm days a year the calendar now knows
  // about (lib/market.js), so the strip names the close without timing it.
  if (session === 'post') return `${head} · share legs at today’s close, after hours`
  if (session === 'pre') return `${head} · share legs at last close, pre-market`
  return `${head} · share legs at last close`
}
