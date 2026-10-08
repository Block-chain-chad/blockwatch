// May a token's trading pool stand in for CoinGecko's price history? Pure.
//
// The gap chart draws the token line from the token's own pool when CoinGecko
// refuses (hooks/useChartData.js loadTokenHistory). A busy pool is a fair
// stand-in. A thin one is not: on 2026-10-07 CRCLon's "Past day" line was
// the only five 5-minute candles of a pool holding about $2,700, the last one
// thirteen hours old, joined by straight lines, and its gap history averaged
// those five trades and ended on a 0% the live gap did not show.
//
// So a pool series stands in only when its points inside the range's window
// (length W) pass all three checks:
//   1. fresh:  the newest point is no older than POOL_MAX_AGE_SHARE of W
//              (2.4 hours on Past day);
//   2. span:   the points cover at least POOL_MIN_SPAN_SHARE of W;
//   3. gaps:   no two neighboring points are more than POOL_MAX_GAP_SHARE of
//              W apart (2.4 hours on Past day, about 17 hours on a week).
// Shares of W rather than fixed times, so one rule fits every range: a
// healthy pool's candle step is at most 1/25 of W on every range
// (useChartData.js POOL_TIMEFRAME), and a 1Y pool's 300 daily candles span
// about 300 of 365 days, which still passes.

export const POOL_MAX_AGE_SHARE = 0.1
export const POOL_MIN_SPAN_SHARE = 0.5
export const POOL_MAX_GAP_SHARE = 0.1

/**
 * poolCoverage(points, windowMs, now) -> { ok, failed }
 * `points` are [{ t: ms, v }] ascending; only those inside [now - windowMs,
 * now] count. `failed` lists the checks that failed: 'fresh', 'span', 'gaps'.
 * Fewer than two points in the window fail all three.
 */
export function poolCoverage(points, windowMs, now = Date.now()) {
  const start = now - windowMs
  const inside = (points ?? []).filter((p) => Number.isFinite(p?.t) && p.t >= start && p.t <= now)
  if (inside.length < 2) return { ok: false, failed: ['fresh', 'span', 'gaps'] }

  const failed = []
  if (now - inside[inside.length - 1].t > POOL_MAX_AGE_SHARE * windowMs) failed.push('fresh')
  if (inside[inside.length - 1].t - inside[0].t < POOL_MIN_SPAN_SHARE * windowMs) failed.push('span')
  let longestGap = 0
  for (let i = 1; i < inside.length; i += 1) longestGap = Math.max(longestGap, inside[i].t - inside[i - 1].t)
  if (longestGap > POOL_MAX_GAP_SHARE * windowMs) failed.push('gaps')
  return { ok: failed.length === 0, failed }
}
