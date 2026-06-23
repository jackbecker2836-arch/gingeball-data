// =============================================================================
// GINGEBALL COURT HANDICAP — PRESSURE LAB VIEW-MODEL (Phase 11K)
//
// A serializable view the internal React route renders. It does no new math — it gathers the
// Pressure Lab report, per-scenario stat vectors, per-scenario limitations, engine upgrades,
// coverage, and the COMPUTED deployment status, into plain objects a client component can show.
// The route holds no logic; the truth is assembled here and stays testable without pixels.
// =============================================================================

import { runPressureLab } from "@/lib/audit-universe/pressure-lab";
import { ARCHETYPE_SCENARIOS } from "@/lib/stat-par/archetype-scenarios";
import { computeStatParVector } from "@/lib/stat-par/stat-par";
import { buildCompositeVerdict } from "@/lib/stat-par/composite-verdict";
import { deriveLimitations, resolveLimitations, LIMITATION_REGISTRY, type LimitationId, type Severity } from "@/lib/limitation-registry";
import { computeDeploymentStatus, type DeploymentStatus } from "@/lib/deployment-status";
import { pixelPassLimitations, PIXEL_PASS_MANIFEST } from "@/lib/pixel-pass-manifest";

export interface ExpectedActualRow {
  stat: string; category: string; relevance: string;
  expected: number; actual: number; delta: number;
  provenance: string; proofStatus: string; inverse: boolean;
}
export interface ScenarioLimitationView { id: LimitationId; displayLabel: string; severity: Severity; whatItLimits: string }
export interface ScenarioView {
  archetype: string; teamSide: string; courtLabel: string;
  headline: string | null; pass: boolean; proxyDriven: boolean;
  compositeConfidence: number; sourceState: string | null;
  rows: ExpectedActualRow[];
  limitations: ScenarioLimitationView[];
}
export interface PressureLabView {
  stamps: string[];
  deployment: { status: DeploymentStatus; label: string; reason: string; deploymentBlockers: string[]; liveGraduationBlockers: string[] };
  pixelPassReviewed: boolean;
  pixelPassNote: string;
  totals: { scenarios: number; passing: number; suitePassed: number; suiteFailed: number };
  scenarios: ScenarioView[];
  engineUpgrades: {
    deterrence: { exists: boolean; pendingBefore: number; pendingAfter: number; provenance: string };
    spacingGravity: { exists: boolean; upgradedArchetypes: number; pendingBefore: number; pendingAfter: number; provenance: string };
  };
  coverage: { byStatus: Record<string, number>; activeArchetypes: number; gapsNamed: string[] };
  limitationsLegend: { id: string; displayLabel: string; severity: Severity; layer: string; blocksDeployment: boolean; blocksLiveGraduation: boolean }[];
  shadow: { applied: false; mode: "shadow" };
}

