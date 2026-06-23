// =============================================================================
// COURT HANDICAP — MANIFEST SOURCE (Phase 4B: live-capable source seam)
//
// The ONE place market data enters the product. Two modes, one downstream shape:
//
//   buildManifestView(override?)        sync, fixture only  (self-checks + what-if)
//   buildManifestViewAsync({live?})     async, live -> fixture fallback
//   rebuildWithMarket(view, override)   sync what-if scrub from the loaded basis
//
// Whatever the source, components receive the same CourtHandicapView. Market math
// stays engine-owned; the live provider's shape never leaves the adapter. When a
// live call is missing, stale, or fails, provenance SAYS SO and we fall back to
// the fixture rather than fake it.
// =============================================================================

import { StubOddsFeed } from "@/adapters/stub-odds-feed";
import { LiveOddsFeed, type LiveOddsConfig } from "@/adapters/live-odds-feed";
import { type OddsTransport, makeMockTransport, makeTestLiveTransport } from "@/adapters/odds-transport";
import { getLastKnownGood, putLastKnownGood, clearLastKnownGood } from "@/adapters/odds-cache";
import { computeMarketCourt, computeMarketPar, lineMovement } from "@/lib/market-court-engine";
import { computeLineupCourt, type LineupContextInput } from "@/lib/lineup-court-engine";
import { computeArchetypeCourt, type ArchetypeContextInput } from "@/lib/archetype-court-engine";
import {
  buildCourtHandicapView, resolveSelectedLineupGraph,
  type BuildInput, type CourtHandicapView, type CourtPlayerInput, type Mood, type MarketProvenance, type SourceState,
} from "@/lib/manifest-view-model";
import type { MarketSnapshot } from "@/lib/odds-ingestion";
import { fakePlayers, fakeSynergies, fakePlayerCourtConditions, type FakePlayer } from "@/fixtures/fake-game";
import { scoringGuardSignals, rimProtectorSignals, syntheticLineupContext, SYNTHETIC_PROVENANCE, studiedPossessionEvents, rimProtectorParChain, rimProtectorScoringSignals, rimProtectorPossessions, rimProtectorParPoss } from "@/fixtures/synthetic-game";
import { computePossessionProof } from "@/lib/possession-proof-engine";
import { consolidateVerdictConfidence } from "@/lib/verdict-confidence-engine";
import { parPer100, playerCourtBeatPer100 } from "@/lib/formula-registry";
import { computeLineupGraph, roleFromArchetype, type GraphNode, type GraphEdge, type EdgeType } from "@/lib/lineup-graph-engine";
import { shrinkBeatWithPolicy } from "@/lib/shrinkage-engine";
import { computePlayerPrior } from "@/lib/hierarchical-prior-engine";
import { decideGraphTrust } from "@/lib/lineup-graph-trust-policy";
import { computeGraphConfidenceCandidate, type GraphConfidenceCandidate } from "@/lib/graph-confidence-coupling";
import { computeCourtSlope } from "@/lib/court-slope-engine";
import type { PlayerGrade, VerdictView } from "@/lib/manifest-view-model";
import type { PossessionEvent } from "@/lib/possession-proof-engine";
import type { Confidence, InputProvenance } from "@/lib/types";

// Phase 8B — a catalog grade profile: overrides for the STUDIED guard's grade so
// the render-state catalog can summon true end-to-end LOW (thin sample) and HIGH
// (clean, labeled-audit inputs) views through the REAL engines. Absent -> the
// canonical synthetic grade, byte-stable.
export interface GradeProfile {
  studiedEvents?: PossessionEvent[];       // thin sample -> LOW
  lineupStatusConfidence?: Confidence;     // projected/late lineup -> lower
  gradeProvenance?: InputProvenance;       // "fixture"/"live" -> a clean HIGH (audit)
  cleanSignals?: boolean;                  // tighten missing[] for a clean state
  availabilityNote?: string;               // injured starter context (named, not hidden)
}

const FIXTURE_GAME_ID = "game-fixture-001";
const STUDIED_ID = "x1";
const STALE_MINUTES = 120; // tunable: pregame lines older than this read as stale

