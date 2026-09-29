// US equity sessions, America/New_York, DST-aware via Intl.
//
//   pre      04:00–09:30      stock trades, our feed does NOT see it
//   regular  09:30–close      both sides live; the gap is a real spread
//   post     close–close+4h   stock trades, our feed does NOT see it
//   closed   everything else, plus weekends and exchange holidays
//
// Why the extended sessions are modeled at all: tokens trade 24/7, but
// Finnhub's /quote is regular-session only — verified 2026-08-20, when AAPL
// and NVDA both returned t=20:00 UTC (16:00 ET) hours after the post session
// had ended. So between the close and 20:00 a stock can move on earnings while
// we still hold the closing print, and the token follows the stock within
// minutes. The app then renders that as a token "premium" which does not exist.
//
// We cannot fix the number without extended-hours data (paid tier). We can
// stop asserting it. Callers use the session to caveat the gap, and to tighten
// the digest's plausibility bound so phantom spikes never become headlines.
//
// Holidays and early closes ARE modeled (see the calendar below). Without them
// Thanksgiving read as a normal weekday: the market is shut, the token keeps
// trading, and the app presented the prior close as a live spread all day.
//
// Halts are NOT modeled — no free feed publishes them. A halted stock stops
// producing new quote timestamps, so it surfaces through the same freshness
// path as any other stale quote (lib/provenance.js): the age keeps climbing
// and the share leg is labelled delayed. That is the honest reading; it just
// does not say the word "halt".

const PRE_OPEN = 4 * 60
const REGULAR_OPEN = 9 * 60 + 30
const REGULAR_CLOSE = 16 * 60
const EARLY_CLOSE = 13 * 60
// Extended trading runs four hours past whichever close the day has: 20:00 on
// a normal day, 17:00 on a 1pm day.
const POST_MINUTES = 4 * 60

/*
 * Exchange calendar, keyed by America/New_York calendar date.
 *
 * Source: NYSE Group's published holiday and early-closings calendar
 * (https://www.nyse.com/markets/hours-calendars), cross-checked against the
 * ICE press release announcing 2026–2028. Nasdaq keeps the same days.
 *
 * Extending it is a paste: add the year's dates to both maps. The value is the
 * reason, and it is shown to users ("at the last close · Thanksgiving Day"),
 * so write it as the words that belong on screen. market.test.js fails once
 * the calendar stops covering the next 90 days — that is the reminder to add
 * a year, with a quarter of warning.
 */
export const US_MARKET_HOLIDAYS = {
  '2026-01-01': "New Year's Day",
  '2026-01-19': 'Martin Luther King, Jr. Day',
  '2026-02-16': "Washington's Birthday",
  '2026-04-03': 'Good Friday',
  '2026-05-25': 'Memorial Day',
  '2026-06-19': 'Juneteenth',
  '2026-07-03': 'Independence Day',
  '2026-09-07': 'Labor Day',
  '2026-11-26': 'Thanksgiving Day',
  '2026-12-25': 'Christmas Day',
  '2027-01-01': "New Year's Day",
  '2027-01-18': 'Martin Luther King, Jr. Day',
  '2027-02-15': "Washington's Birthday",
  '2027-03-26': 'Good Friday',
  '2027-05-31': 'Memorial Day',
  '2027-06-18': 'Juneteenth',
  '2027-07-05': 'Independence Day',
  '2027-09-06': 'Labor Day',
  '2027-11-25': 'Thanksgiving Day',
  '2027-12-24': 'Christmas Day',
}

/** 1:00 pm ET closes. Same shape, same extension story. */
export const US_EARLY_CLOSES = {
  '2026-11-27': 'the day after Thanksgiving',
  '2026-12-24': 'Christmas Eve',
  '2027-11-26': 'the day after Thanksgiving',
}

/** Last date the calendar above speaks for. Past it we assume a normal day. */
export const CALENDAR_THROUGH = '2027-12-31'

const ET = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  weekday: 'short',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: 'numeric',
  minute: 'numeric',
  hourCycle: 'h23',
})

function etParts(date) {
  const p = {}
  for (const { type, value } of ET.formatToParts(date)) p[type] = value
  return {
    day: `${p.year}-${p.month}-${p.day}`,
    weekday: p.weekday,
    minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10),
  }
}

