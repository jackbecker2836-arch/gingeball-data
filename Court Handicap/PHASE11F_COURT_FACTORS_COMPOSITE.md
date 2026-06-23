# Phase 11F — Court-Specific Stat Factors & Composite Verdict Integration

11E built the stat vector. 11F makes it court-aware and lets the composite *begin to speak* —
in shadow, provenance-limited, never louder than its evidence.

> **The stat vector begins influencing judgment without pretending all evidence is equally real.**

---

## 1. Court-specific stat factors

`lib/stat-par/composite-verdict.ts` adds `courtStatFactors(ctx)` — explicit, clamped,
synthetic-tagged multipliers that bend non-scoring expectations by court:

| court condition | effect on expectations |
|---|---|
| low total (≤200) | rebounding ×1.12, rim-defense ×1.12, possession volume ×0.9 |
| fast pace (≥225) | possession volume ×1.15, scoring ×1.06, shooting ×1.05 |
| high spacing-scarcity | turnovers (ball_security) ×1.15, guard rim scoring ×0.95 |
| high POA pressure | creation ×0.9, ball_security ×1.1 |
| high rim protection faced | scoring ×0.92 |
| high synergy | creation ×1.08, screening ×1.08, gravity ×1.05 |

Every factor is tagged `court_factor_synthetic` with a rationale — these are synthetic
*relationships*, not measured. A rim protector's rebounding bar is now genuinely higher on a
grind court than on a track meet, so beating it means more.

---

## 2. The composite verdict (shadow, provenance-limited)

`buildCompositeVerdict(archetype, court, actuals, scoringBeat)` produces three candidates side
by side:

- **scoringCandidate** — the existing engine scoring beat (the established truth).
- **statVectorCandidate** — the raw relevance/confidence-weighted stat composite.
- **compositeCandidate** — provenance-capped and pending-share-limited.

**Provenance caps** (contribution = relevance × cap × confidence × value-over-expected):
engine_modeled 1.0 · synthetic_audit_fixture 0.6 · fixture_estimate 0.4 · pending_engine 0.2 ·
missing 0.

**Pending cannot dominate.** When measured signal exists, total `pending_engine` contribution
is share-capped to ≤35% of magnitude — verified at `pendingShare ≤ 0.36`, and a measured stat
keeps the headline even against a 40-vs-9 pending spike. When pending is the *only* signal, the
grade still exists but is flagged `proxyDriven` and forced to a low confidence (≤0.3) — it
whispers, it doesn't command.

**Confidence never reads HIGH** while proxies are in the mix (clamped ≤0.7; ≤0.3 when
proxy-driven). **Every result is explainable**: top drivers (stat + category + contribution +
provenance + confidence) and a per-category beat readout ("rim-defense beat: strong,
rebounding beat: positive, scoring beat: neutral").

**Shadow.** `applied: false`, `mode: "shadow"` — the composite is computed and shown in the
Pressure Lab but never fed to the live verdict. Graduation is a later, separate decision.

---

## 3. Archetypes react differently by court (engine-checked)

rim_protector, connector, spot_up_wing, and defensive_stopper produce **four distinct
composites** on the same court, and the rim protector's composite differs between the grind and
the track meet. The Pressure Lab shows the triad for all four and asserts the shadow flag and
the pending guard hold.

---

## Checks

Strict `tsc` clean. New suite `composite-verdict` **20**; `stat-par` **16** (now court-aware);
`pressure-lab` grew **15 → 18** (shows the triad, asserts shadow + pending guard). All existing
suites green; scoring math byte-stable; product path uncontaminated (composite is shadow-only,
never imported by the product page).

## Out of scope (held)

Making proxy stats engine-modeled; replacing the live scoring verdict; public UI; deploy; fake
calibration; letting pending data drive a confident headline.

## Parked / next

- **Graduate the composite from shadow to live** once non-scoring provenance moves from
  synthetic/proxy to engine-modeled (the same discipline used for the graph→confidence coupling).
- Real engines for deterrence / spacing gravity / screen assists (retire `pending_engine`).
- Court factors driven by the real market/lineup engine outputs rather than a `CourtContext`
  the caller supplies.
- The React cockpit route + the **browser pixel pass** — the open gate before internal deploy.
