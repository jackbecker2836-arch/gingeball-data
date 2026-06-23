# TCV Component Upgrade Blueprint — Formulas & Calculations

**Date:** 2026-06-22
**Status:** design spec for upgrading every TCV component from proxy → real.
Companion to `rapm_epm_improvement_assessment.md`. Read that one first: it establishes
RAPM as the ground-truth impact target. This doc is how the *descriptive* components get
good enough to (a) explain RAPM and (b) add to a coherent total.

Component set (from Formula Atlas v1):

| code | name | side | status |
|------|------|------|--------|
| IIB | Individual Impact on Basket | impact | CALC |
| PVA | Passing Value Added | offense | CALC |
| SGV | Shot Generation Value | offense | CALC |
| MIV | Movement Intelligence Value | offense | PROTO |
| COV | Contextual Opportunity Value | context | CALC |
| DSV | Defensive Stopper Value | defense | CALC |
| DPC | Defensive Positioning Created | defense | CALC |
| RPV | Rim Protection Value | defense | CALC |
| SAV | Scheme Adaptability Value | context | PROTO |
| PTV | Playoff Translation Value | context | PEND |
| UP  | Uncertainty Penalty | penalty | PROTO |
| CFP | Context Fragility Penalty | penalty | PEND |

with `o_tcv = oiib + pva + sgv + cov + miv + ptv`, `d_tcv = dsv + rpv + dpc + diib`,
`TCV = o_tcv + d_tcv` then penalties.

---

## 0. The single biggest problem, and the single fix

Right now components are **rank-normalized to arbitrary ranges** (we measured `oiib` on
±4, `diib` on ±3 — i.e. offense is structurally weighted ~1.3× defense for no principled
reason), and several **double-count** each other (we measured `corr(dpc, dsv) = 0.67`).
Rank-normalization also throws away magnitude: an elite and a good player get compressed
to nearly the same number, and a rate-inflated part-timer ranks like a full-time star
(the Jaylin/Adams problem).

**The fix is one methodology applied to all twelve:**

1. **Common currency.** Every component outputs **expected points per 100 possessions
   (xPP100)**, not a z-score. Points are additive and interpretable, and they make the
   offense/defense weighting fall out of the math instead of being hand-set.
2. **Value Over Expectation (VOE).** Every component is `Σ leverage × (outcome − expected
   outcome | context)`. "Expected" is what a *role-and-context-matched baseline* player
   produces. This is what makes a number "value created," not "counting stat."
3. **Orthogonalize.** Components are fit in a fixed priority order; each later one is
   residualized against earlier ones so it only keeps its *marginal* value. Kills the
   double-counting.
4. **Calibrate to RAPM.** Aggregation weights are fit so `Σ wᵢ·Cᵢ ≈ RAPM` (your own,
   from the stint data). This sets the weights empirically and turns the gap
   `RAPM − TCV` into a validation diagnostic instead of a mystery.
5. **Shrink by reliability.** Low-sample/high-variance estimates regress toward an
   archetype prior (this *is* the Uncertainty Penalty, done rigorously).

Everything below is an instance of these five.

---

## 1. Shared spine (build once, every component uses it)

### 1.1 Expected Points model `xPTS` (the keystone)
A logistic make-probability model per shot, times shot value:

```
xPTS(shot) = p̂(make | zone, dist, contest, shot_clock, dribbles, catch/pull) × value(zone)
```

- Inputs you now have post-scraper: `shot_zone`, `shot_dist`; from tracking files:
  contested/open, touch time, dribbles, shot clock bucket.
- `value(zone) ∈ {2, 3}`; free throws handled separately at `0.0 × misses + 1.0 × makes`
  with an `xFT = career/role FT% × FTA`.
- Fit `p̂` once on all shots (multi-season). This single model feeds IIB, PVA, SGV, MIV,
  DSV, DPC, RPV. **It is the most important thing to build first.**

### 1.2 Possession leverage (replaces "everything counts equally")
Down-weight garbage time and low-leverage possessions (the real version of the RAPM doc's
"possession weighting"):

```
leverage(poss) = clip( 1 − f(|margin|, time_remaining), w_min, 1 )
```

e.g. a logistic in score margin and game time; a possession up/down 25 with 2 minutes left
gets ~0.1, a tie-game late possession gets 1.0. Use the *same* leverage weights here and in
RAPM so the two stay consistent.

### 1.3 The VOE template
For any component C built from a set of actions A:

```
C_raw(player) = (100 / poss) · Σ_{a ∈ A(player)} leverage(a) · [ value(a) − E[value | context(a)] ]
```

