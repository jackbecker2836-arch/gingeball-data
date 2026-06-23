// =============================================================================
// GINGEBALL COURT HANDICAP — SHRINKAGE ENGINE (Phase 9A)
//
// Trust math. Low-confidence evidence should not shout; it should be pulled toward
// a prior expectation. High-confidence evidence keeps its voice. This lets the
// product be BOLD without being RECKLESS: a thin-sample +8.6 beat is not the same
// claim as a full-sample +8.6 beat, and the engine says so.
//
//   shrunk = confidence × observed + (1 − confidence) × prior
//
// v1 scope: applied to the beat-vs-court value, with prior = 0 (the null: "met the
// court, no demonstrated edge"). The HEADLINE observed beat is unchanged and
// byte-stable; the shrunk value travels ALONGSIDE it, clearly labeled. Nothing is
// hidden in the UI: observed, prior, confidence, shrunk, amount, and a plain-words
// reason all come out of the engine.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/shrinkage-engine.ts
// =============================================================================

import { shrink } from "@/lib/formula-registry";
import type { Confidence } from "@/lib/types";
import { computePlayerPrior, type PriorRead } from "@/lib/hierarchical-prior-engine";
import { decideShrinkageWeight, type ShrinkagePolicyDecision, type ClaimType } from "@/lib/shrinkage-policy-engine";

export const SHRINKAGE_ENGINE_VERSION = "ch-shrinkage@1.1.0";

const round = (x: number, d = 1) => Number(x.toFixed(d));

export interface ShrinkageComparison {
  v1Final: number;       // shrunk using consolidated final confidence
  v2Evidence: number;    // shrunk using proof/sample (evidence-specific) confidence
  difference: number;    // v1 − v2
  weightV1: number;
  weightV2: number;
  recommendation: string;
}

export interface ShrinkageRead {
  observed: number;
  prior: number;            // the (effective) prior shrunk toward
  priorSource?: string;     // Phase 9B: which prior, in words
  confidence: Confidence;   // the weight actually used for the shipped `shrunk`
  shrunk: number;
  shrinkageAmount: number;  // observed − shrunk
  pulledToward: "prior" | "none";
  explanation: string;
  comparison?: ShrinkageComparison;  // Phase 9B: final-confidence vs evidence-weighted
  policy?: ShrinkagePolicyDecision;  // Phase 9C: which weight the policy selected, and why
  source: "engine";
  modelVersion: string;
}

// The core v1 operation. `label`/`unit` only shape the explanation sentence.
export function shrinkValue(input: {
  observed: number; prior: number; confidence: Confidence;
  label?: string; unit?: string;
}): ShrinkageRead {
  const confidence = Math.max(0, Math.min(1, input.confidence));
  const shrunk = round(shrink({ observed: input.observed, prior: input.prior, confidence }), 1);
  const shrinkageAmount = round(input.observed - shrunk, 1);
  const label = input.label ?? "value";
  const unit = input.unit ?? "";
  const pct = Math.round(confidence * 100);
  const explanation =
    shrinkageAmount === 0
      ? `Full-confidence evidence (${pct}%): the ${label} stands at ${input.observed}${unit}.`
      : `At ${pct}% confidence, the defensible ${label} is ${shrunk}${unit} — ${Math.abs(shrinkageAmount)}${unit} of the observed ${input.observed}${unit} is held back toward the ${input.prior}${unit} prior until the evidence is stronger.`;
  return {
    observed: round(input.observed, 1), prior: round(input.prior, 1), confidence,
    shrunk, shrinkageAmount, pulledToward: shrinkageAmount === 0 ? "none" : "prior",
    explanation, source: "engine", modelVersion: SHRINKAGE_ENGINE_VERSION,
  };
}

// Convenience for the most common v1 use: a beat-vs-court toward the no-edge null.
export function shrinkBeat(observedBeatPer100: number, confidence: Confidence): ShrinkageRead {
  return shrinkValue({ observed: observedBeatPer100, prior: 0, confidence, label: "beat", unit: "/100" });
}

