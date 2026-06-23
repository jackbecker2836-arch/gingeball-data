// =============================================================================
// GINGEBALL COURT HANDICAP — SHADOW COUPLING AUDIT & GRADUATION (Phase 9G)
//
// 9F let the graph audition for influence (a shadow lineup-confidence candidate).
// Before that candidate ever earns a vote, it must be AUDITED: does its behavior
// make sense across states, and what would it actually do to final confidence if
// it graduated? This harness runs the candidate across scenarios, models the
// lineup -> final propagation IN AUDIT ONLY (never applied), checks explicit
// graduation criteria, and emits a recommendation.
//
//   the graph must EARN influence before it RECEIVES influence.
//
// Nothing here writes back to the chain. Par, beats, source state, and shipped
// final confidence are untouched; the propagation numbers live only in this report.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/graph-confidence-coupling-audit.ts
// =============================================================================

import { buildManifestView } from "@/lib/manifest-source";
import { resolveSelectedLineupGraph } from "@/lib/manifest-view-model";
import type { CourtHandicapView } from "@/lib/manifest-view-model";
import { consolidateVerdictConfidence } from "@/lib/verdict-confidence-engine";
import { computeGraphConfidenceCandidate } from "@/lib/graph-confidence-coupling";
import { decideGraphTrust } from "@/lib/lineup-graph-trust-policy";
import { computeLineupGraph, type GraphNode, type GraphEdge } from "@/lib/lineup-graph-engine";

export const GRAPH_COUPLING_AUDIT_VERSION = "ch-graph-coupling-audit@1.0.0";

const round = (x: number, d = 2) => Number(x.toFixed(d));

export type GraduationStatus = "graduate" | "partial_graduate" | "keep_shadow" | "needs_calibration";

export interface PropagationModel {
  finalBefore: number;
  finalAfter: number;       // audit-only: final if the lineup layer used the candidate
  finalDelta: number;
  swallowed: boolean;       // true if the lineup nudge does not move final (held elsewhere)
}

export interface CouplingAuditScenario {
  id: string;
  selectedPlayer?: string;
  side: string;
  coverageMode: string;
  currentLineupConfidence: number;
  candidate: number;
  delta: number;
  direction: string;
  reason: string;
  wouldApply: boolean;
  blockedBecause: string[];
  reasonable: boolean;
  propagation?: PropagationModel;
}

export interface GraduationCriterion { id: string; description: string; passed: boolean; detail: string }

export interface CouplingAuditReport {
  scenarios: CouplingAuditScenario[];
  criteria: GraduationCriterion[];
  calibrated: boolean;
  recommendation: GraduationStatus;
  recommendationReason: string;
  auditVersion: string;
}

// Audit-only: what would final confidence be if the lineup layer used `newLineupConf`?
// (missingCount feeds only warning text, not the number, so 0 is faithful.)
function modelFinalWithLineupConfidence(view: CourtHandicapView, newLineupConf: number): number {
  const lb = view.verdict.consolidated.layerBreakdown;
  const layers = lb.map((l) => ({
    layer: l.layer as "market" | "lineup" | "archetype" | "proof",
    confidence: l.layer === "lineup" ? newLineupConf : l.confidence,
    provenance: l.provenance, missingCount: 0,
  }));
  return consolidateVerdictConfidence({ layers }).finalConfidence;
}

function reasonableShadow(covered: boolean, delta: number): boolean {
  // a reasonable candidate only ever cautions (<=0), never over-penalizes, and is
  // zero when there is no graph to couple from.
  if (!covered) return delta === 0;
  return delta <= 0 && Math.abs(delta) <= 0.15;
}

