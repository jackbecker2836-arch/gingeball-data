// =============================================================================
// GINGEBALL COURT HANDICAP — LIMITATION REGISTRY (Phase 11J)
//
// Limitations were scattered across provenance tags, docs, and engine `limitations[]`
// arrays. This makes them first-class truth: a structured registry so the Pressure Lab can
// say "this scenario passed AND here is what it still does not know." A green suite is not
// the whole truth.
// =============================================================================

export type Severity = "info" | "low" | "medium" | "high" | "blocker";
export type LimitationLayer = "geometry" | "engine" | "composite" | "stat" | "ui" | "deployment";

export type LimitationId =
  | "geometry_derived_not_native" | "geometry_unavailable"
  | "pending_spacing_gravity_engine" | "pending_screen_assist_engine"
  | "pending_secondary_assist_engine" | "pending_opponent_suppression_engine"
  | "synthetic_court_factor" | "fixture_estimate_screen_assist"
  | "shadow_composite_not_applied" | "composite_shadow_only"
  | "non_scoring_proxy_low_confidence" | "browser_pixel_pass_missing"
  | "deterrence_synthetic_v1" | "spacing_gravity_synthetic_v1";

export interface Limitation {
  id: LimitationId;
  severity: Severity;
  layer: LimitationLayer;
  description: string;
  whatItLimits: string;
  displayLabel: string;
  blocksDeployment: boolean;
  blocksLiveGraduation: boolean;
}

const L = (
  id: LimitationId, severity: Severity, layer: LimitationLayer, displayLabel: string,
  description: string, whatItLimits: string, blocksDeployment: boolean, blocksLiveGraduation: boolean,
): Limitation => ({ id, severity, layer, displayLabel, description, whatItLimits, blocksDeployment, blocksLiveGraduation });

export const LIMITATION_REGISTRY: Record<LimitationId, Limitation> = {
  geometry_derived_not_native: L("geometry_derived_not_native", "medium", "geometry", "Geometry derived, not native",
    "Court geometry is recovered by inverting archetype factor points, not exposed natively by the product view.",
    "Geometry signals are inferred from one archetype's weights; non-guard studied players would skew them.", false, true),
  geometry_unavailable: L("geometry_unavailable", "high", "geometry", "Geometry unavailable",
    "A geometry factor was missing from the view; the field fell back to neutral.",
    "The composite court factors run near-neutral and confidence is degraded.", false, true),
  pending_spacing_gravity_engine: L("pending_spacing_gravity_engine", "medium", "engine", "Spacing gravity pending",
    "Spacing gravity has no engine for this archetype path; the stat is a pending placeholder.",
    "Spacing value cannot be proven, only flagged.", false, true),
  pending_screen_assist_engine: L("pending_screen_assist_engine", "medium", "engine", "Screen assist pending",
    "No screen-assist engine exists; the stat is fixture-estimated or pending.", "Screen-setting value is unproven.", false, true),
  pending_secondary_assist_engine: L("pending_secondary_assist_engine", "medium", "engine", "Secondary assist pending",
    "No secondary-assist engine exists; connector passing value is pending.", "Connector creation value is unproven.", false, true),
  pending_opponent_suppression_engine: L("pending_opponent_suppression_engine", "medium", "engine", "Opponent suppression pending",
    "No opponent-suppression engine exists yet.", "Defensive suppression value is unproven.", false, true),
  synthetic_court_factor: L("synthetic_court_factor", "medium", "composite", "Synthetic court factor",
    "Court-specific stat multipliers are synthetic, not derived from measured court effects.",
    "The composite's court adjustment is plausible but uncalibrated.", false, true),
  fixture_estimate_screen_assist: L("fixture_estimate_screen_assist", "low", "stat", "Screen assist fixture-estimated",
    "Screen-assist baselines are fixture estimates.", "Screen-assist par is a rough estimate.", false, false),
  shadow_composite_not_applied: L("shadow_composite_not_applied", "info", "composite", "Composite not applied",
    "The composite verdict is computed but never applied to the live grade.",
    "Multi-stat value is visible in the lab only, by design.", false, true),
  composite_shadow_only: L("composite_shadow_only", "info", "composite", "Composite shadow-only",
    "The composite runs in shadow mode and takes no authority.", "The composite cannot influence the product verdict.", false, true),
  non_scoring_proxy_low_confidence: L("non_scoring_proxy_low_confidence", "high", "stat", "Proxy-driven, low confidence",
    "The headline is driven by pending/proxy stats rather than measured ones.",
    "The verdict should not be trusted as proven; it is proxy-driven.", false, true),
  browser_pixel_pass_missing: L("browser_pixel_pass_missing", "blocker", "ui", "Browser pixel pass missing",
    "The UI has never been rendered to real pixels and verified; the sandbox cannot render React.",
    "The UI could overclaim even when the engines are honest. Blocks any deployment.", true, true),
  deterrence_synthetic_v1: L("deterrence_synthetic_v1", "medium", "engine", "Deterrence engine v1 (synthetic)",
    "Deterrence v1 is a real structure on synthetic/fixture inputs with uncalibrated curves.",
    "Deterrence value is engine-shaped but not measured.", false, true),
  spacing_gravity_synthetic_v1: L("spacing_gravity_synthetic_v1", "medium", "engine", "Spacing gravity engine v1 (synthetic)",
    "Spacing gravity v1 is a real structure on synthetic/fixture inputs with uncalibrated curves.",
    "Spacing value is engine-shaped but not measured.", false, true),
};

