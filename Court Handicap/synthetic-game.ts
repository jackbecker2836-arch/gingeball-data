// =============================================================================
// GINGEBALL COURT HANDICAP — SYNTHETIC GAME FIXTURE (the model lab)
//
// ⚠ SYNTHETIC TEST DATA — NOT MEASURED, NOT LIVE. Every number here is authored
// to be basketball-plausible and PURPOSEFUL: the world is designed to exercise
// archetype translation, not to fill fields. Provenance is `synthetic_fixture`
// everywhere it flows, so the product computes from it without implying it is
// real. This is the laboratory where Court Handicap proves its own language.
//
// Design intent (the translation cast on ONE court — X favored -4, total 202):
//   X1 scoring guard      — pull-up creator, trapped by this court
//   X3 spot-up wing       — fit hinges on spacing
//   X4 non-shooter        — the spacing hazard that cramps X1
//   X5 roll big           — X1's pressure-escape partner
//   Y1 defensive stopper  — value rises in a low-scoring, pressure-heavy game
//   Y3 connector          — value rides on secondary creation
//   Y4 rim protector      — the SAME court as relief / opportunity
//
// Modeled today: scoring_guard (X1), rim_protector (Y4). The rest carry full
// test data so they are ready to model — and so nothing overfits to one guard —
// but return honest `modeled:false` pending reads until their engines exist.
// =============================================================================

import type { InputProvenance, UUID } from "../lib/types";

export const SYNTHETIC_PROVENANCE: InputProvenance = "synthetic_fixture";

export interface SyntheticPlayer {
  id: UUID; name: string; team: "X" | "Y"; position: string; role: string;
  archetype: string;            // engine taxonomy key
  minutes: number; usage: number;
  trueShooting: number; assistRate: number; turnoverRate: number;
  threeVolume: number; threeAccuracy: number;
  rimFrequency: number; rimFinishing: number; pullUpTendency: number;
  rollFrequency: number; screenAssistTendency: number;
  oRebRate: number; dRebRate: number; blockRate: number; stealRate: number; foulRate: number;
  poaDefense: number;           // 0..1
  rimProtection: number;        // 0..1
  spacingGravity: number;       // 0..1
  creationBurden: number;       // 0..1
  rollGravity: number;          // 0..1
  switchability: number;        // 0..1
  synergyTags: string[];
}

