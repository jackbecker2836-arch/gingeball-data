// =============================================================================
// GINGEBALL COURT HANDICAP — MULTI-STAT PAR VECTOR (Phase 11E)
//
// Points are no longer the hidden master stat. The theorem —
//   true game value = actual production − expected same-role / same-court production
// — applies to EVERY meaningful category, not just scoring. This builds an archetype-
// specific stat par vector: expected/actual/delta per stat, each confessing its source.
//
// HONESTY CONTRACT: scoring par is engine_modeled (the real market/lineup par system).
// Everything non-scoring here is SYNTHETIC, fixture-estimated, or pending — and labeled
// per stat. Proxy stats (deterrence, spacing gravity, rim gravity) carry low confidence
// and contribute less to the composite. No fake precision; no points-only model hiding
// inside a box-score table.
//
// Centerpiece: Court Handicap can say HOW a player beat the court, not just whether he
// scored above it.
// =============================================================================

export type StatCategory =
  | "scoring" | "shooting" | "creation" | "ball_security" | "rebounding"
  | "rim_defense" | "perimeter_defense" | "screening" | "spacing" | "gravity" | "possession_value";

export type StatId =
  | "points" | "fg3m" | "rim_attempts" | "fta"
  | "assists" | "secondary_assists" | "turnovers"
  | "oreb" | "dreb" | "blocks" | "steals" | "fouls"
  | "screen_assists" | "deterrence_events" | "rim_contests"
  | "spacing_gravity" | "rim_gravity";

export type Relevance = "primary" | "secondary" | "contextual" | "ignored";

export type StatProvenance =
  | "box_score" | "synthetic_audit_fixture" | "tracking_estimate"
  | "fixture_estimate" | "engine_modeled" | "deterrence_engine_v1" | "spacing_gravity_engine_v1" | "pending_engine" | "missing";

export const STAT_CATEGORY: Record<StatId, StatCategory> = {
  points: "scoring", fta: "scoring", rim_attempts: "scoring",
  fg3m: "shooting",
  assists: "creation", secondary_assists: "creation",
  turnovers: "ball_security", fouls: "ball_security",
  oreb: "rebounding", dreb: "rebounding",
  blocks: "rim_defense", deterrence_events: "rim_defense", rim_contests: "rim_defense",
  steals: "perimeter_defense",
  screen_assists: "screening",
  spacing_gravity: "spacing",
  rim_gravity: "gravity",
};

// inverse stats: fewer than expected is GOOD (value over expected flips)
const INVERSE = new Set<StatId>(["turnovers", "fouls"]);

// ---- Phase 11H: evidence-type taxonomy (started) ----------------------------
// Not all "stats" are the same KIND of evidence. Each carries different provenance,
// confidence, and proof requirements. This is the start of that distinction.
export type EvidenceType = "box_score" | "tracking" | "event" | "gravity" | "suppression" | "lineup_effect";

export const EVIDENCE_TYPE: Record<StatId, EvidenceType> = {
  points: "box_score", fg3m: "box_score", rim_attempts: "box_score", fta: "box_score",
  assists: "box_score", oreb: "box_score", dreb: "box_score", blocks: "box_score", steals: "box_score",
  secondary_assists: "tracking", screen_assists: "tracking", rim_contests: "tracking",
  turnovers: "event", fouls: "event",
  spacing_gravity: "gravity", rim_gravity: "gravity",
  deterrence_events: "suppression",
  // note: "lineup_effect" evidence (role relief, synergy, spacing relief, burden reduction)
  // is produced by the impact matrix, not the box-score-style stat vector — no stat maps to
  // it yet. Named here so the taxonomy is honest about what it does not yet measure.
};

export function evidenceMix(results: { stat: StatId; relevance: Relevance }[]): Partial<Record<EvidenceType, number>> {
  const mix: Partial<Record<EvidenceType, number>> = {};
  for (const r of results) {
    if (r.relevance === "ignored") continue;
    const t = EVIDENCE_TYPE[r.stat];
    mix[t] = (mix[t] ?? 0) + 1;
  }
  return mix;
}

const PROV_CONFIDENCE: Record<StatProvenance, number> = {
  box_score: 0.9, engine_modeled: 0.8, synthetic_audit_fixture: 0.55,
  deterrence_engine_v1: 0.5, spacing_gravity_engine_v1: 0.5, tracking_estimate: 0.45, fixture_estimate: 0.4, pending_engine: 0.2, missing: 0,
};

