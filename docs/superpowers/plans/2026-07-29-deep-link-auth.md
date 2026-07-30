# Deep-Link Auth + Feels-Real Signup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emailed auth links (confirm signup / magic link / password reset) open the iOS app directly via Universal Links, and the whole account flow gains visible proof of reality (welcome moment, honest errors, credible form).

**Architecture:** Three pieces per spec `docs/superpowers/specs/2026-07-29-deep-link-auth-design.md`: (1) AASA handshake file on blockwatch.app + Associated Domains entitlement, (2) `@capacitor/app` link listener feeding (3) a shared `authLinks` handler that exchanges the email's `token_hash` for a session via `supabase.auth.verifyOtp`. Email templates switch from `{{ .ConfirmationURL }}` (redirect — kills Universal Links) to direct `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` links. UI package: WelcomeSheet, dead-row removal, show-password + strength, "email not confirmed" mapping + resend.

**Tech Stack:** React 19 + Vite 8 (JS, no TS), Tailwind v4, supabase-js v2, Capacitor 8 (iOS, SPM), vitest, Vercel static + serverless.

## Global Constraints

- **NEVER `git push` without the user's explicit OK in chat** — push auto-deploys blockwatch.app. Commit locally per task; push happens once, at the deploy step (Task 10), after asking.
- Web behavior outside the new `/auth/confirm` path must be byte-identical where a task doesn't explicitly change it.
- Plain JavaScript only — no TypeScript syntax anywhere (build has no TS).
- Copy rules: em dash `—` in UI copy; sentence case; no exclamation marks except the existing "✓" patterns; password minimum is 8 chars (`MIN_PASSWORD = 8`, matches the server rule — do not change).
- verifyOtp `type` allowlist is exactly `signup | magiclink | recovery` — nothing else.
- AASA scopes ONLY `/auth/*` to the app. `appID` is exactly `92Y88BW5VC.app.blockwatch`.
- Sheet styling follows the existing pattern (see PasswordSheet.jsx): `fixed inset-0 z-[60] mx-auto flex max-w-md items-end`, backdrop `overlay-in bg-black/60`, panel `sheet-in w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70`, grab bar `mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800`.
- Run `npx vitest run` and `npm run lint` before every commit. Lint baseline is 18 warnings; add zero new warnings.
- Commit messages: imperative, no scope prefix (matches repo style, e.g. "Rename the Screener tab to Gaps"), ending with the Co-Authored-By trailer used in this repo's recent commits.

## File Structure

| File | Responsibility |
|---|---|
| `src/services/authLinks.js` (new) | Parse `/auth/confirm` URLs; exchange token_hash via verifyOtp; pending-result + subscription plumbing |
| `src/services/authLinks.test.js` (new) | Unit tests for parsing + handling |
| `src/lib/passwordStrength.js` (new) | Pure strength heuristic |
| `src/lib/passwordStrength.test.js` (new) | Boundary tests |
| `src/lib/authErrors.js` (new) | Pure Supabase-error → user-copy mapping |
| `src/lib/authErrors.test.js` (new) | Mapping tests |
| `src/state/AuthContext.jsx` (modify) | welcome/linkError state, resendConfirmation, consume + subscribe authLinks |
| `src/overlays/SignInSheet.jsx` (modify) | Eye toggle, strength hint, error mapping + resend, copy, magic link on native |
| `src/overlays/WelcomeSheet.jsx` (new) | "You're in ✓" success + expired-link variant |
| `src/overlays/ProfileSheet.jsx` (modify) | Delete the two dead rows |
| `src/components/Icons.jsx` (modify) | EyeIcon, EyeOffIcon |
| `src/App.jsx` (modify) | Render WelcomeSheet gate |
| `src/main.jsx` (modify) | Web `/auth/confirm` boot hook; native listener init |
| `public/.well-known/apple-app-site-association` (new) | AASA handshake |
| `vercel.json` (modify) | AASA content-type header + `/auth/confirm` rewrite |
| `ios/App/App/App.entitlements` (new) | Associated Domains |
| `ios/App/App.xcodeproj/project.pbxproj` (modify) | CODE_SIGN_ENTITLEMENTS in both App-target configs |
| `docs/email-templates.md` (new) | The 3 dashboard templates + paste instructions |

---

### Task 1: authLinks service — parsing

**Files:**
- Create: `src/services/authLinks.js`
- Test: `src/services/authLinks.test.js`

**Interfaces:**
- Produces: `parseAuthLink(url: string) -> { tokenHash: string, type: 'signup'|'magiclink'|'recovery' } | null`

- [ ] **Step 1: Write the failing tests**

