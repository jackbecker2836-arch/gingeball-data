// ===========================================================================
// sim-subs.ts — 10-man rotation, fatigue, foul-out, and coach logic.
//
// The engine plays 5-on-5. This module is the bench: it owns each team's full
// roster, tracks minutes / stamina / fouls per player, and between possessions
// decides who is on the floor like a coach would — resting tired or foul-troubled
// players, riding starters in crunch time, emptying the bench in a blowout.
//
// Integration is OPTIONAL and backward-compatible: if a GameState has no
// `rosters`, nothing here runs and the game stays a fixed 5-man lineup. When a
// real team is loaded, `lineupFromTeam` attaches a TeamRoster and the engine
// calls `applySubstitutions` after each possession.
//
// Personal fouls live in slot.accumulated.fouls (the engine tags every foul —
// shooting, non-shooting, offensive — there), so foul-out = fouls >= 6.
// ===========================================================================
import type { PlayerSlot, GameState, Side } from "./game-sim";

export interface RosterPlayer extends PlayerSlot {
  pos: string;             // PG/SG/SF/PF/C
  mpgTarget: number;       // target minutes this game (team sums to ~240)
  secondsPlayed: number;   // court time accrued
  stamina: number;         // 1 fresh .. 0 gassed
  onCourt: boolean;
  enteredAtSec: number;    // game-seconds elapsed when last subbed in (hysteresis)
  benchedForFouls: boolean; // sat for foul trouble; clears at the next quarter
}

export interface TeamRoster { players: RosterPlayer[]; }

export interface SubEvent { side: Side; out: string; in: string; reason: string; }

// ---- tunables (measured to give ~5-7 min stints, realistic minute splits) ---
const DRAIN_PER_SEC = 0.00115;   // stamina lost per court-second
const RECOVER_PER_SEC = 0.00230; // stamina regained per bench-second
const TIRED = 0.42;              // below this, a player wants a rest
const RESTED = 0.72;             // a bench player this fresh is sub-ready
const HYSTERESIS_SEC = 150;       // don't pull a player who just checked in
const FOUL_OUT = 6;

const REGULATION_Q = 720, OT_Q = 300;
const posGroup = (pos: string): "g" | "w" | "b" =>
  /pg|sg|guard/i.test(pos) ? "g" : /sf|wing/i.test(pos) ? "w" : "b";

/** Total game-seconds elapsed (monotonic across quarters / OT). */
function elapsedSec(quarter: number, secsLeft: number): number {
  let e = 0;
  for (let q = 1; q < quarter; q++) e += q <= 4 ? REGULATION_Q : OT_Q;
  const cur = quarter <= 4 ? REGULATION_Q : OT_Q;
  return e + (cur - secsLeft);
}

const pf = (p: RosterPlayer): number => p.accumulated.fouls ?? 0;
const onPace = (p: RosterPlayer, frac: number): number =>
  // >0 = ahead of minutes pace (played more than target so far), <0 = behind
  p.secondsPlayed - p.mpgTarget * 60 * frac;

/** Build a normalized 10-man roster from ranked slots (mpg desc). */
export function makeRoster(specs: { slot: PlayerSlot; pos: string; mpg: number }[]): TeamRoster {
  const top = specs.slice(0, 10);
  // normalize minutes to a 240-minute team budget, capped 8..38
  const raw = top.map((s) => Math.min(38, Math.max(8, s.mpg)));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const players: RosterPlayer[] = top.map((s, i) => ({
    ...s.slot,
    pos: s.pos,
    mpgTarget: (raw[i] / sum) * 240,
    secondsPlayed: 0,
    stamina: 1,
    onCourt: i < 5,
    enteredAtSec: 0,
    benchedForFouls: false,
  }));
  return { players };
}

// ---- replacement picker -----------------------------------------------------
function eligibleBench(r: TeamRoster): RosterPlayer[] {
  return r.players.filter((p) => !p.onCourt && pf(p) < FOUL_OUT);
}
function bigsOnCourt(r: TeamRoster): number {
  return r.players.filter((p) => p.onCourt && posGroup(p.pos) === "b").length;
}
function guardsOnCourt(r: TeamRoster): number {
  return r.players.filter((p) => p.onCourt && posGroup(p.pos) === "g").length;
}
/** Best bench player to replace `out`: prefer same position group, then fresher
 *  + further behind minutes pace; never strand the team without a big/guard. */
