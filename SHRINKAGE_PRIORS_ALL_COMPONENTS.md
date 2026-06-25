# Shrinkage Priors — All Components (Grounded)

Companion to `COV_SHRINKAGE_PRIORS_GROUNDED.md`. Same method: every number is computed
from the current-model published values (2021–2025) and the repo files — none hand-set.
Build order follows the empirical TCV-driver weights and each component's reliability.

## 0. The two grounded knobs that define every prior

**(a) Role prior mean + base SD** — by `family` (the usable role bucket). Per-component table in §2.
Fallback ladder when `family` is null: position (G/W/B) → global. ~829 player-seasons are unlabeled.

**(b) Shrinkage weight** — grounded in each component's year-over-year reliability r
(w_full ≈ r), then scaled by sample size: `w = priorSD²/(priorSD²+SE²)`, `SE(n)=SE_full·√(med_poss/n)`.

| component | reliability r | default full-season w | shrinkage stance |
|---|---|---|---|
| SGV | 0.903 | ~0.90 | very light |
| PVA | 0.842 | ~0.84 | light |
| DSV | 0.807 | ~0.81 | light |
| COV | 0.765 | ~0.77 | light |
| RPV | 0.688 | ~0.69 | light-moderate |
| IIB | 0.576 | ~0.58 | moderate |
| SAV | 0.536 | ~0.54 | moderate (near-zero weight metric) |
| DPC | 0.501 | ~0.50 | moderate |
| MIV | 0.305 | ~0.31 | **heavy** (noisiest component) |
| PTV | 1.000 | ~1.0 | none — deterministic/descriptive |

**Global stance chosen: light (reliability-based), possession-scaled.** Per-component, the
default w is just that component's r. MIV is the exception that genuinely needs heavy shrinkage;
PTV needs essentially none. This is the single most important grounded result: shrinkage
strength should track reliability, and it varies 3× across components.

## 1. The "10 options per concept" structure
For every sub-concept the option menu is the same shape, instantiated with that component's
grounded numbers:
- **Mean anchor** (4 options): family mean / position mean / family×usage / global.
- **Prior SD rule** (3): base_SD(family) / responsibility-scaled base_SD/(1+RI) / diversity-widened base_SD·(1+div).
- **Weight rule** (3): reliability-default (r) / possession-scaled / heavier floor below p25.
That's the up-to-10 grounded choices; the context signal (β·something) only changes the mean,
and its β is budgeted as a fraction of the between-player SD so no single context flag can move
a player more than one role-tier. Below I give each component's grounded numbers + which
sub-concepts are data-ready now vs need an assembly pass.

## 2. Per-component grounded role priors (mean / base SD) and readiness

### IIB (r=0.576, moderate; #2 driver) — star-skewed, high variance
Family mean/SD: star **1.64 / 1.84**, specialist 0.25/1.13, guard 0.13/1.00, connector 0.00/0.87,
wing −0.08/0.90, big −0.02/0.74, forward −0.14/0.91, defense −0.37/0.78.
Stars carry IIB and are wildly variable → exactly where shrinkage + sample-size matters.
- Data-ready now: IIB-3 tiny-lineup (sample/k), IIB-5 garbage-time (effective_poss), IIB-8/IIB-10 role-position & competition (matchup files exist every season).
- Needs assembly (pbp_data.zip on/off): IIB-1 star-overlap, IIB-2 opponent-luck, IIB-4 bench, IIB-6 no-center, IIB-7 collinearity, IIB-9 schedule. These are the RAPM/on-off backbone — heaviest lift, biggest payoff for the #2 driver.

### PVA (r=0.842, light; small SD) — guard/star tilt
star 0.74/0.52, guard 0.40/0.47, connector 0.18/0.46, specialist 0.04/0.53, defense −0.03/0.47,
forward −0.20/0.37, wing −0.23/0.32, big −0.28/0.32. Tight SDs → small movements.
- Ready now: PVA-2 assisted/unassisted rim split (pass files have assisted/adj), PVA-7 garbage-time, PVA-9 shooting-luck (shot files), PVA-10 responsibility.
- Needs assembly: PVA-1/4 endpoint & transition (pbp), PVA-3 FT-merchant (FT/whistle data partial), PVA-5 ORB putback (reb files — ready actually), PVA-6 pace, PVA-8 bench (pbp).

### MIV (r=0.305, HEAVY; #3 driver) — star 0.84/**1.70** else ≈0
star 0.84/1.70, specialist 0.15/1.04, forward 0.05/0.89, big −0.01/0.93, guard −0.01/0.85,
connector −0.03/0.83, defense −0.13/0.65, wing −0.14/0.92.
Lowest reliability of all → **default w≈0.31, this is the component most in need of shrinkage.**
Near-zero role means except stars ⇒ prior should pull almost everyone toward ~0 unless validated.
- Ready now: MIV-7 small-sample matchup, MIV-9 role-position, MIV-10 competition (matchup files).
- Needs assembly: MIV-1/2/3 useful-vs-empty motion, MIV-6 transition split, MIV-8 gravity-dependency (tracking + pbp). Until then, the heavy reliability-based shrinkage alone already fixes most MIV noise.