// ---- fixture -> player inputs (presentation join, unchanged from 4A) ---------
function moodFromLabel(label: string): Mood {
  if (label === "trap") return "trap";
  if (label === "dream" || label === "relief" || label === "open") return "relief";
  return "neutral";
}
function toPlayerInput(p: FakePlayer): CourtPlayerInput {
  return {
    id: p.id, code: p.id.toUpperCase(), team: p.team, name: p.name, archetype: p.archetype,
    label: String(p.label), mood: moodFromLabel(String(p.label)),
    fit: p.fit, difficulty: p.difficulty, slope: p.slope, confidence: p.confidence, pos: p.pos,
  };
}
function fixtureBuildInput(marketCourt: ReturnType<typeof computeMarketCourt>, movement: ReturnType<typeof lineMovement>, profile?: GradeProfile): BuildInput {
  const studied = fakePlayers.find((p) => p.id === STUDIED_ID)!;
  const c = studied.conditions!;
  const marketLine = fakePlayerCourtConditions.find((q) => q.playerId === STUDIED_ID)?.line ?? 24.5;
  const marketPar = computeMarketPar({ normalBaseline: c.normalPar!, marketLine }).marketPar;

  // Phase 9C — explicit game-context tag from the NUMERIC total (no prose parsing).
  // A low implied total is the grind that nudges scoring beats down.
  const courtContextTags = marketCourt.total <= 210 ? ["low_scoring_grind"] : [];

  // Phase 8B catalog overrides (all default to the canonical synthetic grade):
  const gp: InputProvenance = profile?.gradeProvenance ?? SYNTHETIC_PROVENANCE;
  const lsc: Confidence = profile?.lineupStatusConfidence ?? syntheticLineupContext.lineupStatusConfidence;
  const studiedEvents = profile?.studiedEvents ?? studiedPossessionEvents;
  const clean = profile?.cleanSignals ?? false;
  const miss = (arr: string[]) => clean ? [] : arr;
  const avail = profile?.availabilityNote ? [profile.availabilityNote] : [];

  // Lineup context signals, derived from the scouting fixture (fixture-origin,
  // named as such in provenance). Sources, for the audit trail:
  //   spacing  <- x1-x4 "spacing hazard (non-shooter)" synergy
  //   poa      <- opponent y1 "Elite POA Stopper"
  //   rim      <- opponent y4 "Paint-Wall Rim Protector"
  //   burden   <- x1 role "Primary on-ball creator", 36 mins
  //   synergy  <- x1-x5 "creator-roll synergy"
  // Lineup context signals come from the synthetic lab (fixtures/synthetic-game.ts),
  // the unified guard signal vector shared with the archetype engine.
  const lineupContext: LineupContextInput = {
    marketPar, archetypeClass: "scorer",
    spacingSignal: scoringGuardSignals.spacing, poaSignal: scoringGuardSignals.oppPoaPressure,
    rimSignal: scoringGuardSignals.oppRimProtection, burdenSignal: scoringGuardSignals.creationBurden,
    synergySignal: scoringGuardSignals.synergyRelief,
    lineupStatusConfidence: lsc, inputProvenance: gp,
    missing: [...miss(["real on/off splits", "tracking-based spacing", "injury/availability modifiers"]), ...avail],
  };
  const lineup = computeLineupCourt(lineupContext);

  // Archetype translation (Phase 5A). Two inputs are engine-backed (expected
  // possessions from the market engine; market + lineup suppression %); the
  // scouting reads are fixture-derived honest intensities of this matchup:
  //   spacing high (a non-shooter cramps a pull-up guard), opp POA very high
  //   (y1 elite stopper), opp rim high (y4 rim wall), heavy creation burden,
  //   modest roll relief.
  const archetypeContext: ArchetypeContextInput = {
    archetype: "scoring_guard",
    normalPar: c.normalPar!, marketPar, lineupPar: lineup.lineupPar,
    expectedPossessions: marketCourt.expectedPossessions,
    marketSuppressionPct: computeMarketPar({ normalBaseline: c.normalPar!, marketLine }).suppression,
    lineupSuppressionPct: lineup.lineupSuppressionPct,
    spacing: scoringGuardSignals.spacing, oppPoaPressure: scoringGuardSignals.oppPoaPressure,
    oppRimProtection: scoringGuardSignals.oppRimProtection, creationBurden: scoringGuardSignals.creationBurden,
    synergyRelief: scoringGuardSignals.synergyRelief,
    marketConfidence: marketCourt.confidence, lineupStatusConfidence: lsc,
    inputProvenance: gp,
    missing: [...miss(["real matchup tracking", "usage-vs-defense splits", "shot-quality model"]), ...avail],
  };
  const archetype = computeArchetypeCourt(archetypeContext);

  // Phase 5B — the SAME game, read through the rim protector (opponent big y4).
  // Signals come from the synthetic lab; the features that trap the guard (heavy
  // rim attack, a low-total grind) are his opportunity.
  const big = fakePlayers.find((p) => p.id === "y4");
  const rimProtectorRead = computeArchetypeCourt({
    archetype: "rim_protector", expectedPossessions: marketCourt.expectedPossessions,
    oppRimAttackVolume: rimProtectorSignals.oppRimAttackVolume, reboundingEnv: rimProtectorSignals.reboundingEnv,
    rollGravity: rimProtectorSignals.rollGravity, lowTotalGrind: rimProtectorSignals.lowTotalGrind,
    touchVolume: rimProtectorSignals.touchVolume, paintCongestion: rimProtectorSignals.paintCongestion,
    oppRimProtection: rimProtectorSignals.oppRimProtection,
    marketConfidence: marketCourt.confidence, lineupStatusConfidence: syntheticLineupContext.lineupStatusConfidence,
    inputProvenance: SYNTHETIC_PROVENANCE,
    missing: ["real matchup tracking", "rebounding/contact tracking", "rim-protector par model"],
  });

  const archetypeByPlayer: NonNullable<BuildInput["archetypeByPlayer"]> = {
    [STUDIED_ID]: { difficulty: archetype.difficulty, fit: archetype.fit, mood: "trap", modeled: archetype.modeled, slopeDirection: archetype.slopeDirection },
  };
  if (big) archetypeByPlayer[big.id] = { difficulty: rimProtectorRead.difficulty, fit: rimProtectorRead.fit, mood: "relief", modeled: rimProtectorRead.modeled, slopeDirection: rimProtectorRead.slopeDirection };

  // Phase 6 — possessions become evidence. Expected per-100 is the engine-backed
  // lineup-court par (so value-over-expected reconciles to beat-vs-lineup); the
  // possession events are synthetic_fixture from the lab.
  const lineupParPer100 = parPer100({ propLine: lineup.lineupPar, expectedOnCourtPoss: c.expPoss! });
  const proof = computePossessionProof({
    studiedPlayerId: STUDIED_ID, events: studiedEvents, expectedPer100: lineupParPer100,
    marketConfidence: marketCourt.confidence, inputProvenance: gp,
    missing: [...miss(["live play-by-play ingestion", "non-scoring possession value model", "shot-quality / tracking inputs"]), ...avail],
  });

  // Phase 5C — the rim protector's FULL grade: his own (points) par chain, his
  // distinct roll-big lineup adjustment, his possession proof (scoring valued,
  // non-scoring tracked), verdict, and consolidated confidence. A SECOND player
  // carried end-to-end without pretending he is a scoring guard.
  const secondGrade: PlayerGrade | undefined = big ? (() => {
    const mPar = computeMarketPar({ normalBaseline: rimProtectorParChain.normalPar, marketLine: rimProtectorParChain.marketLine });
    const lp = computeLineupCourt({
      marketPar: mPar.marketPar, archetypeClass: "roll_big",
      spacingSignal: 0, poaSignal: 0, rimSignal: 0, burdenSignal: 0, synergySignal: 0,
      oppRimProtectionSignal: rimProtectorScoringSignals.oppRimProtection, paceScarcitySignal: rimProtectorScoringSignals.paceScarcity,
      creationSupportSignal: rimProtectorScoringSignals.creationSupport, rollGravitySignal: rimProtectorScoringSignals.rollGravity,
      lineupStatusConfidence: syntheticLineupContext.lineupStatusConfidence, inputProvenance: SYNTHETIC_PROVENANCE,
      missing: ["live on/off splits"],
    });
    const lpp = parPer100({ propLine: lp.lineupPar, expectedOnCourtPoss: rimProtectorParPoss });
    const mpp = parPer100({ propLine: mPar.marketPar, expectedOnCourtPoss: rimProtectorParPoss });
    const pf = computePossessionProof({
      studiedPlayerId: big.id, events: rimProtectorPossessions, expectedPer100: lpp,
      marketConfidence: marketCourt.confidence, inputProvenance: SYNTHETIC_PROVENANCE,
      missing: ["live play-by-play", "second-chance / deterrence value model"],
    });
    const beatLineup = pf.valueOverExpectedPer100;
    const beatMarket = playerCourtBeatPer100({ actualPer100: pf.actualPer100, parPer100: mpp });
    const consolidated = consolidateVerdictConfidence({ layers: [
      { layer: "market", confidence: marketCourt.confidence, provenance: "fixture", missingCount: 0 },
      { layer: "lineup", confidence: lp.confidence, provenance: lp.inputProvenance, missingCount: lp.missing.length },
      { layer: "archetype", confidence: rimProtectorRead.confidence, provenance: rimProtectorRead.inputProvenance, missingCount: rimProtectorRead.missing.length },
      { layer: "proof", confidence: pf.confidence, provenance: pf.inputProvenance, missingCount: pf.missing.length },
    ] });
    const verdict: VerdictView = {
      word: beatLineup > 0.05 ? "BEAT THE COURT" : beatLineup < -0.05 ? "TRAPPED BY THE COURT" : "MET THE COURT",
      beatLineupPer100: beatLineup, beatMarketPer100: beatMarket,
      actualPer100: pf.actualPer100, lineupParPer100: lpp, marketParPer100: mpp,
      confidence: consolidated.finalConfidence, consolidated,
      evidenceAdjusted: shrinkBeatWithPolicy({
        observed: beatLineup, finalConfidence: consolidated.finalConfidence, proofConfidence: pf.confidence,
        prior: computePlayerPrior({ archetype: "rim_protector", contextTags: courtContextTags, inputProvenance: SYNTHETIC_PROVENANCE }),
        claimType: "beat_vs_court",
      }),
      proof: {
        actualPoints: pf.actualPoints, usedPossessions: pf.usedPossessions,
        topFamilies: pf.families.filter((f) => f.points > 0).slice(0, 4).map((f) => ({ family: f.family, points: f.points, per100: f.per100 })),
        resiliencePer100: pf.pressure.resiliencePer100, hostilePossessions: pf.pressure.hostilePossessions,
        beatHostileCourt: pf.beatHostileCourt, confidence: pf.confidence,
        inputProvenance: pf.inputProvenance, missing: pf.missing,
      },
    };
    return {
      playerId: big.id, name: "Paint-Wall Rim Protector", archetype: "rim_protector",
      normalPar: rimProtectorParChain.normalPar, marketPar: mPar.marketPar, lineupPar: lp.lineupPar,
      verdict,
      slope: computeCourtSlope({
        normalPar: rimProtectorParChain.normalPar, marketPar: mPar.marketPar, lineupPar: lp.lineupPar,
        archetypeDifficulty: rimProtectorRead.difficulty,
        marketConfidence: marketCourt.confidence, lineupConfidence: lp.confidence, archetypeConfidence: rimProtectorRead.confidence,
      }),
      nonScoringProof: pf.nonScoringProof,
    };
  })() : undefined;

  // Phase 9A/9D — lineup graphs (beside the lineup engine; do NOT move par).
  // Built for BOTH teams so the graph can speak for the selected player's side.
  const X_LINEUP = ["x1", "x2", "x3", "x4", "x5"];
  const Y_LINEUP = ["y1", "y2", "y3", "y4", "y5"];
  const nodesFor = (ids: string[]): GraphNode[] => fakePlayers
    .filter((p) => ids.includes(p.id))
    .map((p) => { const r = roleFromArchetype(p.archCode); return { id: p.id, label: p.name, role: r.role, shoots: r.shoots }; });
  const edgeType = (syn: { type: string; label: string }): EdgeType => {
    const l = syn.label.toLowerCase();
    if (l.includes("creator") || l.includes("roll")) return "creator_roll";
    if (syn.type === "hazard") return "spacing_hazard";
    if (l.includes("spacing") || l.includes("shooting")) return "shooting_gravity";
    if (syn.type === "defense") return "defensive";
    return "generic";
  };
  const edgesWithin = (ids: string[]): GraphEdge[] => fakeSynergies
    .filter((y) => ids.includes(y.a) && ids.includes(y.b))
    .map((y) => ({ a: y.a, b: y.b, type: edgeType(y) }));
  const lineupGraph = computeLineupGraph({ nodes: nodesFor(X_LINEUP), edges: edgesWithin(X_LINEUP), inputProvenance: SYNTHETIC_PROVENANCE, team: "x", teamId: "team-x" });
  const lineupGraphY = computeLineupGraph({ nodes: nodesFor(Y_LINEUP), edges: edgesWithin(Y_LINEUP), inputProvenance: SYNTHETIC_PROVENANCE, team: "y", teamId: "team-y" });

  // Phase 9B — the studied guard's hierarchical prior (shrink toward scoring-guard, not 0).
  const guardPrior = computePlayerPrior({ archetype: "scoring_guard", contextTags: courtContextTags, inputProvenance: SYNTHETIC_PROVENANCE });

  // Phase 9F — SHADOW graph->confidence coupling. Compute a graph-aware lineup
  // confidence CANDIDATE per team, alongside the live one. Never applied: this is
  // an audition. The Y candidate's lineup confidence comes from the big's graded
  // lineup layer; X from the guard's lineup engine read.
  const yLineupConfidence = secondGrade?.verdict.consolidated.layerBreakdown.find((l) => l.layer === "lineup")?.confidence ?? lineup.confidence;
  const graphConfidenceShadow: { x?: GraphConfidenceCandidate; y?: GraphConfidenceCandidate } = {
    x: computeGraphConfidenceCandidate({ currentLineupConfidence: lineup.confidence, trust: decideGraphTrust(lineupGraph), teamLabel: "X lineup" }),
    y: secondGrade ? computeGraphConfidenceCandidate({ currentLineupConfidence: yLineupConfidence, trust: decideGraphTrust(lineupGraphY), teamLabel: "Y lineup" }) : undefined,
  };

  return {
    marketCourt, movement,
    players: fakePlayers.map(toPlayerInput),
    synergies: fakeSynergies.map(({ a, b, type }) => ({ a, b, type })),
    studiedPlayerId: STUDIED_ID,
    normalBaseline: c.normalPar!, marketLine,
    studied: { normalPar: c.normalPar!, actual: c.actual!, expPoss: c.expPoss!, actPoss: c.actPoss! },
    lineup, archetype, archetypeByPlayer, proof, secondGrade, lineupGraph, lineupGraphY, guardPrior, graphConfidenceShadow,
  };
}

