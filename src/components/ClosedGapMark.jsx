/*
 * Set beside a gap figure while its share leg is a close rather than a live
 * price (closedGapLabel in lib/sessionCopy.js): a "Market closed" status pill
 * and the close the gap is measured against. `stacked` puts the two on two
 * short lines for narrow rows (`alignEnd` right-aligns them); otherwise they
 * sit side by side. The sentence behind both is the tooltip. Renders nothing
 * during regular hours.
 */
export default function ClosedGapMark({ label, stacked = false, alignEnd = false, className = '' }) {
  if (!label) return null
  return (
    <span
      title={label.title}
      data-closed-mark=""
      className={`inline-flex shrink-0 whitespace-nowrap ${stacked ? `flex-col gap-0.5 ${alignEnd ? 'items-end' : 'items-start'}` : 'items-center gap-1.5'} ${className}`}
    >
      <span
        className="rounded-full px-1.5 text-[10px] font-medium leading-4 text-zinc-300"
        style={{ boxShadow: 'inset 0 0 0 1px var(--border-default)' }}
      >
        {label.tag}
      </span>
      <span className="text-[11px] font-normal leading-none text-zinc-500">{label.vs}</span>
    </span>
  )
}
