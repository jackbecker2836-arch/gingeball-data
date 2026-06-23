// =============================================================================
// GINGEBALL COURT HANDICAP — ARCHETYPE COURT ENGINE (Phase 5A + 5B)
//
// THE THIRD LAW: "The archetype translates it." The same shaped court means very
// different things to different players. This engine answers, per archetype:
//
//   Fit        — how naturally his strengths find an outlet here (0..100)
//   Difficulty — how hostile the court is to his production (0..100)
//   Slope      — how sharply the court bent from his normal (magnitude + direction)
//
// 5B PROOF: the SAME game (low-total, rim-pressure grind) is a TRAP for the
// scoring guard and a RELIEF path for the rim protector. Each archetype has its
// OWN factor logic — not a renamed copy — so signals that hurt the guard (rim
// attack, a low total) become the big's opportunity.
//
// HONESTY: the translation is engine-owned; the scouting signals are fixture-
// derived (named in provenance + missing[]). Modeled archetypes: scoring_guard,
// rim_protector. Every other archetype returns modeled:false with the gap named.
//
// Run `npx tsx --tsconfig tsconfig.check.json lib/archetype-court-engine.ts`.
// =============================================================================

import { compositeConfidence } from "./formula-registry";
import type { Confidence, InputProvenance } from "./types";

export const ARCHETYPE_ENGINE_VERSION = "ch-archetype-court@1.1.0";

const round = (x: number, d = 0) => Number(x.toFixed(d));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export interface ArchetypeContextInput {
  archetype: string;                  // 'scoring_guard' | 'rim_protector' modeled; others pending
  // par chain — only archetypes with a scoring-prop par model have one:
  normalPar?: number; marketPar?: number; lineupPar?: number;
  // engine-backed environment (shared, same game):
  expectedPossessions: number;
  marketSuppressionPct?: number; lineupSuppressionPct?: number;
  // scouting signals (0..1), fixture-derived. Guard-side:
  spacing?: number; oppPoaPressure?: number; oppRimProtection?: number;
  creationBurden?: number; synergyRelief?: number;
  // Rim-protector-side (note: some are the SAME game feature seen with opposite
  // valence — e.g. oppRimAttackVolume is what makes the guard dangerous AND the
  // big valuable):
  oppRimAttackVolume?: number; reboundingEnv?: number; rollGravity?: number;
  lowTotalGrind?: number; paintCongestion?: number; touchVolume?: number;
  // confidence inputs:
  marketConfidence: Confidence; lineupStatusConfidence: Confidence;
  inputProvenance: InputProvenance; missing: string[];
}

export interface ArchetypeFactor { key: string; label: string; points: number; note: string }
export type SlopeLabel = "Low" | "Medium" | "High";
export type SlopeDirection = "harder" | "easier" | "flat";

export interface ArchetypeCourtRead {
  archetype: string; modeled: boolean;
  fit: number; difficulty: number;
  slopeScore: number; slopeLabel: SlopeLabel; slopeDirection: SlopeDirection;
  difficultyFactors: ArchetypeFactor[]; fitFactors: ArchetypeFactor[];
  confidence: Confidence;
  source: "engine"; modelVersion: string;
  inputProvenance: ArchetypeContextInput["inputProvenance"]; missing: string[];
}

export const SCORING_GUARD_TRANSLATION_V1 = {
  difficulty: { spacing: 0.24, poa: 0.22, rim: 0.16, marketSupp: 0.12, lineupSupp: 0.10, paceScarcity: 0.16 },
  fit: { space: 0.22, weakPerimeter: 0.20, openRim: 0.16, pace: 0.14, synergy: 0.16, creationFreedom: 0.12 },
  caps: { marketSupp: 0.13, lineupSupp: 0.09, paceScarcityFloor: 100, paceScarcitySpan: 18, paceFitFloor: 80, paceFitSpan: 25 },
} as const;

// Rim protector / roll big — DIFFERENT basketball logic. His difficulty is about
// touches/finishing, not perimeter pressure; his fit is about deterrence value,
// boards, and thriving in a low-total grind.
export const RIM_PROTECTOR_TRANSLATION_V1 = {
  difficulty: { touchScarcity: 0.30, paceScarcity: 0.15, paintFinish: 0.30, oppInterior: 0.25 },
  fit: { deterrence: 0.35, rebounding: 0.25, lowTotalValue: 0.25, roll: 0.15 },
  caps: { paceScarcityFloor: 100, paceScarcitySpan: 18 },
} as const;

