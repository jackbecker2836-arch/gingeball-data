// =============================================================================
// GINGEBALL — SIM PLAY FEED (Phase 12, Step 4)
//
// Turns a possession into a named, data-driven play-by-play event:
//   "Shai Gilgeous-Alexander: drives, 6-ft layup, contested by Jrue Holiday -> GOOD [AND-1]"
//
// All flavor is read from real 2024-25 per-player profiles (sim-shot-profiles.ts):
// shot-zone mix, FG% by zone, assisted%, drive rate, putback/and-1 rates, openness,
// rim defense, assist totals. Variable possession length + a transition efficiency
// bump come from the 2024-25 team start-type table (league averages).
//
// This module is engine-agnostic: it takes plain name arrays + a seeded rng and
// returns a structured Play (incl. per-player box-score deltas). game-sim wires it
// into advancePossession and appends each Play to game.log.
// =============================================================================

import { SHOT_PROFILES, type ShotProfile } from "./sim-shot-profiles";

// ---- variable possession length, from the 2024-25 start-type table -----------
// "Pace Off X" in that table = avg possession LENGTH in seconds. League averages:
export type StartType = "make" | "miss" | "steal" | "deadball" | "ft";
export const SECONDS_BY_START: Record<StartType, number> = {
  steal: 8,    // off a live-ball turnover -> fast break (fastest)
  miss: 11,    // off a defensive rebound -> semi-transition
  make: 18,    // after opponent made FG -> walk it up (slowest)
  deadball: 16,
  ft: 16,
};
// Off-steal PPP ~1.32 vs overall ~1.15 -> transition shots fall a bit more often.
export const TRANSITION_MAKE_BONUS: Record<StartType, number> = {
  steal: 0.06, miss: 0.03, make: 0, deadball: 0, ft: 0,
};

// ---- structured play ---------------------------------------------------------
export interface BoxLine { pts: number; fgm: number; fga: number; tpm: number; tpa: number; ftm: number; fta: number; ast: number; pf?: number; }
export interface Play {
  shooter: string;
  zone: "rim" | "mid" | "three";
  dist: number | null;          // feet; null on dunks
  made: boolean;
  points: number;               // field-goal points (FT added via box)
  ftm: number;                  // free throws made on this play
  fta: number;                  // free throws attempted on this play
  assister: string | null;
  defender: string | null;      // null = open / uncontested
  andOne: boolean;
  fastbreak: boolean;
  startType: StartType;
  label: string;                // full play-by-play string
  box: Record<string, Partial<BoxLine>>;  // per-player counting-stat deltas
}

