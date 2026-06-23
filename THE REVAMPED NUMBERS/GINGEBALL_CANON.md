# GINGEBALL / COURT HANDICAP — MASTER CANON & HANDOFF

> **NEXT SESSION: READ THIS FIRST. DO NOT RE-ASK FOR DATA. DO NOT RE-DERIVE IDENTITY RESOLUTION.**
> Everything in §3 (Data) already exists and is accessible. Everything in §4 (Identity) is already
> solved — use it verbatim. The two things that waste ~20 min every chat are (a) re-discovering what
> data exists and (b) the name/ID/slug mess. Both are nailed down below.

_Last updated: 2026-06-23 (v2 — absorbed THE_REVAMPED_NUMBERS: RAPM, locked formula, defensive-build unlock, PTV correction). Maintainer: Jack / Hunter (Gingeball)._

---

## 1. PROJECT MAP

- **Product:** Gingeball (gingeball.com). Core metric = **TCV (Total Court Value)**, a possession-based,
  play-by-play two-way player rating, split into **O-TCV (offense) + D-TCV (defense)**.
- **App repo:** `gingeball-app-main` (Next.js, deployed on Vercel).
  - Leaderboard component: `GingeballLeaderboard.tsx`.
  - Headshot manifest: `lib/player-assets.ts` (see §4).
- **Public data repo:** `github.com/jackbecker2836-arch/gingeball-data` — regular-season + playoff CSVs.
- **Database:** Supabase project **`pwvcjqztwhvolwrdsnil`** (region us-east-2).
  - Tables: `model_versions`, `tcv_scores`, `tcv_components`, `players`, `seasons`.
  - Access via the Supabase MCP connector (`execute_sql`, `list_tables`, etc.).

---

## 2. TCV MODEL — SPEC

- **Components (live, weighted):** `IIB, PVA, SGV, MIV, COV` (offense side) + `RPV, DSV, DPC` (defense side).
- **Reserved / inert (DO NOT populate unless rebuilding them):** `SAV, UP, CFP, RIV`, and **`PTV`**
  (Playoff Translation Value — *currently being un-retired*, see §6).
- **Hard invariant:** `tcv = o_tcv + d_tcv` (existing rows hold this to <0.001). Any load MUST preserve it.
- **Pace rescale factor:** `0.874` (= 114.5/131). Site TCV = 0.874 × raw model output.
- **Season convention:** `season_year` = **ending** year. `2025` = the 2024-25 season. `2026` = 2025-26.
- **confidence_tier** enum: `high | medium | low`. **Locked rule (this session):** include EVERY player;
  the fewer the minutes/possessions, the more the score is shrunk and the lower the confidence tier.
  Do NOT exclude low-minute players.

### Model versions (in `model_versions`)
| version_string | is_current | scope | notes |
|---|---|---|---|
| `v0.1.0-bootstrap` | **true (LIVE)** | ~570 players × 11 seasons (2014→2026) | proxy-based, lower quality, but full coverage. This is what the live site shows. |
| `v1.0.0-pbp` | false (draft) | 291 players × 2024-25 only | PBP-based, high quality. id `94a16a83-8c24-48c4-ab40-e8a5f293210c`. Loaded & verified 291/291, invariant 0.0000. **NOT live on purpose** — see §5. |

**Why v1.0.0-pbp is only 291:** 291 is the **RAPM-validated published set** (the n used for headline
validation: TCV vs single-season netRAPM r=0.544, multiseason r=0.606). It is NOT the data ceiling.
- RAPM already covers **570** players (`rapm_2425_pbp.csv`, full season) and **1001** (`rapm_prior_informed_v4.csv`).
- Offense components cover **563** (`offensive_composite`, `sgv_player`); RPV inputs **588** (`rpv_player`); hustle **567**.
- The ONLY thing gating 291→full is that **defensive components (z_RPV/z_DSV/z_DPC) are only computed for 336**
  (`defensive_composite.csv`). The raw inputs to compute them for everyone exist (rpv_player 588, matchups,
  hustle 567, POdef). So the full roster is **feasible now** — it just needs the defensive component build run.
