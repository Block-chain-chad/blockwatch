import { Suspense, lazy, useEffect, useState } from 'react'
import { track } from './services/analytics'
import AccessGate from './components/AccessGate'
import { AuthProvider, useAuth } from './state/AuthContext'
import PasswordSheet from './overlays/PasswordSheet'
import { PricesProvider } from './state/PricesContext'
import { WalletProvider } from './state/WalletContext'
import { FoldersProvider } from './state/FoldersContext'
import { WaitlistProvider } from './state/WaitlistContext'
import { AlertsProvider } from './state/AlertsContext'
import UndoToast from './components/UndoToast'
import TabBar from './components/TabBar'
import Home from './screens/Home'
import { FoldersList, FolderDetail } from './screens/Folders'
import Screener from './screens/Screener'
import News from './screens/News'
import Trade from './screens/Trade'
import AssetDetail from './screens/AssetDetail'
import SearchOverlay from './overlays/SearchOverlay'
import ProfileSheet from './overlays/ProfileSheet'
import WelcomeSheet from './overlays/WelcomeSheet'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useLocalState } from './hooks/useLocalState'
import { isNativeApp } from './lib/platform'

/* The desktop shell is its own chunk: it mounts only at 1024px and up in a
   browser, so a phone never downloads it and the main bundle stays the size
   it was before the desktop existed. */
const DesktopShell = lazy(() => import('./components/desktop/DesktopShell'))

/* When the user arrives via a password-recovery email link, prompt for the new password. */
function RecoveryGate() {
  const { recovery, clearRecovery } = useAuth()
  if (!recovery) return null
  return <PasswordSheet recoveryMode onClose={clearRecovery} />
}

/* Post-sign-in confirmation, and the dead-emailed-link notice. Rendered at
   App level because email links arrive with no sheet open. */
function WelcomeGate({ onOpenSignIn }) {
  const { welcome, clearWelcome } = useAuth()
  if (!welcome) return null
  return <WelcomeSheet variant={welcome} onClose={clearWelcome} onOpenSignIn={onOpenSignIn} />
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [openFolderId, setOpenFolderId] = useState(null)
  const [openAssetId, setOpenAssetId] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  // The one gate (spec §6.1 rule 2): the desktop shell mounts at lg (1024px)
  // in a browser only. Inside the Capacitor WebView every width is the phone
  // tree — an iPad in landscape keeps today's behaviour (§7 Q2).
  const desktop = useMediaQuery('(min-width: 64rem)') && !isNativeApp()
  // What the desktop's right column lists: 'watchlist' or a folder id.
  const [listSource, setListSource] = useLocalState('bw.desktop.list.v1', 'watchlist')

  const openProfile = () => setShowProfile(true)
  const openAsset = (asset) => setOpenAssetId(asset.id)

  // Return-visit metric: one event per app open, per device.
  useEffect(() => {
    track('app_opened')
  }, [])

  function switchTab(next) {
    setTab(next)
    setOpenFolderId(null)
    // On the desktop the chart keeps its asset while you look at News and
    // come back; on the phone the tab bar closes the detail overlay.
    if (!desktop) setOpenAssetId(null)
  }

  let screen
  if (tab === 'home') {
    screen = (
      <Home
        onOpenProfile={openProfile}
        onOpenAsset={openAsset}
        onOpenSearch={() => setShowSearch(true)}
      />
    )
  } else if (tab === 'screener') {
    screen = <Screener onOpenProfile={openProfile} onOpenAsset={openAsset} />
  } else if (tab === 'folders') {
    screen = openFolderId ? (
      <FolderDetail
        folderId={openFolderId}
        onBack={() => setOpenFolderId(null)}
        onOpenProfile={openProfile}
        onOpenAsset={openAsset}
      />
    ) : (
      <FoldersList onOpenProfile={openProfile} onOpenFolder={setOpenFolderId} />
    )
  } else if (tab === 'news') {
    screen = <News onOpenProfile={openProfile} onOpenAsset={openAsset} />
  } else {
    screen = <Trade onOpenProfile={openProfile} />
  }

  return (
    <AccessGate>
    <AuthProvider>
    <PricesProvider>
      <WalletProvider>
      <AlertsProvider>
      <FoldersProvider>
      <WaitlistProvider>
        {/* dvh, not vh: mobile URL bars collapse and 100vh layouts jump.
            The shell stays phone-width up to lg because the native iOS build
            renders inside it; from lg in the native app it opens out to the
            content max so Home's table has somewhere to live, and in a
            browser the desktop shell takes the full window (§7 Q1). */}
        <div
          className={
            desktop
              ? 'mx-auto min-h-dvh max-w-md bg-zinc-950 md:border-x lg:max-w-none lg:border-x-0'
              : 'mx-auto min-h-dvh max-w-md bg-zinc-950 md:border-x lg:max-w-[var(--content-max)]'
          }
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {desktop ? (
            <Suspense fallback={null}>
              <DesktopShell
                tab={tab}
                onTab={switchTab}
                assetId={openAssetId}
                onSelectAsset={(id) => {
                  setOpenAssetId(id)
                  setTab('home')
                }}
                listSource={listSource}
                onListSource={setListSource}
                openFolderId={openFolderId}
                onOpenFolder={setOpenFolderId}
                onOpenProfile={openProfile}
              />
            </Suspense>
          ) : (
            <>
              {screen}
              <TabBar tab={tab} onChange={switchTab} />

              {openAssetId && (
                <AssetDetail
                  key={openAssetId} // remount on switch: fresh scroll + chart state
                  assetId={openAssetId}
                  onBack={() => setOpenAssetId(null)}
                  onSwitchAsset={setOpenAssetId}
                />
              )}
              {showSearch && (
                <SearchOverlay
                  onClose={() => setShowSearch(false)}
                  // Search stays mounted while the detail opens on top of it, so
                  // Back lands on the results the user was just looking at.
                  onOpenAsset={(a) => setOpenAssetId(a.id)}
                />
              )}
            </>
          )}
          {showProfile && (
            <ProfileSheet
              onClose={() => setShowProfile(false)}
              onGoToTrade={() => {
                setShowProfile(false)
                switchTab('trade')
              }}
            />
          )}
          <UndoToast />
          <RecoveryGate />
          <WelcomeGate onOpenSignIn={() => setShowProfile(true)} />
        </div>
      </WaitlistProvider>
      </FoldersProvider>
      </AlertsProvider>
      </WalletProvider>
    </PricesProvider>
    </AuthProvider>
    </AccessGate>
  )
}
