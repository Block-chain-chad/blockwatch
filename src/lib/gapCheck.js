// Can this asset's gap be shown, and if so, what is it?
//
// User-facing words: "Ratio unverified" and "Gap not confirmed" (status
// 'price-check-failed' below).
//
// The gap compares one token with one share, so it is only a gap when three
// things hold, and this file is the one place that checks them:
//
//   1. The ratio is verified. A token does not always track one share. Ondo
//      tokens track share price times a multiplier (10 on NFLXon after the
//      10-for-1 split), and xStocks prices arrive already per share only
//      because the feeds apply the issuer's pinned multiplier. Without a
//      verified ratio the "gap" is a units error, not a price: on 2026-09-26
//      that produced +900% on NFLXon, KLACon and PPLTon, +401% on CVNAon and
//      +302% on CRWDon. So an unverified ratio shows "Ratio unverified".
//
//   2. The token price is current. CoinGecko keeps quoting a token that has
//      stopped trading: PLx was still 25.95 on 2026-09-26, last updated three
//      months earlier, against a 17.43 share (+49%). A price older than a day,
//      or with no time on it at all, is not shown as a gap.
//
//   3. The result is plausible. Measured on 2026-09-26 across 164 verified,
//      fresh tokens trading at least $50k a day, the widest gap was 2.1% (99th
//      percentile 1.9%); including thin tokens the 99th percentile was 5.6%.
//      The errors this guards against are ratio errors, and the smallest
//      corporate action (a 3-for-2 split) is a 50% jump. A bound of 20% sits
//      between the two, so anything wider is not confirmed as a gap. It is also the bound Home's "Widest gap" already used.
//
// Pure: data in, verdict out.

import { verifiedToken } from '../data/verifiedMints'
import { ondoSharesPerToken } from '../data/verifiedOndo'

/** Wider than this, the gap is not confirmed. Percent. */
export const MAX_PLAUSIBLE_GAP_PCT = 20

/** A token price older than this is not current. */
export const TOKEN_PRICE_MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * How far the live Jupiter price may sit from CoinGecko's before it is
 * ignored, as a fraction. Jupiter prices a token from its on-chain pools, and
 * a nearly empty pool quotes nonsense: on 2026-09-26 ADBEx came back at 449.94
 * from $1 of liquidity against a 235.47 share, ASTSx at 187.36 ($120) against
 * 61.81, and AMDx at 518.69 against 630.63, which is the "-17.75%" the header
 * named. CoinGecko, which aggregates the exchanges, had all three within 2%
 * of the share. Where both sources were healthy they agreed within half a
 * percent (NFLXx 71.29 against 70.97), so 5% leaves room for CoinGecko's few
 * minutes of lag and refuses every bad print seen.
 */
export const LIVE_FEED_AGREEMENT = 0.05

/** Take a live price only when a second source agrees with it. */
export function liveAgrees(livePrice, feedPrice) {
  if (!(livePrice > 0) || !(feedPrice > 0)) return false
  return Math.abs(livePrice / feedPrice - 1) <= LIVE_FEED_AGREEMENT
}

/** A timestamp (ms) no older than TOKEN_PRICE_MAX_AGE_MS. Missing is not fresh. */
export function isFresh(ts, now = Date.now()) {
  return Number.isFinite(ts) && now - ts <= TOKEN_PRICE_MAX_AGE_MS
}

/**
 * May a live Jupiter price replace this CoinGecko row's? Only when CoinGecko
 * agrees with it AND CoinGecko's own price is current. Agreement with a stale
 * price proves nothing: a thin pool echoing PLx's three-month-old 25.95 must
 * not stamp that number fresh. `row.feedUpdatedAt` is CoinGecko's own time and
 * is never moved by a live tick.
 */
export function acceptLive(livePrice, row, now = Date.now()) {
  return liveAgrees(livePrice, row?.feedPrice) && isFresh(row?.feedUpdatedAt, now)
}

/** The copy for each verdict that is not a gap. */
export const GAP_STATUS_LABEL = Object.freeze({
  'ratio-unverified': 'Ratio unverified',
  'price-check-failed': 'Gap not confirmed',
})

