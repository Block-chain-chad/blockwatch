// Vercel serverless function: US Treasury yields, via FRED.
//
// Why a proxy at all, when fredgraph.csv is keyless and public: it ignores its
// own date-window params, so one request for three maturities returns every
// observation since 1962 — around 350KB. Trimming that to the two most recent
// readings per series here turns a 350KB download on every view into a ~200
// byte JSON body, cached once at the edge for everyone.
//
// Cached far harder than the price proxies because the underlying data moves
// far slower: FRED posts these once per business day, so an hour-old answer is
// still today's answer.
//
// CORS: the native app calls this from capacitor://localhost, so allowed
// origins are echoed back (see api/_cors.js).

import { applyCors, handlePreflight, setCacheControl } from './_cors.js'
import { rejectUnknownParams } from './_params.js'
import { parseFredCsv } from './_fred.js'

const ALLOWED_PARAMS = new Set(['c'])

// Short, belly, long — the shape of the curve without the clutter of every
// tenor. Adding one is a one-line change here and a label in the component.
export const SERIES = ['DGS2', 'DGS10', 'DGS30']

const CACHE = 's-maxage=3600, stale-while-revalidate=86400'

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return
  const originScoped = applyCors(req, res)
  if (rejectUnknownParams(req, res, ALLOWED_PARAMS)) return

  try {
    const upstream = await fetch(
      `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${SERIES.join(',')}`
    )
    if (!upstream.ok) return res.status(upstream.status).send('upstream error')
    const parsed = parseFredCsv(await upstream.text(), SERIES)
    // No readings means something changed upstream — a 200 with an empty body
    // would render as a silently blank section.
    if (!parsed.asOf) return res.status(502).send('no observations')
    setCacheControl(res, CACHE, originScoped)
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    return res.status(200).json(parsed)
  } catch {
    return res.status(502).send('upstream unreachable')
  }
}