export function buildGraphCouplingAudit(): CouplingAuditReport {
  const scenarios: CouplingAuditScenario[] = [];

  // --- real graded players, with audit-only propagation -----------------------
  const view = buildManifestView();
  const realView = (playerId: string, label: string) => {
    const res = resolveSelectedLineupGraph(view, playerId);
    const cand = res.shadowConfidence;
    if (!cand) return;
    const finalBefore = view.verdict.confidence; // note: propagation modeled on the studied chain
    const finalAfter = modelFinalWithLineupConfidence(view, cand.graphAwareLineupConfidenceCandidate);
    const finalDelta = round(finalAfter - finalBefore, 2);
    scenarios.push({
      id: label, selectedPlayer: playerId, side: res.team, coverageMode: res.trust.displayMode,
      currentLineupConfidence: cand.currentLineupConfidence, candidate: cand.graphAwareLineupConfidenceCandidate,
      delta: cand.confidenceDelta, direction: cand.direction, reason: cand.reason,
      wouldApply: cand.wouldApply, blockedBecause: cand.blockedBecause,
      reasonable: reasonableShadow(res.covered, cand.confidenceDelta),
      propagation: { finalBefore, finalAfter, finalDelta, swallowed: finalDelta === 0 },
    });
  };
  realView("x1", "guard_partial");   // X partial (offense-led)
  realView("y4", "big_thin");        // Y thin (defense-led)

  // --- engine-level coverage scenarios (full / none) --------------------------
  const fullNodes: GraphNode[] = [
    { id: "a", label: "Guard", role: "creator", shoots: true }, { id: "b", label: "Guard2", role: "creator", shoots: true },
    { id: "c", label: "Wing", role: "shooter", shoots: true }, { id: "d", label: "Stopper", role: "stopper", shoots: false },
    { id: "e", label: "Big", role: "roll_big", shoots: false },
  ];
  const fullEdges: GraphEdge[] = [
    { a: "a", b: "e", type: "creator_roll" }, { a: "b", b: "c", type: "shooting_gravity" },
    { a: "d", b: "e", type: "defensive" }, { a: "a", b: "d", type: "defensive" },
  ];
  const fullGraph = computeLineupGraph({ nodes: fullNodes, edges: fullEdges, inputProvenance: "synthetic_fixture", team: "z", teamId: "team-z" });
  const fullCand = computeGraphConfidenceCandidate({ currentLineupConfidence: 0.73, trust: decideGraphTrust(fullGraph), teamLabel: "Z lineup" });
  scenarios.push({
    id: "full_graph", side: "z", coverageMode: fullCand.couplingMode === "shadow" ? decideGraphTrust(fullGraph).displayMode : "full_graph",
    currentLineupConfidence: fullCand.currentLineupConfidence, candidate: fullCand.graphAwareLineupConfidenceCandidate,
    delta: fullCand.confidenceDelta, direction: fullCand.direction, reason: fullCand.reason,
    wouldApply: fullCand.wouldApply, blockedBecause: fullCand.blockedBecause, reasonable: reasonableShadow(true, fullCand.confidenceDelta),
  });
  const noneCand = computeGraphConfidenceCandidate({ currentLineupConfidence: 0.73, trust: decideGraphTrust(undefined), teamLabel: "Unmodeled" });
  scenarios.push({
    id: "no_graph", side: "unknown", coverageMode: "no_graph",
    currentLineupConfidence: noneCand.currentLineupConfidence, candidate: noneCand.graphAwareLineupConfidenceCandidate,
    delta: noneCand.confidenceDelta, direction: noneCand.direction, reason: noneCand.reason,
    wouldApply: noneCand.wouldApply, blockedBecause: noneCand.blockedBecause, reasonable: reasonableShadow(false, noneCand.confidenceDelta),
  });

  // --- graduation criteria ----------------------------------------------------
  const partial = scenarios.find((s) => s.id === "guard_partial")!;
  const thin = scenarios.find((s) => s.id === "big_thin")!;
  const full = scenarios.find((s) => s.id === "full_graph")!;
  const none = scenarios.find((s) => s.id === "no_graph")!;

  const criteria: GraduationCriterion[] = [
    { id: "only_lowers", description: "candidate only lowers confidence (never raises) on incomplete coverage",
      passed: scenarios.every((s) => s.delta <= 0), detail: "all deltas ≤ 0" },
    { id: "par_stable", description: "candidate never changes par",
      passed: view.conditions.lineupPar === 23.1 && (view.secondGrade?.lineupPar ?? 0) === 11.4, detail: `guard par ${view.conditions.lineupPar}, big par ${view.secondGrade?.lineupPar}` },
    { id: "beats_stable", description: "candidate never changes observed or evidence-adjusted beat",
      passed: view.verdict.beatLineupPer100 === 8.6 && (view.secondGrade?.verdict.beatLineupPer100 ?? 0) === 4.0 && view.verdict.evidenceAdjusted?.observed === 8.6,
      detail: "observed +8.6 / +4.0 and evidence-adjusted observed intact" },
    { id: "source_uncontradicted", description: "candidate never contradicts source/provenance state (applied:false)",
      passed: partial.blockedBecause.some((b) => b.includes("shadow mode")) && thin.blockedBecause.some((b) => b.includes("shadow mode")), detail: "shadow mode, not applied" },
    { id: "selection_correct", description: "candidate is selection-correct (guard→X, big→Y)",
      passed: partial.side === "x" && thin.side === "y", detail: `guard side ${partial.side}, big side ${thin.side}` },
    { id: "reason_understandable", description: "candidate reason is understandable + attributes caution to the graph, not the player",
      passed: thin.reason.includes("not player performance") && thin.reason.includes("not par") && thin.reason.length > 30, detail: "reason names graph coverage, disclaims player/par" },
    { id: "stable_across_states", description: "candidate delta is stable per coverage mode (partial −0.03, thin −0.10, full 0)",
      passed: partial.delta === -0.03 && thin.delta === -0.10 && full.delta === 0, detail: `partial ${partial.delta}, thin ${thin.delta}, full ${full.delta}` },
    { id: "thin_not_over_penalizing", description: "thin caution does not over-penalize the whole grade",
      passed: Math.abs(thin.delta) <= 0.15 && (thin.propagation ? Math.abs(thin.propagation.finalDelta) <= 0.05 : true), detail: `thin delta ${thin.delta}, final move ${thin.propagation?.finalDelta ?? "n/a"}` },
    { id: "full_never_boosts", description: "full graph never boosts confidence (until calibrated)",
      passed: full.delta === 0 && none.delta === 0, detail: "full and no-graph deltas are 0" },
    { id: "propagation_defined", description: "lineup→final propagation path is defined (modeled in audit)",
      passed: !!partial.propagation && !!thin.propagation && Number.isFinite(partial.propagation!.finalAfter), detail: `guard ${partial.propagation?.finalBefore}→${partial.propagation?.finalAfter}, big ${thin.propagation?.finalBefore}→${thin.propagation?.finalAfter}` },
    { id: "deltas_calibrated", description: "shadow deltas are calibrated from real outcomes (NOT authored)",
      passed: false, detail: "deltas are authored hypotheses (−0.03 / −0.10); no real outcomes exist yet — this is the gating criterion" },
  ];

  const calibrated = criteria.find((c) => c.id === "deltas_calibrated")!.passed;
  const nonCalibrationPassed = criteria.filter((c) => c.id !== "deltas_calibrated").every((c) => c.passed);

  let recommendation: GraduationStatus;
  let recommendationReason: string;
  if (calibrated && nonCalibrationPassed) {
    recommendation = "graduate"; recommendationReason = "all criteria pass, including calibration";
  } else if (!calibrated && nonCalibrationPassed) {
    recommendation = "keep_shadow";
    recommendationReason = "every behavioral criterion passes and the propagation path is modeled, but the deltas are authored, not calibrated. Keep shadow; graduation criteria are now explicit — graduate when real outcomes calibrate the deltas.";
  } else {
    recommendation = "needs_calibration";
    recommendationReason = "one or more behavioral criteria fail; do not graduate.";
  }

  return { scenarios, criteria, calibrated, recommendation, recommendationReason, auditVersion: GRAPH_COUPLING_AUDIT_VERSION };
}

