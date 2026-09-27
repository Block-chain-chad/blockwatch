/*
 * The sign-in buttons at the top of the sign-in sheet: Apple, Google and
 * passkey. All three share one height and one white fill, because Apple's
 * rules only allow a white button on a dark background, and the other two
 * match it so the stack reads as one set.
 *
 *   Apple (Human Interface Guidelines): the Apple logo and "Continue with
 *   Apple", black on white. The white-with-outline style is allowed on both
 *   light and dark backgrounds, so one style serves both themes. Same height
 *   as the other sign-in buttons, and never smaller than Google's.
 *
 *   Google (Sign in with Google branding guidelines): the standard light
 *   button. White fill, #747775 outline, the full-colour "G", and
 *   "Continue with Google" in #1F1F1F.
 *
 *   Passkey: not a brand, so it borrows Google's neutral light colours and
 *   the system font.
 *
 * The logos are the companies' published marks, unaltered.
 */

import { PasskeyIcon } from './Icons'

function AppleLogo() {
  return (
    <svg width="16" height="19" viewBox="0 0 814 1000" aria-hidden="true">
      <path
        fill="currentColor"
        d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"
      />
    </svg>
  )
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

const BASE =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium transition-opacity disabled:opacity-50 active:opacity-80'

export function AppleSignInButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${BASE} border border-black bg-white text-black`}
      style={{ fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
    >
      <AppleLogo />
      Continue with Apple
    </button>
  )
}

const NEUTRAL = { background: '#FFFFFF', color: '#1F1F1F', border: '1px solid #747775' }

export function GoogleSignInButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BASE}
      style={{ ...NEUTRAL, fontFamily: 'Roboto, Arial, sans-serif' }}
    >
      <GoogleLogo />
      Continue with Google
    </button>
  )
}

export function PasskeySignInButton({ onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={BASE}
      style={{ ...NEUTRAL, fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif' }}
    >
      <PasskeyIcon size={20} />
      Continue with Face ID or passkey
    </button>
  )
}
