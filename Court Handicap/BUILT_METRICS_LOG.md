
## ScoringLoadValue (volume-weighted scoring value) — built
- Source: synergy_offensive_2425.csv (fastbreak pull). 11 mutually-exclusive play types, type_grouping all "Offensive" (no aggregate double-count).
- Method = Points Over Expected (POE): for each play type, lg_ppp = total_pts/total_poss across all players; player POE = pts - poss*lg_ppp (points scored above a league-avg player on those same possessions). Sum across play types = scoring_poe_total. Per game = scoring_poe_pg (games = SUM of distinct per-stint gp, to fix traded players like Luka 28+22=50).
- ScoringLoadValue = 0-100, z(scoring_poe_pg)*15+50 within qualified pool (scoring_poss>=200 & games>=30; 328 qualify).
- WHY: PlayTypeScoringYield = efficiency-per-poss, skews to finishers (Gafford/Gobert). POE weights efficiency BY volume -> rewards primary scorers carrying load.
- Validation: vs PlayTypeScoringYield r=0.78, vs offensive EPM r=0.52, vs usage r=0.24 (intentionally low — ignores inefficient volume).
- Top: SGA 100, Jokic 99, Durant 94, Lillard 93, Brunson 92, Haliburton 85, Giannis 82, Edwards 81, Curry 81.
- Cols added to master: scoring_poe_total, scoring_poe_pg, ScoringLoadValue.

## DefensivePlayTypeYield (defensive points saved) — built
- Source: synergy_defensive_2425.csv. Same 11 play types, type_grouping all "Defensive".
- Method = Points SAVED Over Expected (PSOE): lg_ppp_allowed per play type; player PSOE = poss*lg_ppp - pts_allowed (points prevented vs avg defender on same play types). Sum -> def_psoe_total; /games -> def_psoe_pg. games = sum of distinct stint gp.
- DefensivePlayTypeYield = 0-100 (HIGH=good), z within qualified (def_poss>=200 & games>=30; 319 qualify).
- Validation: vs DefenderSuppression r=0.53 (our two def metrics agree — best check), vs def_rating r=-0.38 (correct sign), vs DBPM r=0.30, vs EPM-def r=0.26 (cross-season).
- CAVEAT (important): Synergy defensive PPP is the NOISIEST tracking family — heavily confounded by assignment & scheme (you're judged on who you're forced to guard). Small-sample role players rise falsely (e.g., Caris LeVert #1 on 38g/346poss is an artifact). Read WITH sample size. DefenderSuppression (matchup-adjusted to each opponent's own baseline) remains the PRIMARY stopper metric; this is supplementary.
- Top (legit ones): Anthony Davis, Jalen Williams, Caruso, Kris Dunn, Gobert, Derrick Jones Jr., Bilal Coulibaly. Cols: def_psoe_total, def_psoe_pg, DefensivePlayTypeYield.
