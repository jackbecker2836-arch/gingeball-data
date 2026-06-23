# Phase 11H — Live Product CourtContext Bridge & Per-Archetype Scenario Expansion

The composite grows closer to the product without gaining power before it earns it. 11H
bridges the live product court into the shadow composite (read-only), gives non-guard
archetypes their own courts, names the missing non-scoring engines, and starts the
evidence-type taxonomy.

> **The composite can read the product court and the archetype-specific lab courts without taking power.**

---

## 1. Live product CourtContext bridge (read-only)

`lib/stat-par/court-context-bridge.ts`:

- `deriveCourtContextFromManifestView(view)` — maps the product view into a `CourtContext`:
  market total → total, `marketHub.courtType` → label, `provenance.market.sourceState` →
  source state, `provenance.lineup.confidence`/`inputProvenance` → context confidence/
  provenance, `verdict.beatLineupPer100` → the real scoring beat. The product view does **not**
  expose raw lineup geometry (spacing/POA/rim/synergy), so those are set neutral and flagged
  `geometryAvailable: false` — marked, not fabricated.
- `buildShadowCompositeFromView(view, archetype)` — builds a composite from the product view,
  `applied: false`.

**Read-only is proven:** a self-check asserts `JSON.stringify(view)` is byte-identical before
and after deriving + building, and that the live verdict on the view is untouched. The bridge
reads the product; the composite never writes back.

---

## 2. Per-archetype scenarios (non-guard courts)

`lib/stat-par/archetype-scenarios.ts` adds **8 archetype-shaped scenarios** — rim_protector,
connector, spot_up_wing, defensive_stopper, screen_assist_big, secondary_creator,
high_usage_star, low_usage_specialist — each with its **own** court (low-total grind /
connected motion / spread PnR / POA war / DHO half-court / two-initiator backcourt /
heliocentric usage / role-dependent bench unit), synthetic actuals beating its owned stats, an
allowed headline set, a confidence vulnerability, a render expectation, and a team side.

No scenario reuses the canonical guard court (total 202). Composites produce **distinct
headline categories across archetypes** — a connector can even headline on **turnover relief**
(`ball_security`), which the lab caught as legitimate connector value and the allowed set was
widened to honor. A `secondary_creator` stat profile was added so it can be graded.

---

## 3. Non-scoring engine gaps (named)

`NON_SCORING_ENGINE_GAPS` tracks seven missing engines — deterrence, spacing_gravity,
screen_assist, secondary_assist, opponent_suppression, role_compression, lineup_relief — each
with the stats and archetypes it serves. `archetypePendingProofGap()` lets the lab say
*"rim_protector is composite-shadow supported, but its primary proof stat (deterrence_events)
is pending_engine."* A high-usage star's scoring proof is correctly **not** flagged (it's
engine_modeled).

---

## 4. Evidence-type taxonomy (started)

`stat-par.ts` now carries `EVIDENCE_TYPE`: box_score / tracking / event / gravity /
suppression — each stat tagged — plus `evidenceMix()`. `lineup_effect` is named but
deliberately maps to **no stat yet** (it's produced by the impact matrix, not the box-score
vector) — honest about what the taxonomy does not measure. The product no longer treats all
"stats" as the same kind of evidence.

---

## Checks

Strict `tsc` clean. New suites `court-context-bridge` **11**, `archetype-scenarios` **15**;
`stat-par` **16** (evidence types + secondary_creator profile); `pressure-lab` grew **21 → 25**
(bridge read-only, non-guard breadth, engine gaps). All existing suites green; scoring math
byte-stable; **product path uncontaminated** — the bridge is read-only and the live verdict is
asserted untouched.

## Out of scope (held)

Graduating the composite live; making proxy stats engine-modeled; mutating the live verdict via
the bridge; public/polished UI; deploy; the pixel pass.

## Parked / next

- Expose lineup geometry on the product view (or derive it from difficulty factors) so the
  bridge's geometry stops being neutral.
- Build the named non-scoring engines (retire `pending_engine`), starting with deterrence /
  spacing-gravity.
- A `lineup_effect` evidence path that connects the impact matrix into the stat vector.
- The graduation-from-shadow decision; the React cockpit route + the **browser pixel pass** —
  still the open gate before internal deploy.
