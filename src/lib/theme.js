// Appearance: dark (default, per the design system), light, or follow-system.
// Tailwind v4 compiles colors to CSS variables, so the light theme is one
// override block in index.css keyed off html.light — no per-component work.

const KEY = 'bw.theme.v1'
export const THEME_OPTIONS = ['dark', 'light', 'system']

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY)
    return THEME_OPTIONS.includes(v) ? v : 'dark'
  } catch {
    return 'dark'
  }
}

function systemPrefersLight() {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false
}

export function applyTheme(pref = getThemePref()) {
  const light = pref === 'light' || (pref === 'system' && systemPrefersLight())
  document.documentElement.classList.toggle('light', light)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = light ? '#ffffff' : '#09090b'
}

export function setThemePref(pref) {
  try {
    localStorage.setItem(KEY, pref)
  } catch {
    // session-only preference is fine
  }
  applyTheme(pref)
}

export function initTheme() {
  applyTheme()
  window
    .matchMedia?.('(prefers-color-scheme: light)')
    .addEventListener?.('change', () => {
      if (getThemePref() === 'system') applyTheme('system')
    })
}
