import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { usePrices } from './PricesContext'
import { premiumPct } from '../lib/prices'

const STORAGE_KEY = 'bw.alerts.v1'
const MAX_EVENTS = 50

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
  const [store, setStore] = useState(load)
  const storeRef = useRef(store)

  useEffect(() => {
    storeRef.current = store
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch {
      // storage unavailable — alerts still work for the session
    }
  }, [store])

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
