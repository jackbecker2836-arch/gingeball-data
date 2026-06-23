// =============================================================================
// GINGEBALL COURT HANDICAP — COURT STAT FACTORS & COMPOSITE VERDICT (Phase 11F)
//
// Two moves, both careful:
//   1. Non-scoring expectations BEND by court context (a low-total grind raises the
//      rebounding/rim-defense bar; high spacing-scarcity raises expected turnovers).
//   2. A COMPOSITE verdict candidate that lets non-scoring value speak — but only as
//      loudly as its provenance earns, and only in SHADOW (applied:false).
//
// TRUTH INSTRUMENT, NOT A HYPE MACHINE: a pending_engine rim contest whispers; an
// engine_modeled scoring beat can speak; a fixture-estimated screen assist contributes
// but never commands. Pending contribution is share-capped so proxy data cannot drive a
// headline. Composite confidence can never read HIGH while proxies are in the mix.
// =============================================================================

import {
  computeStatParVector, STAT_CATEGORY,
  type StatCategory, type StatProvenance, type StatParResult, type StatId,
} from "@/lib/stat-par/stat-par";

// ---- 1. Court-specific stat factors -----------------------------------------
export interface CourtContext {
  label: string;
  total: number;            // game total — pace / possession-volume proxy
  spacingScarcity: number;  // 0..1, high = cramped floor
  poaPressure: number;      // 0..1
  rimProtectionFaced: number; // 0..1
  synergy: number;          // 0..1
  // Phase 11G — meta inherited from the real chain (optional; lab courts may omit)
  confidence?: number;      // context confidence from the lineup engine output
  provenance?: string;      // input provenance the chain used
  sourceState?: string;     // source freshness state
}

export const COURT_FACTOR_PROVENANCE = "court_factor_synthetic";

export interface CourtFactorNote { category: StatCategory; factor: number; rationale: string }
export interface CourtFactors { factors: Partial<Record<StatCategory, number>>; notes: CourtFactorNote[]; provenance: string }

function clampFactor(x: number): number { return Math.max(0.8, Math.min(1.25, Math.round(x * 1000) / 1000)); }

export function courtStatFactors(ctx: CourtContext): CourtFactors {
  const f: Partial<Record<StatCategory, number>> = {};
  const notes: CourtFactorNote[] = [];
  const bump = (cat: StatCategory, mult: number, rationale: string) => {
    f[cat] = clampFactor((f[cat] ?? 1) * mult);
    notes.push({ category: cat, factor: f[cat]!, rationale });
  };

  if (ctx.total <= 200) {
    bump("rebounding", 1.12, "low total → more missed shots → more rebounding chances");
    bump("rim_defense", 1.12, "low-total grind raises rim-defense/deterrence value");
    bump("possession_value", 0.9, "fewer possessions in a grind");
  }
  if (ctx.total >= 225) {
    bump("possession_value", 1.15, "fast pace → more possessions → more counting-stat opportunity");
    bump("scoring", 1.06, "fast pace lifts scoring opportunity");
    bump("shooting", 1.05, "more transition / early-clock looks");
  }
  if (ctx.spacingScarcity > 0.6) {
    bump("ball_security", 1.15, "cramped floor → more turnovers expected");
    bump("scoring", 0.95, "cramped paint makes guard rim scoring harder");
  }
  if (ctx.poaPressure > 0.8) {
    bump("creation", 0.9, "heavy POA pressure makes creation harder");
    bump("ball_security", 1.1, "POA pressure raises turnover risk");
  }
  if (ctx.rimProtectionFaced > 0.8) {
    bump("scoring", 0.92, "strong rim protection suppresses rim attempts/finishing");
  }
  if (ctx.synergy > 0.5) {
    bump("creation", 1.08, "high synergy lifts assisted shot quality");
    bump("screening", 1.08, "high synergy rewards screen value");
    bump("gravity", 1.05, "gravity converts to teammate value in a connected lineup");
  }
  return { factors: f, notes, provenance: COURT_FACTOR_PROVENANCE };
}

