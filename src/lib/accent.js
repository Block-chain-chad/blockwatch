// Accent color — the app's highlight color is a user SETTING, not a decree.
// Each accent carries dark and light pairs [accent, accent-dim]; light mode
// needs darker shades to hold contrast on white. Values are applied as inline
// custom properties on <html>, which outrank the stylesheet defaults (both
// the @theme block and the html.light override) — so theme.js re-applies the
// accent every time the theme flips.
//
// Green and rose are deliberately absent: in this app green/red mean price
// movement, and a brand accent must never impersonate a signal.

const KEY = 'bw.accent.v1'

export const ACCENTS = [
  { id: 'teal', label: 'Teal', dark: ['#2dd4bf', '#14b8a6'], light: ['#0d9488', '#0f766e'] },
  { id: 'violet', label: 'Violet', dark: ['#a78bfa', '#8b5cf6'], light: ['#7c3aed', '#6d28d9'] },
  { id: 'amber', label: 'Amber', dark: ['#fbbf24', '#f59e0b'], light: ['#b45309', '#92400e'] },
  { id: 'sky', label: 'Sky', dark: ['#38bdf8', '#0ea5e9'], light: ['#0284c7', '#0369a1'] },
]

export function getAccentPref() {
  try {
    const v = localStorage.getItem(KEY)
    return ACCENTS.some((a) => a.id === v) ? v : 'teal'
  } catch {
    return 'teal'
  }
}

export function applyAccent(id = getAccentPref()) {
  const accent = ACCENTS.find((a) => a.id === id) ?? ACCENTS[0]
  const light = document.documentElement.classList.contains('light')
  const [main, dim] = light ? accent.light : accent.dark
  const root = document.documentElement.style
  root.setProperty('--color-accent', main)
  root.setProperty('--color-accent-dim', dim)
}

export function setAccentPref(id) {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // session-only preference is fine
  }
  applyAccent(id)
}