// Phase 9B — shrink a beat toward a HIERARCHICAL prior, and compare the shipped
// final-confidence weight against an evidence-specific (proof/sample) weight.
// The shipped `shrunk` keeps v1 (final confidence) — we do not switch blindly —
// but the comparison surfaces what an evidence-weighted shrink would say plus a
// recommendation, so the choice can be made on evidence, not vibes.
export function shrinkBeatHierarchical(input: {
  observed: number;
  finalConfidence: Confidence;    // v1 weight (shipped)
  proofConfidence: Confidence;    // v2 candidate weight (evidence-specific)
  prior: PriorRead;
}): ShrinkageRead {
  const observed = round(input.observed, 1);
  const eff = input.prior.effectivePrior;
  const w1 = Math.max(0, Math.min(1, input.finalConfidence));
  const w2 = Math.max(0, Math.min(1, input.proofConfidence));

  const v1 = round(shrink({ observed, prior: eff, confidence: w1 }), 1);
  const v2 = round(shrink({ observed, prior: eff, confidence: w2 }), 1);
  const difference = round(v1 - v2, 1);
  const recommendation =
    Math.abs(difference) < 0.5
      ? "final-confidence weight is fine — the possession sample and the chain agree"
      : "prefer the evidence-specific (proof) weight — the possession sample disagrees with overall chain confidence, and the beat is a sample claim";

  const shrinkageAmount = round(observed - v1, 1);
  const pct = Math.round(w1 * 100);
  const priorTxt = input.prior.fallbackToZero ? "the no-edge null (0)" : `the ${input.prior.priorSource} prior`;
  const explanation =
    `At ${pct}% confidence, the defensible beat is ${v1 > 0 ? "+" : ""}${v1}/100, shrunk toward ${priorTxt} ` +
    `(effective ${eff > 0 ? "+" : ""}${eff}/100). Evidence-weighted (proof ${Math.round(w2 * 100)}%) would give ${v2 > 0 ? "+" : ""}${v2}/100.`;

  return {
    observed, prior: eff, priorSource: input.prior.fallbackToZero ? "no-edge null" : input.prior.priorSource,
    confidence: w1, shrunk: v1, shrinkageAmount,
    pulledToward: shrinkageAmount === 0 ? "none" : "prior", explanation,
    comparison: { v1Final: v1, v2Evidence: v2, difference, weightV1: round(w1, 2), weightV2: round(w2, 2), recommendation },
    source: "engine", modelVersion: SHRINKAGE_ENGINE_VERSION,
  };
}

// Phase 9C — shrink toward the smart prior AND let the policy CHOOSE the weight
// per claim context. The shipped `shrunk`/`confidence` become the policy's
// selected candidate (final OR proof/sample), the comparison stays visible, and
// the decision (with its reason) is attached. The observed beat is never touched.
export function shrinkBeatWithPolicy(input: {
  observed: number;
  finalConfidence: Confidence;
  proofConfidence: Confidence;
  prior: PriorRead;
  claimType?: ClaimType;
}): ShrinkageRead {
  const base = shrinkBeatHierarchical(input);  // computes v1/v2 + comparison toward the prior
  const decision = decideShrinkageWeight({
    claimType: input.claimType ?? "beat_vs_court",
    observed: base.observed, effectivePrior: input.prior.effectivePrior,
    finalConfidence: input.finalConfidence, proofConfidence: input.proofConfidence,
  });

  const selected = decision.selectedShrunkValue;
  const shrinkageAmount = round(base.observed - selected, 1);
  const priorTxt = input.prior.fallbackToZero ? "the no-edge null (0)" : `the ${input.prior.priorSource} prior`;
  const explanation =
    `Selected the ${decision.selectedWeightSource} weight (${Math.round(decision.selectedWeight * 100)}%): ` +
    `${selected > 0 ? "+" : ""}${selected}/100, shrunk toward ${priorTxt}. ` +
    `${decision.reason}. The other candidate was ${decision.comparisonValue > 0 ? "+" : ""}${decision.comparisonValue}/100.`;

  return {
    ...base,
    confidence: decision.selectedWeight,
    shrunk: selected,
    shrinkageAmount,
    pulledToward: shrinkageAmount === 0 ? "none" : "prior",
    explanation,
    policy: decision,
    modelVersion: SHRINKAGE_ENGINE_VERSION,
  };
}