// ---- freshness + provenance --------------------------------------------------
function freshness(capturedTs?: string, asOf?: string): { ageMinutes?: number; stale?: boolean } {
  if (!capturedTs || !asOf) return {};
  const ageMinutes = Math.max(0, Math.round((Date.parse(asOf) - Date.parse(capturedTs)) / 60000));
  return { ageMinutes, stale: ageMinutes > STALE_MINUTES };
}

// Phase 4D — market confidence responds to SOURCE QUALITY. Live raises trust only
// when fresh + complete; stale / last-known-good / surprise fallback lower it. The
// deliberate canonical fixture and a fresh live read are the 1.0 baseline (so the
// canonical guard's 0.60 stays byte-stable); degraded states are penalized.
function sourceQualityFactor(state: SourceState): number {
  switch (state) {
    case "live": case "fixture": case "mock": case "synthetic_audit": return 1.0;
    case "fixture_fallback": return 0.85;  // unplanned fallback — worse signal than the deliberate baseline
    case "stale_live": return 0.7;
    case "last_known_good": return 0.6;
  }
}

const HUMAN_SOURCE: Record<SourceState, MarketProvenance["source"]> = {
  live: "live", stale_live: "live", last_known_good: "fixture (live fallback)",
  fixture_fallback: "fixture (live fallback)", fixture: "fixture", mock: "fixture", synthetic_audit: "fixture",
};

function provFromSnapshot(
  state: SourceState, feedSource: string, snap: MarketSnapshot, asOf: string, note?: string,
): MarketProvenance {
  const missing: string[] = [];
  if (snap.homeMoneyline == null || snap.awayMoneyline == null) missing.push("moneylines -> win probability");
  return {
    source: HUMAN_SOURCE[state], sourceState: state, sourceQuality: sourceQualityFactor(state),
    feedSource, phase: snap.phase, capturedTs: snap.capturedTs, asOf,
    bookCount: snap.bookCount, bookAgreement: snap.bookAgreement, missing, note,
    ...freshness(snap.capturedTs, asOf),
  };
}

