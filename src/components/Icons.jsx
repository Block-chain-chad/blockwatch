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

/* Stacked rows: a list of what you hold. Not a wallet: Onstock cannot see one. */
export const HoldingsIcon = (p) => (
  <Base {...p}>
    <rect x="4" y="4.5" width="16" height="4" rx="1.5" />
    <rect x="4" y="10" width="16" height="4" rx="1.5" />
    <rect x="4" y="15.5" width="16" height="4" rx="1.5" />
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

/* Screener: three bars of descending length, deviating from a centre line —
   the same shape the ranked gap bars make when sorted. */
export const TrendIcon = (p) => (
  <Base {...p}>
    <path d="M12 4v16" opacity="0.45" />
    <path d="M12 7.5h6.5" />
    <path d="M12 12h-4" />
    <path d="M12 16.5h2.5" />
  </Base>
)

// Base's viewBox is 24x24 (center 12,12), not the 22x22 the brief's
// coordinates assumed (center 11,11) — shifted both glyphs by (+1, +1) so
// they sit centered like their neighbors instead of drifting toward the
// top-left corner.
export const EyeIcon = (p) => (
  <Base {...p}>
    <path d="M3.5 12s3.5-6 8.5-6 8.5 6 8.5 6-3.5 6-8.5 6-8.5-6-8.5-6z" />
    <circle cx="12" cy="12" r="2.6" />
  </Base>
)

export const EyeOffIcon = (p) => (
  <Base {...p}>
    <path d="M5 5l14 14" />
    <path d="M9.6 6.6A9.4 9.4 0 0 1 12 6c5 0 8.5 6 8.5 6a15.7 15.7 0 0 1-2.7 3.3M7.2 7.9A15 15 0 0 0 3.5 12s3.5 6 8.5 6a8.9 8.9 0 0 0 3.4-.7" />
  </Base>
)

// The desktop chart toolbar's four view controls (spec §6.9, A9/A12), for
// the widths where their labels drop (under 1280px). Same 24px stroke grid
// as everything above.
export const FitIcon = (p) => (
  <Base {...p}>
    <path d="M4 9V4h5" />
    <path d="M20 9V4h-5" />
    <path d="M4 15v5h5" />
    <path d="M20 15v5h-5" />
    <path d="M9 12h6" />
  </Base>
)

export const SkipEndIcon = (p) => (
  <Base {...p}>
    <path d="M5 5l10 7-10 7z" />
    <path d="M19 5v14" />
  </Base>
)

export const ResetIcon = (p) => (
  <Base {...p}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6" />
    <path d="M4 4v5h5" />
  </Base>
)

export const LogIcon = (p) => (
  <Base {...p}>
    <path d="M4 20V4" />
    <path d="M4 20h16" />
    <path d="M6 18c2-8 6-11 13-12" />
  </Base>
)

/* Indicators: an oscillating line over a flat one — a study drawn across a
   series, which is what every entry in the catalogue is. Deliberately not
   LogIcon's single rising curve, which already means the log scale. */
export const IndicatorsIcon = (p) => (
  <Base {...p}>
    <path d="M3 12h3l3-6 3 12 3-8 3 4h2" />
    <path d="M3 19h18" opacity="0.45" />
  </Base>
)

export const EnvelopeIcon = (p) => (
  <Base {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </Base>
)

// A person with a key: the common passkey mark.
export const PasskeyIcon = (p) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3 20a6 6 0 0 1 10.5-4" />
    <circle cx="18" cy="11.5" r="2.5" />
    <path d="M18 14v6.5M18 18h2" />
  </Base>
)
