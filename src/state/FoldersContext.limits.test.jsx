import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The folder limits the account enforces, enforced first in the app: at most
 * 39 folders of your own (the 40th row is the hidden watchlist), names cut to
 * 100 characters, and no more than 1,000 assets in one folder. Same static
 * provider probe as FoldersContext.analytics.test.jsx.
 */

vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: null, ready: false }) }))

const { FoldersProvider, useFolders } = await import('./FoldersContext')

function mount() {
  let api = null
  function Probe() {
    api = useFolders()
    return null
  }
  renderToStaticMarkup(
    <FoldersProvider>
      <Probe />
    </FoldersProvider>,
  )
  return api
}

/** Start the device with these folders saved, as if from an earlier visit. */
function saved(folders) {
  vi.stubGlobal('localStorage', {
    getItem: (k) => (k === 'bw.folders.v1' ? JSON.stringify(folders) : null),
    setItem: () => {},
  })
}

const own = (n) => Array.from({ length: n }, (_, i) => ({ id: `f${i}`, name: `F${i}`, assetIds: [] }))

beforeEach(() => vi.unstubAllGlobals())
afterEach(() => vi.unstubAllGlobals())

describe('folder limits in the app', () => {
  it('makes folders up to 39, then refuses with nothing changed', () => {
    saved(own(37))
    const folders = mount()
    expect(folders.folderLimitReached).toBe(false)
    expect(folders.createFolder('One more')).toEqual(expect.any(String))
    expect(folders.createFolder('Last one')).toEqual(expect.any(String))
    expect(folders.createFolder('Too many')).toBeNull()
  })

  it('reports the limit to the screens once 39 folders exist', () => {
    saved(own(39))
    expect(mount().folderLimitReached).toBe(true)
  })

  it('refuses to add a 1,001st asset to a folder', () => {
    saved([{ id: 'full', name: 'Full', assetIds: Array.from({ length: 1000 }, (_, i) => `a${i}`) }])
    const folders = mount()
    expect(folders.toggleAssetInFolder('full', 'one-more')).toBe(false)
    expect(folders.toggleAssetInFolder('full', 'a1')).toBe(true) // removing still works
  })

  it('adds the asset to a folder made a moment ago in the same sheet', () => {
    saved(own(1))
    const folders = mount()
    const id = folders.createFolder('Fresh')
    expect(folders.toggleAssetInFolder(id, 'nvidia-xstock')).toBe(true)
  })

  it('shows no sync notice to someone who is not signed in', () => {
    expect(mount().syncNotice).toBeNull()
  })
})