// ---- 2. Composite verdict candidate (shadow, provenance-limited) -------------
const PROV_CAP: Record<StatProvenance, number> = {
  engine_modeled: 1.0, box_score: 1.0, synthetic_audit_fixture: 0.6,
  deterrence_engine_v1: 0.5, spacing_gravity_engine_v1: 0.5, tracking_estimate: 0.5, fixture_estimate: 0.4, pending_engine: 0.2, missing: 0,
};
const PENDING_SHARE_CAP = 0.35; // pending_engine contribution may not exceed 35% of total magnitude

export interface VerdictDriver {
  stat: StatId; category: StatCategory; contribution: number; provenance: StatProvenance; confidence: number;
}
export interface CompositeVerdict {
  archetype: string; court: string;
  scoringCandidate: number;       // engine scoring beat (per-100), the existing truth
  statVectorCandidate: number;    // raw stat-vector composite (relevance/confidence weighted)
  compositeCandidate: number;     // provenance-capped, pending-share-limited
  headlineCategory: StatCategory | null;
  proxyDriven: boolean;           // true if only pending/proxy stats drive the positive grade
  pendingShare: number;           // pending_engine share of total contribution magnitude (capped when measured signal exists)
  compositeConfidence: number;    // clamped — never HIGH while proxies are in the mix
  contextConfidence: number | null; // confidence inherited from the derived court context
  sourceState: string | null;       // source state inherited from the chain
  drivers: VerdictDriver[];
  explanation: { category: StatCategory; label: string }[];
  applied: false;                 // SHADOW — never applied to the live verdict
  mode: "shadow";
  shadowReason: string;
}

function beatLabel(v: number): string {
  if (v > 0.15) return "strong";
  if (v > 0.03) return "positive";
  if (v >= -0.03) return "neutral";
  return "negative";
}