// ---- profile lookup ----------------------------------------------------------
export function normName(s: string): string {
  return s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[.'`’]/g, "").replace(/\s+/g, " ").trim();
}
const DEFAULT: ShotProfile = {
  name: "", fga: 0, rim: 0.4, mid: 0.25, three: 0.35, fgRim: 0.6, fgMid: 0.4, fgThree: 0.35,
  ast2: 0.5, ast3: 0.85, putback: 0.05, usage: 12, open: 0.5, drive: 0.3, big: 0,
  defRim: 0.6, blocks: 0, steals: 0, ast: 0, ftPct: 0.77, foulDrawn: 0.08,
};
export function profileFor(name: string): ShotProfile {
  return SHOT_PROFILES[normName(name)] ?? { ...DEFAULT, name };
}

// ---- weighted pick on a seeded rng ------------------------------------------
function pick<T>(items: T[], weights: number[], rng: () => number): T {
  const tot = weights.reduce((a, b) => a + b, 0);
  if (tot <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * tot;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

function distanceFor(zone: "rim" | "mid" | "three", rng: () => number): number {
  if (zone === "rim") return 1 + Math.floor(rng() * 9);          // 1-9 ft
  if (zone === "mid") return 10 + Math.floor(rng() * 13);        // 10-22 ft
  return [22, 23, 24, 24, 25, 25, 26, 27][Math.floor(rng() * 8)]; // three
}

// ---- the core: one possession -> one Play -----------------------------------
export function generatePlay(
  offNames: string[], defNames: string[], startType: StartType, rng: () => number,
): Play {
  const off = offNames.map(profileFor), def = defNames.map(profileFor);
  const p = pick(off, off.map((x) => Math.max(x.usage, 1)), rng);

  // zone
  const r = rng();
  const zone: Play["zone"] = r < p.rim ? "rim" : r < p.rim + p.mid ? "mid" : "three";
  const baseFg = zone === "rim" ? p.fgRim : zone === "mid" ? p.fgMid : p.fgThree;
  const fastbreak = startType === "steal" || startType === "miss";
  const made = rng() < baseFg + TRANSITION_MAKE_BONUS[startType];
  let assisted = rng() < (zone === "three" ? p.ast3 : p.ast2);

  // descriptor + dunk/dist
  let desc: string, dunk = false, dist: number | null = null;
  if (zone === "rim") {
    if (rng() < p.putback) { dunk = p.big === 1 && rng() < 0.6; desc = "putback " + (dunk ? "dunk" : "layup"); assisted = false; }
    else if (rng() < p.drive) { dunk = (p.big === 1 && rng() < 0.55) || rng() < 0.12; desc = "drives, " + (dunk ? "dunk" : "layup"); assisted = false; }
    else if (p.big === 1 && !assisted) { dunk = rng() < 0.3; desc = "backs down, " + (dunk ? "dunk" : "finish"); }
    else desc = (assisted ? "cuts, " : "") + "layup";
    if (!dunk) dist = distanceFor("rim", rng);
  } else if (zone === "mid") {
    desc = (assisted ? "catch-and-shoot" : "pull-up") + " mid"; dist = distanceFor("mid", rng);
  } else {
    desc = assisted ? "catch-and-shoot three" : (rng() < 0.5 ? "step-back three" : "pull-up three");
    dist = distanceFor("three", rng);
  }
  if (fastbreak && (desc.includes("drives") || desc.includes("layup")) && rng() < 0.5) desc = "transition " + desc;

  // open? -> no defender. else pick a contester.
  const isOpen = rng() < p.open;
  let defender: string | null = null;
  if (!isOpen) {
    const w = zone === "rim"
      ? def.map((m) => m.blocks * 2 + m.big * 1.5 + (1 - m.defRim) + 0.2)
      : def.map((m) => m.steals + (1 - m.big) * 1.0 + 0.3);
    defender = pick(def, w, rng).name;
  }

  // assister (only on assisted makes)
  let assister: string | null = null;
  if (assisted) {
    const mates = off.filter((m) => m !== p);
    if (mates.length) assister = pick(mates, mates.map((m) => Math.max(m.ast, 1)), rng).name;
  }

  const points = made ? (zone === "three" ? 3 : 2) : 0;
  const andOne = made && zone === "rim" && rng() < p.foulDrawn;
  const ftm = andOne ? (rng() < p.ftPct ? 1 : 0) : 0;
  const fta = andOne ? 1 : 0;

  // label
  const dpart = dist != null ? `${dist}-ft ` : "";
  let label = `${p.name}: ${dpart}${desc}`;
  if (assister && made) label += ` (assisted by ${assister})`;
  if (defender) label += `, contested by ${defender}`;
  label += `  ->  ${made ? "GOOD" : "miss"}`;
  if (andOne) label += " [AND-1]";

  // box-score deltas
  const box: Record<string, Partial<BoxLine>> = {};
  const add = (n: string, d: Partial<BoxLine>) => {
    const b = (box[n] ??= {});
    for (const k in d) (b as any)[k] = ((b as any)[k] ?? 0) + (d as any)[k];
  };
  add(p.name, { fga: 1, fgm: made ? 1 : 0, tpa: zone === "three" ? 1 : 0, tpm: made && zone === "three" ? 1 : 0, pts: points });
  if (andOne) add(p.name, { fta, ftm, pts: ftm });
  if (assister && made) add(assister, { ast: 1 });

  return { shooter: p.name, zone, dist, made, points: points + ftm, ftm, fta, assister: made ? assister : null, defender, andOne, fastbreak, startType, label, box };
}

// what start type does the OTHER team get next, given how this play ended?
export function nextStartType(play: Play): StartType {
  if (play.made) return play.andOne ? "ft" : "make";
  return "miss"; // missed FG -> defensive rebound -> opponent in semi-transition
}
export function possessionSeconds(startType: StartType, rng: () => number): number {
  const base = SECONDS_BY_START[startType];
  return Math.max(3, Math.round(base + (rng() * 6 - 3))); // +/- 3s jitter
}

// ---- narration: label an already-decided possession (engine integration) ----
// The engine's seeded event mode already chooses the shooter, make/miss, the
// passer, and the contester. narratePlay turns those facts into the play-by-play
// string using the shooter's real profile (zone, descriptor, distance) and makes
// NO scoring decision — so the label can never disagree with the engine's stats.
export interface NarrateInput {
  shooterName: string; isThree: boolean; made: boolean; points: number;
  assisterName: string | null; defenderName: string | null; startType: StartType; roll: () => number;
  ftm?: number; fta?: number;
}
export function narratePlay(i: NarrateInput): Play {
  const p = profileFor(i.shooterName);
  const rng = i.roll;
  const assisted = i.assisterName != null;
  let zone: Play["zone"];
  if (i.isThree) zone = "three";
  else { const rimShare = p.rim / Math.max(1e-6, p.rim + p.mid); zone = rng() < rimShare ? "rim" : "mid"; }
  const fastbreak = i.startType === "steal" || i.startType === "miss";
  let desc: string, dunk = false, dist: number | null = null;
  if (zone === "rim") {
    if (rng() < p.putback) { dunk = p.big === 1 && rng() < 0.6; desc = "putback " + (dunk ? "dunk" : "layup"); }
    else if (rng() < p.drive) { dunk = (p.big === 1 && rng() < 0.55) || rng() < 0.12; desc = "drives, " + (dunk ? "dunk" : "layup"); }
    else if (p.big === 1 && !assisted) { dunk = rng() < 0.3; desc = "backs down, " + (dunk ? "dunk" : "finish"); }
    else desc = (assisted ? "cuts, " : "") + "layup";
    if (!dunk) dist = distanceFor("rim", rng);
  } else if (zone === "mid") {
    desc = (assisted ? "catch-and-shoot" : "pull-up") + " mid"; dist = distanceFor("mid", rng);
  } else {
    desc = assisted ? "catch-and-shoot three" : (rng() < 0.5 ? "step-back three" : "pull-up three");
    dist = distanceFor("three", rng);
  }
  if (fastbreak && (desc.includes("drives") || desc.includes("layup")) && rng() < 0.5) desc = "transition " + desc;
  const isOpen = rng() < p.open;
  const defender = (!isOpen && i.defenderName) ? i.defenderName : null;
  const dpart = dist != null ? `${dist}-ft ` : "";
  const ftm = i.ftm ?? 0, fta = i.fta ?? 0;
  const foulTrip = !i.made && fta > 0;   // shooting foul drawn, FG waved off
  const andOne = i.made && fta > 0;
  let label = `${i.shooterName}: ${dpart}${desc}`;
  if (assisted && i.made) label += ` (assisted by ${i.assisterName})`;
  if (defender) label += `, contested by ${defender}`;
  if (foulTrip) label += `, drew a shooting foul  ->  ${ftm}/${fta} FT`;
  else { label += `  ->  ${i.made ? "GOOD" : "miss"}`; if (andOne) label += ` [AND-1] ${ftm}/${fta} FT`; }
  const box: Record<string, Partial<BoxLine>> = {};
  if (foulTrip) box[i.shooterName] = { ftm, fta, pts: ftm };
  else box[i.shooterName] = { fga: 1, fgm: i.made ? 1 : 0, tpa: zone === "three" ? 1 : 0, tpm: i.made && zone === "three" ? 1 : 0, ftm, fta, pts: i.points + ftm };
  if (assisted && i.made) box[i.assisterName!] = { ast: 1 };
  return { shooter: i.shooterName, zone, dist, made: i.made, points: i.points + ftm, ftm, fta, assister: i.made ? i.assisterName : null, defender, andOne, fastbreak, startType: i.startType, label, box };
}

// ---- self-test (reproduces the Python 5v5 demo, seeded) ---------------------
function mulberry32(seed: number) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function runPlayFeedDemo(): void {
  const OKC = ["Shai Gilgeous-Alexander", "Jalen Williams", "Luguentz Dort", "Chet Holmgren", "Isaiah Hartenstein"];
  const BOS = ["Jayson Tatum", "Jaylen Brown", "Derrick White", "Jrue Holiday", "Kristaps Porzingis"];
  const rng = mulberry32(11);
  const box: Record<string, BoxLine> = {};
  const bump = (n: string, d: Partial<BoxLine>) => { const b = (box[n] ??= { pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, ast: 0 }); for (const k in d) (b as any)[k] += (d as any)[k]; };
  let start: StartType = "make";
  for (let i = 0; i < 14; i++) {
    const [off, def, nm] = i % 2 === 0 ? [OKC, BOS, "OKC"] : [BOS, OKC, "BOS"];
    const secs = possessionSeconds(start, rng);
    const play = generatePlay(off, def, start, rng);
    console.log(`${nm} [${start}/${secs}s${play.fastbreak ? " FB" : ""}]  ${play.label}`);
    for (const n in play.box) bump(n, play.box[n]);
    start = nextStartType(play);
  }
  console.log("\n--- mini box score ---");
  for (const n of Object.keys(box).sort((a, b) => box[b].pts - box[a].pts))
    console.log(`  ${n.padEnd(26)} ${box[n].pts} pts  ${box[n].fgm}/${box[n].fga} FG  ${box[n].tpm}/${box[n].tpa} 3P  ${box[n].ast} ast`);
}
