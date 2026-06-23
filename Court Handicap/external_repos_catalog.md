# External Repos Catalog — Gingeball Court Handicap

Running record of every public repo evaluated for the project. Nothing gets thrown away:
each is logged as **DATA** (merged or mergeable), **BLUEPRINT** (a method/feature-spec to copy),
**COMPARISON** (an external rating to validate ours against), **FILM TOOL** (needs game video),
or **SKIP** (genuinely nothing for us). Last updated this session.

---

## TIER 1 — DATA we merged onto the master table

### llimllib/nba_data  — https://github.com/llimllib/nba_data
Up-to-date dumps from stats.nba.com + ESPN Analytics, 2010–2026. **Merged onto master:**
physical measurables (height/weight/age/draft), advanced (PIE, off/def/net rtg, usg%, ts%, pace),
defensive impact (opp pts in paint / 2nd-chance / fast-break per 100, def-WS), and **ESPN Net Points**
(total/off/def per game — independent impact metric; Jokić 7.6, SGA 5.7, Luka 4.3). 564 + 453 players matched.
Does NOT contain synergy/hustle/matchup/gravity — that's not in scope of his scraper.

### travzhu5074/nba_defensive_players  — https://github.com/travzhu5074/nba_defensive_players
Basketball-Reference advanced stats + defensive cluster labels, 2021–2025. **Merged onto master:**
the BPM family we lacked — `bbr_obpm`, `bbr_dbpm`, `bbr_bpm`, `bbr_vorp`, `bbr_dws` (349 players, 24-25).
DBPM is a legit defensive-impact estimate (top: Paul Reed, Caruso, Kris Dunn, Jokić, Wembanyama, Draymond).
Also has k-means defensive **clusters** on specialists — useful to validate our defensive archetypes.

### CyroAsseo/Defender's-Dilemma  — https://github.com/CyroAsseo/Defender-s-Dilemma
Measured contested-FG% by zone per defender, 2019–25, with league baselines. **Merged onto master:**
`rim_contest_det`, `three_contest_det`, `all_contest_det` (FG% allowed vs league avg, 532 players).
**Caveat: weak signal** — contested FG% (esp. 3s) is low-stability/luck-driven; leaderboard surfaces
role players, not known stoppers. Keep but weight near zero. `rim_contest_det` is small-sample noise — candidate to drop.

### rosamsierrap/NBA-Unwanted-Defender  — https://github.com/rosamsierrap/NBA-Unwanted-Defender
The classic 2014-15 shot logs: 128k shots with defender distance, shot clock, dribbles, touch time, result.
Real shot-level features we lack — but ONE old season. **Use:** training/validating a shot-quality model, not current ratings.

### tbala25/R_NBA-Grit  — https://github.com/tbala25/R_NBA-Grit
Player-level hustle counts (screen assists, deflections, loose balls, charges, contested 2pt/3pt), 445 players.
Real data but overlaps what fastbreak's hustle endpoint gives fresher/fuller. Snapshot reference.

---

## TIER 2 — BLUEPRINTS (methods / feature specs to copy)

### dteuscher1/Project426  — https://github.com/dteuscher1/Project426
**High value.** 4,620 team-games of hustle features vs WIN. We mined it → `hustle_win_signal.csv`.
**Finding (how to weight the hustle data fastbreak pulls):** box-outs→team-rebounds (r≈0.19) and
screen-assist-points (r≈0.15) and loose balls (r≈0.13) and screen assists (r≈0.12) predict winning most;
deflections weaker (r≈0.07); contested-shot rate and charges weakest. Weight accordingly.

### mariangellobon/contested-shot-analysis  — https://github.com/mariangellobon/contested-shot-analysis
**The right way to do contested shots.** Optical Hawkeye tracking + PBP → composite Shot Contest Quality
from release timing, defender positioning, and movement. No shipped data (loads from OneDrive), but it's the
method to copy if/when we get tracking data — far better than aggregate contested-FG%.

