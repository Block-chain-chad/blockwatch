import { useEffect, useMemo, useRef, useState } from 'react'
import { track } from '../../services/analytics'
import { useFolders } from '../../state/FoldersContext'
import { useAsset } from '../../state/PricesContext'
import { useLocalState } from '../../hooks/useLocalState'
import { useMeterShortcuts } from '../../hooks/useMeterShortcuts'
import { getRecentViews } from '../../lib/recentViews'
import { ASSET_IDS } from '../../data/universe'
import { pickInitialAsset } from '../../lib/desktopState'
import { premiumPct } from '../../lib/prices'
import { meterTitle, boardTitle, screenTitle, DEFAULT_TITLE } from '../../lib/pageTitle'
import { meterShortcutRows, isMacPlatform } from '../../lib/meterKeys'
import { classifyVisit } from '../../lib/returnVisit'
import { DESKTOP_HOME_KEY } from '../../lib/desktopHome'
import { FoldersList, FolderDetail } from '../../screens/Folders'
import News from '../../screens/News'
import Trade from '../../screens/Trade'
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
 * other home until the owner picks. Folders, News and Trade take over the
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
  useEffect(() => {
    if (tab !== 'home') document.title = screenTitle(tab)
    else document.title = asset ? meterTitle({ ticker: asset.ticker, gapPct }) : boardTitle()
  }, [tab, asset?.ticker, gapPct]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    document.title = DEFAULT_TITLE
  }, [])

  function select(id, { from = 'board' } = {}) {
    onSelectAsset(id)
    track('meter_asset', { from })
  }

  // The chart and fullscreen are Board-only: a takeover screen (Folders,
  // News, Trade) keeps the 'board' key scope, so C and F must ignore it or
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
    } else {
      screen = <Trade onOpenProfile={onOpenProfile} />
    }
    body = (
      <main className="min-h-0 overflow-y-auto">
        <div className="mx-auto max-w-[640px]">{screen}</div>
      </main>
    )
  } else if (chartOpen && assetId) {
    body = (
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
    )
  } else {
    body = (
      <div className="grid min-h-0" style={{ gridTemplateColumns: 'minmax(0, 1fr) min(560px, 39vw)' }}>
        <main className="min-h-0 min-w-0">
          <Board selectedId={assetId} onSelect={select} actionsRef={boardRef} lens={effectiveLens} onLens={setLens} />
        </main>
        <aside className="min-h-0 min-w-0 overflow-y-auto border-l" style={{ borderColor: 'var(--border-default)' }}>
          {/* The Readout mounts only with an asset: its hooks would otherwise
              fetch a chart for coins/null. The empty state lives here. */}
          {assetId ? (
            <Readout assetId={assetId} onSelectAsset={(id) => select(id, { from: 'readout' })} onOpenChart={openChart} sheet={sheet} onSheet={setSheet} />
          ) : (
            <div className="flex h-full items-center justify-center px-6">
              <p className="t-body text-center text-zinc-400">Pick a company on the Board, or search for a ticker.</p>
            </div>
          )}
        </aside>
      </div>
    )
  }

  return (
    <div className="grid h-dvh w-full overflow-hidden" style={{ gridTemplateRows: fullscreen ? '0px 1fr' : '56px 1fr' }}>
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
      {/* With the chart open the Readout is unmounted, so a sheet the
          drill-in's gap header opens through drillIn.onSheet renders here. */}
      {chartOpen && asset && sheet === 'folder' && <AddToFolderSheet asset={asset} onClose={() => setSheet(null)} />}
      {chartOpen && asset && sheet === 'share' && <ShareSheet asset={asset} onClose={() => setSheet(null)} />}
      {chartOpen && asset?.underlying && sheet === 'alert' && <SetAlertSheet asset={asset} onClose={() => setSheet(null)} />}
      {/* Alerts need a share leg to compare against, as ChartWorkspace's openAlert gates. */}
      {alertAsset?.underlying && <SetAlertSheet asset={alertAsset} onClose={() => setAlertFor(null)} />}
    </div>
  )
}
