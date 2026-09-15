import { ChevronDown } from '../Icons'
import { formatPct } from '../shared'
import PriceText from '../PriceText'

/* Same underlying, different issuer — the cross-issuer comparison. Renders
   nothing when there are no siblings. */
export default function AlsoTokenizedBy({ asset, siblings, onSwitchAsset }) {
  if (siblings.length === 0) return null
  return (
    <div className="px-4 pt-6">
      <h3 className="text-sm font-semibold text-zinc-300">Also tokenized by</h3>
      <div className="mt-1 divide-y divide-zinc-900 rounded-2xl bg-zinc-900/60">
        {siblings.map((s) => {
          const diff =
            s.tokenPrice != null && asset.tokenPrice != null
              ? ((s.tokenPrice - asset.tokenPrice) / asset.tokenPrice) * 100
              : null
          return (
            <button
              key={s.id}
              onClick={() => onSwitchAsset(s.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-zinc-900"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">{s.ticker}</div>
                <div className="truncate text-xs text-zinc-500">
                  {s.issuer}
                  {s.chain ? ` · ${s.chain}` : ''}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  <PriceText value={s.tokenPrice} />
                </div>
                {diff != null && (
                  <div className="text-xs tabular-nums text-zinc-500">
                    {formatPct(diff)} vs this one
                  </div>
                )}
              </div>
              <ChevronDown size={16} className="-rotate-90 text-zinc-600" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