`E[value | context]` is the baseline — what an average player **in the same role/assignment**
would produce. The baseline is what makes each component "above expectation," and it's where
COV-style context lives (see §3.1). Output unit: xPP100.

---

## 2. Offense components

### IIB — Individual Impact on Basket  (CALC → anchor to RAPM)
**Measures:** direct basket influence — scoring, foul-drawing, shot creation, weighted by
leverage and defensive resistance.

This is the one component that *becomes* RAPM (offensive split). Two layers:

- **Descriptive (the prior / the explanation):**
  ```
  IIB_box = scoring_VOE + ft_generation_VOE + and1/shot_creation_VOE
  scoring_VOE = (100/poss) Σ_shots leverage · (PTS − xPTS)      # shot-making over expectation
  ft_generation_VOE = (100/poss) Σ leverage · (FT_pts − xFT) + foul_draw_value
  ```
  "Defensive resistance" is already inside `xPTS` via the contest feature. This is a clean,
  real metric on its own.
- **Anchored (the truth):** once your multi-season RAPM exists, set `oiib`/`diib` to the
  offense/defense split of RAPM, and use `IIB_box` above as the **Bayesian prior** the RAPM
  shrinks toward (this is exactly the prior-informed RAPM in the companion doc). IIB stops
  being a proxy and becomes RAPM with a box-score prior.

### PVA — Passing Value Added  (CALC)
**Measures:** shot value created for teammates through passing.
**Why the proxy is weak:** raw assist counts reward passing to good shooters and ignore the
*difficulty created*. Credit should be the shot quality the pass **manufactured**, not the
make.

```
PVA = (100/poss) Σ_passes→shot  leverage · [ xPTS(shot) − xPTS_self(receiver, that spot) ]
      + ρ · Σ_hockey_assists (same term, partial credit ρ≈0.4)
      − Σ_turnovers leverage · EPV_lost
```

- `xPTS(shot)` = quality of the shot the pass created; `xPTS_self` = what the receiver
  generates **unassisted** from that location (their baseline). The *difference* is creation.
- A pass that turns a contested 2 into an open 3 scores high; a hockey-assist gets partial ρ.
- Subtract turnovers at their expected-possession-value cost. Net, leverage-weighted, in xPP100.
- Inputs: passing logs, shot logs + `xPTS`, receiver self-creation baselines.

### SGV — Shot Generation Value  (CALC)
**Measures:** generating high-value shots for self and teammates via movement, spacing, gravity.
**Overlap risk:** with PVA (teammate creation) and IIB (self). SGV must keep only the
**indirect** part — gravity/spacing not captured by a direct pass.

```
SGV_raw = (100/poss) · [ team_xPTS_per_shot(on) − team_xPTS_per_shot(off) ] · shots_on
SGV     = SGV_raw  −  proj(SGV_raw onto {PVA, IIB})        # residualize, see §4.1
```

- Use **shot quality** (`xPTS` per shot), not points — far less noisy than on/off points.
- The on-court uplift in teammate shot quality, *after* removing what direct passing (PVA)
  and the player's own scoring (IIB) explain, is gravity/spacing. That residual is SGV.
- Inputs: lineup on/off, `xPTS` per shot. (This is the offensive mirror of DPC, §3.)

### MIV — Movement Intelligence Value  (PROTO → needs tracking)
**Measures:** off-ball value (cuts, off-screen, relocation) invisible to passing/scoring.
**Honest status:** genuinely tracking-dependent. Without player-coordinate tracking this is a
proxy; with the CV/tracking pipeline it becomes real.

```
MIV = (100/poss) Σ_offball_actions leverage · ( xPTS_after_action − xPTS_baseline_position )
```

- Off-ball actions detected from tracking: cuts (speed burst toward rim), off-screen curls,
  relocations after a pass. Value = the shot-quality change the movement produced (for self
  *or* a teammate freed up), minus the player's stationary baseline.
- Interim proxy from what you have: cut/handoff/screen-action points-per-chance from the
  tracking play-type files, residualized against SGV so it isn't re-counting gravity.
- **Flag:** mark PROTO until coordinate tracking exists; don't let it carry full weight.

---

## 3. Defense components

### DSV — Defensive Stopper Value  (CALC)
**Measures:** suppressing opponent scoring as primary/help defender, adjusted for assignment
difficulty and matchup.

```
DSV = (100/poss) Σ_matchups leverage · difficulty(matchup) · [ xPTS_opp(matchup) − PTS_opp_actual ]
```

