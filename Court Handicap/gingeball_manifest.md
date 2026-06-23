# Gingeball data manifest (sim-relevant)

Source: https://raw.githubusercontent.com/jackbecker2836-arch/gingeball-data/main

**Join rules:** `entity_id` and team ids are stats.nba.com ids (player ids resolve to names via nba_api static list, verified 100% on 2425totals). Lineup ids are `-`-joined player ids **sorted as strings** (e.g. `1629029-1630162-201142-203500-203999`; string sort, not numeric). The per100/score100poss lineup files key on last-name `ShortName` + `TeamAbbreviation`.

## grain: player_name  (30 files)
- **2425def.csv.xlsx** [ok] season=24-25 rows=588 cols=9 key=`Player` → yes (name join)
- **def2425.csv.xlsx** [ok] season=24-25 rows=588 cols=9 key=`Player` → yes (name join) — DUP of 2425def.csv.xlsx
- **def2526.csv.xlsx** [ok] season=25-26 rows=596 cols=9 key=`Player` → yes (name join)
- **defense2526.csv.xlsx** [ok] season=25-26 rows=596 cols=9 key=`Player` → yes (name join) — DUP of def2526.csv.xlsx
- **selfcreated2425.xlsx** [ok] season=24-25 rows=569 cols=26 key=`Player` → yes (name join)
- **selfcreated2526.xlsx** [ok] season=25-26 rows=583 cols=26 key=`Player` → yes (name join)
- **component_master_2526.csv** [ok] season=25-26 rows=707 cols=40 key=`player` → yes (name join)
- **2425touchdata.csv** [ok] season=24-25 rows=2500 cols=23 key=`Player` → yes (name join)
- **202526touchdata.csv** [ok] season=25-26 rows=2500 cols=23 key=`Player` → yes (name join)
- **shotdif2425.csv.xlsx** [ok] season=24-25 rows=585 cols=25 key=`Name` → yes (name join)
- **shotdif2526.csv.xlsx** [ok] season=25-26 rows=596 cols=25 key=`Name` → yes (name join)
- **drives2425.csv.xlsx** [ok] season=24-25 rows=588 cols=20 key=`Player` → yes (name join)
- **drives2526.csv.xlsx** [ok] season=25-26 rows=596 cols=20 key=`Player` → yes (name join)
- **passes2425.csv.xlsx** [ok] season=24-25 rows=588 cols=14 key=`Player` → yes (name join)
- **passing2526.csv.xlsx** [ok] season=25-26 rows=596 cols=14 key=`Player` → yes (name join)
- **possessions2425.csv.xlsx** [ok] season=24-25 rows=588 cols=17 key=`Player` → yes (name join)
- **possessions2526.csv.xlsx** [ok] season=25-26 rows=588 cols=17 key=`Player` → yes (name join) — DUP of possessions2425.csv.xlsx
- **poss2425.csv.xlsx** [ok] season=24-25 rows=588 cols=17 key=`Player` → yes (name join) — DUP of possessions2425.csv.xlsx
- **rebound2526.csv.xlsx** [ok] season=25-26 rows=592 cols=11 key=`Player` → yes (name join)
- **2425reb.csv.xlsx** [ok] season=24-25 rows=583 cols=11 key=`Player` → yes (name join)
- **2425rebtotals.csv.xlsx** [ok] season=24-25 rows=7172 cols=27 key=`Player` → yes (name join)
- **2425shotstotals.csv.xlsx** [ok] season=24-25 rows=26986 cols=42 key=`Player` → yes (name join)
- **2425extras.csv.xlsx** [ok] season=24-25 rows=500 cols=31 key=`Name` → yes (name join)
- **speeddistance2526.csv.xlsx** [ok] season=25-26 rows=596 cols=6 key=`Player` → yes (name join)
- **paint2526.csv.xlsx** [ok] season=25-26 rows=596 cols=21 key=`Player` → yes (name join)
- **post2526.csv.xlsx** [ok] season=25-26 rows=596 cols=21 key=`Player` → yes (name join)
- **elbow2526.csv.xlsx** [ok] season=25-26 rows=596 cols=21 key=`Player` → yes (name join)
- **toughshotmaking2526.csv.xlsx** [ok] season=25-26 rows=596 cols=25 key=`Name` → yes (name join) — DUP of shotdif2526.csv.xlsx
- **shottrackingdata.csv.xlsx** [ok] season=? rows=26986 cols=42 key=`Player` → yes (name join) — DUP of 2425shotstotals.csv.xlsx
- **2021to2526pbpalladvantage.csv** [ok] season=20-21 rows=430 cols=30 key=`Name` → yes (name join)

