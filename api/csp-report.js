// Vercel serverless function: CSP violation report sink. The report-only
// policy in vercel.json points here; violations land in the function logs so
// a wrong policy is discovered BEFORE enforcement ever breaks the app.
// No personal data is logged — just the directive and the blocked host.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    const r = body?.['csp-report'] ?? body?.body ?? body ?? {}
    const directive = r['violated-directive'] ?? r.effectiveDirective ?? 'unknown'
    const blocked = String(r['blocked-uri'] ?? r.blockedURL ?? 'unknown').slice(0, 120)
    console.warn(`CSP violation: ${directive} blocked ${blocked}`)
  } catch {
    console.warn('CSP violation: unparseable report')
  }
  return res.status(204).end()
}