### SGV (r=0.903, very light; #4) — BIG-driven (screens/gravity)
big **1.15 / 0.91**, connector −0.07, defense −0.01, forward −0.16, specialist −0.30, star −0.36,
wing −0.40, guard −0.44. SGV is a big-man value; very stable → barely shrink.
- Ready now: SGV-1/5/7 shooting-% beta-binomial (corner/3P from shot & per100 files), SGV-8 low-volume, SGV-10 top-defense (matchup).
- Needs assembly: SGV-2 movement-shooter, SGV-4 star-overlap, SGV-6 non-shooter integrity, SGV-9 lineup redundancy (pbp/tracking).

### DSV (r=0.807, light; #5) — perimeter tilt, bigs negative
guard 0.31, wing 0.33, star 0.43, defense 0.17, forward 0.15, specialist 0.13, connector 0.09,
big −0.94/0.72. (DSV credits perimeter suppression; bigs sit low.)
- Ready now: DSV-1 easy-assignment & DSV-10 top-offense (matchup files), DSV-9 foul-rate (if foul data), DSV-7 no-center (pbp).
- Needs assembly: DSV-3 opponent-luck, DSV-4/5 block/steal gambler, DSV-6 protected roamer, DSV-8 rebounding support (pbp + shot luck).

### PTV (r=1.000, NONE) — deterministic translation
star 0.76, defense 0.19, connector 0.18, wing 0.15, guard 0.02, big −0.01, forward −0.13.
Perfectly reliable because it's a formula, not a noisy measurement. **No shrinkage needed**;
if anything, PTV-2 (playoff small-sample) is the only place a posterior helps, and only when
playoff data is the input. Weight-0 in TCV anyway → lowest priority.

### RPV (r=0.688, light-moderate; #8) — big-driven rebounding
big 0.38/0.54, defense 0.06, connector −0.06, forward −0.05, star −0.06, specialist −0.07,
wing −0.09, guard −0.15. Clean big-vs-rest split.
- Ready now: RPV-1 contested/uncontested, RPV-3 ORB, RPV-7 opponent-ORB-strength, RPV-10 competition — **reb files exist every season**, so RPV is highly assemblable.
- Needs assembly: RPV-2/8 team-DREB-lift, RPV-5/6 role-position & small-ball (pbp lineups), RPV-9 foul.

### DPC (r=0.501, moderate; #9) — defense/big disruption
defense 0.34, big 0.29, connector 0.11, dpc null-bucket ~0; guards/wings/specialists/forwards/star negative.
- Ready now: DPC-2 low-sample, DPC-3 easy-matchup, DPC-7 deflection beta-binomial (if event data), DPC-8 role-position, DPC-9 top-offense.
- Needs assembly: DPC-1/4/5/6/10 gambling, teammate-cover, foul-cost, blow-by, lineup-dependency (pbp/tracking).

### SAV (r=0.536, moderate; #10, ~0 weight) — flat across roles
forward 0.75, star 0.77, big 0.71, specialist 0.71, wing 0.69, connector 0.70, guard 0.67,
defense 0.65 — nearly flat, tiny SD (0.10–0.23). Role tells you almost nothing here; this is a
near-constant. Shrink purely on sample size.
- Ready now: SAV-1 small-sample, SAV-3 corner-only, SAV-8 shooting prior (shot/FT files), SAV-9 year-to-year, SAV-10 competition.
- Needs assembly: SAV-2/4/5/6 self-created vs assisted, wide-open, late-clock (tracking/pbp).

## 3. What's assemblable from the repo without pbp (do these first)
- **Matchup files (`RSMATCHUP20xx`, every season):** unlock the "competition / vs-top-defense /
  matchup-difficulty / easy-assignment" sub-concepts across IIB-10, MIV-10, SGV-10, DSV-1/10, DPC-3/9, RPV, SAV-7, PTV-1.
- **Rebound files (every season):** unlock RPV-1/3/7/10 and PVA-5 nearly end-to-end.
- **Shot / per100 files:** unlock all beta-binomial shooting priors (SGV-1/5/7, SAV-8, PVA-9).
- **`pass` files:** already used (COV-3); also feed PVA-2 assisted/unassisted.
The heavy lift is **`pbp_data.zip` (lineups/on-off)** — required for the true RAPM-style
sub-concepts (IIB star-overlap/collinearity/no-center, MIV gravity, SGV star-overlap, DSV roamer,
RPV team-lift, DPC lineup-dependency). That's one big assembly that unlocks the deepest priors
for the top drivers (IIB especially).

## 4. Recommended build order (reliability- and weight-aware)
1. **MIV** — lowest reliability (0.31): heavy reliability-shrinkage alone is the single biggest noise fix; ship first, it barely needs context signals.
2. **IIB** — #2 driver, moderate reliability, but the valuable sub-concepts need the pbp on/off assembly. Do the assembly here.
3. **COV** context signals (already have base + COV-3/10; add hub/matchup).
4. SGV/PVA/DSV — light shrinkage, mostly shooting/matchup-ready; quick wins.
5. RPV/DPC — reb + matchup ready.
6. SAV/PTV — lowest priority (≈0 weight / deterministic).

## 5. DB schema for the layer (per the doc, grounded fields)
Add table `component_shrinkage`: player_id, season_id, model_version_id, component_name,
raw_value, context_bucket, sample_size, effective_sample_size, observed_SE, role_prior_mean,
role_prior_SD, posterior_weight, bayesian_value, shrinkage_reason_flags.
TCV then sums `bayesian_value` per component instead of raw. Build on a dev branch, eyeball the
five top-20s per component, merge — do NOT write live (unlike the COV base fix, this is additive
re-weighting of every component and will move the board materially).
