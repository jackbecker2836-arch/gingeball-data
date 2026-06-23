# PHASE 12 — GINGEBALL LIVE COURT SIMULATION (Pressure Lab sandbox)

> Status: DESIGN CHECKPOINT. No engine code written yet. This doc is the
> reference blueprint to build from. If anything here drifts from the vision,
> this file is wrong and should be corrected before building.

---

## 1. THE PINNED VISION (do not let this drift)

A **live, evolving NBA game simulation** where the Court Handicap recomputes
continuously as the game plays out. The Pressure Lab becomes this sandbox.

- **Possession is the fundamental unit.** Mapped onto a 48-minute / 4×12-minute
  game clock for display (each possession advances the clock a realistic
  ~14–24s; "Q2 7:43" shows naturally). Possessions drive the math; the clock is
  the readout.
- **Two lineups**, real-roster-prefilled from existing TCV/HOC player data.
  Every engine variable is editable (the "library of editable variables"):
  the 17 stats, the court factors, possession stats, total/spread.
- **Per-player verdicts AND a lineup roll-up**, both live.
- **The court derives from the evolving game state** (Gap C). Build toward this:
  the handicap should emerge from play, not only be set by hand.
- **Modes are user-selectable settings BEFORE running** (not hardcoded):
  - *Possession engine mode:* rate-based / random-weighted / scripted.
    Core must support all three from the start.
  - *Progression mode:* manual-step (A) vs. autoplay (B).
    **Build focus: B.** B = A's "advance one possession" called on a timer, so
    building the step engine gives both for free.
- **Stretch goal after this build: Mode C** — edit any variable at any time,
  instant live re-grade. Falls out naturally once the live loop exists.
- **Output:** CourtGraph on top, stat readout below, recomputing live.
- **Sim output stays clean** — limitation flags live in the audit cockpit, NOT
  cluttering the sim view.
- **No realism guards in the possession engine** — let any inputs through and
  observe what happens; the sim is a gap-finding tool. Decide later if guards
  are needed.
- Lives at a **new page** (e.g. `/court-handicap/sandbox` or `/pressure-lab`);
  the existing internal audit cockpit at `/internal/pressure-lab` stays as-is.
- Build slots as a **reusable per-player component**: a 1v1 tester page (1 slot
  per side) proves the loop; the 5v5 page reuses the same slot ×5, so 5v5
  infrastructure is essentially free once the slot works.

---

## 2. KNOWN LIMITATIONS OF COURT HANDICAP (from the engine's own registry)

These are real and acknowledged. The sim does not hide them; it is a tool to
find where they bite.

**Registry-documented (lib/limitation-registry.ts):**
- `synthetic_court_factor` / `geometry_derived_not_native` — court multipliers
  are plausible but uncalibrated; not fit to real data.
- Pending engines: `pending_spacing_gravity_engine`,
  `pending_screen_assist_engine`, `pending_secondary_assist_engine`,
  `pending_opponent_suppression_engine` — whole value categories are
  placeholders, flagged not proven.
- `deterrence_synthetic_v1` / `spacing_gravity_synthetic_v1` — the two engines
  that DO exist are real structure on synthetic inputs with uncalibrated curves.
- `shadow_composite_not_applied` / `composite_shadow_only` — the composite
  verdict takes no live authority by design.
- `non_scoring_proxy_low_confidence` — proxy-driven verdicts are low-confidence.

**Deeper gaps the registry does NOT name (surfaced in design discussion):**
- **Gap A — snapshot, not sequence:** the engine grades a final stat line; it
  has no model of how stats realistically accumulate over possessions. Decision:
  NO guards; let it through and observe.
- **Gap B — NO opponent interaction (BIGGEST GAP):** each archetype is graded
  against an abstract "court dial," not against the other lineup. A real game is
  zero-sum — the same possession is one side's offense and the other's defense.
  Current 5v5 is really two solo grades in parallel, not a game.
  **→ TOP ROADMAP ITEM: upgrade Court Handicap for opponent interaction AFTER
  this build. Pairs with Gap C (interaction is what should generate the court).**
- **Gap C — court is an input, not an output of play:** decided we build toward
  the court being DERIVED from evolving game state.
