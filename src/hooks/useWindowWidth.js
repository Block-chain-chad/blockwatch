import { useSyncExternalStore } from 'react'

/**
 * window.innerWidth as state, kept live on 'resize': the one measurement the
 * Meter shell takes so lib/bigScreen can size the Board's rule, the Readout
 * and the gap history (spec 2026-09-15 §2.1). Components receive the result
 * as props and never read the window themselves. 0 where window is
 * undefined, which bigScreen reads as the base band.
 */
export function useWindowWidth() {
  return useSyncExternalStore(subscribe, getWidth, () => 0)
}

function subscribe(onChange) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener('resize', onChange)
  return () => window.removeEventListener('resize', onChange)
}

function getWidth() {
  return typeof window === 'undefined' ? 0 : window.innerWidth
}

export default useWindowWidth
