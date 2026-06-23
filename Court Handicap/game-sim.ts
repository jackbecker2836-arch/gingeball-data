// =============================================================================
// GINGEBALL COURT HANDICAP — LIVE COURT SIMULATION ENGINE (Phase 12, Step 1)
//
// THE PINNED VISION (docs/PHASE12_LIVE_COURT_SIMULATION.md):
//   A live, evolving game where the Court Handicap recomputes continuously as
//   the game plays out. Possession is the fundamental unit; the 48-min clock is
//   the readout. The court is DERIVED from the evolving game state (Gap C), not
//   hand-set. Per-player verdicts AND a lineup roll-up, both live.
//
// THIS FILE = the keystone (Build Order Step 1): the possession step engine
// core, with NO UI. It builds + proves the loop before any pixels:
//   initGameState · advancePossession (all 3 modes) · deriveCourt v1 · gradeState
// Autoplay (B) is just advancePossession on a timer; manual (A) is the same call
// on a click — so building the step engine gives both progression modes for free.
//
// HONESTY CONTRACT (carried from the engine it reuses):
//   - NO realism guards in the possession engine. Any inputs pass through; the
//     sim is a gap-finding tool. We observe what happens. (Gap A: snapshot→seq.)
//     The Gap B matchup effect below MODULATES outputs by the opponent — it is a
//     modeled interaction, not a clamp: absurd per-possession inputs still pass
//     through (uncapped to realistic values), just scaled by the defense faced.
//   - Gap B (zero-sum opponent interaction) is now IMPLEMENTED (v1): a possession
//     is one side's offense AND the other's defense. The defending lineup exerts a
//     per-possession defensive pressure (from its own defensive rates) that, taken
//     RELATIVE to a self-calibrating neutral baseline, suppresses a strong-D
//     opponent's scoring and concedes extra to a weak-D one. The swing is bounded
//     (SUPP_MAX) and uncalibrated — reasoned, not fit to real results.
//   - The court here is ONE shared environment derived from combined game state.
//   - deriveCourt v1 is a simple, uncalibrated mapping — honest + improvable.
//     There is no calibration anchor to real results (Gap D); everything stays
//     synthetic and is labeled so.
//   - The composite verdict remains SHADOW (applied:false) by the reused engine.
//
// All functions are PURE: advancePossession returns a new GameState. Random mode
// is seeded (mulberry32) so runs are reproducible and testable.
// =============================================================================

import {
  buildCompositeVerdict,
  type CourtContext,
  type CompositeVerdict,
} from "@/lib/stat-par/composite-verdict";
import {
  getStatProfile,
  STAT_CATEGORY,
  type StatId,
  type StatCategory,
} from "@/lib/stat-par/stat-par";
import { narratePlay, possessionSeconds, profileFor, type Play, type StartType } from "./sim-play-feed";
import { applySubstitutions, resetSubsTracker, type TeamRoster } from "./sim-subs";
import { getPlayerRates } from "./sim-player-rates";
import { usageMult, foulDrawMult, defenderSuppress, playmakeMult } from "./profile-behavior";
import { getTeamData } from "./sim-team-data";

// ---------------------------------------------------------------------------
// 0. CONSTANTS
// ---------------------------------------------------------------------------
export const QUARTER_SECONDS = 720; // 12:00
export const OT_SECONDS = 300; // 5:00
export const REGULATION_SECONDS = QUARTER_SECONDS * 4; // 2880
export const DEFAULT_POSSESSION_SECONDS = 17; // ~NBA-typical trip; tuned so a 5-man, 48-min game lands near real team totals (~113/team)
export const MIN_POSSESSION_SECONDS = 14;
export const MAX_POSSESSION_SECONDS = 24;
export const LEAGUE_AVG_SEC_OFF = 14.62; // mean team secPerPossOff (2024-25) — pace normalizer
const PRIOR_TOTAL = 220; // neutral game-total prior used before the game has signal

// The two SIDES are abstract lineups, not home/away. "X" gets the opening tip.
export type Side = "X" | "Y";
const OTHER: Record<Side, Side> = { X: "Y", Y: "X" };

// Which side accrues a given stat: offensive stats land on the possessing side,
// defensive stats on the side guarding the possession. (oreb is offensive; dreb,
// blocks, steals, fouls, rim_contests, deterrence are defensive.)
export type StatSide = "offense" | "defense";
export const STAT_SIDE: Record<StatId, StatSide> = {
  points: "offense", fg3m: "offense", rim_attempts: "offense", fta: "offense",
  assists: "offense", secondary_assists: "offense", turnovers: "offense",
  oreb: "offense", screen_assists: "offense", spacing_gravity: "offense", rim_gravity: "offense",
  dreb: "defense", blocks: "defense", steals: "defense", fouls: "defense",
  deterrence_events: "defense", rim_contests: "defense",
};

const ALL_STATS = Object.keys(STAT_SIDE) as StatId[];
export const SIM_ARCHETYPES = [
  "rim_protector", "connector", "spot_up_wing", "scoring_guard", "high_usage_star",
  "low_usage_specialist", "roll_big", "screen_assist_big", "secondary_creator", "defensive_stopper",
] as const;

// ---------------------------------------------------------------------------
// 1. CORE TYPES (the build blueprint, §3)
// ---------------------------------------------------------------------------
export interface GameClock {
  quarter: number; // 1..4, then 5+ = OT periods
  secondsRemaining: number; // within the current quarter/OT period
}

export type PossessionMode = "rate" | "random" | "scripted";
export type ProgressionMode = "manual" | "autoplay";

export interface PlayerSlot {
  id: string;
  name?: string; // prefilled from TCV/HOC roster later (Step 5); optional now
  archetype: string; // one of SIM_ARCHETYPES
  // Per-possession behavior inputs. In "rate" mode these are the expected count
  // of each stat PER RELEVANT POSSESSION (offensive stats accrue on the slot's
  // offensive trips, defensive stats on its defensive trips). Defaults derive
  // from the archetype's per-100 baselines (baseline/100) so a full ~100-trip
  // game lands a slot near its par — making the verdict's arc legible.
  rates: Partial<Record<StatId, number>>;
  // Optional per-slot tuning for "random" mode (all 0..1, sensible defaults used
  // when omitted). makeBias shifts shot-making up/down; usage weights how often
  // this slot is the offensive actor.
  random?: { usage?: number; makeBias?: number; threeBias?: number };
  // Real archetype identity from the Archetype Family Scorer (when the player is
  // in the index). `archetype` above stays a sim archetype for rate defaults;
  // these carry the true classification for display + family-aware behavior.
  profile?: string; // one of the 45 scoring profiles
  family?: string; // one of the 8 families
  archetypeLabel?: string; // scouting label, e.g. "Dunker-Spot Mismatch Glue"
  scoreVector?: Record<string, number>; // family_score_vector (per-family strength)
  statusCap?: number; // coverage cap (how much to trust the vector)
  accumulated: Partial<Record<StatId, number>>; // running totals so far
  stamina?: number; // 0..1 fatigue (set by the rotation engine; 1/undefined = fresh)
}

export interface LineupState {
  side: Side;
  slots: PlayerSlot[]; // 1 (tester) or 5 (full)
  team?: string; // NBA abbr; drives pace/oreb/defense via getTeamData (optional)
  roster?: TeamRoster; // 10-man bench; when present the engine runs substitutions
}

export interface ScriptedPossession {
  offense?: Side; // who has the ball this trip (defaults to current offense)
  lengthSec?: number; // clock burned (defaults to DEFAULT_POSSESSION_SECONDS)
  orebContinuation?: boolean; // keep the same offense next trip
  // explicit per-slot stat deltas, keyed by slot id
  deltas: Record<string, Partial<Record<StatId, number>>>;
}

export interface SimSettings {
  possessionMode: PossessionMode;
  progressionMode: ProgressionMode;
  totalPossessions?: number; // cap; otherwise run until the clock expires
  seed?: number; // random-mode seed (reproducibility)
  script?: ScriptedPossession[]; // scripted-mode feed (consumed by possessionCount)
  possessionSeconds?: number; // fixed clock burn for rate/scripted (default 19)
  openingOffense?: Side; // who gets the opening possession (default "X")
}

// What happened on the trip just played — kept on the state for the readout.
export interface SimPossessionOutcome {
  seq: number; // 1-based possession index
  offense: Side;
  pointsScored: number;
  lengthSec: number;
  orebContinuation: boolean;
  perSlotDeltas: Record<string, Partial<Record<StatId, number>>>;
  note: string; // human-readable summary
  play?: Play | null; // structured play-by-play (random/live mode)
  clock: GameClock; // game clock AFTER this possession (play-by-play time-left)
}

