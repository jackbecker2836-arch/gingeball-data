// =============================================================================
// GINGEBALL COURT HANDICAP — ROSTER → ARCHETYPE MAP (Phase 12, Step 5)
//
// The prefill brain: turn a real player into a sim PlayerSlot (archetype +
// starting rates + name). Two honest entry points, because the app has two
// shapes of real data:
//
//   1. BOX-SCORE (players.js / HOC `PLAYERS_RAW`): per-game ppg/rpg/ast/stl/blk
//      + position. These convert cleanly to the sim's per-100 rates, so a slot
//      built this way carries the player's REAL scoring/passing/rebounding/
//      defense rates. The stats the box doesn't carry (turnovers, fouls, threes,
//      gravity, screen/rim-contest detail) fall back to the archetype's typical
//      defaults — flagged, not invented.
//
//   2. LEADERBOARD (Supabase `v_leaderboard`): position + TCV impact components
//      (no box counts). Enough to CLASSIFY an archetype; rates stay archetype-
//      typical. This is the "pull from the TCV leaderboard" path.
//
// Everything here is pure + synchronous so it unit-tests without a DB or DOM.
// Run the self-checks:
//   tsx --tsconfig tsconfig.check.json \
//     components/court-handicap/sim/roster-archetype-map.ts
//
// HONESTY: the classifier is a COARSE, transparent heuristic over position +
// a few rate signals — not a learned model. It is good enough to seed a sandbox
// and fully editable afterward (every slot's archetype + rates remain editable
// in the PlayerSlot UI). Calibrating archetype/rates to real outcomes is the
// same un-anchored frontier as the rest of the system (Gap D).
// =============================================================================

import {
  defaultRatesForArchetype,
  SIM_ARCHETYPES,
  type LineupState,
  type PlayerSlot,
  type Side,
} from "@/lib/sim/game-sim";
import type { StatId } from "@/lib/stat-par/stat-par";
import { getPlayerRates } from "@/lib/sim/sim-player-rates";
import { makeRoster } from "@/lib/sim/sim-subs";
import { lookupArchetype, profileToSim } from "./archetype-index";

const round = (x: number, dp = 4): number => { const f = 10 ** dp; return Math.round(x * f) / f; };

// ---------------------------------------------------------------------------
// 1. INPUT SHAPES
// ---------------------------------------------------------------------------

/** A per-game box-score row (from HOC `PLAYERS_RAW`). */
export interface RosterBox {
  name: string;
  season?: string;
  pos: string; // "PG"|"SG"|"SF"|"PF"|"C" (or "guard"|"wing"|"big")
  ppg: number; rpg: number; ast: number; stl: number; blk: number;
  gp?: number; mpg: number;
  teams?: string[]; // team abbrev(s) this season (>1 = mid-season trade)
}

/** A `v_leaderboard` row (TCV layer — position + impact components, no box counts). */
export interface LeaderboardRow {
  name: string;
  name_slug?: string;
  position?: string;
  pos_label?: string;
  tcv?: number | null; o_tcv?: number | null; d_tcv?: number | null;
  possessions?: number | null;
  iib?: number | null; pva?: number | null; sgv?: number | null; dsv?: number | null;
  cov?: number | null; sav?: number | null; miv?: number | null; rpv?: number | null;
  ptv?: number | null; dpc?: number | null; up?: number | null; cfp?: number | null;
}

export type PosGroup = "guard" | "wing" | "big";

/** Normalize a raw position to guard/wing/big (mirrors update_positions.py). */
export function posGroup(pos: string | undefined | null): PosGroup {
  const p = (pos ?? "").trim().toUpperCase();
  if (p === "GUARD" || p === "WING" || p === "BIG") return p.toLowerCase() as PosGroup;
  if (p === "PG" || p === "SG" || p === "G") return "guard";
  if (p === "SF" || p === "W" || p === "GF") return "wing";
  if (p === "PF" || p === "C" || p === "B" || p === "FC") return "big";
  return "guard";
}

// ---------------------------------------------------------------------------
// 2. ARCHETYPE CLASSIFIERS (coarse, position-aware heuristics)
// ---------------------------------------------------------------------------

