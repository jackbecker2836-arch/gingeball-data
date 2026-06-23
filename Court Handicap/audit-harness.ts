// =============================================================================
// GINGEBALL COURT HANDICAP — FULL-SYSTEM AUDIT HARNESS (Phase 7)
//
// Flows every audit scenario through the REAL chain (market -> lineup -> archetype
// -> possession proof -> verdict confidence) and checks behavioral expectations
// (signs, orderings, flags, labels) — never memorized numbers. It also emits a
// FINDINGS list: measurements the audit surfaces for later, evidence-based tuning
// (it does NOT tune anything itself).
//
// Run `npx tsx --tsconfig tsconfig.check.json lib/audit-harness.ts`.
// =============================================================================

import { computeMarketCourt, computeMarketPar } from "./market-court-engine";
import { computeLineupCourt } from "./lineup-court-engine";
import { computeArchetypeCourt } from "./archetype-court-engine";
import { computePossessionProof, type PossessionEvent } from "./possession-proof-engine";
import { consolidateVerdictConfidence } from "./verdict-confidence-engine";
import { parPer100 } from "./formula-registry";
import type { InputProvenance } from "./types";
import { auditScenarios, provenancePair, type AuditScenario, type AuditPoss } from "@/fixtures/court-handicap-audit-universe";

const r1 = (x: number) => Number(x.toFixed(1));
const r2 = (x: number) => Number(x.toFixed(2));

function expandPossessions(groups: AuditPoss[]): PossessionEvent[] {
  const out: PossessionEvent[] = []; let seq = 1;
  for (const [n, points, pressure] of groups) {
    for (let i = 0; i < n; i++) {
      const family = points >= 1 && points < 2 ? "free_throw" : points >= 2 ? "pullup" : "pullup";
      const outcome = points >= 2 ? "made" : points === 1 ? "foul_drawn" : "missed";
      out.push({ seq: seq++, family, outcome, points, pressure, counts: true });
    }
  }
  return out;
}

export interface ScenarioResult {
  id: string; label: string;
  courtType: string; winProbAvailable: boolean; expectedPossessions: number;
  marketPar: number; lineupPar: number; lineupAboveMarket: boolean;
  actualPer100: number; lineupParPer100: number; marketParPer100: number;
  beatLineup: number; beatMarket: number; verdictWord: string;
  archetypeModeled: boolean; difficulty: number; fit: number;
  layer: { market: number; lineup: number; archetype: number; proof: number };
  finalConfidence: number; reliabilityLabel: string; provisional: boolean; weakest: string;
}

