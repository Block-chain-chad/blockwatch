import { createContext, useContext, useEffect, useRef, useState } from 'react'

const STORAGE_KEY = 'bw.folders.v1'
const TOAST_MS = 5000

// Cold start: first launch pre-loads "Popular" so the app is alive immediately.
const SEED_FOLDERS = [
  {
    id: 'popular',
    name: 'Popular',
    assetIds: ['nvidia-xstock', 'apple-xstock', 'tesla-xstock', 'sp500-xstock', 'nasdaq-xstock'],
  },
]

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // corrupted storage — fall through to seed
  }
  return SEED_FOLDERS
}

function newId() {
  return crypto.randomUUID?.() ?? `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const FoldersContext = createContext(null)

/**
 * User folders. Folders are tags, not containers — an asset can live in many.
 * Persisted to localStorage on every change. Destructive actions (delete
 * folder, remove asset) never confirm; they apply optimistically and offer a
 * 5-second Undo toast that restores the pre-action snapshot.
 */
export function FoldersProvider({ children }) {
  const [folders, setFolders] = useState(load)
  const [toast, setToast] = useState(null) // { label, snapshot }
  const foldersRef = useRef(folders)
  const timerRef = useRef(null)

  useEffect(() => {
    foldersRef.current = folders
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(folders))
    } catch {
      // storage unavailable — folders still work for the session
    }
  }, [folders])

  function showUndoToast(label, snapshot) {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ label, snapshot })
    timerRef.current = setTimeout(() => setToast(null), TOAST_MS)
  }

  function undo() {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast((t) => {
      if (t) setFolders(t.snapshot)
      return null
    })
  }

  function createFolder(name) {
    const id = newId()
    setFolders((prev) => [...prev, { id, name: name.trim(), assetIds: [] }])
    return id
  }

  function renameFolder(id, name) {
    setFolders((prev) => prev.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)))
  }

  function deleteFolder(id) {
    const prev = foldersRef.current
    const folder = prev.find((f) => f.id === id)
    if (!folder) return
    setFolders(prev.filter((f) => f.id !== id))
    showUndoToast(`Deleted “${folder.name}”`, prev)
  }

  /** Add/remove an asset from a folder (multi-folder tagging). */
  function toggleAssetInFolder(folderId, assetId) {
    const prev = foldersRef.current
    const folder = prev.find((f) => f.id === folderId)
    if (!folder) return
    const removing = folder.assetIds.includes(assetId)
    setFolders(
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              assetIds: removing
                ? f.assetIds.filter((x) => x !== assetId)
                : [...f.assetIds, assetId],
            }
          : f
      )
    )
    if (removing) showUndoToast(`Removed from “${folder.name}”`, prev)
  }

  const value = { folders, toast, undo, createFolder, renameFolder, deleteFolder, toggleAssetInFolder }
  return <FoldersContext.Provider value={value}>{children}</FoldersContext.Provider>
}

export function useFolders() {
  return useContext(FoldersContext)
}

export function useFolder(id) {
  return useContext(FoldersContext).folders.find((f) => f.id === id) ?? null
}
