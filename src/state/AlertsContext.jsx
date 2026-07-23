import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePrices, useAssetSubscription } from './PricesContext'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabase'
import { premiumPct } from '../lib/prices'

const STORAGE_KEY = 'bw.alerts.v1'
const MAX_EVENTS = 50
const SYNC_DEBOUNCE_MS = 800
// Anti-spam for drift alerts under fast (2.5s) evaluation: re-arm only when
// the gap falls clearly back inside the band, and rate-limit repeat fires.
const REARM_RATIO = 0.8
const DRIFT_COOLDOWN_MS = 10 * 60_000

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

  // Drift alerts compare token vs stock price, and stock quotes only flow for
  // subscribed assets — so every asset with a rule stays subscribed even when
  // no screen is showing it.
  useAssetSubscription('alert-rules', Object.keys(store.rules))
  const storeRef = useRef(store)
  const hydratedForRef = useRef(null)
  const syncTimerRef = useRef(null)
  // assetId -> last drift-fire timestamp (session-scoped; spam is a
  // within-session phenomenon, so this doesn't need persisting)
  const driftFiredRef = useRef({})

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

  // Evaluate every rule whenever prices refresh (or rules change). The pass
  // collects DELTAS and the commit applies them against the LATEST store —
  // a wholesale replace from this pass's snapshot would clobber a Supabase
  // hydrate() or a user removeAlert() queued in the same flush (resurrecting
  // deleted rules), a window the 2.5s fast layer widens ~24x.
  useEffect(() => {
    const s = storeRef.current
    const ruleIds = Object.keys(s.rules)
    if (ruleIds.length === 0) return

    const newEvents = []
    const stateDelta = {}
    const firedPriceIds = []

    for (const assetId of ruleIds) {
      const asset = assets.find((a) => a.id === assetId)
      if (!asset) continue
      const rule = s.rules[assetId]

      if (rule.drift) {
        const p = premiumPct(asset)
        if (p != null) {
          // With the fast layer, evaluation runs ~every 2.5s — a premium
          // hovering exactly at the threshold would flip inside/outside each
          // tick and flood the feed. Two guards:
          //  - hysteresis: re-arm only once the gap falls clearly back inside
          //    (80% of threshold), so hover can't oscillate the state machine
          //  - cooldown: at most one drift event per asset per 10 minutes
          const outside = Math.abs(p) >= rule.drift.threshold
          const backInside = Math.abs(p) < rule.drift.threshold * REARM_RATIO
          const prev = s.states[assetId] ?? 'inside'
          let next = outside ? 'outside' : backInside ? 'inside' : prev
          if (outside && prev === 'inside') {
            const last = driftFiredRef.current[assetId] ?? 0
            if (Date.now() - last > DRIFT_COOLDOWN_MS) {
              driftFiredRef.current[assetId] = Date.now()
              newEvents.push({
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
            } else {
              // Cooldown suppressed the fire: HOLD 'inside' so this crossing
              // re-attempts once the cooldown expires. Advancing to 'outside'
              // here would consume a genuine excursion silently — dropped,
              // not rate-limited.
              next = prev
            }
          }
          if (next !== prev) stateDelta[assetId] = next
        }
      }

      if (rule.price && asset.tokenPrice != null) {
        const { target, direction } = rule.price
        const crossed = direction === 'above' ? asset.tokenPrice >= target : asset.tokenPrice <= target
        if (crossed) {
          newEvents.push({
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
          firedPriceIds.push(assetId)
        }
      }
    }

    if (newEvents.length === 0 && Object.keys(stateDelta).length === 0 && firedPriceIds.length === 0)
      return
    setStore((prev) => {
      const rules = { ...prev.rules }
      const states = { ...prev.states, ...stateDelta }
      for (const id of firedPriceIds) {
        // one-shot: the rule removes itself (skip if a queued user action
        // already removed it)
        const r = rules[id]
        if (!r?.price) continue
        const next = { ...r }
        delete next.price
        if (next.drift) rules[id] = next
        else {
          delete rules[id]
          delete states[id]
        }
      }
      const events = [...newEvents, ...prev.events]
      if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
      return { ...prev, rules, states, events }
    })
  }, [assets, store.rules])

  function setDriftAlert(assetId, threshold) {
    // Fresh rule, fresh cooldown — a re-created or re-thresholded alert must
    // be able to fire immediately, not inherit the old rule's cooldown.
    delete driftFiredRef.current[assetId]
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
    if (kind === 'drift') delete driftFiredRef.current[assetId]
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