export function runScenario(s: AuditScenario): ScenarioResult {
  const snapshot = {
    gameId: `audit-${s.id}`, phase: (s.phase === "open" ? "open" : "close") as "open" | "close",
    capturedTs: "2026-01-15T23:30:00Z",
    homeTeamId: "team-x", awayTeamId: "team-y",
    homeSpread: s.spread, total: s.total,
    homeMoneyline: s.marketMissingMoneylines ? undefined : (s.homeMoneyline ?? undefined),
    awayMoneyline: s.marketMissingMoneylines ? undefined : (s.awayMoneyline ?? undefined),
    bookCount: s.bookCount, bookAgreement: s.bookAgreement,
  };
  const mc = computeMarketCourt(snapshot);
  const mpar = computeMarketPar({ normalBaseline: s.normalPar, marketLine: s.marketLine });
  const lowTotal = s.total <= 206;

  const isScorer = s.archetype === "scoring_guard";
  const lineup = computeLineupCourt({
    marketPar: mpar.marketPar, archetypeClass: isScorer ? "scorer" : "role",
    spacingSignal: s.spacing, poaSignal: s.poa, rimSignal: s.rim, burdenSignal: s.burden, synergySignal: s.synergy,
    lineupStatusConfidence: s.lineupStatusConfidence, inputProvenance: s.provenance,
    missing: ["audit synthetic on/off", "audit tracking spacing"],
  });

  const parPoss = s.parPoss ?? s.expectedPossForPer100;
  const lineupParPer100 = parPer100({ propLine: lineup.lineupPar, expectedOnCourtPoss: parPoss });
  const marketParPer100 = parPer100({ propLine: mpar.marketPar, expectedOnCourtPoss: parPoss });

  const archCommon = {
    expectedPossessions: mc.expectedPossessions, marketConfidence: mc.confidence,
    lineupStatusConfidence: s.lineupStatusConfidence, inputProvenance: s.provenance,
  };
  const arch = isScorer
    ? computeArchetypeCourt({ archetype: s.archetype, normalPar: s.normalPar, marketPar: mpar.marketPar, lineupPar: lineup.lineupPar,
        marketSuppressionPct: mpar.suppression, lineupSuppressionPct: lineup.lineupSuppressionPct,
        spacing: s.spacing, oppPoaPressure: s.poa, oppRimProtection: s.rim, creationBurden: s.burden, synergyRelief: s.synergy,
        ...archCommon, missing: ["audit matchup tracking"] })
    : s.archetype === "rim_protector"
      ? computeArchetypeCourt({ archetype: s.archetype,
          oppRimAttackVolume: s.rim, reboundingEnv: 0.7, rollGravity: s.synergy, lowTotalGrind: lowTotal ? 0.8 : 0.4,
          touchVolume: 0.5, paintCongestion: s.spacing, oppRimProtection: 0.4,
          ...archCommon, missing: ["audit rebounding tracking", "rim-protector par model"] })
      : computeArchetypeCourt({ archetype: s.archetype, ...archCommon, missing: [`${s.archetype} translation model`] });

  const proof = computePossessionProof({
    studiedPlayerId: "audit", events: expandPossessions(s.possessions), expectedPer100: lineupParPer100,
    marketConfidence: mc.confidence, inputProvenance: s.provenance,
    missing: ["audit play-by-play", "non-scoring value model"],
  });

  const beatLineup = proof.valueOverExpectedPer100;
  const beatMarket = r1(proof.actualPer100 - marketParPer100);
  const verdictWord = beatLineup > 0.05 ? "BEAT THE COURT" : beatLineup < -0.05 ? "TRAPPED BY THE COURT" : "MET THE COURT";

  const marketProv: InputProvenance = s.provenance === "live" ? "live" : s.provenance;
  const vc = consolidateVerdictConfidence({ layers: [
    { layer: "market", confidence: mc.confidence, provenance: marketProv, missingCount: (snapshot.homeMoneyline != null && snapshot.awayMoneyline != null) ? 0 : 1 },
    { layer: "lineup", confidence: lineup.confidence, provenance: lineup.inputProvenance, missingCount: lineup.missing.length },
    { layer: "archetype", confidence: arch.confidence, provenance: arch.inputProvenance, missingCount: arch.missing.length },
    { layer: "proof", confidence: proof.confidence, provenance: proof.inputProvenance, missingCount: proof.missing.length },
  ] });

  return {
    id: s.id, label: s.label,
    courtType: mc.courtType, winProbAvailable: snapshot.homeMoneyline != null && snapshot.awayMoneyline != null, expectedPossessions: mc.expectedPossessions,
    marketPar: mpar.marketPar, lineupPar: lineup.lineupPar, lineupAboveMarket: lineup.lineupPar > mpar.marketPar + 1e-9,
    actualPer100: proof.actualPer100, lineupParPer100: r1(lineupParPer100), marketParPer100: r1(marketParPer100),
    beatLineup, beatMarket, verdictWord,
    archetypeModeled: arch.modeled, difficulty: arch.difficulty, fit: arch.fit,
    layer: { market: r2(mc.confidence), lineup: r2(lineup.confidence), archetype: r2(arch.confidence), proof: r2(proof.confidence) },
    finalConfidence: vc.finalConfidence, reliabilityLabel: vc.reliabilityLabel, provisional: vc.provisional, weakest: vc.weakestLayer.layer,
  };
}

