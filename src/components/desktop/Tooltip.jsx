import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { parseHotkey } from '../../lib/tooltip'

/*
 * The toolbar's tooltip (spec A22): one floating plate for every control
 * that carries `data-tooltip` (the text, which is also the control's
 * aria-label) and optionally `data-tooltip-hotkey` ('{"keys":["Alt","R"]}').
 * TradingView's shape — 13px text, 24px tall, 4px under the bar, left-aligned
 * under the control, the keys as a chip after the text. Hover or keyboard
 * focus shows it; leaving hides it.
 *
 * `containerRef` is the positioned element the plate hangs from (the toolbar
 * wrapper); the plate's `left` is measured against it, so the row inside may
 * scroll without clipping the plate.
 */
export default function ToolbarTooltips({ containerRef }) {
  const [tip, setTip] = useState(null)
  const tipRef = useRef(null)
  const [shift, setShift] = useState(0)

  // A control near the right edge would put the plate past the center
  // column, where `main`'s scroll box clips it; slide it left just enough
  // to stay inside the toolbar.
  useLayoutEffect(() => {
    const el = tipRef.current
    const root = containerRef.current
    if (!el || !root || !tip) return
    const over = tip.left + el.offsetWidth - root.clientWidth
    setShift(over > 0 ? Math.min(over, tip.left) : 0)
  }, [tip, containerRef])

  useEffect(() => {
    const root = containerRef.current
    if (!root) return undefined

    function show(target) {
      const el = target?.closest?.('[data-tooltip]')
      if (!el || !root.contains(el)) return
      const keys = parseHotkey(el.getAttribute('data-tooltip-hotkey'))
      const r = el.getBoundingClientRect()
      const rr = root.getBoundingClientRect()
      setTip({ text: el.getAttribute('data-tooltip'), keys, left: Math.max(0, r.left - rr.left) })
    }
    const hide = () => setTip(null)
    const onOver = (e) => show(e.target)
    const onOut = (e) => {
      // Moving between two controls fires out then over; only a real exit
      // from a tipped control (to something untipped) hides.
      if (!e.relatedTarget?.closest?.('[data-tooltip]')) hide()
    }
    const onFocusIn = (e) => show(e.target)
    root.addEventListener('mouseover', onOver)
    root.addEventListener('mouseout', onOut)
    root.addEventListener('focusin', onFocusIn)
    root.addEventListener('focusout', hide)
    root.addEventListener('mousedown', hide)
    return () => {
      root.removeEventListener('mouseover', onOver)
      root.removeEventListener('mouseout', onOut)
      root.removeEventListener('focusin', onFocusIn)
      root.removeEventListener('focusout', hide)
      root.removeEventListener('mousedown', hide)
    }
  }, [containerRef])

  if (!tip?.text) return null
  return (
    <div
      ref={tipRef}
      role="tooltip"
      className="t-label pointer-events-none absolute z-20 flex h-6 items-center gap-1.5 whitespace-nowrap rounded-md bg-zinc-800 px-2 text-zinc-100 ring-1 ring-zinc-700/70"
      style={{ top: 'calc(100% + 4px)', left: tip.left - shift }}
    >
      {tip.text}
      {tip.keys && <KeyChip keys={tip.keys} />}
    </div>
  )
}

/** 'Alt + R' as one chip, the way TradingView prints a hotkey. */
export function KeyChip({ keys }) {
  return (
    <kbd className="t-caption rounded bg-zinc-700 px-1.5 font-sans text-zinc-300">
      {keys.join(' + ')}
    </kbd>
  )
}