const RELEVANCE_WEIGHT: Record<Relevance, number> = { primary: 1, secondary: 0.5, contextual: 0.2, ignored: 0 };

function proofStatusOf(p: StatProvenance): string {
  switch (p) {
    case "engine_modeled": return "engine";
    case "deterrence_engine_v1": return "deterrence-v1";
    case "spacing_gravity_engine_v1": return "spacing-gravity-v1";
    case "box_score": return "box-score";
    case "synthetic_audit_fixture": return "synthetic";
    case "fixture_estimate": return "estimate";
    case "tracking_estimate": return "tracking-estimate";
    case "pending_engine": return "pending";
    default: return "missing";
  }
}

export interface StatProfileEntry { stat: StatId; relevance: Relevance; baseline: number; provenance: StatProvenance }
export interface ArchetypeStatProfile { archetype: string; entries: StatProfileEntry[] }

// Synthetic same-role baselines (per-100-ish). Scoring carries engine_modeled provenance
// (the real par system); non-scoring is synthetic / fixture / pending and labeled as such.
export const ARCHETYPE_STAT_PROFILES: ArchetypeStatProfile[] = [
  { archetype: "scoring_guard", entries: [
    { stat: "points", relevance: "primary", baseline: 36.8, provenance: "engine_modeled" },
    { stat: "rim_attempts", relevance: "primary", baseline: 10, provenance: "synthetic_audit_fixture" },
    { stat: "fta", relevance: "primary", baseline: 7, provenance: "synthetic_audit_fixture" },
    { stat: "fg3m", relevance: "secondary", baseline: 2.5, provenance: "synthetic_audit_fixture" },
    { stat: "assists", relevance: "secondary", baseline: 6, provenance: "synthetic_audit_fixture" },
    { stat: "turnovers", relevance: "contextual", baseline: 3, provenance: "synthetic_audit_fixture" },
  ] },
  { archetype: "rim_protector", entries: [
    { stat: "deterrence_events", relevance: "primary", baseline: 12, provenance: "pending_engine" },
    { stat: "blocks", relevance: "primary", baseline: 3, provenance: "synthetic_audit_fixture" },
    { stat: "dreb", relevance: "primary", baseline: 11, provenance: "synthetic_audit_fixture" },
    { stat: "rim_contests", relevance: "primary", baseline: 9, provenance: "pending_engine" },
    { stat: "screen_assists", relevance: "secondary", baseline: 4, provenance: "fixture_estimate" },
    { stat: "oreb", relevance: "secondary", baseline: 4, provenance: "synthetic_audit_fixture" },
    { stat: "fouls", relevance: "contextual", baseline: 4, provenance: "synthetic_audit_fixture" },
  ] },
  { archetype: "connector", entries: [
    { stat: "assists", relevance: "primary", baseline: 7, provenance: "synthetic_audit_fixture" },
    { stat: "secondary_assists", relevance: "primary", baseline: 4, provenance: "fixture_estimate" },
    { stat: "turnovers", relevance: "primary", baseline: 2, provenance: "synthetic_audit_fixture" },
    { stat: "spacing_gravity", relevance: "secondary", baseline: 6, provenance: "pending_engine" },
    { stat: "dreb", relevance: "secondary", baseline: 6, provenance: "synthetic_audit_fixture" },
    { stat: "points", relevance: "contextual", baseline: 10, provenance: "engine_modeled" },
  ] },
  { archetype: "spot_up_wing", entries: [
    { stat: "spacing_gravity", relevance: "primary", baseline: 8, provenance: "pending_engine" },
    { stat: "fg3m", relevance: "primary", baseline: 3, provenance: "synthetic_audit_fixture" },
    { stat: "steals", relevance: "secondary", baseline: 1.5, provenance: "synthetic_audit_fixture" },
    { stat: "points", relevance: "contextual", baseline: 11, provenance: "engine_modeled" },
  ] },
  { archetype: "screen_assist_big", entries: [
    { stat: "screen_assists", relevance: "primary", baseline: 7, provenance: "fixture_estimate" },
    { stat: "rim_gravity", relevance: "primary", baseline: 8, provenance: "pending_engine" },
    { stat: "oreb", relevance: "secondary", baseline: 4, provenance: "synthetic_audit_fixture" },
    { stat: "dreb", relevance: "secondary", baseline: 7, provenance: "synthetic_audit_fixture" },
    { stat: "points", relevance: "contextual", baseline: 9, provenance: "engine_modeled" },
  ] },
  { archetype: "defensive_stopper", entries: [
    { stat: "steals", relevance: "primary", baseline: 2, provenance: "synthetic_audit_fixture" },
    { stat: "rim_contests", relevance: "primary", baseline: 6, provenance: "pending_engine" },
    { stat: "fouls", relevance: "secondary", baseline: 3, provenance: "synthetic_audit_fixture" },
    { stat: "dreb", relevance: "secondary", baseline: 5, provenance: "synthetic_audit_fixture" },
    { stat: "points", relevance: "contextual", baseline: 9, provenance: "engine_modeled" },
  ] },
  { archetype: "roll_big", entries: [
    { stat: "rim_attempts", relevance: "primary", baseline: 9, provenance: "synthetic_audit_fixture" },
    { stat: "rim_gravity", relevance: "primary", baseline: 7, provenance: "pending_engine" },
    { stat: "screen_assists", relevance: "primary", baseline: 6, provenance: "fixture_estimate" },
    { stat: "oreb", relevance: "secondary", baseline: 4, provenance: "synthetic_audit_fixture" },
    { stat: "points", relevance: "contextual", baseline: 14, provenance: "engine_modeled" },
  ] },
  { archetype: "high_usage_star", entries: [
    { stat: "points", relevance: "primary", baseline: 30, provenance: "engine_modeled" },
    { stat: "assists", relevance: "primary", baseline: 7, provenance: "synthetic_audit_fixture" },
    { stat: "fta", relevance: "primary", baseline: 8, provenance: "synthetic_audit_fixture" },
    { stat: "fg3m", relevance: "secondary", baseline: 3, provenance: "synthetic_audit_fixture" },
    { stat: "turnovers", relevance: "contextual", baseline: 4, provenance: "synthetic_audit_fixture" },
  ] },
  { archetype: "secondary_creator", entries: [
    { stat: "assists", relevance: "primary", baseline: 6, provenance: "synthetic_audit_fixture" },
    { stat: "fta", relevance: "primary", baseline: 5, provenance: "synthetic_audit_fixture" },
    { stat: "points", relevance: "secondary", baseline: 14, provenance: "engine_modeled" },
    { stat: "fg3m", relevance: "secondary", baseline: 2, provenance: "synthetic_audit_fixture" },
    { stat: "turnovers", relevance: "contextual", baseline: 2.5, provenance: "synthetic_audit_fixture" },
  ] },
  { archetype: "low_usage_specialist", entries: [
    { stat: "spacing_gravity", relevance: "primary", baseline: 6, provenance: "pending_engine" },
    { stat: "fg3m", relevance: "secondary", baseline: 2, provenance: "synthetic_audit_fixture" },
    { stat: "dreb", relevance: "secondary", baseline: 4, provenance: "synthetic_audit_fixture" },
    { stat: "points", relevance: "contextual", baseline: 7, provenance: "engine_modeled" },
  ] },
];

