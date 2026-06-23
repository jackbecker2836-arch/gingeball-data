// =============================================================================
// GINGEBALL COURT HANDICAP — AUDIT UNIVERSE: FULL-SYSTEM RUNNER (Phase 11A)
//
// Ties the layers together. The engine-chain suite (lib/audit-harness) already
// flows each scenario through market -> lineup -> archetype -> proof -> confidence.
// This runner adds the layers ABOVE the engines — source labels, view-model, motion
// honesty, provenance — and asserts the named INTEGRITY_GATES across the real chain,
// reusing the existing synthetic-audit scenarios. It builds NO new fixtures and never
// touches the product path; it only reads.
// =============================================================================

import { auditScenarios, AUDIT_PROVENANCE } from "@/fixtures/court-handicap-audit-universe";
import { runScenario, runAuditSuite, type ScenarioResult } from "@/lib/audit-harness";
import { buildManifestView, rebuildWithMarket } from "@/lib/manifest-source";
import { sourceStateBadge, winProbabilityLabel, nodeBasisTag, confidenceBadge } from "@/components/court-handicap/ui-labels";
import { motionLockHeld } from "@/components/court-handicap/motion";
import { INTEGRITY_GATES, type IntegrityGate } from "./expectations";

function scenario(id: string): ScenarioResult {
  const s = auditScenarios.find((x) => x.id === id);
  if (!s) throw new Error(`audit-universe: missing scenario "${id}"`);
  return runScenario(s);
}

export interface GateResult { gate: IntegrityGate; passed: boolean; detail: string }
export interface AuditUniverseReport {
  passed: number; failed: number;
  gateResults: GateResult[];
  engine: { passed: number; failed: number };
  findings: string[];
}

