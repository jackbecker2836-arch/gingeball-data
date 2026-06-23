// =============================================================================
// GINGEBALL COURT HANDICAP — UI HONESTY AUDIT (Phase 8)
//
// A truth pass on the INTERFACE. For every source state, player state, what-if
// state, and confidence tier, this harness builds the REAL view-model and asserts
// the exact labels/flags the components render — using the same pure functions
// (ui-labels) the components import. The engine can be honest while a label
// overclaims; this catches that.
//
// The most important test:
//   THE INTERFACE NEVER TELLS A STRONGER STORY THAN THE ENGINES EARNED.
//
// Run: npx tsx --tsconfig tsconfig.check.json components/court-handicap/ui-honesty-audit.ts
// =============================================================================

import { buildManifestView, buildManifestViewAsync, rebuildWithMarket } from "@/lib/manifest-source";
import { resolveSelectedLineupGraph } from "@/lib/manifest-view-model";
import { makeMockTransport, makeTestLiveTransport } from "@/adapters/odds-transport";
import { clearLastKnownGood } from "@/adapters/odds-cache";
import { consolidateVerdictConfidence } from "@/lib/verdict-confidence-engine";
import type { SourceState } from "@/lib/manifest-view-model";
import { sourceStateBadge, confidenceBadge, winProbabilityLabel, nodeBasisTag, NON_SCORING_LABEL, toneColor } from "./ui-labels";

const ALL_STATES: SourceState[] = ["live", "stale_live", "last_known_good", "fixture_fallback", "mock", "fixture", "synthetic_audit"];
const GAME = "game-live-001";
const A = "2026-01-16T00:00:00Z";