- v1.0.0-pbp is also 2024-25 only. **Do not flip 291 live** — it would shrink the board ~570→291 and drop history.

### LOCKED TCV FORMULA (verified to reproduce TCV_raw at r=1.0000)
```
TCV_raw = 0.957*z_IIB + 0.539*z_PVA + 0.76*z_screen + 0.0*z_spacing
        + 0.344*z_MIV + 0.131*z_drive + 0.0*z_COV
        + 0.349*z_RPV + 0.825*z_DSV + 0.648*z_DPC
TCV     = TCV_raw, then UP reliability-shrunk toward replacement by poss/(poss+1500) [K=1500],
          minus small CFP penalty (play-type concentration, weight ~0.1).
          Points-scale inputs already ×0.874 pace-rescale.
```
z-scores are population-relative → re-z-score on the full population when extending past 291.
Source of truth: `TCV_final.csv` (z-cols → TCV_raw → TCV) + `tcv_metadata.json` weights.

---

## 3. DATA INVENTORY — ALL OF THIS ALREADY EXISTS

**STOP. Before asking the user for any data, check here. It is in the public repo, a prior zip, or attached.**

### 3A. Public repo `gingeball-data` (clone it: `git clone --depth 1 https://github.com/jackbecker2836-arch/gingeball-data.git`)
- **Regular-season tracking** CSVs: `poss, pass, drives, def, shots`, etc. (per player-game).
- **Playoff data (`PO*`), 6 runs 2020-21 → 2025-26 (75 files):**
  - `POGL{YY}` — **master playoff game log, 81 cols, keyed on NBA `player_id`/`game_id`** (drives, touches,
    elbow/paint/post, passing, rebound chances, rim defense, hustle/speed). The spine for PTV.
  - `POposs / POpass / POdrives / POdef / POshots` (per player-game) + `POreb` (2 seasons).
  - **`HVHLEV` family** (`POSCORE/POmisc/POpass/POto HVHLEV`) — season-aggregated **high-leverage / clutch**
    splits (~138 players/yr; ~3.4% of possessions = highest-leverage moments). Key PTV signal.
  - `POMTCHUP{YY}` — defender-vs-ballhandler matchup data. 7 Knicks series files (PODETNYK2425, etc.).
  - **CAVEAT:** `POshots*` is hard-capped at exactly 2,500 rows every season — likely a query LIMIT
    (possible truncation). Verify before trusting shot totals.

### 3B. `data.zip` (raw PBP corpus, 2020-21 → 2024-25, ~6,450 games)
- `data/possessions/*_lineups.csv` — **stint-level lineup data**: every sub interval with all 10 players
  + IDs, `secs_on/off`, score margins (leverage), and **`is_playoff` flag**. Foundation for per-player
  possessions, on/off, RAPM, reg-vs-playoff splits. (19,326 files.)
- `data/raw_pbp/` (6,442), `data/html/` (6,450 box HTML .gz), `data/schedule/season_{YYYY}.json`
  (`game_id → is_playoff` bool).
- **ID SYSTEM NOTE:** these lineup files use **basketball-reference string ids** (e.g., `curryst01`),
  NOT NBA numeric ids. A bbref→NBA-id crosswalk is needed to join them to NBA-id tables. (POGL already
  carries NBA ids, so per-player playoff aggregates can use POGL directly without the crosswalk.)

### 3B-bis. `THE_REVAMPED_NUMBERS.zip` (LATEST build set — supersedes older component CSVs; 2026-06-23)
**This is the current source of truth for TCV numbers/scripts. Prefer it over the Court Handicap zip's CSVs.**
- RAPM: `rapm_2425_pbp.csv` (570, player_id, oRAPM/dRAPM/netRAPM/poss), `rapm_prior_informed_v4.csv` (1001),
  `rapm_multiseason.csv` (548), `rapm_playoff_2425.csv` (**138, playoff_netRAPM + playoff_poss** — PTV input),
  plus v1/v2/v3 prior-informed iterations.