export function getLimitation(id: LimitationId): Limitation { return LIMITATION_REGISTRY[id]; }
export function resolveLimitations(ids: LimitationId[]): Limitation[] {
  return [...new Set(ids)].map((id) => LIMITATION_REGISTRY[id]);
}
export function hasDeploymentBlocker(ids: LimitationId[]): boolean {
  return resolveLimitations(ids).some((l) => l.blocksDeployment);
}
export function blocksLiveGraduation(ids: LimitationId[]): boolean {
  return resolveLimitations(ids).some((l) => l.blocksLiveGraduation);
}
export function severityRollup(ids: LimitationId[]): Record<Severity, number> {
  const roll: Record<Severity, number> = { info: 0, low: 0, medium: 0, high: 0, blocker: 0 };
  for (const l of resolveLimitations(ids)) roll[l.severity]++;
  return roll;
}

/** Derive applicable limitation ids from what is actually present in a stat vector / composite.
 *
 * The pixel-pass limitation is NOT hardcoded here. It is owned by the manifest
 * (`pixelPassLimitations()` in pixel-pass-manifest.ts) so there is exactly one source of
 * truth for it. `pixelPassReviewed` defaults to `false` so any caller that does not pass it
 * keeps the honest default (confess the pixel-pass blocker until proven otherwise); the
 * Pressure Lab view-model passes the real manifest flag. */
