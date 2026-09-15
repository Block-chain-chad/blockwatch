import { useEffect, useState } from 'react'

/**
 * Date.now() as state that ticks on an interval (one second by default), so
 * an age computed from it ("12 s ago") keeps counting instead of freezing
 * until the next unrelated re-render. The interval is cleared on unmount.
 */
export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export default useNow
