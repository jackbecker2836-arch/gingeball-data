# Phase 10D — Internal CourtGraph Mark Staging & Possession Replay v1

10C gave the product breath. 10D makes the CourtGraph's own marks speak in the order
the engine reasons — and lets the proof trail accrue like evidence.

> **the possessions prove it visually only after the court has been formed.**

No data model change. Visual staging only, over the proof the engine already computed.

---

## 1. What was built

**Internal timeline centralized in `motion.ts`.** `INTERNAL_MARKS` puts the marks on
the same clock as the entrance: court geometry (180) → lineup nodes (380) → archetype
lens (560) → pressure field (660) → **proof trail (780)** → **par scar (980, before the
verdict at 1040)**. `internalOrderValid()` asserts proof reveals only after lineup and
archetype context exist.

**Possession replay v1 (accrual).** The proof beads — which already carried real
outcome semantics — now *accrue* left-to-right via a capped per-bead delay
(`possessionBeadDelayMs`: base + i·24ms, capped at +700ms so a long trail never drags).
The trail reads as evidence accumulating, not a cinematic replay. Each bead's treatment
is specified by the pure `possessionResultMotion(outcome)`:

| outcome | treatment | reads as |
|---|---|---|
| made (clean) | lit, rises by value | a bucket earned |
| made under fire | weighted (gold) | proof against pressure |
| made that beat the court | emphasized (taller, ember cap) | **emphasis, never triumph** |
| missed | faded | a miss, dimmed |
| turnover | scar | a red notch cutting down |
| pass / event | neutral | faint tick |

**Reduced-motion correctness fix.** The genesis `play()` stepper was JS-timer driven
and ignored `prefers-reduced-motion` — so a reduced-motion user who triggered it still
got a staged reveal. `play()` now checks `prefersReducedMotion()` and jumps straight to
the truthful end-state (act 4). The bead accrual likewise collapses (base CSS is the
fully-accrued trail; the stagger lives only under `no-preference`).

---

## 2. The truth rules (enforced)

- **Proof after context.** `internalOrderValid()`; proof delay strictly greater than
  lineup and archetype delays. *(self-check)*
- **Nothing celebrates.** `possessionResultMotion(...).celebrates === false` for *every*
  outcome, even a made bucket that beat the court under fire. A beat is `emphasized`,
  never triumphant. *(self-checks)*
- **Evidence, not theatre.** Bead delays are monotonic and capped — `possessionBeadDelayMs(10000)`
  resolves to base + 700ms, not a minutes-long crawl. *(self-check)*
- **Reduced motion = instant truth.** `play()` short-circuits to the end-state; base CSS
  shows the full trail; `prefersReducedMotion()` is SSR-safe (false on the server).
  *(self-check)*
- **No invented possessions.** Beads map only to outcomes the possession-proof engine
  already produced. The treatment function describes; it never fabricates.

---

## 3. See it move (honest)

`design/possession-replay-demo.html` — a rendered study showing the beads accrue with
the real outcome treatments, a **replay** button, and a **reduced-motion toggle** that
cuts to the full trail. It is a treatment study (a representative sequence), not a claim
of a specific game's possessions, and not a screenshot of the app — the app uses the
same `motion.ts` constants, and the in-app pixel pass remains Jack's local capture step.

---

## 4. Adobe study track (human-run)

Illustrator for bead/scar shapes; Premiere for trail pacing against the demo; Frame.io
to judge "evidence vs decoration"; Fresco if the trail feels too sterile; Color to keep
proof / hazard / scar / stale distinct; Fonts for tiny proof labels. Gate unchanged:
*does this mark explain what happened?*

---

## Checks

Strict `tsc` clean. **521** self-checks green across 20 suites (`motion` 16→**26**, +10
for 10D; ui-honesty 46; all engines unchanged). Canonical math byte-stable. Palette v2
and the 10C entrance/ring intact. No engine or shipped grade value moved — 10D adds
internal timeline tokens, a result-motion mapping, bead accrual, and a reduced-motion
gate on the existing stepper.

## Out of scope (held)

WebGL, 3D, player-movement simulation, Mixamo, full play-by-play theatre, canvas-as-truth,
ambient drift, the full genesis in one shot, reopening Phase 9.

## Parked / next

Wire the finer per-mark delays (court geometry / nodes / lens) to `INTERNAL_MARKS` in
the SVG itself (currently the coarse act-stepper plus bead accrual carry the order);
tune accrual pacing against a real pixel capture; market-forming motion next; only then
revisit graph→confidence coupling. The in-app pixel/Frame.io pass on all of 10C+10D
motion remains the open external step.