export function deriveLimitations(opts: {
  provenancesPresent: string[];
  proxyDriven?: boolean;
  geometryAvailable?: boolean;
  usesCourtFactors?: boolean;
  pixelPassReviewed?: boolean;
}): LimitationId[] {
  const ids: LimitationId[] = ["composite_shadow_only", "shadow_composite_not_applied"];
  if (opts.pixelPassReviewed !== true) ids.push("browser_pixel_pass_missing");
  const p = new Set(opts.provenancesPresent);
  if (p.has("pending_engine")) ids.push("pending_spacing_gravity_engine");
  if (p.has("deterrence_engine_v1")) ids.push("deterrence_synthetic_v1");
  if (p.has("spacing_gravity_engine_v1")) ids.push("spacing_gravity_synthetic_v1");
  if (p.has("fixture_estimate")) ids.push("fixture_estimate_screen_assist");
  if (opts.usesCourtFactors) ids.push("synthetic_court_factor");
  if (opts.geometryAvailable === false) ids.push("geometry_unavailable");
  else if (opts.geometryAvailable === true) ids.push("geometry_derived_not_native");
  if (opts.proxyDriven) ids.push("non_scoring_proxy_low_confidence");
  return [...new Set(ids)];
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runLimitationRegistrySelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const all = Object.values(LIMITATION_REGISTRY);
  check("registry is populated (>=12 limitations)", all.length >= 12);
  check("every limitation carries all required fields", all.every((l) =>
    l.id && l.severity && l.layer && l.description.length > 0 && l.whatItLimits.length > 0 && l.displayLabel.length > 0
    && typeof l.blocksDeployment === "boolean" && typeof l.blocksLiveGraduation === "boolean"));
  check("registry key matches limitation id (no mislabeling)", Object.entries(LIMITATION_REGISTRY).every(([k, v]) => k === v.id));

  check("browser pixel pass blocks deployment", LIMITATION_REGISTRY.browser_pixel_pass_missing.blocksDeployment === true);
  check("browser pixel pass is a blocker severity", LIMITATION_REGISTRY.browser_pixel_pass_missing.severity === "blocker");
  check("shadow-composite limitations block live graduation but not deployment", LIMITATION_REGISTRY.shadow_composite_not_applied.blocksLiveGraduation === true && LIMITATION_REGISTRY.shadow_composite_not_applied.blocksDeployment === false);
  check("at least one deployment blocker exists", all.some((l) => l.blocksDeployment));

  // a clean, passing scenario still carries shadow + pixel limitations (the centerpiece)
  // Default (unreviewed) must still confess the pixel-pass blocker...
  const clean = deriveLimitations({ provenancesPresent: ["engine_modeled", "box_score"], geometryAvailable: true, usesCourtFactors: true });
  check("a passing scenario still confesses shadow + pixel limitations (unreviewed)", clean.includes("composite_shadow_only") && clean.includes("browser_pixel_pass_missing"));
  check("deployment blocker detected for a clean-but-unshipped scenario", hasDeploymentBlocker(clean));
  // ...but once the pixel pass is reviewed, the blocker is gone and deployment is no longer blocked by it.
  const reviewed = deriveLimitations({ provenancesPresent: ["engine_modeled", "box_score"], geometryAvailable: true, usesCourtFactors: true, pixelPassReviewed: true });
  check("a reviewed scenario still confesses shadow but drops the pixel-pass blocker", reviewed.includes("composite_shadow_only") && !reviewed.includes("browser_pixel_pass_missing"));
  check("no deployment blocker once pixel pass is reviewed", !hasDeploymentBlocker(reviewed));

  // proxy-driven scenario flags low confidence
  const proxy = deriveLimitations({ provenancesPresent: ["pending_engine"], proxyDriven: true, geometryAvailable: true });
  check("proxy-driven scenario flags low-confidence limitation", proxy.includes("non_scoring_proxy_low_confidence"));

  // engine-upgraded scenario swaps pending for synthetic-v1
  const upgraded = deriveLimitations({ provenancesPresent: ["spacing_gravity_engine_v1", "deterrence_engine_v1"], geometryAvailable: true });
  check("engine-upgraded scenario reports synthetic-v1 (not pending)", upgraded.includes("spacing_gravity_synthetic_v1") && upgraded.includes("deterrence_synthetic_v1") && !upgraded.includes("pending_spacing_gravity_engine"));

  const roll = severityRollup(clean);
  check("severity rollup counts limitations", roll.info + roll.low + roll.medium + roll.high + roll.blocker === new Set(clean).size);
  check("resolveLimitations dedupes + resolves", resolveLimitations(["composite_shadow_only", "composite_shadow_only"]).length === 1);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runLimitationRegistrySelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