// ---- the two fives ----------------------------------------------------------
export const syntheticPlayers: SyntheticPlayer[] = [
  { id: "x1", name: "Star Scoring Guard", team: "X", position: "PG", role: "Primary on-ball creator", archetype: "scoring_guard",
    minutes: 36, usage: 0.31, trueShooting: 0.57, assistRate: 0.27, turnoverRate: 0.13,
    threeVolume: 0.34, threeAccuracy: 0.36, rimFrequency: 0.34, rimFinishing: 0.58, pullUpTendency: 0.78,
    rollFrequency: 0, screenAssistTendency: 0.04, oRebRate: 0.02, dRebRate: 0.10, blockRate: 0.004, stealRate: 0.018, foulRate: 0.02,
    poaDefense: 0.42, rimProtection: 0.05, spacingGravity: 0.78, creationBurden: 0.62, rollGravity: 0.0, switchability: 0.45,
    synergyTags: ["creator", "needs_spacing", "roll_partner:x5"] },
  { id: "x2", name: "Secondary Wing Creator", team: "X", position: "SG", role: "Secondary creation", archetype: "wing_scorer",
    minutes: 33, usage: 0.24, trueShooting: 0.56, assistRate: 0.18, turnoverRate: 0.11,
    threeVolume: 0.38, threeAccuracy: 0.37, rimFrequency: 0.26, rimFinishing: 0.6, pullUpTendency: 0.5,
    rollFrequency: 0, screenAssistTendency: 0.05, oRebRate: 0.03, dRebRate: 0.12, blockRate: 0.006, stealRate: 0.015, foulRate: 0.02,
    poaDefense: 0.55, rimProtection: 0.08, spacingGravity: 0.6, creationBurden: 0.4, rollGravity: 0.0, switchability: 0.6,
    synergyTags: ["secondary_creator"] },
  { id: "x3", name: "Low-Usage 3-and-D Wing", team: "X", position: "SF", role: "Spacing + POA defense", archetype: "spot_up_wing",
    minutes: 30, usage: 0.13, trueShooting: 0.6, assistRate: 0.08, turnoverRate: 0.08,
    threeVolume: 0.62, threeAccuracy: 0.39, rimFrequency: 0.16, rimFinishing: 0.62, pullUpTendency: 0.15,
    rollFrequency: 0, screenAssistTendency: 0.04, oRebRate: 0.03, dRebRate: 0.13, blockRate: 0.008, stealRate: 0.017, foulRate: 0.02,
    poaDefense: 0.7, rimProtection: 0.12, spacingGravity: 0.74, creationBurden: 0.12, rollGravity: 0.0, switchability: 0.68,
    synergyTags: ["floor_spacer", "poa_defender"] },
  { id: "x4", name: "Non-Shooting Defensive Forward", team: "X", position: "PF", role: "Help defense / glass", archetype: "defensive_chaos",
    minutes: 26, usage: 0.14, trueShooting: 0.52, assistRate: 0.1, turnoverRate: 0.14,
    threeVolume: 0.08, threeAccuracy: 0.28, rimFrequency: 0.46, rimFinishing: 0.62, pullUpTendency: 0.05,
    rollFrequency: 0.2, screenAssistTendency: 0.1, oRebRate: 0.09, dRebRate: 0.2, blockRate: 0.02, stealRate: 0.02, foulRate: 0.03,
    poaDefense: 0.5, rimProtection: 0.45, spacingGravity: 0.18, creationBurden: 0.15, rollGravity: 0.35, switchability: 0.62,
    synergyTags: ["non_shooter", "spacing_hazard:x1", "help_defender"] },
  { id: "x5", name: "Rim-Running Center", team: "X", position: "C", role: "Roll gravity / rim run", archetype: "roll_big",
    minutes: 28, usage: 0.18, trueShooting: 0.66, assistRate: 0.07, turnoverRate: 0.13,
    threeVolume: 0.02, threeAccuracy: 0.3, rimFrequency: 0.72, rimFinishing: 0.7, pullUpTendency: 0.02,
    rollFrequency: 0.74, screenAssistTendency: 0.22, oRebRate: 0.11, dRebRate: 0.22, blockRate: 0.04, stealRate: 0.01, foulRate: 0.04,
    poaDefense: 0.3, rimProtection: 0.62, spacingGravity: 0.28, creationBurden: 0.1, rollGravity: 0.7, switchability: 0.4,
    synergyTags: ["roll_partner:x1", "lob_threat", "rim_runner"] },

  { id: "y1", name: "Elite POA Stopper", team: "Y", position: "PG", role: "Ball pressure", archetype: "defensive_stopper",
    minutes: 34, usage: 0.17, trueShooting: 0.54, assistRate: 0.2, turnoverRate: 0.12,
    threeVolume: 0.34, threeAccuracy: 0.35, rimFrequency: 0.2, rimFinishing: 0.55, pullUpTendency: 0.3,
    rollFrequency: 0, screenAssistTendency: 0.03, oRebRate: 0.02, dRebRate: 0.11, blockRate: 0.006, stealRate: 0.028, foulRate: 0.025,
    poaDefense: 0.9, rimProtection: 0.07, spacingGravity: 0.5, creationBurden: 0.22, rollGravity: 0.0, switchability: 0.66,
    synergyTags: ["poa_stopper", "defensive_chain:y4"] },
  { id: "y2", name: "Big Wing Stopper", team: "Y", position: "SF", role: "Wing defense", archetype: "three_and_d_stopper",
    minutes: 32, usage: 0.16, trueShooting: 0.57, assistRate: 0.1, turnoverRate: 0.09,
    threeVolume: 0.5, threeAccuracy: 0.37, rimFrequency: 0.2, rimFinishing: 0.6, pullUpTendency: 0.2,
    rollFrequency: 0, screenAssistTendency: 0.04, oRebRate: 0.03, dRebRate: 0.15, blockRate: 0.01, stealRate: 0.016, foulRate: 0.02,
    poaDefense: 0.78, rimProtection: 0.18, spacingGravity: 0.62, creationBurden: 0.14, rollGravity: 0.0, switchability: 0.72,
    synergyTags: ["wing_stopper", "floor_spacer"] },
  { id: "y3", name: "Switch Connector Forward", team: "Y", position: "PF", role: "Connector / switch", archetype: "connector",
    minutes: 27, usage: 0.15, trueShooting: 0.58, assistRate: 0.19, turnoverRate: 0.12,
    threeVolume: 0.4, threeAccuracy: 0.36, rimFrequency: 0.24, rimFinishing: 0.61, pullUpTendency: 0.18,
    rollFrequency: 0.1, screenAssistTendency: 0.14, oRebRate: 0.05, dRebRate: 0.17, blockRate: 0.015, stealRate: 0.018, foulRate: 0.025,
    poaDefense: 0.62, rimProtection: 0.3, spacingGravity: 0.55, creationBurden: 0.28, rollGravity: 0.25, switchability: 0.8,
    synergyTags: ["connector", "secondary_creator", "switch_defender"] },
  { id: "y4", name: "Paint-Wall Rim Protector", team: "Y", position: "C", role: "Drop coverage / rim deterrence", archetype: "rim_protector",
    minutes: 30, usage: 0.16, trueShooting: 0.64, assistRate: 0.08, turnoverRate: 0.14,
    threeVolume: 0.03, threeAccuracy: 0.29, rimFrequency: 0.66, rimFinishing: 0.68, pullUpTendency: 0.02,
    rollFrequency: 0.55, screenAssistTendency: 0.2, oRebRate: 0.1, dRebRate: 0.27, blockRate: 0.06, stealRate: 0.012, foulRate: 0.045,
    poaDefense: 0.32, rimProtection: 0.84, spacingGravity: 0.22, creationBurden: 0.1, rollGravity: 0.55, switchability: 0.38,
    synergyTags: ["rim_protector", "defensive_chain:y1", "lob_threat"] },
  { id: "y5", name: "Corner Spacer Connector", team: "Y", position: "SG", role: "Corner spacing", archetype: "connector",
    minutes: 24, usage: 0.12, trueShooting: 0.61, assistRate: 0.09, turnoverRate: 0.09,
    threeVolume: 0.66, threeAccuracy: 0.4, rimFrequency: 0.14, rimFinishing: 0.58, pullUpTendency: 0.12,
    rollFrequency: 0, screenAssistTendency: 0.03, oRebRate: 0.02, dRebRate: 0.12, blockRate: 0.006, stealRate: 0.014, foulRate: 0.018,
    poaDefense: 0.58, rimProtection: 0.1, spacingGravity: 0.72, creationBurden: 0.1, rollGravity: 0.0, switchability: 0.62,
    synergyTags: ["floor_spacer", "connector"] },
];

