// =============================================================================
// GINGEBALL COURT HANDICAP — MANIFEST VIEW-MODEL (Phase 3.5)
//
// One coherent shape the four objects render from, so a component never again
// reads a scattered hardcoded constant. This is the seam where the Market Court
// engine (Phase 3) meets the visual layer (the Manifest).
//
// HONESTY RULE (the reason `provenance` exists): some numbers are computed by an
// engine today (market, lineup, and archetype layers) and the engines that back
// the lineup and archetype layers still run on fixture-derived context inputs.
// The view-model marks engine-backed vs the fixture-input caveat per layer, so
// the interface can look alive without pretending the inputs are live.
//
// This module imports only ./market-court-engine, ./formula-registry, ./types,
// ./odds-ingestion — never fixtures or adapters. Dependencies point one way.
//
// Run `npx tsx lib/manifest-view-model.ts` for the self-checks.
// =============================================================================

import { computeMarketCourt, computeMarketPar, lineMovement,
  type MarketCourtRead, type LineMovement, MARKET_ENGINE_VERSION } from "./market-court-engine";
import { parPer100, playerCourtBeatPer100 } from "./formula-registry";
import type { LineupCourtRead } from "./lineup-court-engine";
import { computeLineupCourt } from "./lineup-court-engine";
import type { ArchetypeCourtRead, ArchetypeFactor, SlopeDirection } from "./archetype-court-engine";
import { computeArchetypeCourt } from "./archetype-court-engine";
import type { PossessionProofRead, ProofEventView, FamilyProof } from "./possession-proof-engine";
import { computePossessionProof } from "./possession-proof-engine";
import type { VerdictConfidenceRead } from "./verdict-confidence-engine";
import { consolidateVerdictConfidence } from "./verdict-confidence-engine";
import { shrinkBeat, shrinkBeatWithPolicy, type ShrinkageRead } from "./shrinkage-engine";
import type { PriorRead } from "./hierarchical-prior-engine";
import { decideGraphTrust, type GraphTrustDecision } from "./lineup-graph-trust-policy";
import type { GraphConfidenceCandidate } from "./graph-confidence-coupling";
import { computeCourtSlope, type CourtSlopeRead } from "./court-slope-engine";
import type { LineupGraphRead } from "./lineup-graph-engine";
import { studiedPossessionEvents } from "@/fixtures/synthetic-game";
import type { MarketSnapshot } from "./odds-ingestion";
import type { UUID, Confidence, InputProvenance } from "./types";

const round = (x: number, d = 1) => Number(x.toFixed(d));

// ---- inputs the join needs (presentation-agnostic where it can be) ----------
export type Mood = "trap" | "relief" | "neutral";

export interface CourtPlayerInput {
  id: UUID; code: string; team: "X" | "Y"; name: string; archetype: string;
  label: string; mood: Mood;
  fit: number; difficulty: number; slope?: string; confidence: Confidence; // fixture per-player magnitude; studied player overridden with archetype engine
  pos: { x: number; y: number };
}
export interface StudiedConditionsInput {
  normalPar: number;   // baseline points par
  actual: number;
  expPoss: number;     // player on-court possessions (NOT team ep)
  actPoss: number;
}
export interface BuildInput {
  marketCourt: MarketCourtRead;
  movement: LineMovement;
  players: CourtPlayerInput[];
  synergies: { a: UUID; b: UUID; type: "offense" | "defense" | "hazard" }[];
  studiedPlayerId: UUID;
  normalBaseline: number;         // studied player's normal line
  marketLine: number;             // studied player's posted line tonight
  studied: StudiedConditionsInput;
  lineup: LineupCourtRead;        // Phase 4C: engine-computed lineup court
  archetype: ArchetypeCourtRead;  // Phase 5A: studied player's archetype translation
  // Phase 5B: per-player archetype reads so the CourtGraph re-translates per node
  // (the same court, opposite meanings). Studied player included.
  archetypeByPlayer?: Record<string, { difficulty: number; fit: number; mood: Mood; modeled: boolean; slopeDirection: SlopeDirection }>;
  proof: PossessionProofRead;     // Phase 6: possessions-as-evidence
  secondGrade?: PlayerGrade;      // Phase 5C: a fully-graded second player (rim protector)
  lineupGraph?: LineupGraphRead;  // Phase 9A: lineup graph foundation (X team)
  lineupGraphY?: LineupGraphRead; // Phase 9D: opponent (Y team) lineup graph
  guardPrior?: PriorRead;         // Phase 9B: hierarchical prior for the studied guard
  graphConfidenceShadow?: { x?: GraphConfidenceCandidate; y?: GraphConfidenceCandidate }; // Phase 9F: shadow coupling
}

