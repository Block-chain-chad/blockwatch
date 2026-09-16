import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The two folder events, from the only place that can fire them.
 *
 * Why a provider and not a click: there is no DOM in this suite (the
 * static-render pattern from overlays/SwapSheet.test.jsx), so the test
 * renders FoldersProvider, takes the context value out through a probe child,
 * and calls the real handler. A state update after a static render is a
 * no-op, which is exactly what is wanted here — the assertion is about the
 * event, not about the folder list.
 *
 * What is being defended:
 *   1. Rendering fires nothing. React runs a component body twice under
 *      StrictMode and again on every re-render; an event in there would count
 *      one person many times and the retention numbers would be fiction.
 *   2. An action that changes nothing fires nothing — a removal, or a folder
 *      that is not there.
 *   3. Nothing identifying goes out: no folder name, no asset id.
 */

vi.mock('../services/analytics', () => ({ track: vi.fn(), deviceId: () => 'test-device' }))
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: null, ready: false }) }))

const { track } = await import('../services/analytics')
const { FoldersProvider, useFolders, WATCHLIST_ID } = await import('./FoldersContext')

// There is no localStorage under node, so the provider falls back to its
// seed: the reserved watchlist plus one "Popular" folder holding NVDA..NDX.
const SEEDED_FOLDER = 'popular'
const SEEDED_ASSET = 'nvidia-xstock'
const NEW_ASSET = 'gold-xstock'

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

beforeEach(() => {
  track.mockClear()
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('folder events', () => {
  it('fires nothing on render, however many times React renders', () => {
    mount()
    mount()
    mount()
    expect(track).not.toHaveBeenCalled()
  })

  it('counts a new folder once, with no properties at all', () => {
    const folders = mount()
    folders.createFolder('Chips and AI')
    expect(track).toHaveBeenCalledTimes(1)
    // No second argument: the name the user typed never leaves the device.
    expect(track).toHaveBeenCalledWith('folder_created')
  })

  it('counts an asset added to a folder, saying only which kind of list', () => {
    const folders = mount()
    folders.toggleAssetInFolder(SEEDED_FOLDER, NEW_ASSET)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('folder_asset_added', { list: 'folder' })
  })

  it('separates the reserved watchlist from a folder the user made', () => {
    const folders = mount()
    folders.toggleWatchlist(NEW_ASSET)
    expect(track).toHaveBeenCalledTimes(1)
    expect(track).toHaveBeenCalledWith('folder_asset_added', { list: 'watchlist' })
    expect(WATCHLIST_ID).toBeTruthy()
  })

  it('does not count a removal — only adding is a reason to come back', () => {
    const folders = mount()
    folders.toggleAssetInFolder(SEEDED_FOLDER, SEEDED_ASSET) // already a member
    expect(track).not.toHaveBeenCalled()
  })

  it('does not count a toggle against a folder that is not there', () => {
    const folders = mount()
    folders.toggleAssetInFolder('folder-that-was-deleted', NEW_ASSET)
    expect(track).not.toHaveBeenCalled()
  })

  it('never puts a folder name or an asset id in a property', () => {
    const folders = mount()
    folders.createFolder('Terra personal')
    folders.toggleAssetInFolder(SEEDED_FOLDER, NEW_ASSET)
    const sent = JSON.stringify(track.mock.calls)
    expect(sent).not.toContain('Terra personal')
    expect(sent).not.toContain(NEW_ASSET)
  })
})
