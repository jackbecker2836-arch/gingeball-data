// =============================================================================
// GINGEBALL COURT HANDICAP — LIVE PRODUCT COURTCONTEXT BRIDGE (Phase 11H)
//
// A READ-ONLY translator from the product view (buildManifestView) into the stat /
// composite layer. It lets the live product court feed a SHADOW composite without the
// composite feeding back: read-only, applied:false, no headline mutation, no verdict
// mutation. The bridge proves the product view can ground the composite while the
// composite stays powerless.
//
// Honesty: the product view exposes total / court type / source state / lineup
// confidence + provenance — but NOT raw lineup geometry signals (spacing/POA/rim/
// synergy). Those are marked unavailable rather than fabricated.
// =============================================================================

import type { CourtHandicapView } from "@/lib/manifest-view-model";
import { buildManifestView } from "@/lib/manifest-source";
import { buildCompositeVerdict, type CourtContext, type CompositeVerdict } from "@/lib/stat-par/composite-verdict";
import { extractProductGeometry, runProductGeometrySelfChecks } from "@/lib/stat-par/product-geometry";
import type { StatId } from "@/lib/stat-par/stat-par";

export interface ProductDerivedContext {
  context: CourtContext;
  geometryAvailable: boolean;   // true when the view's factor breakdown yields geometry
  geometryProvenance: string;
  scoringBeatPer100: number;    // real engine scoring beat from the view
  sourceState: string;
  confidence: number;
  provenance: string;
}

function numConf(x: number | undefined, fallback: number): number {
  return typeof x === "number" ? x : fallback;
}

/** Read-only: derive a CourtContext from the live product view. Never mutates the view. */
export function deriveCourtContextFromManifestView(view: CourtHandicapView): ProductDerivedContext {
  const lineupConf = numConf(view.provenance.lineup?.confidence, view.marketHub.confidence);
  const sourceState = view.provenance.market?.sourceState ?? "unknown";
  const provenance = view.provenance.lineup?.inputProvenance ?? "unknown";
  const geom = extractProductGeometry(view); // Phase 11I: derived from the view's factor breakdown
  const context: CourtContext = {
    label: view.marketHub.courtType,
    total: view.marketHub.total,
    // geometry now comes from the product view's archetype factors (inferred); when a
    // factor is missing, extractProductGeometry returns neutral and flags it unavailable
    spacingScarcity: geom.spacingScarcity, poaPressure: geom.poaPressure,
    rimProtectionFaced: geom.rimProtectionFaced, synergy: geom.synergy,
    confidence: geom.geometryAvailable ? lineupConf : lineupConf * 0.85, // missing geometry degrades confidence
    provenance,
    sourceState,
  };
  return { context, geometryAvailable: geom.geometryAvailable, geometryProvenance: geom.geometryProvenance, scoringBeatPer100: view.verdict.beatLineupPer100, sourceState, confidence: lineupConf, provenance };
}

/** Read-only: build a SHADOW composite from the product view. applied:false always. */
export function buildShadowCompositeFromView(
  view: CourtHandicapView, archetype: string, actuals: Partial<Record<StatId, number>> = {},
): CompositeVerdict {
  const d = deriveCourtContextFromManifestView(view);
  return buildCompositeVerdict(archetype, d.context, actuals, d.scoringBeatPer100);
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runBridgeSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const view = buildManifestView();
  const before = JSON.stringify(view);
  const d = deriveCourtContextFromManifestView(view);

  check("context derived from the live product view (total + label)", d.context.total > 0 && d.context.label.length > 0);
  check("context inherits a source state from the view", d.sourceState.length > 0 && d.sourceState !== "unknown");
  check("context inherits lineup confidence (0..1)", d.confidence > 0 && d.confidence <= 1);
  check("context inherits input provenance", d.provenance.length > 0 && d.provenance !== "unknown");
  check("geometry is now derived from the product view (available)", d.geometryAvailable === true);
  check("geometry provenance is explicit", d.geometryProvenance === "derived_from_archetype_factors");
  check("real scoring beat is threaded from the view", d.scoringBeatPer100 === view.verdict.beatLineupPer100);

  // composite reacts to geometry: a cramped floor raises expected turnovers (ball_security),
  // shrinking a connector's turnover-relief beat versus a spaced floor
  const cramped = buildCompositeVerdict("connector", { ...d.context, spacingScarcity: 0.9 }, { assists: 9, turnovers: 1 }, 0);
  const spaced = buildCompositeVerdict("connector", { ...d.context, spacingScarcity: 0.2 }, { assists: 9, turnovers: 1 }, 0);
  check("shadow composite changes when product geometry changes", cramped.compositeCandidate !== spaced.compositeCandidate);

  const shadow = buildShadowCompositeFromView(view, "scoring_guard");
  check("shadow composite from the view is applied:false", shadow.applied === false && shadow.mode === "shadow");
  check("shadow composite carries the view's source state", shadow.sourceState === d.sourceState);
  check("shadow composite confidence never reads HIGH", shadow.compositeConfidence <= 0.7);

  // READ-ONLY: deriving + building did not mutate the product view
  check("the bridge does not mutate the product view (read-only)", JSON.stringify(view) === before);
  // the live verdict on the view is unchanged and independent of the shadow composite
  check("the live verdict is untouched by the shadow composite", view.verdict.beatLineupPer100 === d.scoringBeatPer100 && shadow.applied === false);

  // fold in the product-geometry suite (signal inversion validated against the live view)
  const geom = runProductGeometrySelfChecks(buildManifestView);
  passed += geom.passed; failed += geom.failed; details.push(...geom.details);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runBridgeSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