// ---- source + freshness provenance (Phase 4B) -------------------------------
// Where the market data came from and how stale it is. `missing` names fields a
// live feed could not populate (e.g. moneylines -> no win probability) so the
// interface can stay honest instead of implying data it never received.
// Phase 4D — the source state drives provenance AND market confidence. Each value
// is a DISTINCT, honest claim about where the line came from and how much to trust it.
export type SourceState =
  | "live"             // real credentialed provider, fresh + complete
  | "stale_live"       // real provider, but older than the staleness window
  | "last_known_good"  // provider failed; serving the last good live snapshot
  | "fixture_fallback" // provider failed and no cache; serving the fixture
  | "fixture"          // deliberate fixture baseline (canonical sync path)
  | "mock"             // mock transport (isLive=false) — synthetic, never "live"
  | "synthetic_audit"; // audit-universe fixture

export interface MarketProvenance {
  source: "live" | "fixture" | "fixture (live fallback)";
  sourceState: SourceState;      // Phase 4D: structured, never-blurred source state
  sourceQuality?: number;        // 0..1 multiplier applied to market confidence
  feedSource: string;            // 'stub', 'the-odds-api', 'pinnacle', ...
  phase?: string;                // 'open' | 'close' | 'live'
  capturedTs?: string;
  asOf?: string;
  ageMinutes?: number;
  stale?: boolean;
  bookCount?: number;
  bookAgreement?: number;
  hypothetical?: boolean;        // true after a what-if line scrub
  missing: string[];
  note?: string;
}
// The normalized basis the client uses to recompute a what-if line scrub. This
// is OUR MarketSnapshot contract (already normalized), never a provider's raw
// payload — so it does not infect the view with provider shape.
export interface MarketBasis { snapshot: MarketSnapshot; series: MarketSnapshot[]; }

// ---- the view the four objects consume --------------------------------------
export interface MarketHubView {
  spread: number; total: number;
  implied: { home: number; away: number };
  expectedPossessions: number;
  marketPpp: { home: number; away: number };
  winProbability?: { home: number; away: number };
  courtType: string;
  confidence: Confidence;
  movement: { spreadMove: number; totalMove: number; steamed: boolean };
}
export interface ConditionsView {
  playerId: UUID; name: string; archetype: string; label: string; mood: Mood;
  normalPar: number; marketPar: number; lineupPar: number; actual: number;
  marketSuppression: number;
  parPer100: number; actualPer100: number;     // lineup-par per 100 (the displayed par line)
  fit: number; difficulty: number; slope?: string; confidence: Confidence;
  // Phase 4C lineup engine (engine-backed; context inputs fixture-derived):
  lineupAdjustment: number; lineupSuppressionPct: number; lineupConfidence: Confidence;
  lineupFactors: { key: string; label: string; weightPct: number; note: string }[];
  lineupInputProvenance: InputProvenance;
  // Phase 5A archetype engine (engine-backed; scouting inputs fixture-derived):
  slopeScore: number; archetypeModeled: boolean; archetypeConfidence: Confidence;
  slopeDirection: SlopeDirection;
  difficultyFactors: ArchetypeFactor[]; fitFactors: ArchetypeFactor[];
  archetypeInputProvenance: InputProvenance;
}
// Phase 5C — a fully-graded player (the second-player chain: par + proof + verdict).
export interface PlayerGrade {
  playerId: UUID; name: string; archetype: string;
  normalPar: number; marketPar: number; lineupPar: number;
  verdict: VerdictView;
  slope?: CourtSlopeRead;                                // Phase 9A: his court slope v2
  nonScoringProof: { type: string; count: number }[];   // tracked, NOT valued into the headline
}

