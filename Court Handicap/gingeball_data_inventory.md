# gingeball-data — Full Data Inventory & Pressure×Output Map

Repo: `github.com/jackbecker2836-arch/gingeball-data` (branch `main`). Raw fetch base: `https://raw.githubusercontent.com/jackbecker2836-arch/gingeball-data/main/`

**Scale:** 198 root files + 3 dirs (`component_data_all`, `data`, `response_data`) ≈ 13,400 files total. Most root files are the *same ~37 formats* repeated across seasons. Below = every distinct format, once.

## The one structural fact that governs everything

The repo has **two keying worlds that share no column:**

- **Name-keyed** files (`Player`/`Name`): drives, elbow, paint, post, pass, reb, speed, shotdif, touchdata, poss, selfcreated, component_master, all `lineup*`, all `team*`, `pbpalladvantage`. ~560–700 players each.

- **entity_id-keyed** files (NBA PERSON_ID, no name): `*totals`, `players20xx`, `tracking_*_totals`, `2425trackingshottotals`, `tracking_game_logs`.

**Bridge:** `2425shotstotals` carries *both* PlayerId+name but only ~223 players. The complete bridge is **`nba_api.stats.static.players`** (5,103 ids→names, bundled offline) — this is what unlocked full coverage. Use it for any name↔id join.

Lineup/team files key on a **comma last-name string** (`'Towns, Anunoby, Hart, Bridges, Brunson'`). Per-game files key on **`game_id`** = `YYYYMMDD0TTT`.


## PRESSURE candidates (advantage / disadvantage / creation)

### `data/possessions/202012220BRK_tp.csv`  — ?×?
**THE real pressure source.** Per-game 'true possessions' with `advantage_count` (how many advantage states were created in the possession) and `true_possession_points`. ~2,183 games × `_tp.csv`. This is created-advantage per possession — the truest pressure signal in the repo. Join lineups via the paired `_lineups.csv` (same game_id, time windows).

Columns: 

### `2021to2526pbpalladvantage.csv`  — 430×30
MISNAMED — not PBP advantage states. It's a 430-row per-PLAYER season table of outcomes *in advantage situations* (pts, eFG, `Usage`). Useful as a player-level 'what he does with an advantage' feature, NOT possession-level pressure.

Columns: `Name`, `TeamAbbreviation`, `Minutes`, `OffPoss`, `Points`, `FG2M`, `FG2A`, `Fg2Pct`, `FG3M`, `FG3A`, `Fg3Pct`, `NonHeaveFg3Pct`, `FtPoints`, `PtsAssisted2s`, `PtsUnassisted2s`, `PtsAssisted3s`, `PtsUnassisted3s`, `Assisted2sPct`, `NonPutbacksAssisted2sPct`, `Assisted3sPct`, `FG3APct`, `ShotQualityAvg`, `EfgPct`, `TsPct`, `PtsPutbacks`, `Fg2aBlocked`, `FG2APctBlocked`, `Fg3aBlocked`, `FG3APctBlocked`, `Usage`

### `component_data_all/pbp_advantage_all_seasons.csv`  — ?×?
Same as above + derived `ppp` and `creation_rate` per player. `creation_rate` = how often the player generates an advantage — a player-level pressure proxy.

Columns: 

### `selfcreated2425.xlsx`  — 569×26
Self-created vs assisted shooting per player — creation load / shot-difficulty pressure.

Columns: `Player`, `FGA`, `%FGA Self-Created`, `Self-Created FGA`, `Self-Created eFG`, `Assisted FGA`, `Assisted eFG`, `Diff`, `Self-Created u10ft FG2M`, `Self-Created u10ft FG2A`, `Self-Created u10ft FG%`, `Self-Created o10ft FG2M`, `Self-Created o10ft FG2A`, `Self-Created o10ft FG%`, `Self-Created FG3M`, `Self-Created FG3A`, `Self-Created FG3%`, `Assisted u10ft FG2M`, `Assisted u10ft FG2A`, `Assisted u10ft FG%`, `Assisted o10ft FG2M`, `Assisted o10ft FG2A`, `Assisted o10ft FG%`, `Assisted FG3M`, `Assisted FG3A`, `Assisted FG3%`