const SLOPE_T = { medium: 0.07, high: 0.14 };
function slopeLabel(score: number): SlopeLabel {
  return score >= SLOPE_T.high ? "High" : score >= SLOPE_T.medium ? "Medium" : "Low";
}

function archConfidence(input: ArchetypeContextInput, roleClarity: number, integrityCap: number): Confidence {
  return compositeConfidence({
    sample: 1, market: input.marketConfidence, role: roleClarity, attribution: 1,
    lineupContinuity: input.lineupStatusConfidence,
    dataIntegrity: input.inputProvenance === "live" ? 1 : integrityCap,
  });
}

function notModeled(input: ArchetypeContextInput): ArchetypeCourtRead {
  const slopeScore = input.normalPar && input.lineupPar ? round(clamp01(1 - input.lineupPar / input.normalPar), 4) : 0;
  return {
    archetype: input.archetype, modeled: false,
    fit: 50, difficulty: 50, slopeScore, slopeLabel: slopeLabel(slopeScore), slopeDirection: "flat",
    difficultyFactors: [], fitFactors: [],
    confidence: clamp01(archConfidence(input, 0.5, 0.6) * 0.4),
    source: "engine", modelVersion: ARCHETYPE_ENGINE_VERSION, inputProvenance: input.inputProvenance,
    missing: [...input.missing, `archetype translation model for '${input.archetype}' (pending)`],
  };
}

function translateScoringGuard(input: ArchetypeContextInput): ArchetypeCourtRead {
  const W = SCORING_GUARD_TRANSLATION_V1, cap = W.caps;
  const spacing = input.spacing ?? 0.5, poa = input.oppPoaPressure ?? 0.5, rim = input.oppRimProtection ?? 0.5;
  const burden = input.creationBurden ?? 0.5, synergy = input.synergyRelief ?? 0.5;
  const marketSuppH = clamp01((input.marketSuppressionPct ?? 0) / cap.marketSupp);
  const lineupSuppH = clamp01((input.lineupSuppressionPct ?? 0) / cap.lineupSupp);
  const paceScarcity = clamp01((cap.paceScarcityFloor - input.expectedPossessions) / cap.paceScarcitySpan);
  const paceFit = clamp01((input.expectedPossessions - cap.paceFitFloor) / cap.paceFitSpan);

  const dRaw = [
    { key: "spacing", label: "Cramped spacing", points: W.difficulty.spacing * spacing, note: "a non-shooter shrinks his pull-up oxygen" },
    { key: "poa", label: "POA pressure", points: W.difficulty.poa * poa, note: "elite on-ball defender raises his entry cost" },
    { key: "rim", label: "Rim protection", points: W.difficulty.rim * rim, note: "the rim release valve is removed" },
    { key: "marketSupp", label: "Market suppression", points: W.difficulty.marketSupp * marketSuppH, note: "the market already cut his number" },
    { key: "lineupSupp", label: "Lineup suppression", points: W.difficulty.lineupSupp * lineupSuppH, note: "the five on the floor cut it further" },
    { key: "paceScarcity", label: "Pace scarcity", points: W.difficulty.paceScarcity * paceScarcity, note: "fewer possessions for a volume scorer" },
  ];
  const fRaw = [
    { key: "space", label: "Available space", points: W.fit.space * (1 - spacing), note: "room to operate off the bounce" },
    { key: "weakPerimeter", label: "Weak perimeter D", points: W.fit.weakPerimeter * (1 - poa), note: "softer on-ball resistance" },
    { key: "openRim", label: "Open rim", points: W.fit.openRim * (1 - rim), note: "a finishable paint" },
    { key: "pace", label: "Pace", points: W.fit.pace * paceFit, note: "more possessions feed a volume creator" },
    { key: "synergy", label: "Roll-gravity synergy", points: W.fit.synergy * synergy, note: "a roll partner bends help away" },
    { key: "creationFreedom", label: "Creation freedom", points: W.fit.creationFreedom * (1 - burden), note: "not over-taxed as the only engine" },
  ];
  const difficulty = round(100 * dRaw.reduce((s, f) => s + f.points, 0));
  const fit = round(100 * fRaw.reduce((s, f) => s + f.points, 0));

  // par-based slope (this archetype has a real par chain)
  const np = input.normalPar ?? 0, lp = input.lineupPar ?? np;
  const slopeScore = np ? round(clamp01(1 - lp / np), 4) : 0;
  const slopeDirection: SlopeDirection = lp < np ? "harder" : lp > np ? "easier" : "flat";

  return {
    archetype: input.archetype, modeled: true, fit, difficulty,
    slopeScore, slopeLabel: slopeLabel(slopeScore), slopeDirection,
    difficultyFactors: dRaw.map((f) => ({ ...f, points: round(100 * f.points, 1) })),
    fitFactors: fRaw.map((f) => ({ ...f, points: round(100 * f.points, 1) })),
    confidence: archConfidence(input, 0.9, 0.85),
    source: "engine", modelVersion: ARCHETYPE_ENGINE_VERSION, inputProvenance: input.inputProvenance, missing: input.missing,
  };
}

