import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePrices, useAssetSubscription } from './PricesContext'
import { useAuth } from './AuthContext'
import { supabase } from '../services/supabase'
import { track } from '../services/analytics'
import { premiumPct } from '../lib/prices'
import { canAlertOnGap, driftStep } from '../lib/alertRules'
import { loadUnsynced, pushRules, saveUnsynced, withUnsynced } from '../services/accountSync'
import { MAX_ALERTS, ALERTS_UNSYNCED_MESSAGE } from '../lib/accountLimits'

const STORAGE_KEY = 'bw.alerts.v1'
const MAX_EVENTS = 50
const SYNC_DEBOUNCE_MS = 800

// A rule can hold two independent alert types per asset:
//   drift: { threshold }         — |premium| crosses ±threshold%; re-arms when
//                                  the gap comes back inside the band. Only
//                                  evaluated while lib/alertRules.js says the
//                                  share leg can be trusted.
//   price: { target, direction } — token price crosses the target; one-shot,
//                                  removes itself after firing. Ungated: the
//                                  token trades 24/7 on a live feed.
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

const AlertsContext = createContext(null)

/**
 * Price alerts. Drift rules are a state machine per asset ('inside'/'outside'
 * the band) so a lingering gap alerts once, not on every poll; a rule created
 * while already outside fires on the next evaluation the gate allows.
 * Price-target rules are one-shot: fire and self-remove.
 */
