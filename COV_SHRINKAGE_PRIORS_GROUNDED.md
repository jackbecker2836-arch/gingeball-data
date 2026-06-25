# COV Shrinkage — Grounded Prior Options (pick per concept)

All numbers below are computed from the **corrected** creation-based COV (current model,
published, 2021–2025) plus the `pass20xx` creation files. Nothing here is hand-set.
COV is the #1 standings mover, so these priors move rankings — choose deliberately.

Posterior (per the framework):
`bayesian_COV = w·observed + (1−w)·prior`, `w = priorSD² / (priorSD² + SE²)`.

---

## A. Shared grounded foundation (used by every concept below)

**A1. Role prior means + base SD (family bucket — the usable role dimension; archetype is unique-per-player, unusable):**

| family | prior mean | base SD | n |
|---|---|---|---|
| star | +4.71 | 3.43 | 100 |
| guard | +1.59 | 2.73 | 335 |
| connector | +1.05 | 2.62 | 269 |
| specialist | +0.18 | 3.11 | 223 |
| defense | −0.24 | 2.64 | 181 |
| forward | −1.04 | 2.33 | 182 |
| big | −1.12 | 2.28 | 380 |
| wing | −1.28 | 2.25 | 307 |
| (unlabeled fallback) | −0.28 | 2.11 | 829 |

Position fallback when family missing: G +2.25 (SD 3.50), W +0.19 (2.83), B −0.34 (3.14).

**A2. Empirical reliability of COV (the single most important grounded fact):**
year-over-year r = **0.765** (n=1330 player-pairs); between-player variance 8.15 of 10.58 total
⇒ signal share ≈ 0.77, full-season noise SD (SE) ≈ **1.56**.
**Implication: COV is a reliable signal — default shrinkage should be LIGHT.** The doc's
illustrative w≈0.33 would discard real signal; grounded default w≈0.77.

**A3. Sample-size SE scaling** (SE(n) = 1.56·√(2908/n), 2908 = median possessions):

| possessions | example | SE | w (priorSD 2.85) |
|---|---|---|---|
| 873 (p10) | deep bench | 2.85 | 0.50 |
| 1666 (p25) | rotation | 2.06 | 0.66 |
| 2908 (p50) | starter | 1.56 | 0.77 |
| 4789 (p90) | high-usage star | 1.22 | 0.85 |

---

## B. Per-concept prior options

For each concept: the prior MEAN is the family baseline (A1) adjusted by the concept's
context signal; the SD and weight come from A2/A3. Options vary the anchor, the SD rule,
and the shrinkage strength. **Bold = grounded default.** "needs-assembly" = the context
signal requires team/tracking data not yet in the corrected DB (flagged honestly; the
mean/SD/weight scaffolding is still grounded).

### COV-3 — Assist-inflation (FULLY GROUNDED NOW)
Context signal = assist conversion (Ast / Potential Ast). League pooled **0.558**, nearly
flat by role (0.543–0.559; bigs 0.593 but noisy). Between-player conversion SD: stars 0.044
→ bigs 0.122. Beta-binomial: `posterior_conv = (potAst·obs + k·prior)/(potAst + k)`.
Options for (prior, k):
1. **prior=0.558 league-flat, k=49** (k from pooled between-player var) ← grounded default
2. prior=family-specific (big 0.593, others ≈0.554), k=49
3. prior=0.558, k=80 (stronger pull — for noisy low-potAst players)
4. prior=0.558, k=25 (lighter pull — trust observed sooner)
5. prior=family, k=family-specific (tight for stars, loose for bigs: k≈260 stars→33 bigs)
6. two-stage: shrink conversion (opt 1) AND cap its COV contribution at league mean
7–10. grid of k ∈ {15, 35, 60, 100} at prior=0.558 for sensitivity sweeps.
Note: because conversion is role-flat, this concept mostly corrects *low-sample* players,
not whole roles — expect small movement except for low-potAst bigs.