/**
 * How many shares one token tracks, from a verified source, or null.
 *   xStocks: 1, because CoinGecko and Jupiter already quote per share (they
 *     apply the issuer's multiplier); only for mints pinned in
 *     data/verifiedMints.json.
 *   Ondo: the sValue pinned from the issuer's oracle (data/verifiedOndo.json).
 *   Anyone else: null. Nobody has verified how their tokens map to shares.
 */
export function sharesPerToken(asset) {
  if (asset?.issuer === 'xStocks') return verifiedToken(asset) ? 1 : null
  if (asset?.issuer === 'Ondo') return ondoSharesPerToken(asset)
  return null
}

/**
 * The verdict for one merged asset (one that has been through mergeAssets,
 * which sets `sharesPerToken`):
 *   { status: 'ok', gap, tokenPerShare }       show the gap
 *   { status: 'ratio-unverified' }             say so, never a number
 *   { status: 'price-check-failed' }           "Gap not confirmed", never a number
 *   { status: 'pending' }                      a price, or its time, has not arrived yet
 *   { status: 'none' }                         nothing to compare (NAV funds)
 * tokenPerShare is the token's price in share units, for money differences.
 */
export function gapCheck(asset, now = Date.now()) {
  if (!asset?.underlying) return { status: 'none' }
  // Set once per asset by mergeAssets (lib/prices.js) from sharesPerToken.
  const shares = asset.sharesPerToken
  if (!(shares > 0)) return { status: 'ratio-unverified' }
  if (asset.tokenPrice == null || asset.stockPrice == null || !(asset.stockPrice > 0)) {
    return { status: 'pending' }
  }
  // A price with no time on it (an old cached row, or a feed that sent none)
  // is not evidence of anything yet: wait for a dated one rather than assume
  // it is fresh.
  if (!Number.isFinite(asset.priceUpdatedAt)) return { status: 'pending' }
  if (!isFresh(asset.priceUpdatedAt, now)) return { status: 'price-check-failed' }
  const tokenPerShare = asset.tokenPrice / shares
  const gap = ((tokenPerShare - asset.stockPrice) / asset.stockPrice) * 100
  if (!Number.isFinite(gap) || Math.abs(gap) > MAX_PLAUSIBLE_GAP_PCT) return { status: 'price-check-failed' }
  return { status: 'ok', gap, tokenPerShare }
}

/** The label for a verdict that is not a gap, or null. */
export function gapStatusLabel(asset, now) {
  return GAP_STATUS_LABEL[gapCheck(asset, now).status] ?? null
}

/** A share count for copy: at most four decimals, no trailing zeros. */
function shareCount(n) {
  return String(Number(n.toFixed(4)))
}

/**
 * The chart's units note, or null when there is nothing to say:
 *   "Token drawn per share (1 NFLXon = 10 shares)" when one token tracks more
 *     or less than one share, so the reader knows the token line is scaled;
 *   "Token not drawn: ratio unverified" when there is no verified ratio, so
 *     the missing line is explained.
 * Descriptive only: it states the unit the chart uses.
 */
export function tokenUnitsNote(asset) {
  if (!asset?.underlying) return null
  const shares = asset.sharesPerToken
  if (!(shares > 0)) return 'Token not drawn: ratio unverified'
  if (shares === 1) return null
  return `Token drawn per share (1 ${asset.ticker} = ${shareCount(shares)} shares)`
}

/**
 * The share card's price footer. Never prints a token price beside a share
 * price as if they were comparable when they are not: an unverified ratio
 * says so, and a token that tracks more or less than one share gives its
 * price per share too.
 */
export function priceFooter(asset, formatPrice) {
  const parts = []
  const check = gapCheck(asset)
  const shares = asset?.sharesPerToken
  if (asset?.tokenPrice != null) {
    const perShare =
      asset.underlying && shares > 0 && shares !== 1 ? ` (${formatPrice(asset.tokenPrice / shares)} per share)` : ''
    parts.push(`Token ${formatPrice(asset.tokenPrice)}${perShare}`)
  }
  if (asset?.stockPrice != null) parts.push(`Stock ${formatPrice(asset.stockPrice)}`)
  const label = GAP_STATUS_LABEL[check.status]
  if (label) parts.push(label)
  return parts
}