// ---- Phase 4D live-edge resolver --------------------------------------------
// Orchestrates: transport -> map (quarantined) -> freshness/completeness ->
// cache write on fresh success -> on failure serve last-known-good -> else the
// fixture. Returns the resolved market PLUS an honest source state. The "live"
// state can ONLY be produced by a real (isLive) transport returning fresh data —
// so a mock or a fallback can never masquerade as live.
interface ResolvedMarket { base: MarketSnapshot; series: MarketSnapshot[]; prov: MarketProvenance }

async function resolveLiveMarket(transport: OddsTransport, gameId: string, asOf: string): Promise<ResolvedMarket> {
  try {
    const feed = new LiveOddsFeed({ provider: transport.source, gameIds: [gameId], transport: (id) => transport.fetchGame(id) });
    const series = await feed.getSeries(gameId);
    const base = await feed.getLatest(gameId);
    const fresh = freshness(base.capturedTs, asOf);

    if (transport.isLive && !fresh.stale) {
      // a real, fresh, complete read -> the only path that earns "live"
      putLastKnownGood(gameId, { series, latest: base, capturedTs: base.capturedTs, storedAt: asOf, source: transport.source });
      return { base, series: series.snapshots, prov: provFromSnapshot("live", transport.source, base, asOf) };
    }
    if (transport.isLive && fresh.stale) {
      // real provider, but the line is old — say STALE, never pretend it is fresh
      return { base, series: series.snapshots, prov: provFromSnapshot("stale_live", transport.source, base, asOf, `line older than ${STALE_MINUTES}m`) };
    }
    // transport succeeded but is NOT a live provider (mock) -> SYNTHETIC, never live
    return { base, series: series.snapshots, prov: provFromSnapshot("mock", transport.source, base, asOf, "mock transport (isLive=false) — synthetic line, not live") };
  } catch (e) {
    const reason = e instanceof Error ? e.message : "unknown error";
    // provider failed -> prefer the last good live snapshot we actually saw
    const lkg = getLastKnownGood(gameId);
    if (lkg) {
      return { base: lkg.latest, series: lkg.series.snapshots, prov: provFromSnapshot("last_known_good", lkg.source, lkg.latest, asOf, `provider failed (${reason}); serving last-known-good from ${lkg.capturedTs}`) };
    }
    // no cache -> the fixture, clearly labeled as an unplanned fallback
    const fx = new StubOddsFeed();
    const base = fx.getLatest(FIXTURE_GAME_ID);
    const series = fx.getSeries(FIXTURE_GAME_ID).snapshots;
    return { base, series, prov: provFromSnapshot("fixture_fallback", fx.source, base, asOf, `provider failed (${reason}); no cache — fixture fallback`) };
  }
}

// ---- the shared assembler — every mode lands here ----------------------------
// basis = the real loaded snapshot; override = an optional what-if line. The
// engine recomputes the market layer; the basis travels in the view so a later
// scrub branches from the real source, not from a previous what-if.
function assemble(basis: MarketSnapshot, series: MarketSnapshot[], prov: MarketProvenance, override?: { spread?: number; total?: number }, profile?: GradeProfile): CourtHandicapView {
  const effective = override ? { ...basis, homeSpread: override.spread ?? basis.homeSpread, total: override.total ?? basis.total } : basis;
  const hypothetical = !!override && (effective.homeSpread !== basis.homeSpread || effective.total !== basis.total);

  const marketCourtRaw = computeMarketCourt(effective);
  const q = prov.sourceQuality ?? 1;
  const marketCourt = q === 1 ? marketCourtRaw
    : { ...marketCourtRaw, confidence: Number((marketCourtRaw.confidence * q).toFixed(2)) };
  const movement = lineMovement({ gameId: basis.gameId, homeTeamId: basis.homeTeamId, awayTeamId: basis.awayTeamId, snapshots: series });
  const prov2: MarketProvenance = hypothetical ? { ...prov, hypothetical: true, note: "hypothetical line (what-if scrub)" } : { ...prov, hypothetical: false };

  const view = buildCourtHandicapView(fixtureBuildInput(marketCourt, movement, profile), prov2.feedSource, prov2);
  view.basis = { snapshot: basis, series };
  return view;
}

// ---- public API --------------------------------------------------------------

/** Sync, fixture-only. Used by self-checks and as the deterministic baseline. */
export function buildManifestView(marketOverride?: { spread?: number; total?: number }): CourtHandicapView {
  const feed = new StubOddsFeed();
  const series = feed.getSeries(FIXTURE_GAME_ID);
  const base = feed.getLatest(FIXTURE_GAME_ID);
  const prov = provFromSnapshot("fixture", feed.source, base, base.capturedTs);
  return assemble(base, series.snapshots, prov, marketOverride);
}

/** Async, live-capable. With a live config it tries the provider and falls back
 *  to the fixture on any failure — naming the fallback in provenance. */
export async function buildManifestViewAsync(opts?: {
  transport?: OddsTransport; live?: LiveOddsConfig;
  gameId?: string; marketOverride?: { spread?: number; total?: number }; asOf?: string;
}): Promise<CourtHandicapView> {
  const asOf = opts?.asOf ?? new Date().toISOString();
  const gameId = opts?.gameId ?? opts?.live?.gameIds?.[0] ?? FIXTURE_GAME_ID;

  // Phase 4D — preferred path: a transport resolved through the live edge
  // (cache / last-known-good / stale / fallback), every state labeled honestly.
  if (opts?.transport) {
    const r = await resolveLiveMarket(opts.transport, gameId, asOf);
    return assemble(r.base, r.series, r.prov, opts.marketOverride);
  }

  // 4B back-compat: a LiveOddsConfig (function transport) -> resolve the same way.
  if (opts?.live) {
    const cfg = opts.live;
    const shim: OddsTransport = { isLive: true, source: cfg.provider, fetchGame: (id) => cfg.transport(id) };
    const r = await resolveLiveMarket(shim, gameId, asOf);
    return assemble(r.base, r.series, r.prov, opts.marketOverride);
  }

  // No source configured -> deliberate fixture baseline.
  const feed = new StubOddsFeed();
  const series = feed.getSeries(FIXTURE_GAME_ID);
  const base = feed.getLatest(FIXTURE_GAME_ID);
  const prov = provFromSnapshot("fixture", feed.source, base, asOf);
  return assemble(base, series.snapshots, prov, opts?.marketOverride);
}

/** Sync what-if line scrub from a loaded view's basis (works for any source). */
export function rebuildWithMarket(view: CourtHandicapView, override: { spread?: number; total?: number }): CourtHandicapView {
  if (!view.basis) return view;
  const prov = view.provenance.market ?? provFromSnapshot("fixture", view.generatedFrom.feedSource ?? "stub", view.basis.snapshot, view.basis.snapshot.capturedTs);
  return assemble(view.basis.snapshot, view.basis.series, prov, override);
}

