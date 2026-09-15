import { AvatarButton, Wordmark } from '../Header'
import SymbolSearch from './SymbolSearch'
import SessionStrip from './SessionStrip'

/*
 * The 48px bar across the top of the desktop (spec §6.6): the brand, the
 * symbol search, the session strip and the profile avatar — the phone Home
 * header's jobs, minus the list. `searchRef` is the shell's handle on the
 * search field, so a bare letter anywhere lands here.
 */
export default function TopBar({ searchRef, onSelectAsset, onOpenProfile }) {
  return (
    <header
      className="col-span-3 flex h-[var(--topbar-h)] min-h-0 items-center gap-4 border-b px-4"
      style={{ borderColor: 'var(--border-default)', gridColumn: '1 / -1' }}
    >
      <Wordmark />
      <SymbolSearch ref={searchRef} onSelectAsset={onSelectAsset} />
      <div className="flex-1" />
      <SessionStrip onSelectAsset={onSelectAsset} />
      <AvatarButton onClick={onOpenProfile} />
    </header>
  )
}