export interface GameState {
  clock: GameClock;
  possessionCount: number;
  score: Record<Side, number>;
  X: LineupState;
  Y: LineupState;
  court: CourtContext; // DERIVED from state (Gap C), never hand-set here
  // ---- runtime fields beyond the blueprint sketch (needed for a pure engine) ----
  offense: Side; // who currently has the ball
  offPossessions: Record<Side, number>; // offensive trips each side has had
  rng: number; // mulberry32 state (random mode reproducibility)
  gameOver: boolean;
  lastPossession: SimPossessionOutcome | null;
  log: SimPossessionOutcome[]; // full play-by-play history (for the live feed)
  prevStart: StartType; // how the upcoming possession starts -> drives length
  teamFouls: Record<Side, number>; // fouls each side committed this quarter (bonus)
  rosters?: Record<Side, TeamRoster>; // 10-man benches (optional; enables subs)
  subs?: { side: Side; out: string; in: string; reason: string }[]; // substitution log
}

// ---------------------------------------------------------------------------
// 2. SMALL UTILITIES
// ---------------------------------------------------------------------------
function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }
function round(x: number, dp = 1): number { const f = 10 ** dp; return Math.round(x * f) / f; }
function emptyAccum(): Partial<Record<StatId, number>> { return {}; }

/** mulberry32 — tiny deterministic PRNG. Returns [nextState, value in [0,1)). */
function mulberry32(a: number): [number, number] {
  let t = (a + 0x6d2b79f5) | 0;
  let r = t;
  r = Math.imul(r ^ (r >>> 15), r | 1);
  r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
  const value = ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  return [t, value];
}

/** Per-100 baseline → per-possession default rate, split by stat side. */
export function defaultRatesForArchetype(archetype: string): Partial<Record<StatId, number>> {
  const profile = getStatProfile(archetype);
  if (!profile) throw new Error(`game-sim: unknown archetype "${archetype}"`);
  const rates: Partial<Record<StatId, number>> = {};
  for (const e of profile.entries) {
    // baseline is "per-100-ish": dividing by 100 makes a per-possession increment
    // that converges toward the baseline after ~100 relevant trips.
    rates[e.stat] = round(e.baseline / 100, 4);
  }
  // give every archetype a small points rate so scoring/score always moves
  if (rates.points == null) rates.points = round(8 / 100, 4);
  return rates;
}

