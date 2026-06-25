# GINGEBALL — START HERE (next chat). Read fully before doing anything.

> Supersedes ALL prior START_HERE. Current as of 2026-06-25 (PM session).
> Read order: this file -> MASTER_APOLOGY_AND_HANDOFF.md (rules + loop ledger) ->
> SHRINKAGE_PRIORS_ALL_COMPONENTS.md (reliabilities + family priors; still authoritative).

== STATUS: verification + scaffolding COMPLETE. This chat does the v2 BUILD only. ==
The previous session verified the foundation, locked every design decision, and created the
staging scaffolding. Nothing is left to decide. What remains is the v2 prior computation + load,
which is now SQL-native (every input is in the DB or the repo).

== FIRST 3 THINGS (operational) ==
1. Confirm sandbox tools this turn (bash/git/unzip/python) -- decided per turn. If DB-only, say so
   immediately so Jack can restart the turn.
2. Trim in-chat connectors to **Supabase only** (the "+" toggle next to the message box, NOT the
   global settings page). Keep Tool access on "Tools already loaded" / "Load tools when needed".
3. **No files need attaching.** The repo clone has the archetype spec + per-season touch files.
   (These handoff/spec .md docs are NOT in the repo -- that is why they get uploaded.)

== VERIFIED -- DO NOT REDO (all confirmed against live DB 2026-06-25) ==
- Project pwvcjqztwhvolwrdsnil.
- LIVE model v1.1.0-5yr (d1bd2c9d-67de-4e8f-8416-a2251c536778, is_current), 2,806 published.
  **Byte-stable since 2026-06-23 18:53 -- untouched by any v2 work. Do NOT write to it.**
- _role_on_team_seasons: 2,827 rows, BYTE-VERIFIED. Canonical md5
  e9d98a5a392d91a51e10c7c1f98d31bd = rows formatted `season|bbref_id|label_code`, comma-joined,
  ORDER BY (season,bbref_id). Label counts: HM 545, CR 547, TS 459, SS 454, GT 325, AD 213, EN 192, SM 92.
- _fc_seasons: 90 rows (19 players) = per-season Franchise Cornerstone overlay, Option B v1
  (HM gate), source='optionB_v1_HM_gate'. By season: 2021:15 2022:18 2023:19 2024:19 2025:19.
  Correctly gated below 5 seasons: brunsja01, cunnica01, halibty01, maxeyty01, murraja01.
- component_shrinkage: 28,060 rows = the PRE-v2 FAMILY-keyed baseline (9 buckets:
  star/guard/connector/specialist/defense/forward/big/wing/family_null_fallback) for ALL 10
  components, under the LIVE version. avg_w tracks reliability. **This is the baseline -- leave it.**
- **v2 target version: v2.0.0-archetype, id cdc5f0ba-7500-4c9e-83dd-6fbcd4bc1e46, is_current=false.**
  Already created. ALL v2 component_shrinkage rows load under this id.
- v2 spec: archetypesystemshrinkage.zip (IN REPO) -> 435-player index; `profile` column = 45 cells.
  NOTE: the spec's OWN role_on_team field is the BROKEN one (61% "Core Rotational Player"). IGNORE it.
  Use _role_on_team_seasons for role, and `profile` for the 45 cells.
- _iib_rebuild_backup = stale June-16 BOOTSTRAP artifact (old_* values under v0.1.0-bootstrap).
  Unrelated to v2. Safe to ignore or drop.
- Per-season USAGE data EXISTS (for Option B refinement): drives<YY> (all 5 seasons),
  elbow/post/paint<YY> (2021..2324), touchdata 2324/2425/2526 (carry literal TIME_OF_POSS).
  Inventory the per-year files; never call usage "missing".

== LOCKED DECISIONS ==
1. Target = component_shrinkage under v2.0.0-archetype; build in STAGING; HOLD for Jack's top-20
   eyeball; merge = flip is_current. Do NOT write live.
2. ALL components re-key:
   - IIB -> _role_on_team_seasons cells + FC overlay
     (effective_role = 'FC' where (season,bbref_id) IN _fc_seasons, else base label).
   - COV/PVA/SGV/SAV/DSV/DPC/MIV/RPV -> 45 `profile` cells, k=20 -> family fallback.
   - PTV -> pass-through (w=1, no prior).
3. Shrinkage: light, reliability-grounded, possession-scaled.
   bayesian = w*obs + (1-w)*prior; w = n/(n+k); k = med*(1-r)/r; med = 3,592 possessions.
   Reliabilities r: SGV .903, PVA .842, DSV .807, COV .765, RPV .688, IIB .576, SAV .536,
   DPC .501, MIV .305, PTV 1.000. (Full table + family priors in SHRINKAGE_PRIORS_ALL_COMPONENTS.md.)
4. FC gating = Option B (per-season). v1 = HM gate (already in _fc_seasons). Reworkable to a usage
   gate from the per-season touch files (drives + touchdata TIME_OF_POSS) -- Jack's call later.

== BUILD STEPS (SQL-native; no chunked file loads needed -- all inputs in DB/repo) ==
1. Profile -> player map: from the 435-spec `profile`, joined to players by name_bbref / nba_id
   (NEVER by raw name -- crosswalk is closed). Profile is per-player; apply across that player's
   seasons. Player-seasons not in the 435 index -> family fallback. Stage as e.g. _v2_profiles.
2. Per component: compute prior mean/SD per cell (profile or role_on_team), n = possessions, apply
   the shrinkage above -> bayesian_value per (player-season, component). INSERT...SELECT into
   component_shrinkage under v2.0.0-archetype. Cells with support < k=20 -> family fallback.
3. Verify each component DB-side with md5 over string_agg (use the canonical-format pattern).
4. Show Jack top-20 per component to eyeball. **No is_current flip until he signs off.**

== HARD RULES (from MASTER_APOLOGY section 2 -- these keep getting violated) ==
- Read MASTER_APOLOGY first. Verify against live DB before claiming anything broken/fixed.
- Key identity on nba_id / name_bbref, NEVER on name or slug (names corrupt: accents/mojibake).
- Never conclude data is "missing" from a cleaned/aggregate export -- inventory repo root +
  per-year <stem><YY> files + zips FIRST.
- A component's construct is defined by LIVE stored values, never by a proxy column's filename.
- No live in-session edits that die with the session -- produce reviewable SQL / committed files.
