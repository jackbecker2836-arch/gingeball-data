// =============================================================================
// GINGEBALL COURT HANDICAP — LINEUP GRAPH TRUST POLICY (Phase 9E)
//
// 9D made the graph speak from the right side of the court. But a graph built from
// ONE defensive edge can still compute a fragility scalar — and a one-edge number
// can sound as confident as a five-edge one. That is the gap this policy closes.
//
// Same philosophy as confidence, provenance, and shrinkage:
//   do not just produce a number — produce the right to believe the number.
//
// The graph still computes underneath. This policy decides what the UI has EARNED
// the right to show: a fragility scalar shown plainly, shown with caution, or
// WITHHELD in favor of structural notes. It governs DISPLAY only — never par,
// never confidence. Non-binding stays non-binding.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/lineup-graph-trust-policy.ts
// =============================================================================

import type { LineupGraphRead, CoverageLevel } from "@/lib/lineup-graph-engine";

export const GRAPH_TRUST_POLICY_VERSION = "ch-graph-trust@1.0.0";

export type GraphDisplayMode = "full_graph" | "partial_graph" | "thin_graph" | "limited_coverage" | "no_graph";
export type FragilityTrustLevel = "high" | "medium" | "low" | "none";

export interface GraphTrustDecision {
  showFragilityScore: boolean;
  fragilityTrustLevel: FragilityTrustLevel;
  graphTrustLabel: string;
  graphTrustReason: string;
  withheldMetrics: string[];
  displayMode: GraphDisplayMode;
  recommendation: string;
  policyVersion: string;
}

// A graph earns the right to a fragility scalar only when its coverage supports it.
//   full     -> show the scalar plainly
//   partial  -> show the scalar, caution-labeled (one dimension modeled)
//   thin     -> WITHHOLD the scalar; show structural notes only (too sparse)
//   none/0   -> limited coverage / no graph
export function decideGraphTrust(graph: LineupGraphRead | undefined): GraphTrustDecision {
  if (!graph || graph.coverage.nodeCount === 0) {
    return {
      showFragilityScore: false, fragilityTrustLevel: "none",
      graphTrustLabel: "NO GRAPH", graphTrustReason: "no lineup modeled for this selection",
      withheldMetrics: ["fragilityScore", "clusterWarnings", "keySynergies"],
      displayMode: graph ? "limited_coverage" : "no_graph",
      recommendation: "show a limited-coverage note; do not show any scalar",
      policyVersion: GRAPH_TRUST_POLICY_VERSION,
    };
  }

  const { level, offensiveEdges, defensiveEdges, edgeCount, nodeCount } = graph.coverage;
  const dimension = offensiveEdges > 0 && defensiveEdges === 0 ? "offense-led"
    : defensiveEdges > 0 && offensiveEdges === 0 ? "defense-led" : "two-way";

  if (level === "thin") {
    return {
      showFragilityScore: false, fragilityTrustLevel: "low",
      graphTrustLabel: `THIN GRAPH · ${dimension}`,
      graphTrustReason: `${edgeCount} edge${edgeCount === 1 ? "" : "s"} over ${nodeCount} nodes — too sparse for a fragility scalar`,
      withheldMetrics: ["fragilityScore"],
      displayMode: "thin_graph",
      recommendation: "show structural notes (backbone, clusters, limitations); WITHHOLD the fragility scalar",
      policyVersion: GRAPH_TRUST_POLICY_VERSION,
    };
  }

  if (level === "partial") {
    return {
      showFragilityScore: true, fragilityTrustLevel: "medium",
      graphTrustLabel: `PARTIAL GRAPH · ${dimension}`,
      graphTrustReason: `only ${dimension.replace("-led", "")} structure modeled — the other dimension is missing`,
      withheldMetrics: [],
      displayMode: "partial_graph",
      recommendation: "show the fragility scalar with a caution label (partial coverage)",
      policyVersion: GRAPH_TRUST_POLICY_VERSION,
    };
  }

  // full
  return {
    showFragilityScore: true, fragilityTrustLevel: "high",
    graphTrustLabel: "FULL GRAPH",
    graphTrustReason: "both offensive and defensive structure modeled",
    withheldMetrics: [],
    displayMode: "full_graph",
    recommendation: "show the fragility scalar plainly",
    policyVersion: GRAPH_TRUST_POLICY_VERSION,
  };
}

// =============================================================================
export function runGraphTrustSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  const mk = (level: CoverageLevel, off: number, def: number, edges: number, nodes = 5): LineupGraphRead => ({
    team: "t", teamId: "team-t", nodes: [], edges: [], keySynergies: [],
    clusters: { shooters: [], nonShooters: [], creators: [], defenders: [] },
    fragilityScore: 0.5, fragilityLabel: "SOME RISK", clusterWarnings: [],
    coverage: { team: "t", nodeCount: nodes, edgeCount: edges, offensiveEdges: off, defensiveEdges: def, level, missing: [] },
    limitations: [], graphConfidence: 0.55, inputProvenance: "synthetic_fixture", source: "engine", modelVersion: "x",
  });

  // X partial (offense-led): show with caution
  const xT = decideGraphTrust(mk("partial", 3, 0, 3));
  check("X partial -> SHOWS fragility (caution)", xT.showFragilityScore === true && xT.fragilityTrustLevel === "medium");
  check("X partial -> displayMode partial_graph, offense-led label", xT.displayMode === "partial_graph" && xT.graphTrustLabel.includes("offense-led"));
  check("X partial -> recommends a caution label", xT.recommendation.includes("caution"));
  check("X partial -> nothing withheld", xT.withheldMetrics.length === 0);

  // Y thin (defense-led, 1 edge): WITHHOLD fragility
  const yT = decideGraphTrust(mk("thin", 0, 1, 1));
  check("Y thin -> WITHHOLDS fragility scalar", yT.showFragilityScore === false && yT.withheldMetrics.includes("fragilityScore"));
  check("Y thin -> displayMode thin_graph, defense-led label", yT.displayMode === "thin_graph" && yT.graphTrustLabel.includes("defense-led"));
  check("Y thin -> reason names sparsity (1 edge / 5 nodes)", yT.graphTrustReason.includes("1 edge") && yT.graphTrustReason.includes("5 nodes"));
  check("Y thin -> recommends structural notes only", yT.recommendation.includes("structural notes") && yT.recommendation.toUpperCase().includes("WITHHOLD"));

  // a thin graph must NOT sound like a full graph (centerpiece)
  check("CENTERPIECE -> thin does not show a scalar; full does", yT.showFragilityScore === false && decideGraphTrust(mk("full", 3, 2, 5)).showFragilityScore === true);

  // full: show plainly
  const fT = decideGraphTrust(mk("full", 3, 2, 5));
  check("full -> shows fragility plainly (high trust)", fT.showFragilityScore && fT.fragilityTrustLevel === "high" && fT.displayMode === "full_graph");

  // none/empty
  const nT = decideGraphTrust(undefined);
  check("undefined graph -> no_graph, withholds everything", nT.displayMode === "no_graph" && nT.showFragilityScore === false);
  const zT = decideGraphTrust(mk("thin", 0, 0, 0, 0));
  check("zero nodes -> limited_coverage, no scalar", zT.displayMode === "limited_coverage" && zT.showFragilityScore === false);

  check("versioned + explainable", fT.policyVersion === GRAPH_TRUST_POLICY_VERSION && yT.graphTrustReason.length > 10);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runGraphTrustSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
