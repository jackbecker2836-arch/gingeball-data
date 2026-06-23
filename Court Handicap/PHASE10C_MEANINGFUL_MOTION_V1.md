# Phase 10C — Meaningful Motion v1: CourtGraph Entrance + Confidence Ring Settle

The first real motion. CSS/SVG only, reduced-motion mandatory, and one law above all:

> **motion must explain the system without increasing the claim.**

Two motions ship. Nothing else animates yet.

---

## 1. What was built

**Motion semantics live in `motion.ts`** — pure, testable constants/functions so the
truth rules are asserted, not eyeballed. The CSS reads these numbers; 16 self-checks
guard them.

**Motion A — CourtGraph entrance (staged, spine-ordered).** Top-level sections reveal
in the order of the spine via `ENTRANCE` delays: market (0ms) → court (180) → … →
proof (780) → **verdict (1040)** → **confidence ring (1300)**. Wired as `.ch-anim` +
`.ch-stage[data-stage]` on the World's market / court / verdict sections. The verdict
never reveals before the proof; the ring never before the verdict.

**Motion B — confidence ring settle (new, in OutcomeVerdict).** An additive SVG ring
whose filled arc **equals `finalConfidence` exactly** (0.60 → a 60% arc). It *settles*
to that arc and stops — no overshoot, no bounce, no celebratory loop. Tier-paced:

| tier | duration | feel | glow |
|---|---|---|---|
| LOW | 1100ms | slow, quiet | none |
| MEDIUM | 900ms | restrained | none |
| HIGH | 760ms | firmer, cleaner — never absolute | faint |

PROVISIONAL keeps a visible tick on the ring during and after the settle. The ring
carries an `aria-label` with the percent + tier + provisional, so a screen reader gets
the same fact the arc shows.

---

## 2. The truth rules motion obeys (and how they're enforced)

- **Order = spine.** `entranceOrderValid()` asserts market-first, proof-before-verdict,
  ring-after-verdict. *(self-check)*
- **The ring never inflates the claim.** `finalArcFraction === clamp(finalConfidence)`;
  arc never exceeds 1; MEDIUM never completes the loop. *(self-checks)*
- **No celebration.** `overshoot === false` for every tier; only HIGH gets a faint
  glow, never a burst. *(self-check)*
- **Only live breathes.** `sourceMotion("live").alive === true`; stale / fallback /
  synthetic / last-known-good all return `alive:false, entrance:"plain"` — motion can
  never make a degraded source feel live. *(self-check)*
- **Reduced motion = instant truth.** Base CSS *is* the end-state (everything visible,
  ring at its earned arc). Motion is added only under
  `@media (prefers-reduced-motion: no-preference)`; the `reduce` branch forces
  `animation:none`. `effectiveDuration(true, …) === 0`. *(self-check)*
- **DOM truth persists.** Motion only animates opacity / transform / stroke-dashoffset
  of elements that are already present and truthful. No canvas; no fact is motion-only.

---

## 3. See it move (honest)

This sandbox still can't rasterize the React app, so the rendered proof is a
**self-contained motion study** — `design/motion-demo.html` — that uses the *same*
production timing tokens (delays, durations, easings) and the semantic palette. It
shows the spine-ordered entrance and the LOW/MEDIUM/HIGH ring settle, with a
**replay** button and a **reduced-motion toggle** that cuts straight to the end-state
(and it honors your real OS setting on load). It is a study of the motion language, not
a screenshot of the app — the app uses the same constants, but the in-app pixel pass
remains Jack's local capture step.

---

## 4. Adobe study track (human-run; taste + handoff, not product truth)

Premiere for tuning the entrance pacing against the demo; Media Encoder for review
clips; Frame.io to annotate exact motion frames ("does HIGH feel too firm?", "is LOW
quiet enough?"); Illustrator for exact vector end-states; Color/Fonts for legibility
mid-motion. Gate unchanged: a motion ships only if it explains the system.

---

## Checks

Strict `tsc -p tsconfig.check.json --noEmit` clean. **511** self-checks green across 20
suites (new `motion` suite: **16**; ui-honesty 46; all engines unchanged). Canonical
math byte-stable. Palette v2 intact. No engine or shipped grade value moved — 10C adds
a motion module, CSS, one additive ring, three stage hooks, and a demo.

## Out of scope (held)

WebGL, 3D, canvas-as-truth, animating every component, the full genesis sequence in one
shot, reopening Phase 9, wholesale redesign.

## Parked / next

Tune pacing against a real pixel capture; stage the *internal* CourtGraph elements
(nodes/proof) with the finer delays already defined; possession-replay + market-forming
motions next, only after this v1 survives pixels; revisit whether the entrance's
market-first reveal reads right given the court sits above the MarketHub in layout.
