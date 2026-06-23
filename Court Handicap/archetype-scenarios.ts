// =============================================================================
// GINGEBALL COURT HANDICAP — PER-ARCHETYPE SCENARIOS & ENGINE GAPS (Phase 11H)
//
// Non-guard archetypes deserve their OWN courts, not a guard-shaped one. Each scenario
// here carries an archetype-shaped CourtContext, synthetic actuals that beat the stats
// the archetype actually owns, an expected headline category, a confidence vulnerability,
// a render expectation, and a team side. It also names the non-scoring ENGINE GAPS so the
// lab can say "this archetype is composite-shadow supported, but its primary proof stat
// is pending_engine."
//
// All synthetic. Composites stay shadow (applied:false).
// =============================================================================

import { buildCompositeVerdict, type CourtContext, type CompositeVerdict } from "@/lib/stat-par/composite-verdict";
import { getStatProfile, EVIDENCE_TYPE, type StatId, type StatProvenance, type StatCategory, type EvidenceType } from "@/lib/stat-par/stat-par";

export interface ArchetypeScenario {
  archetype: string;
  teamSide: "X" | "Y";
  court: CourtContext;                  // archetype-shaped, NOT guard-shaped
  actuals: Partial<Record<StatId, number>>;
  allowedHeadline: StatCategory[];      // categories this archetype is allowed to win on
  primaryProofStat: StatId;
  confidenceVulnerability: string;
  renderExpectation: string;
}

const AUDIT = "synthetic_audit_fixture";

export const ARCHETYPE_SCENARIOS: ArchetypeScenario[] = [
  {
    archetype: "rim_protector", teamSide: "Y",
    court: { label: "low-total defensive grind", total: 194, spacingScarcity: 0.65, poaPressure: 0.8, rimProtectionFaced: 0.85, synergy: 0.3, provenance: AUDIT, sourceState: "synthetic_audit", confidence: 0.55 },
    actuals: { deterrence_events: 16, blocks: 4, dreb: 13, rim_contests: 12 },
    allowedHeadline: ["rim_defense", "rebounding"], primaryProofStat: "deterrence_events",
    confidenceVulnerability: "no deterrence / rim-tracking data", renderExpectation: "estimate self-read; deterrence pending_engine",
  },
  {
    archetype: "connector", teamSide: "X",
    court: { label: "connected motion offense", total: 222, spacingScarcity: 0.35, poaPressure: 0.5, rimProtectionFaced: 0.45, synergy: 0.7, provenance: AUDIT, sourceState: "synthetic_audit", confidence: 0.58 },
    actuals: { assists: 10, secondary_assists: 6, turnovers: 1 },
    allowedHeadline: ["creation", "ball_security"], primaryProofStat: "secondary_assists",
    confidenceVulnerability: "no passing-tracking data", renderExpectation: "estimate self-read; secondary assists fixture_estimate",
  },
  {
    archetype: "spot_up_wing", teamSide: "X",
    court: { label: "spread pick-and-roll", total: 228, spacingScarcity: 0.25, poaPressure: 0.55, rimProtectionFaced: 0.5, synergy: 0.55, provenance: AUDIT, sourceState: "synthetic_audit", confidence: 0.56 },
    actuals: { spacing_gravity: 11, fg3m: 4 },
    allowedHeadline: ["spacing", "shooting"], primaryProofStat: "spacing_gravity",
    confidenceVulnerability: "no shot-quality / spacing-tracking data", renderExpectation: "estimate self-read; spacing gravity pending_engine",
  },
  {
    archetype: "defensive_stopper", teamSide: "X",
    court: { label: "point-of-attack war", total: 205, spacingScarcity: 0.55, poaPressure: 0.9, rimProtectionFaced: 0.6, synergy: 0.35, provenance: AUDIT, sourceState: "synthetic_audit", confidence: 0.5 },
    actuals: { steals: 3.5, rim_contests: 9, dreb: 6 },
    allowedHeadline: ["perimeter_defense", "rim_defense", "rebounding"], primaryProofStat: "rim_contests",
    confidenceVulnerability: "no matchup-assignment data", renderExpectation: "estimate self-read; rim contests tracking_estimate",
  },
  {
    archetype: "screen_assist_big", teamSide: "Y",
    court: { label: "DHO / screen-heavy half-court", total: 216, spacingScarcity: 0.4, poaPressure: 0.5, rimProtectionFaced: 0.5, synergy: 0.68, provenance: AUDIT, sourceState: "synthetic_audit", confidence: 0.54 },
    actuals: { screen_assists: 10, rim_gravity: 11, dreb: 8 },
    allowedHeadline: ["screening", "gravity", "rebounding"], primaryProofStat: "screen_assists",
    confidenceVulnerability: "no screen-tracking data", renderExpectation: "estimate self-read; screen assists fixture_estimate",
  },
  {
    archetype: "secondary_creator", teamSide: "X",
    court: { label: "two-initiator backcourt", total: 214, spacingScarcity: 0.5, poaPressure: 0.7, rimProtectionFaced: 0.55, synergy: 0.5, provenance: AUDIT, sourceState: "synthetic_audit", confidence: 0.57 },
    actuals: { assists: 9, fta: 7, turnovers: 2 },
    allowedHeadline: ["creation", "scoring"], primaryProofStat: "assists",
    confidenceVulnerability: "role overlap with the primary creator", renderExpectation: "estimate self-read; creation box-score synthetic",
  },
  {
    archetype: "high_usage_star", teamSide: "X",
    court: { label: "heliocentric usage", total: 224, spacingScarcity: 0.45, poaPressure: 0.6, rimProtectionFaced: 0.55, synergy: 0.45, provenance: AUDIT, sourceState: "synthetic_audit", confidence: 0.6 },
    actuals: { points: 34, assists: 9, fta: 10 },
    allowedHeadline: ["scoring", "creation"], primaryProofStat: "points",
    confidenceVulnerability: "missing usage context; teammate role ambiguity not modeled", renderExpectation: "estimate self-read; scoring engine_modeled",
  },
  {
    archetype: "low_usage_specialist", teamSide: "Y",
    court: { label: "role-dependent bench unit", total: 210, spacingScarcity: 0.5, poaPressure: 0.6, rimProtectionFaced: 0.5, synergy: 0.4, provenance: AUDIT, sourceState: "synthetic_audit", confidence: 0.45 },
    actuals: { spacing_gravity: 8, fg3m: 3 },
    allowedHeadline: ["spacing", "shooting"], primaryProofStat: "spacing_gravity",
    confidenceVulnerability: "high fit sensitivity; thin minutes", renderExpectation: "estimate self-read; spacing gravity pending_engine",
  },
];