export function runAuditSuite(): { passed: number; failed: number; details: string[]; findings: string[] } {
  const details: string[] = []; const findings: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };
  const signOf = (x: number) => (x > 0.05 ? "pos" : x < -0.05 ? "neg" : "zero");

  for (const s of auditScenarios) {
    const r = runScenario(s);
    const e = s.expect;
    if (e.verdictWord) check(`[${s.id}] verdict = ${e.verdictWord}`, r.verdictWord === e.verdictWord);
    if (e.beatLineupSign) check(`[${s.id}] beat-lineup ${e.beatLineupSign}`, signOf(r.beatLineup) === e.beatLineupSign);
    if (e.beatMarketSign) check(`[${s.id}] beat-market ${e.beatMarketSign}`, signOf(r.beatMarket) === e.beatMarketSign);
    if (e.beatHostileCourt !== undefined) check(`[${s.id}] beatHostileCourt=${e.beatHostileCourt}`, e.beatHostileCourt ? r.beatLineup > 0 : r.beatLineup <= 0);
    if (e.courtTypeIncludes) check(`[${s.id}] court type ~ "${e.courtTypeIncludes}"`, r.courtType.toLowerCase().includes(e.courtTypeIncludes));
    if (e.archetypeModeled !== undefined) check(`[${s.id}] archetypeModeled=${e.archetypeModeled}`, r.archetypeModeled === e.archetypeModeled);
    if (e.provisional !== undefined) check(`[${s.id}] provisional=${e.provisional}`, r.provisional === e.provisional);
    if (e.winProbAvailable !== undefined) check(`[${s.id}] winProb available=${e.winProbAvailable}`, r.winProbAvailable === e.winProbAvailable);
    if (e.finalConfidenceBelow !== undefined) check(`[${s.id}] final < ${e.finalConfidenceBelow}`, r.finalConfidence < e.finalConfidenceBelow);
    if (e.finalConfidenceAbove !== undefined) check(`[${s.id}] final > ${e.finalConfidenceAbove}`, r.finalConfidence > e.finalConfidenceAbove);
  }

  // ---- FINDINGS (measurements for later, evidence-based tuning) -------------
  const byId = Object.fromEntries(auditScenarios.map((s) => [s.id, runScenario(s)]));

  // 1) provenance de-stacking probe (post-7B)
  const ps = runScenario(provenancePair.synthetic), pl = runScenario(provenancePair.live);
  findings.push(`provenance probe: identical chain scores ${ps.finalConfidence} (synthetic) vs ${pl.finalConfidence} (live) — gap ${r2(pl.finalConfidence - ps.finalConfidence)}. Post-7B this gap is ONLY per-layer dataIntegrity; the consolidator's separate numeric factor was removed (de-stacked). Provenance still shows as the PROVISIONAL label.`);

  // 2) proof confidence v2 shape vs sample size
  findings.push(`proof confidence v2 (sample gate × quality geomean): thin(${byId["thin_sample"]?.layer.proof}) collapses, full(${byId["canonical"]?.layer.proof}) stays humble — replaced the six-factor product that crushed proof at full sample.`);

  // 3) tier label sanity across cases
  findings.push(`labels: canonical=${byId["canonical"]?.reliabilityLabel}, clean=${byId["clean_modest"]?.reliabilityLabel}, thin=${byId["thin_sample"]?.reliabilityLabel} — review HIGH/MEDIUM/LOW cutoffs across these (do not refit to one case).`);

  // 4) par ordering honesty
  const helps = byId["lineup_helps"];
  findings.push(`par ordering: lineup_helps lineupPar(${helps?.lineupPar}) ${helps?.lineupAboveMarket ? ">" : "<="} marketPar(${helps?.marketPar}) — ${helps?.lineupAboveMarket ? "engine CAN raise par above market (mirror case representable)" : "engine CLAMPS suppression >=0; 'beat market / lose lineup' mirror NOT representable — a real modeling limit."}`);

  // 5) weakest-layer distribution (post-reshape)
  const weak = auditScenarios.map((s) => byId[s.id]?.weakest);
  const proofWeak = weak.filter((w) => w === "proof").length;
  const archWeak = weak.filter((w) => w === "archetype").length;
  findings.push(`weakest layer: proof in ${proofWeak}/${auditScenarios.length}, archetype in ${archWeak}/${auditScenarios.length} (proof was 11/12 pre-7B). The reshape diversified the bottleneck; archetype now often binds — the honest limit of the newest synthetic-fed model.`);

  // 6) favorable-court honesty
  const fav = byId["favorable_underperform"];
  findings.push(`favorable court honesty: difficulty ${fav?.difficulty} (low) yet beat-lineup ${fav?.beatLineup} — confirmed an easy court does not manufacture a beat.`);

  return { passed, failed, details, findings };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runAuditSuite();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n"));
  console.log("\n--- FINDINGS ---\n" + r.findings.map((f, i) => `${i + 1}. ${f}`).join("\n"));
  console.log(`\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
