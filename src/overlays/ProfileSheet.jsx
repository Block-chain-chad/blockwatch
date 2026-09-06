import { useState } from 'react'
import { useWaitlist } from '../state/WaitlistContext'
import { useAuth } from '../state/AuthContext'
import FeedbackSheet from './FeedbackSheet'
import SignInSheet from './SignInSheet'
import AppearanceSheet from './AppearanceSheet'
import PasswordSheet from './PasswordSheet'
import AboutSheet from './AboutSheet'
import { getThemePref } from '../lib/theme'
import { isNativeApp } from '../lib/platform'
import {
  CloseIcon,
  MoonIcon,
  WalletIcon,
  HelpIcon,
  InfoIcon,
  LockIcon,
  LogoutIcon,
  PersonIcon,
} from '../components/Icons'
import { ListRow } from '../components/shared'
import { WEB_BASE } from '../services/apiBase'
import { useWallet, shortAddress } from '../state/WalletContext'
import WalletSheet from './WalletSheet'
import Sheet, { SheetTitle } from '../components/Sheet'

export default function ProfileSheet({ onClose, onGoToTrade }) {
  const { entry } = useWaitlist()
  const { user, available, signOut } = useAuth()
  const wallet = useWallet()
  const [walletOpen, setWalletOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const themeLabel = { dark: 'Dark', light: 'Light', system: 'System' }[getThemePref()]
  return (
    <>
      <Sheet onClose={onClose} closeLabel="Close profile" pad={0}>
        <div className="flex items-center justify-between px-4 pt-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-base font-semibold text-zinc-300">
              {user ? user.email[0].toUpperCase() : <PersonIcon size={20} />}
            </div>
            <div className="min-w-0">
              <SheetTitle className="truncate font-semibold">{user ? user.email : 'Guest'}</SheetTitle>
              <div className="text-xs text-zinc-500">
                {user ? 'Folders & alerts synced across devices' : 'No account needed to track'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-400 active:bg-zinc-800"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {available && !user && (
          <button
            onClick={() => setSignInOpen(true)}
            className="mx-4 mt-4 flex w-[calc(100%-32px)] items-center justify-between gap-3 rounded-2xl bg-zinc-900 p-4 text-left transition-colors active:bg-zinc-800"
          >
            <div>
              <div className="text-sm font-semibold">Sync across devices</div>
              <div className="mt-0.5 text-xs text-zinc-500">
                Sign in and your folders & alerts follow you
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-zinc-950">
              Sign in
            </span>
          </button>
        )}

        <div className="mx-4 mt-4 rounded-2xl bg-zinc-900 p-4">
          {entry ? (
            <>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Trading waitlist</div>
              <div className="mt-1 text-lg font-semibold text-accent">You're on the list</div>
              <div className="mt-1 text-xs text-zinc-500">
                {entry.pendingSync
                  ? 'Saved on this device — finishing signup automatically.'
                  : "One tap, without leaving BlockWatch — we'll email you when in-app trading opens."}
              </div>
            </>
          ) : (
            <button onClick={onGoToTrade} className="flex w-full items-center justify-between gap-3 text-left">
              <div>
                <div className="text-sm font-semibold">Trading waitlist</div>
                <div className="mt-0.5 text-xs text-zinc-500">Be first when in-app trading opens</div>
              </div>
              <span className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-[13px] font-semibold text-zinc-950">
                Join
              </span>
            </button>
          )}
        </div>

        <div className="mt-4 divide-y divide-zinc-900">
          <ListRow
            icon={<MoonIcon size={20} />}
            label="Appearance"
            value={themeLabel}
            onClick={() => setAppearanceOpen(true)}
          />
          {wallet.publicKey ? (
            <ListRow
              icon={<WalletIcon size={20} />}
              label="Wallet connected"
              value={shortAddress(wallet.publicKey)}
              onClick={() => setWalletOpen(true)}
            />
          ) : wallet.available ? (
            <ListRow
              icon={<WalletIcon size={20} />}
              label={wallet.connecting ? 'Connecting…' : 'Connect wallet'}
              onClick={() => wallet.connect()}
            />
          ) : isNativeApp() ? (
            /* Native WebView: no wallet can inject here (Phantom's injection
               only exists in real browsers), so "Get a wallet" reads as a lie
               to people who own one. State the truth; connect works on the
               website today, native needs a deeplink flow (queued). */
            <ListRow icon={<WalletIcon size={20} />} label="Wallet connect" value="Coming to iPhone" />
          ) : (
            <ListRow
              icon={<WalletIcon size={20} />}
              label="Get a wallet"
              value="Phantom"
              onClick={() => window.open('https://phantom.com/download', '_blank', 'noopener')}
            />
          )}
          <ListRow
            icon={<HelpIcon size={20} />}
            label="Help & feedback"
            onClick={() => setFeedbackOpen(true)}
          />
          <ListRow
            icon={<InfoIcon size={20} />}
            label="About BlockWatch"
            onClick={() => setAboutOpen(true)}
          />
          <ListRow
            icon={<LockIcon size={20} />}
            label="Privacy"
            onClick={() => window.open(`${WEB_BASE}/privacy.html`, '_blank', 'noopener')}
          />
          {user && (
            <ListRow
              icon={<LockIcon size={20} />}
              label="Change password"
              onClick={() => setPasswordOpen(true)}
            />
          )}
          {user && (
            <ListRow icon={<LogoutIcon size={20} />} label="Sign out" onClick={() => signOut()} />
          )}
        </div>

        <div className="px-4 pt-3 text-center text-[11px] text-zinc-500">BlockWatch v0.1 · MVP preview</div>
      </Sheet>

      {/* Siblings of the dialog, not children: each is its own modal above it. */}
      {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}
      {signInOpen && <SignInSheet onClose={() => setSignInOpen(false)} />}
      {appearanceOpen && <AppearanceSheet onClose={() => setAppearanceOpen(false)} />}
      {aboutOpen && <AboutSheet onClose={() => setAboutOpen(false)} />}
      {passwordOpen && <PasswordSheet onClose={() => setPasswordOpen(false)} />}
      {walletOpen && <WalletSheet onClose={() => setWalletOpen(false)} />}
    </>
  )
}