export function AlertsProvider({ children }) {
  const { assets, session } = usePrices()
  const { user, ready } = useAuth()
  const [store, setStore] = useState(load)
  // How many alerts the last sync could not store on the account.
  const [unsynced, setUnsynced] = useState(0)

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

  async function sync(identity) {
    const result = await pushRules(identity, storeRef.current.rules)
    // Offline says nothing about which rules fit; keep the last answer.
    if (result.offline || hydratedForRef.current !== identity) return
    saveUnsynced('alerts', identity, result.unsyncedIds)
    setUnsynced(result.unsyncedIds.length)
  }

  // Signed in: server rules replace local on sign-in (import local ones when
  // the account is fresh). Signing out keeps the last-known rules on the
  // device — logging out shouldn't silently kill someone's alerts.
  useEffect(() => {
    if (!ready) return
    let cancelled = false

    async function hydrate() {
      if (!user) {
        hydratedForRef.current = null
        setUnsynced(0)
        return
      }
      if (hydratedForRef.current === user.id) return
      const { data, error } = await supabase.from('user_alerts').select('asset_id,threshold,rule')
      if (cancelled) return
      hydratedForRef.current = user.id
      if (error) return // offline: keep local rules; sync resumes on next change
      if (data.length > 0) {
        // Alerts that never reached the account live only on this device; put
        // them back so loading the account cannot lose them.
        const unsyncedIds = loadUnsynced('alerts', user.id)
        setStore((prev) => {
          const account = Object.entries(
            migrateRules(Object.fromEntries(data.map((r) => [r.asset_id, r.rule ?? { threshold: Number(r.threshold) }])))
          )
          const rules = withUnsynced(account, Object.entries(prev.rules), unsyncedIds, ([id]) => id)
          return {
            ...prev,
            rules: Object.fromEntries(rules),
            states: {}, // re-arm so already-drifted assets fire fresh on this device
          }
        })
        setUnsynced(unsyncedIds.length)
      } else {
        const rules = storeRef.current.rules
        if (Object.keys(rules).length > 0) sync(user.id)
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
    syncTimerRef.current = setTimeout(() => sync(identity), SYNC_DEBOUNCE_MS)
    // The body reads nothing off `user` but its id, and Supabase hands back a
    // new user object on every hourly token refresh — depending on the object
    // re-fired a full rules upsert each time. Matches FoldersContext.
  }, [store.rules, user?.id])

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
    // One instant for the whole pass, so the gate, the cooldown and the events
    // it produces cannot disagree about when this evaluation happened.
    const now = Date.now()

    for (const assetId of ruleIds) {
      const asset = assets.find((a) => a.id === assetId)
      if (!asset) continue
      const rule = s.rules[assetId]

      if (rule.drift) {
        // A drift rule reads the token against the share, so it may only
        // speak while the share leg is one the app would print as live
        // (lib/alertRules.js). Outside that window driftStep is a no-op: it
        // does not fire, and it does not move the state machine either.
        const premium = premiumPct(asset)
        const prev = s.states[assetId] ?? 'inside'
        const { state, fire } = driftStep({
          premium,
          threshold: rule.drift.threshold,
          state: prev,
          lastFiredAt: driftFiredRef.current[assetId] ?? 0,
          now,
          allowed: canAlertOnGap({ quote: asset.stockQuote, session, now }),
        })
        if (fire) {
          driftFiredRef.current[assetId] = now
          newEvents.push({
            id: `${assetId}-d-${now}`,
            kind: 'alert',
            type: 'drift',
            assetId,
            ticker: asset.ticker,
            underlying: asset.underlying,
            premium,
            threshold: rule.drift.threshold,
            at: now,
          })
        }
        if (state !== prev) stateDelta[assetId] = state
      }

      if (rule.price && asset.tokenPrice != null) {
        const { target, direction } = rule.price
        const crossed = direction === 'above' ? asset.tokenPrice >= target : asset.tokenPrice <= target
        if (crossed) {
          newEvents.push({
            id: `${assetId}-p-${now}`,
            kind: 'alert',
            type: 'price',
            assetId,
            ticker: asset.ticker,
            target,
            direction,
            price: asset.tokenPrice,
            at: now,
          })
          firedPriceIds.push(assetId)
        }
      }
    }

    if (newEvents.length === 0 && Object.keys(stateDelta).length === 0 && firedPriceIds.length === 0)
      return
    setStore((prev) => {
      // Clone lazily. Handing back the SAME rules/states objects when nothing
      // in them changed keeps the downstream persistence + Supabase-sync
      // effects (which key off store.rules) from firing on every price tick.
      let rules = prev.rules
      let states = Object.keys(stateDelta).length > 0 ? { ...prev.states, ...stateDelta } : prev.states
      for (const id of firedPriceIds) {
        // one-shot: the rule removes itself (skip if a queued user action
        // already removed it)
        const r = rules[id]
        if (!r?.price) continue
        if (rules === prev.rules) rules = { ...prev.rules }
        const next = { ...r }
        delete next.price
        if (next.drift) rules[id] = next
        else {
          delete rules[id]
          if (states === prev.states) states = { ...prev.states }
          delete states[id]
        }
      }
      const events = [...newEvents, ...prev.events]
      if (events.length > MAX_EVENTS) events.length = MAX_EVENTS
      return { ...prev, rules, states, events }
    })
    // `session` is in the list so the pass re-runs the moment the market
    // opens. It re-runs on a quote that is still yesterday's close, which the
    // gate rejects — the burst the gate exists to prevent needs an evaluation
    // of a stale reading, and this is not one.
  }, [assets, store.rules, session])

  // A new token past the alert limit is refused; changing a token that
  // already has an alert is always allowed.
  const canAlertOn = (assetId) => Boolean(store.rules[assetId]) || Object.keys(store.rules).length < MAX_ALERTS

  /** Returns false, changing nothing, when the alert limit is reached. */
  function setDriftAlert(assetId, threshold) {
    if (!canAlertOn(assetId)) return false
    // Only a first drift alert for this asset is a creation. Re-opening the
    // sheet to move the threshold is an update, and counting it as a
    // creation would inflate the one number this event exists to answer:
    // how many people ever set an alert.
    if (!store.rules[assetId]?.drift) track('alert_created', { type: 'drift' })
    // Fresh rule, fresh cooldown — a re-created or re-thresholded alert must
    // be able to fire immediately, not inherit the old rule's cooldown.
    delete driftFiredRef.current[assetId]
    setStore((prev) => {
      const states = { ...prev.states }
      // Reset to 'inside' so an already-drifted asset fires at the next
      // evaluation the gate allows — which, for an alert set after the close,
      // is the first live quote of the next session rather than this instant.
      delete states[assetId]
      const rule = { ...prev.rules[assetId], drift: { threshold } }
      return { ...prev, rules: { ...prev.rules, [assetId]: rule }, states }
    })
    return true
  }

  /** Returns false, changing nothing, when the alert limit is reached. */
  function setPriceAlert(assetId, target, direction) {
    if (!canAlertOn(assetId)) return false
    if (!store.rules[assetId]?.price) track('alert_created', { type: 'target' })
    setStore((prev) => {
      const rule = { ...prev.rules[assetId], price: { target, direction } }
      return { ...prev, rules: { ...prev.rules, [assetId]: rule } }
    })
    return true
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
        canAlertOn,
        // A quiet line for the alert sheet, or null when everything synced.
        syncNotice: user && unsynced > 0 ? ALERTS_UNSYNCED_MESSAGE : null,
      }}
    >
      {children}
    </AlertsContext.Provider>
  )
}

export function useAlerts() {
  return useContext(AlertsContext)
}
