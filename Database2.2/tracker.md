# Gingeball v2.2 — Archetype / Proof-Profile System: Architecture & Progress Tracker

> Living document. Purpose: lock down *how the v2.2 model is supposed to work* and track
> decisions so nothing gets lost between sessions. Created during the alignment session on
> 2026-06-25 (DB frozen, nothing built yet). Update this at the end of every working session.

---

## 0. Current status

- **Mode:** ALIGNMENT / design. We are agreeing on the architecture before any rebuild.
- **Database:** FROZEN. Live model `v1.1.0-5yr` (`d1bd2c9d-…`, is_current, 2,806 published
  player-seasons) is untouched and stays untouched. The `v2.0.0-archetype` staging version
  (`cdc5f0ba-…`, is_current=false) exists but its earlier prior builds are now **obsolete** —
  they were built on the wrong cell concept (the 45 legacy archetype labels). Nothing will be
  written or merged until Jack signs off on the rebuild.
- **Authoritative spec:** `Database2.2/` in the public data repo —
  `gingeball_archetype_system_v2_proof_profiles_player_index_role_on_team_corrected.pdf` (the
  architecture) and `v2_player_profiles_full_proof_profiles.csv.xlsx` (the player index for
  court roles + hooks). The PDF↔CSV mismatches are ignored.
