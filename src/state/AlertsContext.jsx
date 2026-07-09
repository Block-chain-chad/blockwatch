import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePrices } from './PricesContext'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabase'
import { premiumPct } from '../lib/prices'

const STORAGE_KEY = 'bw.alerts.v1'
const MAX_EVENTS = 50
const SYNC_DEBOUNCE_MS = 800

// A rule can hold two independent alert types per asset:
//   drift: { threshold }         — |premium| crosses ±threshold%; re-arms when
//                                  the gap comes back inside the band.
//   price: { target, direction } — token price crosses the target; one-shot,
//                                  removes itself after firing.
function migrateRules(raw) {
  const out = {}
  for (const [id, r] of Object.entries(raw ?? {})) {
    if (!r) continue
    if (r.drift || r.price) out[id] = r
    else if (r.threshold != null) out[id] = { drift: { threshold: r.threshold } } // pre-price-alert shape
  }
  return out
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') {
        return {
          states: {},
          events: [],
          lastSeenAt: 0,
          ...parsed,
          rules: migrateRules(parsed.rules),
        }
      }
    }
  } catch {
    // corrupted storage — start fresh
  }
  return { rules: {}, states: {}, events: [], lastSeenAt: 0 }
}

// Mirror the signed-in user's rules to Supabase (fired events and read-state
// stay device-local — notifications are a per-device concern). The legacy
// threshold column keeps a value for older rows; the full rule lives in jsonb.
async function pushRules(userId, rules) {
  try {
    const entries = Object.entries(rules)
    if (entries.length > 0) {
      await supabase.from('user_alerts').upsert(
        entries.map(([assetId, r]) => ({
          user_id: userId,
          asset_id: assetId,
          threshold: r.drift?.threshold ?? 0,
          rule: r,
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
    // offline / migration not run yet — next change retries
  }
}

const AlertsContext = createContext(null)

/**
 * Price alerts. Drift rules are a state machine per asset ('inside'/'outside'
 * the band) so a lingering gap alerts once, not on every poll; a rule created
 * while already outside fires on the next evaluation. Price-target rules are
 * one-shot: fire and self-remove.
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
      const { data, error } = await supabase.from('user_alerts').select('asset_id,threshold,rule')
      if (cancelled) return
      hydratedForRef.current = user.id
      if (error) return // offline: keep local rules; sync resumes on next change
      if (data.length > 0) {
        setStore((prev) => ({
          ...prev,
          rules: migrateRules(
            Object.fromEntries(
              data.map((r) => [r.asset_id, r.rule ?? { threshold: Number(r.threshold) }])
            )
          ),
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
    const rules = { ...s.rules }
    const states = { ...s.states }
    const events = [...s.events]

    for (const assetId of ruleIds) {
      const asset = assets.find((a) => a.id === assetId)
      if (!asset) continue
      const rule = rules[assetId]

      if (rule.drift) {
        const p = premiumPct(asset)
        if (p != null) {
          const outside = Math.abs(p) >= rule.drift.threshold
          const prev = states[assetId] ?? 'inside'
          if (outside && prev === 'inside') {
            events.unshift({
              id: `${assetId}-d-${Date.now()}`,
              kind: 'alert',
              type: 'drift',
              assetId,
              ticker: asset.ticker,
              underlying: asset.underlying,
              premium: p,
              threshold: rule.drift.threshold,
              at: Date.now(),
            })
            changed = true
          }
          const next = outside ? 'outside' : 'inside'
          if (next !== prev) {
            states[assetId] = next
            changed = true
          }
        }
      }

      if (rule.price && asset.tokenPrice != null) {
        const { target, direction } = rule.price
        const crossed = direction === 'above' ? asset.tokenPrice >= target : asset.tokenPrice <= target
        if (crossed) {
          events.unshift({
            id: `${assetId}-p-${Date.now()}`,
            kind: 'alert',
            type: 'price',
            assetId,
            ticker: asset.ticker,
            target,
            direction,
            price: asset.tokenPrice,
            at: Date.now(),
          })
          // one-shot: the rule removes itself
          const next = { ...rule }
          delete next.price
          if (next.drift) rules[assetId] = next
          else {
            delete rules[assetId]
            delete states[assetId]
          }
          changed = true
        }
      }
    }

    if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
    if (changed) setStore((prev) => ({ ...prev, rules, states, events }))
  }, [assets, store.rules])

  function setDriftAlert(assetId, threshold) {
    setStore((prev) => {
      const states = { ...prev.states }
      delete states[assetId] // reset to 'inside' so an already-drifted asset fires right away
      const rule = { ...prev.rules[assetId], drift: { threshold } }
      return { ...prev, rules: { ...prev.rules, [assetId]: rule }, states }
    })
  }

  function setPriceAlert(assetId, target, direction) {
    setStore((prev) => {
      const rule = { ...prev.rules[assetId], price: { target, direction } }
      return { ...prev, rules: { ...prev.rules, [assetId]: rule } }
    })
  }

  function removeAlert(assetId, kind) {
    setStore((prev) => {
      const rule = { ...prev.rules[assetId] }
      delete rule[kind]
      const rules = { ...prev.rules }
      const states = { ...prev.states }
      if (rule.drift || rule.price) rules[assetId] = rule
      else {
        delete rules[assetId]
        delete states[assetId]
      }
      if (kind === 'drift') delete states[assetId]
      return { ...prev, rules, states }
    })
  }

  function markSeen() {
    setStore((prev) => ({ ...prev, lastSeenAt: Date.now() }))
  }

  const unread = store.events.some((e) => e.at > store.lastSeenAt)

  return (
    <AlertsContext.Provider
      value={{
        rules: store.rules,
        events: store.events,
        unread,
        setDriftAlert,
        setPriceAlert,
        removeAlert,
        markSeen,
      }}
    >
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  return useContext(AlertsContext)
}