export function buildCompositeVerdict(
  archetype: string, ctx: CourtContext,
  actuals: Partial<Record<StatId, number>>, scoringBeatPer100: number,
): CompositeVerdict {
  const cf = courtStatFactors(ctx);
  const vec = computeStatParVector(archetype, { actuals, categoryFactors: cf.factors });

  // raw provenance-capped contributions
  type C = { r: StatParResult; contrib: number };
  let contribs: C[] = vec.results
    .filter((r) => r.relevance !== "ignored")
    .map((r) => ({ r, contrib: r.valueWeight * PROV_CAP[r.provenance] * r.confidence * r.valueOverExpected }));

  // pending share cap: when MEASURED signal exists, hold pending to ≤35% of total
  // magnitude so proxy data can inform but never dominate. If pending is the ONLY
  // signal, it is not zeroed (the grade may still exist) but is forced to whisper
  // via proxyDriven + low confidence below.
  const allAbs0 = contribs.reduce((s, c) => s + Math.abs(c.contrib), 0);
  const pendingAbs0 = contribs.filter((c) => c.r.provenance === "pending_engine").reduce((s, c) => s + Math.abs(c.contrib), 0);
  const nonPendingAbs = allAbs0 - pendingAbs0;
  const target = (PENDING_SHARE_CAP / (1 - PENDING_SHARE_CAP)) * nonPendingAbs;
  if (nonPendingAbs > 0 && pendingAbs0 > target) {
    const scale = target / pendingAbs0;
    contribs = contribs.map((c) => (c.r.provenance === "pending_engine" ? { ...c, contrib: c.contrib * scale } : c));
  }
  const totalAbs = contribs.reduce((s, c) => s + Math.abs(c.contrib), 0);
  const pendingShare = totalAbs > 0 ? Math.round((contribs.filter((c) => c.r.provenance === "pending_engine").reduce((s, c) => s + Math.abs(c.contrib), 0) / totalAbs) * 1000) / 1000 : 0;

  const composite = Math.round(contribs.reduce((s, c) => s + c.contrib, 0) * 1000) / 1000;

  // drivers (top by magnitude)
  const drivers: VerdictDriver[] = [...contribs]
    .sort((a, b) => Math.abs(b.contrib) - Math.abs(a.contrib))
    .slice(0, 3)
    .map((c) => ({ stat: c.r.stat, category: c.r.category, contribution: Math.round(c.contrib * 1000) / 1000, provenance: c.r.provenance, confidence: c.r.confidence }));

  // headline: prefer a non-pending positive driver; flag proxy-driven otherwise
  const positives = contribs.filter((c) => c.contrib > 0);
  const nonPendingPos = positives.filter((c) => c.r.provenance !== "pending_engine");
  let headlineCategory: StatCategory | null = null;
  let proxyDriven = false;
  if (nonPendingPos.length) headlineCategory = nonPendingPos.sort((a, b) => b.contrib - a.contrib)[0].r.category;
  else if (positives.length) { headlineCategory = positives.sort((a, b) => b.contrib - a.contrib)[0].r.category; proxyDriven = true; }

  // confidence: provenance-weighted mean of the contributing stats, clamped (never HIGH)
  const wsum = contribs.reduce((s, c) => s + Math.abs(c.contrib), 0);
  const confMean = wsum > 0 ? contribs.reduce((s, c) => s + c.r.confidence * Math.abs(c.contrib), 0) / wsum : 0;
  let compositeConfidence = Math.round(Math.min(0.7, confMean * 0.9) * 100) / 100;
  if (proxyDriven) compositeConfidence = Math.round(Math.min(compositeConfidence, 0.3) * 100) / 100;

  // Phase 11G — a low-confidence or stale court context drags the composite's confidence down
  let ctxFactor = 1;
  if (ctx.confidence != null) ctxFactor *= Math.max(0.4, Math.min(1, ctx.confidence));
  if (ctx.sourceState === "stale_live" || ctx.sourceState === "fixture_fallback") ctxFactor *= 0.7;
  compositeConfidence = Math.round(Math.min(0.7, compositeConfidence * ctxFactor) * 100) / 100;

  // explanation by category
  const byCat = new Map<StatCategory, number>();
  for (const c of contribs) byCat.set(c.r.category, (byCat.get(c.r.category) ?? 0) + c.contrib);
  const explanation = [...byCat.entries()].map(([category, v]) => ({ category, label: beatLabel(v) }));

  return {
    archetype, court: ctx.label,
    scoringCandidate: scoringBeatPer100,
    statVectorCandidate: vec.compositeValueOverExpected,
    compositeCandidate: composite,
    headlineCategory, proxyDriven, pendingShare, compositeConfidence,
    contextConfidence: ctx.confidence ?? null, sourceState: ctx.sourceState ?? null,
    drivers, explanation,
    applied: false, mode: "shadow",
    shadowReason: "stat-vector composite is shadow-only until non-scoring provenance graduates from synthetic/proxy to engine-modeled",
  };
}