- **Gap D — no calibration anchor:** nothing ties output to real-world results.
  This is why the whole system is honestly stamped synthetic.

---

## 3. DATA MODEL (the build blueprint)

### Core types (to live in something like `lib/sim/game-sim.ts`)

```
GameClock        = { quarter: 1..4 (+OT), secondsRemaining: number }
PossessionMode   = "rate" | "random" | "scripted"
ProgressionMode  = "manual" | "autoplay"

PlayerSlot = {
  id: string
  name?: string                 // prefilled from TCV/HOC roster, optional
  archetype: string             // one of the 10 archetypes
  // per-possession behavior inputs (drive how stats accrue):
  rates: Partial<Record<StatId, number>>   // used by "rate" mode
  // ...random/scripted inputs slot in alongside, mode picks which is used
  accumulated: Partial<Record<StatId, number>>  // running totals so far
}

LineupState = { side: "X" | "Y"; slots: PlayerSlot[] }   // 1 slot (tester) or 5

GameState = {
  clock: GameClock
  possessionCount: number
  score: { X: number; Y: number }
  X: LineupState
  Y: LineupState
  court: CourtContext            // DERIVED from state (Gap C), not hand-set
}

SimSettings = {
  possessionMode: PossessionMode
  progressionMode: ProgressionMode
  totalPossessions?: number      // or run until clock expires
}
```

### Core operations (the keystone — build + TEST these first, no UI)

```
initGameState(X, Y, settings) -> GameState
    // sets clock to Q1 12:00, zeroes accumulators

advancePossession(state, settings) -> GameState
    // THE HEART. Advances one possession:
    //   - mode decides what happened (rate: add rates; random: roll weighted
    //     by archetype/stats; scripted: next event in feed)
    //   - update each player's `accumulated`
    //   - advance clock by a realistic possession length; flip possession side
    //   - update score
    //   - recompute court via deriveCourt(state)   <-- Gap C
    // B (autoplay) = call this on a timer; A (manual) = call on a click.

deriveCourt(state) -> CourtContext
    // Gap C. Compute spacingScarcity/poaPressure/rimProtectionFaced/synergy/total
    // from the current evolving game state instead of hand-set sliders.
    // v1 may be a simple mapping; honest + improvable.

gradeState(state) -> {
  perPlayer: { slotId, verdict: CompositeVerdict }[]   // both lineups
  rollup:    { X: <aggregate>, Y: <aggregate> }
}
    // reuses existing buildCompositeVerdict(archetype, court, actuals, scoringBeat)
    // with actuals = each slot's `accumulated` so far, court = state.court
```

### Existing engine pieces this reuses (already built, verified)
- `buildCompositeVerdict(archetype, ctx: CourtContext, actuals, scoringBeat)`
  — lib/stat-par/composite-verdict.ts
- `computeStatParVector(archetype, { actuals, categoryFactors })`
  — lib/stat-par/stat-par.ts
- `CourtContext` fields: label, total, spacingScarcity (0–1), poaPressure (0–1),
  rimProtectionFaced (0–1), synergy (0–1), + optional confidence/provenance/sourceState
- 10 archetypes: rim_protector, connector, spot_up_wing, scoring_guard,
  high_usage_star, low_usage_specialist, roll_big, screen_assist_big,
  secondary_creator, defensive_stopper
- 17 StatIds: points, fg3m, rim_attempts, fta, assists, secondary_assists,
  turnovers, oreb, dreb, blocks, steals, fouls, screen_assists,
  deterrence_events, rim_contests, spacing_gravity, rim_gravity

---

## 4. BUILD ORDER (verifiable steps — each a real checkpoint)

1. **Possession step engine core + test** (NO UI). Build GameState,
   advancePossession (all 3 modes), deriveCourt v1, gradeState. Test: run ~100
   possessions, print the court/handicap + a player's verdict evolving as stats
   accumulate. PROVE the loop before any pixels. ✅ **DONE — see §7 build log.**
   `lib/sim/game-sim.ts`. 35 self-checks + a demo pass:
   `tsx --tsconfig tsconfig.check.json lib/sim/game-sim.ts`.
