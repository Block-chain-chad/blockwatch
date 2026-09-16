// An audit trail for every swap attempt.
//
// Until today the only trace a swap left was one fire-and-forget analytics
// event, sent AFTER the wallet came back. A user asking "did my money go?"
// and a support engineer asking "what did we hand the wallet?" both had
// nothing to read. This module writes one record per attempt, before the
// wallet is asked and again when it answers.
//
// WHERE IT LIVES: the device, in localStorage. Supabase is paused, and a
// server-side table is a decision for Terra (it also changes what personal
// data we hold — wallet addresses and trade sizes). writeSink() below is the
// single seam where a server sink gets added later; nothing else has to
// change. Until then the trail is local: enough to answer a support question
// from the user's own device, not enough for fleet-wide reconciliation.
//
// RULES IT KEEPS:
//   - Append-only. Records are never rewritten; an outcome is a NEW record
//     carrying the same idempotency key as its attempt.
//   - No floats anywhere. Amounts stay as the integer unit strings that were
//     actually submitted, and Jupiter's price impact stays the decimal string
//     it arrived as.
//   - Timestamps in Coordinated Universal Time.
//   - Never throws and never blocks. An audit failure must not cost a user
//     their trade.

const KEY = 'bw.swap.audit.v1'
// Enough to cover any plausible support conversation, small enough that the
// log can never crowd a device's storage quota.
const MAX_RECORDS = 200

/**
 * The idempotency key for a swap attempt: same wallet, same direction, same
 * token, same amount. Two records sharing one are the same intended trade —
 * which is what makes an accidental double submit visible after the fact.
 */
export function swapKey({ wallet, side, mint, amountRaw }) {
  return `${wallet}:${side}:${mint}:${amountRaw}`
}

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeSink(records) {
  try {
    localStorage.setItem(KEY, JSON.stringify(records))
  } catch {
    // Private mode, quota, no storage at all. The trade matters more.
  }
}

/**
 * Append one record. `event` is what happened:
 *   'submitted' — handed to the wallet; the outcome is not known yet.
 *   'sent'      — the wallet returned a signature.
 *   'failed'    — threw before the wallet saw it; nothing was sent.
 *   'rejected'  — the user declined in the wallet; nothing was sent.
 *   'unknown'   — may be on chain; never claim otherwise.
 * Returns the record it wrote, so callers can log or test it.
 */
export function recordSwap(event, detail = {}) {
  const record = { event, at: new Date().toISOString(), ...detail }
  const records = read()
  records.push(record)
  writeSink(records.slice(-MAX_RECORDS))
  return record
}

/** The trail, oldest first. For support, tests, and a future export. */
export function readSwapAudit() {
  return read()
}
