import { createContext, useContext, useEffect, useState } from 'react'
import { track } from '../services/analytics'

/*
 * Phantom wallet connection — phase one of non-custodial trading. Talks to
 * the injected provider (window.phantom.solana) directly: no SDK, no key
 * handling, nothing custodial. The wallet app holds the keys and signs;
 * BlockWatch only ever learns the public address.
 *
 * No provider (normal mobile Safari, most desktops) is a first-class state:
 * the UI offers "Get Phantom" instead. Previously-approved sites reconnect
 * silently on load via onlyIfTrusted.
 */

function getProvider() {
  const p = typeof window !== 'undefined' ? window.phantom?.solana : null
  return p?.isPhantom ? p : null
}

/** Short display form: "Ab3d…x9Zq". */
export function shortAddress(pk) {
  return pk ? `${pk.slice(0, 4)}…${pk.slice(-4)}` : ''
}

const WalletContext = createContext({
  available: false,
  publicKey: null,
  connecting: false,
})

export function WalletProvider({ children }) {
  const [publicKey, setPublicKey] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const provider = getProvider()

  useEffect(() => {
    if (!provider) return
    // Silent reconnect for wallets that already approved this site.
    provider.connect({ onlyIfTrusted: true }).catch(() => {})

    const onConnect = (pk) => setPublicKey(pk?.toString() ?? provider.publicKey?.toString() ?? null)
    const onDisconnect = () => setPublicKey(null)
    const onAccountChanged = (pk) => setPublicKey(pk ? pk.toString() : null)
    provider.on('connect', onConnect)
    provider.on('disconnect', onDisconnect)
    provider.on('accountChanged', onAccountChanged)
    return () => {
      provider.off?.('connect', onConnect)
      provider.off?.('disconnect', onDisconnect)
      provider.off?.('accountChanged', onAccountChanged)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function connect() {
    if (!provider || connecting) return
    setConnecting(true)
    try {
      const res = await provider.connect()
      setPublicKey(res.publicKey?.toString() ?? null)
      track('wallet_connect')
    } catch {
      // user dismissed the wallet prompt — not an error
    }
    setConnecting(false)
  }

  async function disconnect() {
    try {
      await provider?.disconnect()
    } catch {
      // already disconnected
    }
    setPublicKey(null)
  }

  return (
    <WalletContext.Provider
      value={{ available: !!provider, provider, publicKey, connecting, connect, disconnect }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  return useContext(WalletContext)
}
