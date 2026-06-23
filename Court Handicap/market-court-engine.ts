// =============================================================================
// GINGEBALL COURT HANDICAP — MARKET COURT ENGINE (Phase 3)
//
// The first law made real: THE BURN. This engine takes a normalized
// MarketSnapshot and computes the court's physics — implied team totals,
// expected possessions, market PPP, market-expected net rating, vig-removed
// win probability — plus the MARKET PAR a player's line implies, and the
// signal carried by line movement.
//
// It calls the Phase 1 formula registry for every number (UI and backend share
// that math; nothing is reinvented here). Output is versioned so any game can
// be recomputed deterministically.
//
// Run `npx tsx lib/market-court-engine.ts` for the built-in self-checks.
// =============================================================================

import {
  impliedTeamTotals, expectedPossessions, marketPpp, marketExpectedNetRating,
  devigWinProbability, propSuppression,
} from "./formula-registry";
import type { TeamMarketCourt, Confidence, UUID } from "./types";
import type { MarketSnapshot, MarketSeries } from "./odds-ingestion";

const round = (x: number, d = 3) => Number(x.toFixed(d));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export const MARKET_ENGINE_VERSION = "ch-market-court@1.0.0";

export interface MarketCourtRead {
  gameId: UUID;
  phase: MarketSnapshot["phase"];
  capturedTs: string;
  total: number;
  homeSpread: number;
  expectedPossessions: number;
  courtType: string;
  home: TeamMarketCourt;
  away: TeamMarketCourt;
  confidence: Confidence;
  formulaVersion: string;
}

// Classify the night by total — the headline character of the court.
export function classifyCourtType(total: number): string {
  if (total <= 204) return "low-total defensive grind";
  if (total <= 216) return "balanced court";
  if (total <= 226) return "up-tempo court";
  return "track-meet shootout";
}

// Market confidence from book breadth + agreement. Sharp, clustered, well-covered
// lines are trusted more than thin or scattered ones.
export function marketConfidence(s: MarketSnapshot): Confidence {
  const breadth = Math.min(1, s.bookCount / 4);
  return round(clamp01(s.bookAgreement * (0.7 + 0.3 * breadth)), 3);
}

// Odds snapshot -> the full market court for both teams.
export function computeMarketCourt(s: MarketSnapshot): MarketCourtRead {
  const itt = impliedTeamTotals({ total: s.total, homeSpread: s.homeSpread });
  const ep = expectedPossessions({ total: s.total });
  const margin = -s.homeSpread; // home expected margin (positive when home favored)
  const wp = (s.homeMoneyline != null && s.awayMoneyline != null)
    ? devigWinProbability({ homeMoneyline: s.homeMoneyline, awayMoneyline: s.awayMoneyline })
    : undefined;
  const conf = marketConfidence(s);
  const courtType = classifyCourtType(s.total);

  const team = (teamId: UUID, implied: number, sign: 1 | -1): TeamMarketCourt => ({
    gameId: s.gameId,
    teamId,
    impliedTeamTotal: implied,
    expectedPossessions: ep,
    marketPpp: marketPpp({ impliedTeamTotal: implied, expectedPossessions: ep }),
    marketExpectedNetRating: marketExpectedNetRating({ teamMargin: sign * margin, expectedPossessions: ep }),
    impliedWinProbability: wp ? round(sign > 0 ? wp.home : wp.away, 4) : undefined,
    courtType,
    confidence: conf,
    formulaVersion: MARKET_ENGINE_VERSION,
  });

  return {
    gameId: s.gameId, phase: s.phase, capturedTs: s.capturedTs,
    total: s.total, homeSpread: s.homeSpread, expectedPossessions: ep, courtType,
    home: team(s.homeTeamId ?? "home", itt.home, 1),
    away: team(s.awayTeamId ?? "away", itt.away, -1),
    confidence: conf,
    formulaVersion: MARKET_ENGINE_VERSION,
  };
}