/**
 * Classify a box-score row into one of the 10 sim archetypes. Thresholds are
 * per-game NBA-ish bands, tuned so familiar profiles land sensibly:
 *   Gobert/Lopez (rim, low usage) → rim_protector
 *   Jokić/Draymond (playmaking big) → screen_assist_big
 *   Curry/Edwards (high scoring) → high_usage_star
 *   LeBron (high-usage creating wing) → high_usage_star
 *   Jrue (secondary lead guard) → secondary_creator
 */
export function classifyBox(p: RosterBox): string {
  const g = posGroup(p.pos);
  const { ppg, ast, stl, blk } = p;

  if (g === "big") {
    if (blk >= 1.2 && ppg < 16 && ast < 3.5) return "rim_protector";
    if (ast >= 3.5) return "screen_assist_big"; // playmaking / hub big
    return "roll_big";
  }
  if (g === "guard") {
    if (ppg >= 22) return "high_usage_star";
    if (ast >= 6) return ppg >= 14 ? "secondary_creator" : "connector";
    if (stl >= 1.5 && ppg < 13) return "defensive_stopper";
    if (ppg < 10) return "low_usage_specialist";
    return "scoring_guard";
  }
  // wing
  if (ppg >= 20) return "high_usage_star";
  if (stl >= 1.4 && ppg < 14) return "defensive_stopper";
  if (ppg <= 12) return "spot_up_wing";
  if (ast >= 4.5) return "secondary_creator";
  return "spot_up_wing";
}

/**
 * Classify a leaderboard row using position + offense/defense lean + the
 * strongest TCV components. No box counts, so this only picks the archetype;
 * rates come from the archetype default.
 */
export function classifyLeaderboard(r: LeaderboardRow): string {
  const g = posGroup(r.position ?? r.pos_label);
  const o = r.o_tcv ?? 0, d = r.d_tcv ?? 0;
  const defLean = d > o;
  const v = (x: number | null | undefined) => x ?? 0;

  if (g === "big") {
    if (defLean && (v(r.rpv) > 0 || v(r.dpc) > 0 || v(r.dsv) > 0)) return "rim_protector";
    if (v(r.pva) > 0 && v(r.pva) >= v(r.sgv)) return "screen_assist_big";
    if (v(r.sgv) > 0 || v(r.iib) > 0) return "roll_big";
    return defLean ? "rim_protector" : "roll_big";
  }
  if (g === "guard") {
    if (v(r.tcv) >= 4 && o >= d) return "high_usage_star";
    if (v(r.pva) > 0 && v(r.pva) >= v(r.iib)) return "secondary_creator";
    if (defLean && (v(r.dsv) > 0 || v(r.dpc) > 0)) return "defensive_stopper";
    if (o < 0.5 && v(r.tcv) < 1.5) return "low_usage_specialist";
    return "scoring_guard";
  }
  // wing
  if (v(r.tcv) >= 4 && o >= d) return "high_usage_star";
  if (defLean && (v(r.dsv) > 0 || v(r.dpc) > 0)) return "defensive_stopper";
  if (v(r.ptv) > 0 && o <= 1.5) return "spot_up_wing";
  if (v(r.pva) > 0) return "secondary_creator";
  return "spot_up_wing";
}

// ---------------------------------------------------------------------------
// 3. BOX → PER-100 RATES
// ---------------------------------------------------------------------------
// The sim's rates are PER POSSESSION (an archetype baseline of 30 pts/100 is a
// rate of 0.30). A player's on-court possessions ≈ pace · (mpg/48); at a ~100
// pace that's ~100·mpg/48 of the player's own possessions per game. So:
//   per-possession rate = perGame · (48 / mpg) / 100
// We only have ppg/rpg/ast/stl/blk in the box; rebounds split ~25% off / 75% def.