## OUTPUT targets (what a metric must predict)

### `lineupscore2425.csv.xlsx`  — 500×31
**Primary output target.** 500 five-man units: `OffPoss`, `Points`, `PlusMinus`, `EfgPct`, `Fg3Pct`. Offense pts/poss and PlusMinus/OffPoss are the validation outcomes.

Columns: `ShortName`, `TeamAbbreviation`, `GamesPlayed`, `Minutes`, `PlusMinus`, `OffPoss`, `Points`, `FG2M`, `FG2A`, `Fg2Pct`, `FG3M`, `FG3A`, `Fg3Pct`, `NonHeaveFg3Pct`, `FtPoints`, `PtsAssisted2s`, `PtsUnassisted2s`, `PtsAssisted3s`, `PtsUnassisted3s`, `Assisted2sPct`, `NonPutbacksAssisted2sPct`, `Assisted3sPct`, `FG3APct`, `ShotQualityAvg`, `EfgPct`, `TsPct`, `PtsPutbacks`, `Fg2aBlocked`, `FG2APctBlocked`, `Fg3aBlocked`, `FG3APctBlocked`

### `2526score100poss.csv.xlsx`  — 500×31
Player scoring per 100 possessions — player-level output.

Columns: `ShortName`, `TeamAbbreviation`, `GamesPlayed`, `Minutes`, `PlusMinus`, `OffPoss`, `Points`, `FG2M`, `FG2A`, `Fg2Pct`, `FG3M`, `FG3A`, `Fg3Pct`, `NonHeaveFg3Pct`, `FtPoints`, `PtsAssisted2s`, `PtsUnassisted2s`, `PtsAssisted3s`, `PtsUnassisted3s`, `Assisted2sPct`, `NonPutbacksAssisted2sPct`, `Assisted3sPct`, `FG3APct`, `ShotQualityAvg`, `EfgPct`, `TsPct`, `PtsPutbacks`, `Fg2aBlocked`, `FG2APctBlocked`, `Fg3aBlocked`, `FG3APctBlocked`

### `teamscore2425.csv.xlsx`  — 30×28
Team-level scoring output (30 teams).

Columns: `Name`, `GamesPlayed`, `OffPoss`, `Points`, `FG2M`, `FG2A`, `Fg2Pct`, `FG3M`, `FG3A`, `Fg3Pct`, `NonHeaveFg3Pct`, `FtPoints`, `PtsAssisted2s`, `PtsUnassisted2s`, `PtsAssisted3s`, `PtsUnassisted3s`, `Assisted2sPct`, `NonPutbacksAssisted2sPct`, `Assisted3sPct`, `FG3APct`, `ShotQualityAvg`, `EfgPct`, `TsPct`, `PtsPutbacks`, `Fg2aBlocked`, `FG2APctBlocked`, `Fg3aBlocked`, `FG3APctBlocked`


## LEVERAGE-TIered team files (NEW — context/clutch split)

### `teamscoreVHL2425.csv.xlsx`  — 30×27
Team scoring in **Very-High-Leverage** possessions. Paired set: VHL/HL/ML/LL × {teamscore, teammisc}. This is the 'Context Difficulty' axis from the vision formula — lets you test whether a metric's effect strengthens in high-leverage moments.

Columns: `Name`, `OffPoss`, `Points`, `FG2M`, `FG2A`, `Fg2Pct`, `FG3M`, `FG3A`, `Fg3Pct`, `NonHeaveFg3Pct`, `FtPoints`, `PtsAssisted2s`, `PtsUnassisted2s`, `PtsAssisted3s`, `PtsUnassisted3s`, `Assisted2sPct`, `NonPutbacksAssisted2sPct`, `Assisted3sPct`, `FG3APct`, `ShotQualityAvg`, `EfgPct`, `TsPct`, `PtsPutbacks`, `Fg2aBlocked`, `FG2APctBlocked`, `Fg3aBlocked`, `FG3APctBlocked`

### `teammiscVHL2425.csv.xlsx`  — 30×21
Team pace/blocks/steals in Very-High-Leverage possessions.

