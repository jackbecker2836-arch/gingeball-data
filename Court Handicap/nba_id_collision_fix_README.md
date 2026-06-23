# NBA-ID collision fix — live DB (pwvcjqztwhvolwrdsnil) — 2026-06-22

## Starting state
21 non-unique `players.name_nba_stats_id` values (42 rows):
- **11 BUG-1** (same person, accent/suffix-mangled dup): the prior merge repointed scores but left
  both rows sharing the id. Dup shell identifiable in-data: `family IS NULL` + `archetype IS NULL`.
- **10 BUG-2** (two DIFFERENT real players share one id): both rows fully classified.

## What was changed (all reversible)
1. **Added column** `players.nba_id_collision boolean default false` — quarantine flag.
   Any join on `name_nba_stats_id` is now safe via `... AND NOT nba_id_collision`.
2. **Backup table** `_nba_id_collision_backup_20260622` — the 42 pre-fix rows
   (player_id, name, name_nba_stats_id, family, nba_id_collision).
3. **BUG-1 resolved (safe, data-derived, no guessing):** set `name_nba_stats_id = NULL`
   on the 11 family-NULL dup shells. Canonical rows keep the id and are now unique +
   un-quarantined. 11 real players freed (Butler, Nurkic, Saric, Exum, Bogdanovic, Micic,
   Dozier, Morris, Dowtin, Boston, Jemison).
4. Recomputed the flag: **20 rows still flagged = the 10 BUG-2 pairs.** 690 rows clean.

## What is NOT done (needs stats.nba.com via fastbreak — cannot verify in-sandbox)
The 10 BUG-2 pairs need correct ids. See `nba_id_collision_worksheet.csv`.
- The "likely owner" + confidence columns are MY read from general NBA knowledge, UNVERIFIED.
  HIGH = Tre Jones / Cade Cunningham / Noah Clowney own the existing id (interloper needs own id).
  LOW (the 1642xxx 2024-class pairs) = genuinely unknown; do not write blindly.
- Resolution: pull both players' real ids via `pull_fastbreak.py`, fill the worksheet,
  then for each pair UPDATE the row that has the WRONG id, and clear its flag.
- DPC/DSV/RPV for these 20 rows may be cross-contaminated (dpc_source is null = no audit trail);
  re-verify those components after ids are corrected.

## Recurrence prevention (apply AFTER all 10 BUG-2 are resolved)
    CREATE UNIQUE INDEX players_nba_stats_id_uniq
      ON public.players (name_nba_stats_id) WHERE name_nba_stats_id IS NOT NULL;

## Full reversal
    -- restore ids:
    UPDATE public.players p SET name_nba_stats_id = b.name_nba_stats_id, nba_id_collision = b.nba_id_collision
    FROM public._nba_id_collision_backup_20260622 b WHERE p.id = b.player_id;
    -- or remove the flag entirely:
    ALTER TABLE public.players DROP COLUMN nba_id_collision;
