import { useState } from 'react'
import { useWallet } from '../state/WalletContext'

/*
 * Connected-wallet sheet: shows the full address with copy, and makes
 * disconnecting an explicit choice — a bare tap on the profile row used to
 * silently disconnect, which read as a bug (it was: tester-reported).
 */
export default function WalletSheet({ onClose }) {
  const { publicKey, disconnect } = useWallet()
  const [note, setNote] = useState(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicKey)
      setNote('Address copied')
    } catch {
      setNote("Couldn't copy — long-press the address instead")
    }
  }

  return (
    <div className="fixed inset-0 z-[55] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />
        <h2 className="px-1 text-base font-semibold">Wallet</h2>
        <p className="mt-1 px-1 text-xs text-zinc-500">
          Connected via Phantom. BlockWatch can see this address — never your keys or funds.
        </p>

        <div className="mt-3 select-text break-all rounded-xl bg-zinc-900 p-3.5 text-xs tabular-nums leading-relaxed text-zinc-300">
          {publicKey}
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={copy}
            className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-zinc-200 transition-colors active:bg-zinc-800"
          >
            Copy address
          </button>
          <button
            onClick={() => {
              disconnect()
              onClose()
            }}
            className="flex-1 rounded-xl bg-zinc-900 py-3 text-sm font-medium text-loss transition-colors active:bg-zinc-800"
          >
            Disconnect
          </button>
        </div>
        {note && <p className="mt-2 px-1 text-center text-xs text-zinc-500">{note}</p>}
      </div>
    </div>
  )
}