// reference courts for tests + the lab
export const COURT_GRIND: CourtContext = { label: "low-total defensive grind", total: 196, spacingScarcity: 0.7, poaPressure: 0.85, rimProtectionFaced: 0.82, synergy: 0.3 };
export const COURT_TRACK_MEET: CourtContext = { label: "fast-pace track meet", total: 236, spacingScarcity: 0.3, poaPressure: 0.5, rimProtectionFaced: 0.4, synergy: 0.55 };

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runCompositeVerdictSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  // court factors bend non-scoring expectations
  const grind = courtStatFactors(COURT_GRIND);
  check("low-total grind raises rebounding expectation", (grind.factors.rebounding ?? 1) > 1);
  check("low-total grind raises rim-defense expectation", (grind.factors.rim_defense ?? 1) > 1);
  check("low-total grind lowers possession volume", (grind.factors.possession_value ?? 1) < 1);
  const fast = courtStatFactors(COURT_TRACK_MEET);
  check("fast pace raises possession-volume expectation", (fast.factors.possession_value ?? 1) > 1);
  check("court factors are tagged synthetic", grind.provenance === COURT_FACTOR_PROVENANCE && grind.notes.every((n) => n.rationale.length > 0));

  // non-scoring expectations actually move the stat vector by court
  const rimGrind = computeStatParVector("rim_protector", { actuals: { dreb: 13 }, categoryFactors: grind.factors });
  const rimFlat = computeStatParVector("rim_protector", { actuals: { dreb: 13 } });
  check("rim protector rebounding bar is higher on the grind court", rimGrind.results.find((r) => r.stat === "dreb")!.expected > rimFlat.results.find((r) => r.stat === "dreb")!.expected);

  // archetypes react DIFFERENTLY across two courts
  const rimA = buildCompositeVerdict("rim_protector", COURT_GRIND, { deterrence_events: 16, blocks: 4, dreb: 13, rim_contests: 12 }, 0);
  const rimB = buildCompositeVerdict("rim_protector", COURT_TRACK_MEET, { deterrence_events: 16, blocks: 4, dreb: 13, rim_contests: 12 }, 0);
  check("rim protector composite differs by court", rimA.compositeCandidate !== rimB.compositeCandidate);
  const conn = buildCompositeVerdict("connector", COURT_TRACK_MEET, { assists: 10, secondary_assists: 6, turnovers: 1 }, 0);
  check("connector composite differs from rim protector composite", conn.compositeCandidate !== rimA.compositeCandidate);
  const wing = buildCompositeVerdict("spot_up_wing", COURT_GRIND, { spacing_gravity: 11, fg3m: 4 }, 0);
  const stop = buildCompositeVerdict("defensive_stopper", COURT_GRIND, { steals: 3.5, rim_contests: 9 }, 0);
  check("four archetypes produce four distinct composites", new Set([rimA.compositeCandidate, conn.compositeCandidate, wing.compositeCandidate, stop.compositeCandidate]).size === 4);

  // three candidates present
  check("scoring vs stat-vector vs composite all present", typeof rimA.scoringCandidate === "number" && typeof rimA.statVectorCandidate === "number" && typeof rimA.compositeCandidate === "number");

  // pending cannot dominate: an all-pending positive grade is proxy-driven + low confidence
  const pendingSpike = buildCompositeVerdict("rim_protector", COURT_GRIND, { deterrence_events: 40, rim_contests: 40 }, 0);
  check("a pending-only positive grade is flagged proxyDriven", pendingSpike.proxyDriven === true);
  check("a proxy-driven composite confidence is low (≤0.3)", pendingSpike.compositeConfidence <= 0.3);
  // when MEASURED signal exists, pending is share-capped and cannot steal the headline
  const mixed = buildCompositeVerdict("rim_protector", COURT_GRIND, { deterrence_events: 40, rim_contests: 40, dreb: 18, blocks: 6 }, 0);
  check("pending share is capped ≤35% when measured signal exists", mixed.pendingShare <= 0.36);
  check("a measured stat keeps the headline despite a huge pending spike", mixed.proxyDriven === false && (mixed.headlineCategory === "rebounding" || mixed.headlineCategory === "rim_defense"));

  // a non-scorer can still beat the court through owned stats (mixed provenance)
  check("rim protector beats the court without scoring (shadow)", rimA.compositeCandidate > 0 && rimA.applied === false);

  // fixture/proxy lower confidence vs an engine/synthetic-heavy grade
  const synthHeavy = buildCompositeVerdict("connector", COURT_TRACK_MEET, { assists: 11, secondary_assists: 4, turnovers: 1 }, 0);
  check("composite confidence never reads HIGH (≤0.7)", rimA.compositeConfidence <= 0.7 && conn.compositeConfidence <= 0.7 && synthHeavy.compositeConfidence <= 0.7);
  check("proxy-heavy grade is less confident than a measured-heavy grade", pendingSpike.compositeConfidence < synthHeavy.compositeConfidence);

  // explainability + shadow
  check("top drivers are explainable (stat + provenance + contribution)", rimA.drivers.length > 0 && rimA.drivers.every((d) => d.stat && d.provenance && typeof d.contribution === "number"));
  check("explanation covers categories with beat labels", rimA.explanation.length > 0 && rimA.explanation.every((e) => ["strong", "positive", "neutral", "negative"].includes(e.label)));
  check("composite is SHADOW (never applied to live verdict)", rimA.mode === "shadow" && rimA.applied === false && rimA.shadowReason.length > 0);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runCompositeVerdictSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
