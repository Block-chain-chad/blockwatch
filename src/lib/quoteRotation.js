// Which share quotes a cycle asks for. Pure; src/state/PricesContext.jsx is
// the only caller, and these two rules are the whole of its quote scheduling.
//
// THE PROBLEM THIS SOLVES, with the numbers.
//
// The desktop Board subscribes up to CANDIDATE_CAP (150) underlyings, and
// PricesContext quotes at most STOCK_QUOTE_CAP (50) of them per 60-second
// cycle, rotating. So a symbol's turn comes round every
//
//     (150 / 50) x 60s = 180 seconds.
//
// api/finnhub.js caches a quote for s-maxage=300. A symbol is therefore asked
// at 0, 180, 360, 540...; the miss at 0 fills the cache until 300, so 180 is a
// hit, 360 is a miss, 540 is a hit. Misses and hits alternate, one miss per
// symbol per 360 seconds, which is 150/360 = 25 upstream calls a minute from
// one wide board.
//
// Now the failure. A refused request (429) used to be indistinguishable from
// "the provider has no price for this symbol": the ticker simply went missing
// from the batch. On a warm board that is harmless, because the previous quote
// is merged through. On a COLD board there is no previous quote, so the cell
// renders blank — and the rotor has already moved past that symbol, so nothing
// asks for it again for a full rotation. Three minutes of blank share prices,
// caused by a bucket that refilled a second later.
//
// The fix is the second function below: refused tickers go to the FRONT of the
// next cycle. The rotor still advances every cycle, so nothing starves.
//
// What this deliberately does NOT do is widen the cycle. Raising
// STOCK_QUOTE_CAP shortens the return interval (at 75 it is 120 seconds, at
// 100 it is 90) and, because the miss rate is set by the 300-second cache and
// not by the cap, it costs no extra upstream calls in steady state: still one
// miss per symbol per 360 seconds, still 25 a minute. But a COLD load has
// nothing cached, so every request in the first cycle reaches the function —
// and that first burst is exactly where the 429s come from. Doubling the cap
// doubles the cold burst against the very budget that is running out. It would
// make this bug worse in the moment it bites.

/**
 * The rotation's slice for this cycle, and where the rotor lands after it.
 *
 * Lists at or under the cap are quoted whole and the rotor is left alone.
 * Longer lists wrap, so the slice is always exactly `cap` long.
 */
export function quoteCycle(all, rotor, cap) {
  if (all.length <= cap) return { list: all, nextRotor: rotor }
  const off = rotor % all.length
  let list = all.slice(off, off + cap)
  if (list.length < cap) list = list.concat(all.slice(0, cap - list.length))
  return { list, nextRotor: (off + cap) % all.length }
}

/**
 * This cycle's list with refused tickers put first, deduped, capped.
 *
 * Refused first because they are the ones showing a blank cell right now. The
 * cap is kept because it is the whole point of the rotation: a retry queue
 * that could push a cycle past `cap` would answer a rate limit by asking for
 * more, which is how a transient refusal becomes a persistent one.
 *
 * The honest cost: if a whole cycle is refused, the retries fill the next
 * cycle entirely and the rotation makes no progress that minute. That is the
 * right trade while a refusal is transient, which is what a token bucket
 * refilling at 4/second makes it. It is the wrong trade against a permanent
 * refusal, where the board would hold on its first `cap` symbols — but a board
 * being refused every request every minute has no good state to be in, and the
 * rotor advancing over blank cells is not one.
 */
export function withRetries(list, retries, cap) {
  return [...new Set([...retries, ...list])].slice(0, cap)
}