export function formatClock(clock: GameClock): string {
  const q = clock.quarter <= 4 ? `Q${clock.quarter}` : `OT${clock.quarter - 4}`;
  const s = Math.max(0, clock.secondsRemaining);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${q} ${mm}:${ss.toString().padStart(2, "0")}`;
}

/** Seconds of game elapsed (regulation + any OT), for pace projection. */
export function elapsedSeconds(clock: GameClock): number {
  if (clock.quarter <= 4) {
    return (clock.quarter - 1) * QUARTER_SECONDS + (QUARTER_SECONDS - clock.secondsRemaining);
  }
  const otIndex = clock.quarter - 5;
  return REGULATION_SECONDS + otIndex * OT_SECONDS + (OT_SECONDS - clock.secondsRemaining);
}

/** Advance the clock by lengthSec, rolling into the next quarter / OT as needed.
 *  Returns the new clock and whether regulation (or the current OT) just ended. */
function advanceClock(clock: GameClock, lengthSec: number): { clock: GameClock; periodEnded: boolean } {
  let { quarter, secondsRemaining } = clock;
  secondsRemaining -= lengthSec;
  let periodEnded = false;
  while (secondsRemaining <= 0) {
    periodEnded = true;
    quarter += 1;
    const periodLen = quarter <= 4 ? QUARTER_SECONDS : OT_SECONDS;
    secondsRemaining += periodLen;
  }
  return { clock: { quarter, secondsRemaining }, periodEnded };
}

// ---------------------------------------------------------------------------
// 3. initGameState
// ---------------------------------------------------------------------------
export function initGameState(
  X: LineupState,
  Y: LineupState,
  settings: SimSettings,
): GameState {
  for (const lu of [X, Y]) {
    for (const slot of lu.slots) {
      if (!getStatProfile(slot.archetype)) {
        throw new Error(`game-sim: slot "${slot.id}" has unknown archetype "${slot.archetype}"`);
      }
    }
  }
  const cloneLineup = (lu: LineupState): LineupState => ({
    side: lu.side,
    team: lu.team,
    slots: lu.slots.map((s) => ({
      ...s,
      rates: { ...s.rates },
      random: s.random ? { ...s.random } : undefined,
      accumulated: emptyAccum(), // zero accumulators
    })),
  });

  const offense: Side = settings.openingOffense ?? "X";
  const base: GameState = {
    clock: { quarter: 1, secondsRemaining: QUARTER_SECONDS },
    possessionCount: 0,
    score: { X: 0, Y: 0 },
    X: cloneLineup(X),
    Y: cloneLineup(Y),
    court: { label: "tip-off (no signal yet)", total: PRIOR_TOTAL, spacingScarcity: 0.5, poaPressure: 0.5, rimProtectionFaced: 0.5, synergy: 0.5, confidence: 0, provenance: "sim_derived", sourceState: "live_sim" },
    offense,
    offPossessions: { X: 0, Y: 0 },
    teamFouls: { X: 0, Y: 0 },
    rng: (settings.seed ?? 1) | 0,
    gameOver: false,
    lastPossession: null,
    log: [],
    prevStart: "make",
  };
  resetSubsTracker();
  // attach 10-man rosters (if both teams provided one) and seat the starting five
  const cloneRoster = (r: TeamRoster): TeamRoster => ({
    players: r.players.map((p, i) => ({ ...p, rates: { ...p.rates }, accumulated: {}, secondsPlayed: 0, stamina: 1, onCourt: i < 5, enteredAtSec: 0, benchedForFouls: false })),
  });
  let withRosters: GameState = base;
  if (X.roster && Y.roster) {
    const rosters: Record<Side, TeamRoster> = { X: cloneRoster(X.roster), Y: cloneRoster(Y.roster) };
    withRosters = { ...base, rosters,
      X: { ...base.X, slots: rosters.X.players.filter((p) => p.onCourt) },
      Y: { ...base.Y, slots: rosters.Y.players.filter((p) => p.onCourt) } };
  }
  // derive the opening court from the (empty) state so court is never hand-set
  return { ...withRosters, court: deriveCourt(withRosters) };
}

// ---------------------------------------------------------------------------
// 4. deriveCourt v1  (Gap C: court emerges from play)
//
// One SHARED court derived from combined game state. v1 uses simple saturating
// maps with uncalibrated curves — honest and improvable. Confidence rises as the
// game accumulates signal, and flows into the verdict's contextConfidence.
// ---------------------------------------------------------------------------
function teamStat(lu: LineupState, stat: StatId): number {
  return lu.slots.reduce((s, sl) => s + (sl.accumulated[stat] ?? 0), 0);
}

export function deriveCourt(state: GameState): CourtContext {
  const elapsed = elapsedSeconds(state.clock);
  const elapsedFraction = clamp01(elapsed / REGULATION_SECONDS);
  const trips = state.offPossessions.X + state.offPossessions.Y; // total offensive trips
  const combinedScore = state.score.X + state.score.Y;

  // --- total: project the observed scoring pace to a full game, blended toward
  // the neutral prior early (so a 1-possession sample can't dictate the total). ---
  const observedTotal = elapsedFraction > 0 ? combinedScore / elapsedFraction : PRIOR_TOTAL;
  const w = elapsedFraction; // trust observed more as the game elapses
  const total = round(w * observedTotal + (1 - w) * PRIOR_TOTAL, 1);

  // --- per-possession rates over BOTH lineups (one shared court) ---
  const denom = Math.max(trips, 1);
  const turnovers = teamStat(state.X, "turnovers") + teamStat(state.Y, "turnovers");
  const rimAttempts = teamStat(state.X, "rim_attempts") + teamStat(state.Y, "rim_attempts");
  const steals = teamStat(state.X, "steals") + teamStat(state.Y, "steals");
  const rimDefEvents =
    teamStat(state.X, "blocks") + teamStat(state.Y, "blocks") +
    teamStat(state.X, "rim_contests") + teamStat(state.Y, "rim_contests") +
    teamStat(state.X, "deterrence_events") + teamStat(state.Y, "deterrence_events");
  const assists =
    teamStat(state.X, "assists") + teamStat(state.Y, "assists") +
    teamStat(state.X, "secondary_assists") + teamStat(state.Y, "secondary_assists") +
    teamStat(state.X, "screen_assists") + teamStat(state.Y, "screen_assists");
  const madeShots = combinedScore / 2.1; // ~2.1 pts per made FG (rough mix of 2s/3s/FTs)

  // saturating map x/(x+k): 0 at x=0, →1 as x grows. k tunes the midpoint.
  const sat = (x: number, k: number) => x / (x + k);
  const toRate = turnovers / denom;        // typical ~0.13/poss
  const stealRate = steals / denom;        // typical ~0.08/poss
  const rimDefRate = rimDefEvents / denom; // typical ~0.25/poss
  const assistRate = madeShots > 0 ? assists / madeShots : 0; // assisted share-ish

  const spacingScarcity = clamp01(sat(toRate, 0.18));      // more TOs → more cramped
  const poaPressure = clamp01(sat(stealRate + toRate * 0.5, 0.16));
  const rimProtectionFaced = clamp01(sat(rimDefRate, 0.35));
  const synergy = clamp01(sat(assistRate, 0.9));

  // label keyed off the projected total, matching the engine's grind/track bands
  let label: string;
  if (trips === 0) label = "tip-off (no signal yet)";
  else if (total <= 200) label = "low-total grind (derived)";
  else if (total >= 225) label = "fast-pace track meet (derived)";
  else label = "neutral half-court (derived)";

  // confidence: low early (prior-dominated), climbs with elapsed game + trips
  const confidence = round(clamp01(0.15 + 0.55 * elapsedFraction + Math.min(0.3, trips / 200)), 3);

  return {
    label,
    total,
    spacingScarcity: round(spacingScarcity, 3),
    poaPressure: round(poaPressure, 3),
    rimProtectionFaced: round(rimProtectionFaced, 3),
    synergy: round(synergy, 3),
    confidence,
    provenance: "sim_derived",
    sourceState: "live_sim",
  };
}

// ---------------------------------------------------------------------------
// 5·0. GAP B — ZERO-SUM OPPONENT INTERACTION (v1)
//
// Until now the offense's output ignored who was guarding it ("two solo grades
// in parallel"). Gap B closes that: the DEFENDING lineup now suppresses (or, if
// weak, amplifies) the offense's scoring, so each trip is a contest.
//
// Mechanism:
//   • Each lineup exerts a per-possession DEFENSIVE PRESSURE from its own
//     defensive rates (blocks, steals, rim contests, deterrence, dreb; fouls cut
//     the other way → free throws).
//   • That pressure is read RELATIVE to a neutral baseline P0 = the pressure of a
//     balanced reference starting five (computed from the archetype defaults) — so
//     the baseline self-calibrates to the archetype system (no magic constant).
//   • A defense at P0 changes nothing (old behavior preserved); above P0 it
//     removes points, below P0 it concedes extra. The swing is bounded by
//     SUPP_MAX. That bound is on the modeled INTERACTION, not a realism clamp on
//     inputs — absurd per-possession inputs still pass through, matchup-scaled.
//
// Uncalibrated by design (Gap D): the weights/curve are reasoned, not fit.
// ---------------------------------------------------------------------------
// Per-possession weight each defensive stat carries toward "pressure". Fouls are
// negative (sending the offense to the line helps it).
const DEF_PRESSURE_W: Partial<Record<StatId, number>> = {
  blocks: 1.4, steals: 1.3, rim_contests: 0.5, deterrence_events: 0.5, dreb: 0.15, fouls: -0.4,
};
const GAP_B_SENSITIVITY = 0.28; // K: how hard relative pressure swings scoring
const SUPP_MAX = 0.18;          // ±cap on the scoring swing (interaction, not a realism clamp)
// Offensive "make" stats scale with the matchup; attempts/possessory stats do not
// (same shot diet, fewer makes vs a tough D). Turnovers rise vs pressure.
const OFFENSE_MAKE_STATS: StatId[] = ["points", "fg3m", "assists", "secondary_assists"];
// Per-defender suppression tuning. MEAN re-centers so the league-average contest
// nets ~0 (no FG% drift); SCALE sets how far elite vs poor defenders move make%.
const DEF_SUPP_SCALE = 0.6;
const DEF_SUPP_MEAN = 0.012;

/** Per-possession defensive pressure a lineup exerts (from its defensive rates). */
export function defensivePressure(lu: LineupState): number {
  let p = 0;
  for (const slot of lu.slots) {
    for (const stat of Object.keys(DEF_PRESSURE_W) as StatId[]) {
      p += (DEF_PRESSURE_W[stat] ?? 0) * (slot.rates[stat] ?? 0);
    }
  }
  return p;
}

// The neutral reference is a balanced starting five (a rim protector, a stopper,
// a playmaker, a wing, a guard) — a realistic "average" defense. Deviations from
// THIS are what suppress/concede, so typical lineups sit near zero and only
// clearly defense- or offense-skewed fives move the dial.
const NEUTRAL_REF_ARCHETYPES = ["rim_protector", "defensive_stopper", "connector", "spot_up_wing", "scoring_guard"] as const;

let _neutralPressure: number | null = null;
/** P0 — pressure of a balanced reference starting five. Memoized; self-calibrates
 *  the baseline to the archetype system (no magic constant). */
export function neutralDefensivePressure(): number {
  if (_neutralPressure != null) return _neutralPressure;
  const ref: LineupState = {
    side: "Y",
    slots: NEUTRAL_REF_ARCHETYPES.map((a, i) => ({
      id: `ref${i}`, archetype: a, rates: defaultRatesForArchetype(a), accumulated: {},
    })),
  };
  _neutralPressure = defensivePressure(ref);
  return _neutralPressure;
}

/** Matchup suppression in [-SUPP_MAX, SUPP_MAX]. + = a strong defense removes
 *  points; − = a weak defense concedes extra; 0 at the neutral baseline. */
export function suppressionFactor(defLineup: LineupState): number {
  const p0 = neutralDefensivePressure();
  if (p0 <= 0) return 0;
  const rel = (defensivePressure(defLineup) - p0) / p0;
  return Math.max(-SUPP_MAX, Math.min(SUPP_MAX, GAP_B_SENSITIVITY * rel));
}

// ---------------------------------------------------------------------------
// 5. POSSESSION GENERATORS (one per mode)
//
// Each returns the per-slot stat deltas for the trip, points scored, the clock
// burn, and whether the offense keeps the ball (offensive-rebound continuation).
// NO realism guards on the inputs; the only opponent coupling is the Gap B
// matchup scaling above (a modeled interaction, not a clamp).
// ---------------------------------------------------------------------------
interface PossessionResult {
  perSlotDeltas: Record<string, Partial<Record<StatId, number>>>;
  pointsScored: number;
  lengthSec: number;
  orebContinuation: boolean;
  rng: number; // updated PRNG state (random mode)
  note: string;
  play?: Play | null;
  nextStart?: StartType;
  committedFoulBy?: Side; // side that committed a team foul this trip (bonus tally)
}

function addDelta(
  map: Record<string, Partial<Record<StatId, number>>>,
  slotId: string,
  stat: StatId,
  amount: number,
): void {
  if (amount === 0) return;
  const cur = (map[slotId] ??= {});
  cur[stat] = round((cur[stat] ?? 0) + amount, 3);
}

// ---- 5a. RATE mode: deterministic expected-value accrual, matchup-scaled ----
function possessionRate(state: GameState, settings: SimSettings): PossessionResult {
  const off = state[state.offense];
  const def = state[OTHER[state.offense]];
  // Gap B: the defense faced scales the offense's makes (and nudges turnovers).
  const supp = suppressionFactor(def);
  const makeScale = 1 - supp;                    // strong D < 1 · weak D > 1
  const toScale = 1 + Math.max(0, supp) * 0.6;   // pressure forces a few more TOs
  const perSlotDeltas: Record<string, Partial<Record<StatId, number>>> = {};
  let pointsScored = 0;

  for (const slot of off.slots) {
    for (const stat of ALL_STATS) {
      if (STAT_SIDE[stat] !== "offense") continue;
      let r = slot.rates[stat] ?? 0;
      if (!r) continue;
      if (OFFENSE_MAKE_STATS.includes(stat)) r *= makeScale;
      else if (stat === "turnovers") r *= toScale;
      addDelta(perSlotDeltas, slot.id, stat, r);
      if (stat === "points") pointsScored += r;
    }
  }
  for (const slot of def.slots) {
    for (const stat of ALL_STATS) {
      if (STAT_SIDE[stat] !== "defense") continue;
      const r = slot.rates[stat] ?? 0;
      if (r) addDelta(perSlotDeltas, slot.id, stat, r);
    }
  }
  const suppPct = Math.round(supp * 100);
  return {
    perSlotDeltas,
    pointsScored: round(pointsScored, 3),
    lengthSec: settings.possessionSeconds ?? DEFAULT_POSSESSION_SECONDS,
    orebContinuation: false,
    rng: state.rng,
    note: `rate: ${state.offense} +${round(pointsScored, 2)} vs D ${suppPct >= 0 ? "+" : ""}${suppPct}%`,
  };
}

// ---- 5b. RANDOM mode: seeded weighted events ----
function possessionRandom(state: GameState): PossessionResult {
  const off = state[state.offense];
  const def = state[OTHER[state.offense]];
  const perSlotDeltas: Record<string, Partial<Record<StatId, number>>> = {};
  let rng = state.rng;
  const roll = (): number => { const [s, v] = mulberry32(rng); rng = s; return v; };

  const pick = (slots: PlayerSlot[], weightOf: (s: PlayerSlot) => number): PlayerSlot => {
    const weights = slots.map((s) => Math.max(0.0001, weightOf(s)));
    const sum = weights.reduce((a, b) => a + b, 0);
    let t = roll() * sum;
    for (let i = 0; i < slots.length; i++) { t -= weights[i]; if (t <= 0) return slots[i]; }
    return slots[slots.length - 1];
  };
  const usageOf = (s: PlayerSlot) => (s.random?.usage ?? (s.rates.points ?? 0.1) + (s.rates.rim_attempts ?? 0) + (s.rates.assists ?? 0)) * usageMult(s);

  let pointsScored = 0;
  let orebContinuation = false;
  let note = "";
  let assisterName: string | null = null;

  // variable length: how THIS possession started (set by the previous trip's end)
  const startType: StartType = state.prevStart;
  const _teamSec = off.team ? getTeamData(off.team)?.secPerPossOff : undefined;
  const _paceFactor = _teamSec ? _teamSec / LEAGUE_AVG_SEC_OFF : 1;
  const lengthSec = possessionSeconds(startType, roll) * _paceFactor;

  // team turnover propensity (sum of offensive turnover rates), then roll
  const teamTo = clamp01(off.slots.reduce((s, sl) => s + (sl.rates.turnovers ?? 0), 0));
  if (roll() < teamTo) {
    const giver = pick(off.slots, usageOf);
    addDelta(perSlotDeltas, giver.id, "turnovers", 1);
    // defense may convert a steal
    const teamStealTend = clamp01(def.slots.reduce((s, sl) => s + (sl.rates.steals ?? 0), 0) * 2);
    let stolen = false;
    if (roll() < teamStealTend) {
      const thief = pick(def.slots, (s) => (s.rates.steals ?? 0.005));
      addDelta(perSlotDeltas, thief.id, "steals", 1);
      stolen = true;
      note = `random: ${state.offense} turnover, steal`;
    } else {
      note = `random: ${state.offense} turnover`;
    }
    const toName = giver.name ?? giver.id;
    const toPlay: Play = {
      shooter: toName, zone: "rim", dist: null, made: false, points: 0, ftm: 0, fta: 0, assister: null,
      defender: null, andOne: false, fastbreak: startType === "steal" || startType === "miss",
      startType, label: `${toName}: turnover${stolen ? " (stolen)" : ""}`, box: {},
    };
    return { perSlotDeltas, pointsScored: 0, lengthSec, orebContinuation: false, rng, note, play: toPlay, nextStart: stolen ? "steal" : "deadball" };
  }

  // --- non-shooting fouls (resolved before the shot) ---
  const defSide = OTHER[state.offense];
  let priorFoul: string | null = null; // a common foul that folds into this possession
  // coach: intentional foul when trailing late — stop the clock, send the leader to the line
  if (state.clock.quarter >= 4 && state.clock.secondsRemaining <= 40) {
    const lead = state.score[state.offense] - state.score[defSide]; // ball-holder is the leader
    if (lead >= 1 && lead <= 9 && roll() < 0.85) {
      const fouler = pick(def.slots, (sl) => 1 / Math.max(0.05, usageOf(sl))); // a role player fouls
      addDelta(perSlotDeltas, fouler.id, "fouls", 1);
      const fn = fouler.name ?? fouler.id;
      const sh = pick(off.slots, usageOf); const shn = sh.name ?? sh.id; const spF = profileFor(shn);
      let ftm = 0; for (let i = 0; i < 2; i++) if (roll() < spF.ftPct) ftm++;
      addDelta(perSlotDeltas, sh.id, "fta", 2);
      if (ftm > 0) addDelta(perSlotDeltas, sh.id, "points", ftm);
      const label = `${fn}: intentional foul on ${shn} -> ${ftm}/2 FT`;
      const play: Play = { shooter: shn, zone: "rim", dist: null, made: false, points: ftm, ftm, fta: 2, assister: null, defender: fn, andOne: false, fastbreak: false, startType, label, box: { [fn]: { pf: 1 }, [shn]: { ftm, fta: 2, pts: ftm } } };
      return { perSlotDeltas, pointsScored: ftm, lengthSec: 4, orebContinuation: false, rng, note: label, play, nextStart: "ft", committedFoulBy: defSide };
    }
  }
  // offensive fouls -> turnover (charge / illegal screen / offensive 3-seconds)
  if (roll() < 0.022) {
    const r = roll();
    const kind = r < 0.45 ? "charge" : r < 0.8 ? "illegal screen" : "offensive 3 seconds";
    const culprit = pick(off.slots, usageOf);
    addDelta(perSlotDeltas, culprit.id, "turnovers", 1);
    addDelta(perSlotDeltas, culprit.id, "fouls", 1);
    const cn = culprit.name ?? culprit.id;
    let drawnBy: string | null = null;
    if (kind === "charge") { const d = pick(def.slots, (s) => (s.rates.steals ?? 0.005) + 0.01); drawnBy = d.name ?? d.id; }
    const label = `${cn}: offensive foul (${kind})${drawnBy ? `, charge drawn by ${drawnBy}` : ""} -> turnover`;
    const play: Play = { shooter: cn, zone: "rim", dist: null, made: false, points: 0, ftm: 0, fta: 0, assister: null, defender: drawnBy, andOne: false, fastbreak: false, startType, label, box: { [cn]: { pf: 1 } } };
    return { perSlotDeltas, pointsScored: 0, lengthSec, orebContinuation: false, rng, note: label, play, nextStart: "deadball", committedFoulBy: state.offense };
  }
  // defensive non-shooting fouls (reach-in / blocking / loose-ball / defensive 3-seconds)
  if (roll() < 0.12) {
    const r = roll();
    const isDef3 = r < 0.12;
    const kind = isDef3 ? "defensive 3 seconds" : r < 0.5 ? "reach-in foul" : r < 0.8 ? "blocking foul" : "loose-ball foul";
    const fouler = pick(def.slots, (s) => (s.rates.fouls ?? 0.02) + 0.01);
    const fn = fouler.name ?? fouler.id;
    addDelta(perSlotDeltas, fouler.id, "fouls", 1);
    const inBonus = (state.teamFouls[defSide] ?? 0) >= 5;
    if (isDef3 || inBonus) {
      // FT outcome: def 3-sec = 1 tech FT (offense keeps ball); bonus = 2 FT (possession ends)
      const sh = pick(off.slots, usageOf);
      const ftName = sh.name ?? sh.id;
      const sp = profileFor(ftName);
      let ftm = 0; const fta = isDef3 ? 1 : 2;
      for (let i = 0; i < fta; i++) if (roll() < sp.ftPct) ftm++;
      addDelta(perSlotDeltas, sh.id, "fta", fta);
      if (ftm > 0) addDelta(perSlotDeltas, sh.id, "points", ftm);
      const tag = isDef3 ? `defensive 3 seconds -> ${ftm}/${fta} FT (tech)` : `${kind} (bonus) on ${ftName} -> ${ftm}/${fta} FT`;
      const label = `${fn}: ${tag}`;
      const play: Play = { shooter: ftName, zone: "rim", dist: null, made: false, points: ftm, ftm, fta, assister: null, defender: fn, andOne: false, fastbreak: false, startType, label, box: { [fn]: { pf: 1 }, [ftName]: { ftm, fta, pts: ftm } } };
      return { perSlotDeltas, pointsScored: ftm, lengthSec: isDef3 ? 3 : lengthSec, orebContinuation: isDef3, rng, note: label, play, nextStart: "ft", committedFoulBy: defSide };
    }
    // common foul, no bonus -> offense keeps the ball; fold into THIS possession's shot (no empty trip, no dilution)
    priorFoul = `${fn}: ${kind}`;
  }

  // a shot attempt by the chosen actor
  const shooter = pick(off.slots, usageOf);
  const sp = profileFor(shooter.name ?? shooter.id);
  // shot selection from the player's REAL 2024-25 three-point share (sandbox override wins)
  const threeBias = clamp01(shooter.random?.threeBias ?? sp.three);
  const isThree = roll() < threeBias;
  if (isThree) addDelta(perSlotDeltas, shooter.id, "fg3m", 0); // counted on make below
  addDelta(perSlotDeltas, shooter.id, "rim_attempts", isThree ? 0 : 1);

  // defensive contest (always credited at the rim on a 2), and a block chance
  const contester = pick(def.slots, (s) => (s.rates.rim_contests ?? 0) + (s.rates.blocks ?? 0) + 0.01);
  if (!isThree) {
    addDelta(perSlotDeltas, contester.id, "rim_contests", 1);
    addDelta(perSlotDeltas, contester.id, "deterrence_events", 1);
  }
  const blockTend = clamp01((contester.rates.blocks ?? 0) * 4);
  const blocked = !isThree && roll() < blockTend;
  if (blocked) addDelta(perSlotDeltas, contester.id, "blocks", 1);
  // the defender who actually contests this shot: rim man on a 2, closeout man on a 3
  const perimContester = pick(def.slots, (sl) => (sl.rates.steals ?? 0.005) + (sl.rates.dreb ?? 0.02) + 0.01);
  const shotDefender = isThree ? perimContester : contester;
  const defSupp = (defenderSuppress(shotDefender) - DEF_SUPP_MEAN) * DEF_SUPP_SCALE;

  // ---- per-player make%: real 2024-25 FG by zone (this IS the shooter system) ----
  // For a 2, blend the player's rim & mid FG% by his own rim/mid shot shares -> his true 2P%.
  // For a 3, use his real 3P%. Falls back to league-ish DEFAULT profile for unknown names.
  const twoPct = (sp.rim * sp.fgRim + sp.mid * sp.fgMid) / Math.max(1e-6, sp.rim + sp.mid);
  const baseMake = isThree ? (sp.fgThree > 0 ? sp.fgThree : 0.33) : (twoPct > 0 ? twoPct : 0.52);
  const makeBias = (shooter.random?.makeBias ?? 0.5) - 0.5; // -0.5..+0.5 (synthetic sandbox only)
  // Defense still bends make%, but lighter than before: real FG% already bakes in average
  // NBA defense, so a full suppression term would double-count it.
  const supp = suppressionFactor(def);
  const fatigue = (1 - (shooter.stamina ?? 1)) * 0.04; // gassed shooter -> small make penalty
  const made = !blocked && roll() < clamp01(baseMake + makeBias * 0.3 - supp * 0.22 - defSupp - fatigue);
  const fouled = !blocked && roll() < clamp01(sp.foulDrawn * foulDrawMult(shooter));
  let ftm = 0, fta = 0;
  if (fouled) {
    fta = made ? 1 : isThree ? 3 : 2;
    for (let i = 0; i < fta; i++) if (roll() < sp.ftPct) ftm++;
    addDelta(perSlotDeltas, shooter.id, "fta", fta);
    if (ftm > 0) { addDelta(perSlotDeltas, shooter.id, "points", ftm); pointsScored += ftm; }
  }

  if (made) {
    const pts = isThree ? 3 : 2;
    addDelta(perSlotDeltas, shooter.id, "points", pts);
    if (isThree) addDelta(perSlotDeltas, shooter.id, "fg3m", 1);
    pointsScored += pts;
    // assist chance from another offensive slot
    if (off.slots.length > 1 && roll() < 0.65) {
      const others = off.slots.filter((s) => s.id !== shooter.id);
      const passer = pick(others, (s) => ((s.rates.assists ?? 0.01) + (s.rates.secondary_assists ?? 0)) * playmakeMult(s));
      addDelta(perSlotDeltas, passer.id, "assists", 1);
      assisterName = passer.name ?? passer.id;
      if (roll() < 0.25) addDelta(perSlotDeltas, passer.id, "secondary_assists", 1);
    }
    note = `random: ${shooter.id} made ${pts}${fouled ? " (and-1)" : ""}`;
  } else if (fouled) {
    // shooting foul on a missed/blocked attempt → free-throw trip, no rebound
    note = `random: ${shooter.id} shooting foul, ${ftm}/${fta} FT`;
  } else {
    // miss (or block) → rebound: offensive (continuation) or defensive
    const orebTend = 0.25;
    if (roll() < orebTend) {
      const crasher = pick(off.slots, (s) => (s.rates.oreb ?? 0.01));
      addDelta(perSlotDeltas, crasher.id, "oreb", 1);
      orebContinuation = true;
      note = `random: miss, OREB ${crasher.id}`;
    } else {
      const rebounder = pick(def.slots, (s) => (s.rates.dreb ?? 0.05));
      addDelta(perSlotDeltas, rebounder.id, "dreb", 1);
      note = blocked ? `random: ${contester.id} block, DREB` : `random: miss, DREB`;
    }
  }
  const shotPoints = made ? (isThree ? 3 : 2) : 0;
  const defenderName = !isThree ? (contester.name ?? contester.id) : null;
  const startTypeNext: StartType = fouled ? "ft" : orebContinuation ? "miss" : made ? "make" : "miss";
  const play = narratePlay({
    shooterName: shooter.name ?? shooter.id, isThree, made, points: shotPoints,
    assisterName, defenderName, startType, roll, ftm, fta,
  });
  if (fouled) { const fn = contester.name ?? contester.id; const b = (play.box[fn] ??= {}); b.pf = (b.pf ?? 0) + 1; addDelta(perSlotDeltas, contester.id, "fouls", 1); }
  if (fouled && !made) play.label = play.label.replace("drew a shooting foul", "missed, drew a shooting foul");
  if (priorFoul) play.label = `${priorFoul} (kept) | ${play.label}`;
  return { perSlotDeltas, pointsScored, lengthSec, orebContinuation, rng, note, play, nextStart: startTypeNext, committedFoulBy: (fouled || priorFoul) ? defSide : undefined };
}

// ---- 5c. SCRIPTED mode: consume the next event from the feed ----
function possessionScripted(state: GameState, settings: SimSettings): PossessionResult {
  const feed = settings.script ?? [];
  const ev = feed[state.possessionCount];
  if (!ev) {
    // feed exhausted: a no-op trip (clock still burns) — honest + observable
    return {
      perSlotDeltas: {},
      pointsScored: 0,
      lengthSec: settings.possessionSeconds ?? DEFAULT_POSSESSION_SECONDS,
      orebContinuation: false,
      rng: state.rng,
      note: "scripted: feed exhausted (no-op trip)",
    };
  }
  const perSlotDeltas: Record<string, Partial<Record<StatId, number>>> = {};
  let pointsScored = 0;
  for (const [slotId, deltas] of Object.entries(ev.deltas)) {
    for (const stat of Object.keys(deltas) as StatId[]) {
      const amt = deltas[stat] ?? 0;
      addDelta(perSlotDeltas, slotId, stat, amt);
      if (stat === "points") pointsScored += amt;
    }
  }
  return {
    perSlotDeltas,
    pointsScored: round(pointsScored, 3),
    lengthSec: ev.lengthSec ?? settings.possessionSeconds ?? DEFAULT_POSSESSION_SECONDS,
    orebContinuation: ev.orebContinuation ?? false,
    rng: state.rng,
    note: `scripted #${state.possessionCount + 1}: +${round(pointsScored, 2)}`,
  };
}

