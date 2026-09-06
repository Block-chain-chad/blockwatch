import { useState } from 'react'

// Private-beta lock screen. Active only when VITE_ACCESS_HASH is set at build
// time (i.e., on gated deployments — local dev stays open). The bundle carries
// only the SHA-256 fingerprint of the access code, never the code itself, so
// the code can't be extracted from the site. Unlocking is remembered per device.
const ACCESS_HASH = import.meta.env.VITE_ACCESS_HASH
const STORAGE_KEY = 'bw.access.v1'

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function AccessGate({ children }) {
  const [unlocked, setUnlocked] = useState(() => {
    if (!ACCESS_HASH) return true
    try {
      return localStorage.getItem(STORAGE_KEY) === ACCESS_HASH
    } catch {
      return false
    }
  })
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('idle') // idle | busy | wrong

  if (unlocked) return children

  async function submit(e) {
    e.preventDefault()
    if (!code.trim() || status === 'busy') return
    setStatus('busy')
    const hash = await sha256Hex(code.trim().toLowerCase())
    if (hash === ACCESS_HASH) {
      try {
        localStorage.setItem(STORAGE_KEY, ACCESS_HASH)
      } catch {
        // session-only unlock is fine
      }
      setUnlocked(true)
    } else {
      setStatus('wrong')
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center bg-zinc-950 px-8">
      <svg width="44" height="44" viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#18181b" />
        <path d="M8 21 L13 14 L17 17 L24 8" stroke="#2dd4bf" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 24 L13 19 L17 21 L24 13" stroke="#52525b" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <h1 className="mt-4 text-xl font-semibold tracking-tight">BlockWatch</h1>
      <p className="mt-1 text-center text-sm text-zinc-500">
        Private beta — enter your access code to continue.
      </p>
      <form onSubmit={submit} className="mt-6 w-full max-w-xs">
        <input
          autoFocus
          type="text"
          autoCapitalize="none"
          autoCorrect="off"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setStatus('idle')
          }}
          placeholder="Access code"
          className="w-full rounded-xl bg-zinc-900 px-4 py-3 text-center text-sm tracking-wide text-zinc-100 placeholder-zinc-500 outline-none ring-accent/60 focus:ring-2"
        />
        {status === 'wrong' && (
          <p className="mt-2 text-center text-xs text-zinc-500">
            That code didn't match — double-check it and try again.
          </p>
        )}
        <button
          type="submit"
          disabled={!code.trim() || status === 'busy'}
          className="mt-3 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim disabled:opacity-40"
        >
          Enter
        </button>
      </form>
      <p className="mt-8 text-center text-[11px] text-zinc-500">
        Tracking tokenized stocks against the real thing · launching soon
      </p>
    </div>
  )
}