export function getStatProfile(archetype: string): ArchetypeStatProfile | undefined {
  return ARCHETYPE_STAT_PROFILES.find((p) => p.archetype === archetype);
}

export interface StatParResult {
  stat: StatId; category: StatCategory; relevance: Relevance; valueWeight: number;
  expected: number; actual: number; delta: number; valueOverExpected: number;
  confidence: number; provenance: StatProvenance; proofStatus: string; inverse: boolean;
}

export interface StatParVector {
  archetype: string;
  results: StatParResult[];
  compositeValueOverExpected: number;  // provenance- and relevance-weighted
  headlineCategory: StatCategory | null;
  pointsDelta: number | null;          // null if points isn't in this archetype's vector
  beatTheCourt: boolean;
}

export interface StatParOptions {
  actuals?: Partial<Record<StatId, number>>;  // synthetic observed; defaults to baseline (meets par)
  courtFactor?: number;                        // synthetic court adjustment for non-scoring stats
  categoryFactors?: Partial<Record<StatCategory, number>>; // per-category court factors (Phase 11F)
  pointsParPer100?: number;                    // engine-modeled scoring par override (real, when supplied)
  statOverrides?: Partial<Record<StatId, { expected?: number; actual?: number; provenance?: StatProvenance; confidence?: number }>>; // Phase 11I: an engine upgrades a stat's value/provenance
}