/** Phase 8B — build a named render-state catalog view: choose a source state (via
 *  transport) and/or a grade profile (thin sample, clean inputs, projected lineup,
 *  injury note). Real engines, real assembly — used by the UI render-state catalog. */
export async function buildCatalogView(opts: {
  transport?: OddsTransport; asOf?: string; gameId?: string;
  override?: { spread?: number; total?: number }; profile?: GradeProfile;
}): Promise<CourtHandicapView> {
  const asOf = opts.asOf ?? "2026-01-16T00:00:00Z";
  const gameId = opts.gameId ?? FIXTURE_GAME_ID;
  if (opts.transport) {
    const r = await resolveLiveMarket(opts.transport, gameId, asOf);
    return assemble(r.base, r.series, r.prov, opts.override, opts.profile);
  }
  const feed = new StubOddsFeed();
  const base = feed.getLatest(FIXTURE_GAME_ID);
  const series = feed.getSeries(FIXTURE_GAME_ID).snapshots;
  const prov = provFromSnapshot("fixture", feed.source, base, asOf);
  return assemble(base, series, prov, opts.override, opts.profile);
}

// =============================================================================
// SELF-CHECKS — fixture parity, live path, fallback, freshness, what-if.
// Run: npx tsx lib/manifest-source.ts
// =============================================================================
import type { RawProviderSeries } from "@/adapters/live-odds-feed";

function sampleLiveSeries(withMoneylines: boolean): RawProviderSeries {
  const book = (spread: number, total: number, mlH?: number, mlA?: number, ts?: string) => ({
    key: "pinnacle", last_update: ts,
    markets: [
      { key: "spreads", outcomes: [{ name: "Team X", point: spread }, { name: "Team Y", point: -spread }] },
      { key: "totals", outcomes: [{ name: "Over", point: total }, { name: "Under", point: total }] },
      ...(withMoneylines && mlH != null ? [{ key: "h2h", outcomes: [{ name: "Team X", price: mlH }, { name: "Team Y", price: mlA }] }] : []),
    ],
  });
  return {
    open: { id: "game-live-001", commence_time: "2026-01-15T14:00:00Z", home_team: "Team X", away_team: "Team Y", bookmakers: [book(-3, 200, -150, 130, "2026-01-15T14:00:00Z")] },
    close: { id: "game-live-001", commence_time: "2026-01-15T23:30:00Z", home_team: "Team X", away_team: "Team Y", bookmakers: [book(-4, 202, -180, 150, "2026-01-15T23:30:00Z")] },
  };
}
function liveConfig(withMoneylines = true, throws = false): LiveOddsConfig {
  return {
    provider: "the-odds-api", gameIds: ["game-live-001"],
    transport: async () => { if (throws) throw new Error("HTTP 503"); return sampleLiveSeries(withMoneylines); },
  };
}

