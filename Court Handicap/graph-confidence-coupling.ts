// =============================================================================
// GINGEBALL COURT HANDICAP — GRAPH → CONFIDENCE COUPLING (Phase 9F, SHADOW)
//
// The lineup graph now knows which court it describes (9D) and how strongly it may
// describe it (9E). The natural next power is to let graph trust inform lineup
// confidence. But the graph is still authored, Y is still thin, thresholds are
// still uncalibrated — so full coupling would be premature.
//
// This engine runs in SHADOW: it computes what a graph-aware lineup confidence
// WOULD be, alongside the current one, and explains the delta. It does NOT replace
// the live lineup confidence, does NOT touch par, observed beat, or final verdict
// confidence. The graph auditions for influence; it does not get the keys.
//
// Crucial honesty: a thin-graph caution lowers the CANDIDATE because the graph's
// structural read is thin — NOT because the player performed worse and NOT because
// par moved. The reason string says so explicitly.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/graph-confidence-coupling.ts
// =============================================================================

import type { Confidence } from "@/lib/types";
import type { GraphTrustDecision, GraphDisplayMode } from "@/lib/lineup-graph-trust-policy";

export const GRAPH_CONF_COUPLING_VERSION = "ch-graph-conf-coupling@1.0.0";

const round = (x: number, d = 2) => Number(x.toFixed(d));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

// SHADOW deltas (authored, small, uncalibrated). Caution is NEGATIVE; the graph
// only whispers. full is neutral (we do not let a partial-data graph BOOST yet).
const SHADOW_DELTA: Record<GraphDisplayMode, number> = {
  full_graph: 0.0,
  partial_graph: -0.03,
  thin_graph: -0.10,
  limited_coverage: 0.0,
  no_graph: 0.0,
};

export type CouplingDirection = "support" | "caution" | "neutral";

export interface GraphConfidenceCandidate {
  currentLineupConfidence: Confidence;
  graphAwareLineupConfidenceCandidate: Confidence;
  confidenceDelta: number;          // candidate − current (negative = caution)
  direction: CouplingDirection;
  reason: string;
  couplingMode: "shadow";
  applied: boolean;                 // ALWAYS false in shadow
  wouldApply: boolean;              // would a live coupling change confidence?
  blockedBecause: string[];
  policyVersion: string;
}

export function computeGraphConfidenceCandidate(input: {
  currentLineupConfidence: Confidence;
  trust: GraphTrustDecision;
  teamLabel?: string;
}): GraphConfidenceCandidate {
  const current = clamp(input.currentLineupConfidence, 0, 1);
  const mode = input.trust.displayMode;
  const covered = mode !== "no_graph" && mode !== "limited_coverage";
  const delta = covered ? SHADOW_DELTA[mode] : 0;
  const candidate = round(clamp(current + delta, 0, 1), 2);
  const direction: CouplingDirection = delta < 0 ? "caution" : delta > 0 ? "support" : "neutral";

  const blockedBecause = ["shadow mode — candidate computed, not applied to the chain"];
  if (!covered) blockedBecause.push("no graph coverage to couple from");
  if (input.trust.withheldMetrics.includes("fragilityScore")) blockedBecause.push("graph withholds its fragility scalar (too sparse)");

  const who = input.teamLabel ? `${input.teamLabel} ` : "";
  const reason = !covered
    ? `${who}has no modeled graph, so a graph-aware lineup confidence would have nothing to add — influence withheld.`
    : delta < 0
      ? `${who}graph coverage is ${mode === "thin_graph" ? "thin" : "partial"} (${input.trust.graphTrustLabel}). A graph-aware lineup confidence would be cautioned by ${Math.abs(delta)} — this reflects the GRAPH's structural read, not player performance and not par.`
      : `${who}graph coverage is full; a graph-aware lineup confidence would be unchanged (no boost from authored data).`;

  return {
    currentLineupConfidence: round(current, 2),
    graphAwareLineupConfidenceCandidate: candidate,
    confidenceDelta: round(delta, 2),
    direction,
    reason,
    couplingMode: "shadow",
    applied: false,
    wouldApply: covered && delta !== 0,
    blockedBecause,
    policyVersion: GRAPH_CONF_COUPLING_VERSION,
  };
}

// =============================================================================
export function runGraphConfidenceCouplingSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  const trust = (displayMode: GraphDisplayMode, withheld: string[] = []): GraphTrustDecision => ({
    showFragilityScore: displayMode === "full_graph" || displayMode === "partial_graph",
    fragilityTrustLevel: "medium", graphTrustLabel: displayMode.toUpperCase(), graphTrustReason: "test",
    withheldMetrics: withheld, displayMode, recommendation: "test", policyVersion: "x",
  });

  const full = computeGraphConfidenceCandidate({ currentLineupConfidence: 0.73, trust: trust("full_graph") });
  const partial = computeGraphConfidenceCandidate({ currentLineupConfidence: 0.73, trust: trust("partial_graph") });
  const thin = computeGraphConfidenceCandidate({ currentLineupConfidence: 0.73, trust: trust("thin_graph", ["fragilityScore"]) });
  const none = computeGraphConfidenceCandidate({ currentLineupConfidence: 0.73, trust: trust("no_graph", ["fragilityScore"]) });

  check("full -> no caution (delta 0, neutral)", full.confidenceDelta === 0 && full.direction === "neutral");
  check("partial -> small caution (-0.03)", partial.confidenceDelta === -0.03 && partial.direction === "caution");
  check("thin -> stronger caution (-0.10)", thin.confidenceDelta === -0.10 && thin.graphAwareLineupConfidenceCandidate === 0.63);
  check("thin caution > partial caution (graph thinner -> more cautious)", Math.abs(thin.confidenceDelta) > Math.abs(partial.confidenceDelta));
  check("no graph -> withhold influence (delta 0, wouldApply false)", none.confidenceDelta === 0 && none.wouldApply === false && none.blockedBecause.some((b) => b.includes("no graph coverage")));

  // SHADOW invariants
  check("ALWAYS shadow + applied false (never live)", [full, partial, thin, none].every((c) => c.couplingMode === "shadow" && c.applied === false));
  check("candidate never equals an APPLIED change (current preserved separately)", thin.currentLineupConfidence === 0.73 && thin.graphAwareLineupConfidenceCandidate !== 0.73);
  check("wouldApply true only where a real delta exists", partial.wouldApply === true && thin.wouldApply === true && full.wouldApply === false && none.wouldApply === false);

  // the honest reason: caution is about the GRAPH, not the player
  check("thin reason: caution reflects graph, NOT player performance or par", thin.reason.includes("not player performance") && thin.reason.includes("not par"));
  check("blocked reasons name shadow mode", thin.blockedBecause.some((b) => b.includes("shadow mode")));
  check("versioned", thin.policyVersion === GRAPH_CONF_COUPLING_VERSION);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runGraphConfidenceCouplingSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
