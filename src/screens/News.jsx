import { useEffect } from 'react'
import Header from '../components/Header'
import { newsFeed } from '../data/mock'
import { useAlerts } from '../state/AlertsContext'
import { usePrices } from '../state/PricesContext'
import { BellIcon, GlobeIcon } from '../components/Icons'
import { formatPct, timeAgo } from '../lib/format'

export default function News({ onOpenProfile, onOpenAsset }) {
  const { events, rules, markSeen } = useAlerts()
  const { byId } = usePrices()

  // Visiting the tab clears the unread dot.
  useEffect(() => {
    markSeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const items = [...events, ...newsFeed].sort((a, b) => b.at - a.at)
  const noRulesYet = Object.keys(rules).length === 0 && events.length === 0

  return (
    <div className="pb-24">
      <Header title="News" onOpenProfile={onOpenProfile} />

      {noRulesYet && (
        <div className="mx-4 mb-2 mt-1 rounded-2xl bg-zinc-900 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
            <BellIcon size={17} className="text-accent" />
            Your price alerts land here
          </div>
          <p className="mt-1 text-xs leading-relaxed text-zinc-500">
            Open any asset and tap “Set alert” to get pinged when its token drifts from the
            stock price.
          </p>
        </div>
      )}

      <div className="mt-1 divide-y divide-zinc-900">
        {items.map((item) =>
          item.kind === 'alert' ? (
            <button
              key={item.id}
              onClick={() => {
                const asset = byId[item.assetId]
                if (asset) onOpenAsset(asset)
              }}
              className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors active:bg-zinc-900"
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                  item.premium > 0 ? 'bg-gain/10 text-gain' : 'bg-loss/10 text-loss'
                }`}
              >
                <BellIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium leading-snug">
                  {item.ticker} drifted{' '}
                  <span className="tabular-nums">{formatPct(item.premium)}</span> from{' '}
                  {item.underlying}
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">
                  Crossed your ±{item.threshold}% drift alert.
                </div>
                <div className="mt-1 text-[11px] text-zinc-600">Price alert · {timeAgo(item.at)}</div>
              </div>
            </button>
          ) : (
            <div key={item.id} className="flex w-full items-start gap-3 px-4 py-3.5 text-left">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-zinc-400">
                <GlobeIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[14px] font-medium leading-snug">{item.title}</div>
                <div className="mt-1 text-[11px] text-zinc-600">
                  {item.source} · {timeAgo(item.at)}
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