- Components: `offensive_composite.csv` (563), `defensive_composite.csv` (336), `sgv_player.csv` (563),
  `rpv_player.csv` (588), `xreb_player.csv` (430), `context_layer_2425.csv` (393: MIV, COV, SAV_proto, PTV_pend),
  `dsv_2425.csv`, `dpc_2425.csv`, `rpv_2425.csv`, `xpts_player_shotmaking.csv`, `offensive_calibration.csv`, `def_prior_consensus.csv`.
- Outputs: `TCV_final.csv` (291, z-cols→TCV_raw→TCV), `tcv_site_export.csv` (291), `components_raw.csv`.
- Scripts: `pbp_scraper.py`, `xpts_build.py`, `xpts_portable.py`, **`defense_components.py`, `defense_dsv.py`** (compute
  z_RPV/z_DSV/z_DPC — run these to extend defense to the full roster), `tcv_metadata.json`, `load_final.sql`.
- Docs: `tcv_component_upgrade_blueprint.md`, `rapm_epm_improvement_assessment.md`.

### 3C. `Court Handicap` zip (build artifacts + app)
- Build scripts (`update_pva.py`, `update_dsv_rpv_dpc_2425.py`, `xpts_build.py`, etc.).
- Component CSVs: **`offensive_composite.csv` (563 players, has `entity_id` = NBA id, `o_tcv`, `qualified`, `min`)**,
  `defensive_composite.csv` (336, `def_composite`), `tcv_site_export.csv` (the 291 site-ready set),
  `TCV_final.csv`, `components_raw.csv`.
- `tcv_metadata.json`, `schema.sql`, app components, `nba_id_collision_worksheet.csv` + README (see §4).

### 3D. Defensive / synergy data (regular season 2024-25) — all keyed on NBA `player_id`
| file | rows | content |
|---|---|---|
| `synergy_defensive_2425.csv` | 2,493 | Synergy play-type **defense** (play_type, PPP, percentile, poss). |
| `synergy_offensive_2425.csv` | 3,380 | Synergy play-type offense. |
| `matchups_2425.csv` | 141,255 | Full-season defensive matchups (off vs def player, poss, results, help blocks). |
| `hustle_2425.csv` | 567 | Contested shots, deflections, charges, screen assists, box-outs, loose balls. |

**=> Defensive data is NOT a gap. It exists via: synergy_defensive, matchups, hustle, POdef, and the
possession lineup data. Do not tell the user defense is missing.**

---

## 4. IDENTITY RESOLUTION — THE #1 RECURRING TIME-SINK. SOLVED. USE THIS.

### 4A. Authoritative NBA player-id sources (in priority order)
1. `players.name_nba_stats_id` (Supabase) — source of truth.
2. `offensive_composite.csv` → `entity_id` (cross-validated: 0 mismatches vs the DB and vs NBA.com).
3. `POGL*` / `POMTCHUP*` / synergy / hustle / matchups files → `player_id` (NBA numeric id).
4. PBP `*_lineups.csv` → **bbref string ids** (different system — needs crosswalk).

### 4B. Canonical slug function (USE EXACTLY THIS — accent-correct)
```python
import unicodedata, re
def slug(name):
    n = unicodedata.normalize("NFKD", str(name))
    n = "".join(c for c in n if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")
# "Luka Dončić" -> "luka-doncic"  (NOT "luka-doni")
# "Nikola Jokić" -> "nikola-jokic"   "Kristaps Porziņģis" -> "kristaps-porzingis"
```

### 4C. Known dup/mangled rows — ALREADY DELETED 2026-06-23 (do NOT recreate)
- **Root cause:** the 2025-26 (`2026`) data loader used a BROKEN slug fn that mangled accents
  (`Dončić → luka-doni`) and created duplicate player rows with NULL ids + conflicting scores.
  **FIX THE LOADER'S SLUG FN (use 4B) or these come back every load.**