### samluxenberg1/nba_hustle_sdg  — https://github.com/samluxenberg1/nba_hustle_sdg
Game-theory / optimal-control model of hustle-effort allocation **with a game simulator**. Directly relevant
to our possession engine — a framework for modeling effort/fatigue trade-offs as strategic choices.

### dhahami/nba-hustle-rapm  — https://github.com/dhahami/nba-hustle-rapm
Builds Hustle-RAPM (regularized adjusted plus-minus weighting hustle). Method + poster of findings for
turning hustle counts into an impact metric. Blueprint for an impact layer on the fastbreak hustle data.

### iggym21/NBA_Shot_Quality_Model  — https://github.com/iggym21/NBA_Shot_Quality_Model
XGBoost shot-make-probability with a clean 6-feature spec (distance, angle, defender-distance bucket,
shot clock, quarter, score diff). Blueprint for our own shot-quality build.

### VicGIT31/nba-shot-success-predictor  — https://github.com/VicGIT31/nba-shot-success-predictor
Another XGBoost shot-success pipeline from tracking + SHAP interpretability. Blueprint; pairs with iggym21.

### kyleleung11/NBA-Rasch-Model-Shooters-Defenders  — https://github.com/kyleleung11/NBA-Rasch-Model-Shooters-Defenders
Rasch-style mixed-effects logistic model separating true shooter ability from defender impact (2014-15, R).
Blueprint for a model that disentangles shooter skill from defender effect — relevant to shotdif + contest work.

### upneja/celticsML  — https://github.com/upneja/celticsML
Pre-game scouting-report generator (pulls nba_api live; no shipped data). **Standout idea: Shannon
shot-zone entropy** — entropy across the 7 shot zones = how balanced vs focused a shot diet is
(low = predictable/focused, high = diverse, hard to game-plan). **Buildable from our shot-zone data now.**
Also documents play-type frequency tracking via SynergyPlayTypes (confirms it's the top source — what
fastbreak pulls) and ATO/temporal pattern detection (game-to-game strategy shifts via rolling windows).

### bhaveshmantrabuddi/nba_analytics_application_fullstack  — https://github.com/bhaveshmantrabuddi/nba_analytics_application_fullstack
Full-stack dashboard (Angular/Django/Postgres). Data is sample-only (10 players). Value is the
**play-type efficiency engine structure** — FG%/assists organized by Pick&Roll / Isolation / Post-up —
the exact schema to mirror when synergy data lands, plus a team-branded spatial shot-chart design. Architecture blueprint.

---

## TIER 3 — COMPARISON metrics (external ratings to validate ours)

### garroshub/NBA-Enhanced-Defensive-Index  — https://github.com/garroshub/NBA-Enhanced-Defensive-Index
"EDI v2.4" — 5-dimension Bayesian defensive index (Shot Suppression, Profile, Hustle, IQ, Anchor),
2021–26. **Extracted → `edi_scores_external.csv`** (289 players, EDI + 5 dims + role + confidence, 24-25).
Someone's model output, not raw data — use to sanity-check our defensive metrics, don't treat as ground truth.

---

## TIER 4 — FILM TOOLS (need game video to be useful)

### lin-simon/NBAction  — https://github.com/lin-simon/NBAction
YOLOv8 computer-vision system detecting shooting/scoring/defending + tracking players/ball/net from video.
Ships trained weights (`best.pt`) and test clips. **Use:** only if we process our own game film — but if we ever
do, this is a working action-detection starting point. Kept on record for that path.

### yashsawhney06/nba-shot-progression  — https://github.com/yashsawhney06/nba-shot-progression
Video/CV pipeline analyzing shot selection from film + defender stats. Code only. Same bucket as NBAction.

### V0IG3R/Basketball_Analyzer  — https://github.com/V0IG3R/Basketball_Analyzer
Python CV that counts dribbles and identifies which hand performs each. Film tool, code only.