function pickReplacement(r: TeamRoster, out: RosterPlayer, frac: number, avoidFouls: boolean): RosterPlayer | null {
  let cands = eligibleBench(r);
  if (avoidFouls) cands = cands.filter((p) => pf(p) < 5) ;
  if (cands.length === 0) cands = eligibleBench(r);
  if (cands.length === 0) return null;
  const outGroup = posGroup(out.pos);
  const keepBig = bigsOnCourt(r) - (outGroup === "b" ? 1 : 0) < 1;
  const keepGuard = guardsOnCourt(r) - (outGroup === "g" ? 1 : 0) < 1;
  const score = (p: RosterPlayer): number => {
    let s = 0;
    if (posGroup(p.pos) === outGroup) s += 3;
    if (keepBig && posGroup(p.pos) === "b") s += 5;
    if (keepGuard && posGroup(p.pos) === "g") s += 5;
    s += p.stamina * 1.5;            // fresher is better
    s += -onPace(p, frac) / 600;     // further behind pace is better
    s += (pf(p) >= 5 ? -4 : 0);
    return s;
  };
  return cands.slice().sort((a, b) => score(b) - score(a))[0] ?? null;
}

function swap(r: TeamRoster, out: RosterPlayer, inn: RosterPlayer, gameSec: number, reason: string, events: SubEvent[], side: Side): void {
  out.onCourt = false;
  inn.onCourt = true;
  inn.enteredAtSec = gameSec;
  events.push({ side, out: out.name ?? out.id, in: inn.name ?? inn.id, reason });
}

// ---- the coach -------------------------------------------------------------
interface Ctx { quarter: number; secsLeft: number; gameSec: number; frac: number; margin: number; }

function decideSubs(r: TeamRoster, side: Side, ctx: Ctx, prevQuarter: number): SubEvent[] {
  const events: SubEvent[] = [];
  const newQuarter = ctx.quarter !== prevQuarter;
  if (newQuarter) for (const p of r.players) p.benchedForFouls = false; // foul trouble resets

  const crunch = ctx.quarter >= 4 && ctx.secsLeft <= 360 && Math.abs(ctx.margin) <= 12;
  const blowout = ctx.quarter >= 4 && ((ctx.secsLeft <= 300 && Math.abs(ctx.margin) >= 22) || Math.abs(ctx.margin) >= 30);

  // (1) FOUL-OUTS — always forced.
  for (const p of r.players.filter((p) => p.onCourt && pf(p) >= FOUL_OUT)) {
    const rep = pickReplacement(r, p, ctx.frac, false);
    if (rep) swap(r, p, rep, ctx.gameSec, "fouled out", events, side);
  }

  // (2) CRUNCH TIME — best available 5 (the closers) regardless of rest.
  if (crunch && !blowout) {
    const closers = r.players.filter((p) => pf(p) < FOUL_OUT)
      .sort((a, b) => b.mpgTarget - a.mpgTarget).slice(0, 5);
    const want = new Set(closers.map((p) => p.id));
    for (const onc of r.players.filter((p) => p.onCourt && !want.has(p.id))) {
      const inn = closers.find((p) => !p.onCourt);
      if (inn) swap(r, onc, inn, ctx.gameSec, "crunch-time closer", events, side);
    }
    return events; // stars stay; skip rest/foul-trouble logic
  }

  // (3) BLOWOUT — empty the bench, rest the starters.
  if (blowout) {
    const deep = r.players.filter((p) => pf(p) < FOUL_OUT)
      .sort((a, b) => a.mpgTarget - b.mpgTarget).slice(0, 5); // lowest-minute guys
    const want = new Set(deep.map((p) => p.id));
    for (const onc of r.players.filter((p) => p.onCourt && !want.has(p.id))) {
      const inn = deep.find((p) => !p.onCourt);
      if (inn && ctx.gameSec - onc.enteredAtSec > 20) swap(r, onc, inn, ctx.gameSec, "garbage time", events, side);
    }
    return events;
  }

  // (4) FOUL TROUBLE — sit a player with quarter+1 fouls before Q4.
  if (ctx.quarter <= 3) {
    const limit = ctx.quarter + 1; // Q1:2, Q2:3, Q3:4
    for (const p of r.players.filter((p) => p.onCourt && pf(p) >= limit && !p.benchedForFouls)) {
      const rep = pickReplacement(r, p, ctx.frac, true);
      if (rep) { p.benchedForFouls = true; swap(r, p, rep, ctx.gameSec, `${pf(p)} fouls — sit`, events, side); }
    }
  }

  // (5) FATIGUE — one sub per whistle. Stars push deeper before resting, so the
  //     minute split stays realistic (starters ~32-36, bench ~12-22).
  const restAt = (p: RosterPlayer): number => (p.mpgTarget >= 30 ? 0.30 : p.mpgTarget >= 20 ? 0.40 : 0.48);
  const fresh = (p: RosterPlayer) => p.onCourt && !p.benchedForFouls && ctx.gameSec - p.enteredAtSec > HYSTERESIS_SEC;
  const gassed = r.players.filter((p) => fresh(p) && p.stamina < restAt(p)).sort((a, b) => a.stamina - b.stamina);
  if (gassed.length) {
    const out = gassed[0], grp = posGroup(out.pos);
    const bench = eligibleBench(r).filter((p) => p.stamina > RESTED && !p.benchedForFouls);
    if (bench.length) {
      const inn = bench.sort((a, b) => {
        const ga = posGroup(a.pos) === grp ? 1 : 0, gb = posGroup(b.pos) === grp ? 1 : 0;
        if (ga !== gb) return gb - ga;
        return onPace(a, ctx.frac) - onPace(b, ctx.frac); // most behind pace first
      })[0];
      const wouldStrandBig = grp === "b" && posGroup(inn.pos) !== "b" && bigsOnCourt(r) <= 1;
      if (!wouldStrandBig) { swap(r, out, inn, ctx.gameSec, "rest", events, side); return events; }
    }
  }
  // (5b) bring a rested starter back for an over-pace / tired bench player (rare)
  const backStarter = eligibleBench(r).filter((p) => p.stamina > 0.85 && onPace(p, ctx.frac) < -210)
    .sort((a, b) => onPace(a, ctx.frac) - onPace(b, ctx.frac))[0];
  if (backStarter) {
    const grp = posGroup(backStarter.pos);
    const out = r.players.filter((p) => fresh(p) && (onPace(p, ctx.frac) > 150 || p.stamina < 0.6))
      .sort((a, b) => onPace(b, ctx.frac) - onPace(a, ctx.frac))[0];
    if (out) {
      const wouldStrandBig = posGroup(out.pos) === "b" && grp !== "b" && bigsOnCourt(r) <= 1;
      if (!wouldStrandBig) swap(r, out, backStarter, ctx.gameSec, "rotation", events, side);
    }
  }
  return events;
}