2. **Reusable PlayerSlot component** — archetype picker + editable stats/rates.
   ✅ **DONE — see §7 build log.** `components/court-handicap/sim/PlayerSlot.tsx`
   (+ pure `player-slot-model.ts`). Controlled component; logic proven by
   `tsx --tsconfig tsconfig.check.json components/court-handicap/sim/player-slot-model.ts`
   (36 checks). ← NEXT: Step 3.
3. **1v1 tester page** — one slot per side + settings (modes) + play/pause +
   CourtGraph on top + stat readout below. First usable sandbox.
   ✅ **DONE — see §7 build log.** Route `app/court-handicap/sandbox/page.tsx`
   → `components/court-handicap/sim/SimSandbox.tsx` (live loop) +
   `LiveCourtPanel.tsx` (the court on top). View it with `npm run dev` →
   `/court-handicap/sandbox`. ← NEXT: Step 4.
4. **5v5 page** — reuse the slot ×5 per side. Mostly free. (SimSandbox already
   renders any-size lineups — verified rendering 10 slots — so Step 4 is a new
   route that hands it five-slot lineups.) ✅ **DONE — see §7 build log.** Route
   `app/court-handicap/sandbox/5v5/page.tsx` → `/court-handicap/sandbox/5v5`.
   ← NEXT: Step 5.
5. **Real-roster prefill** — needs the app's player data shape
   (`app/api/players/[slug]/route.ts`, `lib/leaderboard-adapter.ts`). Map roster
   fields → archetype + starting stats. ✅ **DONE — see §7 build log.**
   `components/court-handicap/sim/roster-archetype-map.ts` (classifier + box→per-100
   rates + leaderboard adapter) + route `app/court-handicap/sandbox/roster/page.tsx`
   → `/court-handicap/sandbox/roster`. **← BUILD COMPLETE (Steps 1–5).**

> ✅ **THE 5-STEP BUILD IS COMPLETE.** Next up is the post-build work queued in
> §6 (court-tuning knobs) and the roadmap in §2 (Gap B opponent interaction,
> Gap C/D calibration), plus the follow-ups logged under §7 Step 5.

> This is a MULTI-SESSION feature. Each step is a working checkpoint. Re-read
> this doc at the start of each session so the vision does not drift.

---

## 5. DEPENDENCIES NEEDED FROM THE APP (not in the Court Handicap package)
- Player data shape for prefill: `app/api/players/[slug]/route.ts`,
  `lib/leaderboard-adapter.ts` (or whatever returns TCV/HOC players).
- Confirm whether team data exists (player data is confirmed; teams uncertain).

## 6. OPEN ITEMS / SIDE NOTES
- **Deferred tuning pass (AFTER the build is complete):** expose the court's
  tuning knobs as editable settings rather than engine constants — the neutral
  `PRIOR_TOTAL` (220) that anchors the early-game total, the prior→observed blend
  weight, and a pace control note (possession-seconds already drives late-game
  total). Part of the broader "library of editable variables" vision; intentionally
  held until the 5-step build lands so we tune against a finished surface.
- Pressure Lab gate: staying ON for now (11L intact). Public-sandbox conversion
  (ungate + reframe INTERNAL stamps) deferred; decide URL (`/pressure-lab` vs
  keep `/internal/`) at that time.
- Still pending from earlier: roll the Supabase service key if not yet done.
- Site design pass (match glossary/hypotheses/leaderboard + newsletter archive
  HTML to the homepage design) is a separate queued task.

---

## 7. BUILD LOG (per-session checkpoints — newest first)

> Append a short note each session so the next one can resume without re-reading
> code. Each step is a working, verified checkpoint.

### Step 5 — Real-roster prefill ✅  (BUILD COMPLETE)
- **Files:** `components/court-handicap/sim/roster-archetype-map.ts` (the prefill
  brain, pure) + route `app/court-handicap/sandbox/roster/page.tsx` →
  `/court-handicap/sandbox/roster`.
