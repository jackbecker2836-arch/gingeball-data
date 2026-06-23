// =============================================================================
// GINGEBALL COURT HANDICAP — DETERRENCE ENGINE v1 (Phase 11I)
//
// The first non-scoring value category to stop being a `pending_engine` placeholder.
// Rim-protector value has been central since the rim protector entered the conversation;
// this gives it a real engine STRUCTURE — expected vs actual deterrence and rim contests,
// foul risk, drivers, limitations — instead of a raw proxy.
//
// HONESTY: the inputs are synthetic / fixture (no real tracking), and the deterrence curve
// is an uncalibrated v1. So the output carries provenance `deterrence_engine_v1` with
// moderate confidence (≈0.5) — above a pending placeholder, deliberately below an
// engine_modeled scoring par. It does not pretend to be measured.
// =============================================================================

export interface DeterrenceInput {
  opponentRimAttemptsPer100: number; // rim pressure the protector faces
  rimProtectionRating: number;       // 0..1 protector rating (synthetic / fixture)
  foulDisciplineRating: number;      // 0..1, higher = more disciplined
  expectedPossessions: number;       // pace (market engine output)
  actualDeterrenceEvents?: number;   // synthetic observed
  actualRimContests?: number;        // synthetic observed
  inputProvenance: string;           // e.g., "synthetic_audit_fixture"
}

export interface DeterrenceOutput {
  expectedDeterrence: number; actualDeterrence: number; deterrenceDelta: number;
  expectedRimContests: number; actualRimContests: number; rimContestDelta: number;
  foulRisk: number;            // 0..1, higher = more foul exposure
  confidence: number;          // moderate, v1
  provenance: "deterrence_engine_v1";
  drivers: string[];
  limitations: string[];
}

const r1 = (x: number) => Math.round(x * 10) / 10;
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function computeDeterrence(input: DeterrenceInput): DeterrenceOutput {
  const paceScale = input.expectedPossessions / 88.6; // canonical possession base
  // v1 synthetic curves (uncalibrated, labeled): better rating deters/contests more
  const deterRate = 0.15 + 0.45 * clamp01(input.rimProtectionRating);
  const contestRate = 0.30 + 0.50 * clamp01(input.rimProtectionRating);

  const expectedDeterrence = r1(input.opponentRimAttemptsPer100 * deterRate * paceScale);
  const expectedRimContests = r1(input.opponentRimAttemptsPer100 * contestRate * paceScale);
  const actualDeterrence = r1(input.actualDeterrenceEvents ?? expectedDeterrence);
  const actualRimContests = r1(input.actualRimContests ?? expectedRimContests);

  const foulRisk = r1(clamp01(1 - input.foulDisciplineRating) * (0.6 + 0.4 * clamp01(input.rimProtectionRating)));

  // confidence: a v1 engine on synthetic inputs. Starts at 0.5, nudged by input completeness;
  // capped at 0.6 so it never speaks like a measured stat.
  let confidence = 0.5;
  if (input.actualDeterrenceEvents != null && input.actualRimContests != null) confidence += 0.05;
  if (input.inputProvenance === "box_score" || input.inputProvenance === "tracking_estimate") confidence += 0.05;
  confidence = Math.round(Math.min(0.6, confidence) * 100) / 100;

  const limitations = [
    "inputs are synthetic / fixture (no real tracking)",
    "v1 deterrence + contest curves are uncalibrated",
  ];
  if (input.actualDeterrenceEvents == null) limitations.push("actual deterrence defaulted to expected (no observation)");

  return {
    expectedDeterrence, actualDeterrence, deterrenceDelta: r1(actualDeterrence - expectedDeterrence),
    expectedRimContests, actualRimContests, rimContestDelta: r1(actualRimContests - expectedRimContests),
    foulRisk, confidence, provenance: "deterrence_engine_v1",
    drivers: ["opponent rim pressure", "rim-protection rating", "pace"],
    limitations,
  };
}

/** Translate deterrence output into stat-vector overrides for rim_protector. */
export function deterrenceStatOverrides(out: DeterrenceOutput) {
  return {
    deterrence_events: { expected: out.expectedDeterrence, actual: out.actualDeterrence, provenance: "deterrence_engine_v1" as const, confidence: out.confidence },
    rim_contests: { expected: out.expectedRimContests, actual: out.actualRimContests, provenance: "deterrence_engine_v1" as const, confidence: out.confidence },
  };
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runDeterrenceSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const base: DeterrenceInput = { opponentRimAttemptsPer100: 28, rimProtectionRating: 0.85, foulDisciplineRating: 0.7, expectedPossessions: 96, inputProvenance: "synthetic_audit_fixture" };
  const o = computeDeterrence(base);

  check("produces expected / actual / delta for deterrence", typeof o.expectedDeterrence === "number" && typeof o.deterrenceDelta === "number");
  check("produces expected / actual / delta for rim contests", typeof o.expectedRimContests === "number" && typeof o.rimContestDelta === "number");
  check("a better protector deters more", computeDeterrence({ ...base, rimProtectionRating: 0.9 }).expectedDeterrence > computeDeterrence({ ...base, rimProtectionRating: 0.3 }).expectedDeterrence);
  check("more opponent rim pressure raises expected deterrence", computeDeterrence({ ...base, opponentRimAttemptsPer100: 40 }).expectedDeterrence > o.expectedDeterrence);
  check("faster pace raises expected deterrence", computeDeterrence({ ...base, expectedPossessions: 104 }).expectedDeterrence > o.expectedDeterrence);
  check("worse foul discipline raises foul risk", computeDeterrence({ ...base, foulDisciplineRating: 0.3 }).foulRisk > o.foulRisk);
  check("actual above expected yields positive delta", computeDeterrence({ ...base, actualDeterrenceEvents: o.expectedDeterrence + 4 }).deterrenceDelta > 0);

  check("provenance is deterrence_engine_v1 (not pending placeholder)", o.provenance === "deterrence_engine_v1");
  check("confidence is moderate, never measured-high (≤0.6)", o.confidence <= 0.6 && o.confidence >= 0.4);
  check("limitations are named (synthetic inputs, uncalibrated v1)", o.limitations.length >= 2);
  check("drivers are named", o.drivers.length >= 3);

  const ov = deterrenceStatOverrides(o);
  check("overrides upgrade deterrence_events + rim_contests to engine v1", ov.deterrence_events.provenance === "deterrence_engine_v1" && ov.rim_contests.provenance === "deterrence_engine_v1");

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runDeterrenceSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
