import { Component, Suspense, lazy, useEffect, useState } from 'react'
import { useAsset, usePrices, useAssetSubscription } from '../state/PricesContext'
import { getTokenSpread } from '../services/jupiter'
import { track } from '../services/analytics'
import { recordView } from '../lib/recentViews'
import { ASSETS } from '../data/universe'
import { useFolders } from '../state/FoldersContext'
import { useAlerts } from '../state/AlertsContext'
import AddToFolderSheet from '../overlays/AddToFolderSheet'
import SwapSheet from '../overlays/SwapSheet'
import { useWallet } from '../state/WalletContext'
import SetAlertSheet from '../overlays/SetAlertSheet'
import ShareSheet from '../overlays/ShareSheet'
import DualLineChart from '../components/DualLineChart'
import PremiumChart from '../components/PremiumChart'
import { useChartData, CHART_RANGES } from '../hooks/useChartData'
import { useStockInfo } from '../hooks/useStockInfo'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { formatCompact, timeAgo, EM_DASH } from '../lib/format'
import { isThinlyTraded, premiumPct } from '../lib/prices'
import { ChevronLeft, ChevronDown, ShareIcon, PlusIcon, BellIcon, StarIcon } from '../components/Icons'
import { formatPrice, formatPct, GapBar, changeColor, Chip } from '../components/shared'
import PriceText from '../components/PriceText'
import UpdatedAgo from '../components/UpdatedAgo'
import AssetLogo from '../components/AssetLogo'
import WatchlistPane from '../components/WatchlistPane'

const RANGES = Object.keys(CHART_RANGES)
const RANGE_WORDS = { '1D': 'today', '1W': 'past week', '1M': 'past month', '3M': 'past 3 months', '1Y': 'past year' }

/* One row of the Key statistics disclosure; hides itself when the value is missing. */
function StatRow({ label, value }) {
  if (value == null) return null
  return (
    <div className="flex justify-between">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="tabular-nums text-zinc-300">{value}</dd>
    </div>
  )
}

/* One row of the side-by-side comparison grid: label, stock cell, token cell. */
function CompareRow({ label, stock, token }) {
  return (
    <>
      <div className="text-zinc-500">{label}</div>
      <div className="text-right text-[13px] leading-tight tabular-nums text-zinc-300">{stock ?? '—'}</div>
      <div className="text-right text-[13px] leading-tight tabular-nums text-zinc-300">{token ?? '—'}</div>
    </>
  )
}

const compactNum = (n) =>
  Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n)

/* The Candles mode, loaded the first time someone taps it. It brings the
   TradingView charting library with it, which is why it is not in the main
   bundle: the Gap chart is what the app is about and what most sessions
   look at. */
const CandlesPanel = lazy(() => import('../components/CandlesPanel'))

/* If that chunk cannot be fetched (offline, a stale deploy), the mode renders
   one caption line rather than throwing to the app-level boundary, which
   would blank the whole screen over a secondary surface. */
class CandlesBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error, info) {
    // Same reporting as the app-level ErrorBoundary: the caption alone hides
    // a crash of this chunk from the console and from monitoring.
    console.error('Candles crashed:', error, info?.componentStack)
    window.__bwReportError?.(error, info?.componentStack)
  }
  render() {
    if (this.state.failed) {
      return <p className="t-caption mt-3 px-4 text-zinc-600">Candles could not load right now.</p>
    }
    return this.props.children
  }
}

const CANDLES_SKELETON = <div className="mx-3 mt-3 h-[204px] animate-pulse rounded-2xl bg-zinc-900" />

