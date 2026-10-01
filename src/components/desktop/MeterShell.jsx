import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../../services/analytics'
import { useFolders } from '../../state/FoldersContext'
import { useAsset } from '../../state/PricesContext'
import { useLocalState } from '../../hooks/useLocalState'
import { useMeterShortcuts } from '../../hooks/useMeterShortcuts'
import { useAlertNotifications } from '../../hooks/useAlertNotifications'
import { useWindowWidth } from '../../hooks/useWindowWidth'
import { bigScreen } from '../../lib/bigScreen'
import { getRecentViews } from '../../lib/recentViews'
import { ASSET_IDS } from '../../data/universe'
import { pickInitialAsset } from '../../lib/desktopState'
import { premiumPct } from '../../lib/prices'
import { meterTitle, boardTitle, screenTitle, DEFAULT_TITLE } from '../../lib/pageTitle'
import { closedGapLabelFor } from '../../lib/sessionCopy'
import { meterShortcutRows, isMacPlatform } from '../../lib/meterKeys'
import { classifyVisit } from '../../lib/returnVisit'
import { DESKTOP_HOME_KEY } from '../../lib/desktopHome'
import { FoldersList, FolderDetail } from '../../screens/Folders'
import News from '../../screens/News'
import { Holdings } from '../../webOnly'
import Masthead from './Masthead'
import Board from './Board'
import Readout from './Readout'
import ChartWorkspace from './ChartWorkspace'
import ShortcutSheet from './ShortcutSheet'
import SetAlertSheet from '../../overlays/SetAlertSheet'
import AddToFolderSheet from '../../overlays/AddToFolderSheet'
import ShareSheet from '../../overlays/ShareSheet'

const KNOWN_IDS = new Set(ASSET_IDS)

/*
 * The Meter (spec §3.2): the masthead over the Board and the Readout; the
 * chart is a drill-in one key away. Mounted by App at 1024px and up in a
 * browser when the desktop home is 'meter'; the Phase 1 DesktopShell is the
 * other home until the owner picks. Folders, News and Holdings take over the
 * whole area below the masthead (their phone screens at 640px, centred);
 * picking an asset from any of them returns the Board with that wrapper in
 * the Readout.
 */
