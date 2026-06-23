// =============================================================================
// GINGEBALL COURT HANDICAP — LINEUP COURT ENGINE (Phase 4C)
//
// THE SECOND LAW: "The lineup shapes it." The market sets par; the five bodies
// on the floor bend it. This engine EARNS lineupPar instead of stamping it.
//
//   lineupPar = marketPar × (1 − Σ factor)
//
// Each factor is a named, signed contribution = (versioned model coefficient) ×
// (a 0..1 context signal). So the suppression is explained, auditable, and
// tunable in one place — not a magic number.
//
// HONESTY (Phase 4C scope):
//   • The TRANSFORMATION is engine-owned and real.
//   • The input SIGNALS are still fixture-derived (no live on/off or tracking
//     data yet) — carried as inputProvenance + missing[], never hidden.
//   • Only SCORING archetypes are modeled now; role/defense players return a
//     no-adjustment read with the gap named. A narrower first truth, not a fake
//     complete one.
//
// Run `npx tsx --tsconfig tsconfig.check.json lib/lineup-court-engine.ts`.
// =============================================================================

import { compositeConfidence } from "./formula-registry";
import type { Confidence, InputProvenance } from "./types";

export const LINEUP_ENGINE_VERSION = "ch-lineup-court@1.0.0";

const round = (x: number, d = 1) => Number(x.toFixed(d));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export type ArchetypeClass = "scorer" | "roll_big" | "role" | "defense";

// The context the engine consumes. Signals are 0..1. Today fixture-derived.
export interface LineupContextInput {
  marketPar: number;
  archetypeClass: ArchetypeClass;
  spacingSignal: number;   // non-shooter(s) sharing the floor shrink his space
  poaSignal: number;       // opponent point-of-attack pressure on the handle
  rimSignal: number;       // opponent rim protection (paint walled off)
  burdenSignal: number;    // his on-ball creation load
  synergySignal: number;   // helpful offensive synergy (roll gravity, shooting) -> relief
  // Phase 5C — roll-big scoring signals (distinct basketball logic):
  oppRimProtectionSignal?: number; // opponent interior contesting HIS finishes -> suppress
  paceScarcitySignal?: number;     // fewer possessions -> fewer scoring chances -> suppress
  creationSupportSignal?: number;  // a guard who sets him up -> relief
  rollGravitySignal?: number;      // his dive manufactures his own looks -> relief
  lineupStatusConfidence: Confidence; // confirmed vs projected five
  inputProvenance: InputProvenance;
  missing: string[];       // signals/data not yet available from real sources
}

export interface LineupFactor { key: string; label: string; weightPct: number; note: string }

export interface LineupCourtRead {
  marketPar: number;
  lineupPar: number;
  lineupAdjustment: number;    // points; negative = court got harder
  lineupSuppressionPct: number; // signed fraction; positive = suppressed
  factors: LineupFactor[];
  confidence: Confidence;
  source: "engine";
  modelVersion: string;
  inputProvenance: LineupContextInput["inputProvenance"];
  missing: string[];
}

// Model v1 — maximum contribution of each factor (at signal = 1), as fractions
// of marketPar. CALIBRATION: the canonical trap guard (24.5 -> 23.1). Coefficients
// were re-derived in Phase 5B so the lineup engine reads the SAME unified guard
// signal vector as the archetype engine (one court, one set of signals) while the
// approved factor breakdown (+2.2/+1.8/+1.5/+0.8/-0.6 -> 23.1) stays byte-identical.
// These are basketball-judgment knobs; tune here, nowhere else.
export const SCORER_MODEL_V1 = {
  spacing: 0.030556, poa: 0.021176, rim: 0.019231, burden: 0.012903, synergyRelief: 0.015,
} as const;

// Phase 5C — a big's SCORING par bends through different basketball logic than a
// guard's: opponent interior + pace scarcity suppress his finishing volume, while
// a guard who sets him up and his own roll gravity buy it back. NOT a renamed
// scorer model — different factors entirely. Versioned; tune here only.
export const ROLL_BIG_MODEL_V1 = {
  oppRimProtection: 0.040, paceScarcity: 0.050, creationSupport: 0.035, rollGravity: 0.030,
} as const;

function lineupConfidence(input: LineupContextInput): Confidence {
  return compositeConfidence({
    sample: 1,            // possession sample n/a pre-game
    market: 1,            // market layer carries its own confidence separately
    role: 0.9,            // role clarity for a defined starter
    attribution: 1,
    lineupContinuity: input.lineupStatusConfidence,
    dataIntegrity: input.inputProvenance === "live" ? 1 : 0.9, // fixture inputs cost integrity
  });
}

