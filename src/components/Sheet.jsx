import { createContext, useContext, useEffect, useId, useRef } from 'react'
import { FOCUSABLE_SELECTOR, trapKeyAction } from '../lib/focusTrap'

/*
 * The one bottom sheet. Every sheet in the app used to be its own copy of a
 * scrim plus a rising panel, and none of them was a modal in the sense a
 * screen reader or a keyboard understands: no role, no focus trap, Tab walked
 * straight out into the screen behind, Escape did nothing, and closing left
 * focus on the body. This owns all of that once.
 *
 * What it provides, and the sheets no longer have to think about:
 *   - role="dialog" + aria-modal, labelled by the sheet's own heading. A sheet
 *     renders <SheetTitle> wherever its heading goes (state-dependent headings
 *     included) and the id is wired through context; a sheet with no heading
 *     passes `label` instead.
 *   - Focus moves in on open (onto the panel, unless a field already took it
 *     with autoFocus), Tab wraps inside, Escape closes, and focus goes back to
 *     whatever opened the sheet when it unmounts.
 *   - Body scroll is locked while any sheet is open.
 *
 * Sheets stack — Profile opens Feedback opens nothing, but Profile opens
 * Sign-in is real — so a module-level stack decides which sheet owns the keys:
 * only the top one reacts to Escape and Tab, and the scroll lock is taken once
 * and released by the last to leave.
 *
 * The look is unchanged: same scrim, same panel, same handle. The three
 * padding variants that existed are kept as `pad` rather than reinvented.
 */

const TitleContext = createContext(null)

const PAD = {
  0: { panel: 'pb-[max(env(safe-area-inset-bottom),16px)]', handle: 'mt-3' },
  4: { panel: 'p-4 pb-[max(env(safe-area-inset-bottom),16px)]', handle: 'mb-3' },
  5: { panel: 'p-5 pb-[max(env(safe-area-inset-bottom),20px)]', handle: 'mb-4' },
}

// Open sheets, bottom to top. Module-level on purpose: a nested sheet is a
// separate React subtree and still has to know it is above its parent.
const stack = []
let bodyOverflowBefore = null

function focusables(root) {
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR))
}

export default function Sheet({
  onClose,
  label,
  closeLabel = 'Close',
  pad = 4,
  className = 'z-50',
  children,
}) {
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()
  // Captured during the first render, not in an effect: by the time effects
  // run React has already focused any child with autoFocus, and the opener
  // would read as the sheet's own field.
  const openerRef = useRef(undefined)
  if (openerRef.current === undefined) openerRef.current = document.activeElement

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const root = rootRef.current
    const entry = { root }
    stack.push(entry)
    const isTop = () => stack[stack.length - 1] === entry

    if (stack.length === 1) {
      bodyOverflowBefore = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    // React runs autoFocus before effects, so a field that asked for focus
    // already has it; otherwise the panel takes it so keys reach the trap.
    const opener = openerRef.current
    if (!root.contains(document.activeElement)) panelRef.current?.focus({ preventScroll: true })

    function onKeyDown(e) {
      if (!isTop() || e.defaultPrevented) return
      // Escape mid-composition is the IME cancelling, not the user leaving.
      if (e.key === 'Escape' && e.isComposing) return
      const items = focusables(root)
      const action = trapKeyAction({
        key: e.key,
        shiftKey: e.shiftKey,
        activeIndex: items.indexOf(document.activeElement),
        count: items.length,
      })
      if (!action) return
      e.preventDefault()
      if (action.type === 'close') onCloseRef.current?.()
      else if (action.type === 'focus') items[action.index]?.focus()
    }

    // Focus that lands outside (a screen reader cursor, a programmatic focus
    // from the screen behind) is pulled back to the first thing in the sheet.
    // Focus inside any other modal is never the page behind: a child sheet's
    // autoFocus fires before the child has pushed itself onto the stack, so
    // this one is still top at that instant and must leave it alone.
    function onFocusIn(e) {
      if (!isTop() || e.target?.closest?.('[aria-modal="true"]')) return
      const first = focusables(root)[0] ?? panelRef.current
      first?.focus({ preventScroll: true })
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('focusin', onFocusIn)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('focusin', onFocusIn)
      stack.splice(stack.indexOf(entry), 1)
      if (stack.length === 0) {
        document.body.style.overflow = bodyOverflowBefore ?? ''
        bodyOverflowBefore = null
      }
      // The opener can be gone by now (a sheet that closed its parent on the
      // way out), in which case there is nothing sensible to hand focus to.
      if (opener?.isConnected && typeof opener.focus === 'function') {
        opener.focus({ preventScroll: true })
      }
    }
  }, [])

  return (
    <TitleContext.Provider value={titleId}>
      <div
        ref={rootRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={label ? undefined : titleId}
        className={`fixed inset-0 mx-auto flex max-w-md items-end lg:max-w-none lg:items-center lg:justify-center ${className}`}
      >
        {/* The root must span the whole window at lg: the scrim and the
            click-to-close live on it, and a phone-width root would leave the
            chart, toolbar and watchlist beside a 448px strip clickable under
            an open dialog — the focus trap only catches the keyboard. The
            panel below keeps its own lg:max-w-md. */}
        <button aria-label={closeLabel} onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
        {/* At lg the same panel is a centred dialog: rounded on every corner,
            no handle, and it fades in place instead of rising — a phone-width
            sheet rising in the middle of a 1440px window reads as broken.
            `sheet-in-center` is a plain class scoped to lg in index.css (an
            unlayered rule, so it can override `.sheet-in`, which a Tailwind
            `lg:` variant inside the utilities layer could not). */}
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`relative sheet-in sheet-in-center w-full rounded-t-3xl bg-zinc-950 outline-none ring-1 ring-zinc-800/70 lg:max-w-md lg:rounded-2xl ${PAD[pad].panel}`}
        >
          <div className={`mx-auto h-1 w-10 rounded-full bg-zinc-800 lg:hidden ${PAD[pad].handle}`} />
          {children}
        </div>
      </div>
    </TitleContext.Provider>
  )
}

/* The sheet's heading. Renders the h2 the sheet always had, and gives the
   dialog its accessible name. Render exactly one at a time. */
export function SheetTitle({ className, children }) {
  const id = useContext(TitleContext)
  return (
    <h2 id={id} className={className}>
      {children}
    </h2>
  )
}
