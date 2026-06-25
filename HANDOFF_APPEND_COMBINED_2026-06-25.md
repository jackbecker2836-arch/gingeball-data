# GINGEBALL HANDOFF — COMBINED (newest first)

> Most current state is the **2026-06-25** block immediately below.
> Everything under "--- HISTORY ---" is prior context, preserved. The old
> "RESUME HERE (2026-06-24)" is **SUPERSEDED** — see the 2026-06-25 RESUME HERE.

---

## 2026-06-25 (PM) -- v2 verification + scaffolding session (decisions LOCKED, staging created)

> Newest block. The "2026-06-25 -- v2 archetype prior rebuild session" block below is the AM
> session; the verification HERE supersedes its "7/10 priors rebuilt" belief (see correction).

### Tools / session
- Sandbox (bash/git/unzip/python) + Supabase both up. Repo re-cloned; archetypesystemshrinkage.zip unzipped.

### CORRECTION to the AM handoff -- "7 of 10 v2 priors persisted" was WRONG
- component_shrinkage (28,060 rows) holds the PRE-v2 FAMILY-keyed baseline for ALL 10 components
  (9 family buckets each), under the LIVE model v1.1.0-5yr. ZERO v2-cell priors are persisted --
  the AM session's v2 re-keying (IIB->role_on_team, six->profile) was computed in-chat and LOST
  when the chat died. So "what's left" = the FULL v2 re-key + load, not 2-3 leftover components.

### Verified against live DB (do NOT redo)
- _role_on_team_seasons: 2,827 rows, BYTE-VERIFIED THREE WAYS (locked handoff md5 = source CSV md5
  = DB string_agg md5 = e9d98a5a392d91a51e10c7c1f98d31bd). Canonical format now recorded: rows
  `season|bbref_id|label_code`, comma-joined, ORDER BY (season,bbref_id).
- 19 FC cornerstones eyeball: PASS. Edge cases correct (Murray no-2022 = ACL; rookie Maxey SS /
  Haliburton SM / Brunson CR; Cunningham 4 seasons, drafted 2021).
- Audit corroborated from role_on_team_audit_435.csv: v2's role_on_team field was broken -- 249/411
  = 61% "Core Rotational Player", 160 genuine starters dumped into the bench group. Corrected labels
  live in _role_on_team_seasons.
- LIVE model v1.1.0-5yr byte-stable since 2026-06-23 18:53; nothing from the v2 sessions touched it.
  _iib_rebuild_backup = stale June-16 BOOTSTRAP artifact (old_* under v0.1.0-bootstrap), not v2 residue.

### Created this session (staging only; live untouched)
- _fc_seasons (90 rows, 19 players) -- per-season FC overlay, Option B v1 (HM gate),
  source='optionB_v1_HM_gate'. By season 2021:15 2022:18 2023:19 2024:19 2025:19.
- model_versions row v2.0.0-archetype, id cdc5f0ba-7500-4c9e-83dd-6fbcd4bc1e46, is_current=false.
  ALL v2 component_shrinkage rows load under this id.

### Decisions LOCKED (Jack)
1. Target = component_shrinkage under v2.0.0-archetype; staging; hold for eyeball; merge = flip is_current.
2. ALL components re-key (IIB->role_on_team+FC; COV/PVA/SGV/SAV/DSV/DPC/MIV/RPV->45 profile cells,
   k=20 family fallback; PTV pass-through).
3. Shrinkage stance = light, reliability-grounded, possession-scaled (per SHRINKAGE spec section 0b).
4. FC gating = Option B (per-season). v1 = HM gate (reworkable to a usage gate).
- MIV/RPV cell = profile (confirmed).

### Per-season usage data confirmed present (corrects an in-session "missing" error)
- drives<YY> all 5 seasons; elbow/post/paint<YY> 2021..2324; touchdata 2324/2425/2526 (has TIME_OF_POSS).
  Option B usage refinement is buildable per season.

### Next chat
- Supabase connector only + sandbox toggle ON + NO files attached (repo has archetype zip + touch
  files). These handoff/spec .md docs are uploaded only because they are not in the repo.