export async function runSourceSelfChecks(): Promise<{ passed: number; failed: number; details: string[] }> {
  const details: string[] = []; let passed = 0, failed = 0;
  const approx = (a: number, b: number, t = 0.05) => Math.abs(a - b) <= t;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  const fx = buildManifestView();
  check("fixture mode -> implied 103/99", fx.marketHub.implied.home === 103 && fx.marketHub.implied.away === 99);
  check("fixture mode -> provenance source 'fixture'", fx.provenance.market?.source === "fixture");
  check("fixture mode -> basis carried for what-if", !!fx.basis);
  check("lineup engine -> lineupPar 23.1 (computed, not stamped)", fx.conditions.lineupPar === 23.1);
  check("lineup engine -> beat-vs-lineup engine-backed (+8.6)", approx(fx.verdict.beatLineupPer100, 8.6, 0.05));
  check("lineup engine -> provenance names synthetic inputs", fx.provenance.lineup?.inputProvenance === "synthetic_fixture");
  check("lineup engine -> lineupPar no longer pendingEngine", !fx.provenance.pendingEngine.some((p) => p.includes("lineupPar")));
  check("archetype engine -> fit/difficulty/slope engine-backed (28/75/High)", fx.conditions.fit === 28 && fx.conditions.difficulty === 75 && fx.conditions.slope === "High");
  check("archetype engine -> studied node carries engine difficulty (warp magnitude)", fx.courtGraph.players.find((p) => p.id === "x1")?.difficulty === 75);
  check("archetype engine -> provenance modeled + capped confidence", fx.provenance.archetype?.modeled === true && (fx.provenance.archetype?.confidence ?? 1) < 0.7);
  check("synthetic provenance -> lineup + archetype inputs labeled synthetic_fixture", fx.provenance.lineup?.inputProvenance === "synthetic_fixture" && fx.provenance.archetype?.inputProvenance === "synthetic_fixture");
  check("provenance honesty -> market source ('fixture' feed) distinct from synthetic model inputs", fx.provenance.market?.source === "fixture" && fx.provenance.lineup?.inputProvenance === "synthetic_fixture");
  check("market layer stable -> still 103/99 after 3 engines", fx.marketHub.implied.home === 103 && fx.marketHub.implied.away === 99);
  const guardNode = fx.courtGraph.players.find((p) => p.id === "x1");
  const bigNode = fx.courtGraph.players.find((p) => p.id === "y4");
  check("5B inversion -> guard node trap (diff 75)", guardNode?.difficulty === 75 && guardNode?.mood === "trap");
  check("5B inversion -> rim protector node relief (diff ~43)", !!bigNode && Math.abs((bigNode.difficulty ?? 0) - 43) <= 2 && bigNode.mood === "relief");
  check("5B inversion -> SAME court, big easier than guard", (bigNode?.difficulty ?? 99) < (guardNode?.difficulty ?? 0) && (bigNode?.fit ?? 0) > (guardNode?.fit ?? 99));
  check("5B inversion -> opposite slope directions", guardNode?.slopeDirection === "harder" && bigNode?.slopeDirection === "easier");

  // Phase 6 — possessions as evidence
  check("proof -> actual rebuilt from possessions = fixture scalar (29)", fx.verdict.proof.actualPoints === 29 && fx.verdict.proof.usedPossessions === 67);
  check("proof -> verdict actual per-100 reconciles (43.3)", Math.abs(fx.verdict.actualPer100 - 43.3) <= 0.1);
  check("RECONCILE -> beat-vs-lineup rebuilt from possessions (+8.6)", Math.abs(fx.verdict.beatLineupPer100 - 8.6) <= 0.1);
  check("RECONCILE -> beat-vs-market still +6.5", Math.abs(fx.verdict.beatMarketPer100 - 6.5) <= 0.1);
  check("KEY TEST -> hostile court still BEAT THE COURT", fx.verdict.word === "BEAT THE COURT" && fx.verdict.proof.beatHostileCourt === true);
  check("proof -> produced value under pressure", fx.verdict.proof.resiliencePer100 > 0 && fx.verdict.proof.hostilePossessions > 0);
  check("proof -> action-family breakdown present", fx.verdict.proof.topFamilies.length > 0 && fx.verdict.proof.topFamilies[0].points > 0);
  check("proof -> CourtGraph trail encodes possessions", fx.courtGraph.proofTrail.length === 67 && fx.courtGraph.proofTrail.some((e) => e.beatsCourt));
  check("proof -> inputs labeled synthetic_fixture", fx.provenance.proof?.inputProvenance === "synthetic_fixture");
  check("proof -> confidence sample-aware + capped (<0.85)", (fx.provenance.proof?.confidence ?? 1) < 0.85 && (fx.provenance.proof?.confidence ?? 0) > 0);
  check("proof -> non-scoring value named pending (not faked)", fx.provenance.pendingEngine.some((s) => s.includes("non-scoring possession value")));

  // Phase 6B — verdict confidence consolidation
  const vc = fx.verdict.consolidated;
  check("6B -> verdict confidence = consolidated final (no scalar masquerade)", fx.verdict.confidence === vc.finalConfidence);
  check("6B -> final <= weakest + 0.12 (weakest-link ceiling)", fx.verdict.confidence <= vc.weakestLayer.confidence + 0.12 + 1e-9);
  check("6B -> final <= geometric mean (no inflation)", vc.finalConfidence <= vc.geometricMean + 1e-9);
  check("6B -> four layers consolidated", vc.layerBreakdown.length === 4);
  check("6B -> synthetic chain -> MEDIUM/LOW · PROVISIONAL", vc.provisional === true && vc.reliabilityLabel.includes("PROVISIONAL"));
  check("6B -> strong verdict can keep humble confidence", fx.verdict.word === "BEAT THE COURT" && fx.verdict.confidence < 0.7);
  check("6B -> caps explain the number", vc.caps.length > 0 && vc.caps.some((c) => c.includes("weakest")));

  // Phase 5C — the rim protector is fully graded (second player, distinct chain)
  const g2 = fx.secondGrade;
  check("5C -> rim protector has a full grade", !!g2 && g2.archetype === "rim_protector");
  check("5C -> his own par chain (points, lower than the guard)", g2!.normalPar === 12.5 && g2!.marketPar === 11.5 && g2!.lineupPar > 10.5 && g2!.lineupPar < 11.5);
  check("5C -> his verdict is engine-backed (BEAT, modest scoring beat)", g2!.verdict.word === "BEAT THE COURT" && g2!.verdict.beatLineupPer100 > 0 && g2!.verdict.beatLineupPer100 < 8);
  check("5C -> consolidated confidence (MEDIUM/LOW · PROVISIONAL)", g2!.verdict.consolidated.provisional === true && g2!.verdict.confidence > 0 && g2!.verdict.confidence < 0.75);
  check("5C -> DISTINCT scoring families (roll/putback, not pullup)", g2!.verdict.proof.topFamilies.some((f) => f.family === "roll_finish") && !g2!.verdict.proof.topFamilies.some((f) => f.family === "pullup"));
  check("5C -> non-scoring value TRACKED not valued (rebounds/blocks/deterrence/screens)", g2!.nonScoringProof.length === 4 && (g2!.nonScoringProof.find((p) => p.type === "rebound")?.count ?? 0) > 0);
  check("5C -> not a renamed guard chain (his beat != guard's +8.6)", Math.abs(g2!.verdict.beatLineupPer100 - fx.verdict.beatLineupPer100) > 1);
  check("5C -> guard remains byte-stable (+8.6 / 0.60)", Math.abs(fx.verdict.beatLineupPer100 - 8.6) <= 0.05 && fx.verdict.confidence === 0.6);
  check("5C -> 5B inversion still holds (guard trap, big relief node)", guardNode?.difficulty === 75 && (bigNode?.difficulty ?? 99) < 50);

  // Phase 9A — advanced math foundations (additive; headline byte-stable)
  const ea = fx.verdict.evidenceAdjusted;
  check("9A shrinkage -> evidence-adjusted beat present", !!ea && ea.observed === 8.6);
  check("9A shrinkage -> shrunk = conf × observed (≈5.2), held back", !!ea && Math.abs(ea.shrunk - 5.2) <= 0.1 && ea.shrinkageAmount > 0);
  check("9A shrinkage -> headline observed beat UNCHANGED (byte-stable)", fx.verdict.beatLineupPer100 === 8.6);
  const cs = fx.courtSlope;
  check("9A slope -> v2 present with magnitude + breakdown + confidence", !!cs && cs.slopeMagnitude > 0 && !!cs.slopeSourceBreakdown && cs.slopeConfidence > 0);
  check("9A slope -> guard MODERATE · harder · market-led", !!cs && cs.slopeLabel.startsWith("MODERATE") && cs.slopeLabel.includes("market-led") && cs.slopeDirection === "harder");
  check("9A slope -> archetype overlay is a SEPARATE axis (harder for guard)", !!cs && cs.slopeSourceBreakdown.archetypeOverlay > 0 && cs.archetypeFeel === "harder");
  check("9A slope INVERSION -> big par-slide harder but archetype feel EASIER", !!fx.secondGrade?.slope && fx.secondGrade.slope.archetypeFeel === "easier" && fx.secondGrade.slope.slopeSourceBreakdown.archetypeOverlay < 0);
  const lg = fx.lineupGraph;
  check("9A graph -> lineup graph present (5 nodes)", !!lg && lg.nodes.length === 5);
  check("9A graph -> creator-roll + shooting gravity are key synergies", !!lg && lg.keySynergies.some((s) => s.type === "creator_roll") && lg.keySynergies.some((s) => s.type === "shooting_gravity"));
  check("9A graph -> fragility flags single-creator + cramped spacing", !!lg && lg.fragilityScore >= 0.4 && lg.clusterWarnings.length >= 2);
  check("9A graph -> does NOT move par (lineupPar still 23.1)", fx.conditions.lineupPar === 23.1);
  check("9A graph -> confidence capped (synthetic edges, <0.7)", !!lg && lg.graphConfidence < 0.7);

  // Phase 9D — dual-lineup graph & selection-correct context
  const fxFinalConf = fx.verdict.confidence;
  const gX = fx.lineupGraphs?.x;
  const gY = fx.lineupGraphs?.y;
  check("9D -> both team graphs present (X and Y)", !!gX && !!gY);
  check("9D -> X graph speaks for team x; Y for team y", gX?.team === "x" && gY?.team === "y");
  check("9D -> X is offense-led (partial), Y is defense-led (thin)", gX?.coverage.level === "partial" && gX?.coverage.offensiveEdges! > 0 && gY?.coverage.level === "thin" && gY?.coverage.defensiveEdges === 1);
  check("9D -> Y thinness is labeled (offense not modeled + sparse)", !!gY && gY.limitations.some((l) => l.includes("offensive structure not modeled")) && gY.limitations.some((l) => l.includes("sparse")));
  check("9D -> both graphs synthetic provenance + non-binding", gX?.inputProvenance === SYNTHETIC_PROVENANCE && gY?.inputProvenance === SYNTHETIC_PROVENANCE && gX!.limitations.some((l) => l.includes("non-binding")) && gY!.limitations.some((l) => l.includes("non-binding")));
  // selection-correct resolution
  const rGuard = resolveSelectedLineupGraph(fx, "x1");
  const rBig = resolveSelectedLineupGraph(fx, "y4");
  check("9D -> guard (x1) resolves to the X graph", rGuard.team === "x" && rGuard.covered && rGuard.selected?.team === "x");
  check("9D -> rim protector (y4) resolves to the Y graph (NOT the guard's)", rBig.team === "y" && rBig.covered && rBig.selected?.team === "y");
  check("9D -> opponent graph is the other team", rGuard.opponent?.team === "y" && rBig.opponent?.team === "x");
  check("9D -> warnings are team-specific (different node sets)", JSON.stringify(rGuard.selected?.nodes.map((n) => n.id)) !== JSON.stringify(rBig.selected?.nodes.map((n) => n.id)));
  // NON-BINDING: Y graph changed nothing in the earned chain
  check("9D -> non-binding: lineupPar still 23.1 with Y graph present", fx.conditions.lineupPar === 23.1);
  check("9D -> non-binding: final confidence unchanged (0.60), beats stable", fxFinalConf === 0.6 && fx.verdict.beatLineupPer100 === 8.6 && (fx.secondGrade?.verdict.beatLineupPer100 ?? 0) === 4.0);

  // Phase 9E — graph trust policy + explicit team identity
  const tGuard = resolveSelectedLineupGraph(fx, "x1");
  const tBig = resolveSelectedLineupGraph(fx, "y4");
  check("9E -> team resolved EXPLICITLY from player.team (not id prefix)", tGuard.teamSource === "explicit" && tBig.teamSource === "explicit");
  check("9E -> X (partial, offense-led) SHOWS fragility with caution", tGuard.trust.showFragilityScore === true && tGuard.trust.displayMode === "partial_graph" && tGuard.trust.recommendation.includes("caution"));
  check("9E -> Y (thin, defense-led) WITHHOLDS the fragility scalar", tBig.trust.showFragilityScore === false && tBig.trust.displayMode === "thin_graph" && tBig.trust.withheldMetrics.includes("fragilityScore"));
  check("9E -> a thin graph does NOT sound like a full graph (centerpiece)", tGuard.trust.showFragilityScore === true && tBig.trust.showFragilityScore === false);
  check("9E -> Y trust reason names the sparsity", tBig.trust.graphTrustReason.includes("edge") && tBig.trust.graphTrustReason.includes("nodes"));
  check("9E -> withheld metrics are named, not silently dropped", tBig.trust.withheldMetrics.length > 0);
  check("9E -> graphs carry explicit teamId", fx.lineupGraphs?.x?.teamId === "team-x" && fx.lineupGraphs?.y?.teamId === "team-y");
  check("9E -> trust is DISPLAY-only: par/confidence/beats still byte-stable", fx.conditions.lineupPar === 23.1 && fx.verdict.confidence === 0.6 && fx.verdict.beatLineupPer100 === 8.6);

  // Phase 9F — SHADOW graph->confidence coupling (audition, never applied)
  const shGuard = resolveSelectedLineupGraph(fx, "x1").shadowConfidence;
  const shBig = resolveSelectedLineupGraph(fx, "y4").shadowConfidence;
  check("9F -> both teams produce a shadow candidate", !!shGuard && !!shBig);
  check("9F -> guard (X partial) -> small caution candidate (-0.03)", shGuard?.confidenceDelta === -0.03 && shGuard?.direction === "caution");
  check("9F -> rim protector (Y thin) -> stronger caution candidate (-0.10)", shBig?.confidenceDelta === -0.10 && Math.abs(shBig!.confidenceDelta) > Math.abs(shGuard!.confidenceDelta));
  check("9F -> candidate differs from current (audition produces a real number)", shBig?.graphAwareLineupConfidenceCandidate !== shBig?.currentLineupConfidence);
  check("9F -> ALWAYS shadow + applied false (never live)", shGuard?.couplingMode === "shadow" && shGuard?.applied === false && shBig?.applied === false);
  check("9F -> caution reflects the GRAPH, not player/par (reason honest)", (shBig?.reason ?? "").includes("not player performance") && (shBig?.reason ?? "").includes("not par"));
  check("9F -> shadow does NOT touch lineupPar / final confidence / observed beats", fx.conditions.lineupPar === 23.1 && fx.verdict.confidence === 0.6 && fx.verdict.beatLineupPer100 === 8.6 && (fx.secondGrade?.verdict.beatLineupPer100 ?? 0) === 4.0);
  check("9F -> shipped lineup-layer confidence unchanged by the shadow candidate", (fx.verdict.consolidated.layerBreakdown.find((l) => l.layer === "lineup")?.confidence ?? 0) === shGuard?.currentLineupConfidence);

  // Phase 9B — hierarchical priors + evidence-weighted shrinkage (both players)
  const gea = fx.verdict.evidenceAdjusted;
  const bea = fx.secondGrade?.verdict.evidenceAdjusted;
  check("9B -> guard shrinks toward a NAMED prior (not just 0)", !!gea && (gea.priorSource ?? "").length > 0 && !(gea.priorSource ?? "").includes("null"));
  check("9B -> guard prior is POSITIVE (scoring-guard)", !!gea && (gea.prior ?? 0) > 0);
  check("9B -> big shrinks toward a NEGATIVE prior (rim protector)", !!bea && (bea.prior ?? 0) < 0);
  check("9B -> the two players' priors differ in sign (not identical)", !!gea && !!bea && Math.sign(gea.prior) !== Math.sign(bea.prior));
  check("9B -> evidence-weighted comparison present (v1 vs v2 + recommendation)", !!gea?.comparison && gea.comparison.recommendation.length > 10);
  check("9B -> observed beats UNCHANGED (byte-stable)", gea?.observed === 8.6 && bea?.observed === 4.0);
  check("9B -> shipped shrunk still uses final confidence (v1 == shrunk)", !!gea?.comparison && gea.comparison.v1Final === gea.shrunk);
  check("9B -> prior 0 remains the fallback path (engine supports it)", !!gea && gea.shrunk !== gea.observed);

  // Phase 9C — the policy selects the weight per claim context
  check("9C -> canonical guard selects FINAL weight (full sample)", gea?.policy?.selectedWeightSource === "final confidence");
  check("9C -> canonical guard selected == v1 candidate", !!gea?.policy && !!gea.comparison && gea.shrunk === gea.comparison.v1Final);
  check("9C -> big grade carries a policy decision too", !!bea?.policy && bea.policy.policyVersion.length > 0);
  check("9C -> observed beats still byte-stable after policy", gea?.observed === 8.6 && bea?.observed === 4.0);
  check("9C -> context tag derived from numeric total (low_scoring_grind active)", (gea?.prior ?? 0) > 0); // grind context keeps guard prior net-positive but present

  // =============================================================================
  // Phase 4D — LIVE EDGE HARDENING. Each source state is exercised in isolation
  // (cache cleared between cases) and asserted to label itself honestly.
  // =============================================================================
  const A = "2026-01-16T00:00:00Z"; // "now" for these cases

  // LIVE — only a real (isLive) transport, fresh + complete, earns "live".
  clearLastKnownGood();
  const liveV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ capturedTs: "2026-01-15T23:30:00Z" }), gameId: "game-live-001", asOf: A });
  check("4D live -> state 'live' (real, fresh, complete)", liveV.provenance.market?.sourceState === "live");
  check("4D live -> fresh (~30m, not stale)", (liveV.provenance.market?.ageMinutes ?? -1) <= 35 && liveV.provenance.market?.stale === false);
  check("4D live -> full source quality (1.0)", liveV.provenance.market?.sourceQuality === 1);
  check("4D live -> normalized parity (103/99)", liveV.marketHub.implied.home === 103 && liveV.marketHub.implied.away === 99);
  check("4D live -> movement steamed (-3 -> -4)", liveV.marketHub.movement.steamed === true);

  // MOCK — deployed default (isLive=false) renders, but is SYNTHETIC, never live.
  clearLastKnownGood();
  const mockV = await buildManifestViewAsync({ transport: makeMockTransport({ capturedTs: A }), gameId: "game-live-001", asOf: A });
  check("4D mock -> state 'mock' (synthetic), NEVER 'live'", mockV.provenance.market?.sourceState === "mock" && mockV.provenance.market?.source !== "live");
  check("4D mock -> honesty note names it not-live", !!mockV.provenance.market?.note?.includes("not live"));

  // STALE — real provider, old line. Says STALE; never pretends to be fresh.
  clearLastKnownGood();
  const staleV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ capturedTs: "2026-01-15T20:00:00Z" }), gameId: "game-live-001", asOf: A });
  check("4D stale -> state 'stale_live' (>2h old)", staleV.provenance.market?.sourceState === "stale_live" && staleV.provenance.market?.stale === true);
  check("4D stale -> reduced source quality (<1)", (staleV.provenance.market?.sourceQuality ?? 1) < 1);
  check("4D stale -> market confidence drops vs fresh", staleV.marketHub.confidence < liveV.marketHub.confidence);

  // MISSING MONEYLINE — named, never invented.
  clearLastKnownGood();
  const noMlV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ capturedTs: "2026-01-15T23:30:00Z", withMoneylines: false }), gameId: "game-live-001", asOf: A });
  check("4D missing moneyline -> winProb undefined (not invented)", noMlV.marketHub.winProbability === undefined);
  check("4D missing moneyline -> named in provenance.missing", !!noMlV.provenance.market?.missing.some((m) => m.includes("moneyline")));

  // MISSING TOTAL — cannot form a court -> fall back, labeled (not faked).
  clearLastKnownGood();
  const noTotV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ withTotal: false }), gameId: "game-live-001", asOf: A });
  check("4D missing total -> falls back, NEVER labeled live", noTotV.provenance.market?.sourceState !== "live");

  // PROVIDER ERROR + CACHE -> last-known-good, labeled, NOT live.
  clearLastKnownGood();
  await buildManifestViewAsync({ transport: makeTestLiveTransport({ capturedTs: "2026-01-15T23:30:00Z" }), gameId: "game-live-001", asOf: A }); // seed cache
  const lkgV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ fail: "error" }), gameId: "game-live-001", asOf: A });
  check("4D provider error + cache -> 'last_known_good'", lkgV.provenance.market?.sourceState === "last_known_good");
  check("4D last-known-good -> NOT live", lkgV.provenance.market?.sourceState !== "live" && lkgV.provenance.market?.source !== "live");
  check("4D last-known-good -> note explains the failure", !!lkgV.provenance.market?.note?.includes("last-known-good"));
  check("4D last-known-good -> reduced quality (0.6)", lkgV.provenance.market?.sourceQuality === 0.6);
  check("4D last-known-good -> serves the cached live line (103/99)", lkgV.marketHub.implied.home === 103);

  // PROVIDER ERROR, NO CACHE -> fixture fallback, labeled, NOT live.
  clearLastKnownGood();
  const fbV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ fail: "error" }), gameId: "game-live-001", asOf: A });
  check("4D provider error, no cache -> 'fixture_fallback'", fbV.provenance.market?.sourceState === "fixture_fallback");
  check("4D fixture fallback -> NOT live", fbV.provenance.market?.sourceState !== "live" && fbV.provenance.market?.source !== "live");
  check("4D fixture fallback -> fixture math still holds (103/99)", fbV.marketHub.implied.home === 103);

  // RATE LIMIT -> handled safely (no throw escapes), and not live.
  clearLastKnownGood();
  const rlV = await buildManifestViewAsync({ transport: makeTestLiveTransport({ fail: "ratelimit" }), gameId: "game-live-001", asOf: A });
  check("4D rate limit -> handled safely, not live", rlV.provenance.market?.sourceState !== "live" && !!rlV.marketHub);

  // *** THE CENTERPIECE: fallback never masquerades as live ***
  // A "fallback" is any state NOT produced by a genuine fresh live read: mock,
  // last-known-good, fixture fallback, rate-limited, missing-field. Stale-live is
  // not a fallback — it is real live data, but it must carry stale=true and never
  // present as fresh.
  const trueFallbacks = [mockV, noTotV, lkgV, fbV, rlV];
  check("4D *** FALLBACK NEVER MASQUERADES AS LIVE ***", trueFallbacks.every((v) => v.provenance.market?.sourceState !== "live" && v.provenance.market?.source !== "live"));
  check("4D *** stale-live is flagged stale, never presented as fresh ***", staleV.provenance.market?.sourceState === "stale_live" && staleV.provenance.market?.stale === true);

  // 4B back-compat: a LiveOddsConfig still resolves through the live edge.
  clearLastKnownGood();
  const compat = await buildManifestViewAsync({ live: liveConfig(), asOf: A });
  check("4D -> 4B live config back-compat still yields 'live'", compat.provenance.market?.sourceState === "live");

  // canonical sync path is UNTOUCHED by 4D.
  check("4D -> canonical guard still 0.60 (sync fixture byte-stable)", fx.verdict.confidence === 0.6);
  check("4D -> canonical fixture is state 'fixture', quality 1.0", fx.provenance.market?.sourceState === "fixture" && fx.provenance.market?.sourceQuality === 1);

  const whatif = rebuildWithMarket(fx, { total: 210 });
  check("what-if -> total applied (210)", whatif.marketHub.total === 210);
  check("what-if -> flagged hypothetical", whatif.provenance.market?.hypothetical === true);
  check("what-if -> basis snapshot unchanged (202)", whatif.basis?.snapshot.total === 202);
  check("what-if -> conditions invariant (marketPar 24.5)", whatif.conditions.marketPar === 24.5);
  check("what-if -> implied rose with total", whatif.marketHub.implied.home + whatif.marketHub.implied.away > 202);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  runSourceSelfChecks().then((r) => {
    // eslint-disable-next-line no-console
    console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
    if (r.failed > 0) process.exit(1);
  });
}