export function computeStatParVector(archetype: string, opts: StatParOptions = {}): StatParVector {
  const profile = getStatProfile(archetype);
  if (!profile) throw new Error(`stat-par: no profile for "${archetype}"`);
  const factor = opts.courtFactor ?? 1;
  const actuals = opts.actuals ?? {};

  const results: StatParResult[] = profile.entries.map((e) => {
    const cat = STAT_CATEGORY[e.stat];
    const isScoring = cat === "scoring";
    const catFactor = opts.categoryFactors?.[cat] ?? (isScoring ? 1 : factor);
    const ov = opts.statOverrides?.[e.stat];
    const provenance: StatProvenance = ov?.provenance ?? e.provenance;
    let expected = e.stat === "points" && opts.pointsParPer100 != null ? opts.pointsParPer100 : e.baseline * catFactor;
    if (ov?.expected != null) expected = ov.expected;
    expected = Math.round(expected * 10) / 10;
    const actual = Math.round(((ov?.actual ?? actuals[e.stat] ?? expected)) * 10) / 10;
    const inverse = INVERSE.has(e.stat);
    const delta = Math.round((actual - expected) * 10) / 10;
    const raw = inverse ? expected - actual : actual - expected;
    const voe = Math.round((raw / Math.max(expected, 1)) * 1000) / 1000;
    const confidence = ov?.confidence ?? PROV_CONFIDENCE[provenance];
    return {
      stat: e.stat, category: cat, relevance: e.relevance, valueWeight: RELEVANCE_WEIGHT[e.relevance],
      expected, actual, delta, valueOverExpected: voe,
      confidence, provenance, proofStatus: proofStatusOf(provenance), inverse,
    };
  });

  // composite: weight each stat's value-over-expected by relevance AND provenance confidence,
  // so proxy/pending stats move the grade less than measured ones.
  let composite = 0;
  let best: { cat: StatCategory; contrib: number } | null = null;
  for (const r of results) {
    if (r.relevance === "ignored") continue;
    const contrib = r.valueWeight * r.confidence * r.valueOverExpected;
    composite += contrib;
    if (contrib > 0 && (!best || contrib > best.contrib)) best = { cat: r.category, contrib };
  }
  composite = Math.round(composite * 1000) / 1000;
  const pts = results.find((r) => r.stat === "points");
  return {
    archetype, results,
    compositeValueOverExpected: composite,
    headlineCategory: best ? best.cat : null,
    pointsDelta: pts ? pts.delta : null,
    beatTheCourt: composite > 0.02,
  };
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runStatParSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  check("several archetypes have distinct stat profiles", ARCHETYPE_STAT_PROFILES.length >= 8);
  check("every stat maps to a category", ARCHETYPE_STAT_PROFILES.every((p) => p.entries.every((e) => STAT_CATEGORY[e.stat] !== undefined)));

  // distinct vectors: rim protector's primary stats differ from the scoring guard's
  const guard = computeStatParVector("scoring_guard");
  const rim = computeStatParVector("rim_protector");
  const guardPrimary = new Set(guard.results.filter((r) => r.relevance === "primary").map((r) => r.stat));
  const rimPrimary = new Set(rim.results.filter((r) => r.relevance === "primary").map((r) => r.stat));
  check("different archetypes get different stat par vectors", [...rimPrimary].every((s) => !guardPrimary.has(s)));

  // every result carries expected/actual/delta/confidence/provenance
  check("each stat carries expected/actual/delta", guard.results.every((r) => [r.expected, r.actual, r.delta].every((v) => typeof v === "number")));
  check("each stat confesses confidence + provenance", guard.results.every((r) => r.confidence >= 0 && r.provenance.length > 0));

  // NON-SCORING value: a rim protector beats the court WITHOUT scoring
  const rimBeats = computeStatParVector("rim_protector", { actuals: { deterrence_events: 16, blocks: 4, dreb: 13, rim_contests: 12 } });
  check("rim protector beats par with NO scoring stat (deterrence/blocks/rebounds)", rimBeats.beatTheCourt && rimBeats.pointsDelta === null && rimBeats.headlineCategory === "rim_defense");

  // a connector beats par with points exactly at par (points delta 0)
  const connBeats = computeStatParVector("connector", { actuals: { assists: 10, secondary_assists: 6, turnovers: 1 } });
  check("connector beats par without points (points delta = 0)", connBeats.beatTheCourt && connBeats.pointsDelta === 0);

  // spot-up wing via spacing + shooting; screen big via screening + gravity; stopper via defense
  const wing = computeStatParVector("spot_up_wing", { actuals: { spacing_gravity: 11, fg3m: 4 } });
  check("spot-up wing beats par via spacing/shooting", wing.beatTheCourt && (wing.headlineCategory === "spacing" || wing.headlineCategory === "shooting"));
  const screen = computeStatParVector("screen_assist_big", { actuals: { screen_assists: 10, rim_gravity: 11 } });
  check("screen big beats par via screening/gravity", screen.beatTheCourt && (screen.headlineCategory === "screening" || screen.headlineCategory === "gravity"));
  const stopper = computeStatParVector("defensive_stopper", { actuals: { steals: 3.5, rim_contests: 9 } });
  check("defensive stopper beats par via defense", stopper.beatTheCourt && (stopper.headlineCategory === "perimeter_defense" || stopper.headlineCategory === "rim_defense"));

  // inverse stats: fewer turnovers than expected is positive value
  const tov = connBeats.results.find((r) => r.stat === "turnovers")!;
  check("turnovers are inverse (fewer than expected = positive value)", tov.inverse && tov.actual < tov.expected && tov.valueOverExpected > 0);

  // points is NOT the master stat: a non-scorer composite > 0 with no positive points delta
  check("points is not the hidden master stat", rimBeats.beatTheCourt && (rimBeats.pointsDelta === null || rimBeats.pointsDelta <= 0));

  // provenance honesty: scoring is engine_modeled; proxies are pending/estimate and lower-confidence
  check("scoring par is engine_modeled", guard.results.find((r) => r.stat === "points")!.provenance === "engine_modeled");
  const proxy = rim.results.find((r) => r.stat === "deterrence_events")!;
  check("deterrence is pending_engine (proxy, labeled, low confidence)", proxy.provenance === "pending_engine" && proxy.confidence <= 0.25 && proxy.proofStatus === "pending");
  check("proxy stats contribute less than measured ones (confidence-weighted)", PROV_CONFIDENCE.pending_engine < PROV_CONFIDENCE.engine_modeled);
  check("provenance variety present (engine + synthetic + pending)", new Set(ARCHETYPE_STAT_PROFILES.flatMap((p) => p.entries.map((e) => e.provenance))).size >= 4);

  // Phase 11I — an engine can upgrade a placeholder stat's provenance via statOverrides
  const rimDefault = computeStatParVector("rim_protector");
  const pendingBefore = rimDefault.results.filter((r) => r.provenance === "pending_engine").length;
  const rimUpgraded = computeStatParVector("rim_protector", { statOverrides: { deterrence_events: { expected: 12, actual: 16, provenance: "deterrence_engine_v1", confidence: 0.5 }, rim_contests: { expected: 9, actual: 12, provenance: "deterrence_engine_v1", confidence: 0.5 } } });
  const pendingAfter = rimUpgraded.results.filter((r) => r.provenance === "pending_engine").length;
  check("statOverrides upgrade deterrence stats beyond pending_engine", rimUpgraded.results.some((r) => r.provenance === "deterrence_engine_v1") && pendingAfter < pendingBefore);
  check("upgraded deterrence carries engine value (actual != expected default)", rimUpgraded.results.find((r) => r.stat === "deterrence_events")!.delta !== 0);

  // Phase 11J — spacing gravity upgrade for spot_up_wing
  const wingDefault = computeStatParVector("spot_up_wing");
  const wingPendingBefore = wingDefault.results.filter((r) => r.provenance === "pending_engine").length;
  const wingUpgraded = computeStatParVector("spot_up_wing", { statOverrides: { spacing_gravity: { expected: 8, actual: 11, provenance: "spacing_gravity_engine_v1", confidence: 0.5 } } });
  const wingPendingAfter = wingUpgraded.results.filter((r) => r.provenance === "pending_engine").length;
  check("statOverrides upgrade spacing_gravity beyond pending_engine", wingUpgraded.results.some((r) => r.provenance === "spacing_gravity_engine_v1") && wingPendingAfter < wingPendingBefore);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runStatParSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