- Build is SQL-native (INSERT...SELECT); no chunked file loads needed. See START_HERE build steps.

---

## 2026-06-25 — v2 archetype prior rebuild session (crosswalk CLOSED, role_on_team rebuilt, 7/10 priors)

### Crosswalk — CLOSED (was the big 2026-06-24 OPEN item)
- The 34 ambiguous high-minute ids are resolved. Full crosswalk = **966 mappings** written to
  `players.name_bbref` in Supabase (project `pwvcjqztwhvolwrdsnil`).
- KJ Martin landed on the `1630231` row. Tre Jones patched to `jonestr01`. Collisions flagged.
- nba_id `1627853` collision (Ryan Arcidiacono + Nigel Hayes) flagged via `players.nba_id_collision` — not auto-resolved.
- Do NOT redo the crosswalk.

### v2 archetype system — buckets being retired
- `family` buckets → v2 cells: **position / role_on_team / role_on_court / offensive+defensive profiles / evidence_state**.
- The priors ARE the buckets, so re-keying regenerates every prior. **Archetype labels per player are NOT changing — only the structured-field bucketing.**
- Shrinkage formula UNCHANGED: `bayesian = w·observed + (1−w)·prior_mean`, `w = n/(n+k)`, `k = med·(1−r)/r`,
  `med = 3,592` possessions, `r` = per-component reliability. Only the prior **cell** changed (family → v2).

### role_on_team — new classification, thresholds LOCKED
- Heavy-Minute Starter: GS% ≥ 70 AND MPG ≥ 28
- Tactical Starter: GS% 40–70
- Sixth Man: MPG ≥ 24
- Core Rotational: MPG 15–24
- Situational Specialist: MPG 8–15
- Energy/Spark Plug: top-quartile spark score within the 8–18 MPG bench pool
- Garbage Time: MPG < 8
- Active DNP: GP ≤ 5

### AUDIT finding (important) — v2's shipped role_on_team field was broken
- 61% of players defaulted to "Core Rotational Player." **159 genuine starters** (LeBron, Fox, KAT,
  Banchero, Haliburton, etc.) were mislabeled as bench. The **corrected** labels from the thresholds
  above are what the rebuild keys on. Audit covered all 435 v2 archetype cards.

### Franchise Cornerstone — finalized at EXACTLY 19 (locked)
- bbref ids: youngtr01, hardeja01, brunsja01, cunnica01, gilgesh01, edwaran01, lillada01, halibty01,
  maxeyty01, garlada01, antetgi01, bookede01, jamesle01, tatumja01, murraja01, mitchdo01, foxde01,
  doncilu01, jokicni01.
- Cut 5 borderline as "not centerpieces": Derrick White, Austin Reaves, Tyler Herro, Anfernee Simons, Fred VanVleet.

### k=20 — thin-cell fallback cutoff (locked)
- Profile cells with support below k=20 fall back to the family prior.

### `_role_on_team_seasons` table — LOADED + BYTE-VERIFIED ✓
- **2,827 rows**, base labels across all 5 seasons, loaded in 6 chunks.
- DB-side md5 `e9d98a5a392d91a51e10c7c1f98d31bd` = **exact match** to the locally validated file
  (row count ✓, md5 ✓, byte-perfect). This was the foundational pending item — cleared.

### Priors rebuilt on v2 cells — 7 of 10 (VERIFY THESE PERSISTED — see caveat)
- **IIB** on role_on_team cells. FC split is load-bearing: **FC +1.58 vs HM +0.35** (1.25-pt gap pooling would erase).
- **COV / PVA / SGV / SAV / DSV / DPC** rebuilt in SQL across all 5 seasons with the k=20 fallback.
  31 of 45 profiles clear k=20 (own prior), 14 fall back to family — uniform across all six.
  COV is the **#1 standings mover**: heliocentric_star **+7.50** vs old star family prior **+4.71**.
- Remaining: **MIV** (reliability 0.31 — heaviest shrink), **RPV**. **PTV** is reliability 1.0 = no
  shrinkage (w=1, observed passes through, no prior needed) — confirm, but expect it's a no-op.

