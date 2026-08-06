# Polish Round Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Honest iOS wallet row, aligned waitlist copy, three review crumbs closed, CSP enforced.

**Architecture:** Copy/conditional edits in three JSX files (Task 1); three micro-fixes from prior review ledgers (Task 2); one header-key rename gated on the user's log check (Task 3, controller-run at deploy). Spec: `docs/superpowers/specs/2026-08-05-polish-round-design.md` — its exact strings are binding.

**Tech Stack:** React/Vite (plain JS), vercel.json.

## Global Constraints

- NEVER `git push` — deploy happens at the controller's gate after user OK.
- Copy strings EXACTLY as the spec writes them (em dashes `—`, no exclamation marks).
- Web behavior of the wallet row byte-identical; the new row renders ONLY when `isNativeApp()` is true AND `!wallet.available`.
- `npx vitest run` (64) + `npm run lint` (18-warning baseline, zero new) + `npm run build` (exit 0) before each commit.
- Commit messages imperative, no scope prefix, trailer `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

---

### Task 1: honest wallet row + waitlist copy

**Files:**
- Modify: `src/overlays/ProfileSheet.jsx`
- Modify: `src/screens/Trade.jsx:123`
- Modify: `src/overlays/AboutSheet.jsx:34`

- [ ] **Step 1: ProfileSheet — imports**

Add to the imports: `import { isNativeApp } from '../lib/platform'`

- [ ] **Step 2: ProfileSheet — wallet row conditional**

The wallet rows currently read (around lines 119-139):

```jsx
          {wallet.publicKey ? (
            <ListRow
              icon={<WalletIcon size={20} />}
              label="Wallet connected"
              value={shortAddress(wallet.publicKey)}
              onClick={() => setWalletOpen(true)}
            />
          ) : wallet.available ? (
            <ListRow
              icon={<WalletIcon size={20} />}
              label={wallet.connecting ? 'Connecting…' : 'Connect wallet'}
              onClick={() => wallet.connect()}
            />
          ) : (
            <ListRow
              icon={<WalletIcon size={20} />}
              label="Get a wallet"
              value="Phantom"
              onClick={() => window.open('https://phantom.com/download', '_blank', 'noopener')}
            />
          )}
```

Replace ONLY the final else-branch with:

```jsx
          ) : isNativeApp() ? (
            /* Native WebView: no wallet can inject here (Phantom's injection
               only exists in real browsers), so "Get a wallet" reads as a lie
               to people who own one. State the truth; connect works on the
               website today, native needs a deeplink flow (queued). */
            <ListRow icon={<WalletIcon size={20} />} label="Wallet connect" value="Coming to iPhone" />
          ) : (
            <ListRow
              icon={<WalletIcon size={20} />}
              label="Get a wallet"
              value="Phantom"
              onClick={() => window.open('https://phantom.com/download', '_blank', 'noopener')}
            />
          )}
```

(Verify `ListRow` tolerates a missing `onClick` — the deleted Notifications row used exactly that shape; check `src/components/shared.jsx` and note the check in your report.)

- [ ] **Step 3: ProfileSheet — waitlist card copy**

In the joined-state block, change ONLY the non-pendingSync string:
`"We'll email you the moment trading opens."` → `"One tap, without leaving BlockWatch — we'll email you when in-app trading opens."`

In the join row: `Reserve your spot before launch` → `Be first when in-app trading opens`

- [ ] **Step 4: Trade.jsx line 123**

`` `${entry.email} — we'll email you the moment trading opens.` `` → `` `${entry.email} — we'll email you when in-app trading opens.` ``

- [ ] **Step 5: AboutSheet.jsx line 34**

`Trading isn't live yet` → `In-app trading isn't live yet` (rest of the sentence untouched).

- [ ] **Step 6: Verify + commit**

`npx vitest run` 64/64; `npm run lint` 18 baseline; `npm run build` exit 0.

```bash
git add src/overlays/ProfileSheet.jsx src/screens/Trade.jsx src/overlays/AboutSheet.jsx
git commit -m "Tell the truth about wallets on iPhone and what the waitlist is for"
```

---

### Task 2: review crumbs

**Files:**
- Modify: `src/lib/authErrors.js:1` (delete line), `src/lib/authErrors.test.js:1` (delete line)
- Modify: `src/overlays/SignInSheet.jsx` (resend success note)
- Modify: `src/services/monitoring.js` (exception scrub)

- [ ] **Step 1: delete the two first-line filename comments** (`// src/lib/authErrors.js` and `// src/lib/authErrors.test.js`).

- [ ] **Step 2: SignInSheet resend success** — in the resend button's onClick, directly after `setResent(true)`, add:

```js
                      setNote({ kind: 'sent', text: `A fresh link is on its way to ${email.trim()}.` })
```

(The button label logic keys off `resent` and is unchanged; note the button renders only while `note.action === 'resend'` — confirm the new note keeps `action` undefined so the button disappears after success, which is correct: the resend is done. State that behavior explicitly in your report.)

- [ ] **Step 3: monitoring.js beforeSend** — after the breadcrumbs loop, add:

```js
          for (const ex of event.exception?.values ?? []) {
            if (typeof ex.value === 'string') ex.value = scrub(ex.value)
          }
```

- [ ] **Step 4: Verify + commit**

`npx vitest run` 64/64; `npm run lint` 18 baseline; `npm run build` exit 0.

```bash
git add src/lib/authErrors.js src/lib/authErrors.test.js src/overlays/SignInSheet.jsx src/services/monitoring.js
git commit -m "Close the deferred review crumbs"
```

---

### Task 3: CSP enforce (controller-run, user-gated)

- [ ] **Step 1:** USER checks Vercel → blockwatch → Logs (functions) for any "CSP violation" entries since 2026-07-24. Proceed only if clean (expected).
- [ ] **Step 2:** In vercel.json change the header key `Content-Security-Policy-Report-Only` → `Content-Security-Policy`. Value untouched. Commit.
- [ ] **Step 3:** Deploy gate (exact copy strings shown to user) → merge → push.
- [ ] **Step 4:** Verify: curl header name; browse prod home + asset detail in the pane — zero CSP console errors, Sentry chunk loads, prices tick.
- [ ] **Step 5:** Rollback plan if anything breaks: revert the one word, push.

## Self-review
Spec A1 ✓(T1) A2 ✓(T2) B ✓(T3). Strings match spec verbatim. No placeholders.
