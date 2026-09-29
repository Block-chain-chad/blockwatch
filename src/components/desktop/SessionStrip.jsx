import { usePrices } from '../../state/PricesContext'
import { SESSION_DOT, SESSION_NOTE, SESSION_SHORT, widestCredibleGap, closedGapLabelFor } from '../../lib/sessionCopy'
import { formatPct, changeColor } from '../../lib/format'
import ClosedGapMark from '../ClosedGapMark'

/*
 * The phone Home's session line, sized for a 48px bar (spec §6.6): the dot,
 * the short word, and the full sentence as a tooltip. From xl, when the
 * market is shut, the same "Widest gap" candidate Home names — the one story
 * a stock tracker cannot tell — with the same credibility rule, now a pure
 * function in lib/sessionCopy.js.
 */
export default function SessionStrip({ onSelectAsset }) {
  const { assets, session } = usePrices()
  const top = widestCredibleGap(assets, session)
  return (
    <div className="flex items-center gap-2" title={SESSION_NOTE[session]}>
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ background: SESSION_DOT[session] }}
      />
      <span className="t-caption text-zinc-400">{SESSION_SHORT[session]}</span>
      {top && (
        <button
          onClick={() => onSelectAsset(top.asset.id)}
          className="t-caption hidden shrink-0 items-center gap-2 xl:inline-flex"
        >
          <span>
            <span className="text-zinc-500">Widest gap </span>
            <span className="font-medium text-zinc-300">{top.asset.ticker}</span>{' '}
            <span className={`num font-medium ${changeColor(top.p)}`}>{formatPct(top.p)}</span>
          </span>
          <ClosedGapMark label={closedGapLabelFor(top.asset)} />
        </button>
      )}
    </div>
  )
}