### Live model — UNTOUCHED
- `v1.1.0-5yr` (`is_current`), 2,806 published player-seasons. Live leaderboard has NOT moved.
  Nothing live reads the v2 work. No merge until Jack eyeballs the rebuilt numbers.

### Where it stopped (NOT a tool failure)
- Sandbox was UP; the `_role_on_team_seasons` load completed and verified clean; then the chat hit the
  hard **"conversation too long to continue"** limit and died mid-response. The very next step — a
  season-by-season view of the 19 FC cornerstones from the new table — never rendered. Cause: the full
  connector tool set + the chunked INSERT payloads ate the context window.

### ⚠️ CAVEAT — verify before trusting this handoff
- Because the chat died mid-stream, confirm in Supabase exactly which prior rebuilds **persisted** vs.
  were only computed in-chat. `_role_on_team_seasons` is confirmed (md5 above). The component-prior
  outputs (IIB + the six profile components) need a direct DB check.

---

## RESUME HERE (next chat, as of 2026-06-25) — supersedes the 2026-06-24 RESUME HERE

1. **Confirm sandbox tools this turn** (bash/git/unzip/file-read), not DB-only. Decided per turn. If DB-only, say so immediately so Jack can restart the turn or drop files in.
2. **Trim connectors to Supabase only** for this chat (in-chat "+" → Connectors toggle, not the global settings page) so the chunked loads don't blow the window again. Keep Tool access on "Load tools when needed."
3. **Verify DB ground truth — do NOT trust this handoff blindly:**
   - `_role_on_team_seasons` row count = 2,827 and md5 = `e9d98a5a392d91a51e10c7c1f98d31bd`.
   - Which component-prior rebuilds actually landed in staging vs. only computed in the dead chat.