// =============================================================================
export function runGraphCouplingAuditSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  const r = buildGraphCouplingAudit();
  const partial = r.scenarios.find((s) => s.id === "guard_partial")!;
  const thin = r.scenarios.find((s) => s.id === "big_thin")!;
  const full = r.scenarios.find((s) => s.id === "full_graph")!;
  const none = r.scenarios.find((s) => s.id === "no_graph")!;

  check("audit -> covers partial / thin / full / no-graph", !!partial && !!thin && !!full && !!none);
  check("audit -> guard is X partial, small caution", partial.side === "x" && partial.coverageMode === "partial_graph" && partial.delta === -0.03);
  check("audit -> big is Y thin, stronger caution", thin.side === "y" && thin.coverageMode === "thin_graph" && thin.delta === -0.10);
  check("audit -> full graph does NOT boost (delta 0)", full.delta === 0 && full.direction === "neutral");
  check("audit -> no-graph withholds influence (delta 0, blocked)", none.delta === 0 && none.blockedBecause.some((b) => b.includes("no graph coverage")));
  check("audit -> every scenario candidate is 'reasonable'", r.scenarios.every((s) => s.reasonable));

  // PROPAGATION modeled, audit-only
  check("propagation -> modeled before/after for both players", !!partial.propagation && !!thin.propagation);
  check("propagation -> guard lineup nudge is largely swallowed by the chain (final move ≤ 0.02)", Math.abs(partial.propagation!.finalDelta) <= 0.02);
  check("propagation -> finalBefore matches the shipped 0.60 (audit reads, does not write)", partial.propagation!.finalBefore === 0.6);

  // GRADUATION criteria + recommendation
  const calib = r.criteria.find((c) => c.id === "deltas_calibrated")!;
  check("criteria -> calibration is the gating FAIL (authored deltas)", calib.passed === false);
  check("criteria -> all behavioral criteria pass", r.criteria.filter((c) => c.id !== "deltas_calibrated").every((c) => c.passed));
  check("recommendation -> KEEP SHADOW (criteria defined, not calibrated)", r.recommendation === "keep_shadow");
  check("recommendation -> reason names the missing calibration", r.recommendationReason.includes("calibrat"));

  // NOTHING SHIPPED MOVES (the whole point)
  const v = buildManifestView();
  check("stability -> par 23.1, conf 0.60, beats +8.6/+4.0 untouched by the audit", v.conditions.lineupPar === 23.1 && v.verdict.confidence === 0.6 && v.verdict.beatLineupPer100 === 8.6 && (v.secondGrade?.verdict.beatLineupPer100 ?? 0) === 4.0);
  check("versioned", r.auditVersion === GRAPH_COUPLING_AUDIT_VERSION);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runGraphCouplingAuditSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
