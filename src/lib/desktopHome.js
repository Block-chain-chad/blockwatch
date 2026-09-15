// Which desktop home to mount while both exist (spec §4, Plan A): the Meter
// (Board + Readout) or the Phase 1 chart-first shell. A tester switches with
// `?home=chart` or `?home=meter` in the URL, which is then remembered; with
// neither, the Meter. Pure; App.jsx reads it once on load.

export const DESKTOP_HOME_KEY = 'bw.desktop.home.v1'
export const HOMES = Object.freeze(['meter', 'chart'])

export function resolveDesktopHome({ search = '', saved = null } = {}) {
  const fromQuery = new URLSearchParams(search).get('home')
  if (HOMES.includes(fromQuery)) return fromQuery
  if (HOMES.includes(saved)) return saved
  return 'meter'
}
