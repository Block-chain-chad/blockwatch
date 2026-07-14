import { useState } from 'react'
import { useAsset, usePrices, useAssetSubscription } from '../state/PricesContext'
import { ASSETS } from '../data/universe'
import { useFolders } from '../state/FoldersContext'
import { useAlerts } from '../state/AlertsContext'
import AddToFolderSheet from '../overlays/AddToFolderSheet'
import SetAlertSheet from '../overlays/SetAlertSheet'
import ShareSheet from '../overlays/ShareSheet'
import DualLineChart from '../components/DualLineChart'
import PremiumChart from '../components/PremiumChart'
import { useChartData, CHART_RANGES } from '../hooks/useChartData'
import { useStockInfo } from '../hooks/useStockInfo'
import { formatCompact, timeAgo } from '../lib/format'
import { isThinlyTraded } from '../lib/prices'
import { ChevronLeft, ChevronDown, ShareIcon, PlusIcon, BellIcon, StarIcon } from '../components/Icons'
import { formatPrice, formatPct, PremiumPill, changeColor } from '../components/shared'
import PriceText from '../components/PriceText'
import UpdatedAgo from '../components/UpdatedAgo'
import AssetLogo from '../components/AssetLogo'

const RANGES = Object.keys(CHART_RANGES)
const RANGE_WORDS = { '1D': 'today', '1W': 'past week', '1M': 'past month', '3M': 'past 3 months', '1Y': 'past year' }

