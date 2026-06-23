# Phase 9B — Hierarchical Priors & Evidence-Weighted Shrinkage

Shrinkage used to pull every beat toward 0. Now the system has instincts: it
shrinks toward an archetype/role-aware prior **when that prior is earned**, and
falls back to 0 when it is not. The governing test:

> **shrinkage becomes more basketball-aware without becoming less explainable.**

## Hierarchical prior engine (`ch-hier-prior@1.0.0`)

A v1 hierarchy — global → archetype → role → player → context — blended by
specificity weight. The non-zero levels are **authored synthetic baselines**
(no historical seasons yet), labeled `synthetic_fixture`, with a deliberately LOW
prior confidence. The deliverable is the **architecture**, not calibrated numbers;
real data replaces the constants without touching the shape.

The honesty mechanism is a confidence-collapse:

```
effectivePrior = priorConfidence × priorValue
```

so an untrusted prior collapses toward 0 on its own.

| player | archetype prior | role prior | priorValue | effective (×0.35) | source |
|---|---|---|---|---|---|
| scoring guard | +0.5 | +0.4 (primary creator) | **+0.32** | **+0.11** | role: primary creator |
| rim protector | −0.5 | −0.4 (low-usage finisher) | **−0.35** | **−0.12** | role: low-usage finisher |

The two priors **differ in sign** — the whole point. A guard's modest scoring beat
is nudged *up* toward a positive creator prior; a rim protector's is nudged *down*,
because a big isn't expected to beat a *scoring* par. Never "toward 0" for both.

**Fallback stays:** an unknown archetype → `priorValue 0`, `priorSource "global
null"`, `fallbackToZero true`. Smart prior when earned, neutral prior when not.

## Evidence-weighted shrinkage (audited, not switched)

The shipped evidence-adjusted beat keeps the **final-confidence** weight (v1) — we
do not switch blindly — and now shrinks toward the smart prior. Alongside it the
engine computes a **proof/sample-weighted** candidate (v2) and reports the gap +
a recommendation:

- **Guard (full sample):** v1 +5.2 vs v2 +5.4 — they agree → "final-confidence
  weight is fine."
- **Thin sample (LOW):** final 0.22 vs proof 0.10 → v1 +1.9 vs v2 +0.9, a real
  divergence → "prefer the evidence-specific weight — the beat is a sample claim."

The recommendation is data-driven (the gap), not a vibe; the choice to actually
switch is deferred, with the comparison now visible.

## Both players, prior-explained

Guard (in the view-model) and rim protector (in the source) both produce an
evidence-adjusted beat with its prior named and the v1/v2 comparison attached.
The UI line reads e.g. *"evidence-adjusted +5.2/100 at 60% · toward the primary
creator prior"* (and, when the gap is wide, *"· evidence-weighted +0.9"*).

## Stability

Observed beats byte-stable (guard **+8.6**, big **+4.0**); confidence **0.60**;
implied **103/99**. Court Slope v2 and the lineup graph (9A) untouched. The 7/7B
audit, the render-state catalog, and the UI honesty audit all remain green.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 20 + 20
+ 21 + 15 + **22** + 13 + 15 + **13** + 22 + **96** + 27 + 38 + 35 = **372** green
(new prior suite; shrinkage +10; source +8).

## Out of scope (held)

Historical seasons, Kalman updates, graph→par coupling, archetype-confidence
tuning, second-chance value, Pressure Lab, Role Court v2. Plus the named, still-
parked **Y-lineup graph** from 9A. Prior *architecture*, not full calibration.
