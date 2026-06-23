# Players-table data-integrity audit + merge record
Project: pwvcjqztwhvolwrdsnil (Gingeball / Supabase, public schema)
Generated this session. Two distinct bugs found.

## BUG 1 — TRUE DUPLICATE PLAYER ROWS (same human, two rows)  → FIXED (reversible)
One row (accent/suffix-mangled, family=NULL) carried the player's CAREER HISTORY;
the clean row (family set, got the archetype + real-data 2025/26) carried only recent seasons.
On overlapping seasons (2025/26) both rows were published at conflicting TCVs → double-listed on the live board.

FIX APPLIED: repoint dup's unique history seasons -> canonical player_id;
archive (NOT delete) dup's overlapping-season rows so canonical's real-data value is the one shown.
No player rows deleted. Fully reversible from the snapshot below.

dup_player_id -> canonical_player_id (name):
2239328d-2956-4edf-821a-6188e462908a -> 3f41cfa8-ca5d-4b3c-ab5a-72cda037631d  Jimmy Butler III -> Jimmy Butler
27ba6683-0fe4-4bc8-9869-f7cdf201276b -> 11005d09-db2a-4cc5-bca4-4838063ef6af  Dant Exum -> Dante Exum
6f5bed4a-1633-4842-824d-d4a61f9c6e04 -> e72d517f-6e36-4732-9c9b-5d43c1bf40bf  Dario ari -> Dario Saric
83691f78-4a91-41d3-b78c-945749310b04 -> dfe6df50-c510-4518-9bf4-137b8e034669  Bogdan Bogdanovi -> Bogdan Bogdanovic
c480c609-1757-4a93-a465-0f43ab57a977 -> 0ddd69e9-3dcd-4dff-9de4-e6955f65bdbd  Jusuf Nurki -> Jusuf Nurkic
9a91d876-fc20-4f07-a68d-d0a1a161379d -> 9bfa8478-48cb-4410-af51-c204063840a0  Vasilije Mici -> Vasilije Micic
11bca8a7-6a71-4b0b-a652-2c8cdb0fd6ae -> 791f4d17-434e-4d60-980f-c35dd9f8c8fd  P.J. Dozier -> PJ Dozier
d7b95d13-b595-4850-9962-999dc0c1cc85 -> ca864259-ffe1-47bf-bd95-717b1a0a700c  Mont Morris -> Monte Morris
09f5fe68-0e89-484d-8825-4960a6426d0b -> 6fd2d18b-ad6b-4d76-a1ed-5751d8b4aa83  Jeff Dowtin Jr. -> Jeff Dowtin
1f5aa074-b214-4794-b308-916e9ae508ef -> 59fd99f6-8d24-4fee-b407-4ffa46c79270  Brandon Boston Jr. -> Brandon Boston
a63f62ec-6bb9-43fb-9070-d5bad9b3b5f8 -> 61051576-b16a-4c9c-a775-7cc155e7e960  Trey Jemison III -> Trey Jemison
f424c519-c15f-424c-b53e-5eefae6ea1e0 -> 97589f5e-5a59-47db-bdd5-40c6ded188e8  Dennis Schrder -> Dennis Schroder (orphan, no nba_id)
eb46dc8c-2966-45ee-940a-2a7766901a64 -> 52aec8cd-50b3-4bb2-8a4b-0a5718f32335  Jonas Valaninas -> Jonas Valanciunas (orphan)
6b6c85bd-3788-4bce-9c13-d77654fd3e6b -> 62962b75-a346-45af-91cf-91c96fe20577  Kristaps Porziis -> Kristaps Porzingis (orphan)
e7c1f54f-0366-42a0-bfa1-0770e7930d98 -> 9cae9c21-3704-49ef-888c-2e73fec801ce  Luka Doni -> Luka Doncic (orphan)
c11c2a23-aecc-40bd-844c-2de14a184118 -> acbf6cdc-b8bb-4ed4-b359-2d0bcf734150  Nikola Joki -> Nikola Jokic (orphan)
bd89ed77-33c8-4f57-84c5-d3aa62babec4 -> 9135c74a-3fdb-4460-bc59-c50435d0431f  Nikola Vuevi -> Nikola Vucevic (orphan)
a6fd9a0e-cdc9-4351-a785-08c7fa8593d3 -> 3b16c25d-fa12-419b-81e2-ee6e4652abc3  Vt Krej -> Vit Krejci (orphan)

REVERSAL: for every tcv_score_id in the snapshot JSON (dupe_premerge_snapshot.json),
  UPDATE tcv_scores SET player_id = <original player_id>, status='published' WHERE id = <tcv_score_id>;
That restores the exact pre-merge state.

## BUG 2 — NBA-ID COLLISIONS (two DIFFERENT players share one name_nba_stats_id)  → NOT TOUCHED
These are not duplicates; both rows are real, distinct players, both already classified.
The shared id is wrong on one of them. Any join on name_nba_stats_id can hit the wrong player
(this includes the DPC component write done earlier this session — worth re-verifying).
Cannot fix here: correct NBA ids require stats.nba.com (blocked from this sandbox). Needs correct ids supplied.

shared_nba_id : player A  |  player B
1630200 : Tre Jones | Tristan Enaruna
1630542 : Moussa Diabate | Marcus Bagley
1630595 : Cade Cunningham | Blake Hinson
1630600 : Isaiah Mobley | Malachi Smith
1641730 : Noah Clowney | Grant Nelson
1642419 : Payton Sandfort | Jamison Battle
1642422 : Norchad Omier | Armel Traore
1642443 : Jayson Kent | Jahmir Young
1642449 : Tolu Smith | Bez Mbeng
1642461 : Toby Okani | Spencer Jones

## Players with no archetype + not in the 692 system (no data to load)
Buddy Boeheim, Hayden Gray, Jaylen Nowell, Robert Covington, Kenyon Martin Jr. (carries dad's id 2030)
