# Phase 4C — Lineup Court Engine

The product's second law is now real: **the lineup shapes the court.** `lineupPar`
is computed by an engine, not stamped from the fixture.

## The transformation

```
lineupPar = marketPar × (1 − Σ factor)
```

Each factor is a named, signed contribution = (versioned model coefficient) ×
(a 0..1 context signal). For the canonical trap guard:

| factor | signal source (fixture) | weight |
|---|---|---|
| Spacing hazard | x1–x4 non-shooter synergy | +2.2% |
| POA pressure | opponent y1 elite stopper | +1.8% |
| Rim protection | opponent y4 rim protector | +1.5% |
| Creation burden | x1 primary on-ball, 36 min | +0.8% |
| Roll-gravity synergy (relief) | x1–x5 creator-roll | −0.6% |
| **net** | | **5.7%** |

→ 24.5 × (1 − 0.057) = **23.1**. The number is now *explained*, in `conditions.lineupFactors`.

## What became engine-backed

`lineupPar`, `lineupAdjustment` (−1.4), `lineupSuppressionPct` (5.7%), the factor
breakdown, `lineupConfidence` (~0.73 via `compositeConfidence`), and therefore
**beat-vs-lineup (+8.6)**. The dotted "pending" treatment came off `lineupPar`.

## What stays honest (still not fully real)

- **Input signals are fixture-derived** — no live on/off or tracking data yet.
  Carried as `provenance.lineup.inputProvenance: "fixture"` and `missing[]`:
  real on/off splits, tracking spacing, injury/availability modifiers.
- **Only scoring archetypes are modeled.** Role/defense players get a
  no-adjustment read with "non-scoring archetype model (pending)" named.
- **fit / difficulty / slope** remain Phase 5 pendingEngine (still dotted).

## Confidence

`compositeConfidence(lineupContinuity × role × dataIntegrity × …)`. Data integrity
is capped at 0.9 while inputs are fixture, so confidence can't pretend the inputs
are live. Canonical → 0.73.

## Tuning (your knobs)

`SCORER_MODEL_V1` in `lib/lineup-court-engine.ts` holds the five coefficients —
the only place to change the basketball judgment. The signals live in
`fixtureBuildInput` (`lib/manifest-source.ts`).

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + **14**
+ 12 + 24 = **65** green. The lineup suite proves 24.5 → 23.1, factor sum,
monotonicity (more spacing → harder, more synergy → softer), zero-context = no
effect, and the non-scoring gap. The 24-check source suite (unchanged market
behavior: 103·99 fixture+live, steam, freshness, fallback, what-if) proves the
market layer did not move.

## Also in this pass (Phase 4B carryovers)

- Provider plan reframed Pinnacle-first in `page.tsx` (boundary stays generic).
- What-if mode now states "movement history stays real; current line is a
  what-if" with a reset-to-real-line action.
