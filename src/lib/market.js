// US equity market hours: Mon–Fri 9:30–16:00 America/New_York (DST-aware via Intl).
// Exchange holidays are not modeled (MVP); worst case the "last close" label is
// briefly wrong on a holiday weekday.
export function isUsMarketOpen(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type) => parts.find((p) => p.type === type)?.value
  const weekday = get('weekday')
  if (weekday === 'Sat' || weekday === 'Sun') return false
  const mins = parseInt(get('hour'), 10) * 60 + parseInt(get('minute'), 10)
  return mins >= 9 * 60 + 30 && mins < 16 * 60
}