```js
// src/services/authLinks.test.js
import { describe, it, expect } from 'vitest'
import { parseAuthLink } from './authLinks'

/*
 * The emailed links are the only input this parser will ever see:
 * {{ .SiteURL }}/auth/confirm?token_hash=…&type=signup|magiclink|recovery
 * Everything else — other paths, missing params, unknown types — must be
 * rejected with null, never a throw: this runs on raw appUrlOpen input.
 */
describe('parseAuthLink', () => {
  it('accepts each of the three emailed link types', () => {
    for (const type of ['signup', 'magiclink', 'recovery']) {
      expect(
        parseAuthLink(`https://blockwatch.app/auth/confirm?token_hash=abc123&type=${type}`),
      ).toEqual({ tokenHash: 'abc123', type })
    }
  })

  it('rejects other paths — ordinary site links must not be treated as auth', () => {
    expect(parseAuthLink('https://blockwatch.app/privacy.html')).toBeNull()
    expect(parseAuthLink('https://blockwatch.app/')).toBeNull()
    expect(parseAuthLink('https://blockwatch.app/auth/other?token_hash=x&type=signup')).toBeNull()
  })

  it('rejects missing or empty params', () => {
    expect(parseAuthLink('https://blockwatch.app/auth/confirm?type=signup')).toBeNull()
    expect(parseAuthLink('https://blockwatch.app/auth/confirm?token_hash=&type=signup')).toBeNull()
    expect(parseAuthLink('https://blockwatch.app/auth/confirm?token_hash=abc123')).toBeNull()
  })

  it('rejects types outside the allowlist', () => {
    for (const bad of ['email', 'invite', 'email_change', 'SIGNUP', 'x']) {
      expect(
        parseAuthLink(`https://blockwatch.app/auth/confirm?token_hash=abc123&type=${bad}`),
      ).toBeNull()
    }
  })

  it('never throws on garbage', () => {
    for (const garbage of ['', 'not a url', null, undefined, 'capacitor://localhost']) {
      expect(parseAuthLink(garbage)).toBeNull()
    }
  })

  it('ignores extra params', () => {
    expect(
      parseAuthLink('https://blockwatch.app/auth/confirm?utm=x&token_hash=abc123&type=recovery'),
    ).toEqual({ tokenHash: 'abc123', type: 'recovery' })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/services/authLinks.test.js`
Expected: FAIL — cannot resolve `./authLinks`

- [ ] **Step 3: Implement the parser**

```js
// src/services/authLinks.js
// Emailed auth links land here. The templates (docs/email-templates.md) link
// to {{ .SiteURL }}/auth/confirm?token_hash=…&type=… — a DIRECT link, no
// Supabase redirect, because iOS Universal Links refuse to open the app on a
// redirect. The token_hash is one-time and short-lived; verifyOtp consumes it.

import { supabase } from './supabase'

// Exactly the three types our email templates emit. Reject everything else.
const LINK_TYPES = new Set(['signup', 'magiclink', 'recovery'])

/** Parse an incoming URL. Returns { tokenHash, type } or null — never throws. */
export function parseAuthLink(url) {
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.pathname !== '/auth/confirm') return null
  const tokenHash = parsed.searchParams.get('token_hash')
  const type = parsed.searchParams.get('type')
  if (!tokenHash || !LINK_TYPES.has(type)) return null
  return { tokenHash, type }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/authLinks.test.js`
Expected: PASS (6 tests)

- [ ] **Step 5: Lint, then commit**

Run: `npm run lint` (18 warnings, none new)

```bash
git add src/services/authLinks.js src/services/authLinks.test.js
git commit -m "Parse emailed auth links"
```

---

### Task 2: authLinks service — handling, pending result, subscription

**Files:**
- Modify: `src/services/authLinks.js`
- Test: `src/services/authLinks.test.js` (append)

**Interfaces:**
- Consumes: `parseAuthLink` (Task 1), `supabase` from `./supabase`
- Produces:
  - `handleAuthLink(url: string) -> Promise<boolean>` — true if the URL was an auth link (regardless of outcome)
  - `consumePendingAuthResult() -> AuthLinkResult | null` — one-shot read
  - `subscribeAuthLinks(cb: (r: AuthLinkResult) => void) -> () => void` — unsubscribe fn
  - `AuthLinkResult = { kind: 'welcome' } | { kind: 'recovery' } | { kind: 'expired' }`

- [ ] **Step 1: Append the failing tests**

```js
// append to src/services/authLinks.test.js
import { vi, beforeEach } from 'vitest'
import { handleAuthLink, consumePendingAuthResult, subscribeAuthLinks } from './authLinks'
import { supabase } from './supabase'

vi.mock('./supabase', () => ({
  supabase: { auth: { verifyOtp: vi.fn() } },
}))

describe('handleAuthLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    consumePendingAuthResult() // drain any leftover pending state between tests
  })

  it('non-auth URLs: returns false, calls nothing, stores nothing', async () => {
    expect(await handleAuthLink('https://blockwatch.app/privacy.html')).toBe(false)
    expect(supabase.auth.verifyOtp).not.toHaveBeenCalled()
    expect(consumePendingAuthResult()).toBeNull()
  })

  it('signup link → verifyOtp with token_hash, pending welcome', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
    const ok = await handleAuthLink('https://blockwatch.app/auth/confirm?token_hash=t1&type=signup')
    expect(ok).toBe(true)
    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({ token_hash: 't1', type: 'signup' })
    expect(consumePendingAuthResult()).toEqual({ kind: 'welcome' })
    expect(consumePendingAuthResult()).toBeNull() // one-shot
  })

  it('recovery link → pending recovery, not welcome', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
    await handleAuthLink('https://blockwatch.app/auth/confirm?token_hash=t2&type=recovery')
    expect(consumePendingAuthResult()).toEqual({ kind: 'recovery' })
  })

  it('expired/used token → pending expired', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: 'Token has expired or is invalid' } })
    await handleAuthLink('https://blockwatch.app/auth/confirm?token_hash=t3&type=magiclink')
    expect(consumePendingAuthResult()).toEqual({ kind: 'expired' })
  })

  it('delivers to a live subscriber instead of storing', async () => {
    supabase.auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null })
    const cb = vi.fn()
    const unsub = subscribeAuthLinks(cb)
    await handleAuthLink('https://blockwatch.app/auth/confirm?token_hash=t4&type=signup')
    expect(cb).toHaveBeenCalledWith({ kind: 'welcome' })
    expect(consumePendingAuthResult()).toBeNull()
    unsub()
  })
})
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `npx vitest run src/services/authLinks.test.js`
Expected: Task-1 tests PASS, new tests FAIL (exports missing)

- [ ] **Step 3: Implement handling**

Append to `src/services/authLinks.js`:

