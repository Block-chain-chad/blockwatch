import { useState } from 'react'
import { track } from '../../services/analytics'
import { useWallet } from '../../state/WalletContext'
import { verifiedToken } from '../../data/verifiedMints'
import { useFlag, SWAP_FLAG, LINK_OUT_FLAG } from '../../services/featureFlags'
import SwapSheet from '../../overlays/SwapSheet'

/* The trading ladder in one block: wallet connected → in-app swap
   (rung two); otherwise route out to Jupiter (rung one). Nothing renders
   unless the token's address has been verified with its issuer — both rungs
   spend real money at an address, and CoinGecko's answer is not good enough
   for either. See data/verifiedMints.

   Each rung also has a remote switch (services/featureFlags). Both read
   synchronously and the swap's fails closed, so there is no first render on
   which the swap button exists and shouldn't. With both rungs off the block
   renders nothing at all.

   `onSwap` is optional. The phone screen passes it and keeps the SwapSheet
   in its own tail beside the other sheets, so the sheet's place in the DOM
   does not move; a caller that omits it gets a self-contained button that
   mounts the sheet itself. */
export default function TradeButton({ asset, onSwap }) {
  const wallet = useWallet()
  const swapOn = useFlag(SWAP_FLAG)
  const linkOutOn = useFlag(LINK_OUT_FLAG)
  const [swapOpen, setSwapOpen] = useState(false)
  const token = verifiedToken(asset)
  if (!token) return null
  const openSwap = onSwap ?? (() => setSwapOpen(true))
  // Rung two needs a wallet AND the switch. With a wallet but no switch we
  // fall to rung one, which is a genuinely useful answer: the user can still
  // trade, just not from inside Onstock.
  const showSwap = Boolean(wallet.publicKey) && swapOn
  const showLinkOut = !showSwap && linkOutOn
  // With both switched off the page shows nothing here, not a "paused"
  // line: a paused trading control tells every visitor Onstock has trading
  // (compliance sign-off W1, September 30, 2026).
  if (!showSwap && !showLinkOut) return null
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
        {showSwap ? (
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
            View on Jupiter ↗
          </a>
        )}
        <p className="mt-1.5 text-center text-[11px] leading-relaxed text-zinc-400">
          {showSwap
            ? 'Swaps run from your own wallet. Onstock never holds funds.'
            : 'Opens Jupiter, an outside service Onstock does not operate. The token’s issuer does not offer it in the United States, and it may be restricted where you are. Not investment advice.'}
        </p>
      </div>
      {!onSwap && swapOpen && <SwapSheet asset={asset} onClose={() => setSwapOpen(false)} />}
    </>
  )
}