Columns: `Name`, `Pace`, `SecondsPerPossOff`, `SecondsPerPossDef`, `SecondsExcludingORebsPerPossOff`, `SecondsExcludingORebsPerPossDef`, `FirstChancePoints`, `Blocks`, `Blocked2s`, `Blocked3s`, `BlockedAtRim`, `BlockedShortMidRange`, `BlockedLongMidRange`, `BlockedCorner3`, `BlockedArc3`, `RecoveredBlocks`, `BlocksRecoveredPct`, `Steals`, `LostBallSteals`, `BadPassSteals`, `DefensiveGoaltends`


## PLAYER feature sources (build metrics from these)

### `component_master_2526.csv`  — 707×40
**Master archetype feature table.** 707 players, pre-built: `open_shot_rate`, `tight_shot_rate`, `sc_efg`, `ast_efg`, `pct_self_created`, `drives_per_poss`, `pva_proxy`, `ptv_proxy`, `cov_proxy`, `dsv_proxy`, `rpv_proxy`, etc. Start here for any player metric.

Columns: `player`, `season_year`, `fga`, `pct_self_created`, `sc_fga`, `sc_efg`, `ast_fga`, `ast_efg`, `sc_vs_ast_efg_diff`, `open_shot_rate`, `tight_shot_rate`, `total_fga`, `pva_proxy`, `adj_ast`, `secondary_ast`, `ast_efficiency`, `ptv_proxy`, `efg_above_league`, `drive_playmaking`, `high_value_touch_rate`, `secs_per_touch`, `dribbles_per_touch`, `elbow_per_poss`, `paint_per_poss`, `drives`, `pts_per_drive`, `drives_per_poss`, `drive_pass_pct`, `drive_ast_pct`, `cov_proxy`, `dsv_proxy`, `def_rim_fg_pct`, `rim_protection_above_avg`, `stl`, `blk`, `oreb`, `dreb`, `oreb_contested`, `dreb_contested`, `rpv_proxy`

### `2425trackingshottotals.csv.xlsx`  — 39964×14
Shot buckets by `entity_id` × `close_def_dist` × shot_clock × touch_time × dribble_range. Full-season wide-open/tight 3PA source.

Columns: `season`, `season_type`, `entity_id`, `entity_type`, `u10_ft_fg2m`, `u10_ft_fg2a`, `o10_ft_fg2m`, `o10_ft_fg2a`, `fg3m`, `fg3a`, `close_def_dist`, `shot_clock`, `touch_time`, `dribble_range`

### `2425shotstotals.csv.xlsx`  — 26986×42
Per-SHOT events: `CatchAndShoot`,`WideOpen`,`ShotQuality`,`LineupId`,`PlayerId`. Possession-grain shot detail + the name/id bridge.

Columns: `EventNumber`, `Margin`, `OReboundedShotEventNum`, `X`, `ShotQuality`, `OReboundedRebEventNum`, `Y`, `Blocked`, `LineupId`, `Value`, `BlockPlayerId`, `OpponentLineupId`, `PlayerId`, `Assisted`, `And1`, `GameId`, `Made`, `AssistPlayerId`, `Period`, `Time`, `Putback`, `PossessionNumber`, `ShotType`, `Player`, `StartTime`, `Team`, `TeamId`, `Opp`, `OppTeamId`, `VideoUrl`, `Distance`, `ClockTime`, `ClockStartTime`, `AssistPlayer`, `BlockPlayer`, `PassFromPlayerId`, `PassFromPlayer`, `CatchAndShoot`, `PassFromX`, `PassFromY`, `SecondsRemainingOnShotClock`, `WideOpen`

### `2425totals.csv.xlsx`  — 564×76
76-col full tracking totals per entity_id (drives, touches by zone, passing, rebounding chances, speed/distance). The richest single player table.

