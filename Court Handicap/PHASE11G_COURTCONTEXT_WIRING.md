# Phase 11G — Real CourtContext Wiring & Scoring Beat Threading

The composite no longer lives beside the engine chain — it listens to it. 11G grounds the
shadow composite in the same market/lineup engines the verdict already runs, and threads the
real scoring beat into the lab triad. No graduation; the composite stays shadow.

> **The composite listens to the same court the verdict already listens to.**

---

## 1. CourtContext derived from the real chain

`lib/stat-par/court-context-source.ts` adds `deriveCourtContext(scenario)` — it **runs the
real engines** (`runScenario` → market + lineup) and builds the `CourtContext` from their
outputs and the signals/provenance they consumed:

| context field | source (real chain) |
|---|---|
| label | market engine `courtType` (output) |
| total | market snapshot total |
| pace | market engine `expectedPossessions` (output) → fast / neutral / slow |
| spacingScarcity | lineup spacing signal |
| poaPressure | opponent POA signal |
| rimProtectionFaced | opponent rim signal |
| synergy | lineup synergy signal |
| confidence | lineup engine `confidence` (output) |
| provenance | input provenance the chain used |
| sourceState | derived (live / synthetic_audit / fixture_fallback) |

The lab no longer hand-authors `{ total: 196, spacingScarcity: 0.7, … }`. The context exists
because the real court produced it.

---

## 2. The real scoring beat is threaded

`deriveCourtContext` also returns `scoringBeatPer100 = runScenario(...).beatLineup` — the genuine
engine scoring beat. The Pressure Lab triad now compares **real scoring-only beat** vs
stat-vector candidate vs composite candidate. No placeholder zero.

---

## 3. Provenance + confidence travel into the composite

`CourtContext` now carries `confidence`, `provenance`, and `sourceState`. `buildCompositeVerdict`
folds them in: a low-confidence lineup context multiplies the composite confidence down, and a
**stale or fallback source applies a 0.7 penalty**. So a provider-failure court (fallback) yields
a lower composite confidence than the clean court — source-state honesty travels all the way to
the shadow grade. The verdict now reports `contextConfidence` and `sourceState`.

---

## 4. Still shadow; caps still hold

`applied: false`, `mode: "shadow"` — unchanged. The provenance caps (engine 1.0 → pending 0.2),
the 35% pending share cap, and the proxy-driven low-confidence clamp all remain in force and are
re-asserted in the lab.

---

## Checks

Strict `tsc` clean. New suite `court-context-source` **9**; `composite-verdict` **20** (now
context-aware); `pressure-lab` grew **18 → 21** (context derived, scoring threaded, source
honest). All existing suites green; scoring math byte-stable; product path uncontaminated
(the translator runs the engines read-only over synthetic scenarios; nothing is written, and
the composite is never applied).

## Out of scope (held)

Graduating the composite live; removing shadow; making proxy stats engine-modeled; inventing
calibrated court-factor coefficients; a lab-only context hack; public deploy.

## Parked / next

- Derive `CourtContext` from the live product `buildManifestView` (not only synthetic
  scenarios), so the product court — not just the audit universe — feeds the composite.
- The graduation-from-shadow decision (only once non-scoring provenance moves from
  synthetic/proxy toward engine-modeled).
- Real engines for deterrence / spacing gravity / screen assists (retire `pending_engine`).
- The React cockpit route + the **browser pixel pass** — the open gate before internal deploy.
