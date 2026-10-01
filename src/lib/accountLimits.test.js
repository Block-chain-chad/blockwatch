import { describe, it, expect } from 'vitest'
import universe from '../data/universe.json'
import {
  MAX_FOLDERS,
  MAX_FOLDER_ROWS,
  alertFits,
  cleanFolderName,
  folderFits,
  jsonbText,
  FOLDER_LIMIT_MESSAGE,
  ALERT_LIMIT_MESSAGE,
  FOLDERS_UNSYNCED_MESSAGE,
  ALERTS_UNSYNCED_MESSAGE,
  FOLDER_FULL_MESSAGE,
} from './accountLimits'

/*
 * The app's copy of the database limits in supabase/launch-limits.sql. If the
 * app let a row through that the database refuses, sync for the whole account
 * used to stop without a word.
 */

const folder = (over = {}) => ({ id: 'f1', name: 'Chips', assetIds: ['nvidia-xstock'], ...over })

describe('folder limits', () => {
  it('leaves one row of the 40 for the hidden watchlist', () => {
    expect(MAX_FOLDER_ROWS).toBe(40)
    expect(MAX_FOLDERS).toBe(39)
    expect(FOLDER_LIMIT_MESSAGE).toBe('You can have up to 39 folders.')
  })

  it('fits every token in the app in one folder', () => {
    expect(folderFits(folder({ assetIds: universe.map((a) => a.id) }))).toBe(true)
  })

  it('refuses what the database refuses', () => {
    expect(folderFits(folder({ name: 'x'.repeat(101) }))).toBe(false)
    expect(folderFits(folder({ id: '' }))).toBe(false)
    expect(folderFits(folder({ id: 'x'.repeat(65) }))).toBe(false)
    expect(folderFits(folder({ assetIds: Array.from({ length: 1001 }, (_, i) => `a${i}`) }))).toBe(false)
    expect(folderFits(folder({ assetIds: Array.from({ length: 600 }, (_, i) => `${'i'.repeat(60)}${i}`) }))).toBe(false)
    expect(folderFits(folder({ assetIds: null }))).toBe(false)
  })

  it('cuts a typed name to 100 characters and trims it', () => {
    expect(cleanFolderName(`  ${'n'.repeat(150)}  `)).toHaveLength(100)
    expect(cleanFolderName('  Energy ')).toBe('Energy')
  })
})

describe('alert limits', () => {
  it('accepts a real rule and refuses an oversized or malformed one', () => {
    expect(alertFits('nvidia-xstock', { drift: { threshold: 2 }, price: { target: 120.5, direction: 'above' } })).toBe(true)
    expect(alertFits('nvidia-xstock', { note: 'x'.repeat(600) })).toBe(false)
    expect(alertFits('nvidia-xstock', [1])).toBe(false)
    expect(alertFits('', { drift: { threshold: 1 } })).toBe(false)
  })
})

describe('jsonbText', () => {
  it('measures what Postgres stores, with a space after commas and colons', () => {
    expect(jsonbText(['a', 'b'])).toBe('["a", "b"]')
    expect(jsonbText({ a: 1, b: { c: [true, null] }, d: undefined })).toBe('{"a": 1, "b": {"c": [true, null]}}')
  })
})

describe('messages', () => {
  it('are plain, spelled out and free of em dashes', () => {
    for (const m of [FOLDER_LIMIT_MESSAGE, ALERT_LIMIT_MESSAGE, FOLDERS_UNSYNCED_MESSAGE, ALERTS_UNSYNCED_MESSAGE, FOLDER_FULL_MESSAGE]) {
      expect(m).not.toMatch(/—|OnStock/)
      expect(m).toMatch(/\.$/)
    }
  })
})
