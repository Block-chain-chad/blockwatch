// The desktop shell's small state rules, kept pure so they run under vitest:
// which asset to show on first load, which list the right column shows, and
// how ↓/↑ step through that list. No React, no services.

/** The right column's default source; anything else is a folder id. */
export const WATCHLIST_SOURCE = 'watchlist'

/**
 * Selection on first load (spec §1.4): the remembered asset, else the most
 * recently viewed, else the first watchlist row, else null (the center shows
 * its empty state). `known` is the set of ids that exist — a remembered id
 * from a universe rebuild, or a recent view of a delisted token, must not
 * select a ghost.
 */
export function pickInitialAsset({ saved, recent = [], watchlistIds = [], known } = {}) {
  const ok = (id) => id != null && (known ? known.has(id) : true)
  if (ok(saved)) return saved
  for (const id of recent) if (ok(id)) return id
  for (const id of watchlistIds) if (ok(id)) return id
  return null
}

/**
 * What the right column lists for a `listSource`: the watchlist, or one of
 * the user's folders. A folder that no longer exists (deleted on another
 * device, or before this profile hydrated) falls back to the watchlist with
 * `missing: true`, so the caller can also reset the remembered source.
 */
export function resolveListSource(listSource, folders = [], watchlistIds = []) {
  const watchlist = {
    id: WATCHLIST_SOURCE,
    name: 'Watchlist',
    assetIds: watchlistIds,
    isFolder: false,
    missing: false,
  }
  if (listSource == null || listSource === WATCHLIST_SOURCE) return watchlist
  const folder = folders.find((f) => f.id === listSource)
  if (!folder) return { ...watchlist, missing: true }
  return {
    id: folder.id,
    name: folder.name,
    assetIds: folder.assetIds ?? [],
    isFolder: true,
    missing: false,
  }
}

/**
 * The id `delta` rows away from `currentId` in `ids`, wrapping at both ends
 * (TradingView's ↓/↑ and Space). When the current asset is not in the list
 * (it came from search), ↓ starts at the top and ↑ at the bottom.
 */
export function stepId(ids, currentId, delta) {
  if (!Array.isArray(ids) || ids.length === 0) return null
  const i = ids.indexOf(currentId)
  if (i < 0) return delta >= 0 ? ids[0] : ids[ids.length - 1]
  const n = ids.length
  return ids[(((i + delta) % n) + n) % n]
}
