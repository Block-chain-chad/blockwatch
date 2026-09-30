import Sheet, { SheetTitle } from '../components/Sheet'

/* About OnStock — the plain-language pitch, for anyone who lands cold. */
export default function AboutSheet({ onClose }) {
  return (
    <Sheet onClose={onClose} className="z-[55]" pad={5}>
      <div className="flex items-center gap-2.5">
        <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#18181b" />
          <path d="M8 21 L13 14 L17 17 L24 8" stroke="#2dd4bf" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 24 L13 19 L17 21 L24 13" stroke="#52525b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div>
          <SheetTitle className="text-base font-semibold leading-tight">OnStock</SheetTitle>
          <div className="text-xs text-zinc-500">The tokenized stock tracker</div>
        </div>
      </div>

      <div className="mt-4 max-h-[55vh] space-y-3 overflow-y-auto">
        <p className="text-sm leading-relaxed text-zinc-400">
          Real stocks now exist as blockchain tokens. NVIDIA, Tesla, and the S&P 500 trade
          around the clock as NVDAx, TSLAx, and SPYx. OnStock shows every token side by
          side with the real share price, so you can see at a glance when a token trades at
          a premium or a discount to the actual stock.
        </p>
        <p className="text-sm leading-relaxed text-zinc-400">
          Tracking is free, with no account needed: build a watchlist, organize folders, set
          drift and price alerts, compare issuers, and follow the market's daily extremes.
          Signing in is optional and simply syncs your setup across devices.
        </p>
        <p className="text-sm leading-relaxed text-zinc-400">
          In-app trading isn't live yet. The Trade tab has a waitlist, and everyone on it hears
          first when it opens.
        </p>
        <div className="rounded-xl bg-zinc-900 p-3.5">
          <p className="text-xs leading-relaxed text-zinc-500">
            Token market data by CoinGecko; stock quotes and company data by Finnhub; share
            price history by Yahoo Finance. Prices are informational only and may be delayed.
            OnStock never holds your funds and gives no investment advice. It does not execute
            trades: where a swap is offered, OnStock only prepares the transaction for your own
            wallet to approve and send.
          </p>
        </div>
        <p className="text-center text-[11px] text-zinc-500">OnStock v0.1 · MVP preview</p>
      </div>

      <button
        onClick={onClose}
        className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
      >
        Done
      </button>
    </Sheet>
  )
}
