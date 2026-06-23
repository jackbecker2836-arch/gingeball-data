# PTV — Playoff Translation Value (un-retired, corrected build)

_Built 2026-06-23. Supersedes the RETIRED status in the prior `tcv_metadata.json`._

## Why it was retired, and what changed
PTV was retired because the earlier build tried to **predict** playoff translation from a
player's regular-season component profile, and that has no out-of-sample signal (CV R²
dropped 0.80 → 0.76 when the RS profile was added — the profile *hurt*). The only thing
that predicted playoff impact was regular-season impact, which TCV already captures.

The corrected build does **not predict** anything. It **measures playoff value directly**
from independent playoff data. Before committing to that, I re-tested the tempting shortcut
— a box/tracking **production** composite from POGL + POposs — against the real 2024-25
playoff netRAPM and it failed the same way: **r = 0.12** (Giannis and LeBron post huge
playoff box production but *negative* playoff net impact in small samples). So production
proxies are out. PTV is built on playoff **impact**, not playoff box score.

## What PTV is now
A recency-weighted **career playoff net-impact** (RAPM), per 100 possessions.

- **Source:** `data.zip` playoff lineup stints, `is_playoff = true`, five runs
  2020-21 → 2024-25. 422 games, 12,912 stints, 515 players.
- **Engine:** possession-weighted ridge RAPM (λ = 3000) on stint net margin/100. Validated
  by reproducing the published `rapm_playoff_2425.csv` at **r = 0.85** on the 2024-25 slice
  (the gap from 1.0 is true-possession counting vs the dur×pace estimate — immaterial after
  shrinkage).
- **Recency:** each stint weighted ×0.75^(2025 − season), so a player's recent playoff runs
  count most while older runs still stabilize the estimate.
- **Pace:** ×0.874 rescale, same correction applied to TCV/RAPM.
- **Shrinkage:** ×`playoff_poss / (playoff_poss + 1000)` — small playoff samples pulled toward 0.
- **Confidence:** high ≥ 1500 playoff poss · medium ≥ 500 · low < 500.
- **Coverage:** 515 players have a value; **null** for anyone with no playoff possessions
  (correct — PTV is a playoff metric, not 0 for non-playoff players). 230/291 of the current
  site board have a PTV; the other 61 simply haven't played playoff minutes in the window.

## How it attaches to TCV
PTV is **descriptive, `tcv_weight = 0`** — it does **not** enter the weighted TCV sum and does
**not** touch `tcv = o_tcv + d_tcv`. It rides alongside SAV/COV as a displayed component. This
is the honest call: we proved playoff translation isn't predictable, so PTV informs scouting
("who has actually delivered in the playoffs") without pretending to be a forward predictor.

## Cross-check / face validity
- Career PTV(raw) vs published single-year 2024-25 playoff netRAPM: r = 0.718 (n = 150) —
  moderate by design; the pooled number is deliberately more stable than one noisy run.
- Top: Tatum, Holmgren, J. McDaniels, Irving, Horford, SGA, Haliburton, Jrue Holiday, Gobert,
  Murray, Curry, Embiid, Siakam, Brunson — two-way players on deep runs.
- Bottom (≥600 poss): DiVincenzo, Herro, Westbrook, Garland, O'Neale — known playoff-struggle
  profiles. Single-metric RAPM noise exists (e.g. D. White reads low), expected at this n.

## Files
- `ptv_playoff_multiseason.csv` — source of truth. bbref_id, name, NBA `entity_id`, `ptv`
  (shrunk, pace-rescaled pts/100), `ptv_raw`, `ptv_z`, `playoff_poss`, `n_runs`,
  `ptv_confidence`, plus per-season `net_2021…net_2025`. `id_collision=true` = abbreviated
  name maps to >1 NBA id (29 rows, mostly off-board) — resolve before trusting those.
- `ptv_for_load.csv` — entity_id-keyed, deduped (329 players) for the DB load.
- `load_ptv.sql` — stages the 329 rows and updates `tcv_components.ptv`. Edit `:model` and
  `:season` first; run the preview SELECT before the UPDATE.
- `tcv_metadata.json` — PTV entry flipped RETIRED → calc_displayed_unweighted.

## Next, when you have more playoff data
- The 2025-26 playoff run isn't in `data.zip` yet (corpus ends 2024-25). Add it and re-run for
  a sixth, most-recent-weighted run.
- 29 id-collisions and 61 board players without playoff minutes are the only coverage gaps;
  both shrink as the bbref→NBA crosswalk and roster grow.
- If you later want an *additive* "rises in the playoffs" signal, the defensible version is
  PTV(career) − (career **regular-season** RAPM over the same seasons), not PTV vs a predicted
  RS profile. That delta is interpretable but noisy; keep it a separate display field.
