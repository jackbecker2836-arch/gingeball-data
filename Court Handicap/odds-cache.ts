// =============================================================================
// GINGEBALL COURT HANDICAP — ODDS CACHE / LAST-KNOWN-GOOD (Phase 4D)
//
// When the live provider fails or goes stale, the product should fall back to the
// LAST GOOD live snapshot it actually saw — not silently to the fixture, and
// never while pretending the stale data is fresh. This is a deliberately small,
// in-process store.
//
// LIMITATION (named, not hidden): this Map lives in one server process's memory.
// It is not shared across instances and does not survive a restart. A durable
// cache (Redis / Postgres) is a later concern; for now the behavior — "serve the
// last good snapshot, clearly labeled" — is what we are hardening and testing.
// =============================================================================

import type { MarketSnapshot, MarketSeries } from "@/lib/odds-ingestion";

export interface CachedMarket {
  series: MarketSeries;
  latest: MarketSnapshot;
  capturedTs: string;   // when the provider produced it (for staleness math)
  storedAt: string;     // when we cached it
  source: string;       // provider label it came from
}

const store = new Map<string, CachedMarket>();

/** Record a fresh, complete live result as the new last-known-good. */
export function putLastKnownGood(gameId: string, entry: CachedMarket): void {
  store.set(gameId, entry);
}

/** Retrieve the last-known-good for a game, or undefined if we have never seen one. */
export function getLastKnownGood(gameId: string): CachedMarket | undefined {
  return store.get(gameId);
}

/** Test/maintenance hook — clear one game or the whole store. */
export function clearLastKnownGood(gameId?: string): void {
  if (gameId) store.delete(gameId); else store.clear();
}

export function lastKnownGoodSize(): number { return store.size; }
