# Phase 9G — Shadow Coupling Audit & Graduation Criteria

9F let the graph audition (a shadow lineup-confidence candidate). 9G decides what
would make that candidate worthy of a vote — by auditing its behavior across states,
modeling the lineup→final propagation **in audit only**, and emitting a recommendation.

> **the graph must earn influence before it receives influence.**

Nothing here writes back. Par, beats, source state, and shipped final confidence are
untouched; the propagation numbers live only in this report.

## The audit (`ch-graph-coupling-audit@1.0.0`)

`buildGraphCouplingAudit()` runs the candidate across four coverage states and, for
the two graded players, models what final confidence *would* be if the lineup layer
used the candidate (re-running the real consolidation; `missingCount` feeds only
warning text, so the modeled number is faithful):

| scenario | side | mode | lineup conf | candidate | modeled final |
|---|---|---|---|---|---|
| guard | X | partial | 0.73 | 0.70 (−0.03) | 0.60 → **0.60** (swallowed) |
| rim protector | Y | thin | 0.73 | 0.63 (−0.10) | 0.60 → **0.59** (−0.01) |
| full graph | — | full | 0.73 | 0.73 (0) | n/a (no boost) |
| no graph | — | none | 0.73 | 0.73 (0, withheld) | n/a |

## The finding that matters

**A lineup-layer caution is largely swallowed by the chain.** The guard's −0.03
moves final by **0.00**; the rim protector's −0.10 moves it by only **−0.01** —
because the consolidation is held by the weakest layer (archetype ≈ 0.63), not the
lineup layer. So if graph trust is ever to matter at the verdict, the propagation
design must reckon with weakest-link dampening; a small lineup nudge today changes
almost nothing. That is exactly the kind of thing graduation criteria must surface
*before* activation.

## Graduation criteria (explicit)

Eleven criteria, **10 pass**. The one that fails is deliberate and gating:

- ✓ only lowers (never raises) on incomplete coverage
- ✓ never changes par / observed / evidence-adjusted beat
- ✓ never contradicts source state (applied:false)
- ✓ selection-correct (guard→X, big→Y)
- ✓ reason understandable + attributes caution to the graph, not the player/par
- ✓ stable per coverage mode (partial −0.03, thin −0.10, full 0)
- ✓ thin caution does not over-penalize (final move ≤ 0.02)
- ✓ full never boosts; no-graph withholds
- ✓ propagation path defined (modeled in audit)
- ✗ **deltas are calibrated from real outcomes** — they are authored hypotheses; no
  real outcomes exist yet. This is the gating criterion.

## Recommendation: **keep_shadow**

Every behavioral criterion passes and the propagation path is modeled, but the
deltas are authored, not calibrated. Keep shadow; graduation criteria are now
explicit — graduate when real outcomes calibrate the deltas (and when the
weakest-link dampening is accounted for).

## Checks

`tsc -p tsconfig.check.json --noEmit` clean. **488** self-checks across 19 suites
(new audit harness 15). Canonical byte-stable (par 23.1, conf 0.60, beats +8.6/+4.0);
nothing shipped moved.

## Out of scope (held)

Applying the candidate live, changing final/par/observed/evidence-adjusted,
calibrating from fake data, inventing fuller graphs, second-chance value, Role Court
v2, Pressure Lab, historical baselines. Order: 9D right side → 9E how strongly →
9F audition → **9G earn the vote** → graduate only when calibrated.
