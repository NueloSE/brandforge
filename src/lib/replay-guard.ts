// Replay protection: refuse a payment authorization we've already fulfilled.
//
// The Permit2 nonce makes double-*charging* impossible (the facilitator is
// idempotent and the on-chain nonce is single-use), so buyer funds are never
// at risk. This guard closes the other half: stopping a replayed authorization
// from getting free repeat generations (compute abuse). Railway runs a single
// persistent instance, so an in-memory set is effective; it resets on redeploy,
// which is fine — a stale authorization is idempotent at the facilitator anyway.

const MAX = 50_000;
const seen = new Set<string>();

/** True if this nonce was already fulfilled (i.e. a replay). */
export function isReplay(nonce: string): boolean {
  return seen.has(nonce);
}

/** Mark a nonce fulfilled. Prunes oldest entries past a cap to bound memory. */
export function markFulfilled(nonce: string): void {
  if (seen.size >= MAX) {
    const drop = seen.size - MAX + 1;
    let i = 0;
    for (const k of seen) {
      seen.delete(k);
      if (++i >= drop) break;
    }
  }
  seen.add(nonce);
}