- 18 dup rows were deleted (suffix shells + accent-mangled): `jimmy-butler-iii, jeff-dowtin-jr,
  brandon-boston-jr, trey-jemison-iii, luka-doni, nikola-joki, kristaps-porziis, jonas-valaninas,
  nikola-vuevi, dennis-schrder, jusuf-nurki, vasilije-mici, dario-ari, bogdan-bogdanovi, mont-morris,
  vt-krej, dant-exum, p-j-dozier`. Canonical rows (with ids, full history) were kept.

### 4D. nba_id_collision (see `nba_id_collision_worksheet.csv` in Court Handicap zip)
- BUG-1 (11 dup shells sharing ids) — FIXED 6/22 (shell ids nulled, canonical kept).
- BUG-2 (10 pairs where two distinct players share one id) — **OPEN**. Only 4 owners (Cade Cunningham,
  Tre Jones, Noah Clowney, Moussa Diabaté) are on the leaderboard and all are correctly mapped; the
  10 interlopers are off-board, so low priority. Resolve by assigning each interloper its own NBA id.

### 4E. Headshots
- Leaderboard renders via `getBobbleheadRenderDebug(slug)` → `PLAYER_ASSETS[slug].portraitUrl`
  (NBA CDN: `https://cdn.nba.com/headshots/nba/latest/1040x760/{nba_id}.png`). No `approved` entry → silhouette.
- Manifest backfilled to **602 entries** (2026-06-23) from `offensive_composite.entity_id`. `tsc` clean.
- Remaining pictureless = clean-slug-but-no-DB-id players (e.g., `cui-yongxi`). Fix by assigning ids
  from §4A sources. (After the 4C dedupe, accented stars + Butler/Dowtin/Boston/Jemison render fine.)

---