export function ratesFromBox(p: RosterBox): Partial<Record<StatId, number>> {
  const mpg = Math.max(p.mpg ?? 0, 8); // floor so a tiny-minute line can't blow up
  const per = (perGame: number | undefined) => (perGame == null || !Number.isFinite(perGame) ? undefined : round((perGame * 48) / mpg / 100));
  const out: Partial<Record<StatId, number>> = {};
  const pts = per(p.ppg); if (pts != null) out.points = pts;
  const ast = per(p.ast); if (ast != null) out.assists = ast;
  const stl = per(p.stl); if (stl != null) out.steals = stl;
  const blk = per(p.blk); if (blk != null) out.blocks = blk;
  if (p.rpg != null && Number.isFinite(p.rpg)) {
    const reb = (p.rpg * 48) / mpg / 100;
    out.oreb = round(reb * 0.25);
    out.dreb = round(reb * 0.75);
  }
  return out;
}

// ---------------------------------------------------------------------------
// 4. PLAYER → SLOT  /  ROWS → LINEUP
// ---------------------------------------------------------------------------

/** Build a slot from a box row: classified archetype + REAL box rates layered
 *  over the archetype's typical defaults (so non-box stats stay sensible). */
export function slotFromBox(p: RosterBox, id: string): PlayerSlot {
  const rec = lookupArchetype(p.name);
  // Real archetype when the player is in the index; classifyBox guess otherwise.
  const archetype = rec ? profileToSim(rec.profile) : classifyBox(p);
  const rates = { ...defaultRatesForArchetype(archetype), ...ratesFromBox(p), ...(getPlayerRates(p.name) ?? {}) };
  const slot: PlayerSlot = { id, name: p.name, archetype, rates, accumulated: {} };
  if (rec) {
    slot.profile = rec.profile;
    slot.family = rec.family;
    slot.archetypeLabel = rec.label;
    slot.statusCap = rec.cap;
    if (rec.vector) slot.scoreVector = rec.vector;
  }
  return slot;
}

/** Build a slot from a leaderboard row: classified archetype + archetype-typical
 *  rates (the leaderboard carries no box counts). */
export function slotFromLeaderboard(r: LeaderboardRow, id: string): PlayerSlot {
  const archetype = classifyLeaderboard(r);
  return { id, name: r.name, archetype, rates: { ...defaultRatesForArchetype(archetype), ...(getPlayerRates(r.name) ?? {}) }, accumulated: {} };
}

export function lineupFromBox(players: RosterBox[], side: Side, idPrefix = side.toLowerCase()): LineupState {
  return { side, team: players[0]?.teams?.[0], slots: players.map((p, i) => slotFromBox(p, `${idPrefix}${i + 1}`)) };
}

export function lineupFromLeaderboard(rows: LeaderboardRow[], side: Side, idPrefix = side.toLowerCase()): LineupState {
  return { side, slots: rows.map((r, i) => slotFromLeaderboard(r, `${idPrefix}${i + 1}`)) };
}

// ---------------------------------------------------------------------------
// 5. HOC PLAYERS_RAW PARSER + PICKERS
// ---------------------------------------------------------------------------
// PLAYERS_RAW tuple: [0]name [1]season [2]pos [3]ppg [4]rpg [5]ast [6]stl [7]blk
//                    [8]gp [9]mpg [10]sal [11]sal_r [12]yr [13]dec [14]teams

export type HocTuple = [string, string, string, number, number, number, number, number, number, number, ...unknown[]];

export function parseHocRow(t: HocTuple): RosterBox {
  const teams = Array.isArray(t[14]) ? (t[14] as string[]) : undefined;
  return { name: t[0], season: t[1], pos: t[2], ppg: t[3], rpg: t[4], ast: t[5], stl: t[6], blk: t[7], gp: t[8], mpg: t[9], teams };
}

export function parseHocPlayersRaw(raw: HocTuple[]): RosterBox[] {
  return raw.map(parseHocRow);
}

/** Latest-season row per player name. */
export function latestByName(rows: RosterBox[]): Map<string, RosterBox> {
  const m = new Map<string, RosterBox>();
  for (const r of rows) {
    const prev = m.get(r.name);
    if (!prev || (r.season ?? "") > (prev.season ?? "")) m.set(r.name, r);
  }
  return m;
}