// MARKET PAR — what the market expects of a player tonight. Two sources:
//   line: an actual posted prop line vs the player's normal baseline (preferred)
//   environment: no line posted -> scale the baseline by the team's scoring env
// Suppression is the fraction the market shaved off the player's normal number.
export interface MarketParResult { marketPar: number; suppression: number; source: "line" | "environment"; }

export function computeMarketPar(input: {
  normalBaseline: number;
  marketLine?: number;
  impliedTeamTotal?: number;
  teamAvgImpliedTotal?: number;
}): MarketParResult {
  if (input.marketLine != null) {
    return {
      marketPar: round(input.marketLine, 2),
      suppression: propSuppression({ tonightProp: input.marketLine, normalProp: input.normalBaseline }),
      source: "line",
    };
  }
  if (input.impliedTeamTotal != null && input.teamAvgImpliedTotal) {
    const env = input.normalBaseline * (input.impliedTeamTotal / input.teamAvgImpliedTotal);
    return {
      marketPar: round(env, 2),
      suppression: propSuppression({ tonightProp: env, normalProp: input.normalBaseline }),
      source: "environment",
    };
  }
  throw new Error("computeMarketPar: provide marketLine, or impliedTeamTotal + teamAvgImpliedTotal");
}

// Line movement is information. Open vs latest deltas; a steamed line moved hard.
export interface LineMovement { spreadMove: number; totalMove: number; steamed: boolean; from: string; to: string; }

export function lineMovement(series: MarketSeries): LineMovement {
  if (series.snapshots.length < 2) {
    return { spreadMove: 0, totalMove: 0, steamed: false, from: "open", to: "open" };
  }
  const open = series.snapshots[0];
  const last = series.snapshots[series.snapshots.length - 1];
  const spreadMove = round(last.homeSpread - open.homeSpread, 1);
  const totalMove = round(last.total - open.total, 1);
  return {
    spreadMove, totalMove,
    steamed: Math.abs(spreadMove) >= 1 || Math.abs(totalMove) >= 3,
    from: open.phase, to: last.phase,
  };
}

// =============================================================================
// SELF-CHECKS — canonical fixture (Team X -4 / 202). Must match Phase 1.
// =============================================================================

export function runMarketSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const approx = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;
  const check = (name: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${name}`); };

  const snap: MarketSnapshot = {
    gameId: "game-fixture-001", phase: "close", capturedTs: "2026-01-15T23:30:00Z",
    homeTeamId: "team-x", awayTeamId: "team-y",
    homeSpread: -4, total: 202, homeMoneyline: -180, awayMoneyline: 150,
    bookCount: 3, bookAgreement: 0.92,
  };
  const mc = computeMarketCourt(snap);
  check("implied totals -> 103 / 99", mc.home.impliedTeamTotal === 103 && mc.away.impliedTeamTotal === 99);
  check("expected possessions -> ~88.6", approx(mc.expectedPossessions, 88.6, 0.1));
  check("market PPP -> 1.163 / 1.117", approx(mc.home.marketPpp!, 1.163, 0.001) && approx(mc.away.marketPpp!, 1.117, 0.001));
  check("court type -> low-total defensive grind", mc.courtType === "low-total defensive grind");
  check("win prob sums to 1, home favored", !!mc.home.impliedWinProbability && mc.home.impliedWinProbability! > mc.away.impliedWinProbability! && approx(mc.home.impliedWinProbability! + mc.away.impliedWinProbability!, 1, 0.001));

  const par = computeMarketPar({ normalBaseline: 27.5, marketLine: 24.5 });
  check("market par 24.5 from normal 27.5 -> 10.9% suppression", par.marketPar === 24.5 && approx(par.suppression, 0.109, 0.001));

  const series: MarketSeries = {
    gameId: "game-fixture-001",
    snapshots: [
      { ...snap, phase: "open", homeSpread: -3, total: 200, capturedTs: "2026-01-15T14:00:00Z" },
      snap,
    ],
  };
  const mv = lineMovement(series);
  check("line moved -3/200 open -> -4/202 close (steamed)", mv.spreadMove === -1 && mv.totalMove === 2 && mv.steamed);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runMarketSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n"));
  // eslint-disable-next-line no-console
  console.log(`\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
