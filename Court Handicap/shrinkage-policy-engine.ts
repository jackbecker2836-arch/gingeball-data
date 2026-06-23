// =============================================================================
// GINGEBALL COURT HANDICAP — SHRINKAGE POLICY ENGINE (Phase 9C)
//
// The shrinkage engine produces TWO candidates for the evidence-adjusted beat:
//   v1 — weighted by consolidated final confidence
//   v2 — weighted by proof/sample (evidence-specific) confidence
//
// Phase 9B could RECOMMEND which to trust but always SHIPPED v1. This engine
// closes the loop: it CHOOSES, per claim context, and explains why. Not every
// claim should shrink by the same one number — a thin-sample possession claim
// should answer to its sample, not to the whole chain's confidence.
//
//   useEvidenceWeight = |v1 − v2| ≥ DIVERGENCE_THRESHOLD
//                       OR proofConfidence < finalConfidence − PROOF_GAP
//
// The policy NEVER touches the observed headline beat — only the selected
// evidence-adjusted value. Thresholds are named and versioned; not overfit.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/shrinkage-policy-engine.ts
// =============================================================================

import { shrink } from "@/lib/formula-registry";
import type { Confidence } from "@/lib/types";

export const SHRINKAGE_POLICY_VERSION = "ch-shrink-policy@1.0.0";

// tunable, named knobs (basketball judgment; tune here, nowhere else)
export const DIVERGENCE_THRESHOLD = 0.5;  // per-100 gap between v1 and v2
export const PROOF_GAP = 0.10;            // how far proof conf may trail final conf before we switch

const round = (x: number, d = 1) => Number(x.toFixed(d));

export type ClaimType = "beat_vs_court" | "market_claim" | "lineup_claim";
export type WeightSource = "final confidence" | "proof/sample confidence";

export interface ShrinkagePolicyDecision {
  claimType: ClaimType;
  selectedWeight: Confidence;
  selectedWeightSource: WeightSource;
  selectedShrunkValue: number;
  comparisonValue: number;     // the candidate NOT chosen
  divergence: number;          // |v1 − v2|
  recommendation: string;      // what the evidence says
  reason: string;              // why the policy chose what it chose
  policyVersion: string;
}

export function decideShrinkageWeight(input: {
  claimType: ClaimType;
  observed: number;
  effectivePrior: number;
  finalConfidence: Confidence;
  proofConfidence: Confidence;
}): ShrinkagePolicyDecision {
  const w1 = Math.max(0, Math.min(1, input.finalConfidence));
  const w2 = Math.max(0, Math.min(1, input.proofConfidence));
  const v1 = round(shrink({ observed: input.observed, prior: input.effectivePrior, confidence: w1 }), 1);
  const v2 = round(shrink({ observed: input.observed, prior: input.effectivePrior, confidence: w2 }), 1);
  const divergence = round(Math.abs(v1 - v2), 1);

  // v1 policy: specialized only for beat_vs_court. Other claim types default to
  // final confidence (reserved, named) until their policy is written.
  if (input.claimType !== "beat_vs_court") {
    return {
      claimType: input.claimType, selectedWeight: w1, selectedWeightSource: "final confidence",
      selectedShrunkValue: v1, comparisonValue: v2, divergence,
      recommendation: "n/a — evidence-weighting policy not yet specialized for this claim",
      reason: `policy v1 only specializes beat_vs_court; ${input.claimType} defaults to final confidence`,
      policyVersion: SHRINKAGE_POLICY_VERSION,
    };
  }

  const bigDivergence = divergence >= DIVERGENCE_THRESHOLD;
  const proofTrails = w2 < w1 - PROOF_GAP;
  const useEvidence = bigDivergence || proofTrails;

  const recommendation = useEvidence
    ? "use the evidence-specific weight — the possession sample disagrees with overall chain confidence, and the beat is a sample claim"
    : "final-confidence weight is fine — the sample and the chain agree";

  if (useEvidence) {
    const trigger = bigDivergence
      ? `|v1−v2| ${divergence} ≥ ${DIVERGENCE_THRESHOLD}`
      : `proof conf ${round(w2, 2)} < final ${round(w1, 2)} − ${PROOF_GAP}`;
    return {
      claimType: "beat_vs_court", selectedWeight: w2, selectedWeightSource: "proof/sample confidence",
      selectedShrunkValue: v2, comparisonValue: v1, divergence,
      recommendation, reason: `evidence-weighted: ${trigger}`, policyVersion: SHRINKAGE_POLICY_VERSION,
    };
  }
  return {
    claimType: "beat_vs_court", selectedWeight: w1, selectedWeightSource: "final confidence",
    selectedShrunkValue: v1, comparisonValue: v2, divergence,
    recommendation, reason: `final-confidence: divergence ${divergence} < ${DIVERGENCE_THRESHOLD} and proof conf within ${PROOF_GAP} of final`,
    policyVersion: SHRINKAGE_POLICY_VERSION,
  };
}

// =============================================================================
export function runShrinkagePolicySelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  // canonical full sample: final 0.60, proof 0.64 -> agree -> keep final
  const full = decideShrinkageWeight({ claimType: "beat_vs_court", observed: 8.6, effectivePrior: 0.11, finalConfidence: 0.6, proofConfidence: 0.64 });
  check("full sample -> selects FINAL confidence", full.selectedWeightSource === "final confidence");
  check("full sample -> selected ≈ v1 (5.2)", Math.abs(full.selectedShrunkValue - 5.2) <= 0.1);
  check("full sample -> small divergence (<0.5)", full.divergence < 0.5);
  check("full sample -> reason cites the threshold", full.reason.includes("final-confidence"));

  // thin sample LOW: final 0.22, proof 0.10 -> big divergence -> switch to evidence
  const thin = decideShrinkageWeight({ claimType: "beat_vs_court", observed: 8.6, effectivePrior: 0.11, finalConfidence: 0.22, proofConfidence: 0.10 });
  check("thin sample -> selects PROOF/SAMPLE confidence", thin.selectedWeightSource === "proof/sample confidence");
  check("thin sample -> selected value drops (≈1.0, not 2.0)", thin.selectedShrunkValue < full.selectedShrunkValue && thin.selectedShrunkValue <= 1.1);
  check("thin sample -> the system ACTS on the divergence", thin.selectedShrunkValue === thin.selectedShrunkValue && thin.comparisonValue !== thin.selectedShrunkValue);
  check("thin sample -> reason names the trigger", thin.reason.includes("evidence-weighted"));

  // proof-trails backstop: divergence small but proof much lower than final
  const trails = decideShrinkageWeight({ claimType: "beat_vs_court", observed: 1.0, effectivePrior: 0, finalConfidence: 0.7, proofConfidence: 0.4 });
  check("proof-trails -> switches to evidence even on small divergence", trails.selectedWeightSource === "proof/sample confidence");

  // reserved claim types default to final confidence, said plainly
  const reserved = decideShrinkageWeight({ claimType: "market_claim", observed: 5, effectivePrior: 0, finalConfidence: 0.6, proofConfidence: 0.2 });
  check("reserved claim -> defaults to final confidence (policy not specialized)", reserved.selectedWeightSource === "final confidence" && reserved.reason.includes("only specializes"));

  // observed is never altered by the policy
  check("policy never alters observed (only selects a shrunk candidate)", full.selectedShrunkValue !== 8.6 && thin.selectedShrunkValue !== 8.6);
  check("versioned + explainable", full.policyVersion === SHRINKAGE_POLICY_VERSION && thin.recommendation.length > 10);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runShrinkagePolicySelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