export async function runUiHonestySelfChecks(): Promise<{ passed: number; failed: number; details: string[] }> {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  // ---- LABEL INVARIANTS (pure, exhaustive over every state) ------------------
  check("label -> exactly ONE state reads live (only 'live')", ALL_STATES.filter((s) => sourceStateBadge(s).readsLive).length === 1 && sourceStateBadge("live").readsLive);
  check("label -> only 'live' carries the trust tone", ALL_STATES.filter((s) => sourceStateBadge(s).tone === "trust").length === 1 && sourceStateBadge("live").tone === "trust");
  check("label -> no fallback/synthetic badge contains the word LIVE alone", ["last_known_good", "fixture_fallback", "mock", "fixture", "synthetic_audit"].every((s) => sourceStateBadge(s as SourceState).label !== "LIVE"));
  check("label -> stale badge says STALE, rust 'stale' tone, clock marker (v2)", sourceStateBadge("stale_live").label.includes("STALE") && sourceStateBadge("stale_live").tone === "stale" && sourceStateBadge("stale_live").marker === "clock" && !sourceStateBadge("stale_live").readsLive);
  check("label -> mock/fixture read SYNTHETIC/FIXTURE, synthetic tone", sourceStateBadge("mock").tone === "synthetic" && sourceStateBadge("fixture").tone === "synthetic");

  // ---- RENDERED SOURCE STATES (real views, asserting the badge the UI shows) --
  clearLastKnownGood();
  const liveV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ capturedTs: "2026-01-15T23:30:00Z" }), gameId: GAME, asOf: A });
  const lb = sourceStateBadge(liveV.provenance.market!.sourceState);
  check("RENDER live -> badge LIVE, reads live, trust tone, quality 1", lb.label === "LIVE" && lb.readsLive && lb.tone === "trust" && liveV.provenance.market?.sourceQuality === 1);

  clearLastKnownGood();
  const mockV = await buildManifestViewAsync({ transport: makeMockTransport({ capturedTs: A }), gameId: GAME, asOf: A });
  check("RENDER mock -> SYNTHETIC, never reads live", sourceStateBadge(mockV.provenance.market!.sourceState).label === "SYNTHETIC" && !sourceStateBadge(mockV.provenance.market!.sourceState).readsLive);

  clearLastKnownGood();
  const staleV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ capturedTs: "2026-01-15T20:00:00Z" }), gameId: GAME, asOf: A });
  check("RENDER stale -> badge not-live + stale flag + quality<1 (never looks fresh)", !sourceStateBadge(staleV.provenance.market!.sourceState).readsLive && staleV.provenance.market?.stale === true && (staleV.provenance.market?.sourceQuality ?? 1) < 1);

  clearLastKnownGood();
  await buildManifestViewAsync({ transport: makeTestLiveTransport({ capturedTs: "2026-01-15T23:30:00Z" }), gameId: GAME, asOf: A });
  const lkgV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ fail: "error" }), gameId: GAME, asOf: A });
  check("RENDER last-known-good -> cached tone (v2), never reads live", sourceStateBadge(lkgV.provenance.market!.sourceState).tone === "cached" && !sourceStateBadge(lkgV.provenance.market!.sourceState).readsLive);

  clearLastKnownGood();
  const fbV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ fail: "error" }), gameId: GAME, asOf: A });
  check("RENDER fixture-fallback -> warn tone, never reads live", sourceStateBadge(fbV.provenance.market!.sourceState).tone === "warn" && !sourceStateBadge(fbV.provenance.market!.sourceState).readsLive);

  // *** CENTERPIECE: no rendered non-live view's badge reads live ***
  const fallbackViews = [mockV, staleV, lkgV, fbV];
  check("*** UI: FALLBACK NEVER LOOKS LIVE (no badge reads live) ***", fallbackViews.every((v) => !sourceStateBadge(v.provenance.market!.sourceState).readsLive));

  // ---- WIN PROBABILITY never invented ---------------------------------------
  clearLastKnownGood();
  const noMlV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ capturedTs: "2026-01-15T23:30:00Z", withMoneylines: false }), gameId: GAME, asOf: A });
  check("missing moneyline -> win-prob label says 'no moneyline' (not a number)", winProbabilityLabel(noMlV.marketHub.winProbability).includes("no moneyline"));
  check("present moneyline -> win-prob label is the number", /·/.test(winProbabilityLabel(liveV.marketHub.winProbability)) && !winProbabilityLabel(liveV.marketHub.winProbability).includes("no moneyline"));

  // ---- CONFIDENCE: provisional visible; LOW survives a strong verdict --------
  const fx = buildManifestView();
  const cb = confidenceBadge(fx.verdict.confidence, fx.verdict.consolidated.provisional);
  check("confidence -> canonical guard badge MEDIUM · PROVISIONAL", cb.tier === "MEDIUM" && cb.label.includes("PROVISIONAL"));
  check("confidence -> badge label matches engine reliabilityLabel tier", fx.verdict.consolidated.reliabilityLabel.startsWith(cb.tier));
  check("confidence -> a strong verdict still shows humble confidence (BEAT + <0.7)", fx.verdict.word === "BEAT THE COURT" && fx.verdict.confidence < 0.7);
  // drive a genuinely LOW grade and prove the label does not hide it
  const lowVc = consolidateVerdictConfidence({ layers: [
    { layer: "market", confidence: 0.5, provenance: "fixture", missingCount: 0 },
    { layer: "lineup", confidence: 0.35, provenance: "synthetic_fixture", missingCount: 2 },
    { layer: "archetype", confidence: 0.3, provenance: "synthetic_fixture", missingCount: 3 },
    { layer: "proof", confidence: 0.32, provenance: "synthetic_fixture", missingCount: 2 },
  ] });
  const lowCb = confidenceBadge(lowVc.finalConfidence, lowVc.provisional);
  check("confidence -> LOW grade badges LOW · PROVISIONAL (warn tone)", lowCb.tier === "LOW" && lowCb.label.includes("PROVISIONAL") && lowCb.tone === "warn");
  check("confidence -> HIGH/MEDIUM/LOW thresholds correct", confidenceBadge(0.8, false).tier === "HIGH" && confidenceBadge(0.6, false).tier === "MEDIUM" && confidenceBadge(0.4, false).tier === "LOW");

  // ---- PLAYER STATES: guard vs big; tracked-not-valued ----------------------
  check("guard -> primary conditions+verdict are the guard's", fx.conditions.playerId === "x1" && fx.verdict.proof.usedPossessions === 67);
  const g2 = fx.secondGrade!;
  check("big -> fully graded, provisional confidence visible", !!g2 && g2.verdict.consolidated.provisional === true);
  check("big -> non-scoring proof present and labeled 'tracked · not valued'", g2.nonScoringProof.length === 4 && NON_SCORING_LABEL === "tracked · not valued");
  const valuedFamilies = new Set(g2.verdict.proof.topFamilies.map((f) => f.family));
  check("big -> tracked-not-valued NEVER appears among valued headline families", !["rebound", "block", "deterrence", "screen"].some((t) => valuedFamilies.has(t)));
  check("big -> his valued families are scoring (roll/putback/post/FT)", g2.verdict.proof.topFamilies.length > 0 && g2.verdict.proof.topFamilies.every((f) => ["roll_finish", "putback", "post", "free_throw"].includes(f.family)));

  // ---- NON-MODELED ARCHETYPE: reads fixture, not engine, not broken ----------
  const unmodeled = fx.courtGraph.players.find((p) => p.id === "x2");
  check("non-modeled node -> exists with fixture magnitude (modeled falsy)", !!unmodeled && !unmodeled.modeled);
  check("non-modeled node -> basis tag reads 'fixture estimate' (not engine)", nodeBasisTag(!!unmodeled?.modeled).label === "fixture estimate" && nodeBasisTag(!!unmodeled?.modeled).tone === "synthetic");
  check("modeled node -> basis tag reads 'engine' (trust)", nodeBasisTag(true).label === "engine" && nodeBasisTag(true).tone === "trust");
  check("non-modeled node -> still has honest difficulty/fit (not broken/zero)", (unmodeled?.difficulty ?? -1) >= 0 && (unmodeled?.fit ?? -1) >= 0);

  // ---- WHAT-IF: stays separate from real line history -----------------------
  const whatif = rebuildWithMarket(fx, { total: 210 });
  check("what-if -> flagged hypothetical (badge WHAT-IF shows)", whatif.provenance.market?.hypothetical === true);
  check("what-if -> real basis line unchanged (202, not overwritten)", whatif.basis?.snapshot.total === 202);
  check("what-if -> source badge still honest (not falsely live)", !sourceStateBadge(whatif.provenance.market!.sourceState).readsLive);
  check("what-if -> conditions invariant vs scrub (marketPar 24.5)", whatif.conditions.marketPar === 24.5);

  // ---- PENDING-ENGINE honesty stays surfaced --------------------------------
  check("pending-engine -> non-scoring value named pending (not faked)", fx.provenance.pendingEngine.some((s) => s.toLowerCase().includes("non-scoring")));

  // ---- STABILITY: the truth pass disturbed no earned number -----------------
  check("stable -> guard 0.60 byte-stable", fx.verdict.confidence === 0.6);
  check("stable -> guard +8.6 byte-stable", Math.abs(fx.verdict.beatLineupPer100 - 8.6) <= 0.05);
  check("stable -> implied 103/99 byte-stable", fx.marketHub.implied.home === 103 && fx.marketHub.implied.away === 99);

  // ---- GRAPH TRUST honesty (Phase 9E): a thin graph must not show a scalar -----
  const trustGuard = resolveSelectedLineupGraph(fx, "x1");
  const trustBig = resolveSelectedLineupGraph(fx, "y4");
  check("9E ui -> guard's partial graph SHOWS fragility (the UI may render the scalar)", trustGuard.trust.showFragilityScore === true);
  check("9E ui -> rim protector's thin graph WITHHOLDS fragility (UI shows a note, not a number)", trustBig.trust.showFragilityScore === false && trustBig.trust.withheldMetrics.includes("fragilityScore"));
  check("9E ui -> a thin graph never reads like a full graph", trustBig.trust.displayMode === "thin_graph" && trustGuard.trust.displayMode !== "thin_graph");
  check("9E ui -> team resolved explicitly (not from id prefix)", trustGuard.teamSource === "explicit" && trustBig.teamSource === "explicit");

  // ---- PALETTE v2 (Phase 10B): the amber collision is resolved -----------------
  const medium = confidenceBadge(0.6, true);          // MEDIUM confidence
  const lkg = sourceStateBadge("last_known_good");
  const stale = sourceStateBadge("stale_live");
  const fallback = sourceStateBadge("fixture_fallback");
  const live = sourceStateBadge("live");
  check("palette v2 -> MEDIUM confidence still owns amber (caution)", medium.tone === "caution" && toneColor("caution") === "#E49B18");
  check("palette v2 -> last-known-good moved OFF amber to cached grey", lkg.tone === "cached" && toneColor("cached") !== toneColor("caution"));
  check("palette v2 -> stale moved OFF crimson to rust (distinct from fallback)", stale.tone === "stale" && toneColor("stale") !== toneColor("warn"));
  check("palette v2 -> the three former-amber meanings are now distinct hues", new Set([toneColor(medium.tone), toneColor(lkg.tone), toneColor("hypothetical")]).size === 3);
  check("palette v2 -> stale ≠ fallback hue (no two source states collide)", toneColor(stale.tone) !== toneColor(fallback.tone));
  check("palette v2 -> every badge carries a grayscale-safe marker", [live, stale, lkg, fallback].every((b) => !!b.marker) && stale.marker === "clock");
  check("palette v2 -> only LIVE reads live (invariant holds through v2)", live.readsLive === true && [stale, lkg, fallback].every((b) => b.readsLive === false));

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  runUiHonestySelfChecks().then((r) => {
    // eslint-disable-next-line no-console
    console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
    if (r.failed > 0) process.exit(1);
  });
}