## grain: player_id  (9 files)
- **component_historical_2014_2024.csv** [ok] season=20-14 rows=5211 cols=53 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved)
- **component_historical_2019_2024.csv** [ok] season=20-19 rows=3296 cols=36 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved)
- **2425totals.csv.xlsx** [ok] season=24-25 rows=564 cols=76 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved)
- **players2324.csv.xlsx** [ok] season=23-24 rows=560 cols=76 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved)
- **shotdat2425.csv.xlsx** [ok] season=24-25 rows=39964 cols=14 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved)
- **opponent2425.csv.xlsx** [ok] season=24-25 rows=30 cols=76 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved)
- **opponent2526.csv.xlsx** [ok] season=25-26 rows=30 cols=76 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved)
- **2425trackingshottotals.csv.xlsx** [ok] season=24-25 rows=39964 cols=14 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved) — DUP of shotdat2425.csv.xlsx
- **pbpstats-tracking-shots.csv.xlsx** [ok] season=? rows=40538 cols=14 key=`entity_id` → yes (entity_id = stats.nba.com id; 100% name-resolved)

## grain: lineup  (10 files)
- **per100MSC2526.csv.xlsx** [ok] season=25-26 rows=500 cols=24 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **per100PS2526.csv.xlsx** [ok] season=25-26 rows=500 cols=36 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **per100SQ2526.csv.xlsx** [ok] season=25-26 rows=500 cols=48 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **per100TOs2526.csv.xlsx** [ok] season=25-26 rows=500 cols=16 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **per100assists2526.csv.xlsx** [ok] season=25-26 rows=500 cols=13 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **per100fouls2526.csv.xlsx** [ok] season=25-26 rows=500 cols=19 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **per100ftsource2526.csv.xlsx** [ok] season=25-26 rows=500 cols=14 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **per100reb2526.csv.xlsx** [ok] season=25-26 rows=500 cols=33 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **per100scp2526.csv.xlsx** [ok] season=25-26 rows=500 cols=33 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)
- **2526score100poss.csv.xlsx** [ok] season=25-26 rows=500 cols=31 key=`lineup_5man` → engine/matchup grain (subs, Gap-B, MIN/+-)

## grain: team  (14 files)
- **team2425offstealmisc.csv.xlsx** [ok] season=24-25 rows=30 cols=21 key=`Name` → engine calibration / matchup
- **team2chance2425.csv.xlsx** [ok] season=24-25 rows=30 cols=31 key=`Name` → engine calibration / matchup
- **teamfoul2425.csv.xlsx** [ok] season=24-25 rows=30 cols=17 key=`Name` → engine calibration / matchup
- **teamftsource2425.csv.xlsx** [ok] season=24-25 rows=30 cols=12 key=`Name` → engine calibration / matchup
- **teammisc2425.csv.xlsx** [ok] season=24-25 rows=30 cols=22 key=`Name` → engine calibration / matchup
- **teamoffFTmissmisc2425.csv.xlsx** [ok] season=24-25 rows=30 cols=21 key=`Name` → engine calibration / matchup
- **teamoffmakemisc2425.csv.xlsx** [ok] season=24-25 rows=30 cols=21 key=`Name` → engine calibration / matchup
- **teamoffmissmisc2425.csv.xlsx** [ok] season=24-25 rows=30 cols=21 key=`Name` → engine calibration / matchup
- **teampass2425.csv.xlsx** [ok] season=24-25 rows=30 cols=11 key=`Name` → engine calibration / matchup
- **teampen2425.csv.xlsx** [ok] season=24-25 rows=30 cols=34 key=`Name` → engine calibration / matchup
- **teamreb2425.csv.xlsx** [ok] season=24-25 rows=30 cols=31 key=`Name` → engine calibration / matchup
- **teamscore2425.csv.xlsx** [ok] season=24-25 rows=30 cols=28 key=`te` → engine calibration / matchup
- **teamshotdis2425.csv.xlsx** [ok] season=24-25 rows=30 cols=46 key=`Name` → engine calibration / matchup
- **teamto2425.csv.xlsx** [ok] season=24-25 rows=30 cols=14 key=`Name` → engine calibration / matchup

## grain: (unreadable / missing)  (1 files)
- **toughshotmaking2425.csv.xlsx** [http_404] season=24-25 rows= cols= key=`` → 
