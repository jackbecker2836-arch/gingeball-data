# bbref_id -> nba_id crosswalk (for data.zip stint files)

**Why:** the `data.zip` possessions stint files (`*_lineups.csv`) key players on
basketball-reference ids (e.g. `mcdanja01`) with mojibake/abbreviated names.
The Gingeball model keys on `players.name_nba_stats_id`. The `players.name_bbref`
column exists but was empty (0/1093 populated). These files bridge the two.

**Status: PARTIAL — 932 of 1001 stint bbref ids resolved (covers 96.1% of on-court time).**

## Build method (deterministic, no fuzzy name-match accepted blindly)
1. Authoritative public crosswalk: djblechn-su/nba-player-team-ids `NBA_Player_IDs.csv`
   (BBRefID <-> NBAID). Matched 380 (file is stale ~2019, misses recent rookies).
2. Stub reconstruction for the rest: bbref id = norm(last)[:5]+norm(first)[:2]+seq.
   Reconstructed expected stub from each DB canonical name; matched to stint ids.
   Validated 97.9% against the authoritative file's own ids first.
3. Validation pass: every mapping re-checked against the bbref id's embedded
   name segments; true conflicts reverted (e.g. `jonestr01` is Tre Jones — NOT in
   roster — was wrongly grabbing Tyus Jones; reverted to unmatched).

## Files
- `bbref_nba_crosswalk_PARTIAL_932of1001.csv` — confident mappings.
  `confidence=low_nickname` flags 2 verified-but-nonstandard (Bub Carrington, N'Faly Dante).
- `bbref_crosswalk_AMBIGUOUS_34_needs_bbref.csv` — 34 high-minute ids where the
  abbreviated stint name maps to 2+ real players and no repo signal separates them
  (e.g. Jaden vs Jalen McDaniels). RESOLVE via basketball-reference.com player pages
  (now on allowlist) in a fresh session. = 92% of the *uncovered* time.
- `bbref_crosswalk_UNMATCHED.csv` — low-minute / not-in-roster / coach-name artifacts. Safe to drop.

## Known DB issue surfaced
- nba_id `1627853` has TWO roster rows (Ryan Arcidiacono + Nigel Hayes) — a real
  `players.nba_id_collision` case. Not auto-resolved here.

## Next step
Fresh session: fetch the 34 ambiguous ids' canonical names from basketball-reference,
merge into the crosswalk, THEN write all ~966 to `players.name_bbref` in ONE migration
(dev branch), then build MIV gravity / IIB on-off on the stint data.
