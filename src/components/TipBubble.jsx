import { useState } from 'react'

/* Taps this soon after a bubble appears are ignored: a double tap on one
   bubble's "Got it" must not close the next one, unread, in the same place. */
export const TAP_GUARD_MS = 300

/*
 * One of Home's tip bubbles (lib/tips.js decides which, and where). It floats
 * over the list instead of inserting a row, because nothing may push the
 * first price row down, so the caller positions it absolutely beside its
 * anchor and passes the side and the caret's offset.
 *
 * The look follows the rules OnboardingTip set before it: no shadow and no
 * nested card, only the popover surface with a hairline border, the accent
 * dot, caption type. The caret is a rotated square in the same surface with
 * the hairline on its two outer edges, laid over the bubble's own border.
 *
 * Non-modal: no focus trap and focus never moves. The caller renders it
 * right after the anchor row, so Tab reaches the link and "Got it" next, and
 * points the row's aria-describedby at `id` (the body). The note is named by
 * its title.
 *
 * `overlay-in` is the 150 ms fade the app's overlays use; index.css turns it
 * off under prefers-reduced-motion.
 */
export default function TipBubble({ ref, id, title, body, link, onLink, onClose, side = 'below', caret = null, style }) {
  const [shownAt] = useState(() => Date.now())
  const guarded = (fn) => () => {
    if (Date.now() - shownAt >= TAP_GUARD_MS) fn?.()
  }
  const caretEdge =
    side === 'below' ? { top: -4.5, borderWidth: '1px 0 0 1px' } : { bottom: -4.5, borderWidth: '0 1px 1px 0' }
  const caretX = caret == null ? { right: 20 } : { left: caret - 4 }
  return (
    <div
      ref={ref}
      role="note"
      aria-labelledby={`${id}-title`}
      data-tip-bubble=""
      data-side={side}
      className="overlay-in absolute z-20 w-[min(280px,calc(100%-32px))] rounded-xl border bg-zinc-800 px-3 pt-2.5 text-left"
      style={{ borderColor: 'var(--border-default)', ...style }}
    >
      <span
        aria-hidden="true"
        data-tip-caret=""
        className="absolute size-2 rotate-45 border-solid bg-zinc-800"
        style={{ borderColor: 'var(--border-default)', ...caretEdge, ...caretX }}
      />
      <div className="flex items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full bg-accent" />
        <span id={`${id}-title`} className="t-caption font-medium text-zinc-100">
          {title}
        </span>
      </div>
      <p id={id} className="t-caption mt-1 text-zinc-400">
        {body}
      </p>
      {/* 44 px tall targets; the negative margins keep the text where a
          plain caption would sit. */}
      <div className="flex items-center justify-between gap-3">
        {link && (
          <button
            onClick={guarded(onLink)}
            className="t-caption -ml-2 min-h-11 px-2 text-left text-zinc-300 underline underline-offset-2"
          >
            {link}
          </button>
        )}
        {/* The light theme's accent is 3.3:1 on this surface; its dim step is 4.9:1. */}
        <button
          onClick={guarded(onClose)}
          className="t-caption -mr-2 ml-auto min-h-11 min-w-11 px-2 font-medium text-accent [html.light_&]:text-accent-dim"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