export interface VerdictView {
  word: string;
  beatLineupPer100: number; beatMarketPer100: number;
  actualPer100: number; lineupParPer100: number; marketParPer100: number;
  confidence: Confidence;            // Phase 6B: the CONSOLIDATED ruling confidence
  evidenceAdjusted?: ShrinkageRead;  // Phase 9A: beat shrunk toward the no-edge prior by confidence
  consolidated: VerdictConfidenceRead;
  // Phase 6 — the proof behind the ruling
  proof: {
    actualPoints: number; usedPossessions: number;
    topFamilies: { family: string; points: number; per100: number }[];
    resiliencePer100: number; hostilePossessions: number; beatHostileCourt: boolean;
    confidence: Confidence; inputProvenance: InputProvenance; missing: string[];
  };
}
export interface CourtGraphView {
  burnImplied: { home: number; away: number };
  courtType: string;
  players: (CourtPlayerInput & { hazard: boolean; modeled?: boolean; slopeDirection?: SlopeDirection })[];
  synergies: BuildInput["synergies"];
  proofTrail: ProofEventView[];    // Phase 6: each mark is a possession that proves the verdict
  selectedPlayerId: UUID;
  scarBeatPer100: number;
}
export interface CourtHandicapView {
  gameId: UUID;
  generatedFrom: { engineVersion: string; feedSource?: string };
  marketHub: MarketHubView;
  courtGraph: CourtGraphView;
  conditions: ConditionsView;
  verdict: VerdictView;
  secondGrade?: PlayerGrade;                                    // Phase 5C: the fully-graded rim protector
  courtSlope?: CourtSlopeRead;                                  // Phase 9A: Court Slope v2 (studied guard)
  lineupGraph?: LineupGraphRead;                                // Phase 9A: lineup graph foundation (X; kept for back-compat)
  lineupGraphs?: { x?: LineupGraphRead; y?: LineupGraphRead };  // Phase 9D: both teams' graphs
  graphConfidenceShadow?: { x?: GraphConfidenceCandidate; y?: GraphConfidenceCandidate }; // Phase 9F: SHADOW candidate (not applied)
  basis?: MarketBasis;                                          // for client what-if scrub
  provenance: {
    engineBacked: string[]; pendingEngine: string[];
    market?: MarketProvenance;
    lineup?: { modelVersion: string; confidence: Confidence; inputProvenance: string; missing: string[] };
    archetype?: { modelVersion: string; modeled: boolean; confidence: Confidence; inputProvenance: string; missing: string[] };
    proof?: { version: string; confidence: Confidence; usedPossessions: number; inputProvenance: string; missing: string[] };
  };
}

function verdictWord(beat: number): string {
  if (beat > 0.05) return "BEAT THE COURT";
  if (beat < -0.05) return "TRAPPED BY THE COURT";
  return "MET THE COURT";
}

