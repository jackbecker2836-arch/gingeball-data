// =============================================================================
// GINGEBALL COURT HANDICAP — VERDICT CONFIDENCE ENGINE (Phase 6B)
//
// The verdict is the product's most important claim. "BEAT THE COURT +8.6" must
// also answer: how sure are we, which layer is weakest, and how much of the chain
// is synthetic? This engine consolidates the four laws' confidences into ONE
// honest ruling confidence — it does not recompute any law, it judges them.
//
// METHOD:
//   1. weighted GEOMETRIC mean of the four layer confidences (a weak layer pulls
//      hard — unlike an arithmetic mean, which can hide it).
//   2. WEAKEST-LINK CAP: final <= weakest layer + 0.12. A strong-layer average
//      cannot float the ruling above its weakest evidence.
//   3. a gentle PROVENANCE factor (0.94 + 0.06*liveShare): an all-synthetic chain
//      is held slightly more humble, and flagged PROVISIONAL.
//
// The ruling can be strong while its confidence stays appropriately humble.
//
// Run `npx tsx --tsconfig tsconfig.check.json lib/verdict-confidence-engine.ts`.
// =============================================================================

import type { Confidence, InputProvenance } from "./types";

export const VERDICT_CONFIDENCE_VERSION = "ch-verdict-confidence@1.0.0";

const round = (x: number, d = 2) => Number(x.toFixed(d));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const VERDICT_WEIGHTS = { market: 0.20, lineup: 0.25, archetype: 0.25, proof: 0.30 } as const;
export const BLEND_ALPHA = 0.5;              // pull final halfway toward the weakest layer (monotonic)
export const WEAKEST_LINK_MARGIN = 0.12;     // hard ceiling: final cannot exceed weakest + this
// NOTE (Phase 7B): the separate provenance NUMERIC factor was removed. The Phase 7
// audit showed synthetic was penalized in proof+lineup+archetype dataIntegrity AND
// again here — stacked. Provenance now affects only the PROVISIONAL label and the
// provenance summary, not the number. The per-layer dataIntegrity caps carry it.

export type ReliabilityTier = "HIGH" | "MEDIUM" | "LOW";
export interface LayerConfidence {
  layer: "market" | "lineup" | "archetype" | "proof";
  confidence: Confidence;
  provenance: InputProvenance;
  missingCount: number;
}
export interface VerdictConfidenceInput { layers: LayerConfidence[] }

export interface VerdictConfidenceRead {
  finalConfidence: Confidence;
  tier: ReliabilityTier;
  provisional: boolean;
  reliabilityLabel: string;                  // e.g. "MEDIUM · PROVISIONAL"
  layerBreakdown: { layer: string; confidence: Confidence; provenance: InputProvenance }[];
  weakestLayer: { layer: string; confidence: Confidence };
  geometricMean: number;
  caps: string[];                            // which rules bound the final number
  warnings: string[];                        // honest cautions for the reader
  provenanceSummary: { live: number; fixture: number; synthetic: number; liveShare: number };
  version: string;
}

function tierOf(v: number): ReliabilityTier {
  if (v >= 0.72) return "HIGH";
  if (v >= 0.50) return "MEDIUM";
  return "LOW";
}

export function consolidateVerdictConfidence(input: VerdictConfidenceInput): VerdictConfidenceRead {
  const layers = input.layers;
  const w = VERDICT_WEIGHTS;
  const weightOf = (l: LayerConfidence["layer"]) => w[l];

  // weighted geometric mean = exp( Σ wi * ln(ci) ) / exp(Σ wi)  (weights sum to 1)
  const totalW = layers.reduce((s, l) => s + weightOf(l.layer), 0);
  const lnSum = layers.reduce((s, l) => s + weightOf(l.layer) * Math.log(Math.max(1e-6, l.confidence)), 0);
  const geo = totalW > 0 ? Math.exp(lnSum / totalW) : 0;

  // provenance
  const live = layers.filter((l) => l.provenance === "live").length;
  const fixture = layers.filter((l) => l.provenance === "fixture").length;
  const synthetic = layers.filter((l) => l.provenance === "synthetic_fixture" || l.provenance === "synthetic_audit_fixture" || l.provenance === "mixed").length;
  const liveShare = layers.length > 0 ? live / layers.length : 0;

  const weakest = layers.reduce((m, l) => (l.confidence < m.confidence ? l : m), layers[0]);

  // Pull the geometric mean toward the weakest layer (a weakest-link rule that
  // stays monotonic in every layer), then apply a hard ceiling. Phase 7B: NO
  // separate provenance numeric factor — synthetic is already in per-layer
  // dataIntegrity; here it only drives the PROVISIONAL label.
  const caps: string[] = [];
  const blend = BLEND_ALPHA * geo + (1 - BLEND_ALPHA) * weakest.confidence;
  caps.push(`pulled toward weakest layer (${weakest.layer} ${round(weakest.confidence)})`);
  const ceiling = weakest.confidence + WEAKEST_LINK_MARGIN;
  let capped = blend;
  if (capped > ceiling) { capped = ceiling; caps.push(`weakest-link ceiling: ${weakest.layer} ${round(weakest.confidence)} + ${WEAKEST_LINK_MARGIN}`); }
  if (liveShare < 1) caps.push(`provenance carried by per-layer data integrity (no separate numeric penalty)`);
  const final = clamp01(round(capped));

  const tier = tierOf(final);
  const provisional = synthetic > 0 || fixture > 0;       // any non-live input -> provisional
  const reliabilityLabel = provisional ? `${tier} · PROVISIONAL` : tier;

  const warnings: string[] = [];
  if (synthetic > 0) warnings.push("chain runs on synthetic_fixture inputs; treat as a model demonstration, not a graded live ruling");
  warnings.push(`final confidence is held by the weakest layer (${weakest.layer} ${round(weakest.confidence)})`);
  const missy = layers.filter((l) => l.missingCount > 0).map((l) => `${l.layer} (${l.missingCount} missing)`);
  if (missy.length) warnings.push(`named gaps: ${missy.join(", ")}`);

  return {
    finalConfidence: final, tier, provisional, reliabilityLabel,
    layerBreakdown: layers.map((l) => ({ layer: l.layer, confidence: round(l.confidence), provenance: l.provenance })),
    weakestLayer: { layer: weakest.layer, confidence: round(weakest.confidence) },
    geometricMean: round(geo),
    caps, warnings,
    provenanceSummary: { live, fixture, synthetic, liveShare: round(liveShare, 2) },
    version: VERDICT_CONFIDENCE_VERSION,
  };
}

