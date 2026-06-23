# Phase 3 — The Market Court Engine

*"The market sets the court."* — the first law, now a working engine.

This phase turns sportsbook lines into the court's physics, and isolates the one
piece we don't control yet (the live odds API) behind a single swappable seam.

## What's in it

```
lib/odds-ingestion.ts      contracts + the OddsFeed adapter boundary + consensus()
lib/market-court-engine.ts the engine: snapshot -> court physics, market par, movement
adapters/stub-odds-feed.ts deterministic placeholder feed (no external deps)
```

Nothing here reinvents math — every number routes through the Phase 1 formula
registry (`impliedTeamTotals`, `expectedPossessions`, `marketPpp`,
`marketExpectedNetRating`, `devigWinProbability`, `propSuppression`). The engine
only orchestrates and classifies, then stamps `MARKET_ENGINE_VERSION` so any
game can be recomputed deterministically.

## The flow

```
RawOddsQuote[]  ──consensus()──▶  MarketSnapshot  ──computeMarketCourt()──▶  MarketCourtRead
   (per book)                     (normalized)                               (both teams' physics)
```

`MarketCourtRead` carries, per team: implied total, expected possessions, market
PPP, market-expected net rating, vig-removed win probability, a `courtType`
label, and a `confidence` derived from how many books agreed and how tightly.
`computeMarketPar()` turns a player's normal baseline + tonight's line into
**market par** and the **suppression** the market applied. `lineMovement()`
reads open→close as signal (a *steamed* line moved hard).

## Verified against the canon (`npx tsx lib/market-court-engine.ts`)

```
PASS  implied totals -> 103 / 99
PASS  expected possessions -> ~88.6
PASS  market PPP -> 1.163 / 1.117
PASS  court type -> low-total defensive grind
PASS  win prob sums to 1, home favored
PASS  market par 24.5 from normal 27.5 -> 10.9% suppression
PASS  line moved -3/200 open -> -4/202 close (steamed)
```

Feed → engine demo (`npx tsx adapters/stub-odds-feed.ts`) reads the canonical
game as 103·99, 88.6 poss, ppp 1.163·1.117, win prob .616·.384, line steamed
-1 spread / +2 total, star guard suppressed 10.9% to a 24.5 market par.

## The adapter boundary (why a live feed is a drop-in)

Everything downstream consumes `MarketSnapshot` / `MarketSeries` — never a
provider's raw payload. To go live, implement `OddsFeed`:

```ts
class PinnacleFeed implements OddsFeed {
  source = "pinnacle";
  listGameIds() { /* ... */ }
  getSeries(id) { /* fetch quotes per book, snapshotFromQuotes(...) */ }
  getLatest(id) { /* most recent normalized snapshot */ }
}
```

Hand that to the engine instead of `StubOddsFeed`. No other file changes. The
`consensus()` normalizer already collapses multiple books into one reading and
scores their agreement, so multi-book aggregators and single sharp books both
fit.

## Open decision (not blocking)

Which feed to target first for the real adapter:
- **Pinnacle** — sharpest line, the truest "market par," but one book (lower
  `bookCount`, so `bookAgreement` defaults high but breadth is thin).
- **A multi-book aggregator** (e.g. The Odds API) — real consensus + agreement
  signal across books, at the cost of some sharpness and added latency.

My lean: anchor on Pinnacle for par accuracy, layer an aggregator later for the
agreement/steam signal. Easy to run both — `consensus()` already supports it.

## Not solved yet (by design)

- Live API wiring (stubbed behind `OddsFeed`).
- Player-level lineup + archetype translation of par (later phase; this is the
  *market* layer only — it sets market par, not lineup or archetype par).
- The game-night Handicap Manifest placeholder graphic.
