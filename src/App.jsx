import { useEffect, useState } from 'react'
import { track } from './services/analytics'
import AccessGate from './components/AccessGate'
import { AuthProvider, useAuth } from './state/AuthContext'
import PasswordSheet from './overlays/PasswordSheet'
import { PricesProvider } from './state/PricesContext'
import { FoldersProvider } from './state/FoldersContext'
import { WaitlistProvider } from './state/WaitlistContext'
import { AlertsProvider } from './state/AlertsContext'
import UndoToast from './components/UndoToast'
import TabBar from './components/TabBar'
import Home from './screens/Home'
import { FoldersList, FolderDetail } from './screens/Folders'
import News from './screens/News'
import Trade from './screens/Trade'
import AssetDetail from './screens/AssetDetail'
import SearchOverlay from './overlays/SearchOverlay'
import ProfileSheet from './overlays/ProfileSheet'

/* When the user arrives via a password-recovery email link, prompt for the new password. */
function RecoveryGate() {
  const { recovery, clearRecovery } = useAuth()
  if (!recovery) return null
  return <PasswordSheet recoveryMode onClose={clearRecovery} />
}

export default function App() {
  const [tab, setTab] = useState('home')
  const [openFolderId, setOpenFolderId] = useState(null)
  const [openAssetId, setOpenAssetId] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [showProfile, setShowProfile] = useState(false)

  const openProfile = () => setShowProfile(true)
  const openAsset = (asset) => setOpenAssetId(asset.id)

  // Return-visit metric: one event per app open, per device.
  useEffect(() => {
    track('app_opened')
  }, [])

  function switchTab(next) {
    setTab(next)
    setOpenFolderId(null)
    setOpenAssetId(null)
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
      <AlertsProvider>
      <FoldersProvider>
      <WaitlistProvider>
        {/* dvh, not vh: mobile URL bars collapse and 100vh layouts jump */}
        <div className="mx-auto min-h-dvh max-w-md bg-zinc-950 md:border-x md:border-zinc-900">
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
        </div>
      </WaitlistProvider>
      </FoldersProvider>
      </AlertsProvider>
    </PricesProvider>
    </AuthProvider>
    </AccessGate>
  )
}
