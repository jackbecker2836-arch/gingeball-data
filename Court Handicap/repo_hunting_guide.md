# Repo Hunting Guide — Finding Public Code for the TCV / xPTS Build

**Date:** 2026-06-22
**Companion to:** `tcv_component_upgrade_blueprint.md` and `rapm_epm_improvement_assessment.md`
**Purpose:** a hunting checklist for public code to use as **reference**, not as a drop-in model.

---

## How to use this (read first)

You are not looking for a finished model. A public repo that already did all of this at your
target quality does not exist — and if it did, using it would erase your edge. You are looking
for **reference implementations of specific techniques** so you don't reinvent the mechanical
parts (stint-matrix assembly, ridge/NNLS fitting loops, logistic shot models, shrinkage) and
can spend your effort on the modeling judgment that is actually yours.

**The workflow for every repo you find:**
1. Read it to understand the *method* and the *feature engineering*.
2. Note what data shape it assumes (it won't match your `raw_pbp` schema).
3. Reimplement against your own schema. Do **not** fork-and-pray.
4. Weight it by whether it **validates** anything (see the rubric at the end). Code that fits a
   model and never checks it against ground truth shows mechanics, not judgment.

**A recurring theme below:** the soccer analytics community (xG / xT / VAEP) has *better-engineered,
better-validated* public code for value-over-expectation methods than basketball does. Do not skip
those because they're the wrong sport — the math transfers directly and is what you're after.

**Note on repo names:** named repos/tools below are well-known open-source projects, but availability
and maintenance change. Treat each name as a search term to verify, not a guaranteed live link.

---

## 0. What your existing data changes (READ BEFORE HUNTING)

Your `gingeball-data` repo already contains the **inputs** — and in several cases pre-computed
**outputs** — that most of the repos below exist to produce. That collapses the hunt. The new
rule: **don't hunt for code that builds a feature you already have a column for.** Hunt only for
the *methods* your data can't hand you (RAPM fitting, constrained weight calibration, EB shrinkage,
and — future — tracking-based movement models).

**Map of what you have → what it removes from the hunt:**

