# xREB Sketch + xAST Build Note

**Date:** 2026-06-22
**Companion to:** `tcv_component_upgrade_blueprint.md`
**Status:** xREB = validated sketch on real 2024-25 data; xAST = design note for when we build PVA.

---

## Part 1 — xREB: Rebounding Value Over Expectation

### The framing (why "expected rebounds" alone is not the point)
Rebounds are a box-score stat, so a raw xREB is *incremental* by your own no-box-score-equivalent
rule. The **non-box-score skill** in rebounding is three things the rebound count hides:
1. **Chance conversion** — securing the rebounds *available to you*, not just accumulating chances
   (which is mostly height/role/position).
2. **Contested skill** — winning rebounds with an opponent in your body, vs vacuuming uncontested ones.
3. **Team-secured value** — when you don't get the board but a *teammate* does because you boxed out
   (a "deferred" chance). This is the rebounding analog of offensive gravity: value with no personal
   stat to show for it.

### Data (you already have all of it — `2425totals`)
Per player-season: `oreb`, `dreb` (grabbed); `oreb_chances`, `dreb_chances` (opportunities);
`oreb_contest`/`uncontest`, `dreb_contest`/`uncontest` (split of grabbed); `oreb_chance_defer`,
`dreb_chance_defer` (chances a teammate secured). League rates (2024-25): **OREB conv = 0.435**
(0.556 of grabbed are contested — offensive boards are hard), **DREB conv = 0.605** (only 0.244
contested — you're usually in position).

### The formulas
```
# league baseline conversion (fit once)
lg_o = Σ oreb / Σ oreb_chances        # 0.435
lg_d = Σ dreb / Σ dreb_chances        # 0.605

# expected rebounds at league chance-conversion
exp_oreb = oreb_chances * lg_o
exp_dreb = dreb_chances * lg_d

# (1) conversion over expected  — converts chances better than league
reb_oe          = (oreb - exp_oreb) + (dreb - exp_dreb)
reb_oe_per100ch = reb_oe / (oreb_chances + dreb_chances) * 100      # rate, removes volume

# (2) contested skill — share of secured boards won contested
contested_share = (oreb_contest + dreb_contest) / max(oreb + dreb, 1)

# (3) team-secured value — credit deferrals (you boxed out, team got it)
team_secure     = (oreb + oreb_chance_defer + dreb + dreb_chance_defer) / chances

# common currency: rebounding value in POINTS (ties into TCV)
# each DREB ends an opponent possession; each OREB creates a new one ~ league PPP (~1.10)
reb_value_pts   = reb_oe * PPP
```

### Validation (real 2024-25, min 500 min; this is evidence the metric works)
- **Volume `reb_oe` top:** Karl-Anthony Towns (+108.6), Giannis (+96.7), Vučević, Jokić, Zubac,
  Ayton, Bam, Okongwu, Anthony Davis, Capela — the correct elite-rebounder set.
- **Efficiency `reb_oe_per100ch` top (min 300 chances):** Aaron Gordon, Deandre Ayton, DeAndre
  Jordan, Giannis, Andre Drummond, Clint Capela — physical converters, high contested shares
  (Capela 0.51, Drummond 0.48). This is the *skill* layer, distinct from volume.
- **Bottom:** guards who get near boards but don't secure (Ja Morant, Scoot Henderson, Miles
  McBride, Moses Moody) and stretch bigs whose weak contested rebounding is a known knock
  (Myles Turner, Jay Huff). The metric flags the right people.

The split between the volume board (who grabs the most over expectation) and the efficiency board
(who converts best per chance) is the proof it's separating **skill from opportunity** — exactly
what a raw rebound total can't do.

### Caveats / v2 refinements (honest)
- **Small-chance noise:** per-100 rate spikes for low-chance players (300–380 chances). Apply the
  same empirical-Bayes shrinkage as UP (blueprint §7) before trusting the rate. (Justin Champagnie,
  Tyrese Martin showing up high is partly small-sample.)
- **Contested *chances* aren't given** — only contested *grabbed*. v1 baselines on total chances;
  v2 can estimate contested-chance exposure to make the expectation difficulty-aware.