// ---------------------------------------------------------------------------
// 6. advancePossession — THE HEART
// ---------------------------------------------------------------------------
export function advancePossession(state: GameState, settings: SimSettings): GameState {
  if (state.gameOver) return state;

  // a scripted event may override who has the ball this trip
  let offense = state.offense;
  if (settings.possessionMode === "scripted") {
    const ev = (settings.script ?? [])[state.possessionCount];
    if (ev?.offense) offense = ev.offense;
  }
  const working: GameState = { ...state, offense };

  // 1) mode decides what happened
  let res: PossessionResult;
  switch (settings.possessionMode) {
    case "rate": res = possessionRate(working, settings); break;
    case "random": res = possessionRandom(working); break;
    case "scripted": res = possessionScripted(working, settings); break;
    default: throw new Error(`game-sim: unknown possessionMode "${settings.possessionMode}"`);
  }

  // 2) apply per-slot deltas onto fresh lineup clones (pure update)
  const applyTo = (lu: LineupState): LineupState => ({
    side: lu.side,
    slots: lu.slots.map((slot) => {
      const d = res.perSlotDeltas[slot.id];
      if (!d) return slot;
      const accumulated = { ...slot.accumulated };
      for (const stat of Object.keys(d) as StatId[]) {
        accumulated[stat] = round((accumulated[stat] ?? 0) + (d[stat] ?? 0), 3);
      }
      return { ...slot, accumulated };
    }),
  });
  const X = applyTo(state.X);
  const Y = applyTo(state.Y);

  // 3) score + offensive-trip tally
  const score: Record<Side, number> = { ...state.score };
  score[offense] = round(score[offense] + res.pointsScored, 3);
  const offPossessions: Record<Side, number> = { ...state.offPossessions };
  offPossessions[offense] += 1;

  // 4) clock + 5) possession side flip (OREB keeps the ball)
  const prevQuarter = state.clock.quarter;
  const adv = advanceClock(state.clock, res.lengthSec);
  let clock = adv.clock;
  const periodEnded = adv.periodEnded;
  const nextOffense: Side = res.orebContinuation ? offense : OTHER[offense];

  // game-over: a period crossing into OT territory only CONTINUES into OT when the
  // score is tied; otherwise the game is over and the clock is clamped to the
  // buzzer of the period that just ended (honest readout — no spilling into an OT
  // that is never played). This is clock bookkeeping, not a realism guard on play.
  let gameOver = false;
  if (periodEnded && clock.quarter > 4) {
    const tied = Math.round(score.X) === Math.round(score.Y);
    if (!tied) {
      gameOver = true;
      clock = { quarter: prevQuarter, secondsRemaining: 0 };
    }
  }
  const totalCap = settings.totalPossessions;
  const nextCount = state.possessionCount + 1;
  if (totalCap != null && nextCount >= totalCap) gameOver = true;

  // team fouls: reset each new quarter (bonus is per-period); else tally this trip's foul
  let teamFouls: Record<Side, number> = { ...state.teamFouls };
  if (periodEnded && !gameOver) teamFouls = { X: 0, Y: 0 };
  else if (res.committedFoulBy) teamFouls[res.committedFoulBy] += 1;

  const lastPossession: SimPossessionOutcome = {
    seq: nextCount,
    offense,
    pointsScored: res.pointsScored,
    lengthSec: res.lengthSec,
    orebContinuation: res.orebContinuation,
    perSlotDeltas: res.perSlotDeltas,
    note: res.note,
    play: res.play ?? null,
    clock,
  };

  const next: GameState = {
    ...state,
    clock,
    possessionCount: nextCount,
    score,
    X, Y,
    offense: nextOffense,
    offPossessions,
    teamFouls,
    rng: res.rng,
    gameOver,
    lastPossession,
    log: [...state.log, lastPossession],
    prevStart: res.nextStart ?? "make",
    court: state.court, // replaced just below
  };

  // 6.5) substitutions — coach logic runs between trips when rosters are attached
  if (next.rosters) {
    const sub = applySubstitutions(next, res.lengthSec);
    next.X = { ...next.X, slots: sub.X };
    next.Y = { ...next.Y, slots: sub.Y };
    next.subs = sub.subs.length ? [...(state.subs ?? []), ...sub.subs] : (state.subs ?? []);
    if (sub.subs.length) {
      next.log = [...next.log, ...sub.subs.map((ev) => ({
        seq: nextCount, offense: ev.side, pointsScored: 0, lengthSec: 0, orebContinuation: false,
        perSlotDeltas: {}, note: `SUB ${ev.side}: ${ev.out} \u2192 ${ev.in} (${ev.reason})`, play: null as Play | null, clock,
      }))];
    }
  }

  // 6) recompute the court from the evolved state (Gap C)
  next.court = deriveCourt(next);
  return next;
}