export default function AssetDetail({ assetId, onBack, onSwitchAsset }) {
  const [range, setRange] = useState('1D')
  // Scrubbing the chart drives the headline price (Robinhood-style); null =
  // live. Cleared on range switch and on pointer release (chart emits null).
  const [scrub, setScrub] = useState(null)
  const [statsOpen, setStatsOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [foldersOpen, setFoldersOpen] = useState(false)
  const [alertOpen, setAlertOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [swapOpen, setSwapOpen] = useState(false)
  const wallet = useWallet()
  const [chartRetry, setChartRetry] = useState(0)
  const [visibleLines, setVisibleLines] = useState({ token: true, stock: true })
  // Chart mode. Gap is the app's thesis and the default; Candles is one side
  // of it at a time, drawn the way a trader expects. Nothing in Gap mode
  // changes when the other mode exists.
  const [chartMode, setChartMode] = useState('gap')

  // Legend taps solo a line; at least one always stays visible.
  function toggleLine(key) {
    setVisibleLines((v) => {
      const next = { ...v, [key]: !v[key] }
      return next.token || next.stock ? next : v
    })
  }
  const asset = useAsset(assetId)
  const { marketOpen, session, assets, lastFetchAt } = usePrices()

  // This asset + its cross-issuer siblings (same underlying) need live token
  // prices and the underlying's quote — long-tail assets aren't polled
  // otherwise. Sibling ids come from the static universe so the list is
  // stable regardless of what data has arrived.
  const staticAsset = ASSETS.find((a) => a.id === assetId)
  const subIds = staticAsset?.underlying
    ? ASSETS.filter((a) => a.underlying === staticAsset.underlying).map((a) => a.id)
    : [assetId]
  useAssetSubscription(`detail:${assetId}`, subIds)

  // Feed the search overlay's "Recently viewed" shelf.
  useEffect(() => {
    recordView(assetId)
  }, [assetId])

  // Live buy/sell readout from the DEX — what a ~$200 trade would actually
  // execute at in each direction. Solana-minted assets only.
  const [spread, setSpread] = useState(null)
  useEffect(() => {
    setSpread(null)
    const mint = ASSETS.find((a) => a.id === assetId)?.mint
    if (!mint) return
    let cancelled = false
    getTokenSpread(mint).then((s) => {
      if (!cancelled) setSpread(s)
    })
    return () => {
      cancelled = true
    }
  }, [assetId])

  const { folders, watchlistIds, toggleWatchlist } = useFolders()
  const { rules } = useAlerts()
  const chart = useChartData(asset ?? { id: assetId }, range, chartRetry)
  const info = useStockInfo(asset?.underlying)
  // `hidden lg:block` on the aside only hides the watchlist pane; it would
  // still mount and subscribe every watchlist ticker on phones and in the
  // iOS shell. Gate the pane itself on Tailwind's lg (64rem) instead.
  const desktop = useMediaQuery('(min-width: 64rem)')
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

  // Key statistics has a token group and a stock group; either can be absent
  // (token-only products have no stock side, fresh assets may lack data).
  const ts = asset.tokenStats
  const hasTokenStats = ts != null && (ts.high24h != null || ts.ath != null || ts.supply != null)
  const hasStockStats = asset.underlying && (asset.stockQuote || info.metrics)
  // Both sides present → the shared figures render as a side-by-side grid
  // (the app's whole thesis in table form); leftovers list underneath.
  const bothSides = hasTokenStats && hasStockStats

  // z sits ABOVE the search overlay (40): opening an asset from search keeps
  // search mounted underneath, so Back returns to the typed query.
  return (
    <div
      className="screen-in fixed inset-0 z-[45] mx-auto max-w-md overflow-y-auto bg-zinc-950 pb-10 lg:flex lg:max-w-[var(--content-max)] lg:overflow-hidden lg:pb-0 lg:border-x"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {/* Desktop only: the watchlist docks on the left at phone-shell width
          (28rem = max-w-md) so the same AssetRow the phone list uses fits.
          Switching remounts this screen via App's key, which is fine — the
          pane's only side effects are a price subscription and a cached
          sparkline fetch. */}
      <aside
        className="hidden lg:block lg:w-[28rem] lg:shrink-0 lg:overflow-y-auto lg:border-r"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        {desktop && <WatchlistPane currentId={asset.id} onOpen={(a) => onSwitchAsset(a.id)} />}
      </aside>
      {/* On desktop this pane is the scroll container, so the sticky header
          below keeps pinning to it. Under lg: it is an inert wrapper. */}
      <div className="lg:min-w-0 lg:flex-1 lg:overflow-y-auto lg:pb-10">
      <div className="lg:max-w-md">
      {/* Top padding travels with the sticky bar, so the notch / Dynamic
          Island never overlaps Back/Star/Share. env() is 0px on the web, so
          max(…) reproduces the previous py-3 exactly there. */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-zinc-950/90 px-2 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] backdrop-blur">
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
            className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors active:bg-zinc-800 ${
              inWatchlist ? 'text-accent' : 'text-zinc-300'
            }`}
          >
            <StarIcon size={19} filled={inWatchlist} />
          </button>
          <button
            onClick={() => setShareOpen(true)}
            aria-label="Share"
            className="flex h-11 w-11 items-center justify-center rounded-full text-zinc-300 transition-colors active:bg-zinc-800"
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

        {/*
          The gap leads. It used to be a small pill in the corner while the
          token price took the 3xl slot — but the token price alone is a fact
          any tracker has. The distance between the two legs is the only number
          this app computes, so it gets the display step, stated as a
          percentage AND in money (a percentage is abstract; $0.78 is not).

          Bordered, not filled: the two legs sit inside without becoming a card
          within a card.
        */}
        {(() => {
          const gap = premiumPct(asset)
          const tokenNow = scrub?.price ?? asset.tokenPrice
          const diff =
            tokenNow != null && asset.stockPrice != null ? tokenNow - asset.stockPrice : null
          const thin = isThinlyTraded(asset)

          // Per-leg freshness. The two sides of this comparison have different
          // ages: the token trades continuously while the share can be hours
          // stale and shut. One global "updated 5m ago" would hide exactly the
          // caveat that makes the gap readable.
          const tokenAge = lastFetchAt ? timeAgo(lastFetchAt) : '—'
          // In pre/post the share is trading and this quote is not following
          // it, so "at last close" alone would understate how stale it is.
          const STALE_LABEL = {
            pre: 'at last close · pre-market',
            post: 'at 4pm close · after hours',
            closed: 'at last close',
          }
          const stockAge = !asset.underlying
            ? null
            : marketOpen
              ? lastFetchAt
                ? `${timeAgo(lastFetchAt)} · live`
                : '—'
              : (STALE_LABEL[session] ?? 'at last close')

          return (
            <div
              className="mt-4 rounded-lg border"
              style={{ borderColor: 'var(--border-default)' }}
            >
              <div className="px-4 pt-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="t-micro text-zinc-500">
                    {asset.underlying ? `Gap vs ${asset.underlying}` : 'NAV-based'}
                  </span>
                  {diff != null && (
                    <span className="t-caption text-right text-zinc-500">
                      {formatPrice(Math.abs(diff))}{' '}
                      {diff >= 0 ? 'above the share' : 'below the share'}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center justify-between gap-3">
                  <span
                    className={`num t-display ${thin ? 'text-zinc-500' : changeColor(gap)}`}
                  >
                    {gap != null ? formatPct(gap) : EM_DASH}
                  </span>
                  {/* Capped, not full-bleed. Stretched across the panel the
                      track read as a progress meter — a long empty left half
                      looks unfilled rather than "below zero". At row width it
                      reads as what it is: a deviation from centre. */}
                  <GapBar pct={gap} thin={thin} width={120} />
                </div>
              </div>

              <div
                className="mt-3.5 grid grid-cols-2 border-t"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="px-4 py-3">
                  <div className="t-caption text-zinc-500">{asset.ticker} token</div>
                  <div className="num t-title mt-0.5 text-zinc-100">
                    {scrub ? formatPrice(scrub.price) : <PriceText value={asset.tokenPrice} />}
                  </div>
                  <div className="t-caption mt-0.5 text-zinc-500">{tokenAge}</div>
                </div>
                {asset.underlying && (
                  <div
                    className="border-l px-4 py-3"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="t-caption text-zinc-500">{asset.underlying} share</div>
                    <div className="num t-title mt-0.5 text-zinc-100">
                      {asset.stockPrice != null ? formatPrice(asset.stockPrice) : EM_DASH}
                    </div>
                    <div className="t-caption mt-0.5 text-zinc-500">{stockAge}</div>
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* How the token itself moved over the selected zoom — or, while
            scrubbing, from the period start to the finger. Secondary to the
            gap now, so it reads as a caption rather than a headline. */}
        {(() => {
          if (chart.token.length < 2) return null
          const first = chart.token[0].v
          const ref = scrub?.price ?? chart.token[chart.token.length - 1].v
          const pct = ((ref - first) / first) * 100
          const intraday = range === '1D' || range === '1W'
          const suffix = scrub
            ? new Date(Math.round(scrub.t / 300_000) * 300_000).toLocaleString(
                'en-US',
                intraday
                  ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }
                  : { month: 'short', day: 'numeric', year: 'numeric' }
              )
            : RANGE_WORDS[range]
          return (
            <div className="num t-caption mt-2.5 text-zinc-500">
              Token {formatPct(pct)} ({formatPrice(Math.abs(ref - first))}){' '}
              <span className="text-zinc-500">{suffix}</span>
            </div>
          )
        })()}

        {spread && (
          <div className="num t-caption mt-1 text-zinc-500">
            Bid <span className="text-zinc-300">{formatPrice(spread.bid)}</span> · Ask{' '}
            <span className="text-zinc-300">{formatPrice(spread.ask)}</span> ·{' '}
            {spread.spreadPct.toFixed(1)}% spread
          </div>
        )}
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

      {/* Chart mode. Two chips in the range row's language, left-aligned so
          they read as a heading for the chart rather than a control inside
          it. Switching away from Gap clears a scrub so the headline price
          returns to live. */}
      <div className="mt-5 flex gap-2 px-4">
        <Chip
          active={chartMode === 'gap'}
          onClick={() => setChartMode('gap')}
        >
          Gap
        </Chip>
        <Chip
          active={chartMode === 'candles'}
          onClick={() => {
            if (chartMode === 'candles') return
            setScrub(null)
            setChartMode('candles')
            track('chart_mode', { mode: 'candles', ticker: asset.ticker })
          }}
        >
          Candles
        </Chip>
      </div>

      {/* Candles mode. Mounted only while showing, so leaving it tears the
          chart down and Gap mode never spends a GeckoTerminal request. The
          static record goes in, not the live asset: the panel's fetch keys
          on object identity and the live one changes every tick. */}
      {chartMode === 'candles' && staticAsset && (
        <CandlesBoundary>
          <Suspense fallback={CANDLES_SKELETON}>
            <CandlesPanel asset={staticAsset} />
          </Suspense>
        </CandlesBoundary>
      )}

      {chartMode === 'gap' && (
        <div className="mt-3 px-2">
          <DualLineChart
            token={chart.token}
            stock={chart.stock}
            premium={chart.premium}
            loading={chart.loading}
            error={chart.error}
            onRetry={() => setChartRetry((n) => n + 1)}
            onScrub={setScrub}
            showToken={visibleLines.token}
            showStock={visibleLines.stock}
          />
          {/* These are controls, not a caption, and they used to read as one:
              swatch + label with no persistent affordance, press feedback that
              only appeared once you were already pressing, and rounded-full —
              which this system reserves for STATUS. A first-time user had no
              reason to think the lines could be soloed at all.
              Now they borrow FilterChips' language exactly (squared, active is a
              bordered surface, same padding), so they read as the same kind of
              thing. Off-state mutes the swatch rather than the whole chip:
              opacity-40 on the button said "disabled", not "you turned this
              off". */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {asset.underlying && chart.stock.length >= 2 && (
              <button
                onClick={() => toggleLine('stock')}
                aria-pressed={visibleLines.stock}
                className={`t-label flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                  visibleLines.stock ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
                }`}
                style={
                  visibleLines.stock
                    ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' }
                    : undefined
                }
              >
                <span
                  className={`h-0.5 w-4 rounded bg-zinc-400 ${visibleLines.stock ? '' : 'opacity-40'}`}
                />
                {asset.underlying} stock
                {chart.stockIsFlat && <span className="text-zinc-500">(last close)</span>}
              </button>
            )}
            <button
              onClick={() => toggleLine('token')}
              aria-pressed={visibleLines.token}
              className={`t-label flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors ${
                visibleLines.token ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
              }`}
              style={
                visibleLines.token ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined
              }
            >
              <span
                className={`h-0.5 w-4 rounded bg-accent ${visibleLines.token ? '' : 'opacity-40'}`}
              />
              {asset.ticker} token
            </button>
          </div>
          {/* Says the chips are tappable in words. Making them look like
              controls was necessary but not sufficient — a first-time reader
              still has to guess what soloing a line is FOR, so the line says
              that too. Only shown when there are actually two lines to choose
              between; with no underlying there is nothing to hide. */}
          {asset.underlying && chart.stock.length >= 2 && (
            <p className="t-caption pt-1.5 text-center text-zinc-500">
              Tap either to hide that line and read the other on its own.
            </p>
          )}
        </div>
      )}

      {chartMode === 'gap' && !chart.loading && !chart.error && (
        <PremiumChart premium={chart.premium} />
      )}

      {chartMode === 'gap' && (
        <div className="flex justify-center gap-2 px-4 pt-4">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => {
                setScrub(null) // a new zoom invalidates the old finger position
                setRange(r)
              }}
              className={`t-label rounded-md px-3 py-1.5 transition-colors ${
                range === r ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500 active:bg-zinc-900'
              }`}
              style={
                range === r ? { boxShadow: 'inset 0 0 0 1px var(--border-strong)' } : undefined
              }
            >
              {r}
            </button>
          ))}
        </div>
      )}

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

      {/* The trading ladder in one block: wallet connected → in-app swap
          (rung two); otherwise route out to Jupiter (rung one). */}
      {asset.mint && (
        <div className="px-4 pt-3">
          {/* Connecting a wallet is a decision the user made, so an in-app
              swap keeps the filled accent. Routing OUT to Jupiter does not:
              it was a full-width saturated block, unambiguously the loudest
              object on a screen whose job is comparing two prices — shouting
              an outbound link over the number the page exists to show. It is
              a bordered button now: same size, same position, still obvious,
              no longer the first thing your eye lands on. */}
          {wallet.publicKey ? (
            <button
              onClick={() => setSwapOpen(true)}
              className="t-label flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
            >
              Swap {asset.ticker}
            </button>
          ) : (
            <a
              href={`https://jup.ag/swap/USDC-${asset.mint}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('trade_out', { ticker: asset.ticker, venue: 'jupiter' })}
              className="t-label flex items-center justify-center gap-2 rounded-lg py-3 font-medium text-zinc-100 transition-colors active:bg-zinc-900"
              style={{ boxShadow: 'inset 0 0 0 1px var(--border-strong)' }}
            >
              Trade {asset.ticker} on Jupiter ↗
            </a>
          )}
          <p className="mt-1.5 text-center text-[11px] leading-relaxed text-zinc-400">
            {wallet.publicKey
              ? 'Swaps run from your own wallet — OnStock never holds funds.'
              : 'Opens Jupiter, an external venue — you swap from your own wallet. Availability depends on your region. Not investment advice.'}
          </p>
        </div>
      )}

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

      {(hasTokenStats || hasStockStats) && (
        <div className="px-4 pt-6">
          <div className="rounded-2xl bg-zinc-900/60">
            <button
              onClick={() => setStatsOpen((o) => !o)}
              className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-zinc-300"
            >
              Key statistics
              <ChevronDown
                size={18}
                className={`text-zinc-500 transition-transform ${statsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {statsOpen && (
              <div className="px-4 pb-4 text-sm">
                {bothSides && (
                  <div className="grid grid-cols-[1.1fr_1fr_1fr] items-center gap-x-3 gap-y-2.5 pb-1">
                    <div />
                    <div className="text-right text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      {asset.underlying} stock
                    </div>
                    <div className="text-right text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                      {asset.ticker} token
                    </div>
                    <CompareRow
                      label="Price"
                      stock={asset.stockPrice != null ? formatPrice(asset.stockPrice) : null}
                      token={asset.tokenPrice != null ? formatPrice(asset.tokenPrice) : null}
                    />
                    <CompareRow
                      label="Range (1d)"
                      stock={
                        asset.stockQuote?.dayLow != null && asset.stockQuote?.dayHigh != null ? (
                          <>
                            {formatPrice(asset.stockQuote.dayLow)}
                            <br />– {formatPrice(asset.stockQuote.dayHigh)}
                          </>
                        ) : null
                      }
                      token={
                        ts.low24h != null && ts.high24h != null ? (
                          <>
                            {formatPrice(ts.low24h)}
                            <br />– {formatPrice(ts.high24h)}
                          </>
                        ) : null
                      }
                    />
                    <CompareRow
                      label="Market cap"
                      stock={
                        info.profile?.marketCapitalization > 0
                          ? formatCompact(info.profile.marketCapitalization * 1e6)
                          : null
                      }
                      token={asset.marketCap != null ? formatCompact(asset.marketCap) : null}
                    />
                    <CompareRow
                      label="Volume"
                      stock={
                        info.metrics?.avgVolume10d != null
                          ? `${compactNum(info.metrics.avgVolume10d)} sh`
                          : null
                      }
                      token={asset.volume24h != null ? formatCompact(asset.volume24h) : null}
                    />
                  </div>
                )}

                <dl className={`space-y-2.5 ${bothSides ? 'pt-2' : ''}`}>
                  {hasTokenStats && (
                    <>
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                        {asset.ticker} token
                      </div>
                      {!bothSides && (
                        <StatRow
                          label="24h range"
                          value={
                            ts.low24h != null && ts.high24h != null
                              ? `${formatPrice(ts.low24h)} – ${formatPrice(ts.high24h)}`
                              : null
                          }
                        />
                      )}
                      <StatRow
                        label="All-time high"
                        value={
                          ts.ath != null
                            ? `${formatPrice(ts.ath)}${ts.athChangePct != null ? ` (${ts.athChangePct.toFixed(1)}%)` : ''}`
                            : null
                        }
                      />
                      <StatRow
                        label="Circulating supply"
                        value={ts.supply != null ? `${compactNum(ts.supply)} tokens` : null}
                      />
                      <StatRow
                        label="Bid/ask spread"
                        value={
                          spread ? `${spread.spreadPct.toFixed(1)}% (~$${spread.refUsd} trade)` : null
                        }
                      />
                    </>
                  )}
                  {hasStockStats && (
                    <div className={`text-[11px] font-semibold uppercase tracking-wide text-zinc-500 ${hasTokenStats ? 'pt-2' : ''}`}>
                      {asset.underlying} stock
                    </div>
                  )}
                  <StatRow
                    label="Previous close"
                    value={asset.stockQuote?.prevClose != null ? formatPrice(asset.stockQuote.prevClose) : null}
                  />
                  <StatRow
                    label="Open"
                    value={asset.stockQuote?.open != null ? formatPrice(asset.stockQuote.open) : null}
                  />
                  {!bothSides && (
                    <StatRow
                      label="Day range"
                      value={
                        asset.stockQuote?.dayLow != null && asset.stockQuote?.dayHigh != null
                          ? `${formatPrice(asset.stockQuote.dayLow)} – ${formatPrice(asset.stockQuote.dayHigh)}`
                          : null
                      }
                    />
                  )}
                  <StatRow
                    label="52-week range"
                    value={
                      info.metrics?.low52 != null && info.metrics?.high52 != null
                        ? `${formatPrice(info.metrics.low52)} – ${formatPrice(info.metrics.high52)}`
                        : null
                    }
                  />
                  <StatRow label="P/E ratio (TTM)" value={info.metrics?.pe != null ? info.metrics.pe.toFixed(1) : null} />
                  <StatRow label="EPS (TTM)" value={info.metrics?.eps != null ? formatPrice(info.metrics.eps) : null} />
                  <StatRow
                    label="Dividend yield"
                    value={info.metrics?.divYield != null ? `${info.metrics.divYield.toFixed(2)}%` : null}
                  />
                  <StatRow label="Beta" value={info.metrics?.beta != null ? info.metrics.beta.toFixed(2) : null} />
                  {!bothSides && (
                    <StatRow
                      label="Avg volume (10d)"
                      value={info.metrics?.avgVolume10d != null ? `${compactNum(info.metrics.avgVolume10d)} shares` : null}
                    />
                  )}
                  {hasStockStats && (
                    <p className="pt-1 text-[11px] leading-relaxed text-zinc-500">
                      Stock figures describe {asset.underlying}, the share this token tracks.
                    </p>
                  )}
                </dl>
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
              <span className="ml-auto text-zinc-500">{total} analysts</span>
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
          <p className="mt-1.5 px-1 text-[11px] text-zinc-500">
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
      </div>
      </div>

      {foldersOpen && <AddToFolderSheet asset={asset} onClose={() => setFoldersOpen(false)} />}
      {alertOpen && <SetAlertSheet asset={asset} onClose={() => setAlertOpen(false)} />}
      {shareOpen && <ShareSheet asset={asset} onClose={() => setShareOpen(false)} />}
      {swapOpen && <SwapSheet asset={asset} onClose={() => setSwapOpen(false)} />}
    </div>
  )
}
