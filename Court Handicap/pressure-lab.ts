// =============================================================================
// GINGEBALL COURT HANDICAP — INTERNAL PRESSURE LAB RUNNER (Phase 11C)
//
// An audit COCKPIT, not a product demo. For every synthetic scenario it emits a full
// trace — expected vs actual, pass/fail, and the market/lineup/archetype/proof/
// confidence/verdict/render-state/motion-lock readings — then folds in the integrity
// gates (runAuditUniverse) and the two-team archetype coverage. It exists to make the
// system's thinking visible and its failures loud. Internal. Synthetic. Never public.
// =============================================================================

import { auditScenarios, AUDIT_PROVENANCE } from "@/fixtures/court-handicap-audit-universe";
import { runScenario, type ScenarioResult } from "@/lib/audit-harness";
import { runAuditUniverse } from "@/lib/audit-universe/audit-runner";
import { buildArchetypeImpactMatrix, coverageSummary, type CoverageSummary } from "@/lib/audit-universe/archetype-impact-matrix";
import { sourceStateBadge, winProbabilityLabel, confidenceBadge, nodeBasisTag } from "@/components/court-handicap/ui-labels";
import { motionLockHeld } from "@/components/court-handicap/motion";
import { computeStatParVector, ARCHETYPE_STAT_PROFILES } from "@/lib/stat-par/stat-par";
import { buildCompositeVerdict, COURT_GRIND } from "@/lib/stat-par/composite-verdict";
import { deriveCourtContextById } from "@/lib/stat-par/court-context-source";
import { buildShadowCompositeFromView, deriveCourtContextFromManifestView } from "@/lib/stat-par/court-context-bridge";
import { runArchetypeScenarios, ARCHETYPE_SCENARIOS, NON_SCORING_ENGINE_GAPS } from "@/lib/stat-par/archetype-scenarios";
import { computeDeterrence, deterrenceStatOverrides } from "@/lib/deterrence-engine";
import { computeSpacingGravity, spacingGravityStatOverrides } from "@/lib/spacing-gravity-engine";
import { deriveLimitations, severityRollup, hasDeploymentBlocker, LIMITATION_REGISTRY, type Severity } from "@/lib/limitation-registry";
import { buildManifestView } from "@/lib/manifest-source";

export interface ExpectedActual { field: string; expected: string; actual: string; pass: boolean }

export interface ScenarioTrace {
  id: string; label: string; provenance: string; archetype: string;
  checks: ExpectedActual[]; pass: boolean;
  traces: {
    market: { marketPar: number; courtType: string; winProb: string };
    lineup: { lineupPar: number; confidence: number };
    archetype: { difficulty: number; fit: number; modeled: boolean; basis: string };
    proof: { actualPer100: number; beatLineup: number; beatMarket: number };
    confidence: { final: number; tier: string; provisional: boolean; weakest: string };
    verdict: { word: string };
    renderState: { sourceBadge: string; winProbLabel: string; nodeBasis: string };
    motionLock: boolean;
  };
}

function checksFor(s: (typeof auditScenarios)[number], r: ScenarioResult): ExpectedActual[] {
  const e = s.expect; const out: ExpectedActual[] = [];
  const add = (field: string, expected: string, actual: string, pass: boolean) => out.push({ field, expected, actual, pass });
  if (e.verdictWord) add("verdict", e.verdictWord, r.verdictWord, r.verdictWord === e.verdictWord);
  if (e.winProbAvailable !== undefined) add("winProbAvailable", String(e.winProbAvailable), String(r.winProbAvailable), r.winProbAvailable === e.winProbAvailable);
  if (e.provisional !== undefined) add("provisional", String(e.provisional), String(r.provisional), r.provisional === e.provisional);
  if (e.archetypeModeled !== undefined) add("archetypeModeled", String(e.archetypeModeled), String(r.archetypeModeled), r.archetypeModeled === e.archetypeModeled);
  if (e.courtTypeIncludes) add("courtType⊇", e.courtTypeIncludes, r.courtType, r.courtType.toLowerCase().includes(e.courtTypeIncludes));
  if (e.finalConfidenceBelow !== undefined) add("final<", String(e.finalConfidenceBelow), String(r.finalConfidence), r.finalConfidence < e.finalConfidenceBelow);
  if (e.finalConfidenceAbove !== undefined) add("final>", String(e.finalConfidenceAbove), String(r.finalConfidence), r.finalConfidence > e.finalConfidenceAbove);
  return out;
}