Columns: `entity_id`, `entity_type`, `season`, `season_type`, `minutes`, `off_poss`, `def_poss`, `drives`, `drive_fgm`, `drive_fga`, `drive_ftm`, `drive_fta`, `drive_points`, `drive_passes`, `drive_assists`, `drive_turnovers`, `drive_fouls`, `passes_made`, `passes_received`, `assists`, `ft_assists`, `secondary_assists`, `potential_assists`, `adj_assists`, `assist_pts`, `steals`, `blocks`, `def_rim_fgm`, `def_rim_fga`, `touches`, `front_court_touches`, `time_of_poss`, `elbow_touches`, `elbow_touch_fgm`, `elbow_touch_fga`, `elbow_touch_ftm`, `elbow_touch_fta`, `elbow_touch_points`, `elbow_touch_passes`, `elbow_touch_assists`, `elbow_touch_turnovers`, `elbow_touch_fouls`, `paint_touches`, `paint_touch_fgm`, `paint_touch_fga`, `paint_touch_ftm`, `paint_touch_fta`, `paint_touch_points`, `paint_touch_passes`, `paint_touch_assists`, `paint_touch_turnovers`, `paint_touch_fouls`, `post_touches`, `post_touch_fgm`, `post_touch_fga`, `post_touch_ftm`, `post_touch_fta`, `post_touch_points`, `post_touch_passes`, `post_touch_assists`, `post_touch_turnovers`, `post_touch_fouls`, `oreb`, `oreb_contest`, `oreb_uncontest`, `oreb_chances`, `oreb_chance_defer`, `dreb`, `dreb_contest`, `dreb_uncontest`, `dreb_chances`, `dreb_chance_defer`, `feet`, `miles`, `miles_off`, `miles_def`

### `drives2425.csv.xlsx`  — 588×20
Drive volume/efficiency per player (every season 13/14→25/26).

Columns: `Player`, `Drives`, `FGM`, `FGA`, `FTM`, `FTA`, `Points`, `Passes`, `Assists`, `Turnovers`, `Fouls`, `FG%`, `Points Per Drive`, `FGA Per Drive`, `Pass%`, `Ast%`, `TO%`, `Foul%`, `Possessions`, `Drives Per Poss`

### `elbow2526.csv.xlsx`  — 596×21
Elbow touches/passing/scoring per player.

Columns: `Player`, `Touches`, `Elbow Touches`, `FGM`, `FGA`, `FTM`, `FTA`, `Points`, `Passes`, `Assists`, `Turnovers`, `Fouls`, `FG%`, `Points Per Elbow Touch`, `Pass%`, `Ast%`, `TO%`, `Foul%`, `Possessions`, `Touches Per Poss`, `Elbow Touches Per Poss`

### `paint2526.csv.xlsx`  — 596×21
Paint touches per player.

Columns: `Player`, `Touches`, `Paint Touches`, `FGM`, `FGA`, `FTM`, `FTA`, `Points`, `Passes`, `Assists`, `Turnovers`, `Fouls`, `FG%`, `Points Per Paint Touch`, `Pass%`, `Ast%`, `TO%`, `Foul%`, `Possessions`, `Touches Per Poss`, `Paint Touches Per Poss`

### `post2526.csv.xlsx`  — 596×21
Post touches per player.

Columns: `Player`, `Touches`, `Post Touches`, `FGM`, `FGA`, `FTM`, `FTA`, `Points`, `Passes`, `Assists`, `Turnovers`, `Fouls`, `FG%`, `Points Per Post Touch`, `Pass%`, `Ast%`, `TO%`, `Foul%`, `Possessions`, `Touches Per Poss`, `Post Touches Per Poss`

### `passes2425.csv.xlsx`  — 588×14
Passing volume per player.

Columns: `Player`, `Passes Made`, `Passes Recieved`, `Ast`, `FT Ast`, `Secondary Ast`, `Potential Ast`, `Adj Ast`, `Ast Pts`, `Ast Per Pass`, `Secondary Ast Per Ast`, `Possessions`, `Passes Per Poss`, `Potential Ast Per Poss`

### `poss2425.csv.xlsx`  — 588×17
Touches & time-of-possession per player.

Columns: `Player`, `Points`, `Touches`, `Front Court Touches`, `Time of Poss`, `Seconds Per Touch`, `Dribbles Per Touch`, `Elbow Touches`, `Post Touches`, `Paint Touches`, `Possessions`, `Touches Per Poss`, `Front Court Touches Per Poss`, `Time of Poss Per Poss`, `Elbow Touches Per Poss`, `Post Touches Per Poss`, `Paint Touches Per Poss`

