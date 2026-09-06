/* The venues this token trades on, plus its chain, as read-only pills. */
export default function TradesOn({ asset }) {
  return (
    <div className="px-4 pt-6">
      <h3 className="text-sm font-semibold text-zinc-300">Trades on</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {asset.venues.map((v) => (
          <span key={v} className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
            {v}
          </span>
        ))}
        {asset.chain && (
          <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
            {asset.chain}
          </span>
        )}
      </div>
    </div>
  )
}
