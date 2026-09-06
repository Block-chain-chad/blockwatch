import { timeAgo } from '../../lib/format'

/* "Latest {underlying} news": the company headlines, each linking out to
   its source. Renders nothing without headlines. */
export default function AssetNews({ asset, info }) {
  if (!(info.news?.length > 0)) return null
  return (
    <div className="px-4 pt-6">
      <h3 className="text-sm font-semibold text-zinc-300">Latest {asset.underlying} news</h3>
      <div className="mt-1 divide-y divide-zinc-900 rounded-2xl bg-zinc-900/60 px-4">
        {info.news.map((n) => (
          <a
            key={n.id}
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block py-3 transition-opacity active:opacity-60"
          >
            <div className="line-clamp-2 text-[13px] font-medium leading-snug text-zinc-100">
              {n.headline}
            </div>
            <div className="mt-1 text-[11px] text-zinc-500">
              {n.source} · {timeAgo(n.at)}
            </div>
          </a>
        ))}
      </div>
      <p className="mt-1.5 px-1 text-[11px] text-zinc-500">
        Coverage of {asset.underlying}, the stock this token tracks. Links open the source.
      </p>
    </div>
  )
}
