// Recently-viewed assets for the search overlay's empty state. Device-local
// (like the price caches) — eight most recent, newest first.

const KEY = 'bw.recentViews.v1'
const MAX = 8

export function recordView(assetId) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY)) ?? []
    const next = [assetId, ...list.filter((id) => id !== assetId)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage unavailable — recents just don't persist
  }
}

export function getRecentViews() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