### `toughshotmaking2526.csv.xlsx`  — 596×25
Contested/tough shot making per player.

Columns: `Name`, `FGA`, `p_exp eFG%`, `l_exp eFG%`, `act eFG%`, `eFG% p_diff`, `eFG% l_diff`, `u10 FGA`, `p_exp u10 FG%`, `l_exp u10 FG%`, `act u10 FG%`, `u10 FG% p_diff`, `u10 FG% l_diff`, `o10 FG2A`, `p_exp o10 FG2%`, `l_exp o10 FG2%`, `act o10 FG2%`, `o10 FG2% p_diff`, `o10 FG2% l_diff`, `FG3A`, `p_exp FG3%`, `l_exp FG3%`, `act FG3%`, `FG3% p_diff`, `FG3% l_diff`

### `shotdif2425.csv.xlsx`  — 585×25
Defensive shot-difference (how much a defender lowers opp FG%).

Columns: `Name`, `FGA`, `p_exp eFG%`, `l_exp eFG%`, `act eFG%`, `eFG% p_diff`, `eFG% l_diff`, `u10 FGA`, `p_exp u10 FG%`, `l_exp u10 FG%`, `act u10 FG%`, `u10 FG% p_diff`, `u10 FG% l_diff`, `o10 FG2A`, `p_exp o10 FG2%`, `l_exp o10 FG2%`, `act o10 FG2%`, `o10 FG2% p_diff`, `o10 FG2% l_diff`, `FG3A`, `p_exp FG3%`, `l_exp FG3%`, `act FG3%`, `FG3% p_diff`, `FG3% l_diff`

### `2425def.csv.xlsx`  — 588×9
Rim protection per player (Def Rim FG%).

Columns: `Player`, `Steals`, `Blocks`, `DReb`, `Def Rim FGM`, `Def Rim FGA`, `Def Rim FG%`, `Possessions`, `Def Rim FGA Per Poss`

### `shotzone2324.csv.xlsx`  — 39581×14
Per-player shot zones (long format, ~40k rows).

Columns: `season`, `season_type`, `entity_id`, `entity_type`, `u10_ft_fg2m`, `u10_ft_fg2a`, `o10_ft_fg2m`, `o10_ft_fg2a`, `fg3m`, `fg3a`, `close_def_dist`, `shot_clock`, `touch_time`, `dribble_range`


## Per-game raw tree (data/ + response_data/)

### `data/possessions/202012220BRK_tp.csv`  — ?×?
~2,183 `_tp.csv` (true possessions + advantage) and ~2,183 `_lineups.csv` (5 on-court players by name, with time_on/off). Join by game_id+period+time.

Columns: 


- `data/raw_pbp/<game>.csv` — ~2,183 raw play-by-play files (one per game).
- `data/schedule/` — 187 schedule files. `data/player_iapi_scores.csv`, `player_iib_scores.csv` — derived player scores.
- `response_data/game_details/` — ~730 game detail JSON/CSV. `response_data/overrides/` — ~190.


## How this maps to Pressure × Output testing

`Value = Pressure × Output Lift × Context Difficulty × Frequency`

| Axis | Best file(s) | Grain |
|---|---|---|

| **Pressure** | `_tp.csv` `advantage_count`; `pbp_advantage_all_seasons.creation_rate`; `selfcreated*` | possession / player |

| **Output** | `lineupscore2425` (pts/poss, +/-); `2526score100poss` | lineup / player |

| **Context Difficulty** | `team{score,misc}{VHL,HL,ML,LL}2425` | team × leverage |

| **Frequency** | `OffPoss`/`Possessions`/`touches` columns throughout | all |


**Next-metric rule (from the Lowest-Threat-Spacer failure):** only test metrics whose outcome is NOT already a box-score stat. Spacing failed because lineup 3P% already measures it. Advantage-creation (`advantage_count`, `creation_rate`) has **no box-score equivalent** → strongest candidate to validate next.