export function buildCourtHandicapView(input: BuildInput, feedSource?: string, market?: MarketProvenance): CourtHandicapView {
  const mc = input.marketCourt;

  // --- market layer: straight from the engine ---
  const marketHub: MarketHubView = {
    spread: mc.homeSpread, total: mc.total,
    implied: { home: mc.home.impliedTeamTotal!, away: mc.away.impliedTeamTotal! },
    expectedPossessions: mc.expectedPossessions,
    marketPpp: { home: mc.home.marketPpp!, away: mc.away.marketPpp! },
    winProbability: mc.home.impliedWinProbability != null
      ? { home: mc.home.impliedWinProbability!, away: mc.away.impliedWinProbability! } : undefined,
    courtType: mc.courtType,
    confidence: mc.confidence,
    movement: { spreadMove: input.movement.spreadMove, totalMove: input.movement.totalMove, steamed: input.movement.steamed },
  };

  // --- conditions: market par from market engine; lineup par from lineup engine ---
  const mpar = computeMarketPar({ normalBaseline: input.normalBaseline, marketLine: input.marketLine });
  const s = input.studied;
  const lp = input.lineup;                 // Phase 4C engine read
  const ar = input.archetype;              // Phase 5A engine read
  const studiedPlayer = input.players.find((p) => p.id === input.studiedPlayerId)!;
  const lineupParPer100 = parPer100({ propLine: lp.lineupPar, expectedOnCourtPoss: s.expPoss });
  const marketParPer100 = parPer100({ propLine: mpar.marketPar, expectedOnCourtPoss: s.expPoss });
  // Phase 6: the studied player's ACTUAL is rebuilt from possessions, not a stamped
  // scalar. The proof's expected per-100 IS the lineup-court par, so its value-over-
  // expected reconciles to beat-vs-lineup. (A self-check asserts the reconciliation.)
  const pr = input.proof;
  const actPer100 = pr.actualPer100;
  const beatLineup = pr.valueOverExpectedPer100;
  const beatMarket = playerCourtBeatPer100({ actualPer100: actPer100, parPer100: marketParPer100 });

  // Phase 6B — consolidate the four laws into ONE honest ruling confidence. The
  // market layer's inputs are the odds feed; lineup/archetype/proof carry their
  // own provenance. The displayed verdict confidence is this, not a player scalar.
  const marketProv: InputProvenance = (market?.source === "live" ? "live" : "fixture");
  const consolidated = consolidateVerdictConfidence({ layers: [
    { layer: "market", confidence: marketHub.confidence, provenance: marketProv, missingCount: market?.missing?.length ?? 0 },
    { layer: "lineup", confidence: lp.confidence, provenance: lp.inputProvenance, missingCount: lp.missing.length },
    { layer: "archetype", confidence: ar.confidence, provenance: ar.inputProvenance, missingCount: ar.missing.length },
    { layer: "proof", confidence: pr.confidence, provenance: pr.inputProvenance, missingCount: pr.missing.length },
  ] });

  const conditions: ConditionsView = {
    playerId: studiedPlayer.id, name: studiedPlayer.name, archetype: studiedPlayer.archetype,
    label: studiedPlayer.label, mood: studiedPlayer.mood,
    normalPar: s.normalPar, marketPar: mpar.marketPar, lineupPar: lp.lineupPar, actual: s.actual,
    marketSuppression: mpar.suppression,
    parPer100: lineupParPer100, actualPer100: actPer100,
    fit: ar.fit, difficulty: ar.difficulty, slope: ar.slopeLabel,
    confidence: studiedPlayer.confidence,
    lineupAdjustment: lp.lineupAdjustment, lineupSuppressionPct: lp.lineupSuppressionPct,
    lineupConfidence: lp.confidence, lineupFactors: lp.factors, lineupInputProvenance: lp.inputProvenance,
    slopeScore: ar.slopeScore, archetypeModeled: ar.modeled, archetypeConfidence: ar.confidence,
    slopeDirection: ar.slopeDirection,
    difficultyFactors: ar.difficultyFactors, fitFactors: ar.fitFactors, archetypeInputProvenance: ar.inputProvenance,
  };

  const verdict: VerdictView = {
    word: verdictWord(beatLineup),
    beatLineupPer100: beatLineup, beatMarketPer100: beatMarket,
    actualPer100: actPer100, lineupParPer100, marketParPer100,
    confidence: consolidated.finalConfidence, consolidated,
    evidenceAdjusted: input.guardPrior
      ? shrinkBeatWithPolicy({ observed: beatLineup, finalConfidence: consolidated.finalConfidence, proofConfidence: pr.confidence, prior: input.guardPrior, claimType: "beat_vs_court" })
      : shrinkBeat(beatLineup, consolidated.finalConfidence),
    proof: {
      actualPoints: pr.actualPoints, usedPossessions: pr.usedPossessions,
      topFamilies: pr.families.filter((f: FamilyProof) => f.points > 0).slice(0, 4).map((f: FamilyProof) => ({ family: f.family, points: f.points, per100: f.per100 })),
      resiliencePer100: pr.pressure.resiliencePer100, hostilePossessions: pr.pressure.hostilePossessions,
      beatHostileCourt: pr.beatHostileCourt, confidence: pr.confidence,
      inputProvenance: pr.inputProvenance, missing: pr.missing,
    },
  };

  const hazardIds = new Set<UUID>();
  input.synergies.filter((y) => y.type === "hazard").forEach((y) => { hazardIds.add(y.a); hazardIds.add(y.b); });
  const courtSlope = computeCourtSlope({
    normalPar: s.normalPar, marketPar: mpar.marketPar, lineupPar: lp.lineupPar,
    archetypeDifficulty: ar.difficulty,
    marketConfidence: marketHub.confidence, lineupConfidence: lp.confidence, archetypeConfidence: ar.confidence,
  });
  const courtGraph: CourtGraphView = {
    burnImplied: marketHub.implied, courtType: mc.courtType,
    // Per-player archetype reads (5B): the studied guard AND any other modeled
    // archetype (e.g. the rim protector) carry engine difficulty/fit/mood, so
    // the warp ring shows real magnitude and the court re-translates per node.
    // Unmodeled players keep their fixture values (provisional magnitude).
    players: input.players.map((p) => {
      const a = input.archetypeByPlayer?.[p.id]
        ?? (p.id === input.studiedPlayerId
          ? { difficulty: ar.difficulty, fit: ar.fit, mood: p.mood, modeled: ar.modeled, slopeDirection: ar.slopeDirection }
          : undefined);
      return a
        ? { ...p, hazard: hazardIds.has(p.id), difficulty: a.difficulty, fit: a.fit, mood: a.mood, modeled: a.modeled, slopeDirection: a.slopeDirection }
        : { ...p, hazard: hazardIds.has(p.id) };
    }),
    synergies: input.synergies,
    proofTrail: pr.proofEvents,
    selectedPlayerId: input.studiedPlayerId, scarBeatPer100: beatLineup,
  };

  // If the feed gave no moneylines, win probability is genuinely unavailable —
  // name it rather than imply it exists.
  const market2: MarketProvenance | undefined = market
    ? { ...market, missing: marketHub.winProbability ? market.missing : [...new Set([...market.missing, "moneylines -> win probability"])] }
    : undefined;

  return {
    gameId: mc.gameId,
    generatedFrom: { engineVersion: MARKET_ENGINE_VERSION, feedSource: market2?.feedSource ?? feedSource },
    marketHub, courtGraph, conditions, verdict,
    secondGrade: input.secondGrade,
    courtSlope, lineupGraph: input.lineupGraph,
    lineupGraphs: { x: input.lineupGraph, y: input.lineupGraphY },
    graphConfidenceShadow: input.graphConfidenceShadow,
    provenance: {
      engineBacked: [
        "marketHub.* (implied, expPoss, ppp, winProb, courtType, confidence, movement)",
        "conditions.marketPar + marketSuppression",
        "conditions.lineupPar + lineupAdjustment + verdict.beatLineupPer100 (lineup engine; context inputs fixture-derived)",
        "conditions.fit/difficulty/slope (archetype engine; scouting inputs fixture-derived)",
        "verdict.actualPer100 + actualPoints (possession proof engine; events synthetic_fixture)",
        "verdict proof: action-family breakdown + pressure resilience + beatHostileCourt",
        "verdict.marketParPer100/beatMarketPer100",
      ],
      pendingEngine: [
        "full per-player conditions + verdicts (studied player only for now)",
        "non-scoring archetype translation models (Phase 5B)",
        "non-scoring possession value (assists/screens/roll/deterrence) — tracked, not yet valued (Phase 6)",
        "rim protector possession proof (studied guard only for now)",
        "live possession ingestion (synthetic events for now)",
      ],
      market: market2,
      lineup: { modelVersion: lp.modelVersion, confidence: lp.confidence, inputProvenance: lp.inputProvenance, missing: lp.missing },
      archetype: { modelVersion: ar.modelVersion, modeled: ar.modeled, confidence: ar.confidence, inputProvenance: ar.inputProvenance, missing: ar.missing },
      proof: { version: pr.version, confidence: pr.confidence, usedPossessions: pr.usedPossessions, inputProvenance: pr.inputProvenance, missing: pr.missing },
    },
  };
}

