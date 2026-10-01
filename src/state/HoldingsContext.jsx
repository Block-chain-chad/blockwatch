import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabase'
import { track } from '../services/analytics'
import Sheet, { SheetTitle } from '../components/Sheet'
import { HOLDINGS_GUEST_KEY, holdingsUserKey, clearHoldingsCaches } from '../lib/holdingsKeys'
import { cleanHoldings, mergeGuest, importQuestion, skippedNotice, HOLDINGS_LIMIT } from '../lib/holdings'

const TABLE = 'user_holdings'
const SYNC_DEBOUNCE_MS = 800
const TOAST_MS = 5000
const NOTICE_MS = 8000

function read(key) {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage unavailable: holdings still work for this visit
  }
}

function forget(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // blocked storage holds nothing to remove
  }
}

const loadGuest = () => cleanHoldings(read(HOLDINGS_GUEST_KEY))

/**
 * This sign-in's cache: { holdings, pending, asked }. `pending` is a change
 * the server has not confirmed yet; `asked` is whether the device's guest
 * holdings were offered to the account during this sign-in.
 */
function loadCache(userId) {
  const c = read(holdingsUserKey(userId))
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null
  return { holdings: cleanHoldings(c.holdings), pending: c.pending === true, asked: c.asked === true }
}

/** The account's holdings, or null when they could not be read (offline, or no table yet). */
async function fetchAccount() {
  try {
    // Amounts are read as text: PostgREST sends numeric as a JSON number,
    // which loses digits past about 15.
    const { data, error } = await supabase.from(TABLE).select('asset_id,amount:amount::text,updated_at')
    if (error || !Array.isArray(data)) return null
    return cleanHoldings(data.map((r) => ({ assetId: r.asset_id, amount: r.amount, updatedAt: Date.parse(r.updated_at) })))
  } catch {
    return null
  }
}

/**
 * Make the account's rows match `list`. Deletions first, so a list at the
 * limit can swap one token for another under the database's row cap. True
 * only when the server confirmed both steps.
 */
async function pushAccount(userId, list) {
  try {
    let del = supabase.from(TABLE).delete().eq('user_id', userId)
    if (list.length) del = del.not('asset_id', 'in', `(${list.map((h) => `"${h.assetId}"`).join(',')})`)
    if ((await del).error) return false
    if (!list.length) return true
    const { error } = await supabase.from(TABLE).upsert(
      list.map((h) => ({
        user_id: userId,
        asset_id: h.assetId,
        amount: h.amount, // a string, so no digit is lost on the way
        updated_at: new Date(h.updatedAt || Date.now()).toISOString(),
      })),
    )
    return !error
  } catch {
    return false
  }
}

const HoldingsContext = createContext(null)

/**
 * Holdings: tokens and amounts a person typed in. Web only (src/webOnly.js).
 *
 * Guest: this device only, under bw.holdings.v1. Nothing about them leaves
 * the device.
 * Signed in: the account's rows in Supabase (user_holdings, row-level
 * security), with a cache under bw.holdings.u.<id> for instant paint. The
 * cache is cleared whenever that sign-in ends, however it ends. A change
 * the server has not confirmed stays marked `pending`, and wins over the
 * server on the next load. A failed read never wipes the cache or the
 * server. The device's guest holdings are never copied into an account
 * without asking (the prompt below).
 *
 * Every change goes through commit(). Removing applies at once with a
 * 5-second Undo.
 */
