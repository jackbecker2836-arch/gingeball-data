# Phase 11J — Limitation Registry & Spacing-Gravity Engine v1

The lab can pass and still confess what it does not know. 11J makes limitations first-class
truth and gives the offense's shape its first real engine — spacing gravity — without the
composite gaining authority.

> **The lab shows not only what passed, but what is still limited.**

---

## 1. Limitation registry

`lib/limitation-registry.ts` — `LIMITATION_REGISTRY` holds 14 structured limitations, each with
`{ id, severity, layer, description, whatItLimits, displayLabel, blocksDeployment,
blocksLiveGraduation }`. Severity is `info | low | medium | high | blocker`; layer is
`geometry | engine | composite | stat | ui | deployment`.

Included: geometry_derived_not_native, geometry_unavailable, pending_spacing_gravity_engine,
pending_screen_assist_engine, pending_secondary_assist_engine,
pending_opponent_suppression_engine, synthetic_court_factor, fixture_estimate_screen_assist,
shadow_composite_not_applied, composite_shadow_only, non_scoring_proxy_low_confidence,
browser_pixel_pass_missing, deterrence_synthetic_v1, spacing_gravity_synthetic_v1.

`browser_pixel_pass_missing` is a **blocker** that **blocks deployment** — the registry itself
now encodes that the UI can lie even when the engines are honest, so nothing ships until the
11K pixel pass. The shadow-composite limitations block *live graduation* but not deployment.

`deriveLimitations({ provenancesPresent, proxyDriven, geometryAvailable, usesCourtFactors })`
maps what's actually in a stat vector / composite to applicable ids — always including
`composite_shadow_only` and `browser_pixel_pass_missing`. Helpers: `resolveLimitations`,
`hasDeploymentBlocker`, `blocksLiveGraduation`, `severityRollup`.

## 2. Spacing-gravity engine v1

`lib/spacing-gravity-engine.ts` — `computeSpacingGravity(input)`. The second non-scoring engine.
Real structure: `expectedSpacingGravity / actualSpacingGravity / spacingGravityDelta`,
`expectedShotQualityLift / actualShotQualityLift / shotQualityDelta`, confidence, provenance,
drivers, limitations.

Model: shooting threat (volume × accuracy) lifted by movement/corner/pull-up presence,
amplified by defensive attention, suppressed by a crowded floor (lineup spacing scarcity),
scaled by pace. Inputs are **synthetic / fixture** and the v1 curves are **uncalibrated** —
both named. Provenance **`spacing_gravity_engine_v1`** at confidence **≤0.6** — above pending,
below `engine_modeled`. Same discipline as deterrence; it does not pretend to be tracking. It
produces `spacing_gravity` only — `rim_gravity` stays honestly pending for a future engine.

## 3. Stat vector consumes it

`spacingGravityStatOverrides(out)` upgrades `spacing_gravity` from the default `pending_engine`
placeholder to `spacing_gravity_engine_v1` explicitly — no silent rewrite. The pending count
drops for **spot_up_wing, low_usage_specialist, and connector** when the engine is applied.

## 4. Pressure Lab confesses

The lab summary now carries `spacingGravityEngine { exists, upgradedArchetypes, pendingBefore,
pendingAfter }` and `limitations { registrySize, scenariosWithLimitations, blockers,
bySeverity }`. The centerpiece check asserts **every passing scenario still confesses
limitations** and a **deployment blocker is present despite the green suite**. Deterrence
remains intact alongside spacing gravity.

---

## Checks

Strict `tsc` clean. New `limitation-registry` **13**, `spacing-gravity-engine` **12**; `stat-par`
**18 → 19** (spacing upgrade path); `composite-verdict` **20** (spacing cap); `pressure-lab`
**27 → 32** (spacing upgrade, deterrence intact, registry, scenario confession, deployment
blocker). All existing suites green; scoring math byte-stable; product path uncontaminated
(composite `applied:false`, bridge read-only, live verdict untouched).

## Out of scope (held)

Deploy; live graduation; measured-looking spacing gravity; hiding limitations because the suite
is green; public Pressure Lab; mutating the live verdict.

## Pressure Lab arc (capped)

- **11J — Limitation Registry & Spacing-Gravity Engine v1** ✓
- 11K — React Pressure Lab Route & Browser Pixel Pass
- 11L — Internal/Staging Hardening & Protected Deployment
- 11M — Shadow Graduation Readiness Review

Then the arc stops. Internal/staging becomes realistic after 11K (assuming the React route and
pixel pass are clean); public remains a later trust event.
