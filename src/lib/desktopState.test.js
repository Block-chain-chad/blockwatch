import { describe, it, expect } from 'vitest'
import { pickInitialAsset, resolveListSource, stepId, WATCHLIST_SOURCE } from './desktopState'

describe('pickInitialAsset', () => {
  const known = new Set(['nvda', 'tsla', 'aapl'])

  it('prefers the remembered asset', () => {
    expect(pickInitialAsset({ saved: 'tsla', recent: ['aapl'], watchlistIds: ['nvda'], known })).toBe('tsla')
  })

  it('falls back to the most recent view, then the first watchlist row', () => {
    expect(pickInitialAsset({ saved: null, recent: ['aapl', 'nvda'], watchlistIds: ['nvda'], known })).toBe('aapl')
    expect(pickInitialAsset({ saved: null, recent: [], watchlistIds: ['nvda', 'tsla'], known })).toBe('nvda')
  })

  it('returns null when nothing is available', () => {
    expect(pickInitialAsset({ known })).toBeNull()
    expect(pickInitialAsset()).toBeNull()
  })

  it('skips ids that no longer exist at every rung', () => {
    expect(pickInitialAsset({ saved: 'gone', recent: ['gone2', 'tsla'], watchlistIds: [], known })).toBe('tsla')
    expect(pickInitialAsset({ saved: 'gone', recent: ['gone2'], watchlistIds: ['gone3', 'aapl'], known })).toBe('aapl')
    expect(pickInitialAsset({ saved: 'gone', recent: ['gone2'], watchlistIds: ['gone3'], known })).toBeNull()
  })

  it('trusts every id when no universe is given', () => {
    expect(pickInitialAsset({ saved: 'anything' })).toBe('anything')
  })
})

describe('resolveListSource', () => {
  const folders = [
    { id: 'f1', name: 'AI', assetIds: ['nvda', 'amd'] },
    { id: 'f2', name: 'Empty' },
  ]
  const watchlistIds = ['tsla']

  it('is the watchlist by default and by name', () => {
    for (const src of [undefined, null, WATCHLIST_SOURCE]) {
      expect(resolveListSource(src, folders, watchlistIds)).toEqual({
        id: 'watchlist',
        name: 'Watchlist',
        assetIds: ['tsla'],
        isFolder: false,
        missing: false,
      })
    }
  })

  it('resolves a folder by id, with its name and rows', () => {
    expect(resolveListSource('f1', folders, watchlistIds)).toEqual({
      id: 'f1',
      name: 'AI',
      assetIds: ['nvda', 'amd'],
      isFolder: true,
      missing: false,
    })
    expect(resolveListSource('f2', folders, watchlistIds).assetIds).toEqual([])
  })

  it('falls back to the watchlist and flags a folder that is gone', () => {
    const r = resolveListSource('deleted', folders, watchlistIds)
    expect(r.id).toBe('watchlist')
    expect(r.assetIds).toEqual(['tsla'])
    expect(r.missing).toBe(true)
  })

  it('copes with no folders and no watchlist', () => {
    expect(resolveListSource('f1').missing).toBe(true)
    expect(resolveListSource('watchlist').assetIds).toEqual([])
  })
})

describe('stepId', () => {
  const ids = ['a', 'b', 'c']

  it('steps forward and back', () => {
    expect(stepId(ids, 'a', 1)).toBe('b')
    expect(stepId(ids, 'b', -1)).toBe('a')
  })

  it('wraps at both ends', () => {
    expect(stepId(ids, 'c', 1)).toBe('a')
    expect(stepId(ids, 'a', -1)).toBe('c')
    expect(stepId(ids, 'a', 4)).toBe('b')
    expect(stepId(ids, 'a', -4)).toBe('c')
  })

  it('enters from the top on ↓ and the bottom on ↑ when the current id is not listed', () => {
    expect(stepId(ids, 'zzz', 1)).toBe('a')
    expect(stepId(ids, null, 1)).toBe('a')
    expect(stepId(ids, 'zzz', -1)).toBe('c')
  })

  it('returns null for an empty or missing list', () => {
    expect(stepId([], 'a', 1)).toBeNull()
    expect(stepId(null, 'a', 1)).toBeNull()
  })
})