### Swamisharan1/Basketball-video-analysis  — https://github.com/Swamisharan1/Basketball-video-analysis
Python CV: dribble count + hand-movement speed from video via pretrained ball/pose models. Film tool, code only.

---

## TIER 5 — SKIP

### MannyBanda/Deepfuckingthesis  — https://github.com/MannyBanda/Deepfuckingthesis
WNBA sports-betting system (odds, canary events, xgboost signal model, bankroll compounding). Mislabeled
"NBA analytics." Nothing tactical for us.

---

## THE TOOL (separate from data repos)

### reidhoch/fastbreak  — https://github.com/reidhoch/fastbreak
Async client for stats.nba.com. Not data — the **tool** that pulls our entire blocked tier (synergy play-types,
hustle/screen-assists/deflections, who-guards-whom matchups, official gravity/leverage/shot-quality). Run locally.
Puller written: `pull_fastbreak.py`.

---

## BATCH 4 — tracking, prediction & clustering sweep

### rajshah4/NBA_SportVu  — https://github.com/rajshah4/NBA_SportVu   [BLUEPRINT + SAMPLE DATA — high]
95,759 rows of real **SportVU optical tracking** for a sample game (x_loc, y_loc, radius/ball-height,
game/shot clock per player+ball). 2015-16, one game — not current, but **the real format and a working
sample to prototype the spatial tier** (defender distance, spacing, gravity, closeouts). Foundation for our deepest blocker.

### galcesana/nba-predict  — https://github.com/galcesana/nba-predict   [DATA — novel, game-level]
LLM-extracted **news-sentiment features** (weighted 24h/72h, article volume, negativity, volatility) and
**injury-availability features** (starters out, minutes/usage/value missing), per team-game, current season.
New context axis for the handicap/sim (team-strength adjustments). Feeds game context, not the player master.

### rc-9/SmartGM  — https://github.com/rc-9/SmartGM   [COMPARISON + DATA]
GM intelligence suite. `cln_clusters.csv` (224 players, position-specific cluster memberships),
`cln_comprehensive_stats.csv` (possession-normalized incl. ScreenAssists/POSS, %usage breakdowns),
`cln_lineup_stats.csv` (1490 lineups OffRtg/DefRtg/NetRtg). Clusters = archetype yardstick; comprehensive overlaps ours.

### Vivaan-Sehgal/NBA-Player-Clustering  — https://github.com/Vivaan-Sehgal/NBA-Player-Clustering   [COMPARISON]
24-25 player clustering on Basketball-Reference advanced (352 players). External archetype yardstick; b-ref inputs overlap ours.

### sportsdataverse/hoopR  — https://github.com/sportsdataverse/hoopR   [TOOL]
Clean/tidy R package for NBA play-by-play + stats. No committed game data, but a high-quality PBP *source*
(richer event-type maps than our scraper) if we want cleaner pulls.

### s9b/NBA-Predictor  — https://github.com/s9b/NBA-Predictor   [BLUEPRINT]
CARMELO-lite ELO + Vegas odds + injuries, 9 models incl. stacking ensemble, Optuna tuning, flat-bet backtest. Prediction method, no data.

### designed7000/Euro_stepper_analyst  — https://github.com/designed7000/Euro_stepper_analyst   [BLUEPRINT]
Streamlit analytics: shooting analysis, player comparisons, ML player-similarity matching. Method/app, pulls data live.

### ShotGeek/ShotGeek  — https://github.com/ShotGeek/ShotGeek   [BLUEPRINT/app]
Open-source Django NBA stats + comparison platform. Architecture reference; data pulled live (only a test fixture committed).

### mokshpatel0414/nba-three-point-revolution  — https://github.com/mokshpatel0414/nba-three-point-revolution   [DATA — low]
SQL analysis of the 3pt revolution 2000-2023; ships season-level trend CSVs (league 3pt trend, leaders, volume-vs-winning). League-context aggregates.

