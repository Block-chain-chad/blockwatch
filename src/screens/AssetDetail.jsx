import { Component, Suspense, lazy, useEffect, useState } from 'react'
import { track } from '../services/analytics'
import { recordView } from '../lib/recentViews'
import AddToFolderSheet from '../overlays/AddToFolderSheet'
import SwapSheet from '../overlays/SwapSheet'
import SetAlertSheet from '../overlays/SetAlertSheet'
import ShareSheet from '../overlays/ShareSheet'
import DualLineChart from '../components/DualLineChart'
import PremiumChart from '../components/PremiumChart'
import { CHART_RANGES } from '../hooks/useChartData'
import { useAssetWorkspace } from '../hooks/useAssetWorkspace'
import { useMediaQuery } from '../hooks/useMediaQuery'
import WatchlistPane from '../components/WatchlistPane'
import { formatCompact } from '../lib/format'
import { isThinlyTraded } from '../lib/prices'
import { ChevronLeft, ShareIcon, PlusIcon, BellIcon, StarIcon } from '../components/Icons'
import { formatPrice, formatPct, Chip } from '../components/shared'
import UpdatedAgo from '../components/UpdatedAgo'
import AssetLogo from '../components/AssetLogo'
import GapPanel from '../components/asset/GapPanel'
import TradeButton from '../components/asset/TradeButton'
import TradesOn from '../components/asset/TradesOn'
import AlsoTokenizedBy from '../components/asset/AlsoTokenizedBy'
import StatsSection from '../components/asset/StatsSection'
import KeyStatistics from '../components/asset/KeyStatistics'
import AboutSection from '../components/asset/AboutSection'
import AnalystRatings from '../components/asset/AnalystRatings'
import EarningsSection from '../components/asset/EarningsSection'
import AssetNews from '../components/asset/AssetNews'
import DetailsSection from '../components/asset/DetailsSection'

const RANGES = Object.keys(CHART_RANGES)
const RANGE_WORDS = { '1D': 'today', '1W': 'past week', '1M': 'past month', '3M': 'past 3 months', '1Y': 'past year' }

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

/* The phone asset screen: a full-screen overlay above the tab bar. The
   desktop has its own shell (components/desktop) and never mounts this in a
   browser at >= 1024px. The lg: dock below (the docked WatchlistPane, the
   flex root and the two scroll wrappers) is kept exactly as release/onstock
   has it: under 1024px every one of those classes is inert, so the phone
   DOM stays byte-identical to the base, and inside the native shell at iPad
   widths — where the desktop gate is off — the screen behaves exactly as
   today. */
export default function AssetDetail({ assetId, onBack, onSwitchAsset }) {
  const desktop = useMediaQuery('(min-width: 64rem)')
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

  const {
    asset,
    staticAsset,
    marketOpen,
    session,
    lastFetchAt,
    chart,
    info,
    spread,
    siblings,
    memberCount,
    alertLabel,
    inWatchlist,
    toggleWatchlist,
    hasTokenStats,
    hasStockStats,
    bothSides,
  } = useAssetWorkspace(assetId, range, chartRetry)

  // Feed the search overlay's "Recently viewed" shelf.
  useEffect(() => {
    recordView(assetId)
  }, [assetId])

  if (!asset) return null

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
        {desktop && (
          <WatchlistPane
            currentId={asset.id}
            onOpen={(a) => onSwitchAsset(a.id)}
            onRemove={(a) => toggleWatchlist(a.id)}
          />
        )}
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

        {/* The gap leads: the bordered block with the gap %, its bar, and the
            two legs with their own ages. */}
        <GapPanel
          asset={asset}
          scrub={scrub}
          session={session}
          marketOpen={marketOpen}
          lastFetchAt={lastFetchAt}
        />

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

      {/* The swap sheet stays in this screen's tail with the other sheets, so
          the button only asks to open it. */}
      <TradeButton asset={asset} onSwap={() => setSwapOpen(true)} />

      <TradesOn asset={asset} />

      <AlsoTokenizedBy asset={asset} siblings={siblings} onSwitchAsset={onSwitchAsset} />

      <StatsSection asset={asset} info={info} />

      <KeyStatistics
        asset={asset}
        info={info}
        spread={spread}
        hasTokenStats={hasTokenStats}
        hasStockStats={hasStockStats}
        bothSides={bothSides}
        open={statsOpen}
        onToggle={() => setStatsOpen((o) => !o)}
      />

      <AboutSection asset={asset} info={info} />

      <AnalystRatings info={info} />

      <EarningsSection asset={asset} info={info} />

      <AssetNews asset={asset} info={info} />

      {info.loading && asset.underlying && (
        <div className="px-4 pt-6">
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-900" />
        </div>
      )}

      <DetailsSection
        asset={asset}
        open={detailsOpen}
        onToggle={() => setDetailsOpen((o) => !o)}
      />

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
