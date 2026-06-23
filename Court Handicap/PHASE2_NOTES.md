# Phase 2 — Notes & Repo Integration

The prototype ships in two forms:

1. **`court-handicap-prototype.jsx`** — a single self-contained, runnable file that
   renders the whole prototype in the chat so you can look at it, click players, and
   watch the same game become a different court. Formulas and fixture are inlined
   here *only* so it runs with no imports.
2. **`court-handicap/fixtures/fake-game.ts`** — the repo-ready, typed fixture that
   reuses the Phase 1 contracts (`lib/types.ts`). This is the file the real Next.js
   route imports.

## Artifact component → real Next.js file map

In the repo, split the single artifact into these files. Each component reads the
fixture + the Phase 1 registries; **no formula logic stays in a component.**

```
app/court-handicap/prototype/page.tsx        // loads fixtures/fake-game.ts, composes the layout
components/court-handicap/
  CourtGraph.tsx          // the semantic court SVG; reads ZONE_ANCHORS, places by zone
  MarketHub.tsx           // center-circle market readout
  SpreadRail.tsx          // market vs lineup-adjusted spread
  TotalRail.tsx           // market vs lineup-adjusted total
  CourtTiltEngine.ts      // pure: spread -> tilt degrees (move to lib/, it's math)
  StartingLineupNodes.tsx // five nodes per team
  SynergyEdge.tsx         // offense / defense / hazard edges
  ArchetypeLens.tsx       // re-skins zones for the selected player
  PlayerCourtConditionsCard.tsx
  CourtScorecard.tsx
  OutcomeStamp.tsx
  ConfidenceRing.tsx
  GlossaryOverlay.tsx
lib/
  court-tilt.ts           // CH-CHT-001 tilt formula -> add to formula-registry.ts
```

Two pieces that are *math*, not UI, belong in `lib/formula-registry.ts` when you
wire the repo: the per-100 conversions (already there: CH-PLR-001/002/003) and the
court-tilt function (new — register it as **CH-CHT-001**). The artifact already
treats them as pure functions, so the move is a copy, not a rewrite.

## Value reconciliation (the brief asked us to document differences)

All numbers are computed, not typed in. Verified against the brief's required set:

| Quantity | Formula (id) | Result |
|---|---|---|
| Implied totals (X/Y) | CH-MKT-001 on −4 / 202 | **103 / 99** |
| Expected possessions | CH-MKT-002, league PPP 1.14 | **88.6** |
| Team X / Y market PPP | CH-MKT-003 | **1.163 / 1.117** |
| Scoring guard suppression | CH-MKT-005 on 24.5 vs 27.5 | **10.9%** |
| Market par /100 | CH-PLR-001 on 24.5 / 66.5 | **36.8** |
| Actual /100 | CH-PLR-002 on 29 / 67 | **43.3** |
| Market court beat /100 | CH-PLR-003 | **+6.5** |
| Lineup court beat /100 | CH-PLR-003 on lineup par 23.1 | **+8.6** |

**On the +6.5 vs +8.6 question.** The brief lists both "Court Beat per 100: +6.5"
and "Confidence-adjusted: +8.6". These are two different pars, not a shrinkage step:
+6.5 is actual-per-100 minus **market** par-per-100 (36.8); +8.6 is actual-per-100
minus **lineup-adjusted** par-per-100 (23.1 / 66.5 × 100 = 34.7). The scorecard
headline stamp uses the lineup-adjusted beat (**+8.6**) because the Starting Lineup
Court is the tighter, more-informed par. Both numbers are shown on the card. The
74% confidence renders as a ring; a true shrinkage pass (CH-CONF-003) toward a prior
arrives in Phase 6 when there's a prior to shrink toward.

**Court tilt (CH-CHT-001).** Deterministic: `tilt° = clamp(lineupAdjustedSpread ×
0.6, ±6)`. Market −4 → −2.4°, lineup −4.4 → −2.64° (subtle, toward Team X), and the
brief's −7.3 stress case → −4.38° (clearly more obvious). The rail shows the delta
the lineup added. When a player lens is active the court squares up so zone reads
stay legible — the tilt is a market/lineup state, the lens is a per-player state.

## Definition of done — status

All 20 DoD items are met: the route exists (`/court-handicap/prototype`), the fake
game loads from a typed fixture, the semantic CourtGraph renders with MarketHub,
both starting fives, three synergy edge types, both rails, a deterministic tilt
engine + meter, click-to-select ArchetypeLens (scoring guard / rim protector /
3-and-D connector all wired), the conditions card and golf-style scorecard with the
Beat-the-Court stamp and confidence ring, the glossary overlay, and a reduced-motion
toggle (also auto-detected from `prefers-reduced-motion`). It typechecks/bundles
clean and is structured so Phase 3 swaps the fixture for real market data without
touching the components.

## Deliberately NOT done in Phase 2 (per the brief)

No live data ingestion, no historical backfill, no possession engine, no heavy
particle animation, and no changes to the Phase 1 contracts.
