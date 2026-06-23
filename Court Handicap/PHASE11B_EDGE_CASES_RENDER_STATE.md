# Phase 11B — Audit Universe Edge-Case Expansion & Render-State Integration

11A proved the lab can exist. 11B makes it meaner — the parked layers become
first-class scenarios with behavioral assertions, and the runner starts checking the
render-state contract, not just engines and labels.

> **The audit universe now pressures the system across the edge cases that break trust.**

Still a lab. Still synthetic on purpose. Still separate from the product path.

---

## 1. The 50-crossing court is now real

The over-claim 11A parked is now proven. A single synthetic court — spread −2, total
190, **spacing 0.28**, poa 0.93, rim 0.90, burden 0.68, synergy 0.28 — fed to two roles
with identical inputs crosses the favorable/hostile line:

| role | difficulty | fit | reading |
|---|---|---|---|
| scoring guard (`cross_guard`) | **72** | 29 | **hostile** (cramped floor, defensive grind) |
| rim protector (`cross_rim`)   | **47** | 73 | **favorable** (uncongested paint, low-total value) |

It was engineered from inputs, not hardcoded: low spacing makes the guard's floor harder
*and* the rim's paint less congested, while the low total adds grind value for the rim.
The runner gate `crossing_court_two_truths` asserts `guard.difficulty > 50 && rim.difficulty < 50`.
This is the deepest Court Handicap idea, now a canonical lab case: **one court is not one
truth for every player.**

---

## 2. Basketball mess as first-class scenarios (behavioral, not decorative)

All assertions are observed values from the real chain:

| scenario | gate | proven behavior |
|---|---|---|
| `injured_starter` | injured_starter_degrades | lineupPar 23.1 → 23.2 (moves); lineup confidence **0.73 → 0.45** |
| `late_lineup_change` | late_change_provisional | verdict **provisional=true**; lineup confidence 0.49 (≤ canonical) |
| `provider_failure` | provider_failure_guarded | **no win prob**; market confidence **0.85 → 0.39** |
| `extreme_spread` (−16.5) | extreme_lines_stable | marketPar stays 24.5, beat finite, verdict resolves (no NaN) |
| `fast_pace` / `slow_pace` | pace_moves_possessions | expected possessions **103.5 (fast) > 81.6 (slow)** |

The injured-starter par move is small (0.1) on this court — the dominant, honest signal
is the lineup-confidence collapse, which is what the gate leans on.

---

## 3. Render-state contract folded into the runner

The runner no longer stops at engines + source labels. Two render-contract gates now
assert the view-model/label contract aligns with the scenario intent:

- `render_thin_is_provisional` — a thin sample renders a non-HIGH confidence tier **and**
  `provisional=true` (LOW/PROVISIONAL treatment, never a confident badge).
- `render_nonmodeled_is_estimate` — a non-modeled archetype renders a **"fixture estimate"**
  label with a non-trust tone, never an engine-backed read.

Stale→stale badge, fallback→fallback badge, synthetic→synthetic, missing-ML→no-winprob
remain asserted from 11A. Shadow→not-applied and withheld→withheld-reason are reachable
only through the async graph/view assembly; they are named parked render gates (below),
not yet folded in — stated honestly rather than claimed.

---

## 4. Provenance + no contamination (held)

Every new scenario inherits `AUDIT_PROVENANCE = "synthetic_audit_fixture"`. The
`no_product_contamination` gate still asserts the product default
(`buildManifestView()`) carries no audit marker in any confidence layer. No new fixture
file was created — the existing audit universe was extended, per the brief. No engine,
grade, or product value moved.

---

## Checks

Strict `tsc` clean. **564** self-checks green across 21 suites (was 553): the
`audit-universe` runner grew **14 → 22** (8 new edge-case + render gates), and the
engine-chain `audit-harness` grew **27 → 30** (new scenario expects). Canonical math
byte-stable; extreme/pace scenarios confirm the market math stays finite under stress.

## Deployment posture (unchanged, now closer)

Internal/staging (protected route) becomes reasonable now that 11A remains green, the
11B edge-case gates are green, render-state expectations are partly folded in, synthetic
provenance is unmistakable, and there is no product contamination — **once the browser
pixel pass shows no major truth failures.** That pixel pass remains the open gate before
even internal deploy. Public remains a later trust event.

## Out of scope (held)

Public/polished Pressure Lab UI, scenario controls, deploy, coefficient overfitting,
replacing unit tests, making the lab look real, fabricated "calibrated" confidence.

## Parked / next

- **Shadow→not-applied** and **withheld→withheld-reason** render gates (need the async
  graph/view assembly inside the runner).
- Low-book-agreement as its own explicit gate (currently exercised inside provider_failure).
- The async source-state catalog (`buildCatalogView`) exercised *inside* the universe
  runner rather than adjacently.
- Then **Phase 11C — Internal Pressure Lab Runner** (scenario selector + expected/actual/
  provenance/confidence/source/verdict traces + pass/fail summary; still internal,
  synthetic, not public) — and the internal/staging deploy gated on the browser pixel pass.
