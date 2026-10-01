// Where this device keeps Holdings. A module of its own, with no copy in it,
// so sign-out and account deletion can clear these keys without pulling the
// Holdings screen into the iPhone build (Holdings is web only).

/** A guest's holdings: [{ assetId, amount, updatedAt }], amounts as decimal strings. */
export const HOLDINGS_GUEST_KEY = 'bw.holdings.v1'

const USER_PREFIX = 'bw.holdings.u.'

/** A signed-in person's cache of their account's holdings. Cleared on sign-out. */
export function holdingsUserKey(userId) {
  return `${USER_PREFIX}${userId}`
}

/**
 * Remove every signed-in cache on this device except `keepUserId`'s. Covers
 * sign-out, a second person signing in, and a session that ended while the
 * app was closed, when no sign-out ever ran here.
 */
export function clearHoldingsCaches(keepUserId = null, storage = globalThis.localStorage) {
  try {
    const keep = keepUserId ? holdingsUserKey(keepUserId) : null
    const keys = []
    for (let i = 0; i < storage.length; i++) keys.push(storage.key(i))
    for (const key of keys) {
      if (key?.startsWith(USER_PREFIX) && key !== keep) storage.removeItem(key)
    }
  } catch {
    // Blocked storage has nothing in it to clear.
  }
}