// =============================================================================
export function runShrinkageSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };
  const approx = (a: number, b: number, t = 0.05) => Math.abs(a - b) <= t;

  // canonical guard: +8.6 observed, ~0.60 confidence -> ~+5.2 defensible
  const guard = shrinkBeat(8.6, 0.6);
  check("guard -> shrunk = 0.60 × 8.6 ≈ 5.2", approx(guard.shrunk, 5.2, 0.05));
  check("guard -> held back ≈ 3.4", approx(guard.shrinkageAmount, 3.4, 0.05));
  check("guard -> observed unchanged (headline byte-stable)", guard.observed === 8.6);

  // thin sample: same +8.6 but 0.22 confidence -> shrinks hard toward 0
  const thin = shrinkBeat(8.6, 0.22);
  check("thin -> shrunk ≈ 1.9 (evidence too thin to claim +8.6)", approx(thin.shrunk, 1.9, 0.1));
  check("thin -> shrinks harder than guard", thin.shrunk < guard.shrunk);
  check("thin -> pulled toward prior", thin.pulledToward === "prior");

  // high confidence keeps most of the voice
  const high = shrinkBeat(8.6, 0.75);
  check("high -> keeps more (≈ 6.5)", approx(high.shrunk, 6.5, 0.1) && high.shrunk > guard.shrunk);

  // full confidence = no shrink; explanation says so
  const full = shrinkBeat(8.6, 1);
  check("full confidence -> no shrink", full.shrunk === 8.6 && full.shrinkageAmount === 0 && full.pulledToward === "none");

  // symmetry: a negative (trapped) beat shrinks toward 0 too
  const trapped = shrinkBeat(-4, 0.3);
  check("trapped -> shrinks toward 0 (≈ -1.2)", approx(trapped.shrunk, -1.2, 0.05) && trapped.shrunk > -4);

  // monotonic in confidence
  check("monotonic -> more confidence keeps more of the beat", shrinkBeat(8.6, 0.4).shrunk < shrinkBeat(8.6, 0.5).shrunk && shrinkBeat(8.6, 0.5).shrunk < shrinkBeat(8.6, 0.6).shrunk);

  // explainable: every read carries a reason + version
  check("explainable -> reason + version present", guard.explanation.length > 20 && guard.modelVersion === SHRINKAGE_ENGINE_VERSION);
  check("clamp -> confidence > 1 treated as 1", shrinkBeat(8.6, 1.4).shrunk === 8.6);

  // Phase 9B — hierarchical shrink toward a smart prior + weight comparison
  const guardPrior = computePlayerPrior({ archetype: "scoring_guard", contextTags: ["low_scoring_grind"] });
  const bigPrior = computePlayerPrior({ archetype: "rim_protector", contextTags: ["low_scoring_grind"] });
  const gh = shrinkBeatHierarchical({ observed: 8.6, finalConfidence: 0.6, proofConfidence: 0.64, prior: guardPrior });
  const bh = shrinkBeatHierarchical({ observed: 4.0, finalConfidence: 0.53, proofConfidence: 0.53, prior: bigPrior });
  check("9B -> observed beat unchanged (byte-stable)", gh.observed === 8.6 && bh.observed === 4.0);
  check("9B -> guard shrinks toward a POSITIVE prior (source named)", gh.prior > 0 && /role|archetype/.test(gh.priorSource ?? ""));
  check("9B -> big shrinks toward a NEGATIVE prior", bh.prior < 0);
  check("9B -> guard vs big shrink toward different-signed priors", Math.sign(gh.prior) !== Math.sign(bh.prior));
  check("9B -> comparison present (v1 final vs v2 evidence)", !!gh.comparison && gh.comparison.weightV1 === 0.6 && gh.comparison.weightV2 === 0.64);
  check("9B -> explanation names the prior + the evidence-weighted alternative", gh.explanation.includes("prior") && gh.explanation.includes("Evidence-weighted"));

  // thin sample: final 0.22 vs proof 0.10 -> meaningful divergence -> recommend evidence weight
  const thinH = shrinkBeatHierarchical({ observed: 8.6, finalConfidence: 0.22, proofConfidence: 0.10, prior: guardPrior });
  check("9B -> thin sample: v1 and v2 diverge", Math.abs(thinH.comparison!.difference) >= 0.5);
  check("9B -> thin sample: recommends the evidence-specific weight", thinH.comparison!.recommendation.includes("evidence-specific"));
  check("9B -> full sample: weights agree -> final is fine", gh.comparison!.recommendation.includes("fine"));

  // fallback prior (unknown archetype) -> shrink toward 0, said plainly
  const fbPrior = computePlayerPrior({ archetype: "mystery" });
  const fbH = shrinkBeatHierarchical({ observed: 8.6, finalConfidence: 0.6, proofConfidence: 0.6, prior: fbPrior });
  check("9B -> fallback prior shrinks toward null (0)", fbH.prior === 0 && (fbH.priorSource ?? "").includes("null"));

  // Phase 9C — the policy CHOOSES the selected evidence-adjusted beat
  const gP = shrinkBeatWithPolicy({ observed: 8.6, finalConfidence: 0.6, proofConfidence: 0.64, prior: guardPrior });
  const thinP = shrinkBeatWithPolicy({ observed: 8.6, finalConfidence: 0.22, proofConfidence: 0.10, prior: guardPrior });
  check("9C -> full sample keeps FINAL weight (selected == v1)", gP.policy!.selectedWeightSource === "final confidence" && gP.shrunk === gP.comparison!.v1Final);
  check("9C -> thin sample SWITCHES to evidence weight (selected == v2)", thinP.policy!.selectedWeightSource === "proof/sample confidence" && thinP.shrunk === thinP.comparison!.v2Evidence);
  check("9C -> thin selected value actually drops vs full", thinP.shrunk < gP.shrunk);
  check("9C -> observed never touched by policy", gP.observed === 8.6 && thinP.observed === 8.6);
  check("9C -> selected confidence matches the chosen weight", gP.confidence === 0.6 && thinP.confidence === 0.10);
  check("9C -> decision carries a reason + comparison stays visible", gP.policy!.reason.length > 5 && !!thinP.comparison);
  check("9C -> explanation states which weight was selected", gP.explanation.includes("Selected") && gP.explanation.includes("final confidence"));

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runShrinkageSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
