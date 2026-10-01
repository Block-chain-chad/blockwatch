// Mirror a signed-in account's folders and alert rules to Supabase. Rows the
// database would refuse (supabase/launch-limits.sql) stay on the device and
// are counted instead of sent, and one refused row never stops the others.
// Used by state/FoldersContext.jsx and state/AlertsContext.jsx.
//
// The ids that did not reach the account are remembered on the device
// (saveUnsynced), so loading the account later puts this device's copy of
// those rows back (withUnsynced) instead of losing them.

import { supabase } from './supabase'
import { isTransient, upsertRows } from './syncRows'
import { MAX_ALERTS, MAX_FOLDER_ROWS, alertFits, folderFits } from '../lib/accountLimits'

/**
 * Mirror this device's folders to the account. Rows the database would refuse
 * (too big, or past the row cap) are kept on the device and counted instead of
 * sent, and one refused row never stops the others. Resolves
 * { unsyncedIds, offline }; never throws.
 */
export async function pushFolders(userId, folders, client = supabase) {
  try {
    // Deletions first, so folders removed here free room under the row cap
    // before new ones arrive. Rows this device still has are kept, synced or not.
    let del = client.from('user_folders').delete().eq('user_id', userId)
    if (folders.length > 0) {
      del = del.not('id', 'in', `(${folders.map((f) => `"${f.id}"`).join(',')})`)
    }
    const { error: delError } = await del
    if (delError && isTransient(delError)) return { unsyncedIds: [], offline: true }

    // The watchlist comes first in the list, so it is never the one left out.
    const fitting = folders.filter(folderFits).slice(0, MAX_FOLDER_ROWS)
    const rows = fitting.map((f) => ({
      user_id: userId,
      id: f.id,
      name: f.name,
      asset_ids: f.assetIds,
      updated_at: new Date().toISOString(),
    }))
    const { rejected, offline } = await upsertRows(client, 'user_folders', rows)
    if (offline) return { unsyncedIds: [], offline }
    const stored = new Set(rows.map((r) => r.id))
    for (const r of rejected) stored.delete(r.id)
    return { unsyncedIds: folders.map((f) => f.id).filter((id) => !stored.has(id)), offline }
  } catch {
    return { unsyncedIds: [], offline: true }
  }
}

// Mirror the signed-in user's rules to Supabase (fired events and read-state
// stay device-local — notifications are a per-device concern). The legacy
// threshold column keeps a value for older rows; the full rule lives in jsonb.
// Rules the database would refuse stay on the device and are counted, and one
// refused row never stops the others. Resolves { unsyncedIds, offline }.
export async function pushRules(userId, rules, client = supabase) {
  try {
    const entries = Object.entries(rules)
    // Deletions first, so removed alerts free room under the row cap.
    let del = client.from('user_alerts').delete().eq('user_id', userId)
    if (entries.length > 0) {
      del = del.not('asset_id', 'in', `(${entries.map(([id]) => `"${id}"`).join(',')})`)
    }
    const { error: delError } = await del
    if (delError && isTransient(delError)) return { unsyncedIds: [], offline: true }

    const fitting = entries.filter(([assetId, r]) => alertFits(assetId, r)).slice(0, MAX_ALERTS)
    const rows = fitting.map(([assetId, r]) => ({
      user_id: userId,
      asset_id: assetId,
      threshold: r.drift?.threshold ?? 0,
      rule: r,
      updated_at: new Date().toISOString(),
    }))
    const { rejected, offline } = await upsertRows(client, 'user_alerts', rows)
    if (offline) return { unsyncedIds: [], offline }
    const stored = new Set(rows.map((r) => r.asset_id))
    for (const r of rejected) stored.delete(r.asset_id)
    return { unsyncedIds: entries.map(([id]) => id).filter((id) => !stored.has(id)), offline }
  } catch {
    return { unsyncedIds: [], offline: true }
  }
}

const unsyncedKey = (kind, userId) => `bw.${kind}.unsynced.${userId}`

/** The ids of `kind` ('folders' or 'alerts') this device holds but the account does not. */
export function loadUnsynced(kind, userId, storage = globalThis.localStorage) {
  try {
    const ids = JSON.parse(storage?.getItem(unsyncedKey(kind, userId)) ?? '[]')
    return Array.isArray(ids) ? ids.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

/** Remember which ids did not reach the account; forget the key when none. */
export function saveUnsynced(kind, userId, ids, storage = globalThis.localStorage) {
  try {
    if (ids.length === 0) storage?.removeItem(unsyncedKey(kind, userId))
    else storage?.setItem(unsyncedKey(kind, userId), JSON.stringify(ids))
  } catch {
    // Blocked storage: nothing to remember them in.
  }
}

/**
 * The account's rows with this device's copy of every unsynced row put back:
 * replacing the account's older copy of the same id, or added at the end.
 * `idOf` reads a row's id.
 */
export function withUnsynced(accountRows, deviceRows, unsyncedIds, idOf) {
  const keep = new Set(unsyncedIds)
  const device = new Map(deviceRows.filter((r) => keep.has(idOf(r))).map((r) => [idOf(r), r]))
  const merged = accountRows.map((r) => device.get(idOf(r)) ?? r)
  const present = new Set(accountRows.map(idOf))
  for (const [id, row] of device) if (!present.has(id)) merged.push(row)
  return merged
}