- **Role on Team source changed (2026-06-25):** team role now comes from **curated per-season
  "perception" labels** (Jack's hand-graded front-office files, e.g. `Adjusting Role On Team.md`),
  with the mechanical `_role_on_team_seasons` table **demoted to a fallback** for any
  season/player not yet hand-labeled. See §6 and §7 for the rationale and guardrails.

---

## 1. The core idea (why this model is different)

Most public impact metrics (EPM, LEBRON, RAPTOR, DARKO) grade every player against a **single
league-wide expectation** and lean on regularization to sort out role. They flatten role.

Gingeball v2.2 uses a **conditional baseline**: the yardstick a player is graded against depends
on his *job* and his *leverage*. A Core Rotational Switch Defender's creation numbers are graded
against what that role-and-job actually produces — not against a primary engine's numbers. That
is how a scout thinks, and it is a more correct prior than "league average."

This is the spine of the whole system, and it is the thing most models miss.

---

## 2. The layer stack

| Layer | Question it answers | What it controls |
|---|---|---|
| **Position** (PG/SG/SF/PF/C) | Where does he play? | Position priors, lineup stress, role-portability. Guard/wing/big = metadata only. |
| **Role on Team** | How is he *perceived and deployed* in league circles? | **Leverage, effective sample size, and how hard to trust raw production.** Does NOT grade skill. Sourced from curated per-season perception labels (see §6/§7), not minutes thresholds. |
| **Role on Court** | What job is he asked to do? | Which signals are relevant + what "good" looks like for that job. The broad responsibility family. |
| **Proof Profile** | Graded against whom? | **The scoring/shrinkage cell — the conditional prior bucket.** Generated from Role on Team × Role on Court. |
| **Archetype Label** | What appears in the UI? | Human-facing summary only. **Not a scoring key.** |

No tags/badges in this version (deliberately deferred to keep it shippable).

### The three layers map to three distinct questions (the tell that this decomposition is real):
- **Team role** → *how much do I trust this sample, and how much was opportunity?*
- **Court role** → *what was he even asked to do?*
- **Proof profile (the cell)** → *graded against whom?*

---

## 3. The player profile is a PER-SEASON TRIPLE

Each player-season's identity / shrinkage-hook package is a **triple**, not a pair:

```
{ team role , offensive role , defensive role }   — for that season
```

Example: `Heavy-Minute Starter · Rim Pressure Driver (off) · Switch Defender (def)`

- **Team role varies by season** (Westbrook: starter in 2021, bench later) — pulled per season
  from the **curated perception labels** (Jack's hand-graded per-season files), falling back to
  the mechanical `_role_on_team_seasons` + `_fc_seasons` overlay for any season/player not yet
  hand-labeled.
- **Court roles (off + def) are the player's job** — taken from the v2.2 player index. The job is
  treated as stable per player; the *leverage context around it* moves season to season.

So the same player can be `Tactical Starter · Rim Pressure Driver · Switch Defender` one year and
`Core Rotational · Rim Pressure Driver · Switch Defender` the next — job stays, leverage shifts.

---

## 4. How the triple becomes prior buckets (the make-or-break)

The triple is the **identity / hook package**, but the **priors are NOT a single three-way cell.**
A full team×off×def cell would be ~9 × 12 × 10 ≈ 1,000 cells — almost every player alone in his
own cell, nothing to shrink toward, shrinkage becomes a no-op.

Instead the priors are computed on **two 2-way cells per player**, drawn per side:

| Proof profile | Cell definition | Feeds these components |
|---|---|---|
| **Offensive proof profile** | team role × **offensive** role | COV, PVA, SGV, MIV, SAV |
| **Defensive proof profile** | team role × **defensive** role | DSV, DPC, RPV (RPV also splits by position) |
| **IIB** | team role × **(offensive + defensive role combined)** | IIB (the one place both court roles meet in the cell) |
| **PTV** | team role + portability | PTV |

So: offensive stats shrink toward "players in your team-role with your offensive job," defensive
stats toward "players in your team-role with your defensive job." This keeps cells populated
enough to actually carry signal — it is what makes the elegant idea *buildable*.

### Per-component cell source (from PDF page 5 — supersedes the old off/def/pos/role lane routing)

| Component | Prior cell source |
|---|---|
| COV | offensive proof profile + team role |
| PVA | offensive proof profile + team role |
| SGV | offensive proof profile |
| MIV | offensive proof profile + role interaction |
| SAV | offensive proof profile |
| DSV | defensive proof profile + team role |
| DPC | defensive proof profile |
| RPV | defensive proof profile + position |
| IIB | team role + combined off/def court roles |
| PTV | team role + portability |

---

## 5. Shrinkage math

**Posterior:** `bayesian = w · observed + (1 − w) · prior_mean`

**Weight (LOCKED = variance form):**
```
w = priorSD² / (priorSD² + SE²)
```
Chosen over the possession form `w = n/(n+k)` because it adapts per cell: a tight proof profile
(all stationary spacers post similar SGV) shrinks hard; a wide one (stars vary wildly in COV)
shrinks little; a noisy player estimate shrinks more. The possession form can't see any of that.

The variance form is only as good as its two inputs, and the granular team-role cell choice
(§6 #1; the team-role vocabulary is being *expanded*, see §10) makes thin cells likely. So it
ships with guards (these are **PROPOSED — pending final confirm**):

- **priorSD / prior mean per cell, with a thin-cell fallback ladder:**
  `full cell (team-role label × court role)` → `leverage-tier × court role (3 tiers)` →
  `court role pooled` → `global`. **Superseded by the §12 pooling cascade** (this discrete ladder
  is replaced by a soft, size-weighted empirical-Bayes version with a per-season rung underneath
  the cell); kept here for the conceptual lineage.
- **SE per player-season:** `SE = σ_resid · √(med_poss / n)`, where `σ_resid² = total_var · (1 − r)`
  (the component's within-player noise from the reliability split). Keeps possessions in the
  picture and ties SE to each component's actual noisiness.
- **evidence_state inflates SE (does NOT cap w):** scaffolded_missing → biggest SE inflation,
  signal_proxy → moderate, modeled → none. Less trustworthy data → bigger error bar → more
  shrinkage. This is the principled version of what the old hard `cap` was hacking at.
- **Calibration check:** at median possessions, variance-form `w` should land near the
  component's reliability `r`. If it does, the two formulas agree where they should and we know
  it's parameterized sanely.

**Component reliabilities r (locked, verified earlier):**
SGV .903 · PVA .842 · DSV .807 · COV .765 · RPV .688 · IIB .576 · SAV .536 · DPC .501 ·
MIV .305 (heaviest shrink) · PTV 1.000 (pass-through, no prior).

---

## 6. Decisions LOCKED this session

1. **Prior cell granularity = full team-role label × court role** (e.g. `Heavy-Minute Starter /
   Rim Pressure Driver`), NOT the 3 leverage tiers. The team-role label set is the *expanded
   canonical vocabulary* (see §10 — Tactical Starter is being split, plus a Developmental bucket),
   so the cell space grows; the §5 fallback ladder absorbs the thin ones.
2. **Team role source = curated per-season "perception" labels (primary); mechanical
   `_role_on_team_seasons` + `_fc_seasons` = fallback.** Role on Team is a *latent social
   construct* (how the league perceives/deploys a player) with no ground-truth dataset. Minutes
   and starts measure a *different* thing (how much he plays) that only correlates — and diverges
   exactly at the cases that matter (Jokić vs. a high-minute role player; a tanker's young
   starter; an injured cornerstone). So mechanical labels are tight-but-biased; a careful
   subjective read is noisier-but-centered-on-the-right-target, which is the better prior for a
   latent construct. The CSV's `role_on_team_group` column **regressed** (84% bench / 58 starters)
   and is ignored entirely. Jack is hand-labeling each season; the mechanical table covers
   whatever isn't labeled yet.
   - This is **deliberate, reasoned, and written-down subjectivity** — the durable kind. It does
     not violate the MASTER_APOLOGY, which is about *ephemeral/silent* fixes. The line that
     matters is durable-vs-disposable, not mechanical-vs-subjective. (See §7.)
   - It is also *more* Bayesian, not less: this is an **informative prior elicited from domain
     expertise**. The role layer sets the baseline + leverage; the data still updates the estimate
     through the likelihood (the shrinkage step). Expert judgment sets the prior, the numbers move
     it.
3. **Per-season.** Proof profile is computed for each player-season using that season's team role.
   Court roles (off/def) come from the player index and are treated as the player's stable job.
4. **Weight = variance form** `w = priorSD²/(priorSD²+SE²)` (the guards in §5 are proposed,
   pending final confirm).
5. **Ignore the PDF↔CSV mismatches and the "27 Needs Review" / season notes in the spec.** Use
   the CSV only for court roles (off/def) + the `*_shrinkage_example` hooks + `evidence_state`.
6. **Player profile = per-season triple { team role, offensive role, defensive role }**, with
   priors computed on the two 2-way cells (team×off and team×def), not the full three-way cell.
7. **Split "Tactical Starter" (Option A) + expand the canonical team-role vocabulary, each label
   with its own leverage math.** The single Tactical bucket was doing three incompatible jobs
   (narrow-full-time-trusted / conditional-matchup / inflated-circumstantial) that need opposite
   shrinkage. It is split into separate canonical labels (Role Starter, Tactical Starter, and a
   Developmental bucket for inflated/development reps), and **every canonical team-role label is a
   first-class vocab entry with its own leverage / effective-sample / trust parameters** ("separate
   math"). All slash-composite and ad-hoc labels in the batch files must normalize down to exactly
   one canonical label before they become cell keys. Details + proposed vocabulary in §10.
8. **Deployment-not-outcome precedent (the "Beal/Grant rule").** A Role-on-Team label encodes how
   a player was *perceived and deployed that season*, NOT whether the bet was smart or how it aged.
   A franchise/lead-option bet that was *defensible to most of the league in the moment* earns the
   label even if it later looks dumb (Beal's 2021-22 supermax-era cornerstone status; Grant's
   lead-option role on a max deal). "That was a dumb deal" is an outcome judgment and stays out.
9. **Final label spec LOCKED (§11)** — 12-label canonical vocabulary + availability flag, per-label
   esf leverage math (confirmed as starting points; DEV=young, SS=veteran), normalization ruleset,
   and consolidation precedence. **No more label batches** — a targeted post-normalization
   consistency audit (§11f) replaces them, because the real risk is our *own* new vocabulary
   (RS, DEV) orphaning untouched players, not missing fringe guys.

---

## 7. Where I'll hold the line (assistant feedback, kept on record)

**The danger of a role-conditional model is circularity.** If the role assignment leaks the
answer, the model bakes its own conclusion into the baseline. If a player gets labeled "Primary
Offensive Engine" *because* his numbers were great, then grading him against other engines just
launders his own production back to him.

**The protection:** team role and court role must come from **role / usage / opportunity** signals
— minutes, starts, who initiates, which actions he's in — **never from the value output we're
shrinking.** As long as the classification stays *upstream* of the component values, the
conditional prior is legitimate and powerful. The moment it starts sniffing the outputs, it
quietly breaks.

This is a build-time invariant to enforce and re-check at every step, not a one-time note.

**Two guardrails specific to the curated Role-on-Team labels (decision §6 #2):**

1. **Anchor Franchise Cornerstone on deployment/perception, not quality.** FC criteria should be
   "team bends around him / org identity piece / hub-and-closing role" — *how he's used and
   viewed*. Be wary of the one criterion that's a quality call ("scalability not in doubt"),
   because the proof-profile prior is the *mean of players in the cell*: if "FC" partly encodes
   "he's good," a down year by a cornerstone gets buoyed upward toward a high FC prior. The risk
   is mild here (Role on Team sets the *bar*, doesn't hand out the score — and a higher bar makes
   FCs work harder), but it's cleanest if the label stays about role, not output.
2. **Label each past season as it was perceived *at the time*, no hindsight.** When labeling
   2021–2024, use the front-office consensus *that year*. In 2026 we know who fell off (Simmons,
   etc.); if those outcomes leak into the old labels, the role layer is quietly using the future
   to grade the past — the across-time version of the same circularity trap.

**Why the subjective layer is the right call (recorded so we don't relitigate):** Role on Team is
a latent construct with no ground truth. A centered-but-noisier expert read beats a
tight-but-biased minutes proxy for that target. This is *more* complete use of rigor, not a
retreat from it — the rigor moves to where it belongs (the prior), and the data still gets to
move the estimate. Refusing priors isn't "more objective," it just lets a wrong proxy set the
prior while pretending it was data.

### 7a. Hook-layer rules — the three-bucket rule (LOCKED; governs all component-math batches)

The §7 invariant ("the prior must come from role/opportunity, never the value being shrunk") has a
second place it can leak: the **shrink hooks** in the component-math batches (COV, PVA, SGV, SAV,
MIV, DSV, DPC, RPV, IIB, PTV). A hook can move the prior mean (`μ_hook = μ_prior + Σβ·signal`) and
move the trust (`SE_hook = SE_evidence · M_context`). Across all six batches the hooks correctly
route *dependency/context* to SE, but many also add the player's **own output** to his prior mean,
then shrink his raw value toward it — a double-count — and a few feed **the component itself** back
in. Both are the §7 leak wearing a hook costume. The fix is a hard split of every hook signal into
exactly three buckets:

1. **Prior mean = the cascade role-cell baseline ONLY** (§12 telescoping cascade + player-level
   leave-one-out). *Nothing player-specific ever moves it.* No hook may add the player's production
   (or a near-copy) to `μ`.
2. **Observation = `raw`, cleaned by ownership / difficulty / luck decomposition**, *then* shrunk
   toward the prior. This is where the basketball logic lives: PVA ownership weights (assisted-lob
   0.30–0.40 vs unassisted-rim 0.85–0.95), DSV assignment-difficulty and opponent-luck adjustment,
   RPV opponent-ORB-strength adjustment. **Worked example to copy: Batch 6 IIB** —
   `LuckAdjustedIIB = IIB_raw − β·OpponentLuck` (and `ScheduleAdjustedIIB`), shrunk afterward. Clean
   the input; never poison the target.
3. **SE = trust**, raised/lowered by context, dependency, sample, collinearity, evidence_state.
   "He only did it next to a star / in pristine context / vs bench / in 70 possessions" lowers
   trust (raises SE); it does **not** move the bar he's compared to.

**Hard rule (the bright line):** no hook signal may **be** the component being shrunk or a function
of it. Banned forms seen in the batches, to replace with upstream proxies or route to SE/PTV:
`NoPrimaryEngineCOV`, `NoPrimaryCreatorMIV` / `StarterContextMIV`, `IncrementalAdvantageValue`
(= EP_after−EP_before ≈ PVA itself), DSV `NoCenterDelta` (= DSV_without−DSV_with) and the
`*_vs_top10` competition blends, DPC `DPC_without_elite_defenders`, IIB `WithStarIIB−WithoutStarIIB`
(also possibly redundant with RAPM-calibrated `IIB_raw`, which already partials out floor-mates).

**Where it bites hardest: MIV (r=.305).** MIV is meant to be the *most* skeptical component (heavy
shrink toward the role prior). Twelve hooks each nudging `μ` toward the player's own activity turn
"shrink toward role prior" into "shrink toward a player-specific target," undoing the skepticism.
For MIV especially, hooks should be **SE-only**.

PTV stays pass-through (`w=1.000`) with its portability families stored as **diagnostics** until
activated; its injury/fatigue hook correctly treats availability as an `n_eff`/SE change, not a
role-label change (consistent with the orthogonal-availability lock in §11).

---

## 8. Open items / not yet decided

- **§5 guards** (fallback ladder rungs, SE definition, evidence_state→SE inflation, calibration
  check) — proposed, need Jack's explicit confirm before building.
- **Curated per-season labels — drafted for all 5 seasons (batches 1–4), under review.** The
  2021–2024-25 perception labels exist in `Database2.2/first–fourth batch.md`; reviewed for
  hindsight leakage (see §10). The `Adjusting Role On Team.md` pass is **2025-26** (not in the
  model) — criteria reference only. Jack is producing the final consolidated label file.
- **Vocabulary normalization → now LOCKED as a spec (§11), executed at build.** The canonical
  vocabulary, esf math, normalization ruleset, and consolidation precedence are fixed; applying
  them to produce the one label table is a deterministic build step, followed by the §11f audit.
- **Prior-estimation circularity → RESOLVED (now locked in §12).** The self-shrinkage leak (anchor
  *and* spread) plus the all-thin per-season grain are handled by a recursive empirical-Bayes
  pooling cascade with player-level leave-one-out and per-level variance components (Henderson III).
  Full design in §12; this is no longer open.
- **`role_on_team` ≠ `health_status` (new field needed).** Mechanical "Active DNP" via `GP ≤ 5`
  conflates injury with coach's-decision (e.g. Taylor Hendricks = injury, not DNP). Add a separate
  availability/health field rather than overloading the role label.
- **`projected_role_on_team` (separate field).** Rookies/prospects with no observed NBA season
  (Flagg, Harper, etc.) should not be forced into an observed role; keep them out of the
  observed-role layer (they're not in the 2021–2025 model data anyway).
- **Canonicalize the Ron Holland / Ronald Holland II duplicate** (one row, keyed on id).
- **Court-role classification per season.** The player index is one row per player (latest
  season). Decide whether off/def court role is genuinely fixed across all of a player's seasons,
  or should be re-derived per season. (Currently assumed fixed per player.)
- **The 27 "Needs Review" / unmatched players** — how they fall back rather than being treated as
  corrected-role rows.
- **Position authority for RPV** — ~11 spec primary_position errors; DB `players.position` is
  unusable (coarse + miscategorizes centers as "wing"). RPV uses position in its cell, so this
  needs a clean position source.
- **✓ Component-cast reconciliation — RESOLVED (COV and PTV are revived; fact, not a lean).** The
  retirements in `tcv_metadata.json` are from a pre-cascade iteration (>2 days old) and are STALE.
  Per Jack: **COV and PTV are both live, revived components in v2.2.** The proof-profile cascade
  turns the old redundant flat-COV into a non-redundant role-conditional one, and PTV is rebuilt
  against the now-existing independent playoff per-player data (`rapm_playoff_2425` + the PO*
  stat mirror). All ten components are in the v2.2 cast. The COV math batches are NOT provisional.
  (PTV currently ships pass-through `w=1.000` with diagnostics per §7a — "revived" means it's in the
  build and rebuildable, not that shrinkage is switched on yet; flip that when Jack decides.)
- **`reliability` r (§5) vs validation r (tcv_metadata) are different quantities — don't conflate.**
  §5's split-half reliabilities (PVA .842 etc.) measure internal consistency; the metadata's r's
  (PVA 0.101, IIB 0.409, MIV 0.39, DPC 0.247, DSV 0.153, RPV 0.139, COV 0.308) measure correlation
  with netRAPM. A component can be internally reliable yet weakly predictive (PVA).
- **β/γ hook coefficients — data is STAGED, work is fit + parse (not a data gap).** The
  `*_shrinkage_example` text is descriptive; the numeric coefficients can be **fit** from data
  already in the repo (`component_data_all/`, `component_master_2526`, `selfcreated`,
  `2021to2526pbpalladvantage`, synergy, tracking totals). Possession-sequencing signals
  (IAV / EP-before-vs-after-touch / true-grenade) need a **pbp-parse step** over
  `data/possessions/*_tp.csv` + `data/raw_pbp/` (3,180 games local; more in the 406 MB LFS
  `data.zip`) — a build task, not missing data. Full inventory in §13.

---

## 9. Source-of-truth pointers

- **Team role (PRIMARY):** curated per-season perception labels — Jack's hand-graded files
  (criteria reference: `Database2.2/Adjusting Role On Team.md`, which is the 2025-26 pass).
  As each season is labeled it becomes the source of truth for that season.
- **Team role (FALLBACK):** `public._role_on_team_seasons` (2,827 rows, 991 players, 5 seasons;
  byte-verified md5 `e9d98a5a392d91a51e10c7c1f98d31bd`; cols season/bbref_id/label_code) +
  `public._fc_seasons` (90 rows, 19 players; FC overlay). Clean export: `role_on_team_corrected.csv`.
  Used only where no curated label exists yet.
- **Court roles / off+def role + hooks:** `Database2.2/v2_player_profiles_full_proof_profiles.csv.xlsx`
  (435 players; use `offensive_role`, `defensive_role`, the `*_shrinkage_example` columns,
  `evidence_state`, `cap`; IGNORE `role_on_team_group`, `legacy_*_profile`).
- **Architecture:** `Database2.2/gingeball_archetype_system_v2_proof_profiles_player_index_role_on_team_corrected.pdf`.
- **Observed component values + possessions:** live model `v1.1.0-5yr` in Supabase project
  `pwvcjqztwhvolwrdsnil` (`tcv_scores`, `tcv_components`).
- **Identity key:** ALWAYS `nba_id` / `name_bbref`. NEVER raw name (accent/mojibake corruption).

---

## 10. Role-on-Team label review (batches 1–4) + expanded vocabulary

**Source files** (curated 2021–2024-25 perception labels): `Database2.2/first batch.md`,
`Second batch.md`, `third batch.md`, `fourth batch.md`. Plus `Adjusting Role On Team.md` =
the **2025-26** criteria reference (a season not in the model; not a direct input).
**Standard applied:** label = season-specific deployment/perception, *as perceived at the time*
— not talent, usage, contract, box score, or future projection.

All four batches were reviewed for hindsight leakage. **Verdict: the bones are honest** — the
discipline is visible (e.g. Naz Reid labeled before 6MOY; Max Strus kept Core in 2021-22 despite
later starting; Gabe Vincent's regular-season role separated from his Finals run; Cam Thomas
explicitly *not* inflated "yet"). The one systematic pattern was **early FC demotions for
aging/soon-to-decline stars**, which is the signature of hindsight because the team was still
building around the guy that season.

### Confirmed rulings

**Franchise Cornerstone (the high-confidence leaks — fixed):**
- LeBron — **FC 2022-23**, demote 2023-24 (Lakers fully retooled around him + WCF run in 22-23).
- Kevin Durant — **FC 2022-23** (Phoenix traded Bridges + Johnson + four firsts for him).
- Jimmy Butler — **FC through 2023-24** (still Miami's axis; the sour/trade is 2024-25).
- Bradley Beal — **FC 2021-22** w/ availability flag (supermax-era cornerstone; "dumb deal"
  is an outcome judgment — see the Beal/Grant rule, §6 #8).

**FC borderlines (agreed):** Fox keep **FC 2023-24**, demote 2024-25 · LaMelo **FC-with-
availability-flag 2023-24** · KAT keep/flag **FC 2021-22**.

**Other:**
- Jerami Grant — **HM 2022-23 & 2023-24** (lead option on a max), **TS 2024-25** (role shrank).
- Christian Wood — **TS** (Jack's call; the "trust questions" reason was borderline-fine).

**Reason-leak fixes (label may stand; reword the forward-reaching *reason*):** Deandre Ayton
2022-23 ("trust shaky" → he'd just been matched at 4yr/$133M), D'Angelo Russell 2023-24
("closing trust" leans on the playoff benching), Nic Claxton 2021-22, Eric Bledsoe 2020-21.

### Data-integrity items found
- **Identity-collision audit (2026-06-25, update 8): Blake Hinson is NOT alone — 19 collision
  pairs in `players`.** A full scan for shared `name_bbref` / `name_nba_stats_id` found 19 pairs
  where two rows share an identity key (every one a join-multiplier for the v2 build, not just
  Blake/Cade). They split into two classes needing OPPOSITE fixes (full per-row plan in
  `players_collision_fix_plan.md`):
  - **8 Type-A (same player, two rows — merge):** Vlatko Čančar, Pacôme Dadiet, Nikola Jović,
    Jimmy Butler/III, Jeff Dowtin/Jr., Trey Jemison/III, Karlo Matković, Tidjane Salaün
    (mojibake or suffix variants). Survivor = the row already holding the live `v1.1.0` scores, so
    **no live published score ever changes `player_id`**; only the duplicate's obsolete-model
    scores + badges repoint (dedup on the UNIQUE keys), then the no-live duplicate row is deleted.
  - **11 Type-B (two different players, interloper wears the canonical's keys — re-key):**
    Blake Hinson (off Cade), Payton Sandfort (off Battle), Grant Nelson (off Clowney), Marcus
    Bagley (off Diabate), Toby Okani (off S.Jones), Malachi Smith (off Mobley), Bez Mbeng (off
    T.Smith), Jayson Kent (off J.Young), Nigel Hayes (off Arcidiacono), Tristan Enaruna (off Tre
    Jones), and the 1642422 pair (Traore/Omier — owner to verify). Fix = strip the wrong keys off
    the interloper row only; no score/badge rows touched. Two interlopers (Marcus Bagley, Armel
    Traore) carry **1 live score each** — flagged: that published season is attributed to a
    mis-keyed player and needs Jack's ruling.
  - **Crosswalk reality check:** the repo crosswalk is `bbref_nba_crosswalk_PARTIAL_932of1001.csv`
    — **PARTIAL (932 confident + 34 still-ambiguous), not the "closed 966."** Its own README notes
    `players.name_bbref` was empty at build time; the later write-back is what grafted wrong stubs
    (e.g. Blake → `cunnica01`) and the README already flagged the Hayes/Arcidiacono `1627853` case.
    Crosswalk gave clean ownership of all 19 shared keys; it does NOT contain the 11 interlopers'
    own keys (fringe players) — those get sourced (nba_api static / bbref allowlist) at execution,
    NULL-and-flagged if unresolved. This is a DB-state correction, NOT a reopening of crosswalk
    name-matching.
- **Holland:** only one DB row (`Ronald Holland II` / `hollaro01`). The "duplicate" is a spec/CSV
  artifact only — no DB fix needed.

### Tactical Starter split (decision §6 #7) — the three jobs it was doing
| New canonical label | Who | Sample | Burden / trust |
|---|---|---|---|
| **Role Starter** | narrow but full-time, trusted in lane (Royce O'Neale, Hield, DFS, KCP, Seth Curry, Barnes, Strus) | large | low burden, high in-lane trust → shrink *little* |
| **Tactical Starter** | conditional / matchup / fit (the original meaning) | variable | variable |
| **Developmental** | inflated-circumstantial: bad-team usage, injury fill-in, development reps (Jaden Ivey, John Wall post-injury, KPJ-Houston, tank/dev starters) | low *effective* sample | low trust → shrink *hard* |

These want opposite shrinkage, so they must not share one cell (it pollutes the prior mean and
blinds the leverage knob). "Developmental" is distinct from "Situational Specialist" (veteran
narrow-skill) — different trust/sample profile, different math.

### Expanded canonical vocabulary (LOCKED — full spec with leverage math in §11)
- **Starters:** Franchise Cornerstone · Heavy-Minute Starter · Role Starter · Tactical Starter
- **Bench:** Sixth Man / Impact Sub · Core Rotational · Situational Specialist · Energy / Spark Plug · Developmental
- **Non-Players:** Garbage Time · Active DNP · Inactive / Roster Filler
- Plus an **orthogonal availability/health flag** (so injury never masquerades as a role).

Every label above is a first-class entry with its **own leverage / effective-sample / trust
parameters**. All batch-file slash-composites and ad-hoc sub-types normalize to exactly one of
these before becoming proof-profile cell keys.

---

## 11. Final consolidated label spec (LOCKED)

The deterministic recipe that turns batches 1–4 + the mechanical fallback into one per-season
labeling. Once applied, the output is reproducible. Identity keyed on `nba_id` / `name_bbref`.

### 11a. Canonical vocabulary — 12 labels + 1 flag
| Family | Code | Label | One-line meaning |
|---|---|---|---|
| Starters | **FC** | Franchise Cornerstone | team built around him; org identity / hub-and-closing axis |
| | **HM** | Heavy-Minute Starter | broad, high-burden full-time starter; not the franchise axis |
| | **RS** | Role Starter | full-time starter in a *narrow* job, trusted in lane; big sample, low burden |
| | **TS** | Tactical Starter | conditional / matchup / fit starter; not guaranteed to close |
| Bench | **6M** | Sixth Man / Impact Sub | real bench engine; carries a unit, sometimes closes |
| | **CR** | Core Rotational | stable, trusted rotation piece |
| | **SS** | Situational Specialist | narrow skill / matchup / emergency use (veteran-narrow) |
| | **EN** | Energy / Spark Plug | short-burst pace / pressure / physicality changer |
| | **DEV** | Developmental | *young* player on circumstantial/inflated minutes; unstable sample, low trust |
| Non-Players | **GT** | Garbage Time | low-leverage minutes only |
| | **DNP** | Active DNP | healthy, coach's-decision non-rotation |
| | **INA** | Inactive / Roster Filler | not available / not deployed |

**Orthogonal flag — `availability ∈ {full, limited, out}`.** Injury/health lives here, never in
the role label.

### 11b. Per-label leverage math (esf) — CONFIRMED as starting points
Role on Team sets *trust in the sample*, not the prior mean. Each label scales possessions before
SE: `n_eff = esf · n`, then `SE = σ_resid · √(med_poss / n_eff)` (evidence_state inflates SE
further, orthogonally). Lower esf → bigger SE → more shrinkage. **Ordering is the design;
magnitudes calibrate against the reliability check (§5).**

`FC 1.00 · HM 1.00 · RS 0.95 · 6M 0.85 · CR 0.80 · TS 0.75 · SS 0.65 · EN 0.55 · DEV 0.45 ·
GT 0.30 · DNP/INA — (no court-value grade)`

FC vs HM differ via the **prior cell** (FC graded against FC = higher bar, §7 guardrail), NOT esf.
**Sub-decisions confirmed:** esf values accepted as the starting point; **DEV = young**
circumstantial, **SS = veteran** circumstantial.

### 11c. Normalization ruleset (batch text → canonical)
1. **Composite "A / B [borderline]" → take primary (A)**, unless a confirmed ruling overrides.
2. **Split any resulting Tactical Starter by the batch's reason:** narrow-but-full-time / trusted
   → **RS**; matchup / fit / conditional → **TS**; bad-team / injury-fill / development → **DEV**
   (young) or **SS** (veteran-circumstantial).
3. **Ad-hoc sub-types collapse:** Developmental Guard/Big/Wing → **DEV**; Scoring Specialist → **SS**;
   Energy Guard → **EN**; Situational Big → **SS**; "core defensive big" → **CR**.
4. **Availability extraction:** "Inactive / injury-status separate" or "with availability flag" →
   set `availability`; essentially-didn't-play (Lonzo, Fultz, Joe Harris '22) → **INA**;
   played-but-limited → keep role + `availability=limited`.

### 11d. Consolidation precedence (assemble the one file, in order)
1. **Base** = mechanical `_role_on_team_seasons` + `_fc_seasons`, normalized to canonical.
2. **Batch overrides** (1–4) by player×season.
3. **Confirmed FC pass per season** = batch FC sets **plus re-additions**: LeBron FC 22-23
   (demote 23-24), KD FC 22-23, Butler FC through 23-24, Beal FC 21-22, Fox FC 23-24,
   LaMelo FC 23-24, KAT FC 21-22.
4. **Individual rulings:** Grant HM 22-23 & 23-24 / TS 24-25; Wood TS.
5. **Normalize + Tactical-split (§11c); extract `availability`.**
6. **Reason-leak fixes = documentation only** (Ayton, D'Lo, Claxton, Bledsoe) — no assignment change.

**Fix the Blake Hinson / cunnica01 duplicate first** so joins don't multiply.

### 11e. Output schema (one table)
`season · nba_id · name_bbref · player_name · team_role (canonical) · availability · esf · source (curated|mechanical)`

### 11f. Validation: consistency audit REPLACES more batches (process decision)
No more label batches (diminishing returns on fringe rotation guys). The real risk is our **own
new vocabulary (RS, DEV — invented after the batches) orphaning players** the batches left as
HM/TS/CR. So after consolidation, run a targeted, mostly-automated audit against the live DB;
Jack rules on the flags:
- (a) players tagged **HM** with a narrow-full-time profile → should be **RS**?
- (b) ≤2nd-year players in **TS/CR** on sub-.350 teams → should be **DEV**?
- (c) any player×season where curated vs mechanical disagree by **>1 tier** → intended or missed?
- (d) per-season leverage-tier counts (catch FC-count anomalies, e.g. 3 one year, 25 the next).

---

## 12. Prior estimation: the pooling cascade (LOCKED)

Resolves the self-shrinkage leak (anchor **and** spread) and the all-thin per-season grain in one
structure. Replaces the old "default to family at k=20" + discrete fallback ladder with a single
adaptive cascade. Built from the live v1.1.0 component values; **read-only, DB stays frozen.**

### 12a. Why this shape (measured, not assumed)
Cell-size audit (proxy: mechanical team labels + court roles, cells pooled across seasons) showed a
**fat-head / long-tail** distribution, NOT uniform thinness:
- Offensive: 84 cells, median 8, mean 17.8, max 101. **33% of cells have <5 members but only 5% of
  player-seasons** sit in one; 54% of cells <10 = 13% of player-seasons; 76% <20 = 31%.
- Defensive healthier (63 cells, median 11; 9% of player-seasons in a sub-10 cell).
- Tactical split deepens the tail (offense → ~106 cells, median 7) but does **not** collapse the head.
- The genuine tail is **n=1 cells** → pure LOO breaks there (anchor has zero members) → a pooled
  fallback underneath is mandatory, not optional.
- FC is one big cell (FC × Primary Offensive Engine = 53) plus 4–5-member satellites → thin FC court
  roles must borrow strength.

Conclusion: blanket-pool over-blurs the head; pure per-cell dies in the tail and re-creates the leak.
The answer is **partial pooling whose strength scales with cell size** — empirical-Bayes.

### 12b. The telescoping cascade (coarse → fine; each level shrinks toward its parent)
```
L5  global (per component)                         ← always exists; nothing is ever orphaned
L4  court role (pooled over team roles + seasons)
L3  leverage tier × court role                     (Starters / Bench / Non-Players × job)
L2  CROSS-SEASON cell = team role × court role      ← the stable anchor
L1  PER-SEASON  cell = team role × court role × season  ← specific but thin
obs the player-season itself (shrunk via §5 variance-form weight w)
```
At each level: `est(level) = λ · raw_mean(level) + (1 − λ) · est(parent)`, with
`λ = n / (n + k_level)`. Telescopes automatically: a 1–2 person per-season cell has λ≈0 and
collapses onto the cross-season anchor (which already absorbed tier→global); a fat cross-season cell
has λ≈1 and stands on its own. **Specificity is spent only where data backs it.**

**Both season grains, used as an advantage:** per-season (L1) is unusable raw, but becomes safe
because it shrinks toward cross-season (L2); cross-season is the stable home. When a season genuinely
differs *and* L1 has support, λ rises and the estimate earns its season-specificity; if the
difference is noise, it snaps back to L2. (Bonus: a large, well-supported L1–L2 gap is itself a
diagnostic of a real season-context shift — surfaced later, not required for the build.)

### 12c. Variance components (the k's and the spread) — kills the spread leak by construction
- `k_level = σ²_within / σ²_between`, estimated **across all cells at that level** (not per cell), so
  it is stable even when individual cells are thin. Large between-cell variance → small k → trust
  cells; small → large k → pool harder.
- **`priorSD²` = the per-level between-cell variance** (the same quantity estimated for the k's),
  **never** the SD computed inside one thin cell. Because the spread no longer comes from the single
  contaminated cell, the spread leak ("his own outlier makes his cell look noisy → he escapes
  shrinkage") **cannot occur** — it is removed structurally, not patched.

### 12d. Estimator choice (decided)
- **Workhorse: Henderson Method III** — the imbalance-robust method-of-moments variance-components
  estimator. Closed-form, non-iterative, built precisely for the unequal cell sizes we have
  (deliberately extreme, and more so with the per-season rung). Keeps the transparency that made us
  choose MoM over REML.
- **Hand-check: Type I ANOVA components** — the most napkin-recomputable MoM, run on a couple of
  balanced-ish levels to confirm Henderson III isn't doing anything funny.
- **Cross-check: REML** — on the 2–3 highest-player-mass levels (cross-season cell, tier×court)
  only. If MoM and REML agree there, ship MoM everywhere; if they diverge, understand why first.
  Also the tell for whether a level that returns floored-at-zero between-variance should be
  **collapsed out of the cascade** (it carries no signal) vs. MoM choking.
- **Rejected:** full Bayesian / posterior-on-k (overbuilt for a point estimate); equal-weight and
  size-weight MoM (each fixes one tail by wrecking the other); vanilla Type I as workhorse (its
  worst case — extreme imbalance — is our normal case).

### 12e. Leave-one-out, scoped
- **Player-level LOO** (exclude *all* of a player's seasons, not just the current one — his seasons
  are correlated) applies to the **mean/anchor at every level he belongs to (L1–L4).** Removes the
  self-reference from the anchor.
- LOO does **not** apply to the k's or `priorSD` — those are estimated across thousands of rows where
  one player is negligible. Clean split: **LOO on anchors, pooled variance-components for weights and
  spread.**

### 12f. Calibration (consistent with §5)
At median possessions, the variance-form weight `w` should land near each component's reliability `r`.
Re-run after the cascade is parameterized; if it holds, the priors and the weight agree where they
should and the whole estimator is sane.

---

## 13. Data assets available (catalog — so we never under-count the repo again)

The repo (`gingeball-data`, ~13,400 files, ~37 formats × seasons) already holds the inputs for
**all ten components and every hook signal.** Authoritative existing inventories:
`Court Handicap/gingeball_data_inventory.md` (full format-by-format) and
`Court Handicap/data_gap_map.md` (reconciled — what's owned vs. the two real gaps). Read those
before ever declaring data missing.

**Structural facts:** two keying worlds — name-keyed (drives/paint/post/elbow/pass/reb/shotdif/
touchdata/selfcreated/lineup*/team*/pbpalladvantage) and entity_id-keyed (*totals, players20xx,
tracking_*). Bridge via `nba_api` static players (5,103 id↔name) or `2425shotstotals`. Lineup/team
files key on a comma last-name string; per-game files on `game_id = YYYYMMDD0TTT`. `data.zip` =
406 MB git-LFS blob (in repo, `git lfs pull` to fetch); `data/possessions/` (3,180 games) +
`data/raw_pbp/` (3,180) + `pbp_data.zip` are present.

**Keystone pressure source:** `data/possessions/*_tp.csv` — per true-possession
`advantage_count`, `true_possession_points`, `standard_possessions_inside`, paired with
`*_lineups.csv` (10-man on-floor + time windows). This is created-advantage per possession.

**Player masters (start here):** `component_master_2526` (707×40 — `cov/pva/ptv/dsv/rpv_proxy`,
`pct_self_created`, `drives/paint/elbow_per_poss`, `rim_protection_above_avg`); `2425totals`
(564×76 richest tracking); `component_data_all/` (paint, drives, passing, self_created, elbow,
post, possessions, defense, rebounds, opponent_team, pbp_advantage_all_seasons).

**Per-component sources:**
- COV → possessions `_tp` advantage, component_paint/drives/elbow/post, selfcreated, pbpalladvantage, synergy_offensive, pbp_advantage_all_seasons (`creation_rate`).
- PVA → component_passing (`potential_ast`, `adj_ast`, `secondary_ast`, `ast_efficiency`, `pva_proxy`), 2425totals, pass/passes (1314→2526).
- SGV → shotdif (1314→2526), 2425shotstotals (per-shot ShotQuality/WideOpen/CatchAndShoot/PassFrom), trackingshottotals (39,964: def-dist×clock×touch×dribble), shotzone, toughshotmaking, per100SQ.
- MIV → speedist/speeddistance, tracking_game_logs, synergy movement types, touchdata. *(spatial gravity = Gap 2)*
- SAV → pbpalladvantage, shotzone, lineup spacing, synergy spot-up.
- DSV → matchups_ (who-guards-whom 2021→2324), fastbreak DefenderSuppression (built→DSV), synergy_defensive, playerdefense, def.
- DPC → synergy_defensive (yield by type), def/POdef.
- RPV → 2425totals (`def_rim_fgm/fga`), component_master (`def_rim_fg_pct`, `rim_protection_above_avg`, blk), contested reb, def/reb.
- Rebounding → reb (1718→2526), rebtotals, 2425totals (oreb/dreb contested/chances/defer), lineupreb, teamreb.
- IIB → external yardsticks merged: EPM (current), RAPM (1997–2024, def col unreliable), BPM family, ESPN net pts, EDI, IQ. *(own RAPM = Gap 1)*
- PTV → `THE REVAMPED NUMBERS/PTV_method.md`, `ptv_proxy`, lineup-diversity from lineup* on/off.

**Cross-cutting:** leverage/clutch tiers (VHL/HL/ML/LL × team{score,misc}; playoff *HVHLEV*);
**full playoff mirror 2021→2526** (PO* family — separate playoff sample per stat, enabling RS-vs-PO
weighting, e.g. the Gabe Vincent ruling); validation targets `lineupscore` (500 five-man units:
PlusMinus/OffPoss/Points), `score100poss`, `teamscore`; tools `pull_fastbreak.py`, `pull_epm2.py`
(re-run to backfill seasons), `tools/` bbref crosswalk.

**Gaps — one closed, one remaining (updated vs `data_gap_map.md`):**
1. **Own reliable-defense RAPM — BUILT (Gap 1 CLOSED).** `TCV explained.zip` contains
   `rapm_2425_pbp.csv` (571 players: `oRAPM/dRAPM/netRAPM/poss`, bbref-keyed),
   `rapm_multiseason.csv` (549, recency-weighted), `rapm_playoff_2425.csv` (139). Built from PBP in
   `data.zip`. It is the **calibration target** the whole TCV is fit to (TCV vs netRAPM r=0.544
   single / 0.606 multi-season, n=291) and ships in `tcv_site_export`. This is the internal
   source of truth; the gap-map text predates this build.
2. **Real spatial/continuous-movement tracking — still open, and intentionally OUT OF SCOPE for
   this build.** True gravity, spatial MIV, contest-at-every-moment; public coordinate tracking
   only 2013-16; fill via the `nba2nba` film pipeline. Future asset, not this rebuild.

Everything else is in hand. **Do not describe the hook layer as "design-ahead-of-data."**

---

## 14. Change log

- **2026-06-25** — Document created. Aligned and locked: 5-layer stack; per-season triple;
  two-way prior split (team×off, team×def); per-component cell map; 9-label cell granularity;
  team role from `_role_on_team_seasons`+`_fc_seasons`; per-season; variance-form weight;
  circularity guard recorded. Guards in §5 proposed pending confirm. DB frozen throughout.
- **2026-06-25 (update)** — **Role on Team source changed.** Switched team role to *curated
  per-season perception labels* (Jack's hand-graded front-office files) as primary, with the
  mechanical `_role_on_team_seasons`+`_fc_seasons` demoted to fallback. Rationale: Role on Team is
  a latent construct (league perception/deployment); minutes thresholds are tight-but-biased,
  expert labels are centered-but-noisier and the better prior. Recorded as an informative prior
  (more Bayesian, not less) and as durable/written-down subjectivity (does not conflict with the
  MASTER_APOLOGY). Added two guardrails in §7 (anchor FC on deployment not quality; label past
  seasons as-perceived-at-the-time, no hindsight). Added backlog: health_status field,
  projected_role_on_team field, Holland duplicate. Note: `Adjusting Role On Team.md` is a 2025-26
  pass — a season not yet in the model — so it's the criteria reference, not a direct input yet.
  DB still frozen.
- **2026-06-25 (update 2)** — **Role-on-Team label review (batches 1–4) folded in (new §10).**
  Reviewed all four curated batches for hindsight leakage; overall honest. Locked FC rulings
  (LeBron FC 22-23, KD FC 22-23, Butler FC through 23-24, Beal FC 21-22; Fox/LaMelo/KAT
  borderlines), Grant (HM 22-23 & 23-24, TS 24-25), Wood (TS), and the reason-leak fixes (Ayton,
  D'Lo, Claxton, Bledsoe). Added the **Beal/Grant deployment-not-outcome precedent** (§6 #8).
  **Split Tactical Starter (Option A)** into Role Starter / Tactical Starter / Developmental, and
  locked an **expanded canonical team-role vocabulary with per-label leverage math** (§6 #7, §10);
  added the **vocabulary-normalization pass** to the backlog. Confirmed the **Blake Hinson /
  cunnica01 duplicate** is a real DB bug (must fix); Holland dup is CSV-only. DB still frozen.
- **2026-06-25 (update 3)** — **Final consolidated label spec LOCKED (new §11).** Co-produced and
  confirmed: 12-label canonical vocabulary + availability flag; per-label **esf leverage math**
  (confirmed as starting points; **DEV=young, SS=veteran** sub-decisions confirmed); normalization
  ruleset; consolidation precedence; output schema. Locked **no-more-batches → consistency-audit**
  process (§11f, §6 #9). Added the **prior-estimation circularity** as the one structural math item
  to resolve before build (leave-one-out vs pooled variance components, §8). esf knobs, ladder
  rungs, and evidence→SE remain build-time-tunable. DB still frozen. Next: new chat for the build.
- **2026-06-25 (update 4)** — **Prior-estimation design LOCKED (new §12).** Measured the cell-size
  distribution: fat-head / long-tail, not uniform thinness (33% of offensive cells <5 members but
  only 5% of player-seasons in them; genuine tail is n=1 cells). Chose a **recursive empirical-Bayes
  pooling cascade** (per-season → cross-season → tier×court → court → global), each level shrinking
  toward its parent with `λ = n/(n+k)` — uses *both* season grains so per-season specificity is
  earned only where supported. **`priorSD²` = per-level between-cell variance** (kills the spread
  leak structurally); **player-level leave-one-out** on the anchors (kills the anchor leak).
  k-estimator: **Henderson Method III** workhorse, Type I ANOVA hand-check, **REML cross-check** on
  high-mass levels (also flags levels to collapse). Calibration re-check (`w ≈ r`) retained. The §8
  prior-estimation circularity item is now resolved. DB still frozen.
- **2026-06-25 (update 5)** — **Data-assets catalog added (new §13); retracted a false scarcity
  claim.** Full repo review (~13,400 files): the inputs for all ten components and every hook
  signal are already staged — keystone `data/possessions/*_tp.csv` (3,180 games: `advantage_count`,
  `true_possession_points`) + `_lineups.csv`; player masters `component_master_2526` (707×40 proxies)
  and `2425totals` (76-col tracking); `component_data_all/`; full RS + **playoff mirror 2021→2526**;
  leverage tiers; synergy / matchups / tracking / shot-quality; merged external impact yardsticks.
  Only two real gaps remain (own reliable-defense RAPM via the PBP crawl; spatial tracking via the
  film pipeline). Corrected the §8 β line: coefficients are **fit + pbp-parse work, not a data gap**.
  Pointers to `gingeball_data_inventory.md` + `data_gap_map.md` recorded. DB still frozen.
- **2026-06-25 (update 6)** — **RAPM confirmed BUILT; Gap 1 closed; TCV v1.0 component reality
  logged.** `TCV explained.zip` contains `rapm_2425_pbp` (571), `rapm_multiseason` (549, recency-
  weighted), `rapm_playoff_2425` (139) — built from PBP, and it is the **calibration target** the
  TCV is fit to (TCV vs netRAPM r=0.544 single / 0.606 multi, n=291); ships in `tcv_site_export`.
  Updated §13 gaps (one closed, only spatial tracking remains — out of scope this build). Logged a
  new open item: the shipped v1.0 weights are NOT co-equal — **PTV retired, COV/SAV/spacing zeroed**;
  v2.2 carries all ten components; **COV and PTV are revived (fact — the metadata retirements are a
  stale pre-cascade iteration)**: the cascade de-redundifies COV, and PTV is rebuilt vs
  `rapm_playoff_2425` + the PO* mirror. Noted §5 reliabilities ≠ metadata validation-r's. DB still frozen.
- **2026-06-25 (update 7)** — **Reviewed Batch 5 (DSV/DPC) + Batch 6 (RPV/IIB/PTV); locked the
  three-bucket hook-layer guardrail as §7a.** All six component-math batch files live in the
  `Database2.2/` folder of the public repo (`github.com/jackbecker2836-arch/gingeball-data`):
  `Batch 1 math.md`, `Batch 2 math.md`, `Batch 3 PVA SGV SAV math.md`, `Batch 4 PVA SGV SAV math.md`
  (= MIV), `Batch 5 defense.md`, `Batch 6 other.md`. All reviewed and architecture-faithful.
  Defense + Batch 6 sharpened the hook-circularity fix into three buckets:
  prior mean = cascade role baseline only; observation = raw cleaned by ownership/difficulty/luck
  decomposition (Batch 6 IIB `LuckAdjustedIIB` is the worked example to copy backward); SE = trust.
  Hard rule recorded: no hook signal may be the shrunk component or a function of it (banned forms
  listed). Flagged MIV (r=.305) as where mean-moving hurts most → SE-only. Confirmed PTV
  pass-through-with-diagnostics is correct and its availability handling matches §11. DB still frozen.
- **2026-06-25 (update 8)** — **Build step 1 started (Jack: "yup start on step 1" → full
  reconciliation). Identity-collision audit complete; fix plan staged; awaiting sign-off; DB still
  frozen / NO writes yet.** Confirmed the two Blake/Cade rows (corrupt row `5a883e7b` has Cade's
  keys + 4 obsolete `v0.1.0-bootstrap` draft scores, none on live; correct Cade row `9e80ee53`
  holds the 4 live `v1.1.0` published rows + 9 badges). Then scanned ALL of `players` for shared
  `name_bbref` / `name_nba_stats_id`: **19 collision pairs**, not 1. Cross-referenced the repo
  crosswalk (found to be PARTIAL 932of1001, not the "closed 966"; the `name_bbref` write-back
  introduced the wrong stubs). Classified deterministically into 8 Type-A merges + 11 Type-B
  re-keys (see §10 Data-integrity). Verified the merge plan keeps the **live model fully untouched**
  (survivor = live-holding row in every Type-A pair; Type-B touches only the interloper's two key
  columns). Confirmed UNIQUE keys: `tcv_scores`/`player_advantage_stats` = (player_id, season_id,
  model_version_id); `player_badges` = (player_id, season_id, badge_name) — these govern dedup on
  repoint. Full per-row plan in `players_collision_fix_plan.md`. Open for Jack: (a) canonical
  display-name on Butler/Dowtin/Jemison survivors; (b) ruling on the 2 live scores sitting on
  mis-keyed interlopers (Bagley, Traore); (c) owner of nba_id 1642422 (Traore vs Omier);
  (d) source vs NULL for the 11 interlopers' correct keys; (e) execute via transaction vs dev branch.
- **2026-06-25 (update 9)** — **Step-1 audit deepened & corrected; authoritative source switched to
  nba_api; plan finalized to 10 merges + 9 re-keys + 1 bbref fix. Still NO writes; DB frozen.**
  (1) The repo crosswalk was found not just PARTIAL but **wrong in places** — it mapped
  `diabamo01→1630542→Diabaté`, but nba_api (the 5,103/5,186 id↔name source §13 cites) says `1630542`
  = **Marcus Bagley**. Re-derived true ownership of all collided ids from nba_api, not the crosswalk.
  (2) A fuzzy-name scan vs authoritative names found **2 same-person dupes the shared-key scan
  missed** (Moussa Diabaté and Nigel Hayes each = a correct-id row + a wrong-id row); all other
  near-name pairs confirmed different people, correctly keyed. (3) Fetched correct nba_ids for all
  11 interlopers (nba_api static + live `commonallplayers`). (4) Reclassified: former Type-B
  Diabaté/Hayes become **merges** (their interloper rows are dupes of an existing correct row;
  re-keying would have created a NEW collision — caught by a pre-check that 2 of 11 target ids
  already existed). Final: **10 merges, 9 re-keys, 1 bbref fix (Bagley `diabamo01`→NULL).**
  (5) Verified live-model safety: **no `tcv_scores.player_id` moves** (survivors are live-holders);
  Diabaté's 3 live seasons (820/255/4176 poss) confirmed his; Bagley's 506-poss 2024-25 is a
  distinct track, left in place (flagged for Jack). (6) **Execution-path correction:** a Supabase
  dev branch is schema-only (production data does not carry over) → can't validate a data fix;
  recommending a single prod transaction + row backup + pre/post counts instead. Full per-row plan:
  `players_collision_fix_plan.md`. Open: Bagley 506-poss ruling; exec-path confirm; optional
  partial-UNIQUE-index guardrail on `name_nba_stats_id`/`name_bbref`.
- **2026-06-25 (update 10)** — **BUILD STEP 1 COMPLETE & VERIFIED (first write to the DB).**
  Applied migration `step1_player_identity_reconciliation_v2` (one atomic transaction) on prod after
  a clean pre-flight + full row backup. Did: 10 merges, 9 re-keys, 1 bbref fix (Bagley), cleared all
  collision flags, and added two **partial UNIQUE indexes** (`players_nba_stats_id_uq`,
  `players_name_bbref_uq`) so identity collisions can never silently recur. Metadata (archetype/
  family/position/etc.) was carried dup→survivor so nothing was lost (e.g. Butler kept `star` +
  `fully_qualified`). Post-verify: players 1093→**1083**; collision flags 22→**0**; remaining dup
  groups **0**; **live model untouched — `d1bd2c9d` still 2,806 published, total live scores 2,806**;
  both guardrail indexes present. First (failed) attempt rolled back fully on a `name_slug` unique
  clash (rename-before-delete ordering); fixed by deleting dups before the Butler rename.
  Reversibility: backup tables `_bak_step1_players` / `_tcv` / `_badges` / `_components` retained in
  DB (drop once confident); migration SQL saved as `step1_migration.sql`. The §3/§11 "Blake Hinson
  duplicate" item and the broader collision class are now CLOSED. **Identity is now structurally
  safe to join on `name_nba_stats_id` / `name_bbref`.** Next build step: §11 canonical Role-on-Team
  label table (12 labels + availability), keyed on the now-clean ids, then the §11f audit.

- **2026-06-25 (update 11)** — **BUILD STEP 2 COMPLETE: §11 canonical Role-on-Team label table.**
  Created `public._role_on_team_canonical` (PK season_year+nba_id; cols: season_year, season_id,
  nba_id, name_bbref, player_name, team_role, availability, esf, source). Keyed on the now-clean
  `name_nba_stats_id`. **2,802 player-seasons, 966 players, 5 seasons.** Source split: 600 curated /
  2,202 mechanical. Label dist: CR 574, SS 521, TS 439, HM 379, GT 300, DNP 191, EN 181, 6M 105,
  FC 96, INA 10, DEV 6 (RS 0 — see audit). Availability: full 2,767 / limited 35. esf per §11b
  (FC/HM 1.00 … GT 0.30; DNP/INA NULL → 201 null rows). FC per season: 19/19/22/19/17.
  Build pipeline (all reproducible): parsed the 4 role batches (first/Second/third/fourth) →
  620 overrides (0 unmapped, 0 cross-batch conflicts) via header-driven column detection +
  longest-prefix label normalization; season convention confirmed (mechanical "2021"=2020-21 …
  "2025"=2024-25, matches `seasons`, no off-by-one). Resolved 540 unique override names → nba_id
  (536 via unaccent+punct-strip match, 4 manual variants: Cam→Cameron Johnson, Herb→Herbert Jones,
  Scottie→Scotty Pippen Jr., Trey Jemison→…III); 0 unmatched. Consolidation precedence applied:
  mechanical base (AD→DNP, SM→6M, rest identity) → `_fc_seasons` Option-B FC overlay → batch
  overrides → confirmed-FC pass (LeBron 22-23 +demote 23-24, KD 22-23, Butler→23-24, Beal 21-22,
  Fox 23-24, LaMelo 23-24, KAT 21-22) → individual rulings (Grant HM 22-23 & 23-24 / TS 24-25;
  Wood TS already). Spot-checks all correct. Staging table `_rot_batch_stage` retained for the audit.
  Enabled `unaccent` extension. Per locked process, RS/DEV deferred to the §11f audit (only explicit
  "Developmental X" batch primaries → DEV, giving 6).
  KNOWN / for §11f audit (NOT build errors): (a) 4 "Borderline FC calls for 2022-23" — Trae, Dame,
  Fox, Edwards — defaulted to FC from the FC-section fallback (batch author was explicitly undecided);
  (b) `_fc_seasons` Option-B assigns FC to some early-career seasons (e.g. Fox FC 2021-2023) — flag
  via per-season FC-anomaly probe; (c) RS population (narrow-full-time HM/TS → RS) and young-on-bad-
  team → DEV.
  FALLBACK SET (§8): 25 mechanical bbref_ids (26 rows) don't join `players` and are excluded
  (mostly AD/GT deep-fringe). ~8 exist in `players` with null bbref and could be re-linked to recover
  their mechanical role: baglema02→Marcus Bagley, salauti01→Tidjane Salaün, matkoka01→Karlo Matković,
  vezenal01→Sasha Vezenkov, harklej01→Elijah Harkless, louzama01→Didi Louzada, cuiyo01→Cui Cui,
  armeltr01→Armel Traoré. The other ~17 are genuine fallback. (Optional small follow-up; not done.)

- **2026-06-25 (update 12)** — **§11f consistency audit run. No structural errors; no data changes made.**
  (c) curated-vs-mechanical: 233/599 curated rows differ by >1 tier, but the transition matrix is
  entirely sensible curation — HM→TS 96 (batch's core downgrade), TS→HM 34, CR→SS 29, GT→SS 17,
  plus small injury INA/DNP moves. **No anomalous low→high jumps** (no GT/DNP/bench→FC); every FC
  promotion was HM→FC (1 tier, not even flagged). Clean.
  (d) per-season tiers stable: Starter ~180 (197/180/177/175/185), Bench ~280, Non ~100; FC
  19/19/22/19/17. No anomaly.
  (a) RS candidates: archetype is NOT a safe RS proxy — `specialist` family tags STARS as
  "low_usage_specialist" (Lillard, DeRozan, Beal, Jalen Green, Markkanen), so can't auto-derive.
  Only the `defense` family HM set is clean RS material (11 players: Draymond, Gobert, Herbert Jones,
  Dort, Smart, JJJ, Claxton, Mitchell Robinson, P.J. Washington, Amen Thompson, Dyson Daniels).
  (b) DEV candidates: 165 young TS/CR (99 rookies: 33 TS + 66 CR; 66 sophomores). Needs the sub-.350
  team filter, but the DB has NO team records / player-team-season map (teams table has no W/L;
  draft_year all null — experience proxied by first-appearance). CR-rookie→DEV is a stretch; TS-rookie-
  on-bad-team is the real case. Left to Jack.
  CORRECTION to update 11: the 4 "Borderline FC calls 2022-23" (Trae/Dame/Fox/Edwards) get FC from
  Option-B `_fc_seasons` (mechanical), NOT my parser — the header-driven parser skipped that table.
  Per Jack: item 1 "agree", item 2 "fine for now" → both leave Option-B FC as-is. No change.
  OUTCOME: canonical table stands as built. Only open lever is whether to populate RS/DEV (judgment
  reclassification); batches deliberately left these as HM/TS/CR. Awaiting Jack's RS/DEV policy call.

- **2026-06-25 (update 13)** — **RS/DEV applied to `_role_on_team_canonical` with external data (live untouched).**
  Gathered external data Jack asked for (stats.nba.com blocked from datacenter IP; used Basketball-
  Reference, parsed in Python, joined on name_bbref — pages never entered context):
  • `bbref_totals.json` 2,800 player-seasons {season, bbref, primary team, G, GS, MP, gs_share}
    (traded players: season totals from the NTM aggregate row, primary team = max-MP team).
  • `bbref_standings.json` 150 team-seasons {season, team, W, L, pct}.
  • `bbref_draft.json` 324 ids → draft_year (classes 2019-24). All scripts in /home/claude/gb (NOT
    loaded to DB — derived/reproducible; offer to persist as `_bbref_*` if model wants team/GS later).
  DEV rule (locked): team_role∈(TS,CR) AND ≤2nd yr by draft_year (exp=season−draft∈{1,2}) AND primary
  team win%<.350. 75 hits; Jack imposed gs_share≥0.15 floor (dropped 9 garbage-time CRs) → **66 DEV**
  applied (36 from TS, 30 from CR), esf 0.45. Kept rookies+sophomores.
  RS batch 1 (defensive anchors, HM→RS): the clean `defense`-family HM set; Jack kept Gobert/Draymond/
  JJJ as HM (DPOY-tier), low-availability seasons left in → **19 RS** (Dort, Smart, Claxton, H.Jones,
  M.Robinson, P.J. Washington, Amen Thompson, Dyson Daniels), esf 0.95.
  RS batch 2 (offensive role-starters, hand-vetted from HM pool; archetype unreliable — `specialist`
  tags stars, and Murray/Herro/Siakam/Ingram/P.George mis-tagged): Tier A 63 (27 players) + Tier B
  name-by-name (23 players→RS all seasons; Bam/Mobley/Chet/Valančiūnas/Nurkić/Vassell kept HM; Ayo
  dropped on part-time .487; season-splits Jrue RS 24-25 only, Mikal RS 21-22 only) → **105 RS**
  applied, esf 0.95. All reclassifications tagged source='audit' for traceability.
  FINAL canonical (2,802; live d1bd2c9d untouched): FC96 HM255 RS124 6M105 CR544 TS403 SS521 EN181
  DEV72 GT300 DNP191 INA10. RS/season 24/27/25/21/27 (stable). §11 label table COMPLETE.
  NEXT: §12 prior-estimation pooling cascade (telescoping L5→L1 empirical-Bayes; read-only on live).

- **2026-06-25 (session end / pickup point)** — §11 label table COMPLETE & locked (FC96 HM255 RS124
  6M105 CR544 TS403 SS521 EN181 DEV72 GT300 DNP191 INA10; live d1bd2c9d untouched).
  ONE PENDING ITEM (approved, not yet done): persist the frozen BBRef scrape to DB as
  `_bbref_totals` / `_bbref_standings` / `_bbref_draft` (audit provenance + possible §12 reuse).
  Trimmed load SQL is READY at /home/claude/gb/load_bbref_trim.sql (~107KB, 2800+150+324 rows,
  derivable gs_share/pct dropped). NOTE: workspace is ephemeral — if /home/claude/gb is gone next
  session, re-scrape via the saved approach (BBRef totals/standings/draft pages, parse in Python,
  join on name_bbref) before loading. Load via apply_migration (no psql/DB creds in sandbox); to
  protect context, load standings+draft first, then totals in 2-3 chunks.
  THEN: §12 prior-estimation pooling cascade (telescoping L5→L1 empirical-Bayes, read-only on live).

- **2026-06-26 (BBRef persist COMPLETE)** — Loaded the frozen BBRef scrape to DB. On pickup found a
  prior partial load (totals 1868/2800, missing 2024-25; standings 150 & draft 324 already complete &
  correct). Content matched the verified JSON, so DROPped + reloaded `_bbref_totals` cleanly from
  bbref_totals.json in 3 chunks (1000/1000/800) via apply_migration. FINAL: `_bbref_totals` 2800
  (by season 537/593/539/568/563), `_bbref_standings` 150, `_bbref_draft` 324. Cols: totals(season_year,
  bbref,team,g,gs,mp) — gs_share derivable as gs::numeric/nullif(g,0); standings(season_year,team,w,l)
  — pct = w::numeric/(w+l); draft(bbref,draft_year). Table comments note the derivations. Join check:
  2800/2802 canonical rows joinable on name_bbref+season_year (2 players lack a BBRef totals line that
  season — harmless). RS=124 / DEV=72 intact; live d1bd2c9d untouched. _bbref_xwalk (965) is the
  pre-existing crosswalk, left alone. Open-items list now CLEAR.
  NEXT: §12 prior-estimation pooling cascade (telescoping L5→L1 empirical-Bayes; read-only on live).

- **2026-06-26 (§12 court-role sourcing — option (b) chosen)** — §12 cascade prereq is a per-player
  {team role × court role} cell. Court roles live in `_v2_profiles` (off_profile/def_profile) but only
  for 429 players; obs_long (28,060 = 10 comp × 2,806 PS) has court roles on only ~1,562 of 2,806 PS.
  Prior session's `_v2_prior_*` + `_v2_component_shrinkage` are a FLAT single/2-way scheme (no k_level,
  within-cell SD, no telescoping/tier×court/per-season, no LOO; `_v2_prior_role` abandoned) — PREDATES
  the §12 lock → must be REBUILT. obs_long.effective_role is stale (9 values, pre-RS/DEV) → re-key team
  role from `_role_on_team_canonical`.
  DERIVATION (validated on the 429 known): **off_profile == scoring_profile** (426/429); **def_profile =
  deterministic lookup on scoring_profile** — 100% pure for 44/45 profiles, only corner_three_specialist
  splits (91% secondary_guard_defender; big/C → defensive_rebound_finisher). Overall ~99.7% reproduction.
  COVERAGE of the 562 unassigned players: 168 have scoring_profile (all in-vocab → exact fill); **394 have
  NULL scoring_profile** (deep-bench, avg ~1.9k poss). family×pos predicts def well (~60-100%) but CANNOT
  pin fine off (~24-50% pure). PROPOSAL: fill 168 exact; for 394 assign def via family×pos modal, let
  offense ride the family rung, mark all fallback-sourced + EXCLUDE them from prior ESTIMATION (they
  consume priors, don't define cells). Pending Jack's nod on the 394 treatment, then build cascade.

- **2026-06-26 (court-role fill handed to Jack)** — Confirmed players table has family=null,
  position='unknown', pos_label/ht/wt=null for ~all 394 null-sp players (only ~3 have a coarse
  position). So no family×pos fallback is even possible — hand-fill is the only path. Built
  /mnt/user-data/outputs/court_roles_to_fill.csv (394 rows, 1/player, sorted by name; cols nba_id,
  player, bbref, family[blank], position[blank], seasons, poss_by_season, total_poss, off_profile[blank],
  def_profile[blank]) + court_role_vocab.md (45 off + 10 def valid tokens). Jack fills off+def per player
  (per-season on request). The other 168 unassigned (have scoring_profile) to be auto-filled from the
  validated mapping when we build the table. AWAITING Jack's returned fills.

- **2026-06-26 (CORRECTION — court roles were keyed on the WRONG layer)** — I had built the
  court-role fill on `_v2_profiles.off_profile`, which holds the FINE ~45 scoring_profile /
  "Archetype Label" values. §4 is explicit: Role on Court is the BROAD family (12 offensive +
  12 defensive); the 45-value layer is the Archetype Label = "human-facing summary only, NOT a
  scoring key" / tags, which §4 excludes. That's why off vs def looked inconsistent (`_v2_profiles`
  had broad def role but fine off profile). The `court_roles_to_fill.csv` + `court_role_vocab.md`
  I produced are VOID (wrong vocab + wrong scope).
  AUTHORITATIVE COURT-ROLE SOURCE = `Database2.2/v2_player_profiles_full.xlsx` (435 players):
  `offensive_role` (12 broad: Stationary Spacer, Advantage Connector, Secondary Creator, Interior
  Finisher/Vertical Threat, Primary Offensive Engine, Screen/Roll Hub, Rim Pressure Driver,
  Late-Clock Bailout Option, Post/Elbow Hub, Movement Shooter, Table-Setting Organizer, Off-Ball
  Gravity Scorer) + `defensive_role` (12 broad: Switch Defender, Secondary Guard Defender, Drop
  Coverage Big, Wing Stopper, Defensive Rebound Finisher, Backline Anchor, Primary Point-of-Attack
  Defender, Roaming Help Defender, Disruption/Event Defender, Screen Navigator, + the two unused
  Switch/Show Big, Low-Man Firefighter). Index's own role_on_team_group is the broken 3-bucket one
  — ignore (use _role_on_team_canonical for team role). Saved index → /home/claude/gb/index_courtroles.json.
  CONSEQUENCE: the 429 already in `_v2_profiles` ALSO have the wrong (fine) offensive court role →
  must RE-SOURCE all court roles for the 435 indexed players from the index's broad off/def.
  All-6-batch cells reconfirmed: COV/PVA/SGV/MIV/SAV → team_role×off_role; DSV/DPC → team_role×def_role;
  RPV → team_role×def_role×position; IIB → team_role×(off+def); PTV pass-through.
  Team role = `_role_on_team_canonical` (already consolidates batches 1-4 + §11d FC rulings + RS/DEV).
  `Adjusting Role On Team.md` = 2025-26 criteria reference (FC stricter standard), NOT a direct
  per-season input (that season isn't in the model).

- **2026-06-26 (court role is PER SEASON — resolves the §8 open item)** — Court roles (off + def)
  are graded per player-season, NOT fixed per player. This supersedes the §3 "job treated as stable
  per player" line and closes the §8 open item ("decide whether off/def court role is fixed across
  seasons") = NO, it varies by season. The fill set must be one row per (player, season) with THAT
  season's possessions, blank off/def to assign per season. Same per-season granularity as team role.
  Rebuilt court_roles_to_fill.csv accordingly (1,230 player-seasons for the 562 unindexed players).
  Open Q for the 435 indexed players: index is one-row-per-player — confirm whether to apply each
  player's index off/def role across all their seasons, or also re-grade those per season.

- **2026-06-26 (court-role hand-fill COMPLETE — all 19 batches normalized)** — Jack hand-filled
  off+def court roles per (player, season) for the entire 562-player non-index set using his own
  finer descriptive vocabulary; the assistant normalized each to the broad §4 12+12 canonical and
  STORED BOTH (raw + normalized) so the descriptive record survives for a later complexity pass.
  Engine: `/home/claude/gb/normalize_courtroles.py` (OFF_MAP + DEF_MAP crosswalk, asserts every
  mapping ∈ canonical, flags UNMAPPED). Master: `/home/claude/gb/courtroles_filled.csv`
  (also /mnt/user-data/outputs/) — cols nba_id, player, bbref, season, possessions, raw_off, raw_def,
  off_role, def_role, batch. **FINAL: 1,230 player-seasons / 562 players, 0 unmapped**, 5-season span
  2020-21→2024-25 (Batch 7's 50 rows carry blank possessions — Jack confirmed not needed).
  Preserved 167 distinct raw off labels + 21 raw def. Canonical usage: OFF used 10/12 (top Advantage
  Connector 283, Interior Finisher 239, Stationary Spacer 230; unused Off-Ball Gravity Scorer +
  Late-Clock Bailout Option — star buckets). DEF used 7/12 (top Switch Defender 465, Secondary Guard
  Defender 240, Drop Coverage Big 213; unused Screen Navigator, Backline Anchor, Low-Man Firefighter,
  Defensive Rebound Finisher, Disruption/Event Defender — specialist/anchor types, expected to surface
  once the 435-index broad roles fold in). Key normalization conventions logged in the script comments:
  Initiator family = fuzziest zone (pass-first→Table-Setting Organizer, scoring→Secondary Creator);
  "* Team Defender"→Switch Defender (Guard Team Defender→Secondary Guard Defender); "Defensive
  Guard/Wing"→Advantage Connector; slashing→Rim Pressure Driver; screen-and-finish/rim-running/
  rebounding bigs→Interior Finisher; Post * Big→Post/Elbow Hub; Pick-and-Pop→Screen/Roll Hub;
  Lead Guard Creator→Primary Offensive Engine (Wall yes, Kemba'20-21 flagged).
  NEXT (in progress): THE FOLD — combine this fill with the 435 index players (index xlsx is
  name-only, no nba_id → resolve names→nba_id via players table; index is one-row-per-player → apply
  its broad off/def across each of that player's seasons) into the COMPLETE per-(player,season)
  court-role table, aligned to `_role_on_team_canonical` (nba_id+season). Precedence: fill row for
  (nba_id, season) wins; else index role; else blank→cascade fallback. Then re-key team role and feed
  the §12 cascade.

- **2026-06-26 (THE FOLD COMPLETE — complete per-(player,season) court-role table built)** — Combined the
  1,230-row fill (562 players) with the 435 index players into the COMPLETE court-role table, canon-driven
  off `_role_on_team_canonical` (2,802 model player-seasons / 966 players). Script:
  `/home/claude/gb/fold_courtroles.py`; output `/home/claude/gb/courtroles_complete.csv` (also
  /mnt/user-data/outputs/) — cols nba_id, season, name, bbref, off_role, def_role, source[fill/index/unfilled].
  RESOLUTION DETAILS: index xlsx is name-only AND has cp1252/latin-1 double-encoded **mojibake** in accented
  names → repaired byte-by-byte (`fixmoji`: per-char cp1252→latin-1 encode, decode utf-8) then matched to
  canonical's authoritative `player_name` via accent-stripped norm(); 3 nickname aliases (Cam→Cameron Johnson,
  Herb→Herbert Jones, Ron→Ronald Holland). Index resolved 410/435 → nba_id; the **24 unmatched are ALL genuine
  non-model players** (2025 draft/future: Cooper Flagg, Ace Bailey, VJ Edgecombe, Salaün, Matković, Jakučionis,
  Hugo González, Nolan Traoré, etc.) verified absent from canonical — 0 actual misses. fill∩index id overlap=0
  (disjoint, correct). SEASON CONVENTION validated: canonical season_year = END-YEAR int; fill "YYYY-YY"→int
  YYYY+1; 99.1% (1219/1230) of fill rows land on a real canonical (id,season).
  PRECEDENCE applied: fill (nba_id,season) wins → else index broad role (applied to each of that player's
  seasons) → else blank/unfilled (rides §12 cascade fallback).
  COVERAGE: **1,219 fill + 1,575 index + 8 unfilled = 2,802**.
  RESIDUALS for Jack's call (non-blocking): (a) 8 UNFILLED model player-seasons = 6 players in NEITHER fill nor
  index → ride cascade fallback: Jeenathan Williams (2022-23,2023-24,2024-25), Alondes Williams (2024-25),
  Ashton Hagans (2020-21), Terry Taylor (2024-25), Trevor Keels (2022-23), Tristan Thompson (2022-23).
  (b) 11 FILL ORPHANS = filled but no team-role row in canonical (excluded from the canon-driven table):
  Armel Traore, Cui Cui, Didi Louzada (×2), Elijah Harkless, Nate Williams (×3), Ruben Nembhard Jr.,
  Sam Dekker, Sasha Vezenkov.
  NEXT (awaiting go-ahead): re-key team role from `_role_on_team_canonical` and build the §12 telescoping
  pooling cascade per component (cells per §4: COV/PVA/SGV/MIV/SAV→team×off; DSV/DPC→team×def;
  RPV→team×def×pos; IIB→team×(off+def); PTV pass-through). Replaces obsolete flat `_v2_prior_*` +
  `_v2_component_shrinkage`.

- **2026-06-26 (§12 CASCADE BUILT — replaces flat _v2_prior_* + _v2_component_shrinkage)** — Built the
  telescoping pooling cascade per component from live v1.1.0 values in `_v2_obs_long` (28,060 = 10×2,806),
  team role re-keyed from `_role_on_team_canonical`, court roles from `courtroles_complete.csv` (NOT obs_long's
  stale effective_role / fine off_profile). Script `/home/claude/gb/build_cascade.py`; output
  `/home/claude/gb/v2_priors_cascade.csv` (+/mnt/user-data/outputs/) cols: nba_id, season, component, obs,
  prior_mean, SE, w, posterior, evidence_state, n_eff, cell. DB stays FROZEN — output is a FILE.
  CELLS (§4): COV/PVA/SGV/MIV/SAV=team×off; DSV/DPC=team×def; RPV=team×def×pos; IIB=team×(off+def); PTV pass-through(w=1).
  LEVELS L5 global→L4 court→L3 tier×court (tier: S{FC,HM,RS,TS} B{6M,CR,SS,EN,DEV} N{GT,DNP,INA})→L2 cross-season
  cell→L1 per-season cell. est=λ·loo_mean+(1−λ)·parent, λ=n/(n+k_level), k_level=σ²w/σ²b via one-way Henderson-III
  MoM across all cells at that level. PLAYER-LEVEL LOO on anchors (all his seasons removed from cell sums).
  priorSD²=L2 between-cell variance (Henderson-III σ²b), floored 0.075·globalSD (floor never binds).
  §5 weight w=priorSD²/(priorSD²+SE²); SE=σ_resid·√(med_poss/n_eff), σ_resid²=tvar·(1−r), n_eff=esf·poss,
  med_poss=3592; evidence_state from cap (0.68 scaffolded ×2.0 SE, 0.86 signal_proxy ×1.4, 1.0/null modeled ×1.0).
  null obs → posterior=prior (w=0). 2,049 null vals + 170 no-team-role rows fall to court→global, handled.
  §12f CALIBRATION (w_ref at esf=1/modeled/med_poss vs r):  SGV .862/.903  PVA .747/.842  DSV .663/.807
  COV .605/.765  RPV .691/.688  IIB .436/.576  SAV .457/.536  DPC .234/.501  MIV .181/.305. Ordering preserved;
  undershoot = expected gap between cell-signal (between) and total signal (r·tvar) — cells capture 47–100% of
  signal (RPV ~all; DPC/MIV least, k_L2≈5.6 → §12d weak-level diagnostic firing where reliability is lowest).
  STATUS: prior structure rebuilt end-to-end on v2 cells. Open for Jack: confirm evidence_state SE multipliers
  (2.0/1.4/1.0 proposed) and whether DPC/MIV's weak L2 should collapse to L3/L4; optional REML cross-check on
  COV/SGV per §12d; then write to staging `v2.0.0-archetype` when he lifts the freeze.

- **2026-06-26 (evidence_state multipliers locked; REML cross-check COV/SGV — §12d)** — Evidence_state SE
  multipliers CONFIRMED and shipped in `v2_priors_cascade.csv`: scaffolded_missing ×2.0, signal_proxy ×1.4,
  modeled ×1.0 (sourced from cap 0.68/0.86/1.0|null). DPC/MIV kept at FULL cascade (no L2 collapse, per Jack).
  REML cross-check (statsmodels MixedLM, REML) vs Henderson-III MoM at L2 (cross-season cell) and L3 (tier×court):
    SGV L2: MoM between 0.349 / REML 0.465 (ratio 1.33); within 0.2382/0.2381 (identical).
    SGV L3: MoM 0.331 / REML 0.423 (1.28).
    COV L2: MoM between 2.786 / REML 3.707; within 5.040/5.046 (identical).
    COV L3: MoM 2.438 / REML 3.71-range.
  NOTE: default lbfgs gave a SPURIOUS REML between=0 for COV (optimizer hit boundary, non-PD Hessian — COV's heavy
  tails/scale). Re-run on standardized scale with nm/powell/cg/bfgs → all four converge, between=3.71, agree.
  Direct check confirms real large spread (COV cell-mean range −5.14→+7.97; FC|Primary Engine 4.58 vs GT ~−0.2).
  VERDICT (§12d): MoM and REML AGREE — within identical, between same sign/order, consistent ~1.3× offset →
  SHIP MoM as built (priors file unchanged). FINDING: the consistent 1.3× means MoM between is mildly
  conservative; using REML between instead would raise w_ref to ~.893 SGV / ~.671 COV (vs r .903/.765), closing
  most of the §12f undershoot → the undershoot is largely MoM conservatism, not cell-structure incompleteness.
  Switching priorSD² to REML is available if Jack wants tighter w≈r calibration; left as MoM pending his call.

- **2026-06-26 (DPC/MIV integrity — REML+MoM diagnosis → priorSD²=r·tvar for the two low-ICC components)** —
  Ran REML vs Henderson-III MoM on DPC and MIV at L2/L3 to test whether their §12f undershoot was MoM bias or
  real. RESULT — different causes, same fix:
    • MIV (r=.305, lowest ICC): MoM between 0.112 / REML 0.326 L2 (×2.9), 0.911 L3 (×9.75 unstable). Classic
      Henderson-III DOWNWARD bias at low ICC + imbalance (between=(MSB−MSW)/n0 = small diff of large numbers);
      REML recovers signal but OVER-shoots the reliability ceiling (REML 0.326 > r·tvar 0.222) and L3 blows up.
    • DPC (r=.501): MoM 0.064 / REML 0.081 (×1.28 — the same benign offset as healthy comps). NOT an estimator
      failure. Structural test: enriching the cell to team×def×position (RPV-style) lifts between only to
      0.111 (REML) — still far below ceiling r·tvar 0.209. DPC signal is genuinely WITHIN-cell (player-specific),
      no reasonable cell grouping captures it.
  FIX (applied): for MIV and DPC set **priorSD² = r·tvar** (the §12f-calibration-consistent value; locked r is
  the verified signal-share truth, MoM/REML only estimate the cell-captured fraction). MIV priorSD² 0.112→0.2219,
  DPC 0.064→0.2088 → w_ref = r exactly (MIV .305, DPC .501). Real-player median w: MIV 0.073→0.136, DPC
  0.099→0.264 — no longer over-shrunk by MoM's deflated between. High-ICC comps KEEP MoM between (COV/SGV verdict).
  Rebuilt `v2_priors_cascade.csv` (only MIV/DPC rows change). build_cascade.py carries the override + rationale.
  Optional future: DPC may warrant a position-enriched cell in §4 if its within-cell signal is later deemed
  partly positional; deferred (rewiring §4 routing is Jack's call).
