# Phase 10E — Per-Mark SVG Wiring & Market-Forming Motion

10D staged the proof accrual; 10E connects the individual CourtGraph marks to one
authoritative timeline and adds the first sentence of the product as motion.

> **the CourtGraph's motion now follows the theorem at mark level, not just section level.**
> **the market visibly sets the court without pretending every market state is live.**

---

## 0. Required fix — the replay button (done)

`possession-replay-demo.html` reset via `offsetWidth`, which is unreliable on an
`<svg>`, so repeat clicks didn't always restart. Fixed with a hard reset:
`classList.remove("play")` → `getBoundingClientRect()` (layout flush) → re-add on a
double `requestAnimationFrame`. Line beads and cap circles restart together; reduced
mode never animates; repeat clicks work. The same reliable reset was applied to
`motion-demo.html`.

---

## 1. Per-mark SVG wiring (single-sourced timing)

Every internal CourtGraph mark now reads its delay from `INTERNAL_MARKS` in
`motion.ts` — no duplicated constants, one authoritative timeline:

| mark | token | ms |
|---|---|---|
| court geometry | `courtGeometry` | 180 |
| lineup seams / synergies / nodes | `lineupNodes` | 380 |
| archetype lens | `archetypeLens` | 560 |
| hazard / pressure field | `pressureField` | 660 |
| proof trail (base + accrual) | `proofTrail` | 780 |
| par scar | `parScar` | 980 |

`internalOrderValid()` asserts the order; the proof base is now
`INTERNAL_MARKS.proofTrail` (previously a local `0`), so proof reveals strictly after
court + lineup + archetype, at mark level. The coarse genesis act-stepper remains the
manual scrubber and shares `GENESIS_ACT_STEP_MS`.

---

## 2. Market-forming motion (source-aware)

`marketFormingMotion(sourceState)` in `motion.ts` returns `{ intensity, breathes,
burns }`. The market always forms (it always sets the court), but the forming confesses
the source:

| source | intensity | breathes | burns |
|---|---|---|---|
| LIVE | alive | **yes (once)** | yes |
| LIVE · STALE | decay | no | yes |
| LAST-KNOWN-GOOD | dulled | no | no |
| FALLBACK | plain | no | no |
| SYNTHETIC | neutral | no | no |
| WHAT-IF | hypothetical | no | no |

In-app, the market section carries `data-market-form`; **only `alive` breathes — and
only once** (`ch-breath-once`, a ~1.2s settle, never a loop), so motion can't fake
perpetual liveness, and no degraded/synthetic/hypothetical state gets live-like motion.
The court responds only after the market forms (`courtGeometry` 180 > `market` 0).

The full "chips collapse → hub burns the implied score → court responds" sequence, with
all six source variants, is shown in `design/market-forming-demo.html` (a rendered
study; the app applies the same source-aware rule).

---

## 3. Truth rules (enforced by self-checks)

- market forms before the court draws (`ENTRANCE.market < INTERNAL_MARKS.courtGeometry`)
- only LIVE breathes; no degraded state breathes
- stale → decay, LKG → dulled, fallback → plain, synthetic → neutral, what-if → hypothetical
- only live/stale burn (a real read existed); fallback/synthetic never burn
- proof after lineup + archetype; scar before verdict; bead accrual capped
- reduced-motion is SSR-safe and collapses to the end-state

---

## Checks

Strict `tsc` clean. **527** self-checks green across 20 suites (`motion` 26→**32**, +6
for 10E; ui-honesty 46; engines unchanged). Canonical math byte-stable. Palette v2 and
the 10C/10D motion intact. No data or grade value moved — 10E adds market-forming
semantics, the per-mark delay wiring, one CSS keyframe, and the demo + button fix.

## Out of scope (held)

WebGL, 3D, player bodies, Mixamo, full play-by-play, invented possession data,
duplicated timing constants, decorative market particles, market motion that makes
fallback look live.

## Phase 10 budget

Capped at seven substeps: 10A–10E done; **10F** (motion tuning, hierarchy, reduced-
motion QA) and **10G** (2D motion lock / 3D-readiness decision) remain. The in-app
pixel/Frame.io pass on all motion is the open external step feeding 10F.
