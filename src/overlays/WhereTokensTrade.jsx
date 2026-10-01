import { useState } from 'react'
import Sheet, { SheetTitle } from '../components/Sheet'
import { ChevronRight } from '../components/Icons'

/*
 * Where tokens trade: neutral information about outside services, in a
 * sheet opened from a quiet text row on the token screen and in the About
 * sheet. Never from Holdings, and never beside a price or a gap. Onstock
 * does not offer trading, route orders or recommend a venue, so there are no
 * links here, no Jupiter and no waitlist. Wording approved by compliance
 * (holdings-build-brief-v3.md section 3).
 *
 * The iPhone build carries one approved sentence and no venue names; the web
 * text is compiled out of it (src/webOnly.js explains the switch).
 */

const RESTRICTED = ['Kraken', 'Bybit', 'Gate.io', 'KuCoin']

function WebVenues() {
  return (
    <>
      <p className="t-body mt-1.5 text-zinc-400">
        Tokenized stocks trade on outside services. Onstock does not operate, check or recommend any of them, and each one
        decides who may use it.
      </p>
      <h3 className="t-micro mt-5 text-zinc-500">Not offered in the United States</h3>
      <p className="t-caption mt-1 text-zinc-500">
        These exchanges say they do not serve people in the United States. The tokens' issuers also restrict the United
        Kingdom and some other countries.
      </p>
      <ul className="mt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        {RESTRICTED.map((name) => (
          <li key={name} className="flex items-center justify-between border-b py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="t-label text-zinc-400">{name}</span>
            <span className="t-caption text-zinc-500">Exchange</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-[11px] leading-relaxed text-zinc-400">
        These are outside services with their own terms and their own rules about who may use them. Onstock does not route
        orders, hold funds or execute trades.
      </p>
    </>
  )
}

export function WhereTokensTradeSheet({ onClose }) {
  return (
    <Sheet onClose={onClose} className="z-[60]" pad={5}>
      <SheetTitle className="t-title">Where tokens trade</SheetTitle>
      {import.meta.env.VITE_BUILD_TARGET === 'ios' ? (
        <p className="t-body mt-1.5 text-zinc-400">
          Tokenized stocks trade on outside venues that Onstock does not operate. Their issuers say the tokens are not
          offered in the United States, and each venue decides who may use it.
        </p>
      ) : (
        <WebVenues />
      )}
      <button
        onClick={onClose}
        className="mt-5 w-full rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-100 transition-colors active:bg-zinc-800"
      >
        Done
      </button>
    </Sheet>
  )
}

/* The quiet row that opens the sheet. */
export default function WhereTokensTrade({ className = '' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`flex w-full items-center justify-between text-left text-sm text-zinc-400 transition-colors active:text-zinc-200 ${className}`}
      >
        Where tokens trade
        <ChevronRight size={16} className="shrink-0 text-zinc-600" />
      </button>
      {open && <WhereTokensTradeSheet onClose={() => setOpen(false)} />}
    </>
  )
}
