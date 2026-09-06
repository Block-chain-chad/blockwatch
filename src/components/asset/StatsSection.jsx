import { formatCompact } from '../../lib/format'

/* The four at-a-glance tiles: token volume and cap, the underlying's cap
   and industry. Renders nothing when none of them has a value. */
export default function StatsSection({ asset, info }) {
  if (!(asset.volume24h != null || asset.marketCap != null || info.profile)) return null
  return (
    <div className="px-4 pt-6">
      <h3 className="text-sm font-semibold text-zinc-300">Stats</h3>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {asset.volume24h != null && (
          <div className="rounded-xl bg-zinc-900/60 p-3">
            <div className="text-[11px] text-zinc-500">Token volume (24h)</div>
            <div className="mt-0.5 text-sm font-medium tabular-nums">{formatCompact(asset.volume24h)}</div>
          </div>
        )}
        {asset.marketCap != null && (
          <div className="rounded-xl bg-zinc-900/60 p-3">
            <div className="text-[11px] text-zinc-500">Token market cap</div>
            <div className="mt-0.5 text-sm font-medium tabular-nums">{formatCompact(asset.marketCap)}</div>
          </div>
        )}
        {info.profile?.marketCapitalization > 0 && (
          <div className="rounded-xl bg-zinc-900/60 p-3">
            <div className="text-[11px] text-zinc-500">{asset.underlying} market cap</div>
            <div className="mt-0.5 text-sm font-medium tabular-nums">
              {formatCompact(info.profile.marketCapitalization * 1e6)}
            </div>
          </div>
        )}
        {info.profile?.finnhubIndustry && (
          <div className="rounded-xl bg-zinc-900/60 p-3">
            <div className="text-[11px] text-zinc-500">Industry</div>
            <div className="mt-0.5 truncate text-sm font-medium">{info.profile.finnhubIndustry}</div>
          </div>
        )}
      </div>
    </div>
  )
}
