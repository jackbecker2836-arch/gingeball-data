# Phase 7B — Confidence Calibration & UI Honesty

Acting on the Phase 7 audit evidence (no vanity tuning): de-stack provenance,
reshape the proof confidence, rerun the universe, review thresholds, and audit
the UI for overclaiming.

## The calibration arc (honest, evidence-driven)

| | Phase 6B | after 7B |
|---|---|---|
| Proof confidence (full sample) | 0.41 | **0.64** |
| Proof confidence (thin sample) | 0.13 | **0.21** |
| Weakest layer | proof (11/12 scenarios) | **archetype** (9/12) |
| Canonical final | 0.44 · LOW · PROVISIONAL | **0.60 · MEDIUM · PROVISIONAL** |

The 6B number (0.44) was honest — we didn't force it. The audit then proved the
proof *shape* was too punitive, and 7B fixed the shape with evidence. The result
is the MEDIUM we originally expected, reached the right way.

## 1. Provenance de-stacked

Removed the consolidator's `0.94 + 0.06·liveShare` numeric factor. Synthetic was
already penalized in three layers' `dataIntegrity`; the extra global multiplier
was stacking. The synthetic-vs-live gap dropped from 0.13 to **0.08** — now purely
legitimate per-layer data integrity. Provenance survives as the **PROVISIONAL
label** + the provenance summary + a caps note. A self-check now asserts that
equal input confidences give an equal final regardless of provenance — the
label moves, the number does not.

## 2. Proof confidence reshaped (v2)

`proofConfidence = sampleConfidence(poss) × geomean(market, role, lineupContinuity,
dataIntegrity)`. The sample term stays a direct multiplier so **thin samples still
collapse** (0.21), while the quality factors combine by geometric mean instead of a
raw six-way product so a **full synthetic sample stays humble, not self-crushing**
(0.64). Scope was the proof layer only — lineup/archetype shapes were left alone;
archetype becoming the new weakest layer is an honest limit of the newest model.

## 3. Audit denominator aligned

The harness now uses a separate par denominator (canonical 66.5 for par, 67 for
actual), mirroring the production split, so audit confidence tracks the real build
path instead of a simplified single denominator.

## 4. Thresholds reviewed, not refit

Across the universe the cutoffs now produce an intuitive spread — canonical
MEDIUM, clean-inputs HIGH, thin-sample LOW. Left as-is; not overfit to one case.

## UI honesty pass (findings + fixes)

Audited verdict, ladder, provenance bar, conditions chips, and the CourtGraph
proof trail for anything implying synthetic data is real or overstating certainty.

- **Fixed:** the conditions legend said "inputs still fixture-derived" — inputs are
  `synthetic_fixture`, so it now reads "inputs synthetic (labeled, not measured)".
- **Fixed:** condition-chip tooltips and the World "PENDING ENGINE (fixture for
  now)" / CourtGraph warp note updated from "fixture" to "synthetic"/"modeled".
- **Verified honest:** the confidence ladder shows each law, the weakest in
  crimson, the final in gold, plus "MEDIUM · PROVISIONAL" and a plain sentence
  naming the weakest layer and synthetic diet — humility, not contradiction.
- **Verified honest:** the proof strip is labeled "synthetic_fixture events" and
  "non-scoring value tracked, not yet valued"; the CourtGraph trail still reads as
  evidence (made/miss/turnover marks), not decoration.
- **Audit-pending (named):** rendering each audit scenario through the components
  for a visual overclaim check; the static review above covers wording/state, not
  per-scenario rendering.

## Out of scope (held)

No 5C, no 4D, no non-scoring valuation, no new laws. Calibration + honesty only.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 14 +
20 + 16 + 15 + 22 + 52 + 27 = **181** green. Canonical chain math byte-stable
(103·99 / 24.5 / 23.1 / +8.6); only the confidence shape changed, and that change
is covered by the verdict-confidence + proof suites and the rerun audit universe.
