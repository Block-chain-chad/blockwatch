import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'

const AuthContext = createContext({ session: null, ready: true, available: false })

/**
 * Optional accounts. Password sign-in is the primary path (familiar), with
 * email magic links kept as the passwordless fallback — clicking any emailed
 * link (magic, signup confirmation, password recovery) also signs you in.
 * Anonymous use is a first-class mode — `session` is simply null and
 * everything runs on localStorage, exactly as before accounts existed.
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [ready, setReady] = useState(!supabase)
  // True when the user arrived via a password-recovery email link — the app
  // should prompt them to set a new password.
  const [recovery, setRecovery] = useState(false)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
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

  async function signInPassword(email, password) {
    if (!supabase) throw new Error('auth not configured')
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw error
  }

  /**
   * Returns 'signed-in' (session started), 'confirm' (confirmation email
   * sent), or 'exists' — the address already has an account. In that last
   * case Supabase sends no email at all (by design, so signup can't be used
   * to probe which emails are registered), so the UI must not promise one.
   */
  async function signUpPassword(email, password) {
    if (!supabase) throw new Error('auth not configured')
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { emailRedirectTo: window.location.origin },
    })
    if (error) throw error
    if (data.session) return 'signed-in'
    // Existing accounts come back as a placeholder user with no identities.
    if (!data.user?.identities?.length) return 'exists'
    return 'confirm'
  }

  async function resetPassword(email) {
    if (!supabase) throw new Error('auth not configured')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }

  async function updatePassword(newPassword) {
    if (!supabase) throw new Error('auth not configured')
    const { error } = await supabase.auth.updateUser({ password: newPassword })
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
    recovery,
    clearRecovery: () => setRecovery(false),
    signIn,
    signInPassword,
    signUpPassword,
    resetPassword,
    updatePassword,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
