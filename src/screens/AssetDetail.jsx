import { useState } from 'react'
import { useAsset, usePrices } from '../state/PricesContext'
import { useFolders } from '../state/FoldersContext'
import { useAlerts } from '../state/AlertsContext'
import AddToFolderSheet from '../overlays/AddToFolderSheet'
import SetAlertSheet from '../overlays/SetAlertSheet'
import ShareSheet from '../overlays/ShareSheet'
import DualLineChart from '../components/DualLineChart'
import { useChartData, CHART_RANGES } from '../hooks/useChartData'
import { useStockInfo } from '../hooks/useStockInfo'
import { formatCompact } from '../lib/format'
import { premiumPct } from '../lib/prices'
import { ChevronLeft, ChevronDown, ShareIcon, PlusIcon, BellIcon } from '../components/Icons'
import { formatPrice, formatPct, PremiumPill, changeColor } from '../components/shared'
import PriceText from '../components/PriceText'
import UpdatedAgo from '../components/UpdatedAgo'

const RANGES = Object.keys(CHART_RANGES)

export default function AssetDetail({ assetId, onBack }) {
  const [range, setRange] = useState('1D')
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [chartRetry, setChartRetry] = useState(0)
  const asset = useAsset(assetId)
  const { marketOpen } = usePrices()
  const { folders } = useFolders()
  const { rules } = useAlerts()
  const chart = useChartData(asset ?? { id: assetId }, range, chartRetry)
  const info = useStockInfo(asset?.underlying)
  if (!asset) return null
  const p = premiumPct(asset)
  const memberCount = folders.filter((f) => f.assetIds.includes(asset.id)).length
  const alertRule = rules[asset.id]

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
        <button
          onClick={() => setShareOpen(true)}
          aria-label="Share"
          className="mr-2 flex h-9 w-9 items-center justify-center rounded-full text-zinc-300 transition-colors active:bg-zinc-800"
        >
          <ShareIcon size={19} />
        </button>
      </header>

      <div className="px-4">
        <div className="text-sm text-zinc-500">
          {asset.name} · {asset.issuer}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{asset.ticker}</h1>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="text-3xl font-semibold">
              <PriceText value={asset.tokenPrice} skeletonWidth="w-28" />
            </div>
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
            {asset.dayChange != null && p != null && (
              <div className={`mt-1 text-xs tabular-nums ${changeColor(asset.dayChange)}`}>
                {formatPct(asset.dayChange)} today
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 px-2">
        <DualLineChart
          token={chart.token}
          stock={chart.stock}
          loading={chart.loading}
          error={chart.error}
          onRetry={() => setChartRetry((n) => n + 1)}
        />
        <div className="flex items-center justify-center gap-5 pt-2 text-xs text-zinc-500">
          {asset.underlying && chart.stock.length >= 2 && (
            <span className="flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded bg-zinc-500" /> {asset.underlying} stock
              {chart.stockIsFlat && <span className="text-zinc-600">(last close)</span>}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded bg-accent" /> {asset.ticker} token
          </span>
        </div>
      </div>

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
            {alertRule ? `Alert at ±${alertRule.threshold}%` : 'Set alert'}
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
          <span className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400">
            {asset.chain}
          </span>
        </div>
      </div>

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
            {asset.ticker} is a token that tracks its share price on {asset.chain}.
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
              <div className="flex justify-between">
                <dt className="text-zinc-500">Chain</dt>
                <dd className="text-zinc-300">{asset.chain}</dd>
              </div>
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
