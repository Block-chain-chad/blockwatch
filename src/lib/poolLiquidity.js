// The Pool liquidity row in Key statistics. Pure.
//
// The figure is GeckoTerminal's reserve_in_usd for ONE pool: the pool the
// candle chart draws from (services/candles.js resolvePool). It is what that
// pool held when the answer was fetched. It is not the token's whole market:
// other pools and the centralized exchanges are not in it, so the label names
// the pool and the row always says how old the number is.

import { networksFor } from './candles'
import { verifiedToken } from '../data/verifiedMints'
import { splitPoolName } from '../../api/_geckoterminal.js'

/** Older than this, the caption says the figure may be out of date. */
export const STALE_AFTER_MS = 24 * 60 * 60_000

/**
 * Should Key statistics look this asset's pool up? Only when the row could
 * show: the asset has an issuer-verified token address to check the pool
 * against (data/verifiedMints.json, today the pinned xStocks mints), and its
 * chain is known, so the lookup is one network and not two on the shared
 * GeckoTerminal budget.
 */
export function wantsPoolLookup(asset) {
  return Boolean(asset?.ticker) && verifiedToken(asset) != null && networksFor(asset).length === 1
}

/**
 * "NVDAon / USDC 0.51%" -> "NVDAon / USDC". The trailing number is the pool's
 * fee tier, and next to a liquidity figure it reads like a spread or a gap.
 */
export function cleanPoolName(name) {
  const { base, quote } = splitPoolName(name)
  return quote ? `${base} / ${quote}` : base
}

/**
 * resolvePool's answer -> { usd, asOf, poolName } for the row, or null when
 * there is nothing honest to show: no pool, a pool whose base token is not the
 * issuer-verified address for `asset`, no reserve figure, a zero or negative
 * one, or no time to say it was measured at.
 *
 * The address check is here and not in the pool choice on purpose: the
 * candle chart keeps choosing pools as it always has, and this row only
 * vouches for a pool when it can prove the pool trades the real token.
 */
export function poolLiquidity(resolved, asset) {
  const pool = resolved?.pool
  const verified = verifiedToken(asset)
  if (!pool || !verified || pool.baseAddress !== verified.mint) return null
  const usd = pool.liquidityUsd
  if (typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0) return null
  const asOf = typeof resolved.asOf === 'string' ? Date.parse(resolved.asOf) : NaN
  if (!Number.isFinite(asOf)) return null
  return { usd, asOf, poolName: cleanPoolName(pool.name) }
}

/** "Sep 24, 2:05 PM" in the viewer's time zone (or the one given). */
export function formatAsOf(ms, timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  }).format(ms)
}

/**
 * The line under the figure: which pool, when, and a warning once the figure
 * is more than a day old (an edge-cached answer can be served for days).
 */
export function liquidityCaption({ poolName, asOf }, now = Date.now(), timeZone) {
  const pool = poolName ? `${poolName} pool, ` : ''
  const stale = now - asOf > STALE_AFTER_MS ? ', may be out of date' : ''
  return `${pool}as of ${formatAsOf(asOf, timeZone)}${stale}`
}
