import { useEffect, useRef, useState } from 'react'
import { useFolders } from '../../state/FoldersContext'
import { useLocalState } from '../../hooks/useLocalState'
import { getRecentViews } from '../../lib/recentViews'
import { ASSET_IDS } from '../../data/universe'
import { pickInitialAsset } from '../../lib/desktopState'
import { classifyKey, keyContext, isMacPlatform } from '../../lib/desktopKeys'
import Screener from '../../screens/Screener'
import { FoldersList, FolderDetail } from '../../screens/Folders'
import News from '../../screens/News'
import Trade from '../../screens/Trade'
import TopBar from './TopBar'
import NavRail from './NavRail'
import RightColumn from './RightColumn'
import ChartWorkspace from './ChartWorkspace'

const KNOWN_IDS = new Set(ASSET_IDS)

/*
 * The desktop (spec §1, §6.5): TradingView's frame — a 48px top bar, a 64px
 * rail, the chart in the middle, the watchlist and the selected asset's
 * numbers on the right — with the gap in every slot TradingView reserves
 * for price. Mounted by App at 1024px and up, in a browser only; the phone
 * tree never sees it.
 *
 * Home on the desktop IS the chart workspace. Gaps, Folders, News and Trade
 * take over the center (their phone screens at 640px, centred) and picking
 * an asset from any of them returns the chart with that asset. The rail and
 * right column hide in fullscreen (Shift+F, Esc restores); the top bar stays.
 */
export default function DesktopShell({
  tab,
  onTab,
  assetId,
  onSelectAsset,
  listSource,
  onListSource,
  openFolderId,
  onOpenFolder,
  onOpenProfile,
}) {
  const [fullscreen, setFullscreen] = useState(false)
  // The Gap chart's scrub position (null = live). Set by the chart, read by
  // the right column's gap panel, cleared when the asset changes.
  const [scrub, setScrub] = useState(null)
  const searchRef = useRef(null)
  const { watchlistIds } = useFolders()

  // Restore on load (§1.4): the remembered asset, else the last viewed, else
  // the first watchlist row. Runs once, when the shell first mounts with
  // nothing selected; the selection is mirrored back to the key on change.
  const [savedAssetId, setSavedAssetId] = useLocalState('bw.desktop.asset.v1', null)
  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    if (assetId != null) return
    const pick = pickInitialAsset({
      saved: savedAssetId,
      recent: getRecentViews(),
      watchlistIds,
      known: KNOWN_IDS,
    })
    if (pick) onSelectAsset(pick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (assetId != null) setSavedAssetId(assetId)
  }, [assetId, setSavedAssetId])

  useEffect(() => {
    setScrub(null)
  }, [assetId])

  // Opening a folder makes it the active list (TradingView's rule, §7 Q6).
  useEffect(() => {
    if (tab === 'folders' && openFolderId) onListSource(openFolderId)
  }, [tab, openFolderId, onListSource])

  // The shell's own keys (lib/desktopKeys.js): Ctrl+K and any bare letter go
  // to the symbol search, Shift+F toggles fullscreen, Esc closes the top-most
  // thing. Fields and open sheets keep their keys. The chart's bindings
  // (§6.10) join this listener with the chart workspace.
  useEffect(() => {
    const mac = isMacPlatform()
    function onKeyDown(e) {
      if (e.defaultPrevented || e.isComposing) return
      const action = classifyKey(e, { mac, ...keyContext(e.target) })
      if (!action) return
      if (action.type === 'focusSearch') {
        e.preventDefault()
        searchRef.current?.focus(action.prefill)
      } else if (action.type === 'fullscreen') {
        e.preventDefault()
        setFullscreen((f) => !f)
      } else if (action.type === 'escape') {
        if (searchRef.current?.close()) return
        setFullscreen(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const openAsset = (a) => onSelectAsset(a.id)

  let center
  if (tab === 'home') {
    center = (
      <ChartWorkspace
        assetId={assetId}
        onSelectAsset={onSelectAsset}
        onScrub={setScrub}
        searchRef={searchRef}
      />
    )
  } else {
    let screen
    if (tab === 'screener') {
      screen = <Screener onOpenProfile={onOpenProfile} onOpenAsset={openAsset} />
    } else if (tab === 'folders') {
      screen = openFolderId ? (
        <FolderDetail
          folderId={openFolderId}
          onBack={() => onOpenFolder(null)}
          onOpenProfile={onOpenProfile}
          onOpenAsset={openAsset}
        />
      ) : (
        <FoldersList onOpenProfile={onOpenProfile} onOpenFolder={onOpenFolder} />
      )
    } else if (tab === 'news') {
      screen = <News onOpenProfile={onOpenProfile} onOpenAsset={openAsset} />
    } else {
      screen = <Trade onOpenProfile={onOpenProfile} />
    }
    center = <div className="mx-auto max-w-[640px]">{screen}</div>
  }

  return (
    <div
      className="grid h-dvh w-full overflow-hidden"
      style={{
        gridTemplateColumns: fullscreen
          ? '0px 1fr 0px'
          : 'var(--rail-w) minmax(560px, 1fr) var(--right-col)',
        gridTemplateRows: 'var(--topbar-h) 1fr',
      }}
    >
      <TopBar searchRef={searchRef} onSelectAsset={onSelectAsset} onOpenProfile={onOpenProfile} />
      <NavRail tab={tab} onTab={onTab} hidden={fullscreen} />
      <main className="min-h-0 min-w-0 overflow-y-auto" style={{ gridColumn: 2 }}>
        {center}
      </main>
      <aside
        hidden={fullscreen}
        className="min-h-0 min-w-0 overflow-y-auto border-l"
        style={{ borderColor: 'var(--border-subtle)', gridColumn: 3 }}
      >
        <RightColumn
          assetId={assetId}
          onSelectAsset={onSelectAsset}
          listSource={listSource}
          onListSource={onListSource}
          scrub={scrub}
        />
      </aside>
    </div>
  )
}
