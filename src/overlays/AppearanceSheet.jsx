import { useState } from 'react'
import { getThemePref, setThemePref } from '../lib/theme'
import { CheckCircleIcon } from '../components/Icons'

const OPTIONS = [
  { id: 'dark', label: 'Dark', hint: 'The default — reads like a trading terminal' },
  { id: 'light', label: 'Light', hint: 'Bright backgrounds, same layout' },
  { id: 'system', label: 'Match system', hint: 'Follows your device setting' },
]

export default function AppearanceSheet({ onClose }) {
  const [pref, setPref] = useState(getThemePref)

  function choose(id) {
    setPref(id)
    setThemePref(id) // applies instantly — the sheet stays open so you can compare
  }

  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full rounded-t-3xl bg-zinc-950 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-800" />
        <h2 className="px-5 pt-4 text-base font-semibold">Appearance</h2>
        <div className="mt-2">
          {OPTIONS.map((o) => (
            <button
              key={o.id}
              onClick={() => choose(o.id)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors active:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px]">{o.label}</div>
                <div className="text-xs text-zinc-500">{o.hint}</div>
              </div>
              {pref === o.id ? (
                <CheckCircleIcon size={22} className="text-accent" />
              ) : (
                <span className="h-[22px] w-[22px] rounded-full border border-zinc-700" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