- **Opponent-grabbed isn't a column**, so `chances = grabbed + deferred + opponent_got_it` is only
  partially decomposable. `team_secure` is the cleanest available "good outcome" rate.
- **Positional baseline:** consider conversion vs *position* rather than flat league, so guards
  aren't auto-penalized for harder chance types. Optional; flat league already face-validates.

### How it feeds TCV
Convert to points: OREB → new-possession value (offense side), DREB → opponent-possession-ended
value (defense side, sits near RPV/DPC). Fold `reb_value_pts` into the component set, orthogonalize
against RPV (a rim protector's DREB overlaps), and calibrate the weight against RAPM like everything
else. Don't ship it as a standalone "xREB number" — make it a points contribution in the unified model.

### Runnable sketch
```python
import pandas as pd, numpy as np
t = pd.read_excel("2425totals.csv.xlsx", engine="openpyxl")
PPP = 1.10
lg_o = t['oreb'].sum()/t['oreb_chances'].sum()
lg_d = t['dreb'].sum()/t['dreb_chances'].sum()
d = t[t['minutes'] >= 500].copy()
d['chances'] = d['oreb_chances'] + d['dreb_chances']
d['reb_oe'] = (d['oreb'] - d['oreb_chances']*lg_o) + (d['dreb'] - d['dreb_chances']*lg_d)
d['reb_oe_per100ch'] = d['reb_oe']/d['chances']*100
d['contested_share'] = (d['oreb_contest']+d['dreb_contest'])/(d['oreb']+d['dreb']).clip(lower=1)
d['team_secure'] = (d['oreb']+d['oreb_chance_defer']+d['dreb']+d['dreb_chance_defer'])/d['chances']
d['reb_value_pts'] = d['reb_oe']*PPP
# -> shrink reb_oe_per100ch toward 0 by chances/(chances+k) before ranking (UP step)
```

---

## Part 2 — xAST build note (your foul-credit catch — important)

**Your observation:** if the player who receives the pass gets **fouled**, it directly impacts the
assist. You're right, and the implication is bigger than it looks.

### The mechanic
An assist is credited **only on a made field goal**. So:
- Pass → receiver drives → **shooting foul, shot misses** → 2 FTs → **no assist recorded**, even
  though the passer fully created the scoring opportunity.
- Pass → **and-1** (made FG + foul) → assist credited on the FG, but the **bonus FT point is not**
  assist-credited.
- Pass → non-shooting foul that resets → no assist, creation partially wasted.

So **raw assists — and any "xAssists" model trained to predict the assist stat — systematically
undercredit playmakers who create shots that draw fouls.** The better a passer is at setting up
drives and attacks (which draw fouls), the more the assist stat *underrates* them.

### The design consequence
**Build PVA in expected POINTS created, not "xAssists."** The points currency captures the
foul-drawn FT value that the assist stat structurally omits. The foul case is, in fact, the cleanest
proof of why the blueprint uses points as the common currency rather than counting stats.

```
PVA(passer) = Σ over pass-created possessions:
                made FG      -> xPTS(shot created)
                shooting foul-> E[FT points]  (≈ FTA * lg_FT% on the drawn foul)   # the piece assists miss
                missed FG    -> 0
                turnover     -> negative (cost of a bad pass)
              minus receiver self-creation baseline, leverage-weighted
# "xAssists" (predicting the assist stat) is at most a derived/validation view, never the primary metric.
```

### Data requirement (note for build time)
Linking a pass to a **foul** needs possession **sequencing**, which the shot file can't give you:
- `2425shotstotals` has `PassFromPlayerId` **on shots only** — no fouls. It captures pass→made/missed
  FG but is blind to pass→foul.
- The **raw_pbp from your scraper** has the foul events (`is_foul`, "drawn by <receiver>") in
  sequence within a possession. So the pass→foul credit is a **raw_pbp + `_tp.csv` job after the
  crawl**: within a possession, attribute a drawn shooting foul back to the immediately prior pass/
  creation action.

**Bottom line:** when we build PVA, the target is points created (incl. foul-drawn FTs), sourced from
raw_pbp possession sequences — not assists, and not the shot file alone. Logging this so the foul
value isn't silently dropped the way the assist stat drops it.
