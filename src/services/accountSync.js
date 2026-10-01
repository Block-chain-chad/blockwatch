// Mirror a signed-in account's folders and alert rules to Supabase. Rows the
// database would refuse (supabase/launch-limits.sql) stay on the device and
// are counted instead of sent, and one refused row never stops the others.
// Used by state/FoldersContext.jsx and state/AlertsContext.jsx.

import { supabase } from './supabase'
import { upsertRows } from './syncRows'
import { MAX_ALERTS, MAX_FOLDER_ROWS, alertFits, folderFits } from '../lib/accountLimits'

/**
 * Mirror this device's folders to the account. Rows the database would refuse
 * (too big, or past the row cap) are kept on the device and counted instead of
 * sent, and one refused row never stops the others. Resolves
 * { unsynced, offline }; never throws.
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
    if (delError && !delError.code) return { unsynced: 0, offline: true }

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
    return { unsynced: folders.length - fitting.length + rejected, offline }
  } catch {
    return { unsynced: 0, offline: true }
  }
}

// Mirror the signed-in user's rules to Supabase (fired events and read-state
// stay device-local — notifications are a per-device concern). The legacy
// threshold column keeps a value for older rows; the full rule lives in jsonb.
// Rules the database would refuse stay on the device and are counted, and one
// refused row never stops the others. Resolves { unsynced, offline }.
export async function pushRules(userId, rules, client = supabase) {
  try {
    const entries = Object.entries(rules)
    // Deletions first, so removed alerts free room under the row cap.
    let del = client.from('user_alerts').delete().eq('user_id', userId)
    if (entries.length > 0) {
      del = del.not('asset_id', 'in', `(${entries.map(([id]) => `"${id}"`).join(',')})`)
    }
    const { error: delError } = await del
    if (delError && !delError.code) return { unsynced: 0, offline: true }

    const fitting = entries.filter(([assetId, r]) => alertFits(assetId, r)).slice(0, MAX_ALERTS)
    const rows = fitting.map(([assetId, r]) => ({
      user_id: userId,
      asset_id: assetId,
      threshold: r.drift?.threshold ?? 0,
      rule: r,
      updated_at: new Date().toISOString(),
    }))
    const { rejected, offline } = await upsertRows(client, 'user_alerts', rows)
    return { unsynced: entries.length - fitting.length + rejected, offline }
  } catch {
    return { unsynced: 0, offline: true }
  }
}
