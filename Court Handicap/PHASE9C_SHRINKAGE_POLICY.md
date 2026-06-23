# Phase 9C — Evidence-Weighted Shrinkage Policy

Phase 9B could *recommend* the evidence-specific weight but always *shipped* the
final-confidence one. Phase 9C closes the loop: a policy now **chooses** the weight
per claim context, and the product acts on it. The governing test:

> **when the product knows the evidence-specific weight is better, it acts on that knowledge.**

## Policy engine (`ch-shrink-policy@1.0.0`)

`decideShrinkageWeight` consumes the claim type, the observed beat, the effective
prior, and both candidate confidences, and returns an explainable decision —
`selectedWeight`, `selectedWeightSource`, `selectedShrunkValue`, `comparisonValue`,
`divergence`, `recommendation`, `reason`, `policyVersion`.

The v1 rule, named and versioned (not overfit):

```
useEvidenceWeight = |v1 − v2| ≥ DIVERGENCE_THRESHOLD (0.5)
                    OR proofConfidence < finalConfidence − PROOF_GAP (0.10)
```

`beat_vs_court` is the only shrunk claim today, so the policy specializes there;
`market_claim` / `lineup_claim` are reserved and default to final confidence with a
"not yet specialized" note, so the shape is real without sprawl. The policy only ever
selects which **shrunk candidate** to ship — it never touches the observed headline.

## What the policy actually does (end-to-end, verified)

| state | observed | final | proof | selected | shipped beat |
|---|---|---|---|---|---|
| **canonical full sample** | +8.6 | 0.60 | 0.62 | **final** (agree, div 0.2) | **+5.2** |
| moderately-thin proof (24 poss) | (its own) | ~0.44 | ~0.32 | **proof** (div large) | pulled back to v2 |
| extremely-thin (6 poss) | +98.6 mirage | 0.22 | 0.10 | **proof** | mirage crushed +21.8 → **+9.5** |

The canonical grade is unchanged — full sample, candidates agree, final kept at
**+5.2**. A thin possession sample extrapolates to a per-100 mirage; the policy
refuses it and ships the evidence-weighted value instead. That is the loop closed.

**An honest note on coupling:** the consolidated final confidence already includes
the proof layer through a geometric mean, so final and proof move together. The
divergence the policy acts on appears when the possession sample is thin *while the
rest of the chain stays up* — exactly the small-sample case. When inputs are so
degenerate that final itself collapses to ~0, both candidates land on the prior and
there is nothing to act on; that is not a real graded state.

## UI

The evidence-adjusted line now carries a compact `[final]` / `[proof]` tag (gold when
the policy switched to evidence), keeps the prior source, and shows the other
candidate. Small, labeled, explained — the sacred separation holds:
**observed · evidence-adjusted · prior · confidence · weight source.**

## Context-prior cleanup

The brittle `"grind"/"low-total"` substring match is gone. `computePlayerPrior` now
takes explicit `contextTags`, and the source derives `low_scoring_grind` from the
**numeric** implied total (≤ 210), not a prose label.

## Stability

Observed beats byte-stable (guard **+8.6**, big **+4.0**); confidence **0.60**;
implied **103/99**. Smart priors still active (creator / low-usage-finisher /
global-null); prior 0 still the fallback. Audit universe, render-state catalog, and
UI honesty audit all green.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean. **404** self-checks across 16 suites
(new policy engine 12; shrinkage +7; source +5; catalog +8).

## Out of scope (held)

Prior calibration, historical/player baselines, Y-lineup graph, Pressure Lab,
Role Court v2, second-chance value. A policy phase, not a sprawl phase.