export function buildPressureLabView(): PressureLabView {
  const report = runPressureLab();
  const pixelLimits = pixelPassLimitations();
  // Single source of truth: pixelPassLimitations() returns [] once the manifest is reviewed.
  const pixelPassReviewed = pixelLimits.length === 0;

  const scenarios: ScenarioView[] = ARCHETYPE_SCENARIOS.map((s) => {
    const vec = computeStatParVector(s.archetype, { actuals: s.actuals });
    const verdict = buildCompositeVerdict(s.archetype, s.court, s.actuals, 0);
    const ids = [...deriveLimitations({
      provenancesPresent: vec.results.map((r) => r.provenance),
      proxyDriven: verdict.proxyDriven, geometryAvailable: true, usesCourtFactors: true,
      pixelPassReviewed,
    }), ...pixelLimits];
    const limitations = resolveLimitations(ids).map((l) => ({ id: l.id, displayLabel: l.displayLabel, severity: l.severity, whatItLimits: l.whatItLimits }));
    return {
      archetype: s.archetype, teamSide: s.teamSide, courtLabel: s.court.label,
      headline: verdict.headlineCategory, pass: verdict.compositeCandidate > 0, proxyDriven: verdict.proxyDriven,
      compositeConfidence: verdict.compositeConfidence, sourceState: verdict.sourceState,
      rows: vec.results.map((r) => ({
        stat: r.stat, category: r.category, relevance: r.relevance,
        expected: r.expected, actual: r.actual, delta: r.delta,
        provenance: r.provenance, proofStatus: r.proofStatus, inverse: r.inverse,
      })),
      limitations,
    };
  });

  // union of every scenario's limitations (always includes the pixel-pass blocker while pending)
  const unionIds = [...new Set([...scenarios.flatMap((sc) => sc.limitations.map((l) => l.id)), ...pixelLimits])] as LimitationId[];
  const dep = computeDeploymentStatus(unionIds);

  return {
    stamps: ["INTERNAL", "SYNTHETIC", "NOT PUBLIC", "SHADOW COMPOSITE", "NOT LIVE APPLIED"],
    deployment: {
      status: dep.status, label: dep.label, reason: dep.reason,
      deploymentBlockers: dep.deploymentBlockers.map((l) => l.displayLabel),
      liveGraduationBlockers: dep.liveGraduationBlockers.map((l) => l.displayLabel),
    },
    pixelPassReviewed: PIXEL_PASS_MANIFEST.reviewed,
    pixelPassNote: PIXEL_PASS_MANIFEST.notes,
    totals: {
      scenarios: scenarios.length, passing: scenarios.filter((sc) => sc.pass).length,
      suitePassed: report.summary.gatesPassed ?? 0, suiteFailed: report.summary.gatesFailed ?? 0,
    },
    scenarios,
    engineUpgrades: {
      deterrence: { exists: report.summary.deterrenceEngine.exists, pendingBefore: report.summary.deterrenceEngine.pendingBefore, pendingAfter: report.summary.deterrenceEngine.pendingAfter, provenance: "deterrence_engine_v1" },
      spacingGravity: { exists: report.summary.spacingGravityEngine.exists, upgradedArchetypes: report.summary.spacingGravityEngine.upgradedArchetypes, pendingBefore: report.summary.spacingGravityEngine.pendingBefore, pendingAfter: report.summary.spacingGravityEngine.pendingAfter, provenance: "spacing_gravity_engine_v1" },
    },
    coverage: { byStatus: report.summary.coverage.byStatus, activeArchetypes: report.summary.coverage.activeArchetypes, gapsNamed: report.summary.coverage.gapsNamed },
    limitationsLegend: Object.values(LIMITATION_REGISTRY).map((l) => ({ id: l.id, displayLabel: l.displayLabel, severity: l.severity, layer: l.layer, blocksDeployment: l.blocksDeployment, blocksLiveGraduation: l.blocksLiveGraduation })),
    shadow: { applied: false, mode: "shadow" },
  };
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runPressureLabViewSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const v = buildPressureLabView();
  check("stamps make INTERNAL/SYNTHETIC/SHADOW unmistakable", v.stamps.includes("INTERNAL") && v.stamps.includes("SYNTHETIC") && v.stamps.includes("SHADOW COMPOSITE") && v.stamps.includes("NOT LIVE APPLIED"));
  // Deployment status is driven by the pixel-pass manifest flag. Assert the correct relationship
  // in BOTH states so this check stays honest whether reviewed is true or false:
  //   unreviewed -> BLOCKED (pixel pass is a deployment blocker)
  //   reviewed   -> not BLOCKED (the only deployment-level blocker is cleared; shadow items remain live-graduation only)
  if (v.pixelPassReviewed) {
    check("deployment status is not BLOCKED once pixel pass is reviewed", v.deployment.status !== "BLOCKED");
    check("no scenario still shows the pixel-pass blocker once reviewed", v.scenarios.every((s) => !s.limitations.some((l) => l.id === "browser_pixel_pass_missing")));
    check("deployment blockers list is empty once pixel pass is reviewed", v.deployment.deploymentBlockers.length === 0);
  } else {
    check("deployment status is BLOCKED while pixel pass is unreviewed", v.deployment.status === "BLOCKED");
    check("deployment reason names the pixel pass blocker while unreviewed", v.deployment.reason.toLowerCase().includes("pixel"));
    check("every scenario carries the pixel-pass blocker while unreviewed", v.scenarios.every((s) => s.limitations.some((l) => l.id === "browser_pixel_pass_missing")));
    check("deployment blocker list is non-empty while blocked", v.deployment.deploymentBlockers.length >= 1);
  }
  check("scenarios are present with expected-vs-actual rows", v.scenarios.length >= 8 && v.scenarios.every((s) => s.rows.length > 0));
  check("a passing scenario still shows limitations", v.scenarios.some((s) => s.pass && s.limitations.length > 0));
  check("engine upgrades are visible (deterrence + spacing gravity)", v.engineUpgrades.deterrence.exists && v.engineUpgrades.spacingGravity.exists && v.engineUpgrades.spacingGravity.pendingAfter < v.engineUpgrades.spacingGravity.pendingBefore);
  check("provenance labels distinguish v1 engines from engine_modeled", v.scenarios.flatMap((s) => s.rows).some((r) => r.provenance === "pending_engine") && v.limitationsLegend.some((l) => l.id === "spacing_gravity_synthetic_v1"));
  check("coverage matrix is exposed", typeof v.coverage.activeArchetypes === "number" && Object.keys(v.coverage.byStatus).length > 0);
  check("shadow status is explicit (applied:false)", v.shadow.applied === false && v.shadow.mode === "shadow");
  // The shadow-composite limitations must STILL block live graduation even after pixel pass is reviewed.
  check("shadow composite still blocks live graduation regardless of pixel pass", v.deployment.liveGraduationBlockers.length >= 1);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runPressureLabViewSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
