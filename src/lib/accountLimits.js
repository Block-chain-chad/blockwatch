// The limits a signed-in account's synced data must fit, mirroring what the
// database enforces (supabase/launch-limits.sql, applied September 30, 2026).
// The app checks them first so a person gets a plain message instead of a
// sync that quietly stops. Change a number here only together with that file.

// Folder rows per account. The hidden Home watchlist is one of them, so a
// person can make one fewer folder than the database allows rows.
export const MAX_FOLDER_ROWS = 40
export const MAX_FOLDERS = MAX_FOLDER_ROWS - 1
export const MAX_FOLDER_NAME = 100
export const MAX_FOLDER_ASSETS = 1000
const MAX_FOLDER_ID = 64
const MAX_ASSET_IDS_BYTES = 32768

// Alert rows per account: one per token with any alert on it.
export const MAX_ALERTS = 250
const MAX_ALERT_ASSET_ID = 100
const MAX_RULE_BYTES = 512

export const FOLDER_LIMIT_MESSAGE = `You can have up to ${MAX_FOLDERS} folders.`
export const FOLDER_FULL_MESSAGE = `A folder can hold up to ${MAX_FOLDER_ASSETS} assets.`
export const ALERT_LIMIT_MESSAGE = `You can set alerts on up to ${MAX_ALERTS} tokens.`
export const FOLDERS_UNSYNCED_MESSAGE =
  "Some folders couldn't sync to your account. They're still saved on this device."
export const ALERTS_UNSYNCED_MESSAGE =
  "Some alerts couldn't sync to your account. They're still saved on this device."

/**
 * The JSON text Postgres stores for a jsonb value: like JSON.stringify, but
 * with a space after every comma and colon. The database's size limits are
 * measured on this text, so the app measures the same thing.
 */
export function jsonbText(value) {
  if (Array.isArray(value)) return `[${value.map(jsonbText).join(', ')}]`
  if (value && typeof value === 'object') {
    const parts = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${JSON.stringify(k)}: ${jsonbText(v)}`)
    return `{${parts.join(', ')}}`
  }
  return JSON.stringify(value) ?? 'null'
}

const byteLength = (text) => new TextEncoder().encode(text).length
const sizeOk = (text, min, max) => typeof text === 'string' && text.length >= min && text.length <= max

/** Whether one folder fits the database's limits for a row. */
export function folderFits(folder) {
  const ids = folder?.assetIds
  return (
    sizeOk(folder?.id, 1, MAX_FOLDER_ID) &&
    sizeOk(folder?.name, 0, MAX_FOLDER_NAME) &&
    Array.isArray(ids) &&
    ids.length <= MAX_FOLDER_ASSETS &&
    byteLength(jsonbText(ids)) <= MAX_ASSET_IDS_BYTES
  )
}

/** Whether one alert rule fits the database's limits for a row. */
export function alertFits(assetId, rule) {
  return (
    sizeOk(assetId, 1, MAX_ALERT_ASSET_ID) &&
    rule !== null &&
    typeof rule === 'object' &&
    !Array.isArray(rule) &&
    byteLength(jsonbText(rule)) <= MAX_RULE_BYTES
  )
}

/** A folder name as the app stores it: trimmed and cut to the limit. */
export function cleanFolderName(name) {
  return String(name ?? '').trim().slice(0, MAX_FOLDER_NAME)
}
