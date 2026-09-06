import { useState } from 'react'
import { parseIntervalInput, intervalLabel } from '../../lib/intervalInput'

/*
 * TradingView's typed interval (spec A6, §6.11): a digit or `,` anywhere on
 * the desktop opens this small prompt with the digit already typed. In
 * Candles mode `1 5 15 60 240` are minutes and `D` a day; in Gap mode
 * `1D 1W 1M 3M 1Y`. The resolved chip shows live — a value the chips do not
 * offer snaps to the nearest by bar length — Enter applies it, Esc cancels,
 * and so does clicking away.
 *
 * Because it is an input, the shell's key map leaves every key to it except
 * Esc, which is handled here first and stopped so the shell does not also
 * leave fullscreen.
 */
export default function IntervalPrompt({ mode, initial = '', onApply, onCancel }) {
  const [text, setText] = useState(initial)
  const parsed = parseIntervalInput(text, mode)
  const label = intervalLabel(parsed)

  function onKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (parsed) onApply(parsed)
      else onCancel()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      onCancel()
    }
  }

  return (
    <div
      role="dialog"
      aria-label="Change interval"
      className="absolute left-1/2 top-16 z-30 w-56 -translate-x-1/2 rounded-xl bg-zinc-950 p-3 ring-1 ring-zinc-800/70"
    >
      <div className="flex items-center gap-2 rounded-lg bg-zinc-900 px-3 py-2">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={onCancel}
          aria-label="Interval"
          spellCheck={false}
          autoComplete="off"
          className="num t-body w-full bg-transparent text-zinc-100 outline-none"
        />
        <span className="t-label shrink-0 text-zinc-300">
          {label || (text.trim() ? '?' : '')}
        </span>
      </div>
      <p className="t-caption mt-2 text-zinc-500">
        {parsed
          ? parsed.exact
            ? 'Enter to apply · Esc to cancel'
            : `Nearest offered is ${label} · Enter to apply`
          : mode === 'gap'
            ? 'Type 1D, 1W, 1M, 3M or 1Y'
            : 'Minutes (1, 5, 15, 60, 240) or D'}
      </p>
    </div>
  )
}
