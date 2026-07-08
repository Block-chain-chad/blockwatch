import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabase'

const ANON_KEY = 'bw.folders.v1'
const TOAST_MS = 5000
const SYNC_DEBOUNCE_MS = 800

// Cold start: first launch pre-loads "Popular" so the app is alive immediately.
const SEED_FOLDERS = [
  {
    id: 'popular',
    name: 'Popular',
    assetIds: ['nvidia-xstock', 'apple-xstock', 'tesla-xstock', 'sp500-xstock', 'nasdaq-xstock'],
  },
]

function loadLocal(key = ANON_KEY) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed
    }
  } catch {
    // corrupted storage — fall through to seed
  }
  return key === ANON_KEY ? SEED_FOLDERS : null
}

function saveLocal(key, folders) {
  try {
    localStorage.setItem(key, JSON.stringify(folders))
  } catch {
    // storage unavailable — folders still work for the session
  }
}

async function pushToServer(userId, folders) {
  try {
    if (folders.length > 0) {
      await supabase.from('user_folders').upsert(
        folders.map((f) => ({
          user_id: userId,
          id: f.id,
          name: f.name,
          asset_ids: f.assetIds,
          updated_at: new Date().toISOString(),
        }))
      )
    }
    // Reconcile deletions: remove server rows no longer present locally.
    let del = supabase.from('user_folders').delete().eq('user_id', userId)
    if (folders.length > 0) {
      del = del.not('id', 'in', `(${folders.map((f) => `"${f.id}"`).join(',')})`)
    }
    await del
  } catch {
    // offline / not configured — next change retries; local copy is intact
  }
}

function newId() {
  return crypto.randomUUID?.() ?? `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const FoldersContext = createContext(null)

/**
 * User folders. Folders are tags, not containers — an asset can live in many.
 *
 * Anonymous: localStorage only (exactly the pre-accounts behavior).
 * Signed in: Supabase is the source of truth (per-user rows behind RLS) with a
 * per-user localStorage cache for instant paint; every change syncs debounced.
 * First sign-in on an empty account imports the device's existing folders.
 *
 * Destructive actions never confirm; they apply optimistically and offer a
 * 5-second Undo toast that restores the pre-action snapshot.
 */
export function FoldersProvider({ children }) {
  const { user, ready } = useAuth()
  const [folders, setFolders] = useState(() => loadLocal())
  const [toast, setToast] = useState(null)
  const foldersRef = useRef(folders)
  const timerRef = useRef(null)
  const syncTimerRef = useRef(null)
  // Which identity the current state belongs to: null = anonymous, else user id.
  // Guards against persisting one identity's folders under another's key
  // during the sign-in/out transition.
  const hydratedForRef = useRef(null)

  useEffect(() => {
    foldersRef.current = folders
    const identity = user?.id ?? null
    if (hydratedForRef.current !== identity) return // mid-transition; hydration effect owns state
    if (identity === null) {
      saveLocal(ANON_KEY, folders)
    } else {
      saveLocal(`bw.folders.u.${identity}`, folders)
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
      syncTimerRef.current = setTimeout(() => pushToServer(identity, foldersRef.current), SYNC_DEBOUNCE_MS)
    }
  }, [folders, user])

  // Hydrate on sign-in/out.
  useEffect(() => {
    if (!ready) return
    let cancelled = false

    async function hydrate() {
      if (!user) {
        if (hydratedForRef.current !== null) {
          hydratedForRef.current = null
          setFolders(loadLocal())
        }
        return
      }
      if (hydratedForRef.current === user.id) return

      // Instant paint from this user's local cache while the fetch runs.
      const cached = loadLocal(`bw.folders.u.${user.id}`)
      if (cached) setFolders(cached)

      const { data, error } = await supabase.from('user_folders').select('id,name,asset_ids')
      if (cancelled) return
      if (error) {
        // Offline: run on the cache (or keep current view); sync resumes later.
        hydratedForRef.current = user.id
        return
      }
      if (data.length > 0) {
        hydratedForRef.current = user.id
        setFolders(data.map((r) => ({ id: r.id, name: r.name, assetIds: r.asset_ids ?? [] })))
      } else {
        // Fresh account: import whatever this device already had ("import my folders").
        const device = loadLocal()
        hydratedForRef.current = user.id
        setFolders(device)
        pushToServer(user.id, device)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [user, ready])

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