// Phase 9D/9E — resolve the lineup graph for the SELECTED player's actual side of
// the court, using EXPLICIT team identity (the player's team field) rather than the
// id prefix. The x/y prefix remains only as a fallback for synthetic fixtures. The
// resolution also carries the graph TRUST decision (9E): a thin graph must not
// sound like a full one. A player with no modeled graph resolves to a coverage
// note, never the other team's graph.
export interface SelectedGraphResolution {
  team: "x" | "y" | "unknown";
  teamSource: "explicit" | "prefix_fallback" | "unknown";
  selected?: LineupGraphRead;
  opponent?: LineupGraphRead;
  covered: boolean;
  coverageNote: string;
  trust: GraphTrustDecision;
  shadowConfidence?: GraphConfidenceCandidate;  // Phase 9F: shadow candidate for this side (not applied)
}
export function resolveSelectedLineupGraph(view: CourtHandicapView, playerId: string): SelectedGraphResolution {
  // EXPLICIT first: read the team from the player record.
  const player = view.courtGraph.players.find((p) => p.id === playerId);
  let team: "x" | "y" | "unknown" = "unknown";
  let teamSource: "explicit" | "prefix_fallback" | "unknown" = "unknown";
  if (player?.team === "X" || player?.team === "Y") {
    team = player.team.toLowerCase() as "x" | "y";
    teamSource = "explicit";
  } else if (playerId.startsWith("x") || playerId.startsWith("y")) {
    team = playerId.startsWith("x") ? "x" : "y";
    teamSource = "prefix_fallback";
  }

  const graphs = view.lineupGraphs ?? {};
  const selected = team === "x" ? graphs.x : team === "y" ? graphs.y : undefined;
  const opponent = team === "x" ? graphs.y : team === "y" ? graphs.x : undefined;
  const covered = !!selected;
  const trust = decideGraphTrust(selected);
  const coverageNote = !covered
    ? "limited graph coverage — fixture estimate (this player's lineup is not modeled)"
    : `${(selected!.team ?? team).toUpperCase()} lineup · ${trust.graphTrustLabel}`;
  const shadows = view.graphConfidenceShadow ?? {};
  const shadowConfidence = team === "x" ? shadows.x : team === "y" ? shadows.y : undefined;
  return { team, teamSource, selected, opponent, covered, coverageNote, trust, shadowConfidence };
}