export function runAuditUniverse(): AuditUniverseReport {
  const gateResults: GateResult[] = [];
  const findings: string[] = [];
  const gate = (id: string, cond: boolean, detail: string) => {
    const g = INTEGRITY_GATES.find((x) => x.id === id);
    if (!g) throw new Error(`audit-universe: unknown gate "${id}"`);
    gateResults.push({ gate: g, passed: cond, detail });
    if (!cond) findings.push(`${id}: ${detail}`);
  };

  // --- engine-chain results (real engines) ---
  const canonical = scenario("canonical");
  const rim = scenario("rim_protector");
  const thin = scenario("thin_sample");
  const lineupHelps = scenario("lineup_helps");
  const missingML = scenario("missing_moneylines");

  // market: the sacred par survives the chain
  gate("market_stable", Math.abs(canonical.marketPar - 24.5) < 0.6, `marketPar=${canonical.marketPar}`);

  // source / ui honesty (the labels the screen actually renders)
  const stale = sourceStateBadge("stale_live");
  const fallback = sourceStateBadge("fixture_fallback");
  gate("stale_stays_stale", stale.tone === "stale" && stale.readsLive === false, `tone=${stale.tone} readsLive=${stale.readsLive}`);
  gate("fallback_never_live", fallback.readsLive === false && fallback.tone !== "trust", `tone=${fallback.tone} readsLive=${fallback.readsLive}`);
  gate("missing_ml_no_winprob", missingML.winProbAvailable === false && winProbabilityLabel(undefined).includes("no moneyline"), `winProbAvailable=${missingML.winProbAvailable}`);

  // lineup: a different lineup moves the lineup par
  gate("lineup_moves_par", canonical.lineupPar !== lineupHelps.lineupPar, `canonical=${canonical.lineupPar} helps=${lineupHelps.lineupPar}`);

  // archetype: same court, different role -> different read; one hostile, one favorable
  gate("archetype_differs_by_role", canonical.difficulty !== rim.difficulty && canonical.fit !== rim.fit, `guard d=${canonical.difficulty}/f=${canonical.fit} · rim d=${rim.difficulty}/f=${rim.fit}`);
  gate("same_court_two_truths", canonical.difficulty > rim.difficulty && rim.fit > canonical.fit, `guard d=${canonical.difficulty}/f=${canonical.fit} · rim d=${rim.difficulty}/f=${rim.fit} (court is harder + worse-fit for the guard, easier + better-fit for the rim)`);

  // confidence + verdict: thin lowers confidence; a strong verdict can stay humble
  gate("thin_sample_lowers_confidence", thin.finalConfidence < canonical.finalConfidence, `thin=${thin.finalConfidence} < canonical=${canonical.finalConfidence}`);
  gate("strong_verdict_low_confidence", canonical.verdictWord.toUpperCase().includes("BEAT") && canonical.finalConfidence < 0.72, `"${canonical.verdictWord}" @ ${canonical.finalConfidence}`);

  // view: a what-if never overwrites the real market state (immutability + flagging)
  const base = buildManifestView();
  const baseSpread = base.marketHub.spread;
  const whatif = rebuildWithMarket(base, { spread: baseSpread - 3, total: base.marketHub.total + 6 });
  gate(
    "whatif_no_overwrite",
    whatif.provenance.market?.hypothetical === true &&
      base.marketHub.spread === baseSpread &&
      base.provenance.market?.hypothetical !== true,
    `whatif.hypothetical=${whatif.provenance.market?.hypothetical} · base spread intact=${base.marketHub.spread === baseSpread}`,
  );

  // provenance: synthetic-audit confesses itself; the product path never wears it
  const synth = sourceStateBadge("synthetic_audit");
  gate("synthetic_provenance_explicit", AUDIT_PROVENANCE === "synthetic_audit_fixture" && synth.tone === "synthetic" && synth.readsLive === false, `AUDIT_PROVENANCE=${AUDIT_PROVENANCE}`);
  const prodProvs = base.verdict.consolidated.layerBreakdown.map((l) => l.provenance);
  gate("no_product_contamination", !prodProvs.includes("synthetic_audit_fixture"), `product layer provenances: ${prodProvs.join(", ")}`);

  // motion: the 2D lock holds under the full chain
  gate("motion_lock_held", motionLockHeld(), "motionLockHeld()");

  // ---- Phase 11B: edge-case pressure ------------------------------------------
  const crossGuard = scenario("cross_guard");
  const crossRim = scenario("cross_rim");
  const injured = scenario("injured_starter");
  const lateChange = scenario("late_lineup_change");
  const providerFail = scenario("provider_failure");
  const extremeSpread = scenario("extreme_spread");
  const fast = scenario("fast_pace");
  const slow = scenario("slow_pace");
  const nonModeled = scenario("non_modeled");

  gate("crossing_court_two_truths", crossGuard.difficulty > 50 && crossRim.difficulty < 50,
    `same court -> guard difficulty=${crossGuard.difficulty} (hostile) · rim difficulty=${crossRim.difficulty} (favorable)`);
  gate("injured_starter_degrades", injured.lineupPar !== canonical.lineupPar && injured.layer.lineup < canonical.layer.lineup,
    `lineupPar ${canonical.lineupPar}->${injured.lineupPar}, lineup conf ${canonical.layer.lineup}->${injured.layer.lineup}`);
  gate("late_change_provisional", lateChange.provisional === true && lateChange.layer.lineup <= canonical.layer.lineup,
    `provisional=${lateChange.provisional}, lineup conf=${lateChange.layer.lineup}`);
  gate("provider_failure_guarded", providerFail.winProbAvailable === false && providerFail.layer.market < canonical.layer.market,
    `winProb=${providerFail.winProbAvailable}, market conf ${canonical.layer.market}->${providerFail.layer.market}`);
  gate("extreme_lines_stable", Number.isFinite(extremeSpread.marketPar) && Number.isFinite(extremeSpread.beatLineup) && extremeSpread.verdictWord.length > 0,
    `marketPar=${extremeSpread.marketPar}, verdict="${extremeSpread.verdictWord}"`);
  gate("pace_moves_possessions", fast.expectedPossessions > slow.expectedPossessions,
    `fast=${fast.expectedPossessions} > slow=${slow.expectedPossessions}`);

  // ---- Phase 11B: render-state contract (view-model/label aligns with scenario) -
  gate("render_thin_is_provisional", confidenceBadge(thin.finalConfidence, thin.provisional).tier !== "HIGH" && thin.provisional === true,
    `thin tier=${confidenceBadge(thin.finalConfidence, thin.provisional).tier} provisional=${thin.provisional}`);
  gate("render_nonmodeled_is_estimate", nonModeled.archetypeModeled === false && nodeBasisTag(false).label.includes("estimate") && nodeBasisTag(false).tone !== "trust",
    `modeled=${nonModeled.archetypeModeled}, label="${nodeBasisTag(false).label}"`);

  // include the engine-chain suite as one consolidated gate
  const engine = runAuditSuite();
  if (engine.failed) findings.push(`engine-chain suite: ${engine.failed} failed`);

  const gatePass = gateResults.filter((r) => r.passed).length;
  const gateFail = gateResults.filter((r) => !r.passed).length;
  return {
    passed: gatePass + (engine.failed === 0 ? 1 : 0),
    failed: gateFail + (engine.failed === 0 ? 0 : 1),
    gateResults,
    engine: { passed: engine.passed, failed: engine.failed },
    findings,
  };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runAuditUniverse();
  console.log(`${r.passed} passed, ${r.failed} failed  (engine-chain: ${r.engine.passed} ok / ${r.engine.failed} fail)`);
  if (r.failed) { console.log("FINDINGS:\n - " + r.findings.join("\n - ")); process.exit(1); }
}
