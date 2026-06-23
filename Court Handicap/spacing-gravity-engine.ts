// =============================================================================
// GINGEBALL COURT HANDICAP — SPACING-GRAVITY ENGINE v1 (Phase 11J)
//
// The second non-scoring engine. Deterrence gave rim protectors a real bone; spacing gravity
// gives the offense's SHAPE a real bone — the pull a shooter exerts on a defense and the shot
// quality that pull lifts for teammates. It touches guards, spot-up wings, movement shooters,
// connectors, stretch bigs, and low-usage specialists.
//
// HONESTY: inputs are synthetic / fixture (no real tracking), curves are uncalibrated v1.
// Output carries provenance `spacing_gravity_engine_v1`, confidence ≤0.6 — above a pending
// placeholder, deliberately below an engine_modeled measured stat. It is not tracking.
// =============================================================================

export interface SpacingGravityInput {
  threePointVolumePer100: number;  // attempts per 100
  threePointAccuracy: number;      // 0..1
  movementShootingRating: number;  // 0..1 off-screen / relocation threat
  cornerSpacingRating: number;     // 0..1 corner presence
  pullUpThreatRating: number;      // 0..1 on-ball pull-up gravity
  defensiveAttention: number;      // 0..1 how much the defense commits
  lineupSpacingScarcity: number;   // 0..1 crowded floor reduces room
  expectedPossessions: number;     // pace
  actualSpacingGravity?: number;   // synthetic observed
  actualShotQualityLift?: number;  // synthetic observed
  inputProvenance: string;
}

export interface SpacingGravityOutput {
  expectedSpacingGravity: number; actualSpacingGravity: number; spacingGravityDelta: number;
  expectedShotQualityLift: number; actualShotQualityLift: number; shotQualityDelta: number;
  confidence: number;
  provenance: "spacing_gravity_engine_v1";
  drivers: string[];
  limitations: string[];
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const r2 = (x: number) => Math.round(x * 100) / 100;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function computeSpacingGravity(input: SpacingGravityInput): SpacingGravityOutput {
  const paceScale = input.expectedPossessions / 88.6;
  // shooting threat: volume × accuracy, lifted by movement / corner / pull-up presence
  const shootingThreat = (input.threePointVolumePer100 / 10) * clamp01(input.threePointAccuracy);
  const presence = (clamp01(input.movementShootingRating) * 0.4 + clamp01(input.cornerSpacingRating) * 0.3 + clamp01(input.pullUpThreatRating) * 0.3);
  // defensive attention amplifies gravity; a crowded floor (scarcity) suppresses room
  const roomFactor = 1 - 0.5 * clamp01(input.lineupSpacingScarcity);
  const gravityBase = shootingThreat * (0.6 + 0.8 * presence) * (0.7 + 0.6 * clamp01(input.defensiveAttention)) * roomFactor;

  const expectedSpacingGravity = r1(gravityBase * 6 * paceScale); // scaled to a per-game-ish gravity index
  const actualSpacingGravity = r1(input.actualSpacingGravity ?? expectedSpacingGravity);

  // shot-quality lift: gravity converts to teammate shot quality (eFG points per 100), discounted
  const expectedShotQualityLift = r2(gravityBase * 2.2 * clamp01(input.defensiveAttention) * paceScale);
  const actualShotQualityLift = r2(input.actualShotQualityLift ?? expectedShotQualityLift);

  let confidence = 0.5;
  if (input.actualSpacingGravity != null && input.actualShotQualityLift != null) confidence += 0.05;
  if (input.inputProvenance === "box_score" || input.inputProvenance === "tracking_estimate") confidence += 0.05;
  confidence = Math.round(Math.min(0.6, confidence) * 100) / 100;

  const limitations = [
    "inputs are synthetic / fixture (no real tracking)",
    "v1 gravity + shot-quality curves are uncalibrated",
  ];
  if (input.actualSpacingGravity == null) limitations.push("actual gravity defaulted to expected (no observation)");

  return {
    expectedSpacingGravity, actualSpacingGravity, spacingGravityDelta: r1(actualSpacingGravity - expectedSpacingGravity),
    expectedShotQualityLift, actualShotQualityLift, shotQualityDelta: r2(actualShotQualityLift - expectedShotQualityLift),
    confidence, provenance: "spacing_gravity_engine_v1",
    drivers: ["three-point volume × accuracy", "movement / corner / pull-up presence", "defensive attention", "lineup spacing room", "pace"],
    limitations,
  };
}

/** Translate spacing-gravity output into a stat-vector override for spacing_gravity. */
export function spacingGravityStatOverrides(out: SpacingGravityOutput) {
  return {
    spacing_gravity: { expected: out.expectedSpacingGravity, actual: out.actualSpacingGravity, provenance: "spacing_gravity_engine_v1" as const, confidence: out.confidence },
  };
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runSpacingGravitySelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const base: SpacingGravityInput = {
    threePointVolumePer100: 9, threePointAccuracy: 0.4, movementShootingRating: 0.7, cornerSpacingRating: 0.7,
    pullUpThreatRating: 0.5, defensiveAttention: 0.7, lineupSpacingScarcity: 0.3, expectedPossessions: 98, inputProvenance: "synthetic_audit_fixture",
  };
  const o = computeSpacingGravity(base);

  check("produces expected / actual / delta for spacing gravity", typeof o.expectedSpacingGravity === "number" && typeof o.spacingGravityDelta === "number");
  check("produces expected / actual / delta for shot-quality lift", typeof o.expectedShotQualityLift === "number" && typeof o.shotQualityDelta === "number");
  check("better shooting accuracy raises gravity", computeSpacingGravity({ ...base, threePointAccuracy: 0.45 }).expectedSpacingGravity > computeSpacingGravity({ ...base, threePointAccuracy: 0.30 }).expectedSpacingGravity);
  check("more three-point volume raises gravity", computeSpacingGravity({ ...base, threePointVolumePer100: 13 }).expectedSpacingGravity > o.expectedSpacingGravity);
  check("a crowded floor (more scarcity) lowers gravity", computeSpacingGravity({ ...base, lineupSpacingScarcity: 0.8 }).expectedSpacingGravity < o.expectedSpacingGravity);
  check("more defensive attention raises shot-quality lift", computeSpacingGravity({ ...base, defensiveAttention: 0.9 }).expectedShotQualityLift > o.expectedShotQualityLift);
  check("actual above expected yields positive delta", computeSpacingGravity({ ...base, actualSpacingGravity: o.expectedSpacingGravity + 3 }).spacingGravityDelta > 0);

  check("provenance is spacing_gravity_engine_v1 (not pending)", o.provenance === "spacing_gravity_engine_v1");
  check("confidence is moderate, never measured-high (≤0.6)", o.confidence <= 0.6 && o.confidence >= 0.4);
  check("limitations are named (synthetic, uncalibrated)", o.limitations.length >= 2);
  check("drivers are named", o.drivers.length >= 4);

  const ov = spacingGravityStatOverrides(o);
  check("override upgrades spacing_gravity to engine v1", ov.spacing_gravity.provenance === "spacing_gravity_engine_v1");

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runSpacingGravitySelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
