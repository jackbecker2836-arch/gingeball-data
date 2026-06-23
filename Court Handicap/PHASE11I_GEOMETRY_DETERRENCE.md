# Phase 11I — Product Geometry Exposure & First Non-Scoring Engine

The shadow composite gets closer to truth without gaining authority. 11I gives the bridge the
court's real shape (derived honestly from the view's own factor breakdown) and gives non-scoring
value its first true engine — deterrence v1 — replacing a `pending_engine` placeholder.

> **One non-scoring proof category stops being a placeholder and becomes an honest engine.**

---

## 1. Product geometry exposure

`lib/stat-par/product-geometry.ts` — `extractProductGeometry(view)`.

The product view doesn't carry raw lineup geometry, but it exposes the archetype factor
breakdown (`conditions.difficultyFactors` / `fitFactors`), where `points = weight × signal ×
100`. We recover the real signal by inverting with the engine's known guard weights
(spacing 0.24, POA 0.22, rim 0.16, synergy 0.16):

```
spacingScarcity ← difficulty "spacing"   poaPressure ← difficulty "poa"
rimProtectionFaced ← difficulty "rim"    synergy     ← fit "synergy"
```

Validated against the live view: recovers spacing **0.72**, POA **0.85**, rim **0.78**, synergy
**0.40** — the canonical court. Every field is marked **inferred** (not "real" — it's derived,
not measured), or **unavailable** if its factor is missing. Carries `geometryConfidence` (the
archetype confidence) and `geometryProvenance: "derived_from_archetype_factors"`.

This is the honest middle path: the geometry is real-signal-derived, but it says *derived*, not
*measured*, and it does not touch the product view-model.

## 2. Bridge consumption

`deriveCourtContextFromManifestView` now consumes the derived geometry: it fills the context's
spacing/POA/rim/synergy from the inversion, sets `geometryAvailable: true` when the factors
resolve, and **degrades context confidence ×0.85 when geometry is unavailable**. A self-check
proves the **shadow composite changes when geometry changes** (a cramped floor raises expected
turnovers, shrinking a connector's turnover-relief beat). The view stays byte-identical
(read-only); the live verdict is untouched; the composite stays `applied:false`.

## 3. Deterrence engine v1

`lib/deterrence-engine.ts` — `computeDeterrence(input)`. The first non-scoring engine. Real
structure:

```
expectedDeterrence  actualDeterrence  deterrenceDelta
expectedRimContests actualRimContests rimContestDelta
foulRisk  confidence  provenance  drivers  limitations
```

Model: `deterRate = 0.15 + 0.45·rating`, `contestRate = 0.30 + 0.50·rating`, scaled by pace
(`possessions / 88.6`); foul risk rises as discipline falls. Inputs (opponent rim pressure,
rim-protection rating, foul discipline, pace) are **synthetic / fixture** and the v1 curves are
**uncalibrated** — both named in `limitations`. Output carries provenance
**`deterrence_engine_v1`** at confidence **≤0.6**: above a pending placeholder, deliberately
below an `engine_modeled` scoring par. It does not pretend to be measured tracking.

## 4. Stat vector consumes the engine

`computeStatParVector` gained a `statOverrides` option. `deterrenceStatOverrides(out)` upgrades
rim_protector's `deterrence_events` + `rim_contests` from the default `pending_engine`
placeholder to `deterrence_engine_v1` (with the engine's expected/actual/confidence). The
default profile is **unchanged** — the upgrade is explicit and opt-in, so nothing silently
rewrites. Result: rim_protector's **pending count drops** when the engine is applied.

## 5. Pressure Lab reports the upgrade

The lab summary now carries `deterrenceEngine { exists, upgradedRimProtector, pendingBefore,
pendingAfter }` and `productGeometry { available, provenance }`, with checks asserting the
deterrence upgrade lowers the pending count and the bridge reads real (derived) geometry.

---

## Checks

Strict `tsc` clean. New `deterrence-engine` **12**; `product-geometry` folded into
`court-context-bridge` (**21**); `stat-par` **18** (override path); `composite-verdict` **20**
(deterrence cap); `pressure-lab` **25 → 27** (deterrence upgrade + geometry). All existing
suites green; scoring math byte-stable; product path uncontaminated (bridge read-only, live
verdict asserted untouched, composite `applied:false`).

## Out of scope (held)

Graduating the composite live; making deterrence look measured; faking tracking; mutating the
live verdict; the bridge as a backdoor; public/polished Pressure Lab UI; deploy.

## Parked (named, not built)

A formal **limitation registry** — `geometry_unavailable`, `pending_deterrence_engine`,
`pending_spacing_gravity_engine`, `synthetic_court_factor`, `fixture_estimate_screen_assist`,
`shadow_composite_not_applied`, `browser_pixel_pass_missing` — shown per-scenario in the lab.
Named now, built next; the current limitations already surface in engine `limitations[]` and
provenance tags.

## Next

Expose more product geometry natively (retire factor-inversion); build the next non-scoring
engine (spacing-gravity); run per-archetype courts through real engines; the limitation
registry; the React cockpit route + the **browser pixel pass** — still the open gate before any
protected internal/staging route. Public remains a trust event, not a hosting event.