### turbot/powerpipe-mod-nba  — https://github.com/turbot/powerpipe-mod-nba   [TOOL — low]
Powerpipe + SQLite dashboards over a balldontlie-style API. Viz tool, no unique data.

### donaldmyshen/NBA-player-shooting-data-visualization  — https://github.com/donaldmyshen/NBA-player-shooting-data-visualization   [BLUEPRINT/app — low]
Front-end shot-location hot-spot viz. Design reference.

### voronezh00136-bit/quant-trading-bot-kesha  — https://github.com/voronezh00136-bit/quant-trading-bot-kesha   [SKIP]
Automated betting/trading bot (Pine Script, probability model). Not tactical data — same bucket as Deepfuckingthesis.

### mapace22/BD-NBA-Hadoop-Spark-Ecosystem  — https://github.com/mapace22/BD-NBA-Hadoop-Spark-Ecosystem   [SKIP]
Hadoop/Spark big-data infra demo. Its only committed dataset is soccer (`datos_futbol`); no NBA data.

---

## BATCH 5 — IQ, prediction & longevity sweep

### worldwidesuperstar/nba-iq  — https://github.com/worldwidesuperstar/nba-iq   [DATA + COMPARISON + BLUEPRINT — high]
Computed **basketball-IQ score** per player (300 players) — composite of ast/tov, late-clock efficiency,
clutch ast/tov, eFG, foul discipline, deflections, screen assists. Top: Haliburton 143, Jokić, LeBron, Curry,
Tyus Jones — validates instantly. **Extracted → `iq_scores_external.csv`.** Also ships per-player
**shooting-by-dribble-range splits** (catch-shoot vs off-the-dribble efficiency) — granular self-creation data.
Decision-quality blueprint + comparison yardstick for our chain-creation work.

### Andres-boullosa/nba-data-analytics  — https://github.com/Andres-boullosa/nba-data-analytics   [DATA — low/betting]
SQLite DB (GAME_STATS 21,920 rows, GAMES, TEAMS, + a betting-odds table) and ROI/stake matrices.
Fundamentally a betting project; game data overlaps nba_data, odds are betting-oriented.

### EvabW/Predicting-the-Outcomes-of-NBA-Games  — https://github.com/EvabW/Predicting-the-Outcomes-of-NBA-Games   [BLUEPRINT — flagged]
Claims 90% game-prediction accuracy on 26k games — **almost certainly data leakage** (real ceiling ~68-70%).
`games.csv` is the standard Kaggle set we already have. Cautionary blueprint.

### allegheny-college.../Never-Tell-Me-The-Odds-kellerliptrap  — https://github.com/allegheny-college-comp-fall-2024/Never-Tell-Me-The-Odds-kellerliptrap   [BLUEPRINT/betting — low]
Team game-log dashboard + XGBoost odds model (student project). Betting/prediction; gamelogs overlap ours.

### stuccopotamus/How-statisticians-ruined-Basketball  — https://github.com/stuccopotamus/How-statisticians-ruined-Basketball   [BLUEPRINT — low]
Shot-selection-evolution analysis, 2003/04–2023/24. Notebooks, no committed data. League-trend reference.

### Cyberoctane29/NBA-Player-Career-Longevity-Prediction  — https://github.com/Cyberoctane29/NBA-Player-Career-Longevity-Prediction-Using-Naive-Bayes-Classifier   [BLUEPRINT — off-lane]
Naive Bayes predicting rookie 5-year survival (classic Kaggle rookie set). Durability/retention, not tactical.

### mslawsky/nba-career-longevity-analysis  — https://github.com/mslawsky/nba-career-longevity-analysis   [BLUEPRINT — off-lane]
Same rookie 5-year-longevity task + extracted-features CSVs. Marginal value as an aging/durability prior.

---

## BATCH 6 — impact modeling (RAPM)

