// The Pool liquidity row in Key statistics. Pure.
//
// The figure is GeckoTerminal's reserve_in_usd for ONE pool: the pool the
// candle chart draws from (services/candles.js resolvePool). It is what that
// pool held when the answer was fetched. It is not the token's whole market:
// other pools and the centralized exchanges are not in it, so the label names
// the pool and the row always says how old the number is.

import { networksFor } from './candles'

/**
 * Should Key statistics look this asset's pool up? Only for issuers whose
 * chain is known (xStocks on Solana, Ondo on Ethereum). For anyone else the
 * lookup searches both networks, which is two calls on the shared
 * GeckoTerminal budget for assets that mostly have no pool at all.
 */
export function wantsPoolLookup(asset) {
  return Boolean(asset?.ticker) && networksFor(asset).length === 1
}

/**
 * resolvePool's answer -> { usd, asOf, poolName } for the row, or null when
 * there is nothing honest to show: no pool, no reserve figure, a zero or
 * negative one, or no time to say it was measured at.
 */
export function poolLiquidity(resolved) {
  const usd = resolved?.pool?.liquidityUsd
  if (typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0) return null
  const asOf = typeof resolved.asOf === 'string' ? Date.parse(resolved.asOf) : NaN
  if (!Number.isFinite(asOf)) return null
  const poolName = typeof resolved.pool.name === 'string' ? resolved.pool.name : ''
  return { usd, asOf, poolName }
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
