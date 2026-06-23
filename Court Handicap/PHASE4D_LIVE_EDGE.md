# Phase 4D — Live Edge Hardening

Court Handicap can now consume live odds **without losing its truth standard.**
The engines are unchanged; the source layer became worthy of them. Every way the
line can arrive is a distinct, labeled state — and the one test that matters holds:

> **fallback never masquerades as live.**

## The source states (each changes provenance AND confidence)

| State | When | Human label | Source quality | Can read "live"? |
|---|---|---|---|---|
| `live` | real credentialed provider, fresh + complete | LIVE | 1.0 | yes (only here) |
| `stale_live` | real provider, line older than 120m | LIVE · STALE | 0.7 | flagged stale |
| `last_known_good` | provider failed; last good live snapshot served | LAST-KNOWN-GOOD | 0.6 | **no** |
| `fixture_fallback` | provider failed, no cache | FALLBACK | 0.85 | **no** |
| `mock` | deployed default (isLive=false) | SYNTHETIC | 1.0 | **no** |
| `fixture` | deliberate canonical baseline (sync) | FIXTURE | 1.0 | **no** |

Live raises trust **only when fresh and complete**. Stale, last-known-good, and
surprise fallback each lower market confidence — which flows into the verdict's
market layer through the existing consolidation.

## The trust switch: `isLive`

The "live" label can only be produced by a transport that declares `isLive=true`
— a real, credentialed provider — **and** a fetch that is fresh and complete. The
deployed default is a `MockTransport` with `isLive=false`, so the app honestly
shows SYNTHETIC until real credentials are wired. The live branch is exercised in
tests by a clearly-labeled test double, never shipped as real data.

## Server-only credentials

`serverOnlyApiKey(envVar)` throws if it detects a browser context, lives only in
the transport closure, and never appears in returned data, error messages, logs,
or provenance. `createHttpTransport` is credential-ready (The-Odds-API / Pinnacle
shaped); production only needs the env var.

## Provider shape stays quarantined

```
provider raw response → mapProviderToQuotes → LiveOddsFeed → resolveLiveMarket → assemble → CourtHandicapView
```

The only decoder of provider field names is `mapProviderToQuotes` (4B). The
resolver, engines, view-model, and UI speak the normalized contract.

## Last-known-good cache

An in-process map keyed by gameId stores the last **fresh, complete** live
snapshot. On provider failure it is served, labeled `last_known_good` — never as
live. Named limitation: it is per-process memory (not shared across instances, not
durable across restart); a Redis/Postgres cache is a later concern.

## Missing fields, handled not invented

Missing moneylines → win probability stays undefined and is named in
`provenance.missing`. Missing total → no court can form → fall back, labeled. No
field is ever fabricated.

## What-if stays separate

Unchanged from 4B: the captured movement series is the real line history; a what-if
scrub flags the line `hypothetical` and never writes back into the series.

## Stability (nothing earned was disturbed)

- Canonical sync path is `state: "fixture"`, quality 1.0 → guard **0.60** byte-stable.
- Rim protector grade unchanged.
- Phase 7/7B audit still green.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 20 +
20 + 21 + 15 + 22 + **76** + 27 = **216** green. The 4D suite exercises every
state in isolation (cache cleared between cases), including the centerpiece
`*** FALLBACK NEVER MASQUERADES AS LIVE ***` and `stale-live is flagged stale,
never presented as fresh`.

## Out of scope (held)

No betting platform, no multi-book scraping, no accounts, no Pressure Lab, no
second-chance value, no archetype-confidence tuning, no engine changes.
