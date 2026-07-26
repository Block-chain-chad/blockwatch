import { useAuth } from '../state/AuthContext'
import { PersonIcon } from './Icons'

/* Profile avatar: signed-in users get their email initial, guests a person glyph. */
export function AvatarButton({ onClick, className = '' }) {
  const { user } = useAuth()
  const initial = user?.email?.[0]?.toUpperCase()
  return (
    <button
      onClick={onClick}
      aria-label="Profile"
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-zinc-300 transition-colors active:bg-zinc-700 ${className}`}
    >
      {initial ?? <PersonIcon size={18} />}
    </button>
  )
}

/* Screen header: title on the left, profile avatar top-right (every tab).
   Top padding clears the notch / Dynamic Island on native. env() resolves to
   0px in a normal browser, so max(…) keeps the web's original pt-5. */
export default function Header({ title, brand = false, onOpenProfile }) {
  return (
    <header className="flex items-center justify-between px-4 pb-3 pt-[max(env(safe-area-inset-top),1.25rem)]">
      {brand ? (
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#18181b" />
            <path d="M8 21 L13 14 L17 17 L24 8" stroke="#2dd4bf" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 24 L13 19 L17 21 L24 13" stroke="#52525b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-lg font-semibold tracking-tight">BlockWatch</span>
        </div>
      ) : (
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      )}
      <AvatarButton onClick={onOpenProfile} />
    </header>
  )
}
