// Minimal inline icon set (24px grid, stroke-based) so we avoid an icon dependency.

function Base({ children, size = 22, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const HomeIcon = (p) => (
  <Base {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5 9.5V21h14V9.5" />
  </Base>
)

export const FolderIcon = (p) => (
  <Base {...p}>
    <path d="M3 6a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
  </Base>
)

export const NewsIcon = (p) => (
  <Base {...p}>
    <path d="M4 5h13v14H6a2 2 0 0 1-2-2V5Z" />
    <path d="M17 8h3v9a2 2 0 0 1-2 2h-1" />
    <path d="M7.5 9h6M7.5 12.5h6M7.5 16h4" />
  </Base>
)

export const TradeIcon = (p) => (
  <Base {...p}>
    <path d="M4 17l4.5-6 3.5 3 7-9" />
    <path d="M15 5h4v4" />
  </Base>
)

export const SearchIcon = (p) => (
  <Base {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.4-4.4" />
  </Base>
)

export const LockIcon = (p) => (
  <Base {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Base>
)

export const BellIcon = (p) => (
  <Base {...p}>
    <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
    <path d="M10 18a2 2 0 0 0 4 0" />
  </Base>
)

export const ChevronRight = (p) => (
  <Base {...p}>
    <path d="m9 6 6 6-6 6" />
  </Base>
)

export const ChevronLeft = (p) => (
  <Base {...p}>
    <path d="m15 6-6 6 6 6" />
  </Base>
)

export const ChevronDown = (p) => (
  <Base {...p}>
    <path d="m6 9 6 6 6-6" />
  </Base>
)

export const PlusIcon = (p) => (
  <Base {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
)

export const ShareIcon = (p) => (
  <Base {...p}>
    <path d="M12 3v12" />
    <path d="m8 7 4-4 4 4" />
    <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
  </Base>
)

export const CloseIcon = (p) => (
  <Base {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Base>
)

export const GlobeIcon = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c2.5 2.6 3.8 5.7 3.8 9S14.5 18.4 12 21c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3Z" />
  </Base>
)

export const MoonIcon = (p) => (
  <Base {...p}>
    <path d="M20 13.5A8 8 0 1 1 10.5 4 6.5 6.5 0 0 0 20 13.5Z" />
  </Base>
)

export const InfoIcon = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6h.01" />
  </Base>
)

export const HelpIcon = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.3a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.6" />
    <path d="M12 16.8h.01" />
  </Base>
)

export const StarIcon = ({ filled = false, ...p }) => (
  <Base {...p}>
    <path
      d="M12 3.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.6Z"
      fill={filled ? 'currentColor' : 'none'}
    />
  </Base>
)

export const PersonIcon = (p) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5.5 19.5c1-3.2 3.5-4.8 6.5-4.8s5.5 1.6 6.5 4.8" />
  </Base>
)

export const LogoutIcon = (p) => (
  <Base {...p}>
    <path d="M14 4H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h7" />
    <path d="M17 8.5 20.5 12 17 15.5M20 12h-9" />
  </Base>
)

export const CheckCircleIcon = (p) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-5" />
  </Base>
)

export const DotsIcon = (p) => (
  <Base {...p}>
    <path d="M5 12h.01M12 12h.01M19 12h.01" strokeWidth="2.6" />
  </Base>
)

export const PencilIcon = (p) => (
  <Base {...p}>
    <path d="M4 20l4.2-1 11-11a1.9 1.9 0 0 0-3.2-3.2l-11 11L4 20Z" />
  </Base>
)

export const TrashIcon = (p) => (
  <Base {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 13h9l1-13" />
  </Base>
)

export const WalletIcon = (p) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M16 12.5h.01" />
    <path d="M3 9h18" />
  </Base>
)