// =============================================================================
// SELF-CHECKS — canonical fixture flows through to 103·99 / 24.5 / 23.1 / +8.6.
// =============================================================================

export function runViewModelSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const approx = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  const snapshot = {
    gameId: "game-fixture-001", phase: "close" as const, capturedTs: "2026-01-15T23:30:00Z",
    homeTeamId: "team-x", awayTeamId: "team-y",
    homeSpread: -4, total: 202, homeMoneyline: -180, awayMoneyline: 150,
    bookCount: 3, bookAgreement: 0.92,
  };
  const marketCourt = computeMarketCourt(snapshot);
  const movement = lineMovement({ gameId: "game-fixture-001", snapshots: [
    { ...snapshot, phase: "open", homeSpread: -3, total: 200 }, snapshot,
  ] });

  const view = buildCourtHandicapView({
    marketCourt, movement,
    players: [{ id: "x1", code: "X1", team: "X", name: "Star Scoring Guard", archetype: "Pressure-Rim Midrange Assassin",
      label: "trap", mood: "trap", fit: 38, difficulty: 86, slope: "High", confidence: 0.74, pos: { x: 360, y: 300 } }],
    synergies: [{ a: "x1", b: "x4", type: "hazard" }],
    studiedPlayerId: "x1", normalBaseline: 27.5, marketLine: 24.5,
    studied: { normalPar: 27.5, actual: 29, expPoss: 66.5, actPoss: 67 },
    lineup: computeLineupCourt({
      marketPar: 24.5, archetypeClass: "scorer",
      spacingSignal: 0.72, poaSignal: 0.85, rimSignal: 0.78, burdenSignal: 0.62, synergySignal: 0.40,
      lineupStatusConfidence: 0.9, inputProvenance: "synthetic_fixture",
      missing: ["real on/off splits", "tracking-based spacing", "injury/availability modifiers"],
    }),
    archetype: computeArchetypeCourt({
      archetype: "scoring_guard", normalPar: 27.5, marketPar: 24.5, lineupPar: 23.1,
      expectedPossessions: 88.6, marketSuppressionPct: 0.109, lineupSuppressionPct: 0.057,
      spacing: 0.72, oppPoaPressure: 0.85, oppRimProtection: 0.78, creationBurden: 0.62, synergyRelief: 0.40,
      marketConfidence: 0.92, lineupStatusConfidence: 0.9, inputProvenance: "synthetic_fixture",
      missing: ["real matchup tracking", "usage-vs-defense splits", "shot-quality model"],
    }),
    proof: computePossessionProof({
      studiedPlayerId: "x1", events: studiedPossessionEvents, expectedPer100: 34.7,
      marketConfidence: 0.92, inputProvenance: "synthetic_fixture",
      missing: ["live play-by-play", "non-scoring value model"],
    }),
  }, "stub");

  check("marketHub implied -> 103 / 99", view.marketHub.implied.home === 103 && view.marketHub.implied.away === 99);
  check("marketHub exp poss -> ~88.6", approx(view.marketHub.expectedPossessions, 88.6, 0.1));
  check("marketHub ppp -> 1.163 / 1.117", approx(view.marketHub.marketPpp.home, 1.163, 0.001) && approx(view.marketHub.marketPpp.away, 1.117, 0.001));
  check("conditions market par -> 24.5 (10.9% suppression)", view.conditions.marketPar === 24.5 && approx(view.conditions.marketSuppression, 0.109, 0.001));
  check("conditions lineup par -> 23.1 (engine-computed)", view.conditions.lineupPar === 23.1);
  check("conditions carries lineup factors (5)", view.conditions.lineupFactors.length === 5);
  check("conditions fit/difficulty/slope engine-backed (28/75/High)", view.conditions.fit === 28 && view.conditions.difficulty === 75 && view.conditions.slope === "High");
  check("conditions carries archetype factor breakdowns", view.conditions.difficultyFactors.length === 6 && view.conditions.fitFactors.length === 6);
  check("verdict beat vs market -> +6.5 / 100", approx(view.verdict.beatMarketPer100, 6.5, 0.05));
  check("verdict beat vs lineup -> +8.6 / 100", approx(view.verdict.beatLineupPer100, 8.6, 0.05));
  check("Phase 6B -> verdict confidence is the consolidated read (not a scalar)", view.verdict.confidence === view.verdict.consolidated.finalConfidence);
  check("Phase 7B -> weakest layer is now archetype (proof reshaped, no longer self-crushing)", view.verdict.consolidated.weakestLayer.layer === "archetype");
  check("Phase 7B -> proof confidence humble, not crushed (0.5-0.85)", (() => { const p = view.verdict.consolidated.layerBreakdown.find((l) => l.layer === "proof")?.confidence ?? 0; return p > 0.5 && p < 0.85; })());
  check("Phase 6B -> final <= weakest + 0.12 (ceiling holds)", view.verdict.confidence <= view.verdict.consolidated.weakestLayer.confidence + 0.12 + 1e-9);
  check("Phase 6B -> synthetic chain labeled PROVISIONAL", view.verdict.consolidated.provisional === true && view.verdict.consolidated.reliabilityLabel.includes("PROVISIONAL"));
  check("Phase 6B -> dead possessions array pruned from CourtGraph view", !("possessions" in view.courtGraph));
  check("verdict word -> BEAT THE COURT", view.verdict.word === "BEAT THE COURT");
  check("studied player flagged hazard via synergy", view.courtGraph.players[0].hazard === true);
  check("studied node carries engine difficulty (real warp magnitude)", view.courtGraph.players[0].difficulty === 75);
  check("lineupPar now engine-backed (not pending)", !view.provenance.pendingEngine.some((p) => p.includes("lineupPar")));
  check("fit/difficulty/slope no longer pending", !view.provenance.pendingEngine.some((p) => /fit|difficulty|slope/.test(p)));
  check("provenance.archetype present + capped confidence", view.provenance.archetype?.modeled === true && (view.provenance.archetype?.confidence ?? 1) < 0.7);

  // Phase 9D/9E — resolver uses EXPLICIT team identity; trust governs display.
  const resNo = resolveSelectedLineupGraph(view, "x1");
  check("9E -> resolver reads team from the player's team field (explicit, not prefix)", resNo.team === "x" && resNo.teamSource === "explicit");
  check("9D -> no graph attached -> uncovered + named limitation", resNo.covered === false && resNo.coverageNote.includes("limited graph coverage"));
  check("9E -> uncovered selection -> trust displayMode no_graph, no scalar", resNo.trust.displayMode === "no_graph" && resNo.trust.showFragilityScore === false);
  const resUnknown = resolveSelectedLineupGraph(view, "z9");
  check("9D -> unrecognized id -> unknown team, uncovered", resUnknown.team === "unknown" && resUnknown.covered === false);
  check("9E -> unknown player -> teamSource unknown (no false explicit)", resUnknown.teamSource === "unknown");

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runViewModelSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n"));
  // eslint-disable-next-line no-console
  console.log(`\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