function translateRimProtector(input: ArchetypeContextInput): ArchetypeCourtRead {
  const W = RIM_PROTECTOR_TRANSLATION_V1, cap = W.caps;
  const deterrence = input.oppRimAttackVolume ?? 0.5;   // opp attacks rim -> his value (INVERSION)
  const rebounding = input.reboundingEnv ?? 0.5;
  const lowTotal = input.lowTotalGrind ?? 0.5;          // a grind suits his archetype (INVERSION)
  const roll = input.rollGravity ?? 0.5;
  const touch = input.touchVolume ?? 0.5;
  const paint = input.paintCongestion ?? 0.5;
  const oppInterior = input.oppRimProtection ?? 0.5;    // opposing bigs contesting HIM
  const paceScarcity = clamp01((cap.paceScarcityFloor - input.expectedPossessions) / cap.paceScarcitySpan);

  const dRaw = [
    { key: "touchScarcity", label: "Touch scarcity", points: W.difficulty.touchScarcity * (1 - touch), note: "few designed touches cap his counting stats" },
    { key: "paceScarcity", label: "Pace scarcity", points: W.difficulty.paceScarcity * paceScarcity, note: "fewer possessions, fewer chances" },
    { key: "paintFinish", label: "Paint finishing congestion", points: W.difficulty.paintFinish * paint, note: "a crowded paint makes his own finishes harder" },
    { key: "oppInterior", label: "Opponent interior competition", points: W.difficulty.oppInterior * oppInterior, note: "opposing size contests his interior work" },
  ];
  const fRaw = [
    { key: "deterrence", label: "Rim deterrence opportunity", points: W.fit.deterrence * deterrence, note: "the same rim pressure that traps the guard is his block/deterrence value" },
    { key: "rebounding", label: "Rebounding environment", points: W.fit.rebounding * rebounding, note: "a low-total grind means more misses to clean" },
    { key: "lowTotalValue", label: "Low-total value", points: W.fit.lowTotalValue * lowTotal, note: "his archetype shines in a defensive grind" },
    { key: "roll", label: "Roll gravity", points: W.fit.roll * roll, note: "a real dive partner for the creator" },
  ];
  const difficulty = round(100 * dRaw.reduce((s, f) => s + f.points, 0));
  const fit = round(100 * fRaw.reduce((s, f) => s + f.points, 0));

  // No scoring par chain yet -> slope from net favorability, direction made explicit.
  const netFavor = (fit - difficulty) / 100;
  const slopeScore = round(Math.abs(netFavor), 4);
  const slopeDirection: SlopeDirection = netFavor > 0.01 ? "easier" : netFavor < -0.01 ? "harder" : "flat";

  return {
    archetype: input.archetype, modeled: true, fit, difficulty,
    slopeScore, slopeLabel: slopeLabel(slopeScore), slopeDirection,
    difficultyFactors: dRaw.map((f) => ({ ...f, points: round(100 * f.points, 1) })),
    fitFactors: fRaw.map((f) => ({ ...f, points: round(100 * f.points, 1) })),
    confidence: archConfidence(input, 0.85, 0.8),  // younger model, no par chain -> lower
    source: "engine", modelVersion: ARCHETYPE_ENGINE_VERSION, inputProvenance: input.inputProvenance,
    missing: [...input.missing, "slope basis: net-favorability (par-chain slope for non-scorers pending)"],
  };
}

