# Phase 11D — Deep Positional Archetype Taxonomy & Modeled Self-Reads

The archetype layer is the translation layer — *"the archetype translates it."* So it can't
be the generic part of an otherwise precise system. Phase 11D turns it into a calculated,
multi-axis taxonomy the Pressure Lab consumes, honest about what it understands and what it
still has to learn.

> **Court Handicap knows what kind of basketball language it understands and what language it still has to learn.**

---

## 1. What was built

- **`lib/audit-universe/archetype-registry.ts`** — a deep, multi-axis registry of **58
  archetypes** across all 8 families (guard, wing, forward, big, star, defense, connector,
  specialist). 17 self-checks.
- **`lib/audit-universe/archetype-impact-matrix.ts`** — rewritten to be **registry-driven**:
  it reads each archetype's declared lever and computes the engine-backed impact; coverage
  rolls up by family × status. 22 self-checks.
- **`pressure-lab.ts`** — unchanged API, now reporting the registry-wide coverage. 13 checks.
- **`design/pressure-lab-cockpit.html`** — extended with the taxonomy-by-family rollup.

---

## 2. The multi-axis schema

Every archetype carries: `family`, `primaryFunction`, `secondaryFunctions`, an **axes**
object (usage band, creation, shot diet, spacing gravity, rim/screen/passing function,
defensive role, rebounding role, transition role, pace impact, lineup dependency, opponent
dependency), **impact levers** (own-team and/or opponent — signal, push direction, measured
metric, expected sign, rationale), **proof expectations**, **confidence vulnerabilities**,
and an 8-field **per-direction status** block: `selfRead · ownTeamImpact · opponentImpact ·
proof · confidence · renderState · teamX · teamY`. Status vocabulary: `modeled · partial ·
signal_proxy · fixture_estimate · stubbed · missing · not_applicable`.

A player is no longer one label — a stretch big and a rim protector are both "big" but carry
opposite spacing gravity, opposite levers, and different proof expectations.

---

## 3. The honesty line (what "promote" means here)

The brief forbids fake modeled reads — so promotion is honest:

- **Modeled self-read:** only `scoring_guard` and `rim_protector`. Nothing else claims it.
- **Promoted to engine-tested `signal_proxy` impact (self-read stays a fixture estimate):**
  spot_up_wing, movement_shooter, stretch_big (spacing); connector, screen_assist_big,
  roll_big, low_usage_specialist (synergy/fit); secondary_creator, high_usage_star (burden);
  defensive_stopper (opponent POA); rim_protector (opponent rim). **11 archetypes carry an
  engine-tested impact** beyond the lone modeled pair.
- **Scaffolded (named, status `missing`):** 46 archetypes — visible gaps, no fake levers.

Registry self-read status: **2 modeled · 10 fixture-estimate · 46 missing.** The lab confesses
its own coverage; that confession is part of the product.

A notable honest result: `high_usage_star` is modeled as a **tradeoff** — raising creation
burden compresses a secondary guard's fit (the engine-tested direction is fit *down*), so it
is explicitly *not* marked as "helping." The matrix records the direction that matches the
basketball theory, not a flattering one.

---

## 4. Coverage by family (engine-computed)

| family | total | modeled self-read | engine-tested impact | scaffolded (missing) |
|---|---|---|---|---|
| guard | 10 | 1 | 1 | 8 |
| wing | 9 | 0 | 2 | 7 |
| forward | 6 | 0 | 0 | 6 |
| big | 11 | 1 | 4 | 7 |
| star | 5 | 0 | 1 | 4 |
| defense | 5 | 0 | 1 | 4 |
| connector | 5 | 0 | 1 | 4 |
| specialist | 7 | 0 | 1 | 6 |

Forwards are the most under-covered family (0 modeled, 0 impact) — named, not hidden.

---

## Checks

Strict `tsc` clean. New suite `archetype-registry` **17**; `archetype-impact-matrix` grew
**20 → 22** (registry-driven). All existing suites green; canonical math byte-stable; no
product path contaminated (the registry/lab is read-only and never imported by the product).

## Out of scope (held)

Fake modeled reads, collapsing archetypes into one proxy (each declares its own
lever/metric/proof), public Pressure Lab UI, deploy, coefficient overfitting, polishing the
cockpit beyond the taxonomy.

## Parked / next

- Promote fixture-estimate self-reads to **modeled** (real archetype-court translation for
  roll_big, spot_up_wing, connector, defensive_stopper, stretch_big, screen_assist_big).
- Wire the **forward** family (0 coverage) and the 46 scaffolded archetypes' levers.
- Per-archetype **distinct** levers (a connector's turnover-relief vs a wing's spacing) and
  **multi-axis combination** (primary + secondary archetype layering).
- Wire `proofExpectations` / `confidenceVulnerabilities` to the actual proof + confidence
  engines (today they are declared vocabulary, status `stubbed`).
- The React cockpit route + the **browser pixel pass** — the open gate before internal deploy.