/** Pick named players (latest season, or a specific season) into a box list. */
export function pickBoxPlayers(rows: RosterBox[], names: string[], season?: string): RosterBox[] {
  const pool = season ? rows.filter((r) => r.season === season) : rows;
  const byName = season ? new Map(pool.map((r) => [r.name, r])) : latestByName(pool);
  const out: RosterBox[] = [];
  for (const n of names) { const r = byName.get(n); if (r) out.push(r); }
  return out;
}

// ---------------------------------------------------------------------------
// 7. SEARCH + TEAM ROSTERS  (real players & teams, usable in the sim)
// ---------------------------------------------------------------------------
// Resolution helpers for the sandbox UI: search a real player by name (with a
// season picker) or load a real team's rotation for a season. Lineups built
// here carry REAL box rates via slotFromBox. All pure over a parsed RosterBox[]
// — no DB, no DOM — so they unit-test alongside everything else.

/** Distinct seasons present, newest first (e.g. "2025-26" before "2024-25"). */
export function seasonsAvailable(rows: RosterBox[]): string[] {
  const set = new Set<string>();
  for (const r of rows) if (r.season) set.add(r.season);
  return [...set].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
}

/** Every season row for an exact player name, newest season first. */
export function playerSeasons(rows: RosterBox[], name: string): RosterBox[] {
  return rows
    .filter((r) => r.name === name)
    .sort((a, b) => ((a.season ?? "") < (b.season ?? "") ? 1 : (a.season ?? "") > (b.season ?? "") ? -1 : 0));
}

/**
 * Name search for a player picker. Case-insensitive substring match, one row
 * per matching player (their latest season as the default pick), ranked
 * name-startsWith first then by scoring. `limit` caps the dropdown size.
 */
export function searchPlayers(rows: RosterBox[], query: string, limit = 20): RosterBox[] {
  const q = query.trim().toLowerCase();
  if (q === "") return [];
  const latest = latestByName(rows);
  const hits = [...latest.values()].filter((r) => r.name.toLowerCase().includes(q));
  hits.sort((a, b) => {
    const as = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bs = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    if (as !== bs) return as - bs;
    return (b.ppg ?? 0) - (a.ppg ?? 0);
  });
  return hits.slice(0, limit);
}

/** Distinct team abbreviations that appear in a given season, alphabetical. */
export function teamsForSeason(rows: RosterBox[], season: string): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.season !== season) continue;
    for (const t of r.teams ?? []) set.add(t);
  }
  return [...set].sort();
}

/**
 * A team's roster for a season: every player who logged that season with that
 * team (a traded player appears for each of his teams), sorted by minutes
 * descending — so the top of the list is the rotation / likely starters.
 */
export function teamRoster(rows: RosterBox[], season: string, team: string): RosterBox[] {
  return rows
    .filter((r) => r.season === season && (r.teams ?? []).includes(team))
    .sort((a, b) => (b.mpg ?? 0) - (a.mpg ?? 0));
}

/**
 * Pick a sensible starting five from a team's roster. Starts from the top `n`
 * by minutes, then guarantees at least one big — on guard-heavy teams a center
 * can otherwise get squeezed out by higher-minute guards/wings (which is how you
 * end up with a wing "at center"). If the five has no big and the roster has one,
 * the lowest-minute non-big is swapped for the highest-minute big.
 */
export function startingFive(roster: RosterBox[], n = 5): RosterBox[] {
  const byMin = [...roster].sort((a, b) => (b.mpg ?? 0) - (a.mpg ?? 0));
  const five = byMin.slice(0, n);
  if (five.length < n) return five;
  if (!five.some((p) => posGroup(p.pos) === "big")) {
    const topBig = byMin.find((p) => posGroup(p.pos) === "big");
    if (topBig) {
      let idx = -1, lo = Infinity;
      five.forEach((p, i) => { if (posGroup(p.pos) !== "big" && (p.mpg ?? 0) < lo) { lo = p.mpg ?? 0; idx = i; } });
      if (idx >= 0) five[idx] = topBig;
    }
  }
  return five;
}

/**
 * The newest season that has the full complement of teams in the data — i.e. the
 * last COMPLETE season. The very newest season can be in-progress / partial (fewer
 * teams, thin rosters, missing stars), so this is the right default for "mirror a
 * real starting lineup". Falls back to the newest season if none look complete.
 */