// ---- public: applied by the engine after each possession -------------------
let _prevQuarter: Record<Side, number> = { X: 1, Y: 1 };

/** Sync the just-played possession into the rosters, age stamina/minutes, run
 *  the coach, and return the new on-court 5 for each side (as plain slots). */
export function applySubstitutions(state: GameState, lengthSec: number): { X: PlayerSlot[]; Y: PlayerSlot[]; subs: SubEvent[] } {
  const subs: SubEvent[] = [];
  const out: { X: PlayerSlot[]; Y: PlayerSlot[] } = { X: state.X.slots, Y: state.Y.slots };
  const quarter = state.clock.quarter, secsLeft = state.clock.secondsRemaining;
  const gameSec = elapsedSec(quarter, secsLeft);

  for (const side of ["X", "Y"] as Side[]) {
    const roster = state.rosters?.[side];
    if (!roster) continue;
    const active = state[side].slots;
    // 1) sync engine-updated accumulated (incl. fouls) back into the roster
    for (const slot of active) {
      const rp = roster.players.find((p) => p.id === slot.id);
      if (!rp) continue;
      rp.accumulated = slot.accumulated;
      rp.secondsPlayed += lengthSec;
      rp.stamina = Math.max(0, rp.stamina - lengthSec * DRAIN_PER_SEC);
    }
    // 2) bench recovers
    for (const rp of roster.players) if (!rp.onCourt) rp.stamina = Math.min(1, rp.stamina + lengthSec * RECOVER_PER_SEC);
    // 3) coach decisions
    const frac = Math.min(1, gameSec / 2880);
    const margin = state.score[side] - state.score[side === "X" ? "Y" : "X"];
    const ev = decideSubs(roster, side, { quarter, secsLeft, gameSec, frac, margin }, _prevQuarter[side]);
    _prevQuarter[side] = quarter;
    subs.push(...ev);
    // 4) new on-court 5 (stamina rides on the slot so the engine can read it)
    out[side] = roster.players.filter((p) => p.onCourt);
  }
  return { X: out.X, Y: out.Y, subs };
}

/** Reset the per-game quarter tracker (call from initGameState). */
export function resetSubsTracker(): void { _prevQuarter = { X: 1, Y: 1 }; }

/** A readable minutes/foul box for one team (debug / box score). */
export function rosterBox(r: TeamRoster): { name: string; min: number; pf: number; stamina: number }[] {
  return r.players.map((p) => ({ name: p.name ?? p.id, min: Math.round(p.secondsPlayed / 60), pf: pf(p), stamina: Math.round(p.stamina * 100) / 100 }))
    .sort((a, b) => b.min - a.min);
}