| Blueprint piece | You already have | Effect on the hunt |
|---|---|---|
| **xPTS** (keystone) | `2425shotstotals` (~27k per-shot rows: X, Y, Distance, ShotQuality, CatchAndShoot, WideOpen, shot-clock, Made, Value); `2425trackingshottotals` (make rates by close-def-dist × clock × touch × dribble) | **§2 largely cancelled.** You don't need a shot-quality repo for features or data — you have a per-shot set richer than most repos *start* with. Build xPTS on your own file. Hunt only *calibration technique* (optional). |
| **xPTS validation** | `ShotQuality` column; `toughshotmaking` `p_exp/l_exp eFG%` | Use the pre-computed `ShotQuality` as a **validation anchor for your own model**, not as the keystone itself (see caution below). |
| **PVA** | per-shot `PassFromPlayerId/PassFromX/PassFromY/Assisted`; `passes2425` (adj/secondary/potential ast, ast_pts) | **§4 PVA largely cancelled.** You can compute "shot quality created by the pass" directly. socceraction/xT become *optional method reading*, not needed inputs. |
| **SGV (gravity)** | `_lineups.csv` stints + `_tp.csv`; lineup files | Still needs on/off shot-quality work, but you have the grain. No repo needed — it's your VOE template on your data. |
| **DSV** | `shotdif2425` (defender's eFG suppression vs expected, by zone) | **§5 DSV mostly pre-built.** This *is* the DSV core at player-season grain. Use it; defensive repo hunt nearly moot for v1. |
| **RPV** | `2425def` (Def Rim FGM/FGA/FG%); per-shot `BlockPlayerId` | RPV inputs in hand. No repo needed. |
| **Leverage / Context Difficulty** | `team{score,misc}{VHL,HL,ML,LL}2425` | Blueprint §1.2 leverage-weighting has a real source. No hunt. |
| **Pressure axis** | `_tp.csv` `advantage_count`/`true_possession_points`; `pbp_advantage_all_seasons.creation_rate` | No box-score equivalent — your strongest novel signal. No repo produces this; it's yours. |
| **Touches/movement features** | `2425totals` (76-col tracking), drives/elbow/paint/post, `poss`, speed/distance (miles) | MIV *proxies* buildable now; full cut-detection still needs coordinate tracking (future, §8). |

**What this does NOT change (still pure method hunts — these get relatively MORE important):**
- **RAPM fitting** (§3) — no CSV gives you this; build from your stints. hkerkevin + pbpstats still relevant.
- **NNLS / constrained weight calibration** (§6) — fitting `Σwᵢ·Cᵢ ≈ RAPM`. Generic, still needed.
- **Empirical-Bayes shrinkage** (§7) — the rigorous UP. Baseball references still the move.
- **Tracking movement models** (§8) — MIV's real version. Future.

**Three honest cautions about leaning on the pre-built columns:**
1. **`ShotQuality`, `p_exp/l_exp eFG%` are third-party model outputs** (pbpstats / Second-Spectrum-style). Fine as a starting proxy or validation anchor — but if your keystone is someone else's black box, it isn't controllable or extendable, and "owning the pipeline" was half the edge thesis. **Recommendation: build your own xPTS on the per-shot file, then check it against `ShotQuality`.** Where they agree, you're calibrated; where they disagree, you've found something. Use theirs to grade yours, not to replace yours.
2. **Grain mismatch.** Many convenient CSVs are *player-season aggregates*; the blueprint's VOE wants *possession/shot grain*. The per-shot (`2425shotstotals`) and per-possession (`_tp.csv`) files are the ones that enable true possession-level modeling. Don't let the convenient season tables pull you off the grain where the real work lives.
3. **The `*_proxy` columns in `component_master` are exactly what you're replacing.** `pva_proxy`, `dsv_proxy`, etc. are the current rank-normalized proxies the blueprint upgrades. Never validate a new real metric against the old proxy — that's circular. Validate against RAPM and against the no-box-score-equivalent outcomes (`advantage_count`, lineup pts/poss).

**Net:** your data asset is unusually deep, which sharpens the earlier point — your bottleneck is **not** data acquisition, it's the modeling discipline. The residual hunt is small and specific: RAPM, calibration, shrinkage, and (later) tracking. Everything shot/pass/defense-*feature* is already in your hands.

---

## 1. Search mechanics (make GitHub search actually work)

GitHub's keyword search is literal and weak. Improve hit rate with:

- **Filter by language + recency:** append `language:Python`, sort by *Recently updated*.
  Basketball repos rot fast as data sources change — a 2019 repo may target dead endpoints.
- **Search topics, not just code.** Topic pages are curated and higher-signal:
  - `github.com/topics/nba-analytics`
  - `github.com/topics/basketball-analytics`
  - `github.com/topics/sports-analytics`
  - `github.com/topics/sports-data`
  - `github.com/topics/expected-goals`
- **Use the fork/star graph.** Open a known-good repo (e.g. the RAPM reference), look at who
  **starred** and **forked** it — neighbors in that graph are usually the other serious attempts.
- **Search "awesome" lists** for curated link dumps:
  - `awesome-sports-analytics`, `awesome-nba`, `awesome-basketball`, `awesome-soccer-analytics`
- **Code search for a distinctive function/term**, not a concept:
  - search `def rapm`, `ridge_alpha`, `stint matrix`, `expected_points`, `np.linalg.lstsq`
- **Paper-to-code route** (often the highest quality):
  - Search **Papers With Code** for "expected possession value", "deep RAPM", etc.
  - Search GitHub for a paper's exact title or author surnames.
  - MIT **Sloan Sports Analytics Conference** and **NESSIS** papers frequently link a repo.

---

## 2. xPTS — the keystone (build this first)

> **⚠ DOWNGRADED by §0.** You have `2425shotstotals` (per-shot X/Y/dist/contest/clock/made/value).
> Build xPTS on your own file; validate against the existing `ShotQuality` column. The searches
> below are now **optional** — useful only for *calibration technique* and feature ideas, not for
> data or a base implementation you'd adopt.

Most of your components depend on it (IIB, PVA, SGV, MIV, DSV, DPC, RPV). Build it before anything else.

**Basketball search terms:**
- `nba expected points model`
- `expected field goal percentage nba` / `nba shot quality model`
- `expected points per shot` / `xPPS basketball`
- `nba shot make probability` + try both `logistic` and `xgboost` / `gradient boosting`
- `nba shot chart model` (many are viz-only — skim for the *model*, ignore the plots)
- `nba shot value` / `points per shot location`

**Soccer analog (read at least one — methodology is identical):**
- `expected goals model` / `xG model python` — logistic/GBM on location/angle/distance features.
  Far more mature than xPTS repos; copy the feature-engineering and calibration pattern.
- terms: `xG calibration`, `expected goals xgboost`, `statsbomb xg`

**What you're reading for:** feature construction (zone, distance, shot clock, dribbles,
catch-and-shoot vs pull-up, defender distance if present), model choice, and **calibration**
(reliability curves) — not their data loader.

**Tooling you'll reuse:** `scikit-learn` (LogisticRegression, GradientBoosting), `xgboost` /
`lightgbm`, `sklearn.calibration` (CalibratedClassifierCV, calibration_curve).

---

