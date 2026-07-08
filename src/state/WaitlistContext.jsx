import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { joinWaitlist, waitlistConfigured } from '../services/waitlist'
import { track } from '../services/analytics'

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
 * Waitlist membership for this device.
 * entry: null | { email, position: number|null, pendingSync: boolean }
 *
 * Joining is optimistic: the entry is stored locally first, then synced to
 * Supabase for the real position number. If the backend isn't configured or
 * unreachable, the entry stays pendingSync and we retry on the next launch —
 * the user never sees a failure wall.
 */
export function WaitlistProvider({ children }) {
  const [entry, setEntry] = useState(load)
  const syncingRef = useRef(false)

  function persist(next) {
    setEntry(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // storage unavailable — entry still lives for the session
    }
  }

  async function sync(email) {
    if (!waitlistConfigured || syncingRef.current) return
    syncingRef.current = true
    try {
      const position = await joinWaitlist(email)
      persist({ email, position, pendingSync: false })
    } catch {
      // stay pending; retried on next launch or next join tap
    } finally {
      syncingRef.current = false
    }
  }

  // Retry a queued join once per launch.
  useEffect(() => {
    if (entry?.pendingSync && entry.email) sync(entry.email)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function join(rawEmail) {
    const email = rawEmail.trim().toLowerCase()
    persist({ email, position: null, pendingSync: true })
    track('waitlist_join')
    await sync(email)
  }

  return (
    <WaitlistContext.Provider value={{ entry, join, configured: waitlistConfigured }}>
      {children}
    </WaitlistContext.Provider>
  )
}

export function useWaitlist() {
  return useContext(WaitlistContext)
}