export function HoldingsProvider({ children }) {
  const { user, ready } = useAuth()
  const userId = user?.id ?? null
  // Whose list is showing: null for a guest, a user id when signed in,
  // undefined until that is known. Mirrored in a ref for async callbacks.
  const [owner, setOwner] = useState(undefined)
  const [holdings, setHoldings] = useState([])
  const [prompt, setPrompt] = useState(null)
  const [notice, setNotice] = useState(null)
  const [toast, setToast] = useState(null)
  const ownerRef = useRef(undefined)
  const listRef = useRef([])
  const pendingRef = useRef(false)
  const askedRef = useRef(false)
  const seqRef = useRef(0) // moves on every change, so a slow reply can tell it is out of date
  const syncTimer = useRef(null)
  const toastRef = useRef(null)
  const toastTimer = useRef(null)
  const noticeTimer = useRef(null)

  function show(list) {
    listRef.current = list
    setHoldings(list)
  }

  function saveCache(id) {
    write(holdingsUserKey(id), { holdings: listRef.current, pending: pendingRef.current, asked: askedRef.current })
  }

  async function push(id) {
    const seq = seqRef.current
    const ok = await pushAccount(id, listRef.current)
    if (ok && seq === seqRef.current && ownerRef.current === id) {
      pendingRef.current = false
      saveCache(id)
    }
    return ok
  }

  function schedulePush(id) {
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(() => push(id), SYNC_DEBOUNCE_MS)
  }

  function commit(list) {
    const id = ownerRef.current
    if (id === undefined) return false
    show(list)
    if (id === null) {
      write(HOLDINGS_GUEST_KEY, list)
      return true
    }
    seqRef.current++
    pendingRef.current = true
    saveCache(id)
    schedulePush(id)
    return true
  }

  function setTimed(set, timer, value, ms) {
    clearTimeout(timer.current)
    set(value)
    timer.current = setTimeout(() => set(null), ms)
  }

  // Who is signed in decides whose list shows. Runs on load and on every
  // sign-in, sign-out and session expiry.
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    clearTimeout(syncTimer.current)
    seqRef.current++
    clearHoldingsCaches(userId)
    toastRef.current = null
    setToast(null)
    setPrompt(null)
    setNotice(null)
    const cache = userId ? loadCache(userId) : null
    askedRef.current = cache?.asked ?? false
    pendingRef.current = cache?.pending ?? false
    show(userId ? (cache?.holdings ?? []) : loadGuest())
    ownerRef.current = userId
    setOwner(userId)
    if (!userId) return

    const seq = seqRef.current
    fetchAccount().then((account) => {
      if (cancelled) return
      if (account == null) {
        if (pendingRef.current) schedulePush(userId)
        return
      }
      if (pendingRef.current || seq !== seqRef.current) schedulePush(userId)
      else {
        show(account)
        saveCache(userId)
      }
      const guest = loadGuest()
      if (!askedRef.current && guest.length > 0) setPrompt({ count: guest.length })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, userId])

  async function addDeviceHoldings() {
    const id = ownerRef.current
    setPrompt(null)
    if (!id) return
    const before = listRef.current
    const { merged, skipped, left } = mergeGuest(before, loadGuest())
    clearTimeout(syncTimer.current)
    seqRef.current++
    const seq = seqRef.current
    pendingRef.current = true
    show(merged)
    saveCache(id)
    const ok = await pushAccount(id, merged)
    if (ownerRef.current !== id) return
    if (!ok) {
      // Keep the device copy and ask again next time. The account keeps
      // what it had.
      if (listRef.current === merged) show(before)
      saveCache(id)
      return
    }
    if (left.length) write(HOLDINGS_GUEST_KEY, left)
    else forget(HOLDINGS_GUEST_KEY)
    askedRef.current = true
    if (seq === seqRef.current) pendingRef.current = false
    saveCache(id)
    const said = skippedNotice(skipped)
    if (said) setTimed(setNotice, noticeTimer, said, NOTICE_MS)
  }

  function keepOnDevice() {
    setPrompt(null)
    askedRef.current = true
    if (ownerRef.current) saveCache(ownerRef.current)
  }

  /** 'added', 'exists', 'limit', or 'not-ready' while the list is still loading. */
  function add(assetId, amount) {
    const list = listRef.current
    if (list.some((h) => h.assetId === assetId)) return 'exists'
    if (list.length >= HOLDINGS_LIMIT) return 'limit'
    if (!commit([...list, { assetId, amount, updatedAt: Date.now() }])) return 'not-ready'
    track('holding_added', { source: 'typed' })
    return 'added'
  }

  function update(assetId, amount) {
    commit(listRef.current.map((h) => (h.assetId === assetId ? { ...h, amount, updatedAt: Date.now() } : h)))
  }

  /** Remove at once; `label` is the Undo toast's text ("Removed NVDAx"). */
  function remove(assetId, label) {
    const before = listRef.current
    if (!before.some((h) => h.assetId === assetId)) return
    if (!commit(before.filter((h) => h.assetId !== assetId))) return
    track('holding_removed')
    toastRef.current = { label, before }
    setTimed(setToast, toastTimer, toastRef.current, TOAST_MS)
  }

  function undo() {
    const t = toastRef.current
    toastRef.current = null
    clearTimeout(toastTimer.current)
    setToast(null)
    if (t) commit(t.before)
  }

  const value = { holdings, loaded: owner !== undefined, signedIn: Boolean(owner), add, update, remove }
  return (
    <HoldingsContext.Provider value={value}>
      {children}
      {prompt && <ImportPrompt count={prompt.count} onAdd={addDeviceHoldings} onKeep={keepOnDevice} />}
      {toast && <Toast label={toast.label} onUndo={undo} />}
      {!toast && notice && <Toast label={notice} />}
    </HoldingsContext.Provider>
  )
}

export function useHoldings() {
  return useContext(HoldingsContext)
}

/* The first sign-in question, asked once per sign-in. Closing it keeps the
   holdings on this device, like the second button. */
function ImportPrompt({ count, onAdd, onKeep }) {
  return (
    <Sheet onClose={onKeep} className="z-[65]">
      <SheetTitle className="px-1 text-[15px] font-medium leading-relaxed text-zinc-100">{importQuestion(count)}</SheetTitle>
      <div className="mt-4 flex flex-col gap-2">
        <button
          onClick={onAdd}
          className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
        >
          Add to my account
        </button>
        <button
          onClick={onKeep}
          className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-300 transition-colors active:bg-zinc-800"
        >
          Keep on this device only
        </button>
      </div>
    </Sheet>
  )
}

/* Same place and look as the folders' Undo toast (components/UndoToast.jsx). */
function Toast({ label, onUndo }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] mx-auto flex max-w-md justify-center px-4">
      <div className="pointer-events-auto flex w-full items-center justify-between gap-3 rounded-xl bg-zinc-800 px-4 py-3 shadow-lg ring-1 ring-zinc-700/60">
        <span className="text-sm text-zinc-200">{label}</span>
        {onUndo && (
          <button onClick={onUndo} className="shrink-0 text-sm font-semibold text-accent transition-opacity active:opacity-60">
            Undo
          </button>
        )}
      </div>
    </div>
  )
}