// ---------------------------------------------------------------------------
// 7. gradeState — per-player verdicts + lineup roll-up (both live)
// ---------------------------------------------------------------------------
export interface PlayerGrade {
  slotId: string;
  side: Side;
  archetype: string;
  name?: string;
  verdict: CompositeVerdict;
}

export interface LineupRollup {
  side: Side;
  score: number;
  players: number;
  meanComposite: number;
  meanConfidence: number;
  beatingCourt: number; // how many slots have compositeCandidate > 0
  headlineCategories: Partial<Record<StatCategory, number>>;
}

export interface GradeResult {
  perPlayer: PlayerGrade[];
  rollup: Record<Side, LineupRollup>;
  court: CourtContext;
  clock: GameClock;
  possessionCount: number;
}

/** Synthetic per-100 scoring beat for a slot: project its points to per-100 of
 *  ITS team's offensive trips, minus the archetype's points par. Labeled synthetic
 *  like everything else; feeds the verdict's separate `scoringCandidate`. */
function syntheticScoringBeat(slot: PlayerSlot, offTrips: number): number {
  const profile = getStatProfile(slot.archetype);
  const ptsEntry = profile?.entries.find((e) => e.stat === "points");
  if (!ptsEntry) return 0;
  const pts = slot.accumulated.points ?? 0;
  const projPer100 = offTrips > 0 ? (pts / offTrips) * 100 : 0;
  return round(projPer100 - ptsEntry.baseline, 1);
}

