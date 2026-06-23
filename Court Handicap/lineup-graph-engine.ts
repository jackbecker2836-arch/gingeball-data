// =============================================================================
// GINGEBALL COURT HANDICAP — LINEUP GRAPH FOUNDATION (Phase 9A)
//
// The lineup engine produces a SCALAR (lineupPar 23.1). That number summarizes a
// web of relationships it never shows: who creates, who spaces, who cramps, who
// anchors the defense, and how fragile the whole thing is if one piece sits.
//
// This is the first honest graph layer. It sits BESIDE the lineup engine and does
// NOT move par — it EXPLAINS the structure the scalar compresses. Nodes are the
// five on-court players; edges are synergies. From those we derive spacing
// clusters, creator-roll edges, non-shooter clusters, a defensive backbone, and a
// fragility score. v1 surfaces fragility / warnings / key synergies; the full
// node-edge visualization and any graph-driven par adjustment are reserved.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/lineup-graph-engine.ts
// =============================================================================

import type { Confidence, InputProvenance } from "@/lib/types";

export const LINEUP_GRAPH_VERSION = "ch-lineup-graph@1.0.0";

const round = (x: number, d = 2) => Number(x.toFixed(d));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export type NodeRole = "creator" | "shooter" | "roll_big" | "stopper" | "connector" | "other";
export type EdgeType = "creator_roll" | "shooting_gravity" | "spacing_hazard" | "defensive" | "generic";

export interface GraphNode { id: string; label: string; role: NodeRole; shoots: boolean }
export interface GraphEdge { a: string; b: string; type: EdgeType }

// Phase 9D — coverage describes how COMPLETE a team's graph is, honestly. Neither
// fixture team is "full": X is offense-led (no defensive edges), Y is defense-led
// (one edge, no offensive structure). We label that asymmetry, never fake symmetry.
export type CoverageLevel = "full" | "partial" | "thin";
export interface GraphCoverage {
  team: string;
  nodeCount: number;
  edgeCount: number;
  offensiveEdges: number;
  defensiveEdges: number;
  level: CoverageLevel;
  missing: string[];
}

export interface LineupGraphRead {
  team?: string;              // Phase 9D: short team label (x/y)
  teamId?: string;            // Phase 9E: explicit team identity (e.g. "team-x"); future-season-ready
  nodes: GraphNode[];
  edges: GraphEdge[];
  keySynergies: { a: string; b: string; type: EdgeType; note: string }[];
  clusters: { shooters: string[]; nonShooters: string[]; creators: string[]; defenders: string[] };
  fragilityScore: number;     // 0..1, higher = more fragile
  fragilityLabel: string;     // SOLID / SOME RISK / FRAGILE
  clusterWarnings: string[];
  coverage: GraphCoverage;    // Phase 9D: how complete this graph is
  limitations: string[];      // Phase 9D: what this graph does NOT model, said plainly
  graphConfidence: Confidence;
  inputProvenance: InputProvenance;
  source: "engine";
  modelVersion: string;
}

function fragilityLabel(score: number): string {
  if (score < 0.25) return "SOLID";
  if (score < 0.55) return "SOME RISK";
  return "FRAGILE";
}

