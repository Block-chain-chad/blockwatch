// US equity sessions, America/New_York, DST-aware via Intl.
//
//   pre      04:00–09:30   stock trades, our feed does NOT see it
//   regular  09:30–16:00   both sides live; the gap is a real spread
//   post     16:00–20:00   stock trades, our feed does NOT see it
//   closed   everything else, plus weekends
//
// Why the extended sessions are modeled at all: tokens trade 24/7, but
// Finnhub's /quote is regular-session only — verified 2026-08-20, when AAPL
// and NVDA both returned t=20:00 UTC (16:00 ET) hours after the post session
// had ended. So between 16:00 and 20:00 a stock can move on earnings while we
// still hold the 4pm close, and the token follows the stock within minutes.
// The app then renders that as a token "premium" which does not exist.
//
// We cannot fix the number without extended-hours data (paid tier). We can
// stop asserting it. Callers use the session to caveat the gap, and to tighten
// the digest's plausibility bound so phantom spikes never become headlines.
//
// Exchange holidays are not modeled (MVP); worst case a holiday weekday reads
// as a normal session and the "last close" label is briefly wrong.

const PRE_OPEN = 4 * 60
const REGULAR_OPEN = 9 * 60 + 30
const REGULAR_CLOSE = 16 * 60
const POST_CLOSE = 20 * 60

/** 'pre' | 'regular' | 'post' | 'closed' */
export function getMarketSession(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value
  const weekday = get('weekday')
  if (weekday === 'Sat' || weekday === 'Sun') return 'closed'
  const mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10)
  if (mins >= REGULAR_OPEN && mins < REGULAR_CLOSE) return 'regular'
  if (mins >= PRE_OPEN && mins < REGULAR_OPEN) return 'pre'
  if (mins >= REGULAR_CLOSE && mins < POST_CLOSE) return 'post'
  return 'closed'
}

/** Regular session only — the one window where both sides of the gap are live. */
export function isUsMarketOpen(date = new Date()) {
  return getMarketSession(date) === 'regular'
}

/** Stock is trading but our quote is stale. The gap is not trustworthy here. */
export function isExtendedHours(date = new Date()) {
  const s = getMarketSession(date)
  return s === 'pre' || s === 'post'
}