```js
// Result of the most recent handled link. AuthProvider may not be mounted yet
// (web: AccessGate wraps it; native: cold-start link handled during boot), so
// results park here until consumed — same early-capture reasoning as
// pendingRecovery in ./supabase.js.
let pendingResult = null
const subscribers = new Set()

function emit(result) {
  if (subscribers.size > 0) {
    for (const cb of subscribers) cb(result)
  } else {
    pendingResult = result
  }
}

/** One-shot: returns the parked result (if any) and clears it. */
export function consumePendingAuthResult() {
  const r = pendingResult
  pendingResult = null
  return r
}

/** Live delivery for links that arrive after mount (native warm opens). */
export function subscribeAuthLinks(cb) {
  subscribers.add(cb)
  return () => subscribers.delete(cb)
}

/**
 * Handle a possibly-auth URL. Returns true when the URL was an auth link
 * (so callers know it was consumed), false otherwise. Outcomes surface via
 * consumePendingAuthResult/subscribeAuthLinks, never thrown.
 */
export async function handleAuthLink(url) {
  const link = parseAuthLink(url)
  if (!link) return false
  if (!supabase) {
    emit({ kind: 'expired' }) // auth unconfigured — treat as a dead link
    return true
  }
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: link.tokenHash,
      type: link.type,
    })
    if (error || !data?.session) {
      emit({ kind: 'expired' })
    } else {
      emit(link.type === 'recovery' ? { kind: 'recovery' } : { kind: 'welcome' })
    }
  } catch {
    emit({ kind: 'expired' })
  }
  return true
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/services/authLinks.test.js`
Expected: PASS (11 tests)

- [ ] **Step 5: Lint, then commit**

```bash
git add src/services/authLinks.js src/services/authLinks.test.js
git commit -m "Exchange emailed auth links for sessions"
```

---

### Task 3: password strength heuristic

**Files:**
- Create: `src/lib/passwordStrength.js`
- Test: `src/lib/passwordStrength.test.js`

**Interfaces:**
- Produces: `passwordStrength(pw: string) -> { label: 'too short'|'weak'|'okay'|'strong', tone: 'dim'|'warn'|'okay'|'good' }`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/passwordStrength.test.js
import { describe, it, expect } from 'vitest'
import { passwordStrength } from './passwordStrength'

/*
 * A hint, not a gate: submission is controlled solely by the existing 8-char
 * minimum (server-enforced). This just tells the user what they're making.
 * Classes counted: lowercase, uppercase, digit, other.
 */
