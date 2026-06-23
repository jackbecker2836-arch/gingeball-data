// =============================================================================
// GINGEBALL COURT HANDICAP — COURT SLOPE v2 (Phase 9A)
//
// Slope was a label. Now it has a spine. v2 answers three questions the old label
// blurred together:
//
//   1. HOW FAR did par slide from normal?        -> slopeMagnitude (normalized)
//   2. WHICH WAY did it bend?                     -> slopeDirection
//   3. WHO bent it?                               -> slopeSourceBreakdown
//
// The source breakdown keeps three ideas DISTINCT that are not the same thing:
//   • market-created slope   (the line moved par)
//   • lineup-created slope    (the five bodies moved par)
//   • archetype hostility     (the SAME par feels harder/easier to this player)
//
// The first two move par and split 100%. The third is a SEPARATE axis — an overlay
// — because the rim protector proves par can barely move while the court still
// flips from hostile to friendly. Folding archetype into the par split would lie.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/court-slope-engine.ts
// =============================================================================

import type { Confidence } from "@/lib/types";

export const COURT_SLOPE_VERSION = "ch-court-slope@2.0.0";

const round = (x: number, d = 2) => Number(x.toFixed(d));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export type SlopeDirection = "harder" | "easier" | "flat";

export interface SlopeSourceBreakdown {
  marketPct: number;        // share of the PAR movement created by the market (0..1)
  lineupPct: number;        // share of the PAR movement created by the lineup (0..1)
  archetypeOverlay: number; // SEPARATE axis: -1..1, + = archetype makes it harder than par implies
}

export interface CourtSlopeRead {
  slopeMagnitude: number;          // |normal − lineup| / normal, 0..1
  slopeDirection: SlopeDirection;  // par suppressed = harder
  slopeLabel: string;              // e.g. "MODERATE · harder · market-led"
  slopeSourceBreakdown: SlopeSourceBreakdown;
  archetypeFeel: SlopeDirection;   // what the archetype overlay does on its own
  slopeConfidence: Confidence;
  source: "engine";
  modelVersion: string;
}

function bucket(mag: number): string {
  if (mag < 0.04) return "FLAT";
  if (mag < 0.10) return "GENTLE";
  if (mag < 0.18) return "MODERATE";
  return "STEEP";
}

export function computeCourtSlope(input: {
  normalPar: number; marketPar: number; lineupPar: number;
  archetypeDifficulty: number;     // 0..100 (50 = neutral)
  marketConfidence: Confidence; lineupConfidence: Confidence; archetypeConfidence: Confidence;
}): CourtSlopeRead {
  const marketBend = input.normalPar - input.marketPar;   // + = harder
  const lineupBend = input.marketPar - input.lineupPar;
  const totalParBend = input.normalPar - input.lineupPar;

  const slopeMagnitude = round(Math.abs(totalParBend) / Math.max(1e-6, input.normalPar), 3);
  const slopeDirection: SlopeDirection = totalParBend > 0.05 ? "harder" : totalParBend < -0.05 ? "easier" : "flat";

  const marketAbs = Math.abs(marketBend), lineupAbs = Math.abs(lineupBend);
  const denom = marketAbs + lineupAbs;
  const marketPct = denom < 1e-6 ? 0 : round(marketAbs / denom, 2);
  const lineupPct = denom < 1e-6 ? 0 : round(lineupAbs / denom, 2);
  const archetypeOverlay = round(clamp((input.archetypeDifficulty - 50) / 50, -1, 1), 2);
  const archetypeFeel: SlopeDirection = archetypeOverlay > 0.05 ? "harder" : archetypeOverlay < -0.05 ? "easier" : "flat";

  const dominant = denom < 1e-6 ? "flat" : marketPct >= lineupPct ? "market-led" : "lineup-led";
  const slopeLabel = `${bucket(slopeMagnitude)} · ${slopeDirection} · ${dominant}`;

  const slopeConfidence = round(
    Math.cbrt(clamp(input.marketConfidence, 0, 1) * clamp(input.lineupConfidence, 0, 1) * clamp(input.archetypeConfidence, 0, 1)),
    2,
  );

  return {
    slopeMagnitude, slopeDirection, slopeLabel,
    slopeSourceBreakdown: { marketPct, lineupPct, archetypeOverlay },
    archetypeFeel, slopeConfidence, source: "engine", modelVersion: COURT_SLOPE_VERSION,
  };
}

