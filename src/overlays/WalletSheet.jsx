import { useState } from 'react'
import { useWallet } from '../state/WalletContext'
import Sheet, { SheetTitle } from '../components/Sheet'

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
      setNote("Couldn't copy. Press and hold the address instead")
    }
  }

  return (
    <Sheet onClose={onClose} className="z-[55]">
      <SheetTitle className="px-1 text-base font-semibold">Wallet</SheetTitle>
      <p className="mt-1 px-1 text-xs text-zinc-500">
        Connected via Phantom. OnStock can see this address, but never your keys or funds.
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
    </Sheet>
  )
}