export function computeArchetypeCourt(input: ArchetypeContextInput): ArchetypeCourtRead {
  if (input.archetype === "scoring_guard") return translateScoringGuard(input);
  if (input.archetype === "rim_protector") return translateRimProtector(input);
  return notModeled(input);
}

// =============================================================================
// SELF-CHECKS — the same court, two opposite reads.
// =============================================================================
export function runArchetypeSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  const guard: ArchetypeContextInput = {
    archetype: "scoring_guard", normalPar: 27.5, marketPar: 24.5, lineupPar: 23.1,
    expectedPossessions: 88.6, marketSuppressionPct: 0.109, lineupSuppressionPct: 0.057,
    spacing: 0.72, oppPoaPressure: 0.85, oppRimProtection: 0.78, creationBurden: 0.62, synergyRelief: 0.40,
    marketConfidence: 0.92, lineupStatusConfidence: 0.9, inputProvenance: "synthetic_fixture",
    missing: ["real matchup tracking", "usage-vs-defense splits", "shot-quality model"],
  };
  const g = computeArchetypeCourt(guard);

  // Phase 5A stability — guard read unchanged.
  check("guard difficulty 75 (5A stable)", g.difficulty === 75);
  check("guard fit 28 (5A stable)", g.fit === 28);
  check("guard slope High (5A stable)", g.slopeLabel === "High");
  check("guard slope direction = harder", g.slopeDirection === "harder");

  // Same game, rim protector perspective.
  const big: ArchetypeContextInput = {
    archetype: "rim_protector", expectedPossessions: 88.6,
    oppRimAttackVolume: 0.82, reboundingEnv: 0.70, rollGravity: 0.45, lowTotalGrind: 0.80,
    touchVolume: 0.55, paintCongestion: 0.38, oppRimProtection: 0.33,
    marketConfidence: 0.92, lineupStatusConfidence: 0.9, inputProvenance: "synthetic_fixture",
    missing: ["real matchup tracking", "rebounding/contact tracking", "rim-protector par model"],
  };
  const b = computeArchetypeCourt(big);

  check("rim protector is modeled", b.modeled === true);
  check("rim protector fit ~73 (good outlet)", Math.abs(b.fit - 73) <= 1);
  check("rim protector difficulty ~43 (favorable court)", Math.abs(b.difficulty - 43) <= 2);
  check("rim protector slope direction = easier", b.slopeDirection === "easier");
  check("rim protector confidence < guard (younger, no par chain)", b.confidence < g.confidence);
  check("rim protector names par-chain slope pending", b.missing.some((m) => m.includes("par-chain slope")));

  // THE PRODUCT'S SOUL: the trap for the guard is NOT a trap for the big.
  check("INVERSION: big difficulty < guard difficulty", b.difficulty < g.difficulty);
  check("INVERSION: big fit > guard fit", b.fit > g.fit);
  check("INVERSION: slope directions oppose (harder vs easier)", g.slopeDirection !== b.slopeDirection);

  // NOT a renamed guard model — distinct factor logic.
  const gKeys = g.difficultyFactors.map((f) => f.key).sort().join(",");
  const bKeys = b.difficultyFactors.map((f) => f.key).sort().join(",");
  check("distinct difficulty factor logic (not renamed)", gKeys !== bKeys);
  check("big difficulty factors explain the score", Math.abs(b.difficultyFactors.reduce((s, f) => s + f.points, 0) - b.difficulty) <= 1);
  check("big fit factors explain the score", Math.abs(b.fitFactors.reduce((s, f) => s + f.points, 0) - b.fit) <= 1);

  // Monotonicity for the big — behaves like basketball.
  const moreDeter = computeArchetypeCourt({ ...big, oppRimAttackVolume: 0.98 });
  check("more rim-attack to deter -> better fit for big", moreDeter.fit > b.fit);
  const fewerTouch = computeArchetypeCourt({ ...big, touchVolume: 0.1 });
  check("fewer touches -> higher difficulty for big", fewerTouch.difficulty > b.difficulty);

  // Non-modeled archetype still honest.
  const conn = computeArchetypeCourt({ ...big, archetype: "connector" });
  check("non-modeled archetype -> modeled:false", conn.modeled === false);
  check("non-modeled archetype -> names the gap", conn.missing.some((s) => s.includes("connector")));

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runArchetypeSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
