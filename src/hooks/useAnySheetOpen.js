import { useSyncExternalStore } from 'react'

// How many sheets are open, anywhere in the app. Sheet.jsx reports each one
// opening and closing; whoever needs to know subscribes here rather than
// every opener reporting in (Home hides its tip bubble under any sheet).

let open = 0
const listeners = new Set()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function sheetOpened() {
  open += 1
  notify()
}

export function sheetClosed() {
  open = Math.max(0, open - 1)
  notify()
}

/** True while any sheet is open. */
export function useAnySheetOpen() {
  return useSyncExternalStore(subscribe, () => open > 0, () => false)
}
