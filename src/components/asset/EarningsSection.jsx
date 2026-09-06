/* The underlying's recent quarters: a beat/miss dot, the period, actual EPS
   and the estimate. Renders nothing without earnings. */
export default function EarningsSection({ asset, info }) {
  if (!(info.earnings?.length > 0)) return null
  return (
    <div className="px-4 pt-6">
      <h3 className="text-sm font-semibold text-zinc-300">Earnings</h3>
      <div className="mt-1 divide-y divide-zinc-900 rounded-2xl bg-zinc-900/60 px-4">
        {info.earnings.map((q) => {
          const beat = q.estimate != null ? q.actual >= q.estimate : null
          const label = new Date(q.period).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          return (
            <div key={q.period} className="flex items-center gap-3 py-3">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  beat == null ? 'bg-zinc-600' : beat ? 'bg-gain' : 'bg-loss'
                }`}
              />
              <span className="w-20 text-sm text-zinc-300">{label}</span>
              <span className="flex-1 text-right text-sm tabular-nums text-zinc-100">
                EPS {q.actual.toFixed(2)}
              </span>
              <span className="w-24 text-right text-xs tabular-nums text-zinc-500">
                {q.estimate != null ? `est ${q.estimate.toFixed(2)}` : '—'}
              </span>
            </div>
          )
        })}
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-zinc-500">
        Quarterly results for {asset.underlying}, the stock this token tracks.
      </p>
    </div>
  )
}
