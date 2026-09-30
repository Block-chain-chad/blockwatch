// Remote switches, read from PostHog with plain fetch — the same no-SDK
// approach as services/analytics.js, and the same project key.
//
// WHY THIS EXISTS. The in-app swap spends real money at a real venue, and
// nobody has reviewed which regions may legally do that (first-day review,
// "Decisions for Terra" item 1). Terra has to be able to switch it off for
// everyone in seconds. A VITE_ variable cannot do that: it is baked into the
// bundle at build time, so switching it costs a Vercel rebuild and a
// redeploy. PostHog answers per session, so a flip reaches open sessions.
//
// FAIL CLOSED. A flag we could not evaluate — PostHog unreachable, the
// request still in flight, no project key — is not "probably fine". It takes
// the build-time fallback, and the swap's fallback ships OFF. Nothing here
// ever guesses ON.
//
// SYNCHRONOUS READ. The store starts at the fallback and is read through
// useSyncExternalStore, so the very first render already has an answer. There
// is no window in which a component renders "loading" and a user taps through
// it — before PostHog answers, the swap is simply off.

import { useSyncExternalStore } from 'react'
import { deviceId } from './analytics'

/** The PostHog flag keys. These exact strings are what Terra creates in
 *  PostHog → Feature flags. Changing one here orphans the switch. */
export const SWAP_FLAG = 'in-app-swap'
export const LINK_OUT_FLAG = 'jupiter-link-out'
// The issuer-ratio sentence on the asset screen. Its own switch, NOT because
// it is trading functionality — it is a line of text on a screen every visitor
// sees — but because it describes what a tokenized security represents and a
// lawyer has not ruled on the noun. It borrowed the swap flag at first, which
// meant enabling the swap would have shipped the sentence with it.
export const RATIO_LINE_FLAG = 'issuer-ratio-line'
// The three new ways to sign in. Each one only works once its provider is set
// up in the Supabase, Apple or Google dashboard, so each has its own switch
// and ships OFF: a button that fails on every tap is worse than no button.
export const SIGN_IN_APPLE_FLAG = 'sign-in-apple'
export const SIGN_IN_GOOGLE_FLAG = 'sign-in-google'
export const SIGN_IN_PASSKEY_FLAG = 'sign-in-passkey'
// The Delete account row in Profile. Marcus keeps it OFF until deletion has
// been tested for real, on the web and in the iPhone app. The fallback is OFF
// so a blocked or unreachable PostHog cannot show it early. Before the iPhone
// build goes to Apple review it must be ON (Apple requires in-app deletion):
// switch the PostHog flag on and set VITE_ACCOUNT_DELETION_ENABLED=true in the
// builds, so the row cannot vanish when PostHog is blocked.
export const ACCOUNT_DELETION_FLAG = 'account-deletion'

/* The user-facing meaning of each flag, kept here rather than at the four
   places that render it, so the three entry points cannot drift into saying
   three different things about the same switch. */
export const SWAP_PAUSED_LINE = 'Swapping inside Onstock is paused.'
export const LINK_OUT_PAUSED_LINE = 'Links out to trading venues are paused.'
export const TRADE_PAUSED_SHORT = 'Trading paused'

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'
// Long enough for a cold mobile connection, short enough that a hung request
// is not what decides whether the switch works. A timeout lands on the
// fallback, same as any other failure.
const FLAGS_TIMEOUT_MS = 6000
// How soon a flip reaches a session that is already open. The app already
// polls prices on this cadence, so this adds no new order of traffic.
const REFRESH_MS = 60_000

/**
 * Read a VITE_ variable as a boolean. Vite passes env values through as
 * strings, so "false" has to be spelled out — a bare truthiness test would
 * read the string "false" as on.
 *
 * @param {unknown} value raw import.meta.env value
 * @param {boolean} whenUnset what an unset or unrecognised value means
 */
export function envEnabled(value, whenUnset) {
  if (value === 'true' || value === true) return true
  if (value === 'false' || value === false) return false
  return whenUnset
}

/* The build-time fallback per flag, used whenever PostHog has not given an
   answer for it.

   They differ on purpose, because the risks are not the same shape. The
   in-app swap is a real-money path OnStock builds itself, so it ships OFF and
   stays off until something affirmatively turns it on. The issuer ratio line
   is one sentence of text, but it describes what a tokenized security
   represents and no lawyer has read it, so it ships OFF for the same reason a
   draft disclosure does. The Jupiter link-out ships OFF too: Marcus switched
   the link-outs off on September 30, 2026, and an outage must not bring them
   back. Account deletion ships OFF until it has been tested for real (see
   ACCOUNT_DELETION_FLAG).

   Leave VITE_SWAP_ENABLED blank for the kill switch to be absolute. Setting
   it to "true" makes ON the fallback, which means a session that cannot reach
   PostHog keeps swapping after Terra has flipped the flag off. */
