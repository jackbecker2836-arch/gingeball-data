"""DSV (Defensive Stopper Value) — built from DefenderSuppression (matchup-adjusted), 2024-25.
Replaces the discredited shotdif (raw defended-FG%) build that buried Durant.
Input: master_player_table_2425.csv (col 'DefenderSuppression', 0-100, matchup-adjusted to each
opponent's own baseline; 152 of 585 players scored by fastbreak matchup data).
Validation r: def_psoe_pg +0.53, epm_def_cur +0.47, bbr_dbpm +0.46, def_rating -0.40.
NOTE: DSV here is on the 0-100 family scale (like ScoringLoadValue/DefensivePlayTypeYield).
Upgrade to points-over-expected needs raw matchup possessions+pts (fastbreak leagueseasonmatchups);
residualize vs RPV (rim protection) once player keys are clean (see nba_id_collision fix).
"""
import pandas as pd
m = pd.read_csv("master_player_table_2425.csv")
q = m.dropna(subset=["DefenderSuppression"]).copy()
mu, sd = q["DefenderSuppression"].mean(), q["DefenderSuppression"].std(ddof=0)
q["dsv_z"] = (q["DefenderSuppression"] - mu) / sd
q["DSV"]   = (q["dsv_z"]*15 + 50).clip(0,100)
out = q[["player_key","DefenderSuppression","dsv_z","DSV"]].rename(
        columns={"DefenderSuppression":"defender_suppression_raw"}).sort_values("DSV",ascending=False)
out.to_csv("dsv_player.csv", index=False)
print(f"wrote dsv_player.csv ({len(out)} qualified defenders)")