export function computeLineupGraph(input: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  inputProvenance: InputProvenance;
  team?: string;
  teamId?: string;
}): LineupGraphRead {
  const { nodes, edges } = input;
  const shooters = nodes.filter((n) => n.shoots).map((n) => n.id);
  const nonShooters = nodes.filter((n) => !n.shoots).map((n) => n.id);
  const creators = nodes.filter((n) => n.role === "creator").map((n) => n.id);
  const defenders = nodes.filter((n) => n.role === "stopper").map((n) => n.id);

  const keySynergies = edges
    .filter((e) => e.type === "creator_roll" || e.type === "shooting_gravity")
    .map((e) => ({
      a: e.a, b: e.b, type: e.type,
      note: e.type === "creator_roll" ? "creator + roll big: the engine of easy looks" : "shooting gravity: bends help, opens the floor",
    }));

  // fragility: a lineup is fragile when one creator carries it, when non-shooters
  // cramp spacing, and when the graph is sparsely connected.
  const creatorDependence = creators.length <= 1 ? 0.40 : creators.length === 2 ? 0.15 : 0.0;
  const spacingFragility = clamp((nonShooters.length - 1) * 0.20, 0, 0.40);
  const connFragility = edges.length < nodes.length - 1 ? 0.20 : 0.0;
  const fragilityScore = round(clamp(creatorDependence + spacingFragility + connFragility, 0, 1), 2);

  const clusterWarnings: string[] = [];
  if (nonShooters.length >= 2) clusterWarnings.push(`${nonShooters.length} non-shooters share the floor — spacing is cramped`);
  if (creators.length <= 1) clusterWarnings.push("single-creator dependence — fragile if he sits or is pressured");
  if (shooters.length === 0) clusterWarnings.push("no floor spacing — the paint stays walled");

  // Phase 9D — honest coverage. Offensive dimension = creator-roll / shooting /
  // spacing-hazard edges; defensive dimension = defensive edges. "full" needs both.
  const offensiveEdges = edges.filter((e) => e.type === "creator_roll" || e.type === "shooting_gravity" || e.type === "spacing_hazard").length;
  const defensiveEdges = edges.filter((e) => e.type === "defensive").length;
  const missing: string[] = [];
  if (offensiveEdges === 0) missing.push("offensive structure (creator-roll, spacing)");
  if (defensiveEdges === 0) missing.push("defensive structure (backbone, help)");
  if (edges.length <= 1) missing.push("multiple modeled edges (sparse graph)");
  const level: CoverageLevel =
    edges.length <= 1 ? "thin"
    : (offensiveEdges > 0 && defensiveEdges > 0) ? "full"
    : "partial";
  const coverage: GraphCoverage = { team: input.team ?? "?", nodeCount: nodes.length, edgeCount: edges.length, offensiveEdges, defensiveEdges, level, missing };

  const limitations: string[] = [];
  if (offensiveEdges === 0) limitations.push("offensive structure not modeled from this fixture — defense-led read");
  if (defensiveEdges === 0) limitations.push("defensive structure not modeled from this fixture — offense-led read");
  if (level === "thin") limitations.push("sparse graph (≤1 edge): structural read is indicative, not complete");
  limitations.push("non-binding: explains structure; does not move par or confidence");

  // graph confidence: edges are fixture-derived today; cap honestly.
  const graphConfidence = round(input.inputProvenance === "live" ? 0.8 : input.inputProvenance === "fixture" ? 0.7 : 0.55, 2);

  return {
    team: input.team, teamId: input.teamId, nodes, edges, keySynergies,
    clusters: { shooters, nonShooters, creators, defenders },
    fragilityScore, fragilityLabel: fragilityLabel(fragilityScore), clusterWarnings,
    coverage, limitations,
    graphConfidence, inputProvenance: input.inputProvenance, source: "engine", modelVersion: LINEUP_GRAPH_VERSION,
  };
}

// Helper: classify a node role from an archetype string (used by the source seam).
export function roleFromArchetype(archetype: string): { role: NodeRole; shoots: boolean } {
  switch (archetype) {
    case "scoring_guard": return { role: "creator", shoots: true };
    case "wing_scorer": case "spot_up_wing": case "three_and_d_stopper": return { role: "shooter", shoots: true };
    case "roll_big": return { role: "roll_big", shoots: false };
    case "rim_protector": return { role: "roll_big", shoots: false };
    case "defensive_chaos": case "defensive_stopper": return { role: "stopper", shoots: false };
    case "connector": return { role: "connector", shoots: true };
    default: return { role: "other", shoots: false };
  }
}

