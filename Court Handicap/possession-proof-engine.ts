// =============================================================================
// GINGEBALL COURT HANDICAP — POSSESSION PROOF ENGINE (Phase 6)
//
// THE FOURTH LAW: "The possessions prove it." The first three engines DEFINE the
// court (market sets it, lineup shapes it, archetype translates it). This engine
// sits AFTER them and turns possessions from decoration into EVIDENCE: it rebuilds
// the player's actual production from labeled possession events and measures it
// against the court the earlier engines defined.
//
//   flow:  market -> lineup -> archetype -> possession proof -> verdict
//
// THE RECONCILIATION (the honesty test): the proof must reconstruct the SAME
// headline the chain already reports. Expected per-100 is engine-backed (the
// lineup-court par); actual per-100 is summed from possessions; value-over-
// expected must equal the chain's beat-vs-lineup. If it does not reconcile, the
// engine is lying.
//
// SCOPE (v1, narrow + honest): the studied scoring guard's SCORING proof, broken
// by action family, with pressure resilience. Non-scoring value (assists, fouls
// drawn, screens, roll, rim deterrence) is TRACKED and named but NOT yet valued
// into the headline — no invented value units. Possession events are
// `synthetic_fixture`; the expected baseline is engine-backed.
//
// Run `npx tsx --tsconfig tsconfig.check.json lib/possession-proof-engine.ts`.
// =============================================================================

import { actualPer100, playerCourtBeatPer100, sampleConfidence, proofConfidence } from "./formula-registry";
import type { Confidence, InputProvenance, UUID } from "./types";

export const POSSESSION_PROOF_VERSION = "ch-possession-proof@1.0.0";

const round = (x: number, d = 1) => Number(x.toFixed(d));

export type ActionFamily =
  | "rim_attack" | "pullup" | "catch_shoot" | "free_throw" | "playmaking" | "transition"
  | "roll_finish" | "putback" | "post"                       // big-man SCORING families
  | "rebound" | "block" | "deterrence" | "screen"            // big-man NON-scoring proof
  | "other";
export type PossessionOutcome = "made" | "missed" | "turnover" | "foul_drawn" | "blocked" | "pass" | "event";
export type Pressure = "clean" | "contested" | "hostile";
export type ContributionType =
  | "scoring" | "playmaking" | "foul_drawn" | "turnover"
  | "rebound" | "block" | "deterrence" | "screen_assist";    // non-scoring (tracked, not yet valued)

export interface PossessionEvent {
  seq: number;
  family: ActionFamily;
  outcome: PossessionOutcome;
  points: number;        // points the studied player produced on this possession
  pressure: Pressure;    // how hard the COURT fought him on this possession
  counts: boolean;       // is this one of the studied player's possessions (denominator)?
  note?: string;
}

export interface PossessionProofInput {
  studiedPlayerId: UUID;
  events: PossessionEvent[];
  expectedPer100: number;          // engine-backed: the lineup-court par per 100
  marketConfidence: Confidence;
  roleClarity?: number;
  inputProvenance: InputProvenance;
  missing: string[];
}

export interface FamilyProof {
  family: ActionFamily; possessions: number; attempts: number; made: number; points: number; per100: number;
}
export interface ContributionProof { type: ContributionType; count: number; points: number; valuedInHeadline: boolean; note: string }
export interface ProofEventView {
  seq: number; family: ActionFamily; outcome: PossessionOutcome; points: number; pressure: Pressure; beatsCourt: boolean;
}
export interface PossessionProofRead {
  actualPoints: number; usedPossessions: number; actualPer100: number;
  expectedPer100: number; valueOverExpectedPer100: number;
  families: FamilyProof[];
  contributions: ContributionProof[];
  pressure: { hostilePossessions: number; pointsUnderPressure: number; resiliencePer100: number };
  nonScoringProof: { type: ContributionType; count: number }[];   // big-man value: tracked, NOT valued into headline
  proofEvents: ProofEventView[];
  beatHostileCourt: boolean;       // produced value over expected DESPITE the court
  confidence: Confidence;
  source: "engine"; version: string;
  inputProvenance: InputProvenance; missing: string[];
}

