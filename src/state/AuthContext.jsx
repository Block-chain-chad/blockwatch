import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, pendingRecovery } from '../services/supabase'
import { consumePendingAuthResult, subscribeAuthLinks } from '../services/authLinks'
import { track } from '../services/analytics'
import { signInNative, startWebSignIn } from '../services/socialSignIn'
import { signInWithPasskey } from '../services/passkeys'
import { clearAccountStorage, requestAccountDeletion } from '../services/accountDeletion'
import { isNativeApp } from '../lib/platform'
import { signedInRecently } from '../../api/_identity.js'

const AuthContext = createContext({ session: null, ready: true, available: false })

// Where emailed auth links (magic link, signup confirmation, password reset)
// must land. On the website that's this origin. In the native app the WebView
// origin is capacitor://localhost — a URL Mail.app cannot open — so native
// builds set VITE_API_BASE (see .env.ios) and the link points at the real site.
// Web builds leave VITE_API_BASE unset, so behavior there is unchanged.
//
// NOTE (dashboard step, cannot be fixed in code): this URL must also be set as
// Supabase's Site URL and listed under Auth → URL Configuration → Redirect
// URLs, or the emailed link bounces.
const AUTH_REDIRECT = import.meta.env.VITE_API_BASE || window.location.origin

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
  // 'success' → WelcomeSheet's you're-in moment; 'expired' → its dead-link
  // variant. Set from handled email links and from SignInSheet sign-ins.
  const [welcome, setWelcome] = useState(null)

  function applyAuthLinkResult(result) {
    if (!result) return
    if (result.kind === 'recovery') setRecovery(true)
    else if (result.kind === 'welcome') setWelcome('success')
    else if (result.kind === 'expired') setWelcome('expired')
    else if (result.kind === 'failed') setWelcome('failed')
    else if (result.kind === 'other-browser') setWelcome('other-browser')
  }

  useEffect(() => {
    if (!supabase) return
    // Recovery may have fired before we mounted (see services/supabase.js).
    if (pendingRecovery) setRecovery(true)
    // An emailed link may have been handled before this provider mounted
    // (web: AccessGate delays mount; native: cold-start launch URL).
    applyAuthLinkResult(consumePendingAuthResult())
    const unsubLinks = subscribeAuthLinks(applyAuthLinkResult)
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s ?? null)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
    })
    return () => {
      sub.subscription.unsubscribe()
      unsubLinks()
    }
  }, [])

  async function signIn(email) {
    if (!supabase) throw new Error('auth not configured')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: AUTH_REDIRECT },
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
    // After the throw, so a wrong password counts nothing. Counted here and
    // not in SignInSheet so every caller of this path is counted, and so no
    // email ever sits next to the event.
    track('sign_in_completed', { method: 'password' })
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
      options: { emailRedirectTo: AUTH_REDIRECT },
    })
    if (error) throw error
    if (data.session) {
      track('sign_in_completed', { method: 'signup' })
      return 'signed-in'
    }
    // Existing accounts come back as a placeholder user with no identities.
    if (!data.user?.identities?.length) return 'exists'
    return 'confirm'
  }

  async function resetPassword(email) {
    if (!supabase) throw new Error('auth not configured')
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: AUTH_REDIRECT,
    })
    if (error) throw error
  }

  async function resendConfirmation(email) {
    if (!supabase) throw new Error('auth not configured')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
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

  /**
   * Sign in with Apple or Google. On the web this leaves the page and comes
   * back through /auth/callback (services/authLinks.js shows the welcome); in
   * the iOS app it completes here and resolves once signed in.
   */
  async function signInWithProvider(provider) {
    if (!supabase) throw new Error('auth not configured')
    if (isNativeApp()) await signInNative(provider)
    else await startWebSignIn(provider)
  }

  async function signInPasskey() {
    if (!supabase) throw new Error('auth not configured')
    await signInWithPasskey()
  }

  /**
   * Delete the account on the server, then sign out on this device and clear
   * what it kept for the account. `appleAuthorizationCode` is passed when the
   * iOS app has one, so the server can revoke Sign in with Apple as well.
   */
  async function deleteAccount({ appleAuthorizationCode } = {}) {
    if (!supabase) throw new Error('auth not configured')
    const { data } = await supabase.auth.getSession()
    const current = data?.session
    if (!current) throw new Error('not signed in')
    const result = await requestAccountDeletion({
      accessToken: current.access_token,
      appleAuthorizationCode,
    })
    // Local only: the account no longer exists, so there is no server
    // session left to end.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {})
    clearAccountStorage(current.user.id)
    track('account_deleted')
    return result
  }

  const value = {
    session,
    user: session?.user ?? null,
    ready,
    available: Boolean(supabase),
    recovery,
    clearRecovery: () => setRecovery(false),
    welcome,
    showWelcome: () => setWelcome('success'),
    clearWelcome: () => setWelcome(null),
    resendConfirmation,
    signIn,
    signInPassword,
    signUpPassword,
    resetPassword,
    updatePassword,
    signOut,
    signInWithProvider,
    signInPasskey,
    deleteAccount,
    // Whether this session signed in recently enough to delete the account
    // (the server checks the same thing, see api/delete-account.js).
    signedInRecently: () => signedInRecently(session?.access_token),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
