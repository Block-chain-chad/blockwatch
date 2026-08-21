import { useEffect } from 'react'
import Header from '../components/Header'
import DailyDigest from '../components/DailyDigest'
import TokenizationNews from '../components/TokenizationNews'
import LearnCards from '../components/LearnCards'
import { newsFeed } from '../data/mock'
import { useAlerts } from '../state/AlertsContext'
import { usePrices } from '../state/PricesContext'
import { BellIcon, GlobeIcon } from '../components/Icons'
import { formatPct, formatPrice, timeAgo } from '../lib/format'

export default function News({ onOpenProfile, onOpenAsset }) {
  const { events, rules, markSeen } = useAlerts()
  const { byId } = usePrices()

  // Visiting the tab clears the unread dot.
  useEffect(() => {
    markSeen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The mock feed invents headlines and credits them to real outlets
  // (Bloomberg, Reuters, CoinDesk…). That's fine as dev scaffolding, but it
  // must never ship: in production this list is real alert events only.
  // The DEV branch is a compile-time constant, so Rollup drops the mock
  // import from the production bundle entirely.
  const items = [...events, ...(import.meta.env.DEV ? newsFeed : [])].sort((a, b) => b.at - a.at)
  const noRulesYet = Object.keys(rules).length === 0 && events.length === 0

  return (
    <div className="pb-24">
      <Header title="News" onOpenProfile={onOpenProfile} />

      {/* The digest leads. In production there are no headlines — the mock
          feed is DEV-only — so this screen is really today's market extremes
          plus your alerts, and it should be ordered that way rather than
          opening with an apology for the thing that isn't here. */}
      <DailyDigest onOpenAsset={onOpenAsset} />

      <TokenizationNews />

      <h3
        className="t-micro mt-6 border-b px-4 pb-1.5 text-zinc-500"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {items.length > 0 ? 'Your alerts' : 'Alerts'}
      </h3>

      {noRulesYet && (
        <p className="t-caption px-4 pt-3 text-zinc-500">
          Open any asset and tap “Set alert” to get pinged when its token drifts from the
          share price. Alerts land here.
        </p>
      )}

      <div>
        {items.map((item) =>
          item.kind === 'alert' ? (
            <button
              key={item.id}
              onClick={() => {
                const asset = byId[item.assetId]
                if (asset) onOpenAsset(asset)
              }}
              className="hover-row flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors active:bg-zinc-900"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  (item.type === 'price' ? item.direction === 'above' : item.premium > 0)
                    ? 'bg-gain/10 text-gain'
                    : 'bg-loss/10 text-loss'
                }`}
              >
                <BellIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                {item.type === 'price' ? (
                  <>
                    <div className="t-label text-zinc-100">
                      {item.ticker} crossed{' '}
                      <span className="num">{formatPrice(item.target)}</span>
                    </div>
                    <div className="t-caption mt-0.5 text-zinc-500">
                      Your price target hit — trading at {formatPrice(item.price)}.
                    </div>
                  </>
                ) : (
                  <>
                    <div className="t-label text-zinc-100">
                      {item.ticker} drifted{' '}
                      <span className="num">{formatPct(item.premium)}</span> from{' '}
                      {item.underlying}
                    </div>
                    <div className="t-caption mt-0.5 text-zinc-500">
                      Crossed your ±{item.threshold}% drift alert.
                    </div>
                  </>
                )}
                <div className="t-caption mt-1 text-zinc-600">Price alert · {timeAgo(item.at)}</div>
              </div>
            </button>
          ) : (
            <div key={item.id} className="flex w-full items-start gap-3 border-b px-4 py-3 text-left" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-zinc-500">
                <GlobeIcon size={18} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="t-label text-zinc-100">{item.title}</div>
                <div className="t-caption mt-1 text-zinc-600">
                  {item.source} · {timeAgo(item.at)}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <LearnCards />
    </div>
  )
}
