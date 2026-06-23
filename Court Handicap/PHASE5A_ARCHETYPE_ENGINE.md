# Phase 5A — Archetype Court Engine

The third law is real: **the archetype translates the court.** `fit`, `difficulty`,
and `slope` are now computed by an engine and explained by named factors. The last
dotted chips are earned.

## The product story now reads end to end

```
market sets it (24.5)  →  lineup shapes it (23.1)  →  archetype translates it (fit 28 / difficulty 75 / slope High)  →  possessions prove it (43.3/100)  →  Gingeball rules (BEAT THE COURT +8.6)
```

## What fit / difficulty / slope mean (engine math)

- **Difficulty (75)** = weighted *hostility* (0–100): cramped spacing, opponent POA
  pressure, rim protection, market suppression, lineup suppression, pace scarcity.
- **Fit (28)** = weighted *outlet for his strengths* (0–100): available space, weak
  perimeter D, open rim, pace, roll synergy, creation freedom — a **distinct**
  factor set, not `100 − difficulty`.
- **Slope (High, 0.16)** = `1 − lineupPar/normalPar`, classified Low/Med/High.

Both fit and difficulty ship their full factor breakdown in
`conditions.difficultyFactors` / `fitFactors` — the chips are explained.

## Engine-backed vs honest gaps

- **Engine-backed:** fit, difficulty, slope, both factor breakdowns, archetype
  confidence. The CourtGraph **warp ring now scales to engine difficulty** (real
  magnitude) for the studied player.
- **Two inputs are engine-backed upstream:** expected possessions, and market +
  lineup suppression %.
- **Still fixture-derived:** the scouting signals (spacing, opp POA, opp rim,
  creation burden, synergy) — named `inputProvenance: "fixture"` with `missing[]`
  (real matchup tracking, usage-vs-defense splits, shot-quality model).
- **Only the scoring guard is modeled.** Every other archetype returns
  `modeled: false` and names the gap (Phase 5B).

## Confidence

`compositeConfidence`, with data integrity capped at 0.85 (lower than the lineup
layer's 0.9) because archetype modeling is the youngest layer and the inputs are
fixture. Canonical → **0.63**, shown in the Conditions strip and provenance panel.

## Supersedes the fixture guesses (honestly)

The fixture decorated this player as difficulty 86 / fit 38. The engine's honest
read is **75 / 28** — same story (poor fit, hostile court, steep slope), now
*earned and explained*. Weights live in `SCORING_GUARD_TRANSLATION_V1` (centralized,
versioned) — the only place to tune the basketball judgment.

## Untouched

The approved Phase 4C lineup engine is not modified — the archetype engine reads
its **own** input vector, so there is no brittle cross-engine coupling. Market and
lineup math are byte-stable.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 14 +
**15** + 16 + 28 = **88** green. The archetype suite proves fit 28 / difficulty 75
/ slope High, factor sums, monotonicity (more POA → harder + worse fit; more
synergy → better fit; benign court → easy + good fit), and the non-modeled gap.
The 28-check source suite confirms the market + lineup layers stayed stable.