// =============================================================================
export function runCourtSlopeSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };
  const approx = (a: number, b: number, t = 0.01) => Math.abs(a - b) <= t;

  // canonical guard court: 27.5 -> 24.5 -> 23.1, difficulty 75
  const guard = computeCourtSlope({ normalPar: 27.5, marketPar: 24.5, lineupPar: 23.1, archetypeDifficulty: 75, marketConfidence: 0.8, lineupConfidence: 0.85, archetypeConfidence: 0.5 });
  check("guard -> magnitude ≈ 0.16 (4.4/27.5)", approx(guard.slopeMagnitude, 0.16, 0.005));
  check("guard -> direction harder", guard.slopeDirection === "harder");
  check("guard -> MODERATE bucket", guard.slopeLabel.startsWith("MODERATE"));
  check("guard -> market-led (68/32)", approx(guard.slopeSourceBreakdown.marketPct, 0.68, 0.02) && guard.slopeLabel.includes("market-led"));
  check("guard -> par split sums to ~1", approx(guard.slopeSourceBreakdown.marketPct + guard.slopeSourceBreakdown.lineupPct, 1, 0.01));
  check("guard -> archetype overlay harder (+0.5)", approx(guard.slopeSourceBreakdown.archetypeOverlay, 0.5, 0.01) && guard.archetypeFeel === "harder");
  check("guard -> slope confidence blended + capped (<0.75)", guard.slopeConfidence > 0 && guard.slopeConfidence < 0.75);

  // rim protector court: 12.5 -> 11.5 -> 11.4, difficulty 43 (THE INVERSION)
  const big = computeCourtSlope({ normalPar: 12.5, marketPar: 11.5, lineupPar: 11.4, archetypeDifficulty: 43, marketConfidence: 0.8, lineupConfidence: 0.85, archetypeConfidence: 0.53 });
  check("big -> gentle par slope (~0.088)", approx(big.slopeMagnitude, 0.088, 0.005) && big.slopeLabel.startsWith("GENTLE"));
  check("big -> par direction harder (pace dip) BUT archetype overlay EASIER", big.slopeDirection === "harder" && big.archetypeFeel === "easier");
  check("INVERSION -> separates par-slide from archetype favorability", big.slopeSourceBreakdown.archetypeOverlay < 0 && guard.slopeSourceBreakdown.archetypeOverlay > 0);

  // a flat court: no movement
  const flat = computeCourtSlope({ normalPar: 20, marketPar: 20, lineupPar: 20, archetypeDifficulty: 50, marketConfidence: 0.8, lineupConfidence: 0.8, archetypeConfidence: 0.6 });
  check("flat -> magnitude ~0, direction flat", flat.slopeMagnitude < 0.04 && flat.slopeDirection === "flat" && flat.archetypeFeel === "flat");

  // lineup-led court: market barely moves, lineup does the bending
  const lineupLed = computeCourtSlope({ normalPar: 27.5, marketPar: 27.0, lineupPar: 23.0, archetypeDifficulty: 60, marketConfidence: 0.8, lineupConfidence: 0.85, archetypeConfidence: 0.6 });
  check("lineup-led -> breakdown attributes the bend to lineup", lineupLed.slopeSourceBreakdown.lineupPct > lineupLed.slopeSourceBreakdown.marketPct && lineupLed.slopeLabel.includes("lineup-led"));

  check("explainable -> label + version present", guard.slopeLabel.length > 5 && guard.modelVersion === COURT_SLOPE_VERSION);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runCourtSlopeSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