const SHOOTING: ActionFamily[] = ["rim_attack", "pullup", "catch_shoot", "free_throw", "transition"];
const isAttempt = (e: PossessionEvent) =>
  SHOOTING.includes(e.family) && (e.outcome === "made" || e.outcome === "missed" || e.outcome === "blocked" || e.outcome === "foul_drawn");

export function computePossessionProof(input: PossessionProofInput): PossessionProofRead {
  const used = input.events.filter((e) => e.counts);
  const usedPossessions = used.length;
  const actualPoints = used.reduce((s, e) => s + e.points, 0);
  const actPer100 = usedPossessions > 0 ? actualPer100({ actualStat: actualPoints, actualOnCourtPoss: usedPossessions }) : 0;
  const voe = playerCourtBeatPer100({ actualPer100: actPer100, parPer100: input.expectedPer100 });
  const parPerPoss = input.expectedPer100 / 100;

  // family breakdown
  const fams = new Map<ActionFamily, FamilyProof>();
  for (const e of used) {
    const f = fams.get(e.family) ?? { family: e.family, possessions: 0, attempts: 0, made: 0, points: 0, per100: 0 };
    f.possessions += 1;
    if (isAttempt(e)) f.attempts += 1;
    if (e.outcome === "made" || e.outcome === "foul_drawn") f.made += 1;
    f.points += e.points;
    fams.set(e.family, f);
  }
  const families = [...fams.values()]
    .map((f) => ({ ...f, points: round(f.points, 1), per100: usedPossessions > 0 ? round((f.points / usedPossessions) * 100, 1) : 0 }))
    .sort((a, b) => b.points - a.points);

  // contributions — scoring valued; the rest tracked, named, not yet valued
  const foulDrawn = used.filter((e) => e.outcome === "foul_drawn").length;
  const turnovers = used.filter((e) => e.outcome === "turnover").length;
  const passes = used.filter((e) => e.outcome === "pass").length;
  const contributions: ContributionProof[] = [
    { type: "scoring", count: used.filter((e) => e.points > 0).length, points: round(actualPoints, 1), valuedInHeadline: true, note: "points produced on his possessions" },
    { type: "foul_drawn", count: foulDrawn, points: 0, valuedInHeadline: true, note: "free-throw points are counted in scoring" },
    { type: "playmaking", count: passes, points: 0, valuedInHeadline: false, note: "ball movement / assists tracked; non-scoring value not yet valued (pending)" },
    { type: "turnover", count: turnovers, points: 0, valuedInHeadline: false, note: "cost reflected via the possession denominator" },
  ];

  // pressure resilience — did he produce against a hostile court?
  const hostile = used.filter((e) => e.pressure === "hostile");
  const pointsUnderPressure = hostile.reduce((s, e) => s + e.points, 0);
  const resiliencePer100 = hostile.length > 0 ? round((pointsUnderPressure / hostile.length) * 100, 1) : 0;

  // Big-man NON-scoring proof: counted from ALL events by family, valued into the
  // headline NOWHERE. These are real, defined events (rebounds, blocks, screens,
  // rim deterrences) shown as PROOF CONTEXT until an earned value model exists.
  const famToContrib: Partial<Record<ActionFamily, ContributionType>> = {
    rebound: "rebound", block: "block", deterrence: "deterrence", screen: "screen_assist",
  };
  const nonScoringTally = new Map<ContributionType, number>();
  for (const e of input.events) {
    const c = famToContrib[e.family];
    if (c) nonScoringTally.set(c, (nonScoringTally.get(c) ?? 0) + 1);
  }
  const nonScoringProof = [...nonScoringTally.entries()].map(([type, count]) => ({ type, count }));

  const proofEvents: ProofEventView[] = used.map((e) => ({
    seq: e.seq, family: e.family, outcome: e.outcome, points: e.points, pressure: e.pressure,
    beatsCourt: e.points > parPerPoss,
  }));

  const sample = sampleConfidence({ possessions: usedPossessions });
  const confidence = proofConfidence({
    sample, market: input.marketConfidence, role: input.roleClarity ?? 0.9,
    lineupContinuity: 0.9, dataIntegrity: input.inputProvenance === "live" ? 1 : 0.8,
  });

  return {
    actualPoints: round(actualPoints, 1), usedPossessions, actualPer100: actPer100,
    expectedPer100: input.expectedPer100, valueOverExpectedPer100: voe,
    families, contributions,
    pressure: { hostilePossessions: hostile.length, pointsUnderPressure: round(pointsUnderPressure, 1), resiliencePer100 },
    nonScoringProof,
    proofEvents,
    beatHostileCourt: voe > 0 && hostile.length > 0,
    confidence, source: "engine", version: POSSESSION_PROOF_VERSION,
    inputProvenance: input.inputProvenance, missing: input.missing,
  };
}

