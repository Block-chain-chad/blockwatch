import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePrices } from './PricesContext'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabase'
import { premiumPct } from '../lib/prices'

const STORAGE_KEY = 'bw.alerts.v1'
const MAX_EVENTS = 50
const SYNC_DEBOUNCE_MS = 800

// Mirror the signed-in user's rules to Supabase (fired events and read-state
// stay device-local — notifications are a per-device concern).
async function pushRules(userId, rules) {
  try {
    const entries = Object.entries(rules)
    if (entries.length > 0) {
      await supabase.from('user_alerts').upsert(
        entries.map(([assetId, r]) => ({
          user_id: userId,
          asset_id: assetId,
          threshold: r.threshold,
          updated_at: new Date().toISOString(),
        }))
      )
    }
    let del = supabase.from('user_alerts').delete().eq('user_id', userId)
    if (entries.length > 0) {
      del = del.not('asset_id', 'in', `(${entries.map(([id]) => `"${id}"`).join(',')})`)
    }
    await del
  } catch {
    // offline / not configured — next change retries
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return { rules: {}, states: {}, events: [], lastSeenAt: 0, ...parsed }
      }
    }
  } catch {
    // corrupted storage — start fresh
  }
  return { rules: {}, states: {}, events: [], lastSeenAt: 0 }
}

const AlertsContext = createContext(null)

/**
 * Premium-drift alerts. A rule is one symmetric threshold per asset:
 * "tell me when |premium| crosses ±X%".
 *
 * Crossing semantics (state machine per rule, 'inside' | 'outside' the band):
 * an event fires on the inside→outside transition, then the rule re-arms only
 * after the premium comes back inside — so a lingering drift alerts once, not
 * on every poll. A rule created while the asset is already outside fires on
 * the next evaluation (instant feedback), because its state starts 'inside'.
 */
export function AlertsProvider({ children }) {
  const { assets } = usePrices()
  const { user, ready } = useAuth()
  const [store, setStore] = useState(load)
  const storeRef = useRef(store)
  const hydratedForRef = useRef(null)
  const syncTimerRef = useRef(null)

  useEffect(() => {
    storeRef.current = store
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch {
      // storage unavailable — alerts still work for the session
    }
  }, [store])

  // Signed in: server rules replace local on sign-in (import local ones when
  // the account is fresh). Signing out keeps the last-known rules on the
  // device — logging out shouldn't silently kill someone's alerts.
  useEffect(() => {
    if (!ready) return
    let cancelled = false

    async function hydrate() {
      if (!user) {
        hydratedForRef.current = null
        return
      }
      if (hydratedForRef.current === user.id) return
      const { data, error } = await supabase.from('user_alerts').select('asset_id,threshold')
      if (cancelled) return
      hydratedForRef.current = user.id
      if (error) return // offline: keep local rules; sync resumes on next change
      if (data.length > 0) {
        setStore((prev) => ({
          ...prev,
          rules: Object.fromEntries(data.map((r) => [r.asset_id, { threshold: Number(r.threshold) }])),
          states: {}, // re-arm so already-drifted assets fire fresh on this device
        }))
      } else {
        const rules = storeRef.current.rules
        if (Object.keys(rules).length > 0) pushRules(user.id, rules)
      }
    }

    hydrate()
    return () => {
      cancelled = true
    }
  }, [user, ready])

  // Debounced mirror of rule changes while signed in.
  useEffect(() => {
    const identity = user?.id
    if (!identity || hydratedForRef.current !== identity) return
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current)
    syncTimerRef.current = setTimeout(() => pushRules(identity, storeRef.current.rules), SYNC_DEBOUNCE_MS)
  }, [store.rules, user])

  // Evaluate every rule whenever prices refresh (or rules change).
  useEffect(() => {
    const s = storeRef.current
    const ruleIds = Object.keys(s.rules)
    if (ruleIds.length === 0) return

    let changed = false
    const states = { ...s.states }
    const events = [...s.events]

    for (const assetId of ruleIds) {
      const asset = assets.find((a) => a.id === assetId)
      if (!asset) continue
      const p = premiumPct(asset)
      if (p == null) continue // price feed not ready — don't move the state machine

      const outside = Math.abs(p) >= s.rules[assetId].threshold
      const prev = states[assetId] ?? 'inside'
      if (outside && prev === 'inside') {
        events.unshift({
          id: `${assetId}-${Date.now()}`,
          kind: 'alert',
          assetId,
          ticker: asset.ticker,
          underlying: asset.underlying,
          premium: p,
          threshold: s.rules[assetId].threshold,
          at: Date.now(),
        })
        if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
        changed = true
      }
      const next = outside ? 'outside' : 'inside'
      if (next !== prev) {
        states[assetId] = next
        changed = true
      }
    }

    if (changed) setStore((prev) => ({ ...prev, states, events }))
  }, [assets, store.rules])

  function setAlert(assetId, threshold) {
    setStore((prev) => {
      const states = { ...prev.states }
      delete states[assetId] // reset to 'inside' so an already-drifted asset fires right away
      return { ...prev, rules: { ...prev.rules, [assetId]: { threshold } }, states }
    })
  }

  function removeAlert(assetId) {
    setStore((prev) => {
      const rules = { ...prev.rules }
      const states = { ...prev.states }
      delete rules[assetId]
      delete states[assetId]
      return { ...prev, rules, states }
    })
  }

  function markSeen() {
    setStore((prev) => ({ ...prev, lastSeenAt: Date.now() }))
  }

  const unread = store.events.some((e) => e.at > store.lastSeenAt)

  return (
    <AlertsContext.Provider
      value={{ rules: store.rules, events: store.events, unread, setAlert, removeAlert, markSeen }}
    >
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  return useContext(AlertsContext)
}