export function gradeState(state: GameState): GradeResult {
  const perPlayer: PlayerGrade[] = [];
  const rollups: Record<Side, LineupRollup> = {
    X: { side: "X", score: state.score.X, players: state.X.slots.length, meanComposite: 0, meanConfidence: 0, beatingCourt: 0, headlineCategories: {} },
    Y: { side: "Y", score: state.score.Y, players: state.Y.slots.length, meanComposite: 0, meanConfidence: 0, beatingCourt: 0, headlineCategories: {} },
  };

  for (const side of ["X", "Y"] as Side[]) {
    const lu = state[side];
    const offTrips = state.offPossessions[side];
    let sumComposite = 0, sumConf = 0;
    for (const slot of lu.slots) {
      const beat = syntheticScoringBeat(slot, offTrips);
      const verdict = buildCompositeVerdict(slot.archetype, state.court, slot.accumulated, beat);
      perPlayer.push({ slotId: slot.id, side, archetype: slot.archetype, name: slot.name, verdict });
      sumComposite += verdict.compositeCandidate;
      sumConf += verdict.compositeConfidence;
      if (verdict.compositeCandidate > 0) rollups[side].beatingCourt += 1;
      if (verdict.headlineCategory) {
        const hc = rollups[side].headlineCategories;
        hc[verdict.headlineCategory] = (hc[verdict.headlineCategory] ?? 0) + 1;
      }
    }
    const n = Math.max(lu.slots.length, 1);
    rollups[side].meanComposite = round(sumComposite / n, 3);
    rollups[side].meanConfidence = round(sumConf / n, 3);
  }

  return { perPlayer, rollup: rollups, court: state.court, clock: state.clock, possessionCount: state.possessionCount };
}

// ---------------------------------------------------------------------------
// 8. runGame — convenience loop (autoplay B = this on a timer; manual A = step)
// ---------------------------------------------------------------------------
export function runGame(
  X: LineupState,
  Y: LineupState,
  settings: SimSettings,
  maxSteps = 1000,
): GameState {
  let state = initGameState(X, Y, settings);
  let steps = 0;
  while (!state.gameOver && steps < maxSteps) {
    state = advancePossession(state, settings);
    steps += 1;
  }
  return state;
}

// ---------------------------------------------------------------------------
// 9. TEST FIXTURES — a 1v1 tester lineup pair (Step 3 reuses this slot)
// ---------------------------------------------------------------------------
export function makeSlot(id: string, archetype: string, name?: string): PlayerSlot {
  return { id, archetype, name, rates: { ...defaultRatesForArchetype(archetype), ...(getPlayerRates(name ?? "") ?? {}) }, accumulated: emptyAccum() };
}

function makeLineup(side: Side, specs: { id: string; archetype: string; name?: string }[]): LineupState {
  return { side, slots: specs.map((s) => makeSlot(s.id, s.archetype, s.name)) };
}