// =============================================================================
export function runLineupGraphSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  // canonical X lineup: x1 creator, x2/x3 shooters, x4 stopper (non-shooter), x5 roll big (non-shooter)
  const nodes: GraphNode[] = [
    { id: "x1", label: "Scoring Guard", role: "creator", shoots: true },
    { id: "x2", label: "Wing Scorer", role: "shooter", shoots: true },
    { id: "x3", label: "Spot-up Wing", role: "shooter", shoots: true },
    { id: "x4", label: "Defensive Chaos", role: "stopper", shoots: false },
    { id: "x5", label: "Roll Big", role: "roll_big", shoots: false },
  ];
  const edges: GraphEdge[] = [
    { a: "x1", b: "x5", type: "creator_roll" },
    { a: "x2", b: "x1", type: "shooting_gravity" },
    { a: "x3", b: "x1", type: "shooting_gravity" },
    { a: "x1", b: "x4", type: "spacing_hazard" },
  ];
  const g = computeLineupGraph({ nodes, edges, inputProvenance: "synthetic_fixture" });

  check("graph -> 5 nodes, edges preserved", g.nodes.length === 5 && g.edges.length === 4);
  check("graph -> shooters {x1,x2,x3}", JSON.stringify(g.clusters.shooters) === JSON.stringify(["x1", "x2", "x3"]));
  check("graph -> non-shooters {x4,x5}", JSON.stringify(g.clusters.nonShooters) === JSON.stringify(["x4", "x5"]));
  check("graph -> creator-roll is a key synergy", g.keySynergies.some((s) => s.type === "creator_roll" && s.a === "x1" && s.b === "x5"));
  check("graph -> shooting gravity captured as key synergy", g.keySynergies.filter((s) => s.type === "shooting_gravity").length === 2);
  check("graph -> warns on 2 non-shooters (spacing)", g.clusterWarnings.some((w) => w.includes("non-shooters")));
  check("graph -> warns on single-creator dependence", g.clusterWarnings.some((w) => w.includes("single-creator")));
  check("graph -> fragility reflects 1 creator + 2 non-shooters (SOME RISK/FRAGILE)", g.fragilityScore >= 0.4 && g.fragilityLabel !== "SOLID");
  check("graph -> confidence capped for synthetic inputs (<0.7)", g.graphConfidence < 0.7);

  // a balanced lineup: 2 creators, 1 non-shooter -> less fragile
  const balanced = computeLineupGraph({
    nodes: [
      { id: "a", label: "Guard", role: "creator", shoots: true },
      { id: "b", label: "Guard2", role: "creator", shoots: true },
      { id: "c", label: "Wing", role: "shooter", shoots: true },
      { id: "d", label: "Wing2", role: "shooter", shoots: true },
      { id: "e", label: "Big", role: "roll_big", shoots: false },
    ],
    edges: [{ a: "a", b: "e", type: "creator_roll" }, { a: "b", b: "c", type: "shooting_gravity" }, { a: "a", b: "d", type: "shooting_gravity" }, { a: "b", b: "e", type: "creator_roll" }],
    inputProvenance: "synthetic_fixture",
  });
  check("balanced -> less fragile than single-creator cramped lineup", balanced.fragilityScore < g.fragilityScore);
  check("balanced -> no single-creator warning", !balanced.clusterWarnings.some((w) => w.includes("single-creator")));

  // role classifier
  check("classifier -> scoring_guard is a shooting creator", roleFromArchetype("scoring_guard").role === "creator" && roleFromArchetype("scoring_guard").shoots);
  check("classifier -> roll_big does not space", roleFromArchetype("roll_big").shoots === false);
  check("classifier -> spot_up_wing shoots", roleFromArchetype("spot_up_wing").shoots === true);

  check("explainable -> version present", g.modelVersion === LINEUP_GRAPH_VERSION);

  // Phase 9D — coverage is honest about asymmetry
  const gX = computeLineupGraph({ nodes, edges, inputProvenance: "synthetic_fixture", team: "x" });
  check("9D -> X coverage carries team + counts", gX.coverage.team === "x" && gX.coverage.nodeCount === 5 && gX.coverage.edgeCount === 4);
  check("9D -> X is offense-led (offensive edges, no defensive)", gX.coverage.offensiveEdges > 0 && gX.coverage.defensiveEdges === 0);
  check("9D -> X level partial (one dimension modeled)", gX.coverage.level === "partial");
  check("9D -> X limitations name the missing defensive structure", gX.limitations.some((l) => l.includes("defensive structure not modeled")));

  // Y lineup: defense-led, sparse (1 defensive edge) -> thin, offense not modeled
  const yNodes: GraphNode[] = [
    { id: "y1", label: "POA Stopper", role: "stopper", shoots: false },
    { id: "y2", label: "Wing", role: "shooter", shoots: true },
    { id: "y3", label: "Forward", role: "connector", shoots: true },
    { id: "y4", label: "Rim Protector", role: "roll_big", shoots: false },
    { id: "y5", label: "Guard", role: "creator", shoots: true },
  ];
  const yEdges: GraphEdge[] = [{ a: "y1", b: "y4", type: "defensive" }];
  const gY = computeLineupGraph({ nodes: yNodes, edges: yEdges, inputProvenance: "synthetic_fixture", team: "y" });
  check("9D -> Y is defense-led (defensive edge, no offensive)", gY.coverage.defensiveEdges === 1 && gY.coverage.offensiveEdges === 0);
  check("9D -> Y level thin (sparse, 1 edge)", gY.coverage.level === "thin");
  check("9D -> Y limitations name sparse + missing offense", gY.limitations.some((l) => l.includes("offensive structure not modeled")) && gY.limitations.some((l) => l.includes("sparse")));
  check("9D -> both graphs declare non-binding", gX.limitations.some((l) => l.includes("non-binding")) && gY.limitations.some((l) => l.includes("non-binding")));
  check("9D -> X and Y warnings are team-specific (different node sets)", JSON.stringify(gX.nodes.map((n) => n.id)) !== JSON.stringify(gY.nodes.map((n) => n.id)));

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runLineupGraphSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
