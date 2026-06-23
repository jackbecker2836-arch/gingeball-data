# Phase 6B — Verdict & Confidence Consolidation

The four laws are engine-backed. Now the ruling tells the truth about how sure it
is. `lib/verdict-confidence-engine.ts` consolidates the four layer confidences
into ONE honest number — it judges the laws, it does not recompute them.

## The model

1. **Weighted geometric mean** of the four confidences — market 0.20, lineup
   0.25, archetype 0.25, proof 0.30 (proof weighted most: the ruling is about what
   happened). Geometric, so a weak layer pulls hard.
2. **Pull toward the weakest layer** (a convex blend, α=0.5) — keeps the result
   monotonic in *every* layer so the trust test holds, while dragging the number
   toward the weakest evidence.
3. **Weakest-link ceiling**: `final ≤ weakest + 0.12`.
4. **Provenance factor** `0.94 + 0.06·liveShare` — an all-synthetic chain is held
   slightly more humble and flagged PROVISIONAL.

## This chain, right now (from the build path)

| Law | Confidence |
|---|---|
| Market | 0.79 |
| Lineup | 0.73 |
| Archetype | 0.55 |
| Proof | **0.38** ← weakest |
| **Final** | **0.44 — LOW · PROVISIONAL** |

The verdict is unambiguous — **BEAT THE COURT +8.6** — but the confidence is
**LOW · PROVISIONAL**, held down by the proof layer (a deep product of sample,
market, role, continuity, and a synthetic data-integrity cap) and a fully
synthetic data diet. This is the design working: a strong directional ruling can
carry a humble confidence. We did not tune it up to look better.

## The trust test

`final confidence falls when any one law becomes weaker` — proven for all four
layers individually in the engine suite. Because the blend is monotonic in every
layer (no hard `min` that flattens), weakening market, lineup, archetype, or proof
each strictly lowers the final. An all-live chain scores higher than the same
numbers synthetic; an uneven strong chain is still capped by its weak link.

## What the UI shows

The Outcome Verdict now renders a confidence ladder — each law's bar (weakest in
crimson), the final in gold — plus a plain-language line naming the weakest layer
and the synthetic diet, and the caps that bound the number. The player-confidence
scalar no longer masquerades as the ruling confidence.

## Cleanup

The dead `possessions: number[]` array was pruned from the CourtGraph view, its
`BuildInput` feeder, and the now-unused fixture import. `proofTrail` is the single
source of truth for the possession trail.

## Scope held

No non-scoring valuation crept in (still tracked, named pending). Market, lineup,
archetype, and proof math are byte-stable.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 14 +
20 + 16 + **15** + **21** + **52** = **153** green. The verdict-confidence suite
proves the trust test, the ceiling, provenance sensitivity, and the weakest-link
identification; the integration suites prove the verdict renders the consolidated
number, the scalar no longer masquerades, and the dead array is gone.
