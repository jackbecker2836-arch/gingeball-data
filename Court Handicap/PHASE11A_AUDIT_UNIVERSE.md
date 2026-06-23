# Phase 11A — Full-System Synthetic Audit Universe

Phase 10 made the court alive. Phase 11 makes the system harder to fool. This is the
lab: a synthetic basketball world, labeled synthetic on purpose, that audits the whole
chain from odds to verdict.

> **Court Handicap behaves like Court Handicap in a fake world built to challenge it.**

A lab, not a feature. Not public-facing. Never read as real.

---

## 1. What was built (layer over the existing universe)

The engine-chain audit already existed: `fixtures/court-handicap-audit-universe.ts`
(12 scenarios, all `synthetic_audit_fixture`) flowed through the real engines by
`lib/audit-harness.ts` (27 checks). Phase 11A adds the layers **above** the engines and
ties them together — without new fixtures and without touching the product path:

- **`lib/audit-universe/expectations.ts`** — the 13 named **integrity gates** (the
  full-chain behaviors the world must not break), each tagged with the layer it spans.
- **`lib/audit-universe/audit-runner.ts`** — a full-system runner that maps each gate to
  a concrete assertion against the *real* chain (engines via `runScenario`, source/UI via
  `sourceStateBadge`/`winProbabilityLabel`, view via `buildManifestView`/`rebuildWithMarket`,
  motion via `motionLockHeld`, provenance), and folds in the 27-check engine suite as one
  consolidated gate. **14 passed / 0 failed** (13 gates + engine-chain).

---

## 2. The integrity gates (all green)

| gate | layer | what it proves |
|---|---|---|
| market_stable | market | the canonical par survives the chain (`marketPar ≈ 24.5`) |
| stale_stays_stale | source | a stale line is rust-toned + never reads live |
| fallback_never_live | source | a fallback never wears the trust tone or readsLive |
| missing_ml_no_winprob | source | a missing moneyline yields "— (no moneyline)", never an invented prob |
| lineup_moves_par | lineup | a different lineup moves `lineupPar` |
| archetype_differs_by_role | archetype | guard vs rim differ in difficulty **and** fit on the same court |
| same_court_two_truths | archetype | the same court is harder + worse-fit for the guard, easier + better-fit for the rim |
| thin_sample_lowers_confidence | confidence | a thin sample lands below the canonical confidence |
| strong_verdict_low_confidence | verdict | a BEAT verdict coexists with sub-HIGH confidence |
| whatif_no_overwrite | view | a what-if is flagged hypothetical and leaves the real state intact |
| synthetic_provenance_explicit | provenance | the audit marker is `synthetic_audit_fixture`, badge reads SYNTHETIC, never live |
| motion_lock_held | motion | the 2D motion lock holds under the full chain |
| no_product_contamination | provenance | the product view's layer provenances never include `synthetic_audit_fixture` |

---

## 3. The finding the lab produced (honest)

The gate first written as "hostile for one role and favorable for another" **failed** — on
the audit's base court the rim protector's difficulty is **56**, not below 50, so it does
not *cross* the favorable line there (it crosses on the product fixture's low-total court,
where the rim reads 43). Rather than fake the crossing, the gate was restated to the
inversion the engine genuinely demonstrates on this court — harder + worse-fit for the
guard, easier + better-fit for the rim — and **a court engineered to cross the
favorable/hostile line is parked as a named universe layer to add next.** The lab did its
job: it surfaced an over-claim in the test itself.

---

## 4. Provenance + no contamination

Every audit object confesses itself: `AUDIT_PROVENANCE = "synthetic_audit_fixture"`,
source "synthetic audit universe". The runner asserts the product default
(`buildManifestView()`) never carries that marker in any confidence layer — the lab and
the product path are provably separate. The runner only reads; it builds no product state.

---

## 5. Deployment posture (answer)

Not public yet. The honest sequence:

```
Phase 11A audit universe (green)  →  internal/staging deploy (protected route)
   →  browser pixel pass  →  fix truth issues  →  public deployment decision
```

Deploy **internally** when: the app builds, the audit universe passes, source/fallback/
provenance cases are covered, the UI labels synthetic/stale/fallback correctly, and a
protected route prevents public confusion. Deploy **publicly** only when the system
handles edge cases without lying, the copy matches capability, demo data is unmistakably
labeled, the visual system doesn't overclaim, and the core route is stable for outsiders.
Public deployment is a trust event, not a hosting event.

---

## Checks

Strict `tsc` clean. **553** self-checks green across 21 suites — new `audit-universe`
suite: **14** (13 gates + engine-chain consolidated; the engine-chain's own 27 still run
standalone too). Canonical math byte-stable. No product path contaminated; no engine,
grade, or fixture value moved.

## Out of scope (held)

Pressure Lab UI, public launch, overfitting coefficients to the synthetic world,
replacing existing unit suites or the product/archetype fixtures, making the lab read as
real.

## Parked / next (universe layers)

A genuine favorable/hostile **50-crossing** court for the rim; injured-starter and
late-lineup-change scenarios as first-class universe entries with par-delta assertions;
provider-failure + low-book-agreement as explicit source gates; extreme spread/total and
fast/slow pace courts; render-state expectations folded into the runner; then the
internal/staging deploy.
