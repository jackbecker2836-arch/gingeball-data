# Data Gap Map — RECONCILED (honest v2)

> v1 of this doc was written half-blind to the prior repo-hunting sessions and listed
> things to "go hunt for" that were **already owned**. This version is reconciled against
> `external_repos_catalog.md`, `BUILT_METRICS_LOG.md`, `sim_feed_README.md`, and the live
> master table (`master_player_table_2425.csv`, 90 cols). Trust season columns / GameIds,
> never filenames.

## ALREADY FILLED (do NOT re-hunt — cross these off)

| Dimension | Source / tool | What we have | Status |
|---|---|---|---|
| Who-guards-whom / matchups | `reidhoch/fastbreak` (`pull_fastbreak.py`) | `DefenderSuppression` (matchup-adjusted to each opponent's own baseline) | built → **now DSV** (this session) |
| Synergy play-types | fastbreak `SynergyPlayTypes` | `synergy_off/def_2425` → ScoringLoadValue (POE), DefensivePlayTypeYield (PSOE) | built |
| Hustle | fastbreak hustle endpoint | HustleImpactValue + `hustle_win_signal.csv` (box-outs r≈.19 weight highest) | built |
| Impact yardstick (current) | `dunks_and_threes` (`pull_epm2.py`) | EPM off/def/tot current season (472/585) | merged |
| Impact yardstick (history) | `EyimofeA/nba-spm` | RAPM off/tot 1997-2024 (`rapm_external.csv`) — **Def col unreliable** | merged (prior only) |
| Impact (extra) | `llimllib/nba_data`, `travzhu5074` | ESPN Net Points, BPM family (obpm/dbpm/bpm/vorp/dws) | merged |
| Shot-quality features | own tracking shot totals + raw_pbp | xPTS (bucketed AUC .646; portable AUC .664) | built |
| Shot-quality blueprints | iggym21, VicGIT31, kyleleung11 (Rasch), rosamsierrap (128k '14-15 logs) | method refs | on file |
| Defensive index (compare) | garroshub EDI → `edi_scores_external.csv` | sanity-check only | on file |
| Basketball IQ (compare) | nba-iq → `iq_scores_external.csv` | sanity-check only | on file |
| Gravity/Elasticity (concept) | neeljshah gravityInfluence | Elasticity = our pressure×output thesis; shot-origin proxy only | blueprint |
| Start-state value | `scenario_pace.csv` | PPP by possession start (after_dbto +0.043 lift, etc.) | on file |

**The only action for all of the above is operational, not discovery:**
re-run `pull_fastbreak.py` + `pull_epm2.py` across all 5 seasons to backfill years
(both currently single-season). The tools already exist.

## TRUE REMAINING GAPS (only two)

### Gap 1 — our own current + multi-season + reliable-DEFENSE RAPM
- External RAPM (`nba-spm`) stops at **2023-24** AND its **defensive column is unreliable**
  (implausible leaders: McDermott/Kispert/Sexton; muddled sign convention).
- EPM is **current-season only** (prior seasons paywalled on the source).
- => We have NO single impact metric that is current + multi-season + trustworthy on defense.
- **Fill:** the 6,452-game PBP crawl is exactly the data. Build offensive + defensive RAPM
  on clean stints (ridge w/ Bayesian box prior). `nba-spm`'s SPM→prior→ridge is the method blueprint.
  Defensive RAPM from PBP is the honest perimeter-defense path (PBP has no who-guarded-whom,
  so on/off defensive RAPM is the unbiased route; DSV/matchup data explains it, doesn't replace it).
- This is the gap the crawl uniquely closes. Endgame: own RAPM = internal source of truth;
  IIB collapses into it; other components explain + predict it.

### Gap 2 — real spatial / continuous-movement tracking
- Needed for: true gravity, MIV (movement intelligence), contest-at-every-moment, real
  defender positioning, and to populate the empty `player_advantage_stats` / `true_possessions` /
  `advantage_events` tables (COV/PTV/RPV upgrade from proxy → real spatial).
- Public coordinate tracking exists only for **2013-16** (SportVU: `rajshah4/NBA_SportVu` = 1 game
  sample, real format; `linouk23/NBA-Player-Movement-Data` = UNVERIFIED, training-memory name, confirm before relying).
  Official tracking gravity endpoint 500s.
- **Fill:** only the `nba2nba` film pipeline (RF-DETR Medium → ByteTrack → YOLOv11x-pose →
  homography to 94×50 → jersey OCR) truly closes it. GPU phase; Roboflow hosted-train avoids
  standing up our own box for the two detectors. This is the one genuinely differentiated future asset.

## Honest framing
Not "missing a pile of xStats" — we have matchups, synergy, hustle, and 4 impact yardsticks.
The moat is unifying everything into points-over-expectation calibrated to **our own RAPM**
(Gap 1, the crawl) plus **film tracking** (Gap 2). Everything else is in hand.