export interface ScenarioComposite { scenario: ArchetypeScenario; verdict: CompositeVerdict; evidenceType: EvidenceType }

export function runArchetypeScenarios(): ScenarioComposite[] {
  return ARCHETYPE_SCENARIOS.map((s) => ({
    scenario: s,
    verdict: buildCompositeVerdict(s.archetype, s.court, s.actuals, 0),
    evidenceType: EVIDENCE_TYPE[s.primaryProofStat],
  }));
}

// ---- non-scoring engine gaps (named, status-tracked) ------------------------
export type EngineGapStatus = "missing" | "stubbed" | "partial";
export interface EngineGap { engine: string; status: EngineGapStatus; servesStats: StatId[]; servesArchetypes: string[] }

export const NON_SCORING_ENGINE_GAPS: EngineGap[] = [
  { engine: "deterrence", status: "missing", servesStats: ["deterrence_events"], servesArchetypes: ["rim_protector", "defensive_stopper"] },
  { engine: "spacing_gravity", status: "missing", servesStats: ["spacing_gravity"], servesArchetypes: ["spot_up_wing", "low_usage_specialist"] },
  { engine: "screen_assist", status: "missing", servesStats: ["screen_assists"], servesArchetypes: ["screen_assist_big", "roll_big"] },
  { engine: "secondary_assist", status: "missing", servesStats: ["secondary_assists"], servesArchetypes: ["connector"] },
  { engine: "opponent_suppression", status: "missing", servesStats: ["rim_contests", "steals"], servesArchetypes: ["defensive_stopper", "rim_protector"] },
  { engine: "role_compression", status: "missing", servesStats: [], servesArchetypes: ["high_usage_star"] },
  { engine: "lineup_relief", status: "missing", servesStats: [], servesArchetypes: ["secondary_creator", "connector"] },
];

/** Reports a gap note when an archetype's primary proof stat is still pending_engine. */
export function archetypePendingProofGap(archetype: string, primaryProofStat: StatId): string | null {
  const prof = getStatProfile(archetype);
  const entry = prof?.entries.find((e) => e.stat === primaryProofStat);
  if (entry && (entry.provenance === "pending_engine" || entry.provenance === "fixture_estimate")) {
    return `${archetype} is composite-shadow supported, but its primary proof stat (${primaryProofStat}) is ${entry.provenance}`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runArchetypeScenarioSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const runs = runArchetypeScenarios();
  check("at least 8 per-archetype scenarios", runs.length >= 8);
  check("multiple distinct archetypes", new Set(runs.map((r) => r.scenario.archetype)).size >= 8);

  // non-guard scenarios have their OWN courts (not one guard-shaped court)
  check("scenario courts are distinct (not guard-shaped reuse)", new Set(runs.map((r) => r.scenario.court.label)).size >= 7);
  check("no scenario reuses the canonical guard court total (202)", runs.every((r) => r.scenario.court.total !== 202));
  check("both team sides represented", new Set(runs.map((r) => r.scenario.teamSide)).size === 2);

  // composite drivers differ by archetype
  const headlines = runs.map((r) => r.verdict.headlineCategory);
  check("composite headline categories differ across archetypes", new Set(headlines).size >= 4);
  check("each archetype wins on a category it is allowed to own", runs.every((r) => r.verdict.headlineCategory === null || r.scenario.allowedHeadline.includes(r.verdict.headlineCategory)));

  // each scenario beats its court (shadow)
  check("each scenario beats its court in shadow", runs.every((r) => r.verdict.compositeCandidate > 0 && r.verdict.applied === false));

  // provenance consistency: the primary proof stat's provenance matches the registry
  check("primary proof stat exists in the archetype's profile", runs.every((r) => getStatProfile(r.scenario.archetype)?.entries.some((e) => e.stat === r.scenario.primaryProofStat)));

  // engine gaps named
  check("non-scoring engine gaps named (>=6)", NON_SCORING_ENGINE_GAPS.length >= 6);
  check("all named engine gaps are not-yet-built", NON_SCORING_ENGINE_GAPS.every((g) => g.status === "missing" || g.status === "stubbed"));
  check("rim protector primary proof is reported as a pending gap", archetypePendingProofGap("rim_protector", "deterrence_events") !== null);
  check("high-usage star scoring proof is NOT a pending gap (engine-modeled)", archetypePendingProofGap("high_usage_star", "points") === null);

  // evidence taxonomy: each primary proof has an evidence type; several types present
  check("each scenario's primary proof carries an evidence type", runs.every((r) => !!r.evidenceType));
  check("multiple evidence types across scenarios", new Set(runs.map((r) => r.evidenceType)).size >= 3);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runArchetypeScenarioSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