export default function AssetDetail({ assetId, onBack, onSwitchAsset }) {
  const [range, setRange] = useState('1D')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [chartRetry, setChartRetry] = useState(0)
  const [visibleLines, setVisibleLines] = useState({ token: true, stock: true })

  // Legend taps solo a line; at least one always stays visible.
  function toggleLine(key) {
    setVisibleLines((v) => {
      const next = { ...v, [key]: !v[key] }
      return next.token || next.stock ? next : v
    })
  }
  const asset = useAsset(assetId)
  const { marketOpen, assets } = usePrices()

  // This asset + its cross-issuer siblings (same underlying) need live token
  // prices and the underlying's quote — long-tail assets aren't polled
  // otherwise. Sibling ids come from the static universe so the list is
  // stable regardless of what data has arrived.
  const staticAsset = ASSETS.find((a) => a.id === assetId)
  const subIds = staticAsset?.underlying
    ? ASSETS.filter((a) => a.underlying === staticAsset.underlying).map((a) => a.id)
    : [assetId]
  useAssetSubscription(`detail:${assetId}`, subIds)

  const { folders, watchlistIds, toggleWatchlist } = useFolders()
  const { rules } = useAlerts()
  const chart = useChartData(asset ?? { id: assetId }, range, chartRetry)
  const info = useStockInfo(asset?.underlying)
  if (!asset) return null
  const memberCount = folders.filter((f) => f.assetIds.includes(asset.id)).length
  const alertRule = rules[asset.id]
  const alertLabel = !alertRule
    ? 'Set alert'
    : alertRule.drift && alertRule.price
      ? '2 alerts set'
      : alertRule.drift
        ? `Alert at ±${alertRule.drift.threshold}%`
        : `Alert at ${formatPrice(alertRule.price.target)}`
  const inWatchlist = watchlistIds.includes(asset.id)
  // Same underlying, different issuer — the cross-issuer comparison.
  const siblings = asset.underlying
    ? assets.filter((a) => a.underlying === asset.underlying && a.id !== asset.id)
    : []

  return (
    <div className="fixed inset-0 z-30 mx-auto max-w-md overflow-y-auto bg-zinc-950 pb-10">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-zinc-950/90 px-2 py-3 backdrop-blur">
        <button
          onClick={onBack}
          className="flex items-center gap-0.5 py-1 pl-1 pr-3 text-accent transition-opacity active:opacity-60"
        >
          <ChevronLeft size={20} />
          <span className="text-[15px]">Back</span>
        </button>
        <div className="mr-2 flex items-center gap-1">
          <button
            onClick={() => toggleWatchlist(asset.id)}
            aria-label={inWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors active:bg-zinc-800 ${
              inWatchlist ? 'text-accent' : 'text-zinc-300'
            }`}
          >
            <StarIcon size={19} filled={inWatchlist} />
          </button>
          <button
            onClick={() => setShareOpen(true)}
            aria-label="Share"
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors active:bg-zinc-800"
          >
            <ShareIcon size={19} />
          </button>
        </div>
      </header>

      <div className="px-4">
        <div className="flex items-center gap-3">
          <AssetLogo asset={asset} size={40} />
          <div className="min-w-0">
            <div className="truncate text-sm text-zinc-500">
              {asset.name} · {asset.issuer}
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{asset.ticker}</h1>
          </div>
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-3xl font-semibold">
              <PriceText value={asset.tokenPrice} skeletonWidth="w-28" />
            </div>
            {(() => {
              // Robinhood-style range summary: how it's moved over the selected zoom.
              if (chart.token.length < 2) return null
              const first = chart.token[0].v
              const last = chart.token[chart.token.length - 1].v
              const pct = ((last - first) / first) * 100
              return (
                <div className={`mt-1 text-sm font-medium tabular-nums ${changeColor(pct)}`}>
                  {last >= first ? '▲' : '▼'} {formatPrice(Math.abs(last - first))} ({formatPct(pct)}){' '}
                  <span className="font-normal text-zinc-500">{RANGE_WORDS[range]}</span>
                </div>
              )
            })()}
            <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
              {asset.underlying ? (
                <span>
                  {asset.underlying} stock{' '}
                  <span className="tabular-nums text-zinc-300">
                    {asset.stockPrice != null ? formatPrice(asset.stockPrice) : '—'}
                  </span>
                  {!marketOpen && asset.stockPrice != null && (
                    <span className="text-zinc-600"> (last close)</span>
                  )}
                </span>
              ) : (
                <span>NAV-based · no listed underlying</span>
              )}
            </div>
          </div>
          <div className="text-right">
            <PremiumPill asset={asset} />
          </div>
        </div>
      </div>

      {isThinlyTraded(asset) && (
        <div className="mx-4 mt-4 rounded-xl bg-zinc-900 p-3.5">
          <p className="text-xs leading-relaxed text-zinc-400">
            <span className="font-medium text-zinc-300">Thinly traded</span> — about{' '}
            {asset.volume24h != null ? formatCompact(asset.volume24h) : 'very little'} changed
            hands in 24h, so small trades can move this token's price. Treat the gap vs{' '}
            {asset.underlying} as noisy, not as a real mispricing.
          </p>
        </div>
      )}

      <div className="mt-5 px-2">
        <DualLineChart
          token={chart.token}
          stock={chart.stock}
          premium={chart.premium}
          loading={chart.loading}
          error={chart.error}
          onRetry={() => setChartRetry((n) => n + 1)}
          showToken={visibleLines.token}
          showStock={visibleLines.stock}
        />
        <div className="flex items-center justify-center gap-4 pt-2 text-xs text-zinc-500">
          {asset.underlying && chart.stock.length >= 2 && (
            <button
              onClick={() => toggleLine('stock')}
              className={`flex items-center gap-1.5 rounded-full px-2 py-1 transition-all active:bg-zinc-900 ${
                visibleLines.stock ? '' : 'opacity-40'
              }`}
            >
              <span className="h-0.5 w-4 rounded bg-zinc-500" /> {asset.underlying} stock
              {chart.stockIsFlat && <span className="text-zinc-600">(last close)</span>}
            </button>
          )}
          <button
            onClick={() => toggleLine('token')}
            className={`flex items-center gap-1.5 rounded-full px-2 py-1 transition-all active:bg-zinc-900 ${
              visibleLines.token ? '' : 'opacity-40'
            }`}
          >
            <span className="h-0.5 w-4 rounded bg-accent" /> {asset.ticker} token
          </button>
        </div>
      </div>

      {!chart.loading && !chart.error && <PremiumChart premium={chart.premium} />}

      <div className="flex justify-center gap-2 px-4 pt-4">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              range === r ? 'bg-accent text-zinc-950' : 'text-zinc-500 active:bg-zinc-900'
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className={`grid gap-3 px-4 pt-6 ${asset.underlying ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <button
          onClick={() => setFoldersOpen(true)}
          className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-100 transition-colors active:bg-zinc-800"
        >
          <PlusIcon size={17} className="text-accent" />
          {memberCount > 0 ? `In ${memberCount} folder${memberCount === 1 ? '' : 's'}` : 'Add to folder'}
        </button>
        {asset.underlying && (
          <button
            onClick={() => setAlertOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-100 transition-colors active:bg-zinc-800"
          >
            <BellIcon size={17} className="text-accent" />
            {alertLabel}
          </button>
        )}
      </div>

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

      {siblings.length > 0 && (
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
      )}

      {(asset.volume24h != null || asset.marketCap != null || info.profile) && (
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
      )}

      {info.profile && (
        <div className="px-4 pt-6">
          <h3 className="text-sm font-semibold text-zinc-300">About {asset.underlying}</h3>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {info.profile.name}
            {info.profile.finnhubIndustry && ` operates in ${info.profile.finnhubIndustry}`}
            {info.profile.exchange && `, listed on ${info.profile.exchange}`}
            {info.profile.ipo && ` and publicly traded since ${info.profile.ipo.slice(0, 4)}`}.{' '}
            {asset.ticker} is a token that tracks its share price
            {asset.chain ? ` on ${asset.chain}` : ''}.
          </p>
        </div>
      )}

      {info.recs && (() => {
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
              <span className="ml-auto text-zinc-600">{total} analysts</span>
            </div>
          </div>
        )
      })()}

      {info.earnings?.length > 0 && (
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
          <p className="mt-1.5 px-1 text-[11px] text-zinc-600">
            Quarterly results for {asset.underlying}, the stock this token tracks.
          </p>
        </div>
      )}

      {info.news?.length > 0 && (
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
                <div className="mt-1 text-[11px] text-zinc-600">
                  {n.source} · {timeAgo(n.at)}
                </div>
              </a>
            ))}
          </div>
          <p className="mt-1.5 px-1 text-[11px] text-zinc-600">
            Coverage of {asset.underlying}, the stock this token tracks. Links open the source.
          </p>
        </div>
      )}

      {info.loading && asset.underlying && (
        <div className="px-4 pt-6">
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-900" />
        </div>
      )}

      <div className="px-4 pt-6">
        <div className="rounded-2xl bg-zinc-900/60">
          <button
            onClick={() => setDetailsOpen((o) => !o)}
            className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-zinc-300"
          >
            Details
            <ChevronDown
              size={18}
              className={`text-zinc-500 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {detailsOpen && (
            <dl className="space-y-2.5 px-4 pb-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Issuer</dt>
                <dd className="text-zinc-300">{asset.issuer}</dd>
              </div>
              {asset.chain && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Chain</dt>
                  <dd className="text-zinc-300">{asset.chain}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-zinc-500">Underlying</dt>
                <dd className="text-zinc-300">{asset.underlying ?? 'NAV-based'}</dd>
              </div>
              {asset.marketCap != null && (
                <div className="flex justify-between">
                  <dt className="text-zinc-500">Token market cap</dt>
                  <dd className="tabular-nums text-zinc-300">
                    ${asset.marketCap.toLocaleString('en-US')}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>

      <UpdatedAgo className="pt-4 text-center" />

      {foldersOpen && <AddToFolderSheet asset={asset} onClose={() => setFoldersOpen(false)} />}
      {alertOpen && <SetAlertSheet asset={asset} onClose={() => setAlertOpen(false)} />}
      {shareOpen && <ShareSheet asset={asset} onClose={() => setShareOpen(false)} />}
    </div>
  )
}
