import { useEffect, useState } from 'react'
import Sheet, { SheetTitle } from '../components/Sheet'
import { listPasskeys, passkeyName, registerPasskey, removePasskey, isPasskeyCancel } from '../services/passkeys'

const dateFmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

function describe(passkey) {
  const added = passkey.created_at ? `Added ${dateFmt.format(new Date(passkey.created_at))}` : 'Added'
  const used = passkey.last_used_at ? ` · last used ${dateFmt.format(new Date(passkey.last_used_at))}` : ''
  return added + used
}

/*
 * Settings > Face ID and passkeys: the account's passkeys, each removable,
 * and a way to add one on this device. Web only; see services/passkeys.js.
 * Removing one here removes it from the account, so it stops working on every
 * device; the copy of it in the person's password manager stays until they
 * delete it there, and simply stops being accepted.
 */
export default function PasskeysSheet({ onClose }) {
  const [items, setItems] = useState(null) // null while loading
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)
  const unlock = passkeyName(navigator.userAgent, navigator.maxTouchPoints)

  async function load() {
    try {
      setItems(await listPasskeys())
    } catch {
      setItems([])
      setNote("Couldn't load your passkeys. Close this and try again.")
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function add() {
    setBusy(true)
    setNote(null)
    try {
      await registerPasskey()
      await load()
    } catch (err) {
      if (!isPasskeyCancel(err)) setNote("Couldn't add a passkey. Try again in a moment.")
    }
    setBusy(false)
  }

  async function remove(id) {
    setBusy(true)
    setNote(null)
    try {
      await removePasskey(id)
      await load()
    } catch {
      setNote("Couldn't remove that passkey. Try again in a moment.")
    }
    setBusy(false)
  }

  return (
    <Sheet onClose={onClose} className="z-[55]">
      <SheetTitle className="px-1 text-base font-semibold">Face ID and passkeys</SheetTitle>
      <p className="mt-0.5 px-1 text-xs text-zinc-500">
        Sign in with your face, fingerprint or device passcode instead of a password.
      </p>

      <div className="mt-3 divide-y divide-zinc-900 rounded-xl bg-zinc-900/60">
        {items === null ? (
          <p className="px-3 py-3 text-sm text-zinc-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="px-3 py-3 text-sm text-zinc-500">No passkeys yet.</p>
        ) : (
          items.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm text-zinc-200">{p.friendly_name || 'Passkey'}</div>
                <div className="text-xs text-zinc-500">{describe(p)}</div>
              </div>
              <button
                onClick={() => remove(p.id)}
                disabled={busy}
                className="shrink-0 text-xs font-medium text-zinc-400 transition-colors active:text-zinc-200 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))
        )}
      </div>

      {note && <p className="mt-2 px-1 text-xs text-zinc-400">{note}</p>}

      <button
        onClick={add}
        disabled={busy}
        className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
      >
        {busy ? 'Working…' : unlock === 'a passkey' ? 'Add a passkey on this device' : `Add ${unlock} on this device`}
      </button>
    </Sheet>
  )
}
