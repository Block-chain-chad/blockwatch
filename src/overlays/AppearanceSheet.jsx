import { useState } from 'react'
import { getThemePref, setThemePref } from '../lib/theme'
import { ACCENTS, getAccentPref, setAccentPref } from '../lib/accent'
import { CheckCircleIcon } from '../components/Icons'

const OPTIONS = [
  { id: 'dark', label: 'Dark', hint: 'The default — reads like a trading terminal' },
  { id: 'light', label: 'Light', hint: 'Bright backgrounds, same layout' },
  { id: 'system', label: 'Match system', hint: 'Follows your device setting' },
]

export default function AppearanceSheet({ onClose }) {
  const [pref, setPref] = useState(getThemePref)
  const [accent, setAccent] = useState(getAccentPref)

  function choose(id) {
    setPref(id)
    setThemePref(id) // applies instantly — the sheet stays open so you can compare
  }

  function chooseAccent(id) {
    setAccent(id)
    setAccentPref(id) // instant too — watch the buttons and pills recolor live
  }

  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
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

        <h3 className="px-5 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Accent color
        </h3>
        <div className="flex gap-5 px-5 pb-5 pt-2">
          {ACCENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => chooseAccent(a.id)}
              aria-label={`${a.label} accent`}
              className="flex flex-col items-center gap-1.5"
            >
              <span
                className={`h-9 w-9 rounded-full transition-transform ${
                  accent === a.id ? 'scale-110 ring-2 ring-zinc-100 ring-offset-2 ring-offset-zinc-950' : ''
                }`}
                style={{ background: a.dark[0] }}
              />
              <span className={`text-[11px] ${accent === a.id ? 'text-zinc-200' : 'text-zinc-500'}`}>
                {a.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