## 3. RAPM — the impact anchor

**Core search terms:**
- `RAPM nba` / `regularized adjusted plus minus`
- `ridge regression plus minus basketball`
- `adjusted plus minus python`
- `nba stint data` / `nba possessions stint matrix` / `nba lineup data RAPM`
- `nba on off rating`

**Known reference (already assessed this project):**
- `player-impact-model` (the hkerkevin repo) — clean working RAPM pipeline: stint building,
  ridge fit, reads NBA CDN JSON. Your best single basketball reference for the engine.

**Possession / lineup libraries worth knowing (reference for possession logic):**
- `pbpstats` (a.k.a. PBPStats / pbpstats) — Python library purpose-built for play-by-play
  **possessions and lineups with on/off**. Even though you have your own scraper, its possession-
  parsing and lineup-state logic is the best public cross-check for your stint reconstruction.
- `nba_api` — the standard NBA Stats endpoint wrapper (Python). Not for ingestion (you scrape BBRef),
  but its parsing of box/PBP/tracking endpoints is a reference, and useful for *validation* data.
- `py_ball` — another NBA Stats wrapper; alternative parsing reference.
- `hoopR` / `sportsdataverse` (R + Python) — large CBB/NBA data ecosystem; good for bulk validation pulls.
- `nbastatR` (R) — mature; read for feature ideas even if you don't use R.

**Bayesian / prior-informed RAPM (your Eq 5.2 — IIB_box as prior):**
- `bayesian RAPM` / `prior informed RAPM` / `bayesian plus minus`
- `pymc basketball` / `stan basketball` / `hierarchical model nba`
- Tooling: `PyMC`, `cmdstanpy` / `stan`, or a fast ridge-with-prior via `scikit-learn` /
  `statsmodels` (a Bayesian ridge is a prior-mean shift on the penalty — you may not need full MCMC).

**Multi-season / aging:** `nba aging curve`, `multi season RAPM`, `player aging model` (baseball
has the best aging-curve code — see §7).

---

## 4. PVA & SGV — passing / shot-creation (offense)

> **⚠ DOWNGRADED by §0.** Your per-shot file carries `PassFromX/PassFromY/Assisted`, so PVA's core
> ("shot quality the pass created") is buildable directly. Treat the soccer action-value repos below
> as *optional methodology reading* (the cleanest public statement of the VOE pattern), not as inputs.

