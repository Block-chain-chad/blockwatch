// The one metric the roadmap cares about — ten people who open the app in a
// week and come back — as a classification of this open against the last
// one, so the analytics event can say "return within 7 days" without any
// server-side stitching. Pure.

export const RETURN_WINDOW_DAYS = 7
const DAY = 86_400_000

export function classifyVisit({ lastSeenMs, nowMs }) {
  if (!Number.isFinite(lastSeenMs)) return { kind: 'first', days: null }
  const days = Math.round((nowMs - lastSeenMs) / DAY)
  return { kind: days <= RETURN_WINDOW_DAYS ? 'return' : 'lapsed', days }
}