- For each defensive assignment, `xPTS_opp` = what the matched scorer normally produces from
  those spots (their offensive baseline); subtract what they *actually* produced vs this
  defender. Positive = points prevented.
- `difficulty(matchup)` up-weights guarding primary options. Needs matchup data — you have
  `advantage_events` / `player_advantage_stats`; map those to assignment-level opponent
  expected vs actual.
- This is **defensive points saved over expectation** — the direct, on-ball piece.

### DPC — Defensive Positioning Created  (CALC → orthogonalize vs DSV)
**Measures:** positioning that forces opponents into lower-value possessions — help, close-outs,
zone disruption.
**Why it matters here:** we measured `corr(DPC, DSV) = 0.67` — they're double-counting. DPC is
to DSV what SGV is to PVA: the **indirect/team** part.

```
DPC_raw = (100/poss) · [ opp_xPTS_per_poss(off) − opp_xPTS_per_poss(on) ]      # team shot-quality suppression
DPC     = DPC_raw − proj(DPC_raw onto {DSV, RPV})                              # keep only non-matchup, non-rim part
```

- On/off opponent **shot quality** suppression, residualized against the direct-matchup (DSV)
  and rim (RPV) defense already credited. What's left is help/rotation/positioning value.
- Inputs: lineup on/off, opponent `xPTS` per possession.

### RPV — Rim Protection Value  (CALC)
**Measures:** rim deterrence + shot-blocking, weighted by frequency/difficulty of rim assignments.

```
RPV = deterrence + block_value
deterrence  = (100/poss) · [ (lgFG%_rim − oppFG%_rim_vs_player) · rim_FGA_faced · 2
                            + (rim_freq_off − rim_freq_on) · poss · Δvalue_rim_vs_other ]
block_value = Σ_blocks leverage · ( xPTS_blocked + p_recover · EPV_next )
```

- Two real effects: opponents **miss more** at the rim against them (FG% suppression), and
  opponents **attempt fewer** rim shots when they're on (frequency suppression → shots pushed
  to lower-value zones). Both convert to points saved.
- Block value = the expected points of the blocked shot plus the chance the defense recovers
  possession. Inputs: rim/paint shot data, on/off rim frequency, blocks. You have paint/rim files.

---

## 4. Context & penalty layer

### COV — Contextual Opportunity Value  (CALC, reframed as the baseline, not an add-on)
**Measures:** value relative to opportunities available — role, usage, teammate quality.
**Cleanest design:** COV shouldn't be a separate additive bucket that double-counts everything;
it's the **role baseline** inside every VOE term. Concretely, define a *role-replacement*
player and make COV the value above that baseline:

```
COV = Σ_opportunity_types ( player_value_per_opp − replacement_value_per_opp(role) ) · opp_count
```

- This is "value above a replacement-level player **in the same role and opportunity set**."
  It's what stops the model from punishing a low-usage specialist or over-crediting a high-usage
  player who's merely *given* the ball a lot.
- Implementation: compute role buckets (usage tier × position × on-ball/off-ball), estimate a
  replacement curve per bucket, and credit the delta. Feed this baseline into §1.3's
  `E[value | context]` so context is consistent everywhere.

### SAV — Scheme Adaptability Value  (PROTO)
**Measures:** versatility / translation across schemes.

```
SAV = 1 − HHI( value_share across play-type & scheme buckets ),  validated against
      observed performance variance across opponent schemes / lineup types
```

- A player who produces value through many channels (HHI low) is scheme-robust; one-trick
  production (HHI high) isn't. SAV is the **complement of CFP** (§ below) and should be fit
  jointly with it. Validate by checking that high-SAV players actually hold value across
  different opponent defensive schemes (needs play-type splits). PROTO until validated.

### PTV — Playoff Translation Value  (PEND)
**Measures:** how components hold up in the playoffs.

```
PTV = Σ_components ( r_c − 1 ) · w_c · C_c
```

- `r_c` = empirically estimated **regular→playoff retention** per component/archetype
  (rim pressure and on-ball D tend to hold; transition, low-leverage volume, and weak-side
  help against scheme-specific actions tend to decay). Estimate `r_c` from historical
  regular-vs-playoff component values across players. Needs the multi-season playoff splits
  your scraper now tags (`is_playoff`). PEND until those are aggregated.

### UP — Uncertainty Penalty  (PROTO → make it real via empirical-Bayes shrinkage)
**Measures:** reduce confidence for low sample / high variance / data gaps.
**Upgrade:** stop treating it as an ad-hoc subtraction; make it **reliability shrinkage** toward
an archetype prior (this is the same machinery as prior-informed RAPM):