const FALLBACK = {
  [SWAP_FLAG]: envEnabled(import.meta.env.VITE_SWAP_ENABLED, false),
  [LINK_OUT_FLAG]: envEnabled(import.meta.env.VITE_JUPITER_LINK_OUT_ENABLED, false),
  // Off until a lawyer has read the sentence. Fails closed like the swap.
  [RATIO_LINE_FLAG]: envEnabled(import.meta.env.VITE_ISSUER_RATIO_LINE_ENABLED, false),
  // Off until each provider is configured; see SIGN_IN_*_FLAG above.
  [SIGN_IN_APPLE_FLAG]: envEnabled(import.meta.env.VITE_SIGN_IN_APPLE_ENABLED, false),
  [SIGN_IN_GOOGLE_FLAG]: envEnabled(import.meta.env.VITE_SIGN_IN_GOOGLE_ENABLED, false),
  [SIGN_IN_PASSKEY_FLAG]: envEnabled(import.meta.env.VITE_SIGN_IN_PASSKEY_ENABLED, false),
  // Off until tested; see ACCOUNT_DELETION_FLAG above.
  [ACCOUNT_DELETION_FLAG]: envEnabled(import.meta.env.VITE_ACCOUNT_DELETION_ENABLED, false),
}

/** PostHog's answer, or null while there is none. */
let answer = null
const listeners = new Set()

/**
 * Pull the flags out of a PostHog response body.
 *
 * Two shapes are accepted because the endpoint has both: /flags?v=2 returns
 * `flags[name].enabled`, and the older `featureFlags[name]` map is still sent
 * alongside it. Only a literal `true` counts as on — a multivariate flag
 * answers with a variant string, and a string is not permission to spend
 * someone's money.
 *
 * @returns {Record<string, boolean>}
 */
export function readFlags(body) {
  const out = {}
  const detailed = body?.flags
  if (detailed && typeof detailed === 'object') {
    for (const [name, detail] of Object.entries(detailed)) {
      out[name] = detail?.enabled === true
    }
  }
  const legacy = body?.featureFlags
  if (legacy && typeof legacy === 'object') {
    for (const [name, value] of Object.entries(legacy)) {
      if (!(name in out)) out[name] = value === true
    }
  }
  return out
}

/**
 * PostHog's answer wins when there is one; otherwise the build-time fallback.
 * A flag PostHog has never heard of is absent from its answer, so it lands on
 * the fallback too — which is how a project with no flags created yet still
 * behaves sanely.
 */
export function resolveFlag(remote, fallback) {
  if (remote === true) return true
  if (remote === false) return false
  return fallback === true
}

/** The current value of one flag, readable synchronously from anywhere. */
export function flagEnabled(name) {
  return resolveFlag(answer?.[name], FALLBACK[name])
}

/**
 * Install a PostHog answer, or `null` to drop back to the fallbacks. The
 * loader calls this; tests call it to drive the store without a network.
 */
export function applyFlags(flags) {
  answer = flags
  // Over a copy: a listener may unsubscribe (or a component may mount and
  // subscribe) while this runs, and mutating the set mid-iteration is how a
  // notification gets skipped.
  for (const listener of [...listeners]) listener()
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Read a flag in a component. Returns a boolean on the FIRST render — there
 * is no loading state to tap through. The same value is used for a static
 * render, so a server-rendered page agrees with the browser.
 */
export function useFlag(name) {
  const read = () => flagEnabled(name)
  return useSyncExternalStore(subscribe, read, read)
}

/**
 * Ask PostHog once. Any failure — no key, non-OK status, timeout, bad JSON —
 * drops the stored answer, which returns every flag to its fallback. That is
 * the fail-closed path for the swap: losing contact with the switch turns the
 * swap off rather than leaving it on unsupervised.
 *
 * Safe to call repeatedly; it holds no state of its own.
 */
export async function loadFeatureFlags({ fetchImpl, distinctId } = {}) {
  const doFetch = fetchImpl ?? (typeof fetch === 'function' ? fetch : null)
  if (!KEY || !doFetch) {
    applyFlags(null)
    return
  }
  const abort = typeof AbortController === 'function' ? new AbortController() : null
  const timer = abort ? setTimeout(() => abort.abort(), FLAGS_TIMEOUT_MS) : null
  try {
    const res = await doFetch(`${HOST}/flags/?v=2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: abort?.signal,
      body: JSON.stringify({ api_key: KEY, distinct_id: distinctId ?? deviceId() }),
    })
    if (!res?.ok) {
      applyFlags(null)
      return
    }
    applyFlags(readFlags(await res.json()))
  } catch {
    // Unreachable, aborted, or unparseable. Back to the fallbacks.
    applyFlags(null)
  } finally {
    if (timer) clearTimeout(timer)
  }
}

let started = false

/**
 * Start reading flags: once now, then every minute so a flip reaches sessions
 * that are already open. Idempotent — a second call is a no-op rather than a
 * second timer.
 */
export function startFeatureFlags() {
  if (started) return
  started = true
  loadFeatureFlags()
  setInterval(loadFeatureFlags, REFRESH_MS)
}