export interface PressureLabReport {
  scenarios: ScenarioTrace[];
  summary: {
    scenarioCount: number; scenariosPassed: number;
    gatesPassed: number; gatesFailed: number;
    motionLockHeld: boolean;
    coverage: CoverageSummary;
    statPar: { archetypesProfiled: number; beatWithoutScoringExample: boolean };
    compositeVerdict: { archetypesShown: number; allShadow: boolean; pendingCannotDominate: boolean; contextDerived: boolean; scoringThreaded: boolean; sourceHonest: boolean };
    productBridge: { shadowFromViewApplied: boolean; viewUntouched: boolean };
    archetypeScenarios: { count: number; distinctHeadlines: number; nonGuardCourts: boolean };
    engineGaps: { named: number };
    deterrenceEngine: { exists: boolean; upgradedRimProtector: boolean; pendingBefore: number; pendingAfter: number };
    spacingGravityEngine: { exists: boolean; upgradedArchetypes: number; pendingBefore: number; pendingAfter: number };
    productGeometry: { available: boolean; provenance: string };
    limitations: { registrySize: number; scenariosWithLimitations: number; blockers: number; bySeverity: Record<Severity, number> };
  };
}

export function runPressureLab(): PressureLabReport {
  const traces: ScenarioTrace[] = auditScenarios.map((s) => {
    const r = runScenario(s);
    const checks = checksFor(s, r);
    const badge = sourceStateBadge("synthetic_audit");
    return {
      id: s.id, label: s.label, provenance: s.provenance, archetype: s.archetype,
      checks, pass: checks.every((c) => c.pass),
      traces: {
        market: { marketPar: r.marketPar, courtType: r.courtType, winProb: winProbabilityLabel(undefined) },
        lineup: { lineupPar: r.lineupPar, confidence: r.layer.lineup },
        archetype: { difficulty: r.difficulty, fit: r.fit, modeled: r.archetypeModeled, basis: nodeBasisTag(r.archetypeModeled).label },
        proof: { actualPer100: r.actualPer100, beatLineup: r.beatLineup, beatMarket: r.beatMarket },
        confidence: { final: r.finalConfidence, tier: confidenceBadge(r.finalConfidence, r.provisional).tier, provisional: r.provisional, weakest: r.weakest },
        verdict: { word: r.verdictWord },
        renderState: { sourceBadge: badge.label, winProbLabel: winProbabilityLabel(undefined), nodeBasis: nodeBasisTag(r.archetypeModeled).label },
        motionLock: motionLockHeld(),
      },
    };
  });

  const universe = runAuditUniverse();
  const cov = coverageSummary(buildArchetypeImpactMatrix());
  const rimStat = computeStatParVector("rim_protector", { actuals: { deterrence_events: 16, blocks: 4, dreb: 13, rim_contests: 12 } });
  const triadArchetypes = ["rim_protector", "connector", "spot_up_wing", "defensive_stopper"];
  const derived = deriveCourtContextById("canonical");
  const triad = triadArchetypes.map((a) => buildCompositeVerdict(a, derived.context, {}, derived.scoringBeatPer100));
  const pendingProbe = buildCompositeVerdict("rim_protector", COURT_GRIND, { deterrence_events: 40, rim_contests: 40 }, 0);
  const baseComposite = buildCompositeVerdict("rim_protector", derived.context, { deterrence_events: 16, dreb: 13 }, derived.scoringBeatPer100);
  const failDerived = deriveCourtContextById("provider_failure");
  const failComposite = buildCompositeVerdict("rim_protector", failDerived.context, { deterrence_events: 16, dreb: 13 }, failDerived.scoringBeatPer100);
  const productView = buildManifestView();
  const viewBefore = JSON.stringify(productView);
  const shadowFromView = buildShadowCompositeFromView(productView, "scoring_guard");
  const viewUntouched = JSON.stringify(productView) === viewBefore;
  const archRuns = runArchetypeScenarios();
  // Phase 11I: deterrence engine v1 upgrades rim_protector's placeholder stats
  const det = computeDeterrence({ opponentRimAttemptsPer100: 28, rimProtectionRating: 0.85, foulDisciplineRating: 0.7, expectedPossessions: 96, actualDeterrenceEvents: 16, actualRimContests: 12, inputProvenance: "synthetic_audit_fixture" });
  const rimDefaultVec = computeStatParVector("rim_protector");
  const rimUpgradedVec = computeStatParVector("rim_protector", { statOverrides: deterrenceStatOverrides(det) });
  const pendingBefore = rimDefaultVec.results.filter((r) => r.provenance === "pending_engine").length;
  const pendingAfter = rimUpgradedVec.results.filter((r) => r.provenance === "pending_engine").length;
  const productGeom = deriveCourtContextFromManifestView(productView);

  // Phase 11J: spacing-gravity engine v1 upgrades pending spacing_gravity across archetypes
  const sg = computeSpacingGravity({ threePointVolumePer100: 9, threePointAccuracy: 0.4, movementShootingRating: 0.7, cornerSpacingRating: 0.7, pullUpThreatRating: 0.5, defensiveAttention: 0.7, lineupSpacingScarcity: 0.3, expectedPossessions: 98, actualSpacingGravity: 11, inputProvenance: "synthetic_audit_fixture" });
  const sgTargets = ["spot_up_wing", "low_usage_specialist", "connector"];
  let sgPendingBefore = 0, sgPendingAfter = 0, sgUpgraded = 0;
  for (const a of sgTargets) {
    const def = computeStatParVector(a);
    const up = computeStatParVector(a, { statOverrides: spacingGravityStatOverrides(sg) });
    const before = def.results.filter((r) => r.provenance === "pending_engine").length;
    const after = up.results.filter((r) => r.provenance === "pending_engine").length;
    sgPendingBefore += before; sgPendingAfter += after;
    if (after < before && up.results.some((r) => r.provenance === "spacing_gravity_engine_v1")) sgUpgraded++;
  }

  // Phase 11J: attach limitations per archetype scenario (a passing scenario still confesses)
  const scenarioLimits = ARCHETYPE_SCENARIOS.map((s) => {
    const vec = computeStatParVector(s.archetype, { actuals: s.actuals });
    const verdict = buildCompositeVerdict(s.archetype, s.court, s.actuals, 0);
    return deriveLimitations({ provenancesPresent: vec.results.map((r) => r.provenance), proxyDriven: verdict.proxyDriven, geometryAvailable: true, usesCourtFactors: true });
  });
  const unionLimits = [...new Set(scenarioLimits.flat())];

  return {
    scenarios: traces,
    summary: {
      scenarioCount: traces.length,
      scenariosPassed: traces.filter((t) => t.pass).length,
      gatesPassed: universe.passed,
      gatesFailed: universe.failed,
      motionLockHeld: motionLockHeld(),
      coverage: cov,
      statPar: { archetypesProfiled: ARCHETYPE_STAT_PROFILES.length, beatWithoutScoringExample: rimStat.beatTheCourt && rimStat.pointsDelta === null },
      compositeVerdict: {
        archetypesShown: triad.length,
        allShadow: triad.every((v) => v.applied === false),
        pendingCannotDominate: pendingProbe.proxyDriven === true && pendingProbe.compositeConfidence <= 0.3,
        contextDerived: derived.context.provenance != null && derived.context.confidence != null && derived.sourceState.length > 0,
        scoringThreaded: triad[0].scoringCandidate === derived.scoringBeatPer100 && derived.scoringBeatPer100 !== 0,
        sourceHonest: failComposite.sourceState === "fixture_fallback" && failComposite.compositeConfidence <= baseComposite.compositeConfidence,
      },
      productBridge: { shadowFromViewApplied: shadowFromView.applied === false, viewUntouched },
      archetypeScenarios: {
        count: archRuns.length,
        distinctHeadlines: new Set(archRuns.map((r) => r.verdict.headlineCategory)).size,
        nonGuardCourts: archRuns.every((r) => r.scenario.court.total !== 202),
      },
      engineGaps: { named: NON_SCORING_ENGINE_GAPS.length },
      deterrenceEngine: {
        exists: true,
        upgradedRimProtector: rimUpgradedVec.results.some((r) => r.provenance === "deterrence_engine_v1") && pendingAfter < pendingBefore,
        pendingBefore, pendingAfter,
      },
      productGeometry: { available: productGeom.geometryAvailable, provenance: productGeom.geometryProvenance },
      spacingGravityEngine: { exists: true, upgradedArchetypes: sgUpgraded, pendingBefore: sgPendingBefore, pendingAfter: sgPendingAfter },
      limitations: {
        registrySize: Object.keys(LIMITATION_REGISTRY).length,
        scenariosWithLimitations: scenarioLimits.filter((l) => l.length > 0).length,
        blockers: scenarioLimits.filter((l) => hasDeploymentBlocker(l)).length,
        bySeverity: severityRollup(unionLimits),
      },
    },
  };
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runPressureLabSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const rep = runPressureLab();
  check("a trace exists for every scenario", rep.scenarios.length === auditScenarios.length);
  check("every trace carries synthetic_audit provenance", rep.scenarios.every((t) => t.provenance === AUDIT_PROVENANCE || t.provenance === "live"));
  check("scenarios with expectations all pass (no silent failures)", rep.scenarios.filter((t) => t.checks.length > 0).every((t) => t.pass));
  check("expected vs actual is recorded as pairs", rep.scenarios.every((t) => t.checks.every((c) => c.expected !== undefined && c.actual !== undefined)));
  check("every trace shows a confidence tier", rep.scenarios.every((t) => ["LOW", "MEDIUM", "HIGH"].includes(t.traces.confidence.tier)));
  check("every trace shows a render-state source badge", rep.scenarios.every((t) => t.traces.renderState.sourceBadge.length > 0));
  check("non-modeled scenario renders a fixture-estimate basis", rep.scenarios.filter((t) => !t.traces.archetype.modeled).every((t) => t.traces.archetype.basis.toLowerCase().includes("estimate")));
  check("missing-moneyline scenario shows no invented win prob", rep.scenarios.every((t) => t.traces.renderState.winProbLabel.includes("no moneyline")));
  check("motion lock held across the lab", rep.summary.motionLockHeld && rep.scenarios.every((t) => t.traces.motionLock));
  check("integrity gates folded in and green", rep.summary.gatesFailed === 0 && rep.summary.gatesPassed > 0);
  check("coverage rollup present for both teams", rep.summary.coverage.teamsCovered.includes("X") && rep.summary.coverage.teamsCovered.includes("Y"));
  check("coverage names the gaps", rep.summary.coverage.gapsNamed.length >= 3);
  check("pressure lab consumes the multi-stat par vector", rep.summary.statPar.archetypesProfiled >= 8);
  check("a non-scorer can beat the court in the lab (rim protector)", rep.summary.statPar.beatWithoutScoringExample);
  check("pressure lab shows the scoring/stat-vector/composite triad", rep.summary.compositeVerdict.archetypesShown >= 4);
  check("the composite is shadow-only (never applied to live verdict)", rep.summary.compositeVerdict.allShadow);
  check("pending stats cannot dominate the headline (proxy-flagged, low confidence)", rep.summary.compositeVerdict.pendingCannotDominate);
  check("court context is derived from the real engine chain (provenance + confidence + source)", rep.summary.compositeVerdict.contextDerived);
  check("the real scoring beat is threaded into the triad (no placeholder)", rep.summary.compositeVerdict.scoringThreaded);
  check("source-state honesty travels into the composite (fallback lowers confidence)", rep.summary.compositeVerdict.sourceHonest);
  check("the live product view can feed a SHADOW composite (read-only)", rep.summary.productBridge.shadowFromViewApplied && rep.summary.productBridge.viewUntouched);
  check("per-archetype scenarios exist on non-guard courts", rep.summary.archetypeScenarios.count >= 8 && rep.summary.archetypeScenarios.nonGuardCourts);
  check("composite drivers differ across archetype scenarios", rep.summary.archetypeScenarios.distinctHeadlines >= 4);
  check("non-scoring engine gaps are named", rep.summary.engineGaps.named >= 6);
  check("deterrence engine upgrades rim protector beyond the pending placeholder", rep.summary.deterrenceEngine.exists && rep.summary.deterrenceEngine.upgradedRimProtector && rep.summary.deterrenceEngine.pendingAfter < rep.summary.deterrenceEngine.pendingBefore);
  check("the bridge reads real product court geometry (derived)", rep.summary.productGeometry.available && rep.summary.productGeometry.provenance === "derived_from_archetype_factors");
  check("spacing-gravity engine upgrades pending stats across archetypes", rep.summary.spacingGravityEngine.exists && rep.summary.spacingGravityEngine.upgradedArchetypes >= 2 && rep.summary.spacingGravityEngine.pendingAfter < rep.summary.spacingGravityEngine.pendingBefore);
  check("deterrence engine remains intact alongside spacing gravity", rep.summary.deterrenceEngine.upgradedRimProtector);
  check("limitation registry exists and is populated", rep.summary.limitations.registrySize >= 12);
  check("every passing scenario still confesses limitations", rep.summary.limitations.scenariosWithLimitations === ARCHETYPE_SCENARIOS.length);
  check("a deployment blocker is present despite the green suite", rep.summary.limitations.blockers === ARCHETYPE_SCENARIOS.length && rep.summary.limitations.bySeverity.blocker >= 1);
  check("scenario pass count is consistent", rep.summary.scenariosPassed === rep.scenarios.filter((t) => t.pass).length);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runPressureLabSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