describe('passwordStrength', () => {
  it('under 8 chars is too short', () => {
    expect(passwordStrength('abc').label).toBe('too short')
    expect(passwordStrength('1234567').label).toBe('too short')
    expect(passwordStrength('').label).toBe('too short')
  })

  it('8+ of one character class is weak', () => {
    expect(passwordStrength('abcdefgh')).toEqual({ label: 'weak', tone: 'warn' })
    expect(passwordStrength('12345678').label).toBe('weak')
  })

  it('8-11 with 2+ classes is okay', () => {
    expect(passwordStrength('abcdef12')).toEqual({ label: 'okay', tone: 'okay' })
    expect(passwordStrength('Abcdefghijk').label).toBe('okay')
  })

  it('12+ with 2+ classes is strong', () => {
    expect(passwordStrength('abcdefghij12')).toEqual({ label: 'strong', tone: 'good' })
    expect(passwordStrength('correct-horse-battery').label).toBe('strong')
  })

  it('12+ of one class is still weak — length alone does not diversify', () => {
    expect(passwordStrength('abcdefghijkl').label).toBe('weak')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/passwordStrength.test.js`
Expected: FAIL — cannot resolve `./passwordStrength`

- [ ] **Step 3: Implement**

```js
// src/lib/passwordStrength.js
// Live hint under the signup password field. Deliberately simple and
// deliberately NOT a gate — the only hard rule is the 8-char minimum the
// server enforces. Tones map to text colors in SignInSheet.

export function passwordStrength(pw) {
  if (pw.length < 8) return { label: 'too short', tone: 'dim' }
  let classes = 0
  if (/[a-z]/.test(pw)) classes++
  if (/[A-Z]/.test(pw)) classes++
  if (/[0-9]/.test(pw)) classes++
  if (/[^a-zA-Z0-9]/.test(pw)) classes++
  if (classes < 2) return { label: 'weak', tone: 'warn' }
  if (pw.length >= 12) return { label: 'strong', tone: 'good' }
  return { label: 'okay', tone: 'okay' }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/passwordStrength.test.js`
Expected: PASS (5 tests)

- [ ] **Step 5: Lint, then commit**

```bash
git add src/lib/passwordStrength.js src/lib/passwordStrength.test.js
git commit -m "Password strength hint"
```

---

### Task 4: auth error mapping

**Files:**
- Create: `src/lib/authErrors.js`
- Test: `src/lib/authErrors.test.js`

**Interfaces:**
- Produces: `mapAuthError(message: string) -> { text: string, action: 'resend'|null }`

- [ ] **Step 1: Write the failing tests**

```js
// src/lib/authErrors.test.js
import { describe, it, expect } from 'vitest'
import { mapAuthError } from './authErrors'

/*
 * Supabase error messages → honest user copy. The one that motivated this
 * file: "Email not confirmed" used to fall through to the generic message,
 * so a brand-new password looked broken ("the password does nothing").
 */
describe('mapAuthError', () => {
  it('unconfirmed email says so, and offers resend', () => {
    const r = mapAuthError('Email not confirmed')
    expect(r.text).toBe('Almost there — tap the link we emailed you first, then sign in.')
    expect(r.action).toBe('resend')
  })

  it('wrong credentials keeps the existing copy', () => {
    const r = mapAuthError('Invalid login credentials')
    expect(r.text).toBe("That email and password didn't match. Try again, or use “Forgot password?”")
    expect(r.action).toBeNull()
  })

  it('already registered keeps the existing copy', () => {
    const r = mapAuthError('User already registered')
    expect(r.text).toBe('That email already has an account — switch to Sign in.')
    expect(r.action).toBeNull()
  })

  it('anything else falls back to the generic copy', () => {
    for (const msg of ['fetch failed', '', undefined, null]) {
      const r = mapAuthError(msg)
      expect(r.text).toBe("That didn't work — give it another try in a moment.")
      expect(r.action).toBeNull()
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/authErrors.test.js`
Expected: FAIL — cannot resolve `./authErrors`

- [ ] **Step 3: Implement**

```js
// src/lib/authErrors.js
// Supabase auth error → user copy. Matching is substring-based because
// Supabase message text carries no stable codes at this API surface.

export function mapAuthError(message) {
  const msg = String(message ?? '')
  if (msg.includes('Email not confirmed')) {
    return { text: 'Almost there — tap the link we emailed you first, then sign in.', action: 'resend' }
  }
  if (msg.includes('Invalid login credentials')) {
    return { text: "That email and password didn't match. Try again, or use “Forgot password?”", action: null }
  }
  if (msg.includes('already registered')) {
    return { text: 'That email already has an account — switch to Sign in.', action: null }
  }
  return { text: "That didn't work — give it another try in a moment.", action: null }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/authErrors.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Lint, then commit**

```bash
git add src/lib/authErrors.js src/lib/authErrors.test.js
git commit -m "Map auth errors to honest copy"
```

---

### Task 5: AuthContext — welcome state, resend, authLinks wiring

**Files:**
- Modify: `src/state/AuthContext.jsx`

**Interfaces:**
- Consumes: `consumePendingAuthResult`, `subscribeAuthLinks` (Task 2)
- Produces (additions to the `useAuth()` value):
  - `welcome: 'success' | 'expired' | null`
  - `showWelcome() -> void` (sets `'success'`)
  - `clearWelcome() -> void`
  - `resendConfirmation(email: string) -> Promise<void>` (throws on error)

No new unit test — this file is React wiring with no extractable logic; it is exercised end-to-end in Task 9's build check and the device test. (The repo has no component-test harness; do not introduce one here.)

- [ ] **Step 1: Add imports and state**

In `src/state/AuthContext.jsx`, add to the imports:

```js
import { consumePendingAuthResult, subscribeAuthLinks } from '../services/authLinks'
```

Inside `AuthProvider`, after the `recovery` state line, add:

```js
  // 'success' → WelcomeSheet's you're-in moment; 'expired' → its dead-link
  // variant. Set from handled email links and from SignInSheet sign-ins.
  const [welcome, setWelcome] = useState(null)
```

- [ ] **Step 2: Consume parked results and subscribe for live ones**

Inside the existing `useEffect` (the one guarded by `if (!supabase) return`), after the `if (pendingRecovery) setRecovery(true)` line, add:

```js
    // An emailed link may have been handled before this provider mounted
    // (web: AccessGate delays mount; native: cold-start launch URL).
    applyAuthLinkResult(consumePendingAuthResult())
    const unsubLinks = subscribeAuthLinks(applyAuthLinkResult)
```

Change the effect's cleanup from `return () => sub.subscription.unsubscribe()` to:

```js
    return () => {
      sub.subscription.unsubscribe()
      unsubLinks()
    }
```

Add the helper inside `AuthProvider` (above the `useEffect`):

```js
  function applyAuthLinkResult(result) {
    if (!result) return
    if (result.kind === 'recovery') setRecovery(true)
    else if (result.kind === 'welcome') setWelcome('success')
    else if (result.kind === 'expired') setWelcome('expired')
  }
```

- [ ] **Step 3: Add resendConfirmation and export the new value fields**

After the `resetPassword` function, add:

```js
  async function resendConfirmation(email) {
    if (!supabase) throw new Error('auth not configured')
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    })
    if (error) throw error
  }
```

In the `value` object, after `clearRecovery`, add:

```js
    welcome,
    showWelcome: () => setWelcome('success'),
    clearWelcome: () => setWelcome(null),
    resendConfirmation,
```

- [ ] **Step 4: Full test suite + lint still green**

Run: `npx vitest run` — all tests pass (39 existing + 15 new so far)
Run: `npm run lint` — 18 warnings, none new

- [ ] **Step 5: Commit**

```bash
git add src/state/AuthContext.jsx
git commit -m "Auth context: welcome state, resend, emailed-link results"
```

---

### Task 6: WelcomeSheet + App wiring + ProfileSheet dead-row removal

**Files:**
- Create: `src/overlays/WelcomeSheet.jsx`
- Modify: `src/App.jsx`
- Modify: `src/overlays/ProfileSheet.jsx`

**Interfaces:**
- Consumes: `useAuth().{welcome, clearWelcome, user}`, `useFolders().{watchlistIds, folders}`, `useAlerts().rules`, `CheckCircleIcon` from Icons

- [ ] **Step 1: Create WelcomeSheet**

```jsx
// src/overlays/WelcomeSheet.jsx
import { useAuth } from '../state/AuthContext'
import { useFolders } from '../state/FoldersContext'
import { useAlerts } from '../state/AlertsContext'
import { CheckCircleIcon } from '../components/Icons'

/*
 * The proof-of-reality moment. Signing in used to close a sheet and change
 * one avatar letter; testers read that as fake. This surface states what
 * just happened and what the account now does, with the user's real data.
 *
 * variant 'success': session just started from a user action (email link,
 * password sign-in, magic link). variant 'expired': the emailed link was
 * dead — say so honestly and point at the fix, never a blank screen.
 */
export default function WelcomeSheet({ variant, onClose, onOpenSignIn }) {
  const { user } = useAuth()
  const { watchlistIds, folders } = useFolders()
  const { rules } = useAlerts()

  const assetCount = new Set([...watchlistIds, ...folders.flatMap((f) => f.assetIds ?? [])]).size
  const alertCount = Object.keys(rules).filter((id) => rules[id]?.drift || rules[id]?.price).length

  const expired = variant === 'expired'
  return (
    <div className="fixed inset-0 z-[60] mx-auto flex max-w-md items-end">
      <button aria-label="Close" onClick={onClose} className="absolute inset-0 overlay-in bg-black/60" />
      <div className="relative sheet-in w-full rounded-t-3xl bg-zinc-950 p-4 pb-[max(env(safe-area-inset-bottom),16px)] ring-1 ring-zinc-800/70">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-800" />

        {expired ? (
          <div className="px-1 py-4 text-center">
            <h2 className="text-base font-semibold">That link has expired</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Email links are single-use and short-lived. Request a fresh one from the sign-in screen.
            </p>
            <button
              onClick={() => {
                onClose()
                onOpenSignIn()
              }}
              className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
            >
              Open sign in
            </button>
          </div>
        ) : (
          <div className="px-1 py-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 text-accent">
              <CheckCircleIcon size={28} />
            </span>
            <h2 className="mt-3 text-base font-semibold">You're in</h2>
            {user?.email && <p className="mt-0.5 text-sm text-zinc-400">{user.email}</p>}
            <p className="mt-2 text-sm text-zinc-500">
              {assetCount > 0
                ? `Your ${assetCount} tracked ${assetCount === 1 ? 'asset' : 'assets'}${
                    alertCount > 0 ? ` and ${alertCount} ${alertCount === 1 ? 'alert' : 'alerts'}` : ''
                  } now sync to any device you sign in on.`
                : 'Anything you track or set an alert on now syncs to any device you sign in on.'}
            </p>
            <button
              onClick={onClose}
              className="mt-4 w-full rounded-xl bg-accent py-3 text-sm font-semibold text-zinc-950 transition-colors active:bg-accent-dim"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Render it from App**

In `src/App.jsx`:

Add import: `import WelcomeSheet from './overlays/WelcomeSheet'`

Below the `RecoveryGate` component definition, add:

```jsx
/* Post-sign-in confirmation, and the dead-emailed-link notice. Rendered at
   App level because email links arrive with no sheet open. */
function WelcomeGate({ onOpenSignIn }) {
  const { welcome, clearWelcome } = useAuth()
  if (!welcome) return null
  return <WelcomeSheet variant={welcome} onClose={clearWelcome} onOpenSignIn={onOpenSignIn} />
}
```

In the JSX, right after `<RecoveryGate />`, add:

```jsx
          <WelcomeGate onOpenSignIn={() => setShowProfile(true)} />
```

(Opening the profile sheet is the app's route to sign-in; SignInSheet only exists inside it.)

- [ ] **Step 3: Delete the dead rows in ProfileSheet**

In `src/overlays/ProfileSheet.jsx`, delete these two lines (currently at the top of the ListRow group, lines 111-112):

```jsx
          <ListRow icon={<BellIcon size={20} />} label="Notifications" value="On" />
          <ListRow icon={<GlobeIcon size={20} />} label="Display currency" value="USD" />
```

Then remove `BellIcon` and `GlobeIcon` from the Icons import in the same file (they become unused — lint would flag them).

- [ ] **Step 4: Verify build + tests + lint**

Run: `npx vitest run` — all pass
Run: `npm run lint` — 18 warnings, none new
Run: `npm run build` — exits 0

- [ ] **Step 5: Commit**

```bash
git add src/overlays/WelcomeSheet.jsx src/App.jsx src/overlays/ProfileSheet.jsx
git commit -m "Welcome moment after sign-in; drop the mockup profile rows"
```

---

### Task 7: SignInSheet — eye toggle, strength hint, honest errors, native magic link

**Files:**
- Modify: `src/overlays/SignInSheet.jsx`
- Modify: `src/components/Icons.jsx`

**Interfaces:**
- Consumes: `passwordStrength` (Task 3), `mapAuthError` (Task 4), `useAuth().{showWelcome, resendConfirmation}` (Task 5)

- [ ] **Step 1: Add EyeIcon / EyeOffIcon to Icons.jsx**

Append after `TrendIcon` (following the existing `Base` pattern — every icon is `(p) => (<Base {...p}>…</Base>)` with stroke paths):

```jsx
export const EyeIcon = (p) => (
  <Base {...p}>
    <path d="M2.5 11s3.5-6 8.5-6 8.5 6 8.5 6-3.5 6-8.5 6-8.5-6-8.5-6z" />
    <circle cx="11" cy="11" r="2.6" />
  </Base>
)

export const EyeOffIcon = (p) => (
  <Base {...p}>
    <path d="M4 4l14 14" />
    <path d="M8.6 5.6A9.4 9.4 0 0 1 11 5c5 0 8.5 6 8.5 6a15.7 15.7 0 0 1-2.7 3.3M6.2 6.9A15 15 0 0 0 2.5 11s3.5 6 8.5 6a8.9 8.9 0 0 0 3.4-.7" />
  </Base>
)
```

(Viewbox in `Base` is 22×22 — check `Base`'s actual viewBox before pasting; if it is 24×24, scale the coordinates by eye so the glyph fills the box like its neighbors.)

- [ ] **Step 2: Rewrite SignInSheet's password field, note area, and footer**

In `src/overlays/SignInSheet.jsx`:

Add imports:

```js
import { passwordStrength } from '../lib/passwordStrength'
import { mapAuthError } from '../lib/authErrors'
import { EyeIcon, EyeOffIcon } from '../components/Icons'
```

Pull the new context fields (replace the existing `useAuth()` destructure):

```js
  const { signIn, signInPassword, signUpPassword, resetPassword, showWelcome, resendConfirmation } =
    useAuth()
```

Add state after the existing `note` state:

```js
  const [showPw, setShowPw] = useState(false)
  const [resent, setResent] = useState(false)
```

Replace the password `<input>` with a wrapped version (show/hide toggle, ≥44px tap target):

```jsx
          <div className="relative mt-2">
            <input
              type={showPw ? 'text' : 'password'}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === 'signin' ? 'Password' : `Password (at least ${MIN_PASSWORD} characters)`}
              className="w-full rounded-xl bg-zinc-900 px-4 py-3 pr-12 text-sm text-zinc-100 placeholder-zinc-600 outline-none ring-accent/60 focus:ring-2"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 active:text-zinc-300"
            >
              {showPw ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
            </button>
          </div>
          {mode === 'signup' && password.length > 0 && (
            <p
              className={`mt-1.5 px-1 text-xs ${
                {
                  dim: 'text-zinc-600',
                  warn: 'text-amber-500',
                  okay: 'text-zinc-400',
                  good: 'text-accent',
                }[passwordStrength(password).tone]
              }`}
            >
              Password strength: {passwordStrength(password).label}
            </p>
          )}
```

Replace the whole `catch (err)` block in `submit` with:

```js
    } catch (err) {
      const mapped = mapAuthError(err?.message)
      setResent(false)
      setNote({ kind: 'error', text: mapped.text, action: mapped.action })
    }
```

Replace the note render block with (adds the resend button when offered):

```jsx
          {note && (
            <div className="mt-2 px-1">
              <p className={`text-xs leading-relaxed ${note.kind === 'sent' ? 'text-accent' : 'text-zinc-400'}`}>
                {note.text}
              </p>
              {note.action === 'resend' && (
                <button
                  type="button"
                  disabled={busy || resent}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      await resendConfirmation(email)
                      setResent(true)
                    } catch {
                      setNote({
                        kind: 'error',
                        text: "Couldn't resend just now — confirmation emails are rate-limited, wait a minute and try again.",
                      })
                    }
                    setBusy(false)
                  }}
                  className="mt-1 text-xs font-medium text-accent disabled:opacity-40"
                >
                  {resent ? 'Sent — check your inbox' : 'Resend the email'}
                </button>
              )}
            </div>
          )}
```

- [ ] **Step 3: Fire the welcome moment on successful sign-in**

In `submit`, change the two success paths:

```js
      if (mode === 'signin') {
        await signInPassword(email, password)
        onClose()
        showWelcome()
      } else {
        const result = await signUpPassword(email, password)
        if (result === 'signed-in') {
          onClose()
          showWelcome()
        } else if (result === 'exists') {
```

(The `'confirm'` branch keeps showing the "we emailed you" note — the welcome fires later, when the tapped link lands in `authLinks`.)

- [ ] **Step 4: Update the native copy and un-hide the magic link**

The signup-confirm note (the `'confirm'` branch): replace the ternary with:

```js
            text: native
              ? `Almost there — we emailed ${email.trim()}. Tap the link on this phone and the app will open with you signed in.`
              : `Almost there — we emailed ${email.trim()}. Click the link inside to confirm your account and you'll be signed in.`,
```

The forgot-password note: replace the ternary with:

```js
        text: native
          ? `Reset link sent to ${email.trim()}. Tap it on this phone — the app opens and asks for your new password.`
          : `Reset link sent to ${email.trim()} — open it and you'll be asked to set a new password.`,
```

Delete the `{!native && (` guard around the magic-link footer button (keep the button; remove only the conditional wrapper and its closing `)}`), and delete the comment block above it (`{/* Hidden on native: … */}`). Then update the file's header comment: replace the `NATIVE: password only.` paragraph with:

```
 * NATIVE: emailed links (magic, confirm, reset) open the app directly via
 * Universal Links — see services/authLinks.js. The magic-link option is
 * therefore available everywhere.
```

If `native` is now unused in the file, also remove the `const native = isNativeApp()` line, its comment, and the `isNativeApp` import — but note the two notes in Step 4 still read `native`, so it stays. Verify with lint.

- [ ] **Step 5: Tests + lint + build, then commit**

Run: `npx vitest run` — all pass
Run: `npm run lint` — 18 warnings, none new
Run: `npm run build` — exits 0

```bash
git add src/overlays/SignInSheet.jsx src/components/Icons.jsx
git commit -m "Sign-in sheet: show password, strength hint, honest unconfirmed error, magic link on native"
```

---

### Task 8: web plumbing — AASA file, vercel.json, boot hook

**Files:**
- Create: `public/.well-known/apple-app-site-association`
- Modify: `vercel.json`
- Modify: `src/main.jsx`

**Interfaces:**
- Consumes: `handleAuthLink` (Task 2), `isNativeApp` from `src/lib/platform.js`

- [ ] **Step 1: Create the AASA file**

Create `public/.well-known/apple-app-site-association` (no file extension) with exactly:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": ["92Y88BW5VC.app.blockwatch"],
        "components": [{ "/": "/auth/*" }]
      }
    ]
  }
}
```

- [ ] **Step 2: Verify Vite copies dot-directories**

Run: `npm run build`, then confirm the file landed:

```powershell
Test-Path dist/.well-known/apple-app-site-association
```

Expected: `True`. If `False`: Vite's publicDir copy skipped the dotfile — fix by adding to `vite.config.js` a tiny copy in `closeBundle` is NOT needed first; first re-check the path spelling. Only if genuinely skipped, move the file to `public/well-known-aasa.json` and add a vercel.json rewrite from `/.well-known/apple-app-site-association` to `/well-known-aasa.json` instead. Prefer the plain copy if it works.

- [ ] **Step 3: vercel.json — content-type header + SPA rewrite**

Replace the full contents of `vercel.json` with (existing headers unchanged, two additions):

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Strict-Transport-Security", "value": "max-age=63072000; includeSubDomains" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
        {
          "key": "Content-Security-Policy-Report-Only",
          "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://blockwatch.app https://www.blockwatch.app https://api.coingecko.com https://lite-api.jup.ag https://*.supabase.co https://us.i.posthog.com https://eu.i.posthog.com; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; report-uri /api/csp-report"
        }
      ]
    },
    {
      "source": "/.well-known/apple-app-site-association",
      "headers": [{ "key": "Content-Type", "value": "application/json" }]
    }
  ],
  "rewrites": [{ "source": "/auth/confirm", "destination": "/index.html" }]
}
```

(The CSP line is copied verbatim from the current file — do not retype it, copy it. The AASA needs `application/json`; extensionless files otherwise serve as octet-stream, which Apple's CDN rejects. The rewrite exists because the SPA has no server routes — without it `/auth/confirm` 404s on web.)

- [ ] **Step 4: Boot hook in main.jsx**

Replace `src/main.jsx` with:

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { initTheme } from './lib/theme'
import { isNativeApp } from './lib/platform'
import { handleAuthLink } from './services/authLinks'

initTheme()

// Emailed auth links (confirm / magic / reset) land on /auth/confirm.
// Web: the URL is this page's own. Native: links arrive as Universal Link
// events instead — see initNativeAuthLinks. The address bar is scrubbed
// immediately so the one-time token never sits in history or a screenshot.
if (!isNativeApp() && window.location.pathname === '/auth/confirm') {
  const link = window.location.href
  window.history.replaceState(null, '', '/')
  handleAuthLink(link) // result surfaces via AuthContext once mounted
}

// Native: cold-start launch URL + warm appUrlOpen events. Dynamic import so
// the web bundle never loads the Capacitor plugin.
if (isNativeApp()) {
  import('@capacitor/app').then(({ App: CapApp }) => {
    CapApp.getLaunchUrl().then((launch) => {
      if (launch?.url) handleAuthLink(launch.url)
    })
    CapApp.addListener('appUrlOpen', ({ url }) => {
      handleAuthLink(url)
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
```

- [ ] **Step 5: Install @capacitor/app**

Run: `npm install @capacitor/app@^8`
Expected: installs cleanly next to @capacitor/core 8.x. Then run `npx cap sync ios` and confirm it reports the App plugin.

- [ ] **Step 6: Tests + lint + build, then commit**

Run: `npx vitest run` — all pass
Run: `npm run lint` — no new warnings
Run: `npm run build` — exits 0, and `dist/.well-known/apple-app-site-association` exists

```bash
git add public/.well-known/apple-app-site-association vercel.json src/main.jsx package.json package-lock.json ios/App/App/capacitor.config.json
git commit -m "Auth links: AASA handshake, web confirm route, native link listener"
```

(`ios/App/App/capacitor.config.json` and any other files `cap sync` touched — check `git status` and include whatever sync regenerated.)

---

### Task 9: iOS entitlements + pbxproj + native build check

**Files:**
- Create: `ios/App/App/App.entitlements`
- Modify: `ios/App/App.xcodeproj/project.pbxproj`
- Verify: `ios/App/App/AppDelegate.swift`

- [ ] **Step 1: Create the entitlements file**

Create `ios/App/App/App.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.developer.associated-domains</key>
	<array>
		<string>applinks:blockwatch.app</string>
	</array>
</dict>
</plist>
```

- [ ] **Step 2: Wire it into both App-target build configurations**

In `ios/App/App.xcodeproj/project.pbxproj` there are two App-target `buildSettings` blocks containing `CODE_SIGN_STYLE = Automatic;` and `PRODUCT_BUNDLE_IDENTIFIER = app.blockwatch;` (currently near lines 295-307 and 317-328 — one Debug, one Release). In **both** blocks, add this line directly above `CODE_SIGN_STYLE = Automatic;`:

```
				CODE_SIGN_ENTITLEMENTS = App/App.entitlements;
```

(Tab-indented like its neighbors. Do NOT touch the other buildSettings blocks — those are project-level, lines ~187 and ~244.)

- [ ] **Step 3: Verify AppDelegate forwards Universal Links**

Read `ios/App/App/AppDelegate.swift` and confirm it contains a `continue userActivity` override forwarding to `ApplicationDelegateProxy.shared` — Capacitor's template ships it. If (and only if) it is missing, add inside the `AppDelegate` class:

```swift
    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
```

- [ ] **Step 4: Confirm the iOS bundle still builds locally**

Run: `npm run build:ios`
Expected: exits 0 (vite build + cap sync; the Xcode compile itself only runs in CI).

- [ ] **Step 5: Commit**

```bash
git add ios/App/App/App.entitlements ios/App/App.xcodeproj/project.pbxproj
git commit -m "Associated Domains entitlement for Universal Links"
```

---

### Task 10: email templates doc + deploy + dashboard handoff

**Files:**
- Create: `docs/email-templates.md`

- [ ] **Step 1: Write the templates doc**

Create `docs/email-templates.md` with the content below — these are complete, paste-ready template bodies for Supabase → Auth → Emails. All three use the teal-button style already live in the dashboard, with links rebuilt for deep-linking (`{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` — NOT `{{ .ConfirmationURL }}`, whose redirect breaks Universal Links).

````markdown
# Supabase auth email templates

Paste each into Supabase dashboard → Authentication → Emails. The links go
DIRECTLY to blockwatch.app carrying a one-time token (`{{ .TokenHash }}`);
the old `{{ .ConfirmationURL }}` bounced through Supabase's server, and iOS
refuses to open the app on a redirect. Site URL must remain
`https://blockwatch.app`.

## 1. Confirm signup — subject: `Confirm your BlockWatch account`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td style="font-size:18px;font-weight:700;color:#18181b;padding-bottom:8px;">BlockWatch</td></tr>
      <tr><td style="font-size:15px;color:#3f3f46;line-height:1.6;padding-bottom:20px;">
        Tap the button to confirm your account. If you're on your phone, the BlockWatch app opens with you signed in.
      </td></tr>
      <tr><td align="center" style="padding-bottom:20px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup"
           style="display:inline-block;background:#2dd4bf;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:12px;">
          Confirm my account
        </a>
      </td></tr>
      <tr><td style="font-size:12px;color:#a1a1aa;line-height:1.6;">
        This link is single-use and expires in 24 hours. If you didn't create a BlockWatch account, ignore this email — nothing happens without this confirmation.
      </td></tr>
    </table>
  </td></tr>
</table>
```

## 2. Magic link — subject: `Your BlockWatch sign-in link`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td style="font-size:18px;font-weight:700;color:#18181b;padding-bottom:8px;">BlockWatch</td></tr>
      <tr><td style="font-size:15px;color:#3f3f46;line-height:1.6;padding-bottom:20px;">
        Tap the button to sign in — no password needed. On your phone, the BlockWatch app opens directly.
      </td></tr>
      <tr><td align="center" style="padding-bottom:20px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink"
           style="display:inline-block;background:#2dd4bf;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:12px;">
          Sign in to BlockWatch
        </a>
      </td></tr>
      <tr><td style="font-size:12px;color:#a1a1aa;line-height:1.6;">
        This link is single-use and expires in one hour. If you didn't request it, ignore this email — your account is untouched.
      </td></tr>
    </table>
  </td></tr>
</table>
```

## 3. Reset password — subject: `Reset your BlockWatch password`

```html
<table width="100%" cellpadding="0" cellspacing="0" style="background:#fafafa;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
      <tr><td style="font-size:18px;font-weight:700;color:#18181b;padding-bottom:8px;">BlockWatch</td></tr>
      <tr><td style="font-size:15px;color:#3f3f46;line-height:1.6;padding-bottom:20px;">
        Tap the button and you'll be asked to set a new password. On your phone, this opens the BlockWatch app.
      </td></tr>
      <tr><td align="center" style="padding-bottom:20px;">
        <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
           style="display:inline-block;background:#2dd4bf;color:#0a0a0a;font-size:15px;font-weight:600;text-decoration:none;padding:12px 32px;border-radius:12px;">
          Set a new password
        </a>
      </td></tr>
      <tr><td style="font-size:12px;color:#a1a1aa;line-height:1.6;">
        This link is single-use and expires in one hour. If you didn't request it, you can safely ignore this email — your password is unchanged.
      </td></tr>
    </table>
  </td></tr>
</table>
```
````

- [ ] **Step 2: Commit the doc**

```bash
git add docs/email-templates.md
git commit -m "Deep-link email templates for the dashboard"
```

- [ ] **Step 3: STOP — ask the user for deploy permission**

Pushing deploys blockwatch.app. Ask in chat, exactly this decision: "Ready to deploy the web half (AASA + confirm route + UI changes)? This goes live on blockwatch.app." Do not push until the user says yes.

- [ ] **Step 4: Push and verify the deploy**

```bash
git push
```

Then verify (wait ~2 min for Vercel):

```bash
curl -sD - -o /dev/null https://blockwatch.app/.well-known/apple-app-site-association | grep -i "content-type\|HTTP/"
```

Expected: `HTTP/2 200` and `content-type: application/json`.

```bash
curl -s https://blockwatch.app/.well-known/apple-app-site-association
```

Expected: the exact AASA JSON, `92Y88BW5VC.app.blockwatch` present.

```bash
curl -sD - -o /dev/null "https://blockwatch.app/auth/confirm?token_hash=x&type=signup" | grep "HTTP/"
```

Expected: `HTTP/2 200` (the SPA, not a 404).

- [ ] **Step 5: Walk the user through the dashboard paste**

The user (their account) pastes the three templates + subjects from `docs/email-templates.md` into Supabase → Authentication → Emails (Confirm signup / Magic Link / Reset Password). Then verify the shape end-to-end: trigger a password-reset email to the user's own address and have them confirm the button's link starts with `https://blockwatch.app/auth/confirm?token_hash=` (long-press → copy link on iPhone). The web fallback can be tested immediately: opening that link in a desktop browser must show the app (and, with a used/expired token, the "That link has expired" sheet — which proves the whole web path).

---

### Task 11: TestFlight build 7 + device verification

- [ ] **Step 1: Dispatch the signed build**

Using gh (full path — not on PATH):

```powershell
& "C:\Program Files\GitHub CLI\gh.exe" workflow run ios-testflight.yml -f build_number=7
```

Watch: `& "C:\Program Files\GitHub CLI\gh.exe" run watch` (~15 min). 

**Known failure mode:** if export fails with a capability/entitlement error ("Provisioning profile doesn't include the com.apple.developer.associated-domains entitlement"), the App ID needs the capability flipped manually: user signs into developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → `app.blockwatch` → check **Associated Domains** → Save, then re-dispatch the workflow. This is the one step CI might not manage itself.

- [ ] **Step 2: Device test checklist (user, on their iPhone, build 7 from TestFlight)**

In order — each proves a layer:

1. **Universal Link live?** In Notes (not Safari), type `https://blockwatch.app/auth/confirm?token_hash=x&type=signup`, long-press → the preview menu should offer "Open in BlockWatch". If it opens Safari instead: Apple's CDN hasn't picked up the AASA yet — wait a few hours, re-install the app, retry. (Deploy-first sequencing was for exactly this.)
2. **Fresh signup:** sign out if signed in → Create account with a real address → "we emailed you" note → open Mail → tap **Confirm my account** → the app opens → **WelcomeSheet: "You're in", email, sync counts.**
3. **Password reset:** Forgot password → email → tap → app opens → set-new-password sheet appears → save → sign in with the new password.
4. **Magic link (now visible on native):** sign out → "Email me a sign-in link instead" → tap in Mail → app opens → WelcomeSheet.
5. **Dead link:** tap the same confirm link a second time → "That link has expired" sheet with the sign-in button. No blank screen anywhere.
6. **Profile sheet:** no Notifications/Display-currency rows; password field eye toggle works; wrong-password error copy reads correctly.

- [ ] **Step 3: Record results**

Whatever fails goes back through the fix loop before any external-tester invites; the welcome-counts copy and the strength hint are cosmetic-fix-level, the link flow is ship-blocking.

---

## Self-review (done at write time)

- **Spec coverage:** AASA ✓(T8) entitlement ✓(T9) @capacitor/app ✓(T8) token-hash templates ✓(T10) shared handler ✓(T1-2) web boot + rewrite + scrub ✓(T8) expired state ✓(T2,T6) welcome ✓(T5-6) dead rows ✓(T6) eye+strength ✓(T3,T7) unconfirmed mapping + resend ✓(T4,T5,T7) native copy update + magic link unhide ✓(T7) sequencing ✓(T10-11) device checklist ✓(T11).
- **Type consistency:** `AuthLinkResult.kind ∈ {welcome, recovery, expired}` used identically in T2/T5/T6; `welcome ∈ {'success','expired',null}` context state maps kind→variant in T5's `applyAuthLinkResult`; `parseAuthLink` returns `tokenHash` (camel) while `verifyOtp` receives `token_hash` (Supabase's key) — deliberate, shown in both places.
- **Placeholder scan:** none — every step carries its code or exact command.
