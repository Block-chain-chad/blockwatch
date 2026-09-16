// What the legend says about where each leg of the gap comes from (spec A23,
// §6.9): TradingView's three-segment status — {session} · {cadence} · {venue}
// by {source} — and the delayed-data tooltip. TradingView puts "what am I
// looking at, how old is it, where did it come from" in the legend, not a
// footer. Pure; the desktop legend and the watchlist rows read it.

import { formatPrice, EM_DASH } from './format'
import { getMarketDay } from './market'

/** Yahoo's regular-session quote lags the tape by this much. */
export const STOCK_DELAY_MINUTES = 15

/** PricesContext refreshes token prices on this cadence. */
export const TOKEN_REFRESH_SECONDS = 30

/**
 * How old a share quote may be, inside the regular session, and still be
 * called live. One poll cycle of headroom and no more.
 *
 * In practice most quotes will read "delayed" during the session, because
 * api/finnhub.js shares one cached response for 180s (plus a 600s
 * stale-while-revalidate tail). That is the true state of the pipeline, and
 * the age printed beside the word says exactly how true. Tightening s-maxage
 * buys freshness at the cost of Finnhub quota; it does not change this rule.
 */
export const LIVE_QUOTE_SECONDS = 2 * TOKEN_REFRESH_SECONDS

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
  return !(Number.isFinite(ageSeconds) && ageSeconds <= LIVE_QUOTE_SECONDS)
}

const CLOSE_WORD = { post: 'today’s close', pre: 'last close', closed: 'last close' }

function sessionSentence(session, day) {
  if (session === 'pre') {
    return 'Pre-market: the share is trading again, but this quote is the last close.'
  }
  if (session === 'post') {
    return 'After hours: the share is still trading, but this quote is today’s close.'
  }
  if (day?.kind === 'holiday') {
    return `The US market is closed for ${day.reason}. This quote is the last close.`
  }
  if (day?.kind === 'weekend') {
    return 'The US market is closed for the weekend. This quote is the last close.'
  }
  return 'The US market is closed. This quote is the last close.'
}

/**
 * The single verdict on a share quote's freshness. Every surface that puts a
 * share price beside a gap reads this one function, so no two of them can
 * tell the user a different story about the same number.
 *
 * `quote` is the merged asset's stockQuote ({ price, basis, asOf }); null and
 * undated quotes are first-class cases, not something to paper over with the
 * current time.
 *
 *   state        meaning                                    shown as
 *   'live'       regular session, quote younger than        '12 s ago · live'
 *                LIVE_QUOTE_SECONDS
 *   'delayed'    regular session, older than that (or a     '6 m ago · delayed'
 *                halted symbol that stopped printing)
 *   'close'      not the regular session, so the quote is   "today's close · 2 h ago"
 *                a close rather than a live price
 *   'undated'    we hold a price the provider did not       'age unknown'
 *                timestamp — we refuse to guess one
 *   'none'       no quote at all                            'no quote yet'
 *
 * Returns { state, ageSeconds, words, badge, title }; badge is null when the
 * price is live and { text, tone } otherwise ('warn' = the number may be
 * wrong right now, 'muted' = it is a close and is meant to be one).
 */
export function shareFreshness({ quote, session, now = Date.now() }) {
  if (!quote || quote.price == null) {
    return {
      state: 'none',
      ageSeconds: null,
      words: 'no quote yet',
      badge: { text: 'No quote', tone: 'warn' },
      title: 'No share quote has arrived yet.',
    }
  }
  const ageSeconds = Number.isFinite(quote.asOf) ? (now - quote.asOf) / 1000 : null
  const stamped = ageSeconds == null ? '' : ` Quote timestamp ${new Date(quote.asOf).toISOString()}.`

  if (quote.basis === 'prevClose') {
    return {
      state: 'close',
      ageSeconds,
      words: 'previous close',
      badge: { text: 'Prev close', tone: 'warn' },
      title:
        'The provider had no traded price for this symbol, so this is the previous close, not a current price.',
    }
  }

  if (session !== 'regular') {
    const day = getMarketDay(new Date(now))
    const word = CLOSE_WORD[session] ?? CLOSE_WORD.closed
    return {
      state: 'close',
      ageSeconds,
      words: ageSeconds == null ? `${word} · age unknown` : `${word} · ${ageWords(ageSeconds)}`,
      badge: { text: 'Close', tone: 'muted' },
      title: sessionSentence(session, day) + stamped,
    }
  }

  if (ageSeconds == null) {
    return {
      state: 'undated',
      ageSeconds: null,
      words: 'age unknown',
      badge: { text: 'Undated', tone: 'warn' },
      title: 'The provider sent this quote without a timestamp, so its age is unknown.',
    }
  }

  if (ageSeconds > LIVE_QUOTE_SECONDS) {
    return {
      state: 'delayed',
      ageSeconds,
      words: `${ageWords(ageSeconds)} · delayed`,
      badge: { text: 'Delayed', tone: 'warn' },
      title: `The market is open but this quote is ${ageWords(ageSeconds)}, so the share has likely moved since.${stamped}`,
    }
  }

  return {
    state: 'live',
    ageSeconds,
    words: `${ageWords(ageSeconds)} · live`,
    badge: null,
    title: `The market is open and this quote is ${ageWords(ageSeconds)}.${stamped}`,
  }
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

/** '7 s ago' / '2 m ago' / '3 h ago'; 'no price yet' without an age. */
export function ageWords(seconds) {
  if (!Number.isFinite(seconds)) return 'no price yet'
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s} s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m} m ago`
  return `${Math.round(m / 60)} h ago`
}

/** 'Token $218.49 · 7 s ago · via Jupiter' */
export function tokenLegLine({ price, ageSeconds, source }) {
  const p = Number.isFinite(price) ? formatPrice(price) : EM_DASH
  return `Token ${p} · ${ageWords(ageSeconds)} · via ${source}`
}

/**
 * 'Share $218.29 · 12 s ago · live · Finnhub'         (regular, fresh)
 * 'Share $218.29 · 15 m ago · delayed · Finnhub'      (regular, behind)
 * 'Share $218.29 · age unknown · Finnhub'             (regular, no timestamp)
 * 'Share $218.29 · today’s close · 2 h ago · Finnhub' (after hours)
 * 'Share $218.29 · last close · 17 h ago · Finnhub'   (shut, or pre-market)
 *
 * Takes the quote itself rather than a pre-computed age: the age has to come
 * from the quote's own timestamp, and a caller holding only the batch fetch
 * time cannot produce an honest one.
 */
export function shareLegLine({ price, quote, session, now, source }) {
  const p = Number.isFinite(price) ? formatPrice(price) : EM_DASH
  return `Share ${p} · ${shareFreshness({ quote, session, now }).words} · ${source}`
}
