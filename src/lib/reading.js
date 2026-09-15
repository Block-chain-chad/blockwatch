// The Readout's words: the gap said in dollars at a size the reader picked
// (Robinhood's crypto page does this with "how much you'd receive"; the
// stronger sentence for a spread is "what it costs you"). Pure so vitest
// can pin every sentence. No React, no services.

import { formatPct, formatPrice, formatCompact } from './format'
import { PARITY_BAND } from './prices'
import { MAX_CREDIBLE_GAP } from './board'

export const SIZES = Object.freeze([100, 1000, 10000])

export const RANGE_WORDS = Object.freeze({
  '1D': 'Past day',
  '1W': 'Past week',
  '1M': 'Past month',
  '1Y': 'Past year',
})

const RANGE_GRAIN = Object.freeze({
  '1D': 'five-minute readings today',
  '1W': 'half-hour readings this week',
  '1M': 'daily close-to-close readings this month',
  '1Y': 'daily close-to-close readings this year',
})

export function formatSize(size) {
  return `$${size.toLocaleString('en-US')}`
}

/** What the tokens cost above (positive) or below (negative) the shares, on `size` dollars of shares. */
export function gapDollars(gapPct, size) {
  if (!Number.isFinite(gapPct) || !Number.isFinite(size)) return null
  return (size * gapPct) / 100
}

/**
 * readingSentence({ ticker, companyName, gapPct, size, thin, volume24h })
 *
 * "On $1,000 of NVIDIA, NVDAx costs $0.92 more than the shares right now."
 * Inside the parity band the tokens cost the same. When the market is thin
 * or the gap is outside ±MAX_CREDIBLE_GAP the sentence refuses to price it.
 */
export function readingSentence({ ticker, companyName, gapPct, size, thin = false, volume24h = null }) {
  if (!Number.isFinite(gapPct)) return `No share price for ${ticker} yet.`
  if (thin) {
    const traded = Number.isFinite(volume24h) ? `only ${formatCompact(volume24h)} traded today` : 'almost nothing traded today'
    return `The gap on ${ticker} reads ${formatPct(gapPct)} but ${traded}; treat it as noise.`
  }
  if (Math.abs(gapPct) > MAX_CREDIBLE_GAP) {
    return `The gap on ${ticker} reads ${formatPct(gapPct)} and no real wrapper drifts that far; treat it as noise.`
  }
  const lead = `On ${formatSize(size)} of ${companyName}, ${ticker} costs`
  if (Math.abs(gapPct) < PARITY_BAND) return `${lead} the same as the shares right now.`
  const usd = gapDollars(gapPct, size)
  return `${lead} ${formatPrice(Math.abs(usd))} ${usd > 0 ? 'more' : 'less'} than the shares right now.`
}

/** The gap plus the DEX spread, both in dollars at the size; null without either number. */
export function roundTrip({ gapPct, spreadPct, size }) {
  if (!Number.isFinite(gapPct) || !Number.isFinite(spreadPct) || !Number.isFinite(size)) return null
  const gapUsd = Math.abs(gapDollars(gapPct, size))
  const spreadUsd = (size * spreadPct) / 100
  return { gapUsd, spreadUsd, total: gapUsd + spreadUsd }
}

/** Percent of `premium` readings (each { t, v }) whose |v| is below |currentPct|. */
export function gapPercentile(premium, currentPct) {
  if (!Array.isArray(premium) || premium.length === 0 || !Number.isFinite(currentPct)) return null
  const now = Math.abs(currentPct)
  const below = premium.filter((p) => Math.abs(p.v) < now).length
  return Math.round((below / premium.length) * 100)
}

/** "Wider than 71% of its half-hour readings this week." Names the grain; never a bare year. */
export function percentileCaption(range, pct) {
  if (!Number.isFinite(pct)) return ''
  const grain = RANGE_GRAIN[range] ?? RANGE_GRAIN['1W']
  return pct >= 50
    ? `Wider than ${pct}% of its ${grain}.`
    : `Narrower than ${100 - pct}% of its ${grain}.`
}
