// src/components/desktop/RuleTicks.jsx
import { ruleTicks } from '../../lib/bigScreen'

/*
 * The seven labels along a GapBar that make its square-root scale legible
 * (spec 2026-09-15 §2.2): −2 −1 −0.5 0 +0.5 +1 +2 percent at the scale's
 * real positions. 11 px tabular figures in the rule-label grey (zinc-500,
 * oklch(0.62 0.009 250)). The end labels hang inside the track's ends; the
 * inner ones are centred on their tick. `width` is the track's width: a
 * number of pixels on the Board, '100%' in the Readout. Decorative: the
 * figure is always printed beside the bar.
 */
const TICKS = ruleTicks()

export default function RuleTicks({ width }) {
  return (
    <span className="num relative block h-3 text-[11px] leading-3 text-zinc-500" style={{ width }} aria-hidden="true">
      {TICKS.map((t) => (
        <span
          key={t.pct}
          className="absolute top-0"
          style={
            t.left === 0
              ? { left: 0 }
              : t.left === 100
                ? { right: 0 }
                : { left: `${t.left}%`, transform: 'translateX(-50%)' }
          }
        >
          {t.label}
        </span>
      ))}
    </span>
  )
}