- **Mapping core (pure, tested):** two honest entry points for the app's two real
  data shapes —
  - BOX-SCORE (HOC `PLAYERS_RAW`: ppg/rpg/ast/stl/blk + pos): `classifyBox` →
    archetype, `ratesFromBox` → REAL per-100 rates (per-possession =
    perGame·48/mpg/100; rebounds split 25/75 off/def), layered over archetype
    defaults for the stats the box lacks. `slotFromBox`/`lineupFromBox` +
    `parseHocPlayersRaw`/`pickBoxPlayers` helpers.
  - LEADERBOARD (`v_leaderboard`: position + TCV components, no box counts):
    `classifyLeaderboard` → archetype; rates stay archetype-typical.
    `slotFromLeaderboard`/`lineupFromLeaderboard`.
- **Classifier:** coarse, transparent, position-aware heuristic (NOT a learned
  model — honest). Tuned + verified against REAL players.js so familiar profiles
  land right: Gobert/Lopez → rim_protector, Jokić/Draymond → screen_assist_big,
  Curry/Edwards → high_usage_star, LeBron → high_usage_star, Jrue → secondary_creator.
- **The route** pulls top players from Supabase `v_leaderboard` (the same source
  the public leaderboard uses), splits them into two balanced lineups, maps via
  `slotFromLeaderboard`, and mounts `SimSandbox`. Resilient: if DB/env is
  unreachable it falls back to a default archetype 5v5 and says so in the title.
- **Verified:** roster-map self-checks 30/0; an end-to-end run against the REAL
  players.js (real box → slots → full game → grades) confirmed sensible
  archetypes + real per-100 scoring (Curry 41.3, Gobert 16.7) and a completed
  game; strict `tsc` clean across the route (incl. the live `@supabase` import) +
  all sim files; render smoke 6/0 (page fallback path + leaderboard-mapped real-name
  lineup). All temp tests removed.
- **Honest gap:** the live route uses archetype-typical rates (the leaderboard has
  no box counts). **Follow-ups (noted, not done):** (1) join box stats onto the
  leaderboard player by name/season so the live route gets REAL rates via
  `lineupFromBox`; (2) an interactive player-picker (search `/api/leaderboard`,
  assign players to slots) for a fully usable roster builder.

### Step 4 — 5v5 page ✅
- **File:** route `app/court-handicap/sandbox/5v5/page.tsx` → `/court-handicap/sandbox/5v5`.
  One new file, no component changes — `SimSandbox` already owns the loop and
  renders any-size lineups (slots auto-collapse past one per side), so this just
  hands it two five-man lineups (a scoring-leaning X vs a defense-leaning Y;
  every slot still re-pickable in-page).
- **Verified:** strict `tsc` clean; render test of the actual page module = 7/0
  (all ten slots X1–X5 / Y1–Y5, the live court panel, both rollup cards, distinct
  archetypes). The 1v1 route stays at `/court-handicap/sandbox`.
- **NEXT: Step 5** — real-roster prefill. Needs the app's player-data shape
  (`app/api/players/[slug]/route.ts`, `lib/leaderboard-adapter.ts` — not in the
  court-handicap subset). Map each roster player → an archetype + starting rates,
  then build the lineups from real players instead of hardcoded archetypes.

### Step 3 — 1v1 tester page (first usable sandbox) ✅
- **Files:** route `app/court-handicap/sandbox/page.tsx` (thin server component,
  builds the opening 1v1 lineups via `makeSlot`) → `SimSandbox.tsx` (the client
  world that owns the live loop) + `LiveCourtPanel.tsx` (the court on top).
- **The loop:** `SimSandbox` holds one `GameState`. Autoplay (mode B) = a
  `setTimeout` calling `advancePossession` each tick (speed presets slow→blitz);
  step (mode A) = the same call on a click; reset re-inits from the current slot
  definitions. Every render re-grades via `gradeState`, so editing any slot
  variable re-grades live — the Mode-C feel falls out for free.
- **Court-on-top decision (important):** the blueprint says "CourtGraph on top,"
  but the signature `CourtGraph` is built from the odds/manifest pipeline
  (`CourtGraphView`: burn-implied score, synergies, proof trail, par-beat) — data
  the live sim does NOT produce. Feeding it from sim state would mean *inventing*
  those fields, which breaks the honesty contract. So the court-on-top is a
  purpose-built `LiveCourtPanel` that renders exactly what `deriveCourt` outputs
  (the 5 factors + projected total + rising confidence). This is the honest Gap-C
  surface. **Follow-up (noted, not done):** if we still want the signature
  genesis CourtGraph wired to live state, that's its own task — either build an
  honest sim→CourtGraphView adapter or generalize CourtGraph to take a plainer
  court input. Not blocking the build.