// ---------------------------------------------------------------------------
// 10. SELF-CHECKS
// ---------------------------------------------------------------------------
export function runGameSimSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const X1 = makeLineup("X", [{ id: "x1", archetype: "scoring_guard", name: "X Guard" }]);
  const Y1 = makeLineup("Y", [{ id: "y1", archetype: "rim_protector", name: "Y Big" }]);

  // --- init ---
  const init = initGameState(X1, Y1, { possessionMode: "rate", progressionMode: "manual" });
  check("init clock is Q1 12:00", init.clock.quarter === 1 && init.clock.secondsRemaining === QUARTER_SECONDS);
  check("init score 0-0", init.score.X === 0 && init.score.Y === 0);
  check("init accumulators zeroed", (init.X.slots[0].accumulated.points ?? 0) === 0);
  check("init court is derived, not hand-set (provenance sim_derived)", init.court.provenance === "sim_derived");
  check("init court confidence is low at tip-off", (init.court.confidence ?? 1) <= 0.2);

  // init does NOT mutate the caller's lineups
  check("init does not mutate caller lineups", X1.slots[0].accumulated.points === undefined);

  // --- rate mode: deterministic, stats accumulate, clock burns, possession flips ---
  let s = init;
  const firstOffense = s.offense;
  s = advancePossession(s, { possessionMode: "rate", progressionMode: "manual" });
  check("rate: possessionCount increments", s.possessionCount === 1);
  check("rate: offensive stat accrued on offense slot", (s[firstOffense].slots[0].accumulated.points ?? 0) > 0);
  check("rate: defensive stat accrued on defense slot", (s[OTHER[firstOffense]].slots[0].accumulated.dreb ?? 0) > 0 || (s[OTHER[firstOffense]].slots[0].accumulated.blocks ?? 0) > 0);
  check("rate: clock burned ~17s", s.clock.secondsRemaining < QUARTER_SECONDS && s.clock.secondsRemaining >= QUARTER_SECONDS - MAX_POSSESSION_SECONDS);
  check("rate: possession flipped to the other side", s.offense === OTHER[firstOffense]);
  check("rate: score moved for the offense", s.score[firstOffense] > 0);

  // determinism: same inputs → identical state
  const a = runGame(X1, Y1, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 50 });
  const b = runGame(X1, Y1, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 50 });
  check("rate: deterministic (two runs identical score)", a.score.X === b.score.X && a.score.Y === b.score.Y);
  check("rate: deterministic (identical accumulated)", JSON.stringify(a.X.slots[0].accumulated) === JSON.stringify(b.X.slots[0].accumulated));

  // --- the court DERIVES from play and CHANGES as the game evolves (Gap C) ---
  const early = runGame(X1, Y1, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 4 });
  const late = runGame(X1, Y1, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 120 });
  check("court confidence rises as the game elapses", (late.court.confidence ?? 0) > (early.court.confidence ?? 0));
  check("court total is a live projection (differs early vs late)", early.court.total !== late.court.total);
  check("court fields stay in 0..1", [late.court.spacingScarcity, late.court.poaPressure, late.court.rimProtectionFaced, late.court.synergy].every((v) => v >= 0 && v <= 1));

  // --- the verdict EVOLVES as stats accumulate (the headline Step-1 proof) ---
  const g_early = gradeState(early).perPlayer.find((p) => p.slotId === "x1")!;
  const g_late = gradeState(late).perPlayer.find((p) => p.slotId === "x1")!;
  check("verdict evolves: composite differs early vs late", g_early.verdict.compositeCandidate !== g_late.verdict.compositeCandidate);
  check("verdict stays SHADOW (applied:false)", g_late.verdict.applied === false && g_late.verdict.mode === "shadow");
  check("verdict inherits derived court confidence as contextConfidence", g_late.verdict.contextConfidence === late.court.confidence);

  // --- gradeState produces both lineups + a roll-up ---
  const grade = gradeState(late);
  check("gradeState grades both lineups", grade.perPlayer.some((p) => p.side === "X") && grade.perPlayer.some((p) => p.side === "Y"));
  check("rollup carries score + mean composite per side", typeof grade.rollup.X.meanComposite === "number" && grade.rollup.X.score === late.score.X);

  // --- random mode: runs, accumulates, is seed-reproducible, differs by seed ---
  const r1 = runGame(X1, Y1, { possessionMode: "random", progressionMode: "autoplay", totalPossessions: 80, seed: 42 });
  const r1b = runGame(X1, Y1, { possessionMode: "random", progressionMode: "autoplay", totalPossessions: 80, seed: 42 });
  const r2 = runGame(X1, Y1, { possessionMode: "random", progressionMode: "autoplay", totalPossessions: 80, seed: 7 });
  check("random: same seed reproduces identical score", r1.score.X === r1b.score.X && r1.score.Y === r1b.score.Y);
  check("random: different seeds diverge", r1.score.X !== r2.score.X || r1.score.Y !== r2.score.Y);
  check("random: someone scored", r1.score.X + r1.score.Y > 0);
  check("random: court derived & in range", (r1.court.confidence ?? 0) > 0 && r1.court.spacingScarcity >= 0 && r1.court.spacingScarcity <= 1);

  // --- scripted mode: explicit feed drives stats; exhausted feed = no-op trip ---
  const script: ScriptedPossession[] = [
    { offense: "X", deltas: { x1: { points: 3, fg3m: 1 } } },
    { offense: "Y", deltas: { y1: { dreb: 2, blocks: 1 } } },
    { offense: "X", deltas: { x1: { points: 2, rim_attempts: 1, assists: 1 } } },
  ];
  let sc = initGameState(X1, Y1, { possessionMode: "scripted", progressionMode: "manual", script });
  for (let i = 0; i < 3; i++) sc = advancePossession(sc, { possessionMode: "scripted", progressionMode: "manual", script });
  check("scripted: X scored exactly the scripted points", sc.score.X === 5);
  check("scripted: Y slot got scripted defensive stats", (sc.Y.slots[0].accumulated.dreb ?? 0) === 2 && (sc.Y.slots[0].accumulated.blocks ?? 0) === 1);
  const scExhausted = advancePossession(sc, { possessionMode: "scripted", progressionMode: "manual", script });
  check("scripted: exhausted feed is a no-op trip (clock still advances)", scExhausted.score.X === 5 && scExhausted.possessionCount === 4);

  // --- 5v5 reuses the same slot infra (Step 4 is essentially free) ---
  const X5 = makeLineup("X", [
    { id: "x1", archetype: "high_usage_star" }, { id: "x2", archetype: "scoring_guard" },
    { id: "x3", archetype: "spot_up_wing" }, { id: "x4", archetype: "connector" }, { id: "x5", archetype: "roll_big" },
  ]);
  const Y5 = makeLineup("Y", [
    { id: "y1", archetype: "secondary_creator" }, { id: "y2", archetype: "defensive_stopper" },
    { id: "y3", archetype: "low_usage_specialist" }, { id: "y4", archetype: "screen_assist_big" }, { id: "y5", archetype: "rim_protector" },
  ]);
  const full = runGame(X5, Y5, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 160 });
  const fullGrade = gradeState(full);
  check("5v5: grades 10 players", fullGrade.perPlayer.length === 10);
  check("5v5: distinct archetypes produce distinct composites", new Set(fullGrade.perPlayer.map((p) => p.verdict.compositeCandidate)).size > 1);

  // --- runs to clock expiry when no possession cap is set; clamps to the buzzer ---
  const toEnd = runGame(X5, Y5, { possessionMode: "rate", progressionMode: "autoplay" }, 5000);
  check("game ends by clock (game over, not via a possession cap)", toEnd.gameOver);
  check("a non-tied finish clamps the clock to Q4 0:00 (no spill into OT)", toEnd.clock.quarter === 4 && toEnd.clock.secondsRemaining === 0);
  check("a full game runs a realistic number of trips (>120)", toEnd.possessionCount > 120);

  // --- NO realism guard: absurd inputs are matchup-SCALED but never clamped to a
  //     realistic value (a 50/poss intent stays enormous, not capped to ~1-3) ---
  const absurd = makeLineup("X", [{ id: "x1", archetype: "scoring_guard" }]);
  absurd.slots[0].rates = { points: 50 }; // 50 points per possession, intentionally absurd
  let ab = initGameState(absurd, Y1, { possessionMode: "rate", progressionMode: "manual" });
  ab = advancePossession(ab, { possessionMode: "rate", progressionMode: "manual" });
  check("no realism guard: absurd 50/poss input is matchup-scaled but uncapped (>>3)", (ab.X.slots[0].accumulated.points ?? 0) > 30);

  // --- Gap B: zero-sum opponent interaction — the defense changes the offense ---
  const gbOff = makeLineup("X", [
    { id: "o1", archetype: "high_usage_star" }, { id: "o2", archetype: "scoring_guard" },
    { id: "o3", archetype: "secondary_creator" }, { id: "o4", archetype: "spot_up_wing" }, { id: "o5", archetype: "roll_big" },
  ]);
  const strongD = makeLineup("Y", [
    { id: "d1", archetype: "rim_protector" }, { id: "d2", archetype: "defensive_stopper" },
    { id: "d3", archetype: "rim_protector" }, { id: "d4", archetype: "defensive_stopper" }, { id: "d5", archetype: "rim_protector" },
  ]);
  const weakD = makeLineup("Y", [
    { id: "w1", archetype: "scoring_guard" }, { id: "w2", archetype: "spot_up_wing" },
    { id: "w3", archetype: "high_usage_star" }, { id: "w4", archetype: "scoring_guard" }, { id: "w5", archetype: "secondary_creator" },
  ]);
  check("Gap B: strong defense exerts above-neutral pressure (supp > 0)", suppressionFactor(strongD) > 0);
  check("Gap B: weak defense exerts below-neutral pressure (supp < 0)", suppressionFactor(weakD) < 0);
  check("Gap B: suppression bounded by SUPP_MAX", Math.abs(suppressionFactor(strongD)) <= SUPP_MAX + 1e-9 && Math.abs(suppressionFactor(weakD)) <= SUPP_MAX + 1e-9);
  const vsStrong = runGame(gbOff, strongD, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 160, openingOffense: "X" });
  const vsWeak = runGame(gbOff, weakD, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 160, openingOffense: "X" });
  check("Gap B: same offense scores FEWER vs a strong D than a weak D (real contest)", vsStrong.score.X < vsWeak.score.X);
  check("Gap B: the defensive effect on scoring is material (>5%)", (vsWeak.score.X - vsStrong.score.X) / Math.max(vsWeak.score.X, 1) > 0.05);
  const gb1 = runGame(gbOff, strongD, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 90 });
  const gb2 = runGame(gbOff, strongD, { possessionMode: "rate", progressionMode: "autoplay", totalPossessions: 90 });
  check("Gap B: rate mode remains deterministic with the matchup effect on", gb1.score.X === gb2.score.X && gb1.score.Y === gb2.score.Y);

  return { passed, failed, details };
}

