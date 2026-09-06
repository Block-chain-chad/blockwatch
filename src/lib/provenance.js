// What the legend says about where each leg of the gap comes from (spec A23,
// §6.9): TradingView's three-segment status — {session} · {cadence} · {venue}
// by {source} — and the delayed-data tooltip. TradingView puts "what am I
// looking at, how old is it, where did it come from" in the legend, not a
// footer. Pure; the desktop legend and the watchlist rows read it.

/** Yahoo's regular-session quote lags the tape by this much. */
export const STOCK_DELAY_MINUTES = 15

/** PricesContext refreshes token prices on this cadence. */
export const TOKEN_REFRESH_SECONDS = 30

// The stock leg's first segment per market session. Not SESSION_SHORT: the
// legend speaks about the market ("Market closed"), the top bar about the
// moment ("Overnight").
const STOCK_SESSION_WORD = {
  regular: 'Market open',
  pre: 'Pre-market',
  post: 'After hours',
  closed: 'Market closed',
}

/**
 * Whether the stock leg is behind the tape: always outside the regular
 * session (the quote is the last close while the share may still trade),
 * and inside it whenever the last fetch is older than one refresh — or its
 * age is unknown. The D badge and the "Data is delayed" segment both key on
 * this, so they can never disagree.
 */
export function isStockDelayed(session, ageSeconds) {
  if (session !== 'regular') return true
  return !(Number.isFinite(ageSeconds) && ageSeconds <= 2 * TOKEN_REFRESH_SECONDS)
}

/**
 * legendStatus('token', session, age)
 *   → '24/7 · One update every 30 seconds · Raydium by GeckoTerminal'
 * legendStatus('stock', 'closed', age)
 *   → 'Market closed · Data is delayed · NASDAQ by Yahoo Finance'
 * legendStatus('stock', 'regular', 12)
 *   → 'Market open · One update every 30 seconds · NASDAQ by Yahoo Finance'
 *
 * `venue` names the pool's DEX (token) or the listing exchange (stock);
 * the defaults are the ones the flagship xStocks pairs trade on.
 */
export function legendStatus(leg, session, ageSeconds, { venue } = {}) {
  const cadence = `One update every ${TOKEN_REFRESH_SECONDS} seconds`
  if (leg === 'stock') {
    const word = STOCK_SESSION_WORD[session] ?? STOCK_SESSION_WORD.closed
    const freshness = isStockDelayed(session, ageSeconds) ? 'Data is delayed' : cadence
    return `${word} · ${freshness} · ${venue ?? 'NASDAQ'} by Yahoo Finance`
  }
  return `24/7 · ${cadence} · ${venue ?? 'Raydium'} by GeckoTerminal`
}

/** delayTooltip(15) → 'Quotes are delayed by 15 min' */
export function delayTooltip(minutes = STOCK_DELAY_MINUTES) {
  return `Quotes are delayed by ${minutes} min`
}
