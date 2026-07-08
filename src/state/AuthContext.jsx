import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext({ session: null, ready: true, available: false })

/**
 * Optional accounts (email magic link via Supabase Auth). Anonymous use is a
 * first-class mode — `session` is simply null and everything runs on
 * localStorage, exactly as before accounts existed.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabase)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s ?? null))
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signIn(email) {
    if (!supabase) throw new Error('auth not configured')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
  }

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
  }

  const value = {
    session,
    user: session?.user ?? null,
    ready,
    available: Boolean(supabase),
    signIn,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
