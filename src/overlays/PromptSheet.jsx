import { useState } from 'react'

/* Minimal bottom-sheet text prompt (create/rename folder). */
export default function PromptSheet({ title, placeholder, initial = '', submitLabel, onSubmit, onClose }) {
  const [value, setValue] = useState(initial)

  function submit(e) {
    e.preventDefault()
    const name = value.trim()
    if (!name) return
    onSubmit(name)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <form
        onSubmit={submit}
        className="relative w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />
        <h2 className="px-1 text-base font-semibold">{title}</h2>
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="mt-3 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-accent/60 focus:ring-2"
        />
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-300 transition-colors active:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
          >
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