export function latestCompleteSeason(rows: RosterBox[]): string {
  const seasons = seasonsAvailable(rows); // newest first
  if (seasons.length === 0) return "";
  const maxTeams = Math.max(...seasons.map((s) => teamsForSeason(rows, s).length));
  for (const s of seasons) if (teamsForSeason(rows, s).length >= maxTeams) return s;
  return seasons[0];
}

/**
 * Build a lineup from a real team-season: a sensible starting five (top minutes,
 * with a big guaranteed), each slot carrying REAL box rates (via slotFromBox).
 * Returns null if the team-season has no players (so the caller can fall back).
 */
export function lineupFromTeam(
  rows: RosterBox[], season: string, team: string, side: Side, n = 5,
): LineupState | null {
  const full = teamRoster(rows, season, team);          // all players, minutes desc
  const five = startingFive(full, n);                    // top 5 (guarantees a big)
  if (five.length === 0) return null;
  const base = { ...lineupFromBox(five, side), team };   // slots = starting five
  // build the 10-man bench: starters first, then the next-best by minutes
  const names = new Set(five.map((p) => p.name));
  const bench = full.filter((p) => !names.has(p.name)).slice(0, 5);
  const ranked = [...five, ...bench];
  const prefix = side.toLowerCase();
  const specs = ranked.map((p, i) => ({ slot: slotFromBox(p, `${prefix}${i + 1}`), pos: p.pos, mpg: p.mpg ?? 12 }));
  return { ...base, roster: makeRoster(specs) };
}

/**
 * The newest season in which `team` fielded at least `min` players — what a team
 * loader should default to. The very newest season in the data can be partial
 * (early-season / incomplete), which would otherwise yield a 3-man "roster". Falls
 * back to the team's newest non-empty season if none reach `min`; null if the team
 * never appears.
 */
export function defaultTeamSeason(rows: RosterBox[], team: string, min = 5): string | null {
  let newestAny: string | null = null;
  for (const s of seasonsAvailable(rows)) { // newest first
    const n = teamRoster(rows, s, team).length;
    if (n === 0) continue;
    if (newestAny === null) newestAny = s;
    if (n >= min) return s;
  }
  return newestAny;
}

// ---------------------------------------------------------------------------
// 6. SELF-CHECKS
// ---------------------------------------------------------------------------