- **Settings exposed:** possession mode (rate/random/scripted; scripted in-sandbox
  has no feed → empty trips, noted inline), random seed (+ reroll), possession
  seconds, opening offense, autoplay speed. Slots lock (`readOnly`) during
  autoplay, editable when paused/stepping.
- **Verified:** strict `tsc` clean across the route + all three new UI files +
  engine imports. Render smoke test (server-rendered the sandbox) = 15/0 — title,
  controls, all three mode pills, the live court panel + its 4 factors, both
  slots with archetype labels, clock, both rollup cards, and the honest footer
  all present; smoke test removed after passing.
- **5v5 readiness:** `SimSandbox` renders any-size lineups; the smoke test
  rendered a 10-slot (5v5) configuration with slots auto-collapsed. So **Step 4
  is just a new route** that hands `SimSandbox` five-slot lineups per side.
- **NEXT: Step 4** — the 5v5 page at e.g. `app/court-handicap/sandbox/5v5/page.tsx`
  (or a slot-count switch on the same page), reusing `SimSandbox` with five
  `makeSlot`s per side.

### Step 2 — Reusable PlayerSlot component ✅
- **Files:** `components/court-handicap/sim/PlayerSlot.tsx` (the React editor) +
  `components/court-handicap/sim/player-slot-model.ts` (pure logic/labels/update
  helpers, the testable core — mirrors how `ui-labels.ts` isolates honesty logic).
- **What it is:** a CONTROLLED component. It owns no slot state and never grades.
  Parent passes `slot` + `onChange`; every edit returns a new slot via the pure
  immutable helpers. Grading stays in the engine and comes back via an optional
  `grade` prop, so the live loop keeps one source of truth in `lib/sim`.
- **Surface:** editable name; archetype picker (10 archetypes, switching reloads
  that archetype's default rates + clears random dials); all 17 per-possession
  rates grouped by category, each showing the archetype's per-100 baseline, an
  O/D side marker, and an inverse `↓` flag for turnovers/fouls; random-mode dials
  (usage / makeBias / threeBias); optional live verdict readout (composite,
  confidence badge, headline, top drivers) always stamped SHADOW · not applied;
  collapsed compact mode for the 5v5 grid; `editAccumulated` hook for the Mode-C
  stretch.
- **Verified:** `player-slot-model.ts` self-checks = **36 passed, 0 failed**
  (`tsx --tsconfig tsconfig.check.json components/court-handicap/sim/player-slot-model.ts`).
  Strict `tsc` clean across both files + engine imports. End-to-end render smoke
  test (drove the real engine 30 possessions → `gradeState` → server-rendered the
  component) = 14/0; smoke test removed after passing.
- **Host requirement:** like the sibling components, it reads `--f-*` font roles
  and the `C` palette; the page must inject `FONT_VARS` + `COURT_HANDICAP_CSS`
  (as `CourtHandicapWorld` does). Step 3's page wires that.
- **NEXT: Step 3** — the 1v1 tester page that mounts one slot per side, adds the
  settings (mode pickers) + play/pause timer (autoplay = `advancePossession` on
  an interval), with the CourtGraph on top and the stat readout below.

### Step 1 — Possession step engine core ✅
- **File:** `lib/sim/game-sim.ts`. `initGameState` · `advancePossession` (rate /
  random / scripted) · `deriveCourt` v1 (Gap C) · `gradeState`, all pure;
  autoplay is just `advancePossession` on a timer.
- **Verified:** 35 self-checks + a full-game demo
  (`tsx --tsconfig tsconfig.check.json lib/sim/game-sim.ts`); strict `tsc` clean;
  reused engines still 19/20/9, no regressions.
- **Honest gap surfaced:** a par-rate player only reaches ~0.75 of a per-100
  baseline over a ~75-trip game, so the field leans "below court." NOT hacked
  away — it is exactly the snapshot-vs-sequence (Gap A) + no-calibration (Gap D)
  mismatch the sim exists to expose.
