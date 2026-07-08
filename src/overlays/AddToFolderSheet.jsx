import { useState } from 'react'
import { useFolders } from '../state/FoldersContext'
import { CheckCircleIcon, PlusIcon, FolderIcon } from '../components/Icons'
import PromptSheet from './PromptSheet'

/* Multi-folder tagging: toggle which folders contain this asset. */
export default function AddToFolderSheet({ asset, onClose }) {
  const { folders, toggleAssetInFolder, createFolder } = useFolders()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <div className="fixed inset-0 z-50 mx-auto flex max-w-md items-end">
        <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
        <div className="relative w-full rounded-t-3xl bg-zinc-950 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-800" />
          <h2 className="px-5 pt-4 text-base font-semibold">
            {asset.ticker} <span className="font-normal text-zinc-500">in folders</span>
          </h2>
          <p className="px-5 pt-0.5 text-xs text-zinc-500">
            An asset can live in as many folders as you like.
          </p>

          <div className="mt-3 max-h-[45vh] divide-y divide-zinc-900 overflow-y-auto">
            {folders.map((f) => {
              const member = f.assetIds.includes(asset.id)
              return (
                <button
                  key={f.id}
                  onClick={() => toggleAssetInFolder(f.id, asset.id)}
                  className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors active:bg-zinc-900"
                >
                  <FolderIcon size={19} className="text-zinc-500" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px]">{f.name}</span>
                    <span className="text-xs text-zinc-500">
                      {f.assetIds.length} asset{f.assetIds.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  {member ? (
                    <CheckCircleIcon size={22} className="text-accent" />
                  ) : (
                    <span className="h-[22px] w-[22px] rounded-full border border-zinc-700" />
                  )}
                </button>
              )
            })}
          </div>

          <div className="px-4 pt-2">
            <button
              onClick={() => setCreating(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 py-3 text-sm font-medium text-zinc-400 transition-colors active:bg-zinc-900"
            >
              <PlusIcon size={17} />
              New folder
            </button>
          </div>
        </div>
      </div>

      {creating && (
        <PromptSheet
          title="New folder"
          placeholder="e.g. Energy, Chips & AI"
          submitLabel="Create"
          onClose={() => setCreating(false)}
          onSubmit={(name) => {
            const id = createFolder(name)
            toggleAssetInFolder(id, asset.id)
          }}
        />
      )}
    </>
  )
}