export const syntheticById = (id: UUID) => syntheticPlayers.find((p) => p.id === id);

// ---- lineup-level context (synthetic) ---------------------------------------
export const syntheticLineupContext = {
  provenance: SYNTHETIC_PROVENANCE,
  spacingRating: 0.46,          // X floor is cramped (a non-shooter starting)
  creationBurdenRating: 0.62,   // concentrated on X1
  rimPressureRating: 0.82,      // X attacks the rim hard
  defensivePressureRating: 0.85,// Y's POA pressure is elite
  paceExpectation: 0.42,        // a grind (low)
  marketSpread: -4, marketTotal: 202, expectedPossessions: 88.6,
  oppPoaPressure: 0.85, oppRimProtection: 0.78,
  availability: "both fives confirmed; no injury flags",
  lineupStatusConfidence: 0.9, dataIntegrity: 0.85,
} as const;

// ---- unified court signals (0..1) the engines consume -----------------------
// ONE signal vector per studied archetype, derived-from / consistent-with the
// stats above, calibrated so the canonical reads hold. Both the lineup engine
// and the archetype engine read the SAME guard vector (no more two POA numbers).
//
// Scoring guard (X1) — exposure to this court:
//   spacing 0.72        <- X4 non_shooter + X1 spacingGravity 0.78 (needs it)
//   oppPoaPressure 0.85 <- Y1 poaDefense 0.90
//   oppRimProtection 0.78 <- Y4 rimProtection 0.84
//   creationBurden 0.62 <- X1 creationBurden
//   synergyRelief 0.40  <- X5 rollGravity 0.70 (partial escape)
export const scoringGuardSignals = {
  spacing: 0.72, oppPoaPressure: 0.85, oppRimProtection: 0.78, creationBurden: 0.62, synergyRelief: 0.40,
} as const;