4. **Re-run the cheap step that died:** season-by-season breakdown of the 19 FC cornerstones from `_role_on_team_seasons` (Jack's eyeball check that labels are right).
5. **Finish remaining priors:** MIV, RPV. (PTV pass-through — confirm.)
6. **Load all rebuilt component priors into staging** (`component_shrinkage` or the v2 equivalent — confirm the target), keyed on `tcv_score_id`. Proven method: hand-authored multi-row `INSERT`s in ~570-row chunks (~15KB), each verified immediately with an md5 over `string_agg`.
7. **Show Jack top-20 lists per metric** to eyeball. DO NOT write live/published until he approves the merge.

### Repo / sandbox steps (ephemeral — re-clone every session)
- `cd /home/claude && git clone https://github.com/jackbecker2836-arch/gingeball-data.git || (cd gingeball-data && git pull)`
- Unzip `archetypesystemshrinkage.zip` — contains the v2 archetype spec + a fuller file that builds past the
  5-page Foundation PDF. **The fuller file is the real driver for the prior rebuild — use it, not just the PDF.**
  It supersedes parts of `SHRINKAGE_PRIORS_ALL_COMPONENTS.md` (bucketing changed).
- Egress is on, allowlist "All domains." Fallback if the clone won't run: upload the zip directly, or drop the unzipped `.md`/`.txt` in.

---
--- HISTORY (prior handoff, preserved) ---
---

## 2026-06-24d — data.zip DOWN + bbref↔nba_id crosswalk built (932/1001), committed to repo

### data.zip — RESOLVED, verified down and good
- Allowlist fix worked. `git lfs pull --include="data.zip"` succeeded in a fresh chat.
- `data.zip` = **406,533,375 bytes**, sha256 `1db8147922e7…` matches the LFS oid exactly. Intact.
- Unzipped: `data/possessions/` has **6,442 games** × {`*_lineups.csv`, `*_tp.csv`, `*_meta.json`}.
- **Lineup stints are POPULATED this time** (17–51 rows/game, ~92k stints; prior copies were 1 row).
  Each stint row = both 5-man lineups (home+away, w/ bbref ids), score_margin_on/off
  (→ stint plus-minus by subtraction), duration secs. `_tp.csv` = true possessions (off/def team,
  timing, points). `meta.json` flags: **99.5% of games pass periods_ok+stints_ok+score_ok** (33 bad, exclude).
- Seasons: 2021 (1171 g), 2022 (1315), 2023 (1318), 2024 (1318), 2025 (1320).

### The crosswalk gate (NEW dependency, now mostly closed)  [NOTE 2026-06-25: now FULLY closed — 966 written]
- Stint files key players on **basketball-reference ids** (`schrode01`) with mojibake names.
  Model keys on `players.name_nba_stats_id`. `players.name_bbref` column EXISTS but was **0/1093 populated**.
  Repo had NO bbref→nba bridge (master_player_table is name-keyed; bbref stats were merged by name).
- Built deterministically (Jack chose this over name-matching):
  1. Authoritative public crosswalk djblechn-su/nba-player-team-ids `NBA_Player_IDs.csv` → 380 (file stale ~2019).
  2. bbref-id stub reconstruction (last[:5]+first[:2]+seq) vs DB roster → +552. Validated 97.9% vs authoritative first.
  3. Validation pass against each id's embedded name segments; reverted true conflicts
     (e.g. `jonestr01` = Tre Jones, NOT in roster — was wrongly grabbing Tyus Jones).
- **Result: 932 / 1001 stint bbref ids mapped = 96.1% of all on-court time.** 380 authoritative + 550 stub(high) + 2 nickname(low: Bub Carrington, N'Faly Dante).
- Committed to data repo `tools/` (local commit `d71b6d5`; Jack pushing manually — sandbox had no GH creds):
  - `tools/bbref_nba_crosswalk_PARTIAL_932of1001.csv` (932 rows: bbref_id,nba_id,player_name,source,confidence)
  - `tools/bbref_crosswalk_AMBIGUOUS_34_needs_bbref.csv` (34 rows)
  - `tools/bbref_crosswalk_UNMATCHED.csv` (22 rows: low-min/not-in-roster/coach artifacts — safe to drop)
  - `tools/README_bbref_crosswalk.md`

### OPEN: 34 ambiguous high-minute ids (= 92% of the *uncovered* time) — DO NOT GUESS  [NOTE 2026-06-25: RESOLVED — crosswalk now 966]
- Abbreviated mojibake stint names map to 2+ real players; no repo signal separates them
  (players20xx files only span 3 seasons, so season-overlap can't split e.g. Jaden vs Jalen McDaniels).
- **basketball-reference.com is NOW on the allowlist** (added 2026-06-24, but only usable in a NEW chat —
  a running session keeps its start-time allowlist). Resolve by fetching each id's bbref player page.
- Worst offenders by minutes: J. McDaniels (~15.5k), K. Johnson (~13k), J. Green (~14k),
  J. Williams (~10.5k), J. Smith (~10.8k), Z. Williamson/Williams, K. Martin, J. Champagnie. Full list in the AMBIGUOUS csv.

### Also surfaced: DB id collision
- nba_id `1627853` has TWO roster rows (Ryan Arcidiacono + Nigel Hayes). `players.nba_id_collision` exists for this. Not auto-resolved.

## RESUME HERE (next chat) — finish crosswalk, then build pbp priors   ⛔ SUPERSEDED 2026-06-25 (see top)
Fresh session (bbref allowlisted now). Steps:
1. cd /home/claude && git clone https://github.com/jackbecker2836-arch/gingeball-data.git || (cd gingeball-data && git pull)
2. cd gingeball-data && git lfs install && git lfs pull --include="data.zip"   # ~406MB, verify sha256 1db8147922e7…
3. mkdir -p /home/claude/dz && cd /home/claude/dz && unzip -o ../gingeball-data/data.zip >/dev/null
4. Read tools/bbref_nba_crosswalk_PARTIAL_932of1001.csv (the 932 confident) + the AMBIGUOUS_34 csv.
5. For each of the 34 ambiguous bbref ids: fetch https://www.basketball-reference.com/players/<x>/<id>.html,
   read canonical name + teams, map to the correct candidate nba_id. Verify each.
6. Merge → full crosswalk (~966). Write ALL to players.name_bbref in ONE migration on a SUPABASE DEV BRANCH
   (not live). Flag nba_id 1627853 collision.
7. THEN build, in order, LIGHT possession/reliability-scaled shrinkage, on a dev branch:
   a. MIV gravity (reliability 0.31 — heaviest shrink): movement value with vs without a star on court.
      Engine = per-player on/off split from stints (stint_pm by score-margin diff, possessions from _tp.csv or duration).
      Conditional split = with/without a given star teammate on floor.
   b. IIB on/off backbone (#2 driver, 0.58): star-overlap / collinearity / no-center, same engine.
8. Show Jack 5 top-20 lists to eyeball per metric. DO NOT write live/published until he approves merge.
Context: COV base rebuild DONE/live/verified — don't touch. Reliabilities: MIV 0.31, IIB 0.58, … SGV 0.90, PTV 1.0(none).
Priors specs: COV_SHRINKAGE_PRIORS_GROUNDED.md + SHRINKAGE_PRIORS_ALL_COMPONENTS.md.


## 2026-06-24e — RECURRING TIME-WASTER: terminal/git commands that fail on the first 10+ tries

Owner (Jack) is on **Windows / PowerShell**, repos live under OneDrive, and there are MANY
look-alike gingeball folders. Assistants keep handing over commands that fail for avoidable,
predictable reasons. STOP DOING THIS. Before giving Jack any terminal command, apply ALL of the below.

### Hard rules for giving Jack commands
1. **PowerShell, not bash.** No `\` line-continuation (PowerShell uses backtick ` or just put it on one line).
   No `&&` chaining assumptions. Multi-file `git add` = one `git add` per line, or `git add tools/`.
   Use `Copy-Item`, `New-Item -ItemType Directory -Force`, `Get-ChildItem` — not `cp`, `mkdir -p`, `ls`.
2. **Never use placeholder paths** like `/path/to/your/repo`. ALWAYS resolve the real absolute path FIRST
   (have Jack run a `Get-ChildItem -Recurse -Filter` search), then hand commands with the literal path.
   A placeholder = guaranteed failed first attempt + commands silently run in the wrong dir.
3. **There are ~15 gingeball folders.** Two repos matter and they are DIFFERENT:
   - DATA repo:  `C:\Users\bluec\Desktop\gingeball-data`  (remote: gingeball-data.git) ← crosswalk/data files go here
   - APP repo:   `...\gingeball_full_handoff\gingeball-app`  (remote: gingeball-app.git) ← frontend only; it is
     chronically mid-rebase / "N commits ahead". DO NOT touch it for data work; do not run rebase/force there.
   ALWAYS verify with `git remote get-url origin` BEFORE add/commit/push. Wrong-repo pushes have happened.
4. **Quote any path containing spaces** (e.g. "THE REVAMPED NUMBERS", "All new stats data and references").
5. **Files download to `C:\Users\bluec\OneDrive\Desktop\THE REVAMPED NUMBERS\`, NOT `Downloads`.**
   (OneDrive redirects.) Search there first when locating downloaded artifacts.

### THE push-rejection loop (happened again 2026-06-24e — fix preemptively)
- `git push` fails `! [rejected] main -> main (fetch first)` because origin has commits the local clone lacks.
  This is NOT a credential or wrong-repo problem; the commit already succeeded locally.
- **Fix, every time:** `git pull --rebase origin main` then `git push origin main`.
- **PREEMPT IT:** whenever telling Jack to push, give it as a single block that pulls --rebase FIRST:
      git pull --rebase origin main
      git push origin main
  Do NOT hand `git push` alone and wait for it to fail. Assume the remote is ahead.
- The `LF will be replaced by CRLF` warning is harmless (autocrlf=true on Windows). Ignore it; not an error.

### General stance
- Resolve the environment (OS, exact path, correct repo, where files actually are) BEFORE issuing commands,
  not after a failure. One verification round up front beats 10 failed command rounds. Jack has lost hours to this.