// =============================================================================
// SELF-CHECKS — the proof must reconstruct the chain's headline from possessions.
// =============================================================================
export function runPossessionProofSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  // a compact canonical possession set: 29 points over 67 possessions on a hostile court.
  const groups: [number, ActionFamily, PossessionOutcome, number, Pressure][] = [
    [6, "rim_attack", "made", 2, "hostile"], [3, "rim_attack", "missed", 0, "hostile"], [2, "rim_attack", "blocked", 0, "hostile"],
    [4, "pullup", "made", 2, "contested"], [1, "pullup", "made", 3, "contested"], [6, "pullup", "missed", 0, "contested"],
    [1, "catch_shoot", "made", 3, "clean"], [2, "catch_shoot", "missed", 0, "clean"],
    [1, "free_throw", "foul_drawn", 3, "hostile"],
    [12, "playmaking", "pass", 0, "contested"], [5, "other", "turnover", 0, "hostile"], [24, "other", "pass", 0, "clean"],
  ];
  const events: PossessionEvent[] = []; let seq = 1;
  for (const [n, family, outcome, points, pressure] of groups)
    for (let i = 0; i < n; i++) events.push({ seq: seq++, family, outcome, points, pressure, counts: true });

  const r = computePossessionProof({
    studiedPlayerId: "x1", events, expectedPer100: 34.7, marketConfidence: 0.92,
    inputProvenance: "synthetic_fixture", missing: ["live play-by-play", "non-scoring value model"],
  });

  check("used possessions = 67", r.usedPossessions === 67);
  check("actual points reconstructed = 29", r.actualPoints === 29);
  check("actual per-100 ~ 43.3 (rebuilt from possessions)", Math.abs(r.actualPer100 - 43.3) <= 0.1);
  check("expected per-100 = lineup-court par 34.7", r.expectedPer100 === 34.7);
  // THE RECONCILIATION — proof rebuilds the chain's +8.6 from the ground up.
  check("RECONCILE: value over expected = +8.6 (== beat-vs-lineup)", Math.abs(r.valueOverExpectedPer100 - 8.6) <= 0.1);
  check("family points sum back to actual", Math.abs(r.families.reduce((s, f) => s + f.points, 0) - 29) <= 0.1);
  check("scoring contribution valued in headline", r.contributions.find((c) => c.type === "scoring")?.valuedInHeadline === true);
  check("playmaking tracked but NOT valued (honest)", r.contributions.find((c) => c.type === "playmaking")?.valuedInHeadline === false);

  // THE KEY TEST — a hostile court does not force a bad verdict.
  check("hostile court still proves a beat (beatHostileCourt)", r.beatHostileCourt === true);
  check("produced points under pressure", r.pressure.pointsUnderPressure > 0);
  check("pressure possessions counted", r.pressure.hostilePossessions === 17);

  // confidence behaves
  check("confidence in (0,1) and capped for synthetic (<0.85)", r.confidence > 0 && r.confidence < 0.85);
  const small = computePossessionProof({ ...{ studiedPlayerId: "x1", expectedPer100: 34.7, marketConfidence: 0.92, inputProvenance: "synthetic_fixture", missing: [] }, events: events.slice(0, 8) });
  check("fewer possessions -> lower confidence (sample-size aware)", small.confidence < r.confidence);
  check("provenance labeled synthetic_fixture", r.inputProvenance === "synthetic_fixture");

  // graceful empty
  const empty = computePossessionProof({ studiedPlayerId: "x1", events: [], expectedPer100: 34.7, marketConfidence: 0.92, inputProvenance: "synthetic_fixture", missing: [] });
  check("no possessions -> zero, not NaN", empty.usedPossessions === 0 && empty.actualPer100 === 0 && !Number.isNaN(empty.valueOverExpectedPer100));

  // proof events encode meaning
  check("made buckets beat the court; misses do not", proofEventsConsistent(r));

  // Phase 5C — big-man proof: scoring valued, non-scoring TRACKED not valued.
  const bigEvents: PossessionEvent[] = [
    { seq: 1, family: "roll_finish", outcome: "made", points: 2, pressure: "contested", counts: true },
    { seq: 2, family: "roll_finish", outcome: "made", points: 2, pressure: "hostile", counts: true },
    { seq: 3, family: "putback", outcome: "made", points: 2, pressure: "hostile", counts: true },
    { seq: 4, family: "post", outcome: "missed", points: 0, pressure: "contested", counts: true },
    { seq: 5, family: "free_throw", outcome: "foul_drawn", points: 1, pressure: "hostile", counts: true },
    // non-scoring proof context (counts:false -> not in his scoring denominator):
    { seq: 6, family: "rebound", outcome: "event", points: 0, pressure: "clean", counts: false },
    { seq: 7, family: "rebound", outcome: "event", points: 0, pressure: "clean", counts: false },
    { seq: 8, family: "block", outcome: "event", points: 0, pressure: "hostile", counts: false },
    { seq: 9, family: "deterrence", outcome: "event", points: 0, pressure: "hostile", counts: false },
    { seq: 10, family: "screen", outcome: "event", points: 0, pressure: "clean", counts: false },
  ];
  const big = computePossessionProof({ studiedPlayerId: "y4", events: bigEvents, expectedPer100: 16.5, marketConfidence: 0.9, inputProvenance: "synthetic_fixture", missing: ["second-chance/deterrence value model"] });
  check("big proof -> scoring only in actual (7 pts, non-scoring excluded)", big.actualPoints === 7);
  check("big proof -> scoring denominator excludes defensive events (5 poss)", big.usedPossessions === 5);
  check("big proof -> non-scoring tracked (rebounds/block/deterrence/screen)", big.nonScoringProof.length === 4 && (big.nonScoringProof.find((p) => p.type === "rebound")?.count === 2));
  check("big proof -> non-scoring NOT valued in headline", big.contributions.every((c) => c.type !== "rebound" || c.valuedInHeadline === false));
  const bigFamilies = new Set(big.families.map((f) => f.family));
  check("big proof -> DISTINCT families (roll_finish/putback/post, not pullup)", bigFamilies.has("roll_finish") && !bigFamilies.has("pullup"));

  return { passed, failed, details };
}

function proofEventsConsistent(r: PossessionProofRead): boolean {
  const madeBeat = r.proofEvents.filter((e) => e.points >= 2).every((e) => e.beatsCourt);
  const missNoBeat = r.proofEvents.filter((e) => e.points === 0).every((e) => !e.beatsCourt);
  return madeBeat && missNoBeat;
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runPossessionProofSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