// Rim protector (Y4) — opportunity in the SAME court (signals invert):
//   oppRimAttackVolume 0.82 <- X rimPressureRating (his deterrence value)
//   reboundingEnv 0.70      <- low total -> more misses; Y4 dRebRate 0.27
//   rollGravity 0.45        <- Y4 rollGravity 0.55 in a half-court grind
//   lowTotalGrind 0.80      <- paceExpectation low + total 202 (his element)
//   touchVolume 0.55        <- Y4 usage 0.16 (modest, but enough)
//   paintCongestion 0.38    <- finishing slightly harder in a packed paint
//   oppRimProtection 0.33   <- X5 rimProtection 0.62 contesting him (modest)
export const rimProtectorSignals = {
  oppRimAttackVolume: 0.82, reboundingEnv: 0.70, rollGravity: 0.45, lowTotalGrind: 0.80,
  touchVolume: 0.55, paintCongestion: 0.38, oppRimProtection: 0.33,
} as const;

// ---- studied player's possession events (Phase 6 proof) ---------------------
// ⚠ synthetic_fixture — basketball-plausible possessions authored to sum to the
// canonical line (29 points over 67 possessions on a hostile court) so the proof
// engine reconstructs the chain's +8.6 from the ground up. Each possession is one
// event; non-scoring involvement (passes/turnovers) carries 0 personal points.
import type { PossessionEvent, ActionFamily, PossessionOutcome, Pressure } from "../lib/possession-proof-engine";

const POSSESSION_GROUPS: [number, ActionFamily, PossessionOutcome, number, Pressure][] = [
  [6, "rim_attack", "made", 2, "hostile"], [3, "rim_attack", "missed", 0, "hostile"], [2, "rim_attack", "blocked", 0, "hostile"],
  [4, "pullup", "made", 2, "contested"], [1, "pullup", "made", 3, "contested"], [6, "pullup", "missed", 0, "contested"],
  [1, "catch_shoot", "made", 3, "clean"], [2, "catch_shoot", "missed", 0, "clean"],
  [1, "free_throw", "foul_drawn", 3, "hostile"],
  [12, "playmaking", "pass", 0, "contested"], [5, "other", "turnover", 0, "hostile"], [24, "other", "pass", 0, "clean"],
];

export const studiedPossessionEvents: PossessionEvent[] = (() => {
  const out: PossessionEvent[] = []; let seq = 1;
  for (const [n, family, outcome, points, pressure] of POSSESSION_GROUPS)
    for (let i = 0; i < n; i++) out.push({ seq: seq++, family, outcome, points, pressure, counts: true });
  return out;
})();

// ---- rim protector full grading chain inputs (Phase 5C) ---------------------
// ⚠ synthetic_fixture. His SCORING par chain (points — a real, lower prop), his
// roll-big lineup signals, and his possessions: scoring events (valued) plus
// non-scoring value events (rebounds/blocks/deterrence/screens) carried as
// counts:false PROOF CONTEXT — tracked, never valued into the headline.
export const rimProtectorParChain = { normalPar: 12.5, marketLine: 11.5 } as const;

export const rimProtectorScoringSignals = {
  oppRimProtection: 0.40,  // opponent x5 contests his finishes (modest)
  paceScarcity: 0.633,     // a low-total grind (ep 88.6)
  creationSupport: 0.60,   // a guard who finds him
  rollGravity: 0.55,       // his dive manufactures looks
} as const;

const RIM_SCORING: [number, ActionFamily, PossessionOutcome, number, Pressure, boolean][] = [
  [4, "roll_finish", "made", 2, "contested", true], [1, "putback", "made", 2, "hostile", true],
  [3, "free_throw", "foul_drawn", 1, "hostile", true],
  [3, "roll_finish", "missed", 0, "hostile", true], [2, "post", "missed", 0, "contested", true],
  [27, "other", "pass", 0, "clean", true],           // offensive involvement, no points
];
const RIM_NONSCORING: [number, ActionFamily, PossessionOutcome, number, Pressure, boolean][] = [
  [9, "rebound", "event", 0, "clean", false], [3, "block", "event", 0, "hostile", false],
  [5, "deterrence", "event", 0, "hostile", false], [4, "screen", "event", 0, "clean", false],
];

export const rimProtectorPossessions: PossessionEvent[] = (() => {
  const out: PossessionEvent[] = []; let seq = 1;
  for (const [n, family, outcome, points, pressure, counts] of [...RIM_SCORING, ...RIM_NONSCORING])
    for (let i = 0; i < n; i++) out.push({ seq: seq++, family, outcome, points, pressure, counts });
  return out;
})();

export const rimProtectorParPoss = 40;   // his on-court scoring possessions (per-100 denominator)
