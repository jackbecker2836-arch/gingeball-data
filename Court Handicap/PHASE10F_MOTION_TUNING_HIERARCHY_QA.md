# Phase 10F — Motion Tuning, Visual Hierarchy & Reduced-Motion QA

A tuning gate, not a feature gate. No new motion systems. The job: make the motions
already built read correctly together.

> **the animated screen tells the same truth as the static engine, only more clearly.**

---

## 1. The hierarchy bug 10F caught (and fixed)

Tracing the combined timeline exposed a real competition: proof accrual ran from
`proofTrail` (780) with a 700ms cap plus a ~400ms bead, finishing near **1480ms** —
**after** the old verdict (1040) and even the old ring (1300). So the proof wasn't
actually complete when the verdict stamped; the beats overlapped, and the verdict
appeared mid-proof.

**Fix — retuned the one authoritative timeline** so each beat clears before the next
loud one:

| beat | ms |
|---|---|
| market | 0 |
| court geometry | 180 |
| lineup nodes | 360 |
| archetype lens | 540 |
| pressure field | 660 |
| proof trail (accrues) | 820 → ~1700 |
| par scar | 1700 |
| verdict stamp | 1780 |
| confidence ring | 2080 (last) |

`timelineNonCompeting()` now asserts: proof fully accrues (`820 + cap 560 + bead 320 =
1700`) before the verdict (1780); the scar lands by the verdict; the verdict gets ≥200ms
before the ring; and the ring is the last beat to begin. The entrance is ~2s longer, but
the rhythm is honest — the verdict never appears before its proof.

Also removed a **redundant whole-court block-fade** that competed with the internal mark
staging — the marks now carry the court's entrance themselves.

---

## 2. Timing single-sourced (no drift)

The last hardcoded CSS delays are gone. The verdict card reads its delay inline from
`ENTRANCE.verdictStamp`; the confidence ring reads `--ring-delay` from
`ENTRANCE.confidenceRing`; the proof bead cap is `PROOF_ACCRUAL_CAP_MS`. A self-check
asserts `ENTRANCE` and `INTERNAL_MARKS` **agree** so the two objects can't silently
drift. One timeline, one source.

---

## 3. Visual-hierarchy checks (named; enforced where code can)

| risk | status |
|---|---|
| proof competes with verdict | **fixed** (proof completes first; invariant) |
| ring competes with verdict | **fixed** (≥200ms gap; ring is last) |
| court block-fade competes with marks | **fixed** (block-fade removed) |
| LIVE overpowers verdict | only-live breath is one settle, not a loop; verdict is its own later beat — *confirm in pixels* |
| STALE reads fresh / FALLBACK reads live | guarded by source-aware forming + Palette v2 markers — *confirm in pixels* |
| LOW/PROVISIONAL celebrate | ring `celebrates:false`; proof `celebrates:false` (self-checks) |
| confidence ring overclaims | arc = `finalConfidence` exactly (self-check) |
| no ambient/looping motion | **enforced**: a self-check fails if the stylesheet contains `infinite` |

The perceptual items (eye-path, emotional weight, "does it feel inevitable") are what the
combined demo + Frame.io pass are for — they can't be asserted, only reviewed.

---

## 4. Reduced-motion QA (explicit static-equivalence)

Every animated beat has a static end-state equal to the truthful render:

| animated beat | reduced-motion end-state |
|---|---|
| market forming / breath | hub + implied score shown, no breath |
| court geometry draw | court fully drawn |
| node / lens / hazard entrance | all present |
| proof bead accrual | full trail shown at final opacities |
| par scar | scar + par line present |
| verdict stamp | verdict shown |
| confidence ring settle | ring at the earned arc immediately |

Enforced by base-CSS-is-end-state plus `@media (prefers-reduced-motion: reduce){ .ch-anim
* { animation: none } }`, and a self-check that the reduce guard is present. **Manual
replay respects reduced-motion**: `CourtGraph.play()` calls `prefersReducedMotion()` and
jumps to act 4 instead of stepping; all three demos read the OS setting and their toggle
cuts to the end-state. No fact depends on timing.

---

## 5. Mobile density review

The harness captures 390px. The longer entrance (~2s) is fine on desktop; on mobile the
named risks are: the rim-protector panel stack (par chain + verdict + non-scoring + slope
+ graph + shadow), the provenance bar chip-wrap, and the proof trail compressing. Tuning
lever available without new systems: shorten the bead step / cap on narrow viewports.
**Pixel-confirmed by Jack** — this is the open external step that feeds the final tuning.

---

## 6. See it combined

`design/combined-sequence-demo.html` runs the entire sequence together with a timeline
ruler + playhead, a reduced-motion toggle, and a reliable replay. It is the surface for
the perceptual tuning pass (Premiere/Frame.io), and it mirrors the `motion.ts` constants.

---

## Checks

Strict `tsc` clean. **534** self-checks green across 20 suites (`motion` 32→**39**, +7 for
10F; ui-honesty 46; engines unchanged). Canonical math byte-stable. Palette v2 intact.
No data or grade value moved — 10F retunes timing, removes a competing fade, single-sources
delays, and adds hierarchy/QA invariants.

## Out of scope (held)

New motion systems, WebGL, 3D, player bodies, play-by-play, ambient drift, decorative
particles, another confidence model, reopening Phase 9.

## Phase 10 budget

10A–10F done. **10G** (2D Motion Lock / 3D-Readiness Decision) is the last substep. The
in-app pixel/Frame.io pass on the combined motion is the open external input to 10G.
