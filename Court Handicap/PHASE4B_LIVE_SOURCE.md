# Phase 4B — Live Odds Source Seam

The product can now take **live odds** through the same engine → view-model →
component path it uses for the fixture. One source seam, one downstream shape.

## The seam

```
                       ┌─ LiveOddsFeed (provider) ─┐
buildManifestViewAsync ┤                            ├─▶ assemble() ─▶ CourtHandicapView
   (live → fallback)    └─ StubOddsFeed (fixture) ──┘        ▲
buildManifestView (sync, fixture)  ─────────────────────────┘
rebuildWithMarket (sync what-if)  ── from view.basis ────────┘
```

Everything funnels through `assemble()`. Components never learn whether the data
was live or fixture — they receive a `CourtHandicapView`.

## Provider shape is quarantined

The only code that touches a provider's raw payload is `mapProviderToQuotes` in
`adapters/live-odds-feed.ts`. It maps the common provider shape (modeled on The
Odds API: `bookmakers[].markets[].outcomes[]` for `spreads` / `totals` / `h2h`)
into our normalized `RawOddsQuote`, which flows through the existing
`consensus()` / `snapshotFromQuotes()` path. The network call is **injected**
(`transport`), so this file holds no API key and never hits the network itself —
the secret lives at the app's server boundary (`page.tsx`).

## What's live-capable now

Spread, total, moneylines → every market-layer number: implied score, expected
possessions, market PPP, win probability, line movement / steam, market par.
Live data hits the same engine, so it produces the same canonical 103·99 from the
sample close line.

## Still fixture-backed / pendingEngine (unchanged, still honest)

Players, synergies, possession trail (fixture). `lineupPar` (Phase 4), `fit` /
`difficulty` / `slope` (Phase 5) remain pendingEngine with the dotted treatment.

## Provenance + freshness (visible)

`provenance.market` carries `source` (live / fixture / fixture (live fallback)),
`feedSource`, `phase`, `capturedTs`, `ageMinutes`, `stale`, `bookCount`,
`bookAgreement`, `hypothetical`, and a `missing[]` list. The World header renders
it: source + age + STALE / WHAT-IF badges, with missing fields and fallback notes
in the detail panel.

## Honest failure handling

- **Live call fails** → fall back to fixture, source labeled `fixture (live
  fallback)`, note carries the error (e.g. `HTTP 503`).
- **Missing moneylines** → win probability is omitted (not faked) and named in
  `missing`.
- **Stale line** (> 120 min, tunable) → `stale: true`, shown in red.
- **What-if scrub** → recomputes from the real basis, flags `hypothetical`.

## Go live (one change)

In `app/court-handicap/page.tsx`, pass a `LiveOddsConfig` with a `transport` that
fetches the provider using a server-only env key. Nothing downstream changes.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 10 +
**20** = **45** green. Source suite covers fixture parity, live normalization,
steam, freshness, missing-field honesty, labeled fallback, stale detection, and
what-if isolation.