### EyimofeA/nba-spm  — https://github.com/EyimofeA/nba-spm   [COMPARISON + BLUEPRINT — highest-value impact metric found]
Proper SPM→prior→RAPM impact stack. Ships **computed RAPM** (`career_rapm_1year.csv`: 13,429 player-seasons,
**1997–2024**, Off/Def/total RAPM + VORP + possessions). **Extracted → `rapm_external.csv`.**
Total & Offensive RAPM face-valid (2023-24 top: Luka, Brunson, SGA, Giannis, LeBron, Jokić) — the best impact
yardstick in the catalog. **CAVEAT: the Defensive-RAPM column in this dump is unreliable** (leaders implausible —
McDermott/Kispert/Sexton; sign convention muddled). Use total/offensive only; we have DBPM/matchups/EDI for defense.
Stops at 2023-24 → a stable *prior*, not current. **Method is also a blueprint:** GBM predict O/D RAPM from
box+tracking → Bayesian prior → ridge RAPM on PBP — buildable now that we have the box+tracking inputs.
Plus `zTS` (playtype-adjusted relative True Shooting) concept.

---

## BATCH 7 — gravity & spacing

### neeljshah/gravityInfluence  — https://github.com/neeljshah/gravityInfluence   [BLUEPRINT — concept matches our thesis]
Defensive Gravity Model (Power BI). Computes Gravity (Euclidean defender-displacement from shot-location
spatial analysis — a *proxy*, not true tracking) and **Elasticity** (a player's efficiency variance under
defensive pressure = pressure-resistance). No committed per-player data (scripts + DAX). **The Elasticity
concept = our Pressure×Output thesis, independently formalized** — strong validation + a buildable
pressure-sensitivity metric (matchup FG% under tight D vs overall). Gravity here is shot-origin-based, NOT the
official tracking gravity (which still 500s) — so it's a method, not a gravity-blocker fix.

### highzavi/nba-personnel-tracking  — https://github.com/highzavi/nba-personnel-tracking   [FILM TOOL]
"NBA Spacing Analyzer." Despite the SportVU mention, ships a YOLOv8 computer-vision spacing/gravity tool that
processes game video (demo .mov clips + weights = the 267M). No tracking data committed. Film-path tool, like NBAction.

### rnorlund/adaptive-gravity-sort  — https://github.com/rnorlund/adaptive-gravity-sort   [SKIP — not basketball]
A uint32 parallel sorting algorithm; "gravity" is a physics metaphor for bucket spacing. Keyword false-positive.

---

## BATCH 8 — scrapers (EPM, nbastuffer)

### mwrolstad/dunks_and_threes_scraper  — https://github.com/mwrolstad/dunks_and_threes_scraper   [TOOL — high potential: EPM]
Scraper for dunksandthrees.com; confirmed pulls **EPM (Estimated Plus-Minus, O/D/total)** — top-tier public
impact metric. No committed data. **Run locally (like fastbreak) to get CURRENT-season EPM** — a 4th impact
yardstick, and the freshest (our RAPM stops at 2023-24). Sandbox can't reach the site.

### Humblee-Learning-Online/data-scraper  — https://github.com/Humblee-Learning-Online/data-scraper   [TOOL/DATA — low]
Flask cron scraper for nbastuffer. Ships players.csv but only 57 players of basic box stats. Overlaps ours.

### avist1/NBA_Data  — https://github.com/avist1/NBA_Data   [TOOL — low]
nbastuffer scraper + AutoML dashboard. No committed data.

### saibheema/hawkeye  — https://github.com/saibheema/hawkeye   [SKIP — not basketball]
Chrome automation extension (DOM tools, flow record/replay). "Hawkeye" = browser tool, not optical tracking. Keyword collision.

---

## ARTIFACTS PRODUCED FROM THESE REPOS
- `master_player_table_2425.csv` — now carries nba_data (bio + ESPN Net Points), travzhu BPM family, CyroAsseo contest deltas.
- `hustle_win_signal.csv` — which hustle stats predict winning (from Project426). Use to weight fastbreak hustle data.
- `edi_scores_external.csv` — garroshub EDI defensive ratings, for comparison.
- `iq_scores_external.csv` — nba-iq basketball-IQ scores + 10 component percentiles (300 players), for comparison.
- `rapm_external.csv` — RAPM (Off/Def/total) + VORP, 13,429 player-seasons 1997-2024, from nba-spm. Best impact yardstick; use total/off (Def column unreliable).
- `pull_fastbreak.py` — pulls the blocked tier.