### COV-10 — Role scalability (GROUNDED NOW via family)
Primary-creator prior = star/guard means (+4.7 / +1.6); secondary-creator prior =
connector/specialist means (+1.1 / +0.2). `scalability_delta = posterior_primary − posterior_secondary`.
Options:
1. **two priors: primary N(+3.1, 3.0) [star+guard blend], secondary N(+0.6, 2.8)** ← default
2. four-tier by exact family mean (star/guard/connector/specialist)
3. usage-gated: assign primary prior only above a possessions/usage threshold (p75)
4. continuous: prior = family_mean + β·(usage − role_median_usage)
5–10. vary the primary/secondary SDs (2.5 / 3.0 / 3.4) × blend weights.

### COV-1 — Hub team-validation (needs-assembly: team/halfcourt/top-D ORtg)
Mean = family baseline + β1·team_ORtg_pct + β2·halfcourt_pct + β3·topD_pct − β4·turnover_burden;
`priorSD = base_SD / (1 + HubResponsibilityIndex)`.
Grounded scaffolding: base_SD from A1; the total adjustment should stay within the
between-player SD (2.85) so validation can't swing a player more than ~1 role-tier.
Options (β-budget, fractions of 2.85): **(1) ±0.5·SD max swing, responsibility-scaled SD** ←default;
(2) ±0.33·SD; (3) ±0.75·SD; (4) symmetric (reward good teams as much as penalize);
(5) penalty-only (never reward); (6) SD fixed at 2.5; (7) SD = base/(1+HRI); (8) SD = base/(1+2·HRI);
(9) weight forced ≤0.6 for hubs; (10) weight from A3 possessions only.
→ I still need team ORtg per player-season (derivable from `teampass`/possessions files); say the word and I assemble it.

### COV-2 — Empty-control guard (needs-assembly: time-of-poss, dribbles, late-clock FGA)
Same scaffolding; signal subtracts an Empty-Control Index. Options mirror COV-1's β-budget
and SD set (10 calibrations). Input lives in touch/tracking files (2023+ only) → partial coverage; honest flag.

### COV-6 — Turnover burden (needs-assembly: TO data; present only in 2021ALL + tracking)
Options: subtract β·turnover_rate from family mean, β-budget {0.25,0.5,0.75}·SD ×
SD rules ×weight rules. Only 2021 has full TO coverage in repo; others partial.

### COV-7 — Shot-quality vs assist-count (needs-assembly: expected pts after pass)
`pbp_advantage` has shot_quality/PtsAssisted but single-season only → flag coverage.
Options: reward β·xPTS_created, penalize γ·assist_count_inflation; 10 β/γ grid points.

### COV-8 — Top-defense validation (needs-assembly: value vs top-10 D from matchup files)
Matchup spine (`RSMATCHUP20xx`) exists every season → assemblable. Options: prior =
0.5·role + 0.3·vs_topD + 0.2·high_leverage, with 10 weight-triplet calibrations.

### COV-9 — No-engine lineup (needs-assembly: on/off from pbp_data lineups)
`pbp_data.zip` lineups exist (2020-21 confirmed) → assemblable but heavy. Options: shrink
toward dependency prior by β·star_overlap; 10 β/SD calibrations.

### COV-4 (bad-spacing protection) / COV-5 (grenade-created)
Both need lineup-shooting / late-clock pass-quality data (pbp). Lower priority; scaffold
ready, signal needs pbp assembly.

---

## C. Recommended sequence
1. Ship COV-3 + COV-10 now (fully grounded, small controlled movement).
2. Assemble team ORtg → COV-1 (biggest conceptual lever for hubs).
3. Matchup spine → COV-8; pbp lineups → COV-9; tracking → COV-2/6/7.
Every concept inherits the A2/A3 weight (light, reliability-based) unless you choose heavier.

## D. The one decision that dominates all others
Pick the global shrinkage stance:
- **(default) Reliability-grounded light shrinkage** w≈0.77, possession-scaled (0.50–0.85). Respects that COV is 76% real.
- (alt) Doc-style heavy shrinkage w≈0.33. Much more prior-driven; will compress the board toward role means and move rankings a lot.
- (alt) Hybrid: light for high-possession, heavy floor for sub-p25 samples.
