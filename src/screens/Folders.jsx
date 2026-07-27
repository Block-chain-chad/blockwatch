import { useState } from 'react'
import Header, { AvatarButton } from '../components/Header'
import { usePrices, useAssetSubscription } from '../state/PricesContext'
import { useFolders, useFolder } from '../state/FoldersContext'
import { useSparklines } from '../hooks/useSparklines'
import { premiumPct, isThinlyTraded } from '../lib/prices'
import {
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
import AssetLogo from '../components/AssetLogo'
import PromptSheet from '../overlays/PromptSheet'
import SearchOverlay from '../overlays/SearchOverlay'

export function FoldersList({ onOpenProfile, onOpenFolder }) {
  const { assets } = usePrices()
  const { folders, createFolder } = useFolders()
  const [creating, setCreating] = useState(false)

  return (
    <div className="pb-24">
      <Header title="Folders" onOpenProfile={onOpenProfile} />

      {/* A folder row carries its contents now: who is inside, and the average
          gap across them. It used to show a day change, which is the metric
          every other tracker leads with — the gap is the one this app owns, so
          folders are measured in it too. The logo stack means a row is
          recognisable without opening it, which matters on a screen that was
          otherwise two rows and 570px of nothing. */}
      <div>
        {folders.map((f) => {
          const members = f.assetIds.map((id) => assets.find((a) => a.id === id)).filter(Boolean)
          const liquid = members.filter((a) => !isThinlyTraded(a))
          const gaps = liquid.map(premiumPct).filter((p) => p != null)
          const avgGap = gaps.length ? gaps.reduce((s, p) => s + p, 0) / gaps.length : null
          return (
            <button
              key={f.id}
              onClick={() => onOpenFolder(f.id)}
              className="hover-row flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors active:bg-zinc-900"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="min-w-0 flex-1">
                <div className="t-label truncate text-zinc-100">{f.name}</div>
                <div className="mt-1.5 flex items-center gap-2">
                  {members.length > 0 ? (
                    <>
                      <span className="flex -space-x-1.5">
                        {members.slice(0, 5).map((a) => (
                          <span
                            key={a.id}
                            className="rounded-full ring-2"
                            style={{ '--tw-ring-color': 'var(--color-zinc-950)' }}
                          >
                            <AssetLogo asset={a} size={18} />
                          </span>
                        ))}
                      </span>
                      <span className="t-caption text-zinc-500">
                        {members.length > 5 ? `+${members.length - 5} more` : `${members.length} assets`}
                      </span>
                    </>
                  ) : (
                    <span className="t-caption text-zinc-600">Empty — add assets from search</span>
                  )}
                </div>
              </div>
              {avgGap != null && (
                <div className="shrink-0 text-right">
                  <div className={`num t-label ${changeColor(avgGap)}`}>{formatPct(avgGap)}</div>
                  <div className="t-caption mt-0.5 text-zinc-600">avg gap</div>
                </div>
              )}
              <ChevronRight size={18} className="shrink-0 text-zinc-600" />
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
          className="t-label flex w-full items-center justify-center gap-2 rounded-lg border border-dashed py-3 text-zinc-400 transition-colors active:bg-zinc-900"
          style={{ borderColor: 'var(--border-default)' }}
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
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
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
  const { assets, marketOpen } = usePrices()
  const { renameFolder, deleteFolder } = useFolders()
  const folder = useFolder(folderId)

  // Member rows show premium pills — quotes only flow for subscribed assets.
  useAssetSubscription(`folder:${folderId}`, folder?.assetIds ?? [])
  const sparks = useSparklines(folder?.assetIds ?? [])

  if (!folder) return null // deleted (and not undone) — App routes back to the list

  const members = assets.filter((a) => folder.assetIds.includes(a.id))
  const visible = filterAssets(members, filter)
  // Same measure as the folder list: the average gap across liquid members.
  const gaps = members.filter((a) => !isThinlyTraded(a)).map(premiumPct).filter((p) => p != null)
  const avgGap = gaps.length ? gaps.reduce((s, p) => s + p, 0) / gaps.length : null

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
          <AvatarButton onClick={onOpenProfile} className="mr-2" />
        </div>
      </header>

      <div className="px-4 pb-4">
        <h1 className="t-title">{folder.name}</h1>
        <div className="t-caption mt-0.5 text-zinc-500">
          {members.length} asset{members.length === 1 ? '' : 's'}
          {avgGap != null && (
            <>
              {' · avg gap '}
              <span className={`num ${changeColor(avgGap)}`}>{formatPct(avgGap)}</span>
            </>
          )}
        </div>
      </div>

      {members.length > 0 && <FilterChips value={filter} onChange={setFilter} />}

      {visible.length > 0 && (
        <div
          className="mt-2 flex items-baseline justify-between border-b px-4 pb-1.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <span className="t-micro text-zinc-500">Asset</span>
          <span className="t-micro text-zinc-500">Gap · token / stock</span>
        </div>
      )}

      <div>
        {visible.map((a) => (
          <AssetRow
            key={a.id}
            asset={a}
            onOpen={onOpenAsset}
            spark={sparks[a.id]}
            marketOpen={marketOpen}
          />
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
