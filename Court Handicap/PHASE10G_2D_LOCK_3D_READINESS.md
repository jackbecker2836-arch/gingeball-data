# Phase 10G — 2D Motion Lock / 3D-Readiness Decision

The last Phase 10 substep. Not a feature gate — a decision gate.

> **3D must be earned by truth, not desire.**
> **the living court stays truthful before it becomes deeper.**

---

## 1. The 2D motion system, audited against the spine

For each sentence of the spine: does the current CSS/SVG motion explain it, stay
truthful, survive reduced-motion, work flat — or does it need depth?

| spine sentence | how 2D carries it | truthful? | needs depth? |
|---|---|---|---|
| the market sets it | chips collapse → hub burns the implied score; source-aware forming (only live breathes) | yes — fallback never reads live | no — refinement only |
| the lineup shapes it | nodes + synergy seams enter at `lineupNodes`; bend toward each lineup's center of mass | yes | no |
| the archetype translates it | the lens warps the floor at the selected player, sized by difficulty | yes | **maybe later** (see §2) |
| the possessions prove it | proof beads accrue in order, results distinct (lit / faded / scar / weighted), capped | yes — nothing celebrates | no |
| the verdict rules it | stamp arrives only after proof completes (10F fix) | yes — order enforced | no |
| confidence confesses | ring settles to the earned arc, tier-paced, never a loop | yes — arc = `finalConfidence` | no |

Cross-cutting: **accessibility** (DOM/SVG text carries every fact; `aria-label` on the
ring), **reduced-motion** (base CSS = end-state; manual replay jumps to end-state),
**mobile** (named risks, §4). All clear at the logic level.

**Verdict of the audit: the 2D system answers the spine clearly and truthfully.**

---

## 2. 3D-readiness — each candidate against the bar

The bar: *depth must reveal a truth that flat motion cannot.* "Looks cooler", "Phase 10
promised 3D", "would impress" are disqualifying.

| candidate | the claimed truth | does flat already carry it? | verdict |
|---|---|---|---|
| court tilt depth | the floor bends harder/easier by slope | yes — the tilt polygon + crimson-pressure / blue-relief + the slope card already encode magnitude and direction | **not earned** (closest future case) |
| archetype lens depth | the same court translates per archetype | yes — the 2D warp + fit/difficulty already show it | **not earned** |
| pressure-field z-layer | matchup difficulty as spatial depth | yes — hazard rings + weighted (gold) proof already mark pressure | **not earned** |
| proof z-layering | possession legibility | the flat accrual reads in order; z would add occlusion risk, not clarity | **not earned** |

No candidate currently clears the bar. The strongest *future* case is **court tilt** —
if real outcome data later shows slope magnitude is being misread flat, a narrow tilt
depth study would be the first thing to prototype. Not now.

---

## 3. THE DECISION

```
DECISION:  LOCK_2D
3D:        DEFER_3D   (revisit court-tilt depth only if a real misread appears)
```

Recorded and **enforced** in `motion.ts` as `MOTION_LOCK` + `motionLockHeld()`: the lock
is valid only while the truth invariants hold — proof-before-verdict, ring = earned arc,
only-live-breathes, no ambient motion, reduced-motion-complete, DOM-as-truth-carrier. If
a future change breaks any of them, a self-check turns red and the "lock" is no longer
honestly claimable.

### Reaffirmed rules (locked)

- **DOM/SVG text is the truth carrier.** Motion only animates the presence of elements
  that are already true. No fact is motion-only.
- **The 2D fallback is complete.** Everything the motion shows exists in the static
  render.
- **Reduced-motion is complete.** Base CSS is the end-state; the reduce guard zeroes all
  animation; manual replay respects it.
- **If 3D ever comes, WebGL never carries facts alone** — it may only enhance a truth the
  DOM already states.

---

## 4. Mobile risks (carried forward, pixel-pending)

The ~2s entrance is comfortable on desktop; on mobile, watch the rim-protector panel
stack and the provenance chip-wrap, and consider a shorter bead step/cap on narrow
viewports (a tuning lever, not a new system). These need Jack's 390px capture to close.

---

## 5. Phase 10 — closed

| substep | delivered |
|---|---|
| 10A | motion architecture + honest pixel path (harness + catalog route) |
| 10B | semantic palette correction (amber collision resolved in code) |
| 10C | meaningful motion v1 (entrance + confidence ring settle) |
| 10D | internal mark staging + possession replay (evidence accrual) |
| 10E | per-mark SVG wiring + source-aware market-forming |
| 10F | motion tuning + hierarchy fix (proof-before-verdict) + reduced-motion QA |
| 10G | **2D motion lock / DEFER_3D** |

The living court breathes, accrues proof, waits for proof before the verdict, and lets
confidence confess instead of celebrate — in a disciplined CSS/SVG system that never
makes a state feel more certain, more live, or more final than it earned.

## Checks

Strict `tsc` clean. **539** self-checks green across 20 suites (`motion` 39→**44**, +5 for
10G). Canonical math byte-stable. Palette v2 + all motion intact. No new motion, no data
or grade value moved — 10G adds only the recorded-and-enforced decision.

## The one open external step

The in-app pixel / Frame.io pass on the combined motion is still owed by the browser. The
lock is on the system's *logic and contract*; the final perceptual sign-off is Jack's
capture. That is the honest boundary Phase 10 has held throughout.

## After Phase 10 (roadmap, parked)

Run the in-app capture and file findings; revisit court-tilt depth only if outcomes show a
flat misread; graduate graph→confidence coupling once deltas calibrate; real franchise
teamIds; second-chance/deterrence value model; Role Court v2; Pressure Lab.
