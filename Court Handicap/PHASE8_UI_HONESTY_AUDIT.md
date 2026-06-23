# Phase 8 — Multi-State UI Honesty & Product Readiness Audit

A truth pass on the interface. The engines are honest; this phase proves the
*screen* is too — across every source state, player state, what-if state, and
confidence tier. The governing test:

> **the interface never tells a stronger story than the engines earned.**

## How it's proven (not eyeballed)

The honesty-critical labels were extracted into one pure module
(`components/court-handicap/ui-labels.ts`) that the components render AND the audit
imports. The audit (`ui-honesty-audit.ts`, 35 checks) builds the REAL view-model
for each scenario and asserts the exact strings/tones/flags the UI shows. So
"fallback never looks live" is a literal unit test on the rendered label, not an
inspection.

## Scenario × surface matrix (audited)

Source states: live · stale_live · last_known_good · fixture_fallback · mock ·
fixture · synthetic_audit. Player states: guard · rim protector · non-modeled
archetype. Plus: missing moneyline, missing total, what-if, and LOW/MEDIUM/HIGH
confidence. Surfaces: source badge, provenance bar, MarketHub (win-prob),
confidence ladder + reliability label + caps, OutcomeVerdict, Conditions chips +
honesty line, CourtGraph footer + per-node basis tag + proof trail, selection
banner, what-if badge, non-scoring strip, pending-engine counts.

## The most important UI tests — all passing

- **fallback never looks live** — exactly one state (`live`) reads live or wears
  the trust tone; every mock/stale/last-known-good/fallback view's badge fails the
  `readsLive` test.
- **stale never looks fresh** — `stale_live` badges "LIVE · STALE", warn tone,
  `stale=true`, quality < 1.
- **synthetic never looks measured** — mock/fixture wear the synthetic tone; the
  conditions line says "inputs synthetic (labeled, not measured)".
- **tracked-not-valued never looks valued** — the big's non-scoring proof carries
  the single phrase "tracked · not valued" and never appears among the valued
  headline families.
- **LOW confidence survives a strong verdict** — a driven LOW grade still badges
  "LOW · PROVISIONAL" (warn), and the canonical strong verdict (BEAT) shows a
  humble sub-0.7 confidence with the weakest layer in crimson.
- **non-modeled archetype is honest, not broken** — its node reads "FIXTURE
  ESTIMATE", keeps real fixture difficulty/fit, and never reads "engine".
- **hypothetical never overwrites real history** — what-if flags hypothetical,
  leaves the basis line (202) and conditions (marketPar 24.5) intact, and the
  badge stays honest.
- **win probability is never invented** — missing moneyline renders
  "— (no moneyline)", never a number.

## Overclaims fixed this phase

1. **Verdict proof footer** asserted "non-scoring value tracked, not yet valued"
   for *every* player — including the scoring guard, who tracks none. Removed; the
   claim now lives only on the big's non-scoring strip and in the pending-engine
   list.
2. **Source badge logic** was inline in the World and untestable. Extracted to
   `sourceStateBadge()`; the World renders it and the audit asserts it — one source
   of truth.
3. **Non-modeled archetype node** showed fixture DIFF/FIT with only a global
   footer disclaimer. Added a per-node basis tag ("FIXTURE ESTIMATE" vs "ENGINE")
   so a non-modeled player can never read as engine-graded.

## Verified-honest (already correct; now locked by tests)

MarketHub gates win-prob on presence; the confidence ladder always renders the
weakest layer in crimson + reliability label + caps + the humble sentence; the
what-if badge + hypothetical flag; the conditions honesty line.

## Overclaims / gaps still PENDING (named, not fixed)

- **No pixel snapshots.** This sandbox has no DOM; the audit proves the
  view-model + label functions the components consume, not rendered pixels. A real
  screenshot pass across states is still worth doing pre-launch.
- **No full view renders LOW or HIGH end-to-end.** LOW/HIGH are proven at the
  label/engine level, but the canonical chain is MEDIUM and no live+complete+
  measured path exists yet, so HIGH is by-design never rendered and LOW is only
  driven directly. A thin-sample view wired through the source would render a true
  LOW.
- **MarketHub number is source-agnostic.** The big implied "103·99" renders the
  same under any source; the badge sits adjacent but the number itself isn't dimmed
  under fallback. Considered, not changed (the adjacent badge carries the truth).
- **Three audit scenarios still parked** (injured starter, late lineup change,
  high-confidence-ordinary-verdict).

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 20 +
20 + 21 + 15 + 22 + 76 + 27 + **35** = **251** green. Engine math unchanged
(guard 0.60 / +8.6 / 103·99 byte-stable; big graded; 7/7B audit green).

## Out of scope (held)

No redesign, no new engines, no confidence tuning, no new providers, no
second-chance value, no Pressure Lab. A truth pass, not a beauty pass.