```
reliability = poss / (poss + k)                      # k tuned by CV
TCV_shrunk  = prior_archetype + reliability · (TCV_raw − prior_archetype)
UP          = TCV_shrunk − TCV_raw   (≤ 0)           # the penalty IS the shrinkage delta
```

- Propagate each component's standard error (from sample size) into a TCV variance, and shrink
  proportionally. Low-minute players collapse toward their archetype mean (fixes the 112-tail
  and part-time spikes *here*, the same way it does in RAPM). This is the rigorous UP.

### CFP — Context Fragility Penalty  (PEND)
**Measures:** production concentrated in one play type / teammate / scheme.

```
CFP = − λ · ( HHI(value across contexts) − HHI_baseline )₊ · TCV
```

- Herfindahl concentration of value across (play type, lineup/teammate, scheme) buckets; the
  more concentrated, the larger the penalty. Inverse of SAV — fit the two together. Needs the
  same play-type/teammate splits. PEND.

---

## 5. Aggregation & calibration (the part that ties it together)

### 5.1 Orthogonalization order (kills double-counting)
Fit/residualize in this priority so each component keeps only marginal value:

```
offense:  IIB → PVA → SGV → MIV
defense:  RPV → DSV → DPC
```

Each later term is regressed on the earlier ones and replaced by its residual
(`Cᵢ ← Cᵢ − proj(Cᵢ onto C₁..Cᵢ₋₁)`). Rationale: credit the most *direct/attributable*
value first (own scoring, direct passes, rim, on-ball D), then let the diffuse team-level
terms (SGV gravity, DPC help) pick up only what's left. This is what fixes `corr(DPC,DSV)=0.67`.

### 5.2 Weights from RAPM, not by hand
With every component in xPP100, fit the aggregation against your own RAPM:

```
minimize_w  Σ_players ( RAPM_offense − Σ_{c∈O} w_c·C_c )²   s.t. w_c ≥ 0
minimize_w  Σ_players ( RAPM_defense − Σ_{c∈D} w_c·C_c )²   s.t. w_c ≥ 0
```

- Fitting offense components to **offensive RAPM** and defense to **defensive RAPM**
  sets the o/d balance empirically — no more ±4 vs ±3 by fiat.
- Non-negativity keeps interpretability (each component contributes in its expected direction).
- `R²` of the fit = **how much of real impact your decomposition explains**. The residual
  `RAPM − Σw·C` is the "unexplained impact" — track it; large residuals flag missing signal
  (a real to-do list), not noise to bury.

### 5.3 Final assembly
```
TCV_raw   = Σ_offense w·C + Σ_defense w·C
TCV       = (TCV_raw + PTV_adjustment) shrunk by UP, then − CFP
```

---

## 6. Build order (what's possible now vs. gated)

**Buildable as soon as the stint/possession data lands (no tracking needed):**
1. `xPTS` model (§1.1) — keystone, do first.
2. Leverage weighting (§1.2).
3. IIB_box, PVA, RPV, DSV — pure VOE on shots/matchups/rim.
4. SGV, DPC — on/off shot-quality residuals.
5. COV as the role baseline (§3.1).
6. RAPM calibration of weights (§5.2) — needs your RAPM, which needs the stint data.
7. UP as EB shrinkage (§4) — needs §5 variances.

**Gated on tracking (CV/coordinate data):**
- MIV (off-ball movement) — proxy now, real later.

**Gated on multi-season aggregation/splits (you now scrape the inputs):**
- PTV (playoff retention `r_c`) — needs `is_playoff` splits, which the scraper now tags.
- SAV / CFP (context concentration) — need play-type/teammate value splits.

---

## 7. Connection to current state & the RAPM doc
- The `iib` we rebuilt (RAPM-primary, calibrated ESPN/BPM fill) is the **interim** IIB. Under
  this blueprint, `IIB_box` becomes the **prior** and your own multi-season RAPM becomes the
  **truth** — IIB stops being a proxy.
- **UP = the same empirical-Bayes shrinkage** as prior-informed RAPM. Build it once, use it in
  both places. It's the principled fix for the 112-tail and the part-time-rate spikes, applied
  model-wide instead of bolted onto one component.
- The honest headline: most components today are rank-normalized counting proxies. Re-expressing
  them as leverage-weighted **value over expectation in points**, orthogonalizing the overlaps,
  and **fitting the weights to RAPM** is what makes the decomposition both add up correctly and
  explain real impact — which is the thing no public metric does.