// =============================================================================
// SELF-CHECKS — the verdict must tell the truth about the whole chain.
// =============================================================================
export function runVerdictConfidenceSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  // the current studied-guard chain (synthetic), realistic layer confidences
  const base: VerdictConfidenceInput = { layers: [
    { layer: "market", confidence: 0.86, provenance: "fixture", missingCount: 1 },
    { layer: "lineup", confidence: 0.73, provenance: "synthetic_fixture", missingCount: 3 },
    { layer: "archetype", confidence: 0.63, provenance: "synthetic_fixture", missingCount: 3 },
    { layer: "proof", confidence: 0.44, provenance: "synthetic_fixture", missingCount: 3 },
  ] };
  const r = consolidateVerdictConfidence(base);

  check("final <= geometric mean (no inflation)", r.finalConfidence <= r.geometricMean + 1e-9);
  check("final <= weakest + margin (weakest-link cap holds)", r.finalConfidence <= r.weakestLayer.confidence + WEAKEST_LINK_MARGIN + 1e-9);
  check("weakest layer identified = proof", r.weakestLayer.layer === "proof");
  check("synthetic chain -> PROVISIONAL", r.provisional === true && r.reliabilityLabel.includes("PROVISIONAL"));
  check("tier is MEDIUM for this case", r.tier === "MEDIUM");
  check("final is humble (<= 0.6) despite strong market", r.finalConfidence <= 0.6);
  check("final is not collapsed (>= 0.4)", r.finalConfidence >= 0.4);

  // THE TRUST TEST — final falls when ANY one law becomes meaningfully weaker.
  for (const target of ["market", "lineup", "archetype", "proof"] as const) {
    const weakened = { layers: base.layers.map((l) => l.layer === target ? { ...l, confidence: Math.max(0.05, l.confidence - 0.25) } : l) };
    const rw = consolidateVerdictConfidence(weakened);
    check(`trust test -> weakening ${target} lowers final`, rw.finalConfidence < r.finalConfidence);
  }

  // raising everything raises final
  const strong = consolidateVerdictConfidence({ layers: base.layers.map((l) => ({ ...l, confidence: Math.min(0.99, l.confidence + 0.2) })) });
  check("raising all layers raises final", strong.finalConfidence > r.finalConfidence);

  // provenance now affects the LABEL, not the number (Phase 7B de-stacking):
  // identical input confidences -> identical final, but synthetic is PROVISIONAL.
  const liveLayers = consolidateVerdictConfidence({ layers: base.layers.map((l) => ({ ...l, provenance: "live" as InputProvenance })) });
  check("provenance no longer double-penalizes the number (equal inputs -> equal final)", liveLayers.finalConfidence === r.finalConfidence);
  check("synthetic is PROVISIONAL; live is not (label carries provenance)", r.provisional === true && liveLayers.provisional === false);

  // a strong-but-uneven chain is still capped by its weak link
  const uneven = consolidateVerdictConfidence({ layers: [
    { layer: "market", confidence: 0.95, provenance: "live", missingCount: 0 },
    { layer: "lineup", confidence: 0.92, provenance: "live", missingCount: 0 },
    { layer: "archetype", confidence: 0.40, provenance: "live", missingCount: 2 },
    { layer: "proof", confidence: 0.90, provenance: "live", missingCount: 0 },
  ] });
  check("uneven chain capped by weak archetype (<= 0.52)", uneven.finalConfidence <= 0.52 && uneven.weakestLayer.layer === "archetype");

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runVerdictConfidenceSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
