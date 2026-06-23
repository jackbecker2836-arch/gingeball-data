// =============================================================================
// GINGEBALL COURT HANDICAP — PRODUCT GEOMETRY EXPOSURE (Phase 11I)
//
// The product view does not carry raw lineup geometry, but it DOES expose the archetype
// factor breakdown (conditions.difficultyFactors / fitFactors), where each factor's
// `points = weight × signal × 100`. We recover the real signal by inverting with the
// engine's known weights. This is honest derived geometry (provenance:
// derived_from_archetype_factors), per-field marked inferred or unavailable — never
// fabricated.
// =============================================================================

import type { CourtHandicapView } from "@/lib/manifest-view-model";

// guard archetype difficulty/fit weights (mirror SCORING_GUARD_TRANSLATION_V1)
const W = { spacing: 0.24, poa: 0.22, rim: 0.16, synergy: 0.16 };

export type FieldProvenance = "inferred" | "unavailable";
export interface GeometryField { value: number | null; provenance: FieldProvenance }

export interface ProductGeometry {
  spacingScarcity: number; poaPressure: number; rimProtectionFaced: number; synergy: number;
  geometryAvailable: boolean;
  geometryConfidence: number;
  geometryProvenance: string;
  fields: { spacingScarcity: GeometryField; poaPressure: GeometryField; rimProtectionFaced: GeometryField; synergy: GeometryField };
}

function recover(factors: { key: string; points: number }[] | undefined, key: string, weight: number): number | null {
  const f = factors?.find((x) => x.key === key);
  if (!f) return null;
  const sig = f.points / (weight * 100);
  return Math.max(0, Math.min(1, Math.round(sig * 1000) / 1000));
}

export function extractProductGeometry(view: CourtHandicapView): ProductGeometry {
  const dF = view.conditions.difficultyFactors;
  const fF = view.conditions.fitFactors;
  const sp = recover(dF, "spacing", W.spacing);
  const poa = recover(dF, "poa", W.poa);
  const rim = recover(dF, "rim", W.rim);
  const syn = recover(fF, "synergy", W.synergy);
  const field = (v: number | null): GeometryField => ({ value: v, provenance: v == null ? "unavailable" : "inferred" });
  const available = sp != null && poa != null && rim != null && syn != null;
  return {
    spacingScarcity: sp ?? 0.5, poaPressure: poa ?? 0.5, rimProtectionFaced: rim ?? 0.5, synergy: syn ?? 0.5,
    geometryAvailable: available,
    geometryConfidence: view.conditions.archetypeConfidence,
    geometryProvenance: "derived_from_archetype_factors",
    fields: { spacingScarcity: field(sp), poaPressure: field(poa), rimProtectionFaced: field(rim), synergy: field(syn) },
  };
}

// ---------------------------------------------------------------------------
// SELF-CHECKS (validated against the live product view)
// ---------------------------------------------------------------------------
export function runProductGeometrySelfChecks(buildView: () => CourtHandicapView): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const g = extractProductGeometry(buildView());
  check("geometry recovered from the product view's factors", g.geometryAvailable === true);
  // signal inversion matches the canonical guard court (spacing .72, poa .85, rim .78, synergy .40)
  check("recovered spacing ~ 0.72", Math.abs(g.spacingScarcity - 0.72) < 0.03);
  check("recovered poa ~ 0.85", Math.abs(g.poaPressure - 0.85) < 0.03);
  check("recovered rim ~ 0.78", Math.abs(g.rimProtectionFaced - 0.78) < 0.03);
  check("recovered synergy ~ 0.40", Math.abs(g.synergy - 0.40) < 0.03);
  check("each field is marked inferred (not real, not fabricated)", Object.values(g.fields).every((f) => f.provenance === "inferred"));
  check("geometry confidence is present (0..1)", g.geometryConfidence > 0 && g.geometryConfidence <= 1);
  check("geometry provenance is explicit", g.geometryProvenance === "derived_from_archetype_factors");

  return { passed, failed, details };
}
