import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'

/*
 * The folder screens say the account limits plainly: New folder is disabled
 * at the limit with the reason under it, the name field stops at 100
 * characters, and a quiet line says when some folders could not sync.
 */

vi.hoisted(() => {
  globalThis.window = { location: { origin: 'https://onstock.test', protocol: 'https:' } }
})

const state = vi.hoisted(() => ({ limit: false, notice: null }))
vi.mock('../state/FoldersContext', () => ({
  useFolders: () => ({
    folders: [{ id: 'f1', name: 'Chips', assetIds: [] }],
    createFolder: () => null,
    toggleAssetInFolder: () => true,
    folderLimitReached: state.limit,
    syncNotice: state.notice,
  }),
  useFolder: () => null,
}))
vi.mock('../state/PricesContext', () => ({ usePrices: () => ({ assets: [] }), useAssetSubscription: () => {} }))
vi.mock('../state/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

const { FoldersList } = await import('./Folders')
const { default: AddToFolderSheet } = await import('../overlays/AddToFolderSheet')
const { default: PromptSheet } = await import('../overlays/PromptSheet')

const NOTICE = "Some folders couldn't sync to your account. They're still saved on this device."

beforeEach(() => {
  vi.stubGlobal('document', { activeElement: null })
  state.limit = false
  state.notice = null
})
afterEach(() => vi.unstubAllGlobals())

const list = () => renderToStaticMarkup(<FoldersList onOpenProfile={() => {}} onOpenFolder={() => {}} />)
const sheet = () =>
  renderToStaticMarkup(<AddToFolderSheet asset={{ id: 'a', ticker: 'NVDAx' }} onClose={() => {}} />)

describe('folder limits on screen', () => {
  it('disables New folder at the limit and says why, on both screens', () => {
    state.limit = true
    for (const html of [list(), sheet()]) {
      expect(html).toContain('You can have up to 39 folders.')
      expect(html).toMatch(/<button disabled=""[^>]*>.*New folder<\/button>/s)
    }
  })

  it('says nothing about limits when there is room', () => {
    for (const html of [list(), sheet()]) {
      expect(html).not.toContain('up to 39')
      expect(html).not.toMatch(/<button disabled=""[^>]*>.*New folder/s)
    }
  })

  it('shows the quiet sync notice when some folders could not sync', () => {
    state.notice = NOTICE
    expect(list()).toContain('still saved on this device')
    expect(sheet()).toContain('still saved on this device')
  })

  it('stops the folder name field at 100 characters', () => {
    const html = renderToStaticMarkup(
      <PromptSheet title="New folder" submitLabel="Create" onSubmit={() => {}} onClose={() => {}} />,
    )
    expect(html).toContain('maxLength="100"')
  })
})