export default function MeterShell({ tab, onTab, assetId, onSelectAsset, openFolderId, onOpenFolder, onOpenProfile }) {
  const [lens, setLens] = useLocalState('bw.meter.lens.v1', null)
  const [chartOpen, setChartOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [sheet, setSheet] = useState(null) // 'folder' | 'alert' | 'share' | null (the Readout renders it)
  const [alertFor, setAlertFor] = useState(null) // an asset id the A key picked on the Board
  const searchRef = useRef(null)
  const boardRef = useRef(null)
  const chartRef = useRef(null)
  const { watchlistIds, toggleWatchlist } = useFolders()
  const alertAsset = useAsset(alertFor)
  const asset = useAsset(assetId)

  // The one window measurement (spec 2026-09-15 §2.1): bigScreen sizes the
  // Board's rule, the Readout column and the gap history from it, and the
  // shell hands the result down. Memoised on the width so a price re-render
  // does not hand the children a fresh object.
  const width = useWindowWidth()
  const big = useMemo(() => bigScreen(width), [width])

  // Fired alerts reach the operating system while a Meter tab is open
  // (spec 2026-09-15 §4.1); the hook decides focus and permission.
  useAlertNotifications()

  // Owner question 1's default: open on Watching when it has rows, else the
  // Board; after that the last lens is remembered.
  const effectiveLens = lens ?? (watchlistIds.length > 0 ? 'watching' : 'all')

  // Restore on load: the remembered wrapper, else the last viewed, else the
  // first Watching row. Runs once.
  const [savedAssetId, setSavedAssetId] = useLocalState('bw.meter.asset.v1', null)
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    if (assetId != null) return
    const pick = pickInitialAsset({ saved: savedAssetId, recent: getRecentViews(), watchlistIds, known: KNOWN_IDS })
    if (pick) onSelectAsset(pick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    if (assetId != null) setSavedAssetId(assetId)
  }, [assetId, setSavedAssetId])

  // The return counter, once per mount: first / return within 7 days / lapsed.
  useEffect(() => {
    let lastSeen = null
    try {
      lastSeen = Number(localStorage.getItem('bw.meter.lastSeen.v1')) || null
      localStorage.setItem('bw.meter.lastSeen.v1', String(Date.now()))
    } catch {
      // storage unavailable; the event still fires as a first visit
    }
    const visit = classifyVisit({ lastSeenMs: lastSeen, nowMs: Date.now() })
    track('meter_open', { home: 'meter', visit: visit.kind, days: visit.days })
  }, [])

  // Leaving the Board for a takeover closes the chart; a pick from the
  // chart's own tabs or the masthead search while the chart is open stays
  // in the chart.
  useEffect(() => {
    if (tab !== 'home') setChartOpen(false)
  }, [tab])

  const gapPct = asset ? premiumPct(asset) : null
  const closedVs = closedGapLabelFor(asset)?.vs ?? null
  useEffect(() => {
    if (tab !== 'home') document.title = screenTitle(tab)
    else document.title = asset ? meterTitle({ ticker: asset.ticker, gapPct, closed: closedGapLabelFor(asset) }) : boardTitle()
  }, [tab, asset?.ticker, gapPct, closedVs]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    document.title = DEFAULT_TITLE
  }, [])

  function select(id, { from = 'board' } = {}) {
    onSelectAsset(id)
    track('meter_asset', { from })
  }

  // The chart and fullscreen are Board-only: a takeover screen (Folders,
  // News, Holdings) keeps the 'board' key scope, so C and F must ignore it or
  // they leave state behind that springs open on the way back.
  function openChart() {
    if (!assetId || tab !== 'home') return
    setChartOpen(true)
    track('meter_chart_open')
  }

  const drillIn = useMemo(
    () => ({ onExit: () => setChartOpen(false), onSheet: setSheet, onShortcuts: () => setShortcutsOpen(true) }),
    [],
  )

  useMeterShortcuts({
    scope: chartOpen ? 'chart' : 'board',
    searchRef,
    boardRef,
    chartRef,
    onWatch: (id) => toggleWatchlist(id),
    onAlert: (id) => setAlertFor(id),
    onChart: openChart,
    onFullscreen: () => {
      if (tab === 'home') setFullscreen((f) => !f)
    },
    onExitFullscreen: () => {
      if (!fullscreen) return false
      setFullscreen(false)
      return true
    },
    onExitChart: () => {
      if (!chartOpen) return false
      setChartOpen(false)
      return true
    },
    onShortcuts: () => setShortcutsOpen(true),
    onIndicators: () => chartRef.current?.focusIndicators?.(),
  })

  // Board and Watching both land on the Board. With the chart drill-in open
  // the tab is already 'home', so App's switchTab is a no-op and the
  // close-on-tab-change effect above never fires: close the chart here.
  function onMastheadTab(id) {
    if (id === 'watching') {
      setLens('watching')
      setChartOpen(false)
      onTab('home')
      return
    }
    if (id === 'home') {
      if (effectiveLens === 'watching') setLens('all')
      setChartOpen(false)
      onTab('home')
      return
    }
    onTab(id)
  }
  const mastheadActive = tab === 'home' ? (effectiveLens === 'watching' ? 'watching' : 'home') : tab

  const switchFooter = (
    <p className="t-caption mt-4 text-zinc-500">
      Prefer the chart-first desktop?{' '}
      <button
        type="button"
        className="text-accent"
        onClick={() => {
          try {
            localStorage.setItem(DESKTOP_HOME_KEY, JSON.stringify('chart'))
          } catch {
            // storage unavailable: the query string below still switches
          }
          window.location.search = '?home=chart'
        }}
      >
        Switch
      </button>
    </p>
  )

  let body
  if (tab !== 'home') {
    let screen
    if (tab === 'folders') {
      screen = openFolderId ? (
        <FolderDetail folderId={openFolderId} onBack={() => onOpenFolder(null)} onOpenProfile={onOpenProfile} onOpenAsset={(a) => select(a.id, { from: 'folder' })} />
      ) : (
        <FoldersList onOpenProfile={onOpenProfile} onOpenFolder={onOpenFolder} />
      )
    } else if (tab === 'news') {
      screen = <News onOpenProfile={onOpenProfile} onOpenAsset={(a) => select(a.id, { from: 'news' })} />
    } else if (tab === 'holdings' && Holdings) {
      // Straight to the asset, without a meter_asset event: analytics never
      // learns which token someone opened from their holdings.
      screen = <Holdings onOpenProfile={onOpenProfile} onOpenAsset={(a) => onSelectAsset(a.id)} />
    }
    body = (
      <main className="min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-[640px]">{screen}</div>
      </main>
    )
  } else {
    // The Board+Readout grid stays MOUNTED while the chart drill-in is open,
    // only hidden ([hidden] is display:none under Tailwind's preflight), so
    // Esc returns with the Board's focus, expansion and scroll intact and
    // the Readout does not refetch. Exactly one <main> is visible at a time.
    const chartShown = chartOpen && Boolean(assetId)
    body = (
      <>
        <div hidden={chartShown} className="grid min-h-0" style={{ gridTemplateColumns: `minmax(0, 1fr) ${big.readout}` }}>
          <main className="min-h-0 min-w-0">
            <Board selectedId={assetId} onSelect={select} actionsRef={boardRef} lens={effectiveLens} onLens={setLens} big={big} />
          </main>
          <aside className="min-h-0 min-w-0 overflow-y-auto border-l" style={{ borderColor: 'var(--border-default)' }}>
            {/* The Readout mounts only with an asset: its hooks would otherwise
                fetch a chart for coins/null. The empty state lives here. While
                the chart is shown the Readout gets no sheet: a sheet inside
                the hidden grid would be invisible, so the shell renders it. */}
            {assetId ? (
              <Readout
                assetId={assetId}
                onSelectAsset={(id) => select(id, { from: 'readout' })}
                onOpenChart={openChart}
                sheet={chartShown ? null : sheet}
                onSheet={setSheet}
                big={big}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-6">
                <p className="t-body text-center text-zinc-400">Pick a company on the Board, or search for a ticker.</p>
              </div>
            )}
          </aside>
        </div>
        {chartShown && (
          <main className="min-h-0">
            <ChartWorkspace
              assetId={assetId}
              onSelectAsset={(id) => select(id, { from: 'chart' })}
              onScrub={() => {}}
              searchRef={searchRef}
              actionsRef={chartRef}
              drillIn={drillIn}
            />
          </main>
        )}
      </>
    )
  }

  return (
    <div
      className="grid h-dvh w-full overflow-hidden"
      style={{
        gridTemplateColumns: 'minmax(0, 1fr)',
        gridTemplateRows: fullscreen ? '0px 1fr' : '56px 1fr',
        // Past 2560 the Meter centres with plain page-background margins and
        // no border; the masthead inside spans the content max (spec §2.4).
        maxWidth: big.contentMax ?? undefined,
        marginInline: big.contentMax == null ? undefined : 'auto',
      }}
    >
      <div hidden={fullscreen}>
        <Masthead active={mastheadActive} onTab={onMastheadTab} searchRef={searchRef} onSelectAsset={(id) => select(id, { from: 'search' })} onOpenProfile={onOpenProfile} />
      </div>
      {body}
      {shortcutsOpen && (
        <ShortcutSheet
          onClose={() => setShortcutsOpen(false)}
          rows={meterShortcutRows(isMacPlatform())}
          intro="Anywhere on the Meter, outside a text field."
          footer={switchFooter}
        />
      )}
      {/* With the chart open the Readout is hidden (and handed no sheet), so
          a sheet the drill-in's gap header opens through drillIn.onSheet
          renders here. */}
      {chartOpen && asset && sheet === 'folder' && <AddToFolderSheet asset={asset} onClose={() => setSheet(null)} />}
      {chartOpen && asset && sheet === 'share' && <ShareSheet asset={asset} onClose={() => setSheet(null)} />}
      {chartOpen && asset?.underlying && sheet === 'alert' && <SetAlertSheet asset={asset} onClose={() => setSheet(null)} notify />}
      {/* Alerts need a share leg to compare against, as ChartWorkspace's openAlert gates. */}
      {alertAsset?.underlying && <SetAlertSheet asset={alertAsset} onClose={() => setAlertFor(null)} notify />}
    </div>
  )
}