function dayFrom({ day, weekday }) {
  if (weekday === 'Sat' || weekday === 'Sun') {
    return { date: day, kind: 'weekend', reason: 'the weekend', closeMinute: null }
  }
  const holiday = US_MARKET_HOLIDAYS[day]
  if (holiday) return { date: day, kind: 'holiday', reason: holiday, closeMinute: null }
  const early = US_EARLY_CLOSES[day]
  if (early) return { date: day, kind: 'early-close', reason: early, closeMinute: EARLY_CLOSE }
  return { date: day, kind: 'normal', reason: null, closeMinute: REGULAR_CLOSE }
}

// One Intl call per minute rather than one per caller: the desktop Board asks
// for the calendar once per visible row on every one-second tick. Keyed on the
// minute the instant falls in, so it stays a pure function of its argument.
let dayCache = { bucket: null, value: null }

/**
 * What kind of trading day an instant falls on, in exchange terms.
 * { date: 'YYYY-MM-DD', kind: 'normal'|'early-close'|'holiday'|'weekend',
 *   reason: string|null, closeMinute: number|null }
 * closeMinute is null when the market never opens that day.
 */
export function getMarketDay(date = new Date()) {
  const bucket = Math.floor(date.getTime() / 60_000)
  if (dayCache.bucket === bucket) return dayCache.value
  const value = dayFrom(etParts(date))
  dayCache = { bucket, value }
  return value
}

/** First date the calendar above speaks for. Before it we know no holidays. */
export const CALENDAR_FROM = '2026-01-01'

const WEEKDAY_NAME = { Sun: 'Sunday', Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday' }
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** The calendar day `delta` days from a 'YYYY-MM-DD' date, with its weekday. */
function shiftDay(day, delta) {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d + delta))
  return { day: t.toISOString().slice(0, 10), weekday: WEEKDAY_SHORT[t.getUTCDay()] }
}

let closeCache = { bucket: null, value: null }

/**
 * The trading day whose regular-session close is the most recent one at an
 * instant: { date: 'YYYY-MM-DD', weekday: 'Friday', today: boolean }.
 *
 * After the close on a trading day it is that day (today: true). Before the
 * open, and on weekends and holidays, it is the last trading day before, so
 * a holiday Monday names Friday. Early closes count from 1:00 pm.
 *
 * Null when the answer depends on days outside the calendar: past
 * CALENDAR_THROUGH an unknown holiday could move the close a day back, and
 * a wrong weekday is worse than none. Callers then say "last close".
 */
export function lastCloseDay(date = new Date()) {
  const bucket = Math.floor(date.getTime() / 60_000)
  if (closeCache.bucket === bucket) return closeCache.value
  const parts = etParts(date)
  let value = null
  let cursor = { day: parts.day, weekday: parts.weekday }
  for (let back = 0; back < 10; back++) {
    if (cursor.day > CALENDAR_THROUGH || cursor.day < CALENDAR_FROM) break
    const day = dayFrom(cursor)
    const closed = day.closeMinute != null && (back > 0 || parts.minutes >= day.closeMinute)
    if (closed) {
      value = { date: day.date, weekday: WEEKDAY_NAME[cursor.weekday], today: back === 0 }
      break
    }
    cursor = shiftDay(cursor.day, -1)
  }
  closeCache = { bucket, value }
  return value
}

const etDayCache = new Map()

/** The America/New_York calendar date an instant falls on, 'YYYY-MM-DD'. */
export function etDate(ms) {
  const bucket = Math.floor(ms / 60_000)
  let day = etDayCache.get(bucket)
  if (day === undefined) {
    // Quote stamps repeat (every close is stamped 16:00), so this stays tiny;
    // the bound is only a guard against an unbounded stream of stamps.
    if (etDayCache.size > 500) etDayCache.clear()
    day = etParts(new Date(ms)).day
    etDayCache.set(bucket, day)
  }
  return day
}

/** 'pre' | 'regular' | 'post' | 'closed' */
export function getMarketSession(date = new Date()) {
  const parts = etParts(date)
  const day = dayFrom(parts)
  if (day.closeMinute == null) return 'closed'
  const { minutes } = parts
  if (minutes >= REGULAR_OPEN && minutes < day.closeMinute) return 'regular'
  if (minutes >= PRE_OPEN && minutes < REGULAR_OPEN) return 'pre'
  if (minutes >= day.closeMinute && minutes < day.closeMinute + POST_MINUTES) return 'post'
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
