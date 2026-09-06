/* Buy / Hold / Sell split of the underlying's analyst recommendations as a
   stacked bar. Renders nothing without recommendations, or when they sum
   to zero. */
export default function AnalystRatings({ info }) {
  if (!info.recs) return null
  const buy = (info.recs.strongBuy ?? 0) + (info.recs.buy ?? 0)
  const hold = info.recs.hold ?? 0
  const sell = (info.recs.sell ?? 0) + (info.recs.strongSell ?? 0)
  const total = buy + hold + sell
  if (total === 0) return null
  const pct = (n) => Math.round((n / total) * 100)
  return (
    <div className="px-4 pt-6">
      <h3 className="text-sm font-semibold text-zinc-300">Analyst ratings</h3>
      <div className="mt-2.5 flex h-2 overflow-hidden rounded-full bg-zinc-900">
        <div className="bg-gain/80" style={{ width: `${(buy / total) * 100}%` }} />
        <div className="bg-zinc-600" style={{ width: `${(hold / total) * 100}%` }} />
        <div className="bg-loss/80" style={{ width: `${(sell / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-zinc-400">
        <span>
          <span className="font-semibold text-gain tabular-nums">{pct(buy)}%</span> Buy
        </span>
        <span>
          <span className="font-semibold text-zinc-300 tabular-nums">{pct(hold)}%</span> Hold
        </span>
        <span>
          <span className="font-semibold text-loss tabular-nums">{pct(sell)}%</span> Sell
        </span>
        <span className="ml-auto text-zinc-500">{total} analysts</span>
      </div>
    </div>
  )
}