// ---------------------------------------------------------------------------
// 11. DEMO — the blueprint's Step-1 test: run possessions and PRINT the court +
//     a player's verdict evolving as stats accumulate. Proves the loop, no UI.
// ---------------------------------------------------------------------------
export function runDemo(): void {
  // 5v5 (five scorers per side → realistic combined total). One tracked star on X
  // is set to OVERPERFORM his scoring par, so we watch his verdict climb from
  // below-the-court to beating-the-court as the game's stats accumulate — the
  // clearest possible proof of the live re-grade. Everyone else uses default
  // per-100 rates. Run to clock expiry (a full game), not a fixed cap.
  const X = makeLineup("X", [
    { id: "x1", archetype: "high_usage_star", name: "Star X" },
    { id: "x2", archetype: "scoring_guard", name: "Guard X" },
    { id: "x3", archetype: "spot_up_wing", name: "Wing X" },
    { id: "x4", archetype: "connector", name: "Conn X" },
    { id: "x5", archetype: "roll_big", name: "Roll X" },
  ]);
  const Y = makeLineup("Y", [
    { id: "y1", archetype: "rim_protector", name: "Big Y" },
    { id: "y2", archetype: "defensive_stopper", name: "Stop Y" },
    { id: "y3", archetype: "secondary_creator", name: "Creator Y" },
    { id: "y4", archetype: "screen_assist_big", name: "Screen Y" },
    { id: "y5", archetype: "low_usage_specialist", name: "Spec Y" },
  ]);
  // overperform the star: ~45 pts / 100 (par is 30), with extra creation
  X.slots[0].rates = { ...X.slots[0].rates, points: 0.45, assists: 0.1, fta: 0.11, fg3m: 0.04 };

  const settings: SimSettings = { possessionMode: "rate", progressionMode: "autoplay", openingOffense: "X" };

  console.log("\n=== PHASE 12 · STEP 1 DEMO — live court + verdict evolving over a full game ===");
  console.log("Mode: rate (deterministic) · 5v5 · tracking X1 high_usage_star (set to overperform) and Y1 rim_protector\n");

  let state = initGameState(X, Y, settings);
  const snapshots = new Set([1, 40, 80, 120]);
  const header =
    "poss  clock      score      | court: total/spac/poa/rim/syn/conf            | X1★ comp/conf  headline      | Y1⛨ comp/conf  headline";
  console.log(header);
  console.log("-".repeat(header.length));

  const printRow = () => {
    const g = gradeState(state);
    const gx = g.perPlayer.find((p) => p.slotId === "x1")!.verdict;
    const gy = g.perPlayer.find((p) => p.slotId === "y1")!.verdict;
    const c = state.court;
    const flip = gx.compositeCandidate > 0 ? "  ✔beats court" : "";
    const row =
      `${state.possessionCount.toString().padStart(4)}  ` +
      `${formatClock(state.clock).padEnd(9)} ` +
      `${Math.round(state.score.X)}-${Math.round(state.score.Y)}`.padEnd(10) + " | " +
      `${c.total.toFixed(1).padStart(5)}/${c.spacingScarcity.toFixed(2)}/${c.poaPressure.toFixed(2)}/${c.rimProtectionFaced.toFixed(2)}/${c.synergy.toFixed(2)}/${(c.confidence ?? 0).toFixed(2)}`.padEnd(44) + " | " +
      `${gx.compositeCandidate.toFixed(3)}/${gx.compositeConfidence.toFixed(2)}  ${(gx.headlineCategory ?? "—").padEnd(12)}`.padEnd(28) + " | " +
      `${gy.compositeCandidate.toFixed(3)}/${gy.compositeConfidence.toFixed(2)}  ${(gy.headlineCategory ?? "—")}${flip}`;
    console.log(row);
  };

  let step = 0;
  while (!state.gameOver && step < 5000) {
    state = advancePossession(state, settings);
    step += 1;
    if (snapshots.has(state.possessionCount)) printRow();
  }
  printRow(); // final possession

  // final readout: full per-player verdict + roll-up
  const finalGrade = gradeState(state);
  console.log(`\n--- FINAL @ poss ${state.possessionCount} (${formatClock(state.clock)}), score X ${Math.round(state.score.X)} – ${Math.round(state.score.Y)} Y ---`);
  console.log(`Derived court: "${state.court.label}"  total=${state.court.total}  confidence=${(state.court.confidence ?? 0).toFixed(2)}  (provenance=${state.court.provenance})`);
  for (const p of finalGrade.perPlayer) {
    const v = p.verdict;
    const drivers = v.drivers.map((d) => `${d.stat}(${d.contribution >= 0 ? "+" : ""}${d.contribution})`).join(", ");
    const beat = v.compositeCandidate > 0 ? "BEATS COURT" : "below court";
    console.log(`  ${p.side} ${(p.name ?? p.slotId).padEnd(10)} [${p.archetype.padEnd(20)}] comp=${v.compositeCandidate.toFixed(3).padStart(7)} conf=${v.compositeConfidence.toFixed(2)} → ${beat}`);
    console.log(`       headline=${v.headlineCategory ?? "—"}  drivers: ${drivers}`);
  }
  const rx = finalGrade.rollup.X, ry = finalGrade.rollup.Y;
  console.log(`  ROLLUP X: score=${Math.round(rx.score)} meanComp=${rx.meanComposite} meanConf=${rx.meanConfidence} beatingCourt=${rx.beatingCourt}/${rx.players}`);
  console.log(`  ROLLUP Y: score=${Math.round(ry.score)} meanComp=${ry.meanComposite} meanConf=${ry.meanConfidence} beatingCourt=${ry.beatingCourt}/${ry.players}`);
}

// ---------------------------------------------------------------------------
// CLI ENTRY (mirrors the other engine files): runs self-checks, then the demo.
// ---------------------------------------------------------------------------
const __isCliEntry =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  (process.argv[1] ?? "").replace(/\\/g, "/").endsWith("game-sim.ts");
if (__isCliEntry) {
  const r = runGameSimSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
  if (!process.argv.includes("--quiet")) runDemo();
}