export function computeLineupCourt(input: LineupContextInput): LineupCourtRead {
  // Phase 5C — roll-big SCORING par: distinct factor logic (a big's points bend
  // differently than a guard's). Only his SCORING is shaped here; his non-scoring
  // value lives in the possession proof, not the par.
  if (input.archetypeClass === "roll_big") {
    const b = ROLL_BIG_MODEL_V1;
    const oppRim = input.oppRimProtectionSignal ?? 0.5;
    const pace = input.paceScarcitySignal ?? 0.5;
    const create = input.creationSupportSignal ?? 0.5;
    const roll = input.rollGravitySignal ?? 0.5;
    const factors: LineupFactor[] = [
      { key: "oppInterior", label: "Opponent interior (contests his finishes)", weightPct: round(b.oppRimProtection * oppRim * 100, 1), note: "opposing size contests his rim finishes" },
      { key: "paceScarcity", label: "Pace scarcity (fewer possessions)", weightPct: round(b.paceScarcity * pace * 100, 1), note: "a grind means fewer scoring chances" },
      { key: "creationSupport", label: "Creation support (relief)", weightPct: round(-b.creationSupport * create * 100, 1), note: "a guard who finds him manufactures easy looks" },
      { key: "rollGravity", label: "Roll gravity (relief)", weightPct: round(-b.rollGravity * roll * 100, 1), note: "his dive bends help and opens the rim" },
    ];
    const net = clamp(factors.reduce((s, f) => s + f.weightPct, 0) / 100, -0.15, 0.25);
    const lineupPar = round(input.marketPar * (1 - net), 1);
    return {
      marketPar: input.marketPar, lineupPar,
      lineupAdjustment: round(lineupPar - input.marketPar, 1), lineupSuppressionPct: round(net, 4),
      factors, confidence: lineupConfidence(input),
      source: "engine", modelVersion: LINEUP_ENGINE_VERSION, inputProvenance: input.inputProvenance,
      missing: [...input.missing, "big-man NON-scoring value not in par (lives in possession proof)"],
    };
  }

  // Non-scoring archetypes: not modeled yet. Return market par unchanged, and
  // SAY the model is missing rather than invent a lineup effect.
  if (input.archetypeClass !== "scorer") {
    return {
      marketPar: input.marketPar, lineupPar: input.marketPar, lineupAdjustment: 0, lineupSuppressionPct: 0,
      factors: [], confidence: clamp(lineupConfidence(input) * 0.5, 0, 1),
      source: "engine", modelVersion: LINEUP_ENGINE_VERSION, inputProvenance: input.inputProvenance,
      missing: [...input.missing, "lineup model for non-scoring archetypes (pending)"],
    };
  }

  const m = SCORER_MODEL_V1;
  const factors: LineupFactor[] = [
    { key: "spacing", label: "Spacing hazard (non-shooter on floor)", weightPct: round(m.spacing * input.spacingSignal * 100, 1), note: "a non-shooter on the floor shrinks his pull-up space" },
    { key: "poa", label: "POA pressure (on-ball defender)", weightPct: round(m.poa * input.poaSignal * 100, 1), note: "elite point-of-attack pressure on his handle" },
    { key: "rim", label: "Rim protection (paint walled off)", weightPct: round(m.rim * input.rimSignal * 100, 1), note: "drives meet a deterrent at the rim" },
    { key: "burden", label: "Creation burden (on-ball load)", weightPct: round(m.burden * input.burdenSignal * 100, 1), note: "heavy on-ball load drags efficiency" },
    { key: "synergy", label: "Roll-gravity synergy (relief)", weightPct: round(-m.synergyRelief * input.synergySignal * 100, 1), note: "roll gravity buys back a little room" },
  ];

  // Net from the DISPLAYED factor percents, so the breakdown always sums to the
  // result the user sees. Clamp keeps a pathological input from inverting par.
  const net = clamp(factors.reduce((s, f) => s + f.weightPct, 0) / 100, -0.15, 0.25);
  const lineupPar = round(input.marketPar * (1 - net), 1);

  return {
    marketPar: input.marketPar, lineupPar,
    lineupAdjustment: round(lineupPar - input.marketPar, 1),
    lineupSuppressionPct: round(net, 4),
    factors, confidence: lineupConfidence(input),
    source: "engine", modelVersion: LINEUP_ENGINE_VERSION, inputProvenance: input.inputProvenance,
    missing: input.missing,
  };
}