export function runRosterMapSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) { passed++; details.push("  ok  " + n); } else { failed++; details.push("FAIL  " + n); } };
  const isArch = (a: string) => (SIM_ARCHETYPES as readonly string[]).includes(a);

  // posGroup
  check("posGroup PG/SG → guard", posGroup("PG") === "guard" && posGroup("SG") === "guard");
  check("posGroup SF → wing", posGroup("SF") === "wing");
  check("posGroup PF/C → big", posGroup("PF") === "big" && posGroup("C") === "big");
  check("posGroup passthrough guard/wing/big", posGroup("big") === "big" && posGroup("wing") === "wing");

  // classifyBox against real-ish profiles
  const gobert: RosterBox = { name: "Rudy Gobert", pos: "C", ppg: 10.9, rpg: 11.5, ast: 1.7, stl: 0.8, blk: 1.6, mpg: 31.3 };
  const jokic: RosterBox = { name: "Nikola Jokic", pos: "C", ppg: 29.6, rpg: 13, ast: 10.2, stl: 1.8, blk: 0.7, mpg: 35 };
  const curry: RosterBox = { name: "Stephen Curry", pos: "PG", ppg: 26.6, rpg: 3.6, ast: 4.7, stl: 1.1, blk: 0.4, mpg: 30.9 };
  const lebron: RosterBox = { name: "LeBron James", pos: "SF", ppg: 20.9, rpg: 6.1, ast: 7.2, stl: 1.2, blk: 0.6, mpg: 33.1 };
  const jrue: RosterBox = { name: "Jrue Holiday", pos: "PG", ppg: 16.3, rpg: 4.6, ast: 6.1, stl: 1.0, blk: 0.1, mpg: 29.4 };
  const threeDWing: RosterBox = { name: "3&D Wing", pos: "SF", ppg: 8.5, rpg: 3.5, ast: 1.5, stl: 1.6, blk: 0.4, mpg: 26 };
  const benchGuard: RosterBox = { name: "Bench Guard", pos: "SG", ppg: 6.2, rpg: 1.8, ast: 1.3, stl: 0.5, blk: 0.1, mpg: 14 };

  check("Gobert → rim_protector", classifyBox(gobert) === "rim_protector");
  check("Jokić (playmaking big) → screen_assist_big", classifyBox(jokic) === "screen_assist_big");
  check("Curry → high_usage_star", classifyBox(curry) === "high_usage_star");
  check("LeBron (creating wing) → high_usage_star", classifyBox(lebron) === "high_usage_star");
  check("Jrue → secondary_creator", classifyBox(jrue) === "secondary_creator");
  check("3&D wing → defensive_stopper", classifyBox(threeDWing) === "defensive_stopper");
  check("low-usage bench guard → low_usage_specialist", classifyBox(benchGuard) === "low_usage_specialist");
  check("every classifyBox result is a real archetype", [gobert, jokic, curry, lebron, jrue, threeDWing, benchGuard].every((p) => isArch(classifyBox(p))));

  // ratesFromBox math + scale
  const r = ratesFromBox(curry);
  check("points rate ≈ perGame·48/mpg/100", Math.abs((r.points ?? 0) - round((26.6 * 48) / 30.9 / 100)) < 1e-6);
  check("points rate in sane per-poss band (0.2..0.6)", (r.points ?? 0) > 0.2 && (r.points ?? 0) < 0.6);
  check("rebounds split off/def 25/75", r.oreb != null && r.dreb != null && Math.abs(r.dreb / (r.oreb + r.dreb) - 0.75) < 0.02);
  check("low-mpg line is floored (no blowup)", (ratesFromBox({ ...benchGuard, mpg: 1 }).points ?? 0) < 0.8);

  // slotFromBox: real rates over archetype defaults
  const slot = slotFromBox(curry, "x1");
  check("slot archetype set", slot.archetype === "high_usage_star");
  check("slot points reflect real-rate precedence (measured > box > default)", slot.rates.points === (getPlayerRates(curry.name)?.points ?? r.points));
  check("slot keeps archetype-default non-box stat (turnovers)", slot.rates.turnovers != null);
  check("slot name carried", slot.name === "Stephen Curry");
  check("slot accumulated empty", Object.keys(slot.accumulated).length === 0);

  // lineup builder
  const lu = lineupFromBox([curry, lebron, jokic, gobert, jrue], "X");
  check("lineup has 5 slots", lu.slots.length === 5);
  check("lineup ids unique", new Set(lu.slots.map((s) => s.id)).size === 5);

  // leaderboard classifier (synthetic rows)
  const lbBigDef: LeaderboardRow = { name: "D Big", position: "C", tcv: 3, o_tcv: 0.5, d_tcv: 2.5, rpv: 1.2, dpc: 0.8 };
  const lbStarG: LeaderboardRow = { name: "Star G", position: "PG", tcv: 6, o_tcv: 5, d_tcv: 1, iib: 2 };
  const lbShooter: LeaderboardRow = { name: "Shooter", position: "SF", tcv: 1, o_tcv: 1, d_tcv: 0.2, ptv: 1.5 };
  check("leaderboard def big → rim_protector", classifyLeaderboard(lbBigDef) === "rim_protector");
  check("leaderboard high-tcv guard → high_usage_star", classifyLeaderboard(lbStarG) === "high_usage_star");
  check("leaderboard low-usage shooter wing → spot_up_wing", classifyLeaderboard(lbShooter) === "spot_up_wing");
  check("slotFromLeaderboard uses archetype-default rates", JSON.stringify(slotFromLeaderboard(lbStarG, "y1").rates) === JSON.stringify(defaultRatesForArchetype("high_usage_star")));

  // parser
  const tuple = ["Test Guy", "2024-25", "SG", 18.0, 4.0, 3.0, 1.0, 0.4, 70, 30, 5, null, 2024, "2020s", ["XYZ"]] as HocTuple;
  const parsed = parseHocRow(tuple);
  check("parseHocRow maps tuple indices", parsed.name === "Test Guy" && parsed.ppg === 18 && parsed.mpg === 30 && parsed.pos === "SG");

  // pickers
  const rows: RosterBox[] = [
    { name: "A", season: "2023-24", pos: "PG", ppg: 10, rpg: 2, ast: 4, stl: 1, blk: 0, mpg: 25 },
    { name: "A", season: "2024-25", pos: "PG", ppg: 20, rpg: 3, ast: 6, stl: 1, blk: 0, mpg: 32 },
    { name: "B", season: "2024-25", pos: "C", ppg: 12, rpg: 10, ast: 1, stl: 0.5, blk: 2, mpg: 28 },
  ];
  check("latestByName picks newest season", latestByName(rows).get("A")?.season === "2024-25");
  check("pickBoxPlayers honors order + names", pickBoxPlayers(rows, ["B", "A"]).map((p) => p.name).join(",") === "B,A");

  // search + team rosters (real players & teams)
  const tr: RosterBox[] = [
    { name: "Star A", season: "2024-25", pos: "PG", ppg: 28, rpg: 4, ast: 8, stl: 1.2, blk: 0.3, mpg: 35, teams: ["DEN"] },
    { name: "Star A", season: "2025-26", pos: "PG", ppg: 30, rpg: 4, ast: 9, stl: 1.1, blk: 0.2, mpg: 36, teams: ["DEN"] },
    { name: "Big B",  season: "2025-26", pos: "C",  ppg: 14, rpg: 11, ast: 2, stl: 0.6, blk: 2.1, mpg: 32, teams: ["DEN"] },
    { name: "Wing C", season: "2025-26", pos: "SF", ppg: 9, rpg: 3, ast: 1.5, stl: 1.5, blk: 0.3, mpg: 20, teams: ["DEN"] },
    { name: "Role D", season: "2025-26", pos: "SG", ppg: 7, rpg: 2, ast: 2, stl: 0.6, blk: 0.1, mpg: 14, teams: ["DEN"] },
    { name: "Trade E", season: "2025-26", pos: "PF", ppg: 12, rpg: 6, ast: 2, stl: 0.7, blk: 0.5, mpg: 28, teams: ["ORL", "DEN"] },
    { name: "Other F", season: "2025-26", pos: "C",  ppg: 18, rpg: 9, ast: 3, stl: 0.5, blk: 1.0, mpg: 30, teams: ["BOS"] },
  ];
  check("seasonsAvailable newest first", JSON.stringify(seasonsAvailable(tr)) === JSON.stringify(["2025-26", "2024-25"]));
  check("playerSeasons newest first", playerSeasons(tr, "Star A").map((r) => r.season).join(",") === "2025-26,2024-25");
  check("searchPlayers matches case-insensitive substring", searchPlayers(tr, "star").some((r) => r.name === "Star A"));
  check("searchPlayers returns latest season per player", searchPlayers(tr, "star a")[0]?.season === "2025-26");
  check("searchPlayers empty query → []", searchPlayers(tr, "  ").length === 0);
  check("teamsForSeason lists distinct teams incl trade", JSON.stringify(teamsForSeason(tr, "2025-26")) === JSON.stringify(["BOS", "DEN", "ORL"]));
  check("teamRoster sorted by minutes desc", teamRoster(tr, "2025-26", "DEN").map((r) => r.name)[0] === "Star A");
  check("teamRoster includes a traded player for each team", teamRoster(tr, "2025-26", "ORL").some((r) => r.name === "Trade E") && teamRoster(tr, "2025-26", "DEN").some((r) => r.name === "Trade E"));
  const teamLu = lineupFromTeam(tr, "2025-26", "DEN", "X", 5);
  check("lineupFromTeam builds top-5 by minutes with real rates", teamLu != null && teamLu.slots.length === 5 && teamLu.slots[0].name === "Star A" && teamLu.slots[0].rates.points != null);
  check("lineupFromTeam unknown team → null", lineupFromTeam(tr, "2025-26", "ZZZ", "X") === null);

  // defaultTeamSeason: skip a partial newest season for a full older one
  const tp: RosterBox[] = [
    ...Array.from({ length: 2 }, (_, i) => ({ name: `New${i}`, season: "2025-26", pos: "PG", ppg: 10, rpg: 2, ast: 3, stl: 1, blk: 0, mpg: 20, teams: ["ZZ"] })),
    ...Array.from({ length: 6 }, (_, i) => ({ name: `Old${i}`, season: "2024-25", pos: "PG", ppg: 10, rpg: 2, ast: 3, stl: 1, blk: 0, mpg: 20, teams: ["ZZ"] })),
  ];
  check("defaultTeamSeason skips a partial newest season for a full older one", defaultTeamSeason(tp, "ZZ", 5) === "2024-25");
  check("defaultTeamSeason falls back to newest non-empty if none reach min", defaultTeamSeason(tp, "ZZ", 99) === "2025-26");
  check("defaultTeamSeason unknown team → null", defaultTeamSeason(tp, "NOPE") === null);

  // startingFive: guarantee a big when minutes squeeze it out
  const sfRoster: RosterBox[] = [
    { name: "G1", season: "2024-25", pos: "PG", ppg: 25, rpg: 3, ast: 7, stl: 1, blk: 0, mpg: 36, teams: ["ZZ"] },
    { name: "G2", season: "2024-25", pos: "SG", ppg: 18, rpg: 3, ast: 4, stl: 1, blk: 0, mpg: 34, teams: ["ZZ"] },
    { name: "W1", season: "2024-25", pos: "SF", ppg: 15, rpg: 5, ast: 3, stl: 1, blk: 0, mpg: 33, teams: ["ZZ"] },
    { name: "G3", season: "2024-25", pos: "PG", ppg: 12, rpg: 2, ast: 5, stl: 1, blk: 0, mpg: 31, teams: ["ZZ"] },
    { name: "W2", season: "2024-25", pos: "SF", ppg: 10, rpg: 4, ast: 2, stl: 1, blk: 0, mpg: 29, teams: ["ZZ"] },
    { name: "BIG", season: "2024-25", pos: "C", ppg: 9, rpg: 8, ast: 1, stl: 0.5, blk: 1.5, mpg: 27, teams: ["ZZ"] },
  ];
  const sf = startingFive(sfRoster, 5);
  check("startingFive injects a big when top-5-by-min has none", sf.some((p) => p.name === "BIG"));
  check("startingFive drops the lowest-minute non-big to fit the big", !sf.some((p) => p.name === "W2"));
  check("startingFive no-op when a big is already in the five", startingFive([sfRoster[5], sfRoster[0], sfRoster[1], sfRoster[2], sfRoster[3]], 5).some((p) => p.name === "BIG"));

  // latestCompleteSeason: skip a season that's missing teams
  const lc: RosterBox[] = [
    { name: "a", season: "2025-26", pos: "PG", ppg: 1, rpg: 1, ast: 1, stl: 0, blk: 0, mpg: 10, teams: ["AA"] },
    { name: "b", season: "2024-25", pos: "PG", ppg: 1, rpg: 1, ast: 1, stl: 0, blk: 0, mpg: 10, teams: ["AA"] },
    { name: "c", season: "2024-25", pos: "C", ppg: 1, rpg: 1, ast: 1, stl: 0, blk: 0, mpg: 10, teams: ["BB"] },
  ];
  check("latestCompleteSeason skips a season missing teams", latestCompleteSeason(lc) === "2024-25");

  return { passed, failed, details };
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------
const isMain = (() => {
  try { return typeof process !== "undefined" && Array.isArray(process.argv) && /roster-archetype-map\.ts$/.test(process.argv[1] ?? ""); }
  catch { return false; }
})();
if (isMain) {
  const res = runRosterMapSelfChecks();
  // eslint-disable-next-line no-console
  console.log(res.details.join("\n"));
  // eslint-disable-next-line no-console
  console.log(`\n${res.passed} passed, ${res.failed} failed`);
  if (res.failed > 0) process.exitCode = 1;
}
