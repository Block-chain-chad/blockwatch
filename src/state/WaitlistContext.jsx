import { createContext, useContext, useState } from 'react'

const STORAGE_KEY = 'bw.waitlist.v1'

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const WaitlistContext = createContext(null)

/**
 * This device's trading waitlist entry, if it ever joined.
 * entry: null | { email, position: number|null, pendingSync: boolean }
 *
 * The waitlist closed to new sign-ups on September 30, 2026, and the server
 * answers every join with 410 (api/waitlist-join.js), so nothing joins from
 * here any more. The stored entry is still read: Profile tells people already
 * on the list what they were promised, and the feedback and sign-in forms
 * offer its email.
 */
export function WaitlistProvider({ children }) {
  const [entry] = useState(load)
  return <WaitlistContext.Provider value={{ entry }}>{children}</WaitlistContext.Provider>
}

export function useWaitlist() {
  return useContext(WaitlistContext)
}
