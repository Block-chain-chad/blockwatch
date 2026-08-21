// FRED CSV parsing for the Treasury yield curve.
//
// fredgraph.csv is keyless — no registration, no secret to rotate — and takes
// several series in one request:
//   ?id=DGS2,DGS10,DGS30  ->  observation_date,DGS2,DGS10,DGS30
//
// Its date-window params (cosd/coed) are silently IGNORED on this endpoint,
// so a request returns the whole series back to 1962: ~350KB for three
// maturities. That is why parsing and trimming happen server-side and the
// client never touches FRED directly.
//
// Missing observations are an EMPTY field on modern rows and a lone "." on
// older ones. Both must be skipped rather than parsed as zero — a 0.00%
// thirty-year yield would be a striking thing to render.

/** Latest and prior observation per series, each resolved independently. */
export function parseFredCsv(text, ids) {
  if (typeof text !== 'string' || !text) return { asOf: null, series: {} }
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { asOf: null, series: {} }

  const header = lines[0].split(',').map((h) => h.trim())
  const col = {}
  for (const id of ids) {
    const i = header.indexOf(id)
    if (i > 0) col[id] = i
  }

  const series = {}
  let asOf = null

  for (const id of Object.keys(col)) {
    const idx = col[id]
    const found = []
    // Series can have gaps on different days (a holiday closes one tenor and
    // not another), so each is walked back on its own rather than assuming a
    // shared last row.
    for (let r = lines.length - 1; r >= 1 && found.length < 2; r--) {
      const cells = lines[r].split(',')
      const raw = (cells[idx] ?? '').trim()
      if (!raw || raw === '.') continue
      const value = Number(raw)
      if (!Number.isFinite(value)) continue
      found.push({ at: (cells[0] ?? '').trim(), value })
    }
    if (found.length === 0) continue
    const [latest, prior] = found
    series[id] = {
      value: latest.value,
      at: latest.at,
      change: prior ? Number((latest.value - prior.value).toFixed(2)) : null,
    }
    if (!asOf || latest.at > asOf) asOf = latest.at
  }

  return { asOf, series }
}
