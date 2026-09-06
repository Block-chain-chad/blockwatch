import { useEffect, useState } from 'react'

/**
 * useState mirrored to one localStorage key, for the desktop shell's
 * remembered choices (selected asset, list source, chart settings, open tab,
 * filter). Reads the key once on mount and writes JSON on every change;
 * every storage call is wrapped, because private windows, quota errors and a
 * value someone else wrote by hand all throw or fail to parse, and none of
 * them should take the shell down — the initial value simply stands.
 *
 * `initial` may be a function, as with useState. Nothing here tests the
 * width or the platform: the desktop components are the only callers, so
 * the phone never touches these keys.
 */
export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key)
      if (raw != null) return JSON.parse(raw)
    } catch {
      // fall through to the initial value
    }
    return typeof initial === 'function' ? initial() : initial
  })

  useEffect(() => {
    try {
      if (value === undefined) window.localStorage.removeItem(key)
      else window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage unavailable or full; the in-memory state still works
    }
  }, [key, value])

  return [value, setValue]
}

export default useLocalState
