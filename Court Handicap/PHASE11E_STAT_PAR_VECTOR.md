# Phase 11E — Multi-Stat Par Vector & Archetype-Specific Proof Wiring

11D gave the system a basketball vocabulary. 11E gives that vocabulary *evidence*: expected
same-role / same-court production across the categories that actually define each archetype —
not just points.

> **Court Handicap can say how a player beat the court, not just whether he scored above it.**

---

## 1. What was built

- **`lib/stat-par/stat-par.ts`** — the multi-stat par vector: 11 stat categories, 17 stats,
  9 archetype stat profiles, and `computeStatParVector()` producing expected/actual/delta/
  value-over-expected/confidence/provenance per stat plus a provenance-weighted composite.
  16 self-checks.
- **`pressure-lab.ts`** — now consumes the stat vector (summary reports the profiled set and
  a worked non-scoring example).

---

## 2. Categories and stats

Categories: scoring, shooting, creation, ball_security, rebounding, rim_defense,
perimeter_defense, screening, spacing, gravity, possession_value. Stats span points, fg3m,
rim_attempts, fta, assists, secondary_assists, turnovers, oreb, dreb, blocks, steals, fouls,
screen_assists, deterrence_events, rim_contests, spacing_gravity, rim_gravity.

Each stat result carries: **expected · actual · delta · valueOverExpected · confidence ·
provenance · relevance · valueWeight · proofStatus**, with **turnovers and fouls inverse**
(fewer than expected = positive value).

---

## 3. Provenance per stat (no hidden points-only model)

| provenance | used for | confidence |
|---|---|---|
| engine_modeled | scoring par (the real market/lineup par system) | 0.80 |
| synthetic_audit_fixture | box-score-like stats (assists, rebounds, blocks, steals, fg3m, fta, rim att, fouls, turnovers) | 0.55 |
| fixture_estimate | passing/screen tracking (secondary assists, screen assists) | 0.40 |
| pending_engine | deterrence, rim contests, spacing gravity, rim gravity (proxy, not measured) | 0.20 |

**Scoring par is the only engine-modeled stat.** Everything non-scoring is synthetic, fixture-
estimated, or pending — and the composite weights each stat's value-over-expected by its
provenance confidence, so a deterrence-driven grade is honestly *less certain* than a scoring
one. Proxy stats cannot masquerade as measured value.

---

## 4. Distinct profiles → non-scoring value, honestly

Each archetype declares which categories are primary / secondary / contextual; ignored stats
are excluded from the composite, so points can't dominate a non-scorer. Worked, engine-checked
examples:

- **rim_protector** beats the court with **no scoring stat in its vector** — deterrence 16/12,
  blocks 4/3, dreb 13/11, rim contests 12/9 → composite positive, headline `rim_defense`,
  `pointsDelta = null`.
- **connector** beats par with **points exactly at par** — assists 10/7, secondary assists
  6/4, turnovers 1/2 (fewer = good) → composite positive, `pointsDelta = 0`.
- **spot_up_wing** via spacing + shooting; **screen_assist_big** via screening + gravity;
  **defensive_stopper** via perimeter/rim defense.

The self-check `points is not the hidden master stat` asserts a non-scorer's composite is
positive with no positive points delta.

---

## Checks

Strict `tsc` clean. New suite `stat-par` **16**; `pressure-lab` grew **13 → 15** (consumes the
vector). All existing suites green; canonical scoring math byte-stable; product path
uncontaminated (stat-par is read-only synthetic, never imported by the product page).

## Out of scope (held)

A flat all-stats table; making every archetype care about every stat; valuing proxy stats as
engine-backed; collapsing non-scoring value into fake points; public UI; deploy; coefficient
overfitting.

## Parked / next

- Promote non-scoring stats from `pending_engine`/`synthetic` toward real models (deterrence,
  spacing gravity, screen assists) — each its own engine, each earning `engine_modeled`.
- Wire the stat vector into the actual verdict/confidence consolidation so non-scoring
  value-over-expected feeds the headline grade (today it's computed and asserted, not yet fed
  into the live verdict).
- Court-specific stat factors (a low-total grind should bend rebounding/deterrence
  expectations) instead of the single synthetic `courtFactor`.
- The React cockpit route + the **browser pixel pass** — the open gate before internal deploy.