**Basketball:**
- `nba passing value` / `nba playmaking model`
- `expected assists nba` / `xAST basketball`
- `nba secondary assist` / `hockey assist`
- `nba on off shot quality` (for SGV's gravity residual)

**Soccer analog — this is where the best code lives:**
- `expected threat` / `xT` (Karun Singh's expected-threat is the canonical implementation) —
  the "value of advancing the ball to a location" idea is exactly PVA/SGV. Read it.
- `VAEP` / `socceraction` (Decroos et al.) — **valuing actions by expected possession-value change.**
  This is the single best public reference for the entire value-over-expectation template in your
  blueprint (§1.3). Worth reading even though it's soccer.
- `expected possession value` / `EPV` (basketball original: Cervone et al. — find the paper, then its code).

**Tooling:** `socceraction` package, `mplsoccer` (viz only), `scikit-learn`.

---

## 5. DSV, DPC, RPV — defense

> **⚠ DOWNGRADED by §0.** `shotdif2425` already gives defender eFG-suppression-vs-expected (DSV core)
> and `2425def` gives Def Rim FG% (RPV input). For a v1 you can build straight from these. The searches
> below are a thin field anyway — keep them only for DPC's team-positioning residual if your own on/off
> work needs a reference.

**Search terms:**
- `nba defensive rapm` / `defensive plus minus`
- `nba matchup data` / `nba defensive matchup` (for DSV assignment difficulty)
- `nba rim protection` / `rim deterrence` / `opponent fg% at rim`
- `nba shot defense` / `defended field goal percentage`
- `nba defensive on off` (for DPC's team shot-quality suppression residual)

**Honest note:** public defensive modeling is the weakest area in basketball analytics — partly
because the good version needs matchup/tracking data. Expect thinner pickings here; lean on your
own VOE template (opponent xPTS − actual) rather than hoping for a clean repo.

---

## 6. Calibration & weight-fitting (blueprint §5.2)

Fitting `Σ wᵢ·Cᵢ ≈ RAPM` with sign/non-negativity constraints is generic ML, well-covered:

- `non negative least squares python` → `scipy.optimize.nnls`
- `constrained linear regression sklearn` / `scipy minimize bounds`
- `ridge regression cross validation` → `sklearn RidgeCV`
- `lasso feature selection` (if you want to prune redundant components)
- For the orthogonalization/residualization (§5.1): `partial regression`, `residualization`,
  `gram schmidt regression`, `statsmodels OLS resid`.

---

## 7. UP — empirical-Bayes shrinkage (the rigorous Uncertainty Penalty)

The best public shrinkage code is in **baseball**, where it's standard. The method is sport-agnostic.

- `empirical bayes shrinkage` / `james stein estimator`
- `beta binomial regression baseball` (Dave Robinson's tutorials/code are the canonical teaching ref)
- `marcel projections` / `regression to the mean baseball`
- `pybaseball` (data + some modeling) — read for the shrinkage idiom
- Tooling: `scipy.stats`, `statsmodels`, `pymc` (for full hierarchical shrinkage)

**Concept to copy:** reliability = n/(n+k), shrink toward an archetype prior, propagate variance.
This is the same machinery as your Bayesian RAPM prior — build it once, reuse in both places.

---

## 8. MIV / SAV / PTV / CFP — gated components (future)

These need tracking data (MIV) or multi-season play-type splits (SAV/PTV/CFP). Lower priority,
but seed the hunt now:

**Tracking data & models (your future GPU/film phase):**
- `nba movement data` / `nba tracking data` / `sportvu`
- `nba-movement-data` (linouk23 repo — well-known SportVU sample dataset + animation code)
- `second spectrum nba` / `player tracking nba github`
- `basketball trajectory model` / `nba GNN` / `graph neural network basketball`
- `nba gravity` / `off ball value nba`
- Sloan/NESSIS papers on tracking → follow to code.

**Play-type / context splits (SAV, PTV, CFP):**
- `nba play type synergy` / `nba playtype data`
- `nba playoff vs regular season` / `playoff translation`
- `herfindahl concentration` (generic — for CFP/SAV concentration index; trivial to implement)

---

## 9. Data-source & scraper references (you're past this, but for cross-checks)

You already have a validated scraper. These are only for **validation pulls** and parsing ideas:
- `basketball reference scraper` / `bbref scraper python`
- `nba_api`, `py_ball`, `pbpstats`, `hoopR`, `nbastatR` (all listed above)
- `basketball_reference_web_scraper` (a known standalone BBRef scraper package)

Use these to pull an independent copy of, say, box-score minutes to reconcile against your stint
minutes (the `--validate` idea) — not to replace your pipeline.

---

## 10. General ecosystem / curated lists

- `github.com/topics/nba-analytics`, `/basketball-analytics`, `/sports-analytics`
- `awesome-sports-analytics`, `awesome-nba`, `awesome-soccer-analytics`
- **Papers With Code**: search "basketball", "expected possession value", "player tracking".
- Communities that post code: r/NBAanalytics, APBRmetrics forum, Sloan/NESSIS proceedings,
  StatsBomb open-data ecosystem (soccer, but the modeling repos around it are gold for VOE methods).

---

## 11. Priority order (match your build order)

1. **xPTS** (§2) — keystone. Look at NBA shot-quality repos + one good xG repo.
2. **RAPM engine** (§3) — hkerkevin + pbpstats for possession/lineup logic cross-check.
3. **VOE template** (§4) — read `socceraction`/VAEP + `expected-threat` once; it frames PVA/SGV/DSV/DPC.
4. **Calibration & NNLS weights** (§6) — generic scipy/sklearn, fast.
5. **EB shrinkage** (§7) — baseball references; doubles as your RAPM prior.
6. **Tracking + context** (§8) — seed now, build after the first full model loop.

---

## 12. Rubric — is a repo worth borrowing from?

Score each candidate; borrow from the high scorers, skim the rest:

- **Does it validate?** Out-of-sample test, calibration curve, or check vs a known truth? If it
  only *fits* and never *checks*, it's plumbing, not judgment. (Biggest single filter.)
- **Is the feature engineering visible and sane?** You're often there for the features, not the model.
- **Is the data shape adaptable?** Closer to event/possession-level = easier to map to your schema.
- **Recency / maintenance.** Updated in the last ~2 years, or targeting dead endpoints?
- **License.** MIT/Apache/BSD = safe to read and adapt. GPL = be careful about copying code verbatim
  into a closed product; reading to learn the method is fine, lifting code is not. When in doubt,
  reimplement from understanding rather than copy.
- **Readability over stars.** A clean 200-line repo you fully understand beats a 5k-star framework
  you can't adapt.

**The meta-point:** RAPM is a commodity, xPTS is well-trodden, shrinkage is standard. None of the
*techniques* are your edge. Your edge is the **discipline** — components that explain *and* are held
accountable to measured impact, validated obsessively. Read these repos for the mechanics, then build
the judgment yourself. That's the part nobody can hand you.
