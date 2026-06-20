# sim_feed.csv — per-player possession modifiers

One row per player (585). Join on `player_key` (folded lowercase-ascii name = the master table's key).

## Columns
For each of the 12 validated metrics you get TWO columns:
- `<metric>_z`   = standardized score, direction-normalized so **higher = player is better/stronger at that thing**, clipped to +/-2.5 SD. Missing player -> 0 (neutral).
- `<metric>_mod` = neutral-centered multiplier = 1 + z*GAIN (GAIN=0.05). **1.0 = league-average.** Range 0.875–1.125. Missing -> 1.0 (neutral).
- `n_metrics_real` = how many of the 12 metrics the player actually had data for (rest are neutral defaults). Low number = thin data, trust less.

## What each modifier should drive in the possession engine
OFFENSE
- epm_off_cur      -> offensive efficiency while on floor (broad)
- ScoringLoadValue -> scoring efficiency x volume on possessions they use
- RimPressureValue -> drive / paint-touch / FT-draw frequency
- AdvantageChainValue -> assist / advantage-creation rate
- PlayTypeEntropy  -> action unpredictability (harder to scheme against)
- ElasticityIndex  -> efficiency RETENTION under self-creation load (already inverted: high mod = holds up)
- LowestThreatSpacer -> off-ball gravity / how much defense must respect them (already inverted: high mod = more gravity)
DEFENSE
- epm_def_cur          -> opponent efficiency suppression (broad)
- DefenderSuppression  -> primary on-ball stop rate (PRIMARY defensive lever)
- DefensivePlayTypeYield -> supplementary points-prevented (noisier; secondary)
- HustleImpactValue    -> extra-possession events (OREB / loose balls / deflections)
OVERALL
- epm_tot_cur -> single overall per-possession outcome shift (use if you want one knob)

## Usage notes
1. Apply each `_mod` to ITS OWN possession event/rate. **Do NOT multiply all 12 into one number** — they'd compound into absurd swings.
2. GAIN (0.05) is the tuning knob = +/-12.5% at the +/-2.5 SD extreme. Raise for more spread, lower for subtler effects. Can be set per-lever if some metrics should hit harder.
3. EPM cols are CURRENT season (2025-26); the index metrics are 2024-25. One-season offset — fine for talent, slightly noisy for role-changers.
4. DefenderSuppression is the trustworthy defensive lever; DefensivePlayTypeYield is confounded by assignment — weight it lower.
5. Players with n_metrics_real=0 (78 of them) are pure neutral (all 1.0) — deep bench / no tracking data.