---
### AgentRatz/hawkeye-data-scraper — SKIP (wrong sport)
- URL: https://github.com/AgentRatz/hawkeye-data-scraper
- What it is: scrapes **IPL (Indian Premier League) CRICKET** Hawkeye ball-by-ball data (bowl/over/batsman). README opens "🏏🦅 ... scrape Indian Premier League (IPL) Hawkeye data."
- Why skip: not basketball. "Hawkeye" keyword collision (same trap as saibheema/hawkeye Chrome ext). No NBA value.
- Verdict: SKIP. Do not revisit.

---
### mwrolstad/dunks_and_threes_scraper — DATA (CRACKED: current-season EPM)
- URL: https://github.com/mwrolstad/dunks_and_threes_scraper
- What it is: scrapes dunksandthrees.com. The `--epm` path returns EPM (Estimated Plus-Minus): off/def/total impact + per-100 box + ranks + z-scores.
- GOTCHA: official scraper hardcodes 87 column names; site now returns 88 (added `n_rapm`) -> crashes at labeling with "Length mismatch 88 vs 87". FIX = our pull_epm2.py (keeps the site's own descriptive keys instead of forcing names). The site's real keys: off/def/tot/tot_change/n_rapm + p_*_100 box + *_rk + *_z.
- Season note: CURRENT season (2026 = 2025-26) is fully unlocked (602 players). PRIOR seasons are PAYWALLED ("Locked Player") — 2024-25 pull returned only ~5 visible names. So EPM is a CURRENT-season yardstick only.
- How we use it: merged epm_off_cur/epm_def_cur/epm_tot_cur onto master (472/585). Validates vs BPM r=0.75, ESPN NetPts r=0.66. Fills the gap RAPM leaves (RAPM stops 23-24). Stored: epm_current_external.csv. Tools: pull_epm2.py.
- Verdict: DATA, current-season impact. Keep; re-pull each season for fresh current EPM.

---

## 2026-06-20 SCAN — 53-repo public sweep (shallow-clone + data-file inventory)

Method: every repo shallow-cloned, committed data files inventoried (size/rows/headers/season).
Code/pipelines that pull live from stats.nba.com are not fetchable in-sandbox and are SKIP by default.
Headline: this engine's own scraped archive (pass/drives/paint/elbow/shotdif/lineup + RAPM/Synergy/hustle/matchups)
stays richer for 2024-25 than anything on public GitHub. The public value below is **new dimensions**, not core inputs.

### DATA — new dimensions (mergeable)
- **Baileyd18/NBA-Player-Impact-and-Value-Dashboard-2025-26** — `Data/raw_salary.csv` (583, 2025-26→2030-31 + guaranteed); `Data/raw_advanced.csv` (735, 2025-26 PER/USG/BPM/WS/VORP). → **salary/value layer**.
- **vukivkovi/master_thesis_nba** — `Salaries.csv` (15,820 historical), `Players.csv` (6,533 bio: draft/anthro), `Cap.xlsx`. → salary history + bio spine.
- **timpugh/nba-data-api** — `data/NBA_Player_Data.csv` (12,845 bio incl. college/country). → bio spine.
- **shirinalapati/2026-NBA-Lineup-Intelligence** — `data/nba_lineups.db` (2025-26 lineup combos). → advantage/sim feed.
- **shirinalapati/2025-2026-NBA-Undervalued-Players-App** — `public/data/players.json` (2025-26 UVPS value indices).
- **ChenEylon/NBA-breakout-predictor** — `data/features.parquet` (2,435; 2011-12→2025-26; usg/ast%/pie/ratings + YoY deltas; 169 rows 2024-25). → PVA fallback (`ast_pct`) / usage context.

### DATA — pressure/clutch/officiating (candidate future component; on-theme for pressure×output)
- **basketballrelativity/nba_official_evaluation** — `data/l2m/l2m_2018..2023.csv` + challenge data (~50k Last-Two-Minute calls: committing/disadvantaged player, call type). 2018→2023-24. Serious source.
- **Jaskirat-007/-NBA-Clutch-Player-Analysis** — `clutch_ranking.csv`, `expanded_clutch_dataset.csv` (2023-24 clutch box + CLUTCH_SCORE composite).

### BLUEPRINT — methods to copy (no usable current data)
- **uptownnickbrown/unicorn** — contextual player embeddings (self-attention over 10-player lineups, possession-outcome distributions, base+delta player vectors). Data ends 2023. Architecture is directly relevant to the advantage/sim layer.
- **SamV250/alfred-court** — offensive-structure graph metrics (PageRank/betweenness/community detection on play-by-play). Template for an offensive-structure feature.
- **bdvolwiler/NBAFreeThrowAnalysis** `nbaStats.csv` — ideal SGV shot-location schema (corner-3 rate, zone FGA%) but ~2010-15 data. Confirms the wishlist for a future shot-location SGV upgrade.

### TO CHECK
- **dckp1000/NBA-96-26-DATASET** — title claims historical datasets, none in tree (likely Releases/git-LFS). Targeted check pending.

### SKIP (box-score logs / synthetic / dashboards / code-only)
MakiKainan, AbhinavGhub1 (synthetic), ShivaKumarH24, Syawaluddin-Adzran, lindsay-lintelman, SbohCele, CalebRProjects (sparse), Justinsanabria11, Vis-3, Anjum-Kumawat, Gikubu, vdevigere, KaustubhJoshi07, friendoftiger, hfurlan1, IbrahimAli9815, RyanFabrick (injury set external), ShaSrinivasan, f07bio-creator, weiran0129, Jet-Zenith, sunny-fang, ajpayzant, elthomas1, jmelon1, aaflores7, jahnuenug2, BenTrokenheim, garop0102 (Euro box — prospects only), trumandaniels, spoonertaylor, GBX-Max1220/AllanWessels/yuvraj (2025-26 box logs — fallback only), kobywelman99 (team pace), shawi1, dpk-rdy, orkunyucel.

### BLUEPRINT (FILM PHASE — MUST) — rjunw/nba2nba — https://github.com/rjunw/nba2nba
E2E next-best-action system (offense+defense). No committed data; it's the reference pipeline for our film→tracking gap.
Front half (implemented): **RF-DETR Medium** player detection (Roboflow `basketball-player-detection-2` v20, 50ep/bs16) →
**ByteTrack** (frame_rate 30, τ=0.6, IoU>0.2, ~30-frame lost buffer) → **YOLOv11x-pose** court keypoints
(Roboflow `basketball-court-detection-2` v19, 300ep) → **Homography** to 94×50 top-down (reusable `Court` keypoint graph) →
**Qwen3-VL-4B QLoRA** jersey OCR for player ID (NFL jersey proxy dataset, 3ep).
Back half (designed, unbuilt = our opportunity): scene-transition split → top-down→vector embeddings→retrieval →
embeddings→human-readable actions→**Gemini** next-best-action → FastAPI + Streamlit.
**Why MUST:** front-half output = per-frame top-down (x,y) for 10 players+ball = the exact input for `true_possession.py`/`advantage_tagger.py`
→ populates the empty advantage-chain tables and upgrades COV/PTV/RPV from proxy to real spatial.
Saved: `film_tracking/nba2nba_pipeline_blueprint.md` (full specs) + `film_tracking/court_keypoints_nba.py` (homography target geometry).
Caveats: GPU needed for the fine-tunes; we must supply broadcast film; back half is unbuilt.
