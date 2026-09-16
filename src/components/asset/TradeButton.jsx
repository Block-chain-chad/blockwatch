import { useState } from 'react'
import { track } from '../../services/analytics'
import { useWallet } from '../../state/WalletContext'
import { verifiedToken } from '../../data/verifiedMints'
import SwapSheet from '../../overlays/SwapSheet'

/* The trading ladder in one block: wallet connected → in-app swap
   (rung two); otherwise route out to Jupiter (rung one). Nothing renders
   unless the token's address has been verified with its issuer — both rungs
   spend real money at an address, and CoinGecko's answer is not good enough
   for either. See data/verifiedMints.

   `onSwap` is optional. The phone screen passes it and keeps the SwapSheet
   in its own tail beside the other sheets, so the sheet's place in the DOM
   does not move; a caller that omits it gets a self-contained button that
   mounts the sheet itself. */
export default function TradeButton({ asset, onSwap }) {
  const wallet = useWallet()
  const [swapOpen, setSwapOpen] = useState(false)
  const token = verifiedToken(asset)
  if (!token) return null
  const openSwap = onSwap ?? (() => setSwapOpen(true))
  return (
    <>
      <div className="px-4 pt-3">
        {/* Connecting a wallet is a decision the user made, so an in-app
            swap keeps the filled accent. Routing OUT to Jupiter does not:
            it was a full-width saturated block, unambiguously the loudest
            object on a screen whose job is comparing two prices — shouting
            an outbound link over the number the page exists to show. It is
            a bordered button now: same size, same position, still obvious,
            no longer the first thing your eye lands on. */}
        {wallet.publicKey ? (
          <button
            onClick={openSwap}
            className="t-label flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-3 font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
          >
            Swap {asset.ticker}
          </button>
        ) : (
          <a
            href={`https://jup.ag/swap/USDC-${token.mint}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track('trade_out', { ticker: asset.ticker, venue: 'jupiter' })}
            className="t-label flex items-center justify-center gap-2 rounded-lg py-3 font-medium text-zinc-100 transition-colors active:bg-zinc-900"
            style={{ boxShadow: 'inset 0 0 0 1px var(--border-strong)' }}
          >
            Trade {asset.ticker} on Jupiter ↗
          </a>
        )}
        <p className="mt-1.5 text-center text-[11px] leading-relaxed text-zinc-400">
          {wallet.publicKey
            ? 'Swaps run from your own wallet — OnStock never holds funds.'
            : 'Opens Jupiter, an external venue — you swap from your own wallet. Availability depends on your region. Not investment advice.'}
        </p>
      </div>
      {!onSwap && swapOpen && <SwapSheet asset={asset} onClose={() => setSwapOpen(false)} />}
    </>
  )
}
