import { useSyncExternalStore } from 'react'

/**
 * Whether a CSS media query currently matches, kept live via matchMedia's
 * 'change' event. Lets a component skip mounting work (subscriptions,
 * fetches) for UI that CSS alone would only hide — `hidden lg:block` still
 * mounts its children. Returns false where window is undefined.
 */
export function useMediaQuery(query) {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === 'undefined') return () => {}
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    () => (typeof window === 'undefined' ? false : window.matchMedia(query).matches),
    () => false,
  )
}