## 5. STATE / WHAT'S DONE (2026-06-23 session)
- ✅ `v1.0.0-pbp` loaded (291 scores + 291 components, draft, invariant 0.0000). NOT live (intentional).
- ✅ Dedupe: 18 broken duplicate rows removed from live data.
- ✅ Headshot manifest backfill → 602 entries (`player-assets.ts`).
- ✅ **DSV rebuilt for the FULL roster (569 defenders) from `matchups_2425.csv`**, validated r=0.971 vs the
  existing `dsv_2425.csv` (523 overlap). The defensive data-gate that capped TCV at 336 is cleared.
  Method: per-defender Σ(opponent's own ppp × matchup_poss − pts_allowed), per-100, shrunk by poss/(poss+250),
  z→DSV(z×15+50). Output saved: `dsv_fullroster_2425.csv`.
- ✅ **DSV extended to ALL 6 seasons** (2020-21→2025-26) from `RSMATCHUP{YY}.csv.xlsx` (repo) + `matchups_2425.csv`.
  540–605 defenders/season, 3,408 defender-seasons. Same validated method. Output: `dsv_fullroster_allseasons.csv`.
  (RSMATCHUP files are game-level id-keyed; aggregate per def_player_id. Name map only had 2024-25 names — IDs are the key.)
- ⏳ Supabase Management API had an outage earlier; it is back.

### Remaining for full-roster TCV (next concrete step)
**5-YEAR COMPONENT BUILD STATUS (validated vs 2024-25 TCV_final):** built full-roster for 2020-21→2024-25 →
`components_5yr_partial.csv`. RPV r=0.989 (exact build_rpv), PVA r=0.971, drive r=0.951, IIB r=0.860 (POE
approx from shotdif — tighten with the master scoring_poe source), DSV r=0.971 (all 6 seasons).
**Precise inputs still needed to finish EVERY TCV-weighted metric × 5 yrs (confirmed absent from repo):**
- `hustle_{2021,2122,2223,2324}` → **DPC AND SGV** (SGV's TCV weight is the screen-assist half = hustle
  `screen_assists`; FG3%/spacing half is tcv_weight 0). THE main remaining gap.
- `synergy_offensive_{2021,2122,2223,2324}` → MIV. THE other remaining gap.
- RPV: **COMPLETE all 5 years** (2020-21 built from `2021ALL.csv.xlsx`, entity_id-keyed master tracking;
  top: Turner/Poeltl/Gobert/Lopez/Capela). 2021-22→2024-25 from `def{YY}`.
- (COV tcv_weight 0; SGV screen source = hustle screen_assists.)
- **ARCH NOTE:** key the build on `entity_id` (NBA id), not slug. Master season files like `2021ALL.csv.xlsx`
  (and `POGL` for playoffs) are entity_id-keyed and complete — use them as the spine; name/slug only for display.

Once those land: re-z-score all components per season on full pop, apply LOCKED FORMULA (§2) with UP shrinkage,
set confidence_tier by possessions, assemble per-season TCV, load, flip live.

## 6. OPEN TASKS (priority order)
1. **Full TCV rebuild** — the ONE unlock is the **defensive component build**: run `defense_components.py`
   + `defense_dsv.py` to compute z_RPV/z_DSV/z_DPC for the full roster (inputs exist: rpv_player 588,
   matchups_2425, hustle_2425, POdef). Then: re-z-score all 10 components on the full population, apply the
   LOCKED FORMULA (§2) with UP shrinkage (low-minute players shrink toward replacement = the confidence rule),
   compute o_tcv/d_tcv preserving `tcv=o_tcv+d_tcv`, set `confidence_tier` by possessions, load as full `v1.0`,
   then **flip `is_current`** (no regression — coverage ≥ bootstrap). Extend to prior seasons after 2024-25 lands.
2. **Un-retire PTV — CORRECTED APPROACH.** PTV was retired because the *regular-season component profile*
   does NOT predict playoff translation beyond regression-to-mean (CV R² dropped 0.80→0.76 adding components).
   So do NOT rebuild it as an RS-component model. Rebuild it by **measuring playoff value directly** from the
   independent playoff data we now have: `rapm_playoff_2425.csv` (138, playoff_netRAPM/poss), `POGL*` (NBA-id
   keyed playoff game logs, 6 runs), and the `HVHLEV` high-leverage splits. PTV = direct playoff impact
   (optionally vs RS-expected), not a predicted translation. Then wire `tcv_components.ptv` back in.
3. **Fix the 2026 loader slug function** (§4C root cause) so dup/mangled rows stop being created. STILL OPEN.
4. ✅ **Leaderboard sort + rank-skip FIXED** (`GingeballLeaderboard.tsx`). Root cause: duplicate slugs →
   React key collision → dropped rows → ranks skipped 1→4 and sort looked broken. Fix: dedupe by `id`
   before ranking + null/NaN-safe sort comparator. Drop the patched file in `components/` and redeploy.
4b. **2025-26 raw PBP**: `pbp_scraper.py` `SEASONS` now includes `2026`. CANNOT run from the sandbox
   (basketball-reference not reachable). Run locally: `python pbp_scraper.py` (resume-safe; fetches only
   missing 2026 games). Outputs to `data/possessions/`, `data/raw_pbp/`, `data/schedule/season_2026.json`.
5. Assign NBA ids to clean-slug-no-id players (cui-yongxi, etc.).
6. Verify `POshots` 2,500-row cap isn't truncating.

## 7. QUICK-START FOR NEXT SESSION
1. Read this doc. Trust §3 and §4 — don't re-ask, don't re-derive.
2. Supabase project = `pwvcjqztwhvolwrdsnil`. Live model = `v0.1.0-bootstrap`. Draft = `v1.0.0-pbp`.
3. Use the slug fn in §4B for ALL name↔row matching.
4. Pick up at §6 task #1 (full rebuild) unless told otherwise.