// =============================================================================
// SELF-CHECKS — the canonical trap guard must land 24.5 -> 23.1, explained.
// =============================================================================
export function runLineupSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const approx = (a: number, b: number, t = 0.02) => Math.abs(a - b) <= t;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  const canonical: LineupContextInput = {
    marketPar: 24.5, archetypeClass: "scorer",
    spacingSignal: 0.72, poaSignal: 0.85, rimSignal: 0.78, burdenSignal: 0.62, synergySignal: 0.40,
    lineupStatusConfidence: 0.9, inputProvenance: "synthetic_fixture",
    missing: ["real on/off splits", "tracking-based spacing", "injury/availability modifiers"],
  };
  const r = computeLineupCourt(canonical);

  check("canonical -> lineupPar 23.1 (engine-computed, not stamped)", r.lineupPar === 23.1);
  check("canonical -> adjustment -1.4 points", approx(r.lineupAdjustment, -1.4));
  check("canonical -> net suppression 5.7%", approx(r.lineupSuppressionPct, 0.057, 0.0005));
  check("factors sum to the displayed net", approx(r.factors.reduce((s, f) => s + f.weightPct, 0), 5.7, 0.01));
  check("five named factors present", r.factors.length === 5);
  check("synergy is the only relief (negative) factor", r.factors.filter((f) => f.weightPct < 0).length === 1);
  check("confidence ~0.73 (composite, honest)", approx(r.confidence, 0.73, 0.01));
  check("inputProvenance named 'synthetic_fixture'", r.inputProvenance === "synthetic_fixture");
  check("missing lineup data named", r.missing.length >= 3);

  // Monotonicity — the model behaves like basketball.
  const more = computeLineupCourt({ ...canonical, spacingSignal: 0.9 });
  check("more spacing hazard -> harder court (lower par)", more.lineupPar < r.lineupPar);
  const relief = computeLineupCourt({ ...canonical, synergySignal: 0.9 });
  check("more synergy -> softer court (higher par)", relief.lineupPar > r.lineupPar);
  const neutral = computeLineupCourt({ ...canonical, spacingSignal: 0, poaSignal: 0, rimSignal: 0, burdenSignal: 0, synergySignal: 0 });
  check("zero context -> lineupPar == marketPar (no invented effect)", neutral.lineupPar === 24.5);

  // Non-scoring archetype: not modeled, and says so.
  const role = computeLineupCourt({ ...canonical, archetypeClass: "role" });
  check("non-scorer -> no adjustment", role.lineupAdjustment === 0);
  check("non-scorer -> names the missing model", role.missing.some((s) => s.includes("non-scoring")));

  // Phase 5C — roll-big scoring par uses DIFFERENT factors than the scorer model.
  const bigCanonical: LineupContextInput = {
    marketPar: 11.5, archetypeClass: "roll_big",
    spacingSignal: 0, poaSignal: 0, rimSignal: 0, burdenSignal: 0, synergySignal: 0,
    oppRimProtectionSignal: 0.40, paceScarcitySignal: 0.633, creationSupportSignal: 0.60, rollGravitySignal: 0.55,
    lineupStatusConfidence: 0.9, inputProvenance: "synthetic_fixture",
    missing: ["audit synthetic on/off"],
  };
  const big = computeLineupCourt(bigCanonical);
  check("roll-big -> par computed (not stamped)", big.lineupPar > 0 && big.lineupPar !== 11.5);
  check("roll-big -> mild scoring suppression in a grind (10.5-11.5)", big.lineupPar >= 10.5 && big.lineupPar <= 11.5);
  check("roll-big -> DISTINCT factor keys (not the scorer model)", JSON.stringify(big.factors.map((f) => f.key)) === JSON.stringify(["oppInterior", "paceScarcity", "creationSupport", "rollGravity"]));
  check("roll-big -> names non-scoring value as living in the proof", big.missing.some((m) => m.includes("NON-scoring")));
  const bigMorePace = computeLineupCourt({ ...bigCanonical, paceScarcitySignal: 0.95 });
  check("roll-big -> more pace scarcity lowers his scoring par", bigMorePace.lineupPar < big.lineupPar);
  const bigMoreCreate = computeLineupCourt({ ...bigCanonical, creationSupportSignal: 0.95 });
  check("roll-big -> more creation support raises his scoring par", bigMoreCreate.lineupPar > big.lineupPar);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runLineupSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
