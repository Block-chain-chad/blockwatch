import { useState } from 'react'
import Header from '../components/Header'
import { usePrices } from '../state/PricesContext'
import { useFolders, useFolder } from '../state/FoldersContext'
import { folderDayChange } from '../lib/prices'
import {
  FolderIcon,
  ChevronRight,
  ChevronLeft,
  PlusIcon,
  DotsIcon,
  PencilIcon,
  TrashIcon,
} from '../components/Icons'
import {
  AssetRow,
  FilterChips,
  filterAssets,
  formatPct,
  changeColor,
} from '../components/shared'
import PromptSheet from '../overlays/PromptSheet'
import SearchOverlay from '../overlays/SearchOverlay'

export function FoldersList({ onOpenProfile, onOpenFolder }) {
  const { assets } = usePrices()
  const { folders, createFolder } = useFolders()
  const [creating, setCreating] = useState(false)

  return (
    <div className="pb-24">
      <Header title="Folders" onOpenProfile={onOpenProfile} />

      <div className="mt-1 divide-y divide-zinc-900">
        {folders.map((f) => {
          const change = folderDayChange(f, assets)
          return (
            <button
              key={f.id}
              onClick={() => onOpenFolder(f.id)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors active:bg-zinc-900"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400">
                <FolderIcon size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{f.name}</div>
                <div className="text-xs text-zinc-500">
                  {f.assetIds.length} asset{f.assetIds.length === 1 ? '' : 's'}
                </div>
              </div>
              {f.assetIds.length === 0 ? (
                <span className="text-xs text-zinc-600">empty</span>
              ) : change == null ? (
                <span className="h-3.5 w-12 animate-pulse rounded bg-zinc-800" />
              ) : (
                <div className={`text-sm font-medium tabular-nums ${changeColor(change)}`}>
                  {formatPct(change)}
                </div>
              )}
              <ChevronRight size={18} className="text-zinc-600" />
            </button>
          )
        })}
      </div>

      {folders.length === 0 && (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">
            Folders group assets your way — one asset can live in many.
          </p>
        </div>
      )}

      <div className="px-4 pt-4">
        <button
          onClick={() => setCreating(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 py-3.5 text-sm font-medium text-zinc-400 transition-colors active:bg-zinc-900"
        >
          <PlusIcon size={18} />
          New folder
        </button>
      </div>

      {creating && (
        <PromptSheet
          title="New folder"
          placeholder="e.g. Energy, Chips & AI"
          submitLabel="Create"
          onClose={() => setCreating(false)}
          onSubmit={(name) => onOpenFolder(createFolder(name))}
        />
      )}
    </div>
  )
}

/* Rename / Delete action sheet for a folder. */
function FolderMenu({ folder, onClose, onRename, onDelete }) {
  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full rounded-t-3xl bg-zinc-950 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-800" />
        <div className="truncate px-5 pb-1 pt-4 text-sm text-zinc-500">{folder.name}</div>
        <button
          onClick={() => {
            onClose()
            onRename()
          }}
          className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px] transition-colors active:bg-zinc-900"
        >
          <PencilIcon size={19} className="text-zinc-400" />
          Rename folder
        </button>
        <button
          onClick={() => {
            onClose()
            onDelete()
          }}
          className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-[15px] transition-colors active:bg-zinc-900"
        >
          <TrashIcon size={19} className="text-zinc-400" />
          Delete folder
        </button>
      </div>
    </div>
  )
}

export function FolderDetail({ folderId, onBack, onOpenProfile, onOpenAsset }) {
  const [filter, setFilter] = useState('all')
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [picking, setPicking] = useState(false)
  const { assets } = usePrices()
  const { renameFolder, deleteFolder } = useFolders()
  const folder = useFolder(folderId)

  if (!folder) return null // deleted (and not undone) — App routes back to the list

  const members = assets.filter((a) => folder.assetIds.includes(a.id))
  const visible = filterAssets(members, filter)
  const change = folderDayChange(folder, assets)

  return (
    <div className="pb-24">
      <header className="flex items-center justify-between px-2 pb-3 pt-5">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 py-1 pl-1 pr-3 text-accent transition-opacity active:opacity-60"
        >
          <ChevronLeft size={20} />
          <span className="text-[15px]">Folders</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Folder options"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors active:bg-zinc-800"
          >
            <DotsIcon size={20} />
          </button>
          <button
            onClick={onOpenProfile}
            aria-label="Profile"
            className="mr-2 flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300 active:bg-zinc-700"
          >
            M
          </button>
        </div>
      </header>

      <div className="px-4 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">{folder.name}</h1>
        <div className="mt-0.5 text-sm text-zinc-500">
          {members.length} asset{members.length === 1 ? '' : 's'}
          {change != null && (
            <>
              {' · '}
              <span className={`tabular-nums ${changeColor(change)}`}>
                {formatPct(change)} today
              </span>
            </>
          )}
        </div>
      </div>

      {members.length > 0 && <FilterChips value={filter} onChange={setFilter} />}

      <div className="mt-1 divide-y divide-zinc-900">
        {visible.map((a) => (
          <AssetRow key={a.id} asset={a} onOpen={onOpenAsset} />
        ))}
      </div>

      {members.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-zinc-400">No assets here yet.</p>
          <button
            onClick={() => setPicking(true)}
            className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-zinc-950 active:bg-accent-dim"
          >
            Add your first asset
          </button>
        </div>
      ) : (
        <div className="px-4 pt-3">
          <button
            onClick={() => setPicking(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-800 py-3 text-sm font-medium text-zinc-400 transition-colors active:bg-zinc-900"
          >
            <PlusIcon size={17} />
            Add assets
          </button>
        </div>
      )}

      {visible.length === 0 && members.length > 0 && (
        <div className="px-6 pt-8 text-center text-sm text-zinc-500">
          Nothing in this category — try another filter.
        </div>
      )}

      {menuOpen && (
        <FolderMenu
          folder={folder}
          onClose={() => setMenuOpen(false)}
          onRename={() => setRenaming(true)}
          onDelete={() => {
            deleteFolder(folder.id)
            onBack()
          }}
        />
      )}

      {renaming && (
        <PromptSheet
          title="Rename folder"
          placeholder="Folder name"
          initial={folder.name}
          submitLabel="Save"
          onClose={() => setRenaming(false)}
          onSubmit={(name) => renameFolder(folder.id, name)}
        />
      )}

      {picking && (
        <SearchOverlay pickerFolderId={folder.id} onClose={() => setPicking(false)} />
      )}
    </div>
  )
}
