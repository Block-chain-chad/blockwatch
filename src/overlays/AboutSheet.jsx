/* About BlockWatch — the plain-language pitch, for anyone who lands cold. */
export default function AboutSheet({ onClose }) {
  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-5 pb-[max(env(safe-area-inset-bottom),20px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-800" />

        <div className="flex items-center gap-2.5">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="8" fill="#18181b" />
            <path d="M8 21 L13 14 L17 17 L24 8" stroke="#2dd4bf" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M8 24 L13 19 L17 21 L24 13" stroke="#52525b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div>
            <div className="text-base font-semibold leading-tight">BlockWatch</div>
            <div className="text-xs text-zinc-500">The tokenized stock tracker</div>
          </div>
        </div>

        <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto">
          <p className="text-sm leading-relaxed text-zinc-400">
            Real stocks now exist as blockchain tokens — NVIDIA, Tesla, and the S&P 500 trade
            around the clock as NVDAx, TSLAx, and SPYx. BlockWatch shows every token side by
            side with the real share price, so you can see at a glance when a token trades at
            a premium or a discount to the actual stock.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            Tracking is free, with no account needed: build a watchlist, organize folders, set
            drift and price alerts, compare issuers, and follow the market's daily extremes.
            Signing in is optional and simply syncs your setup across devices.
          </p>
          <p className="text-sm leading-relaxed text-zinc-400">
            In-app trading isn't live yet — the Trade tab has a waitlist, and everyone on it hears
            first when it opens.
          </p>
          <div className="rounded-xl bg-zinc-900 p-3.5">
            <p className="text-xs leading-relaxed text-zinc-500">
              Token market data by CoinGecko; stock quotes and company data by Finnhub. Prices
              are informational only and may be delayed. BlockWatch is a tracker — it does not
              hold funds, execute trades, or give investment advice.
            </p>
          </div>
          <p className="text-center text-[11px] text-zinc-600">BlockWatch v0.1 · MVP preview</p>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
        >
          Done
        </button>
      </div>
    </div>
  )
}
