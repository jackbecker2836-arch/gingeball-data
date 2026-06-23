// =============================================================================
// GINGEBALL COURT HANDICAP — FORMULA REGISTRY (Phase 1)
//
// The mathematical soul of the system. Every formula is:
//   - a pure, deterministic function (no hidden state, no I/O)
//   - registered with id / name / version / status / owner / example
//   - paired with an example calculation drawn from the mandate's validation set
//
// Rule (mandate sec. 10): formula logic NEVER lives inside UI components. UI and
// backend both call these. Versions are preserved so any game can be rerun
// deterministically. The DB table court_handicap.formula_versions mirrors this.
//
// Run `npx tsx lib/formula-registry.ts` to execute the built-in self-checks.
// =============================================================================

import type { LambdaWeights, StatMap, PropStat } from "./types";

export type FormulaStatus = "active" | "scaffold" | "deprecated" | "experimental";

export interface FormulaSpec<TIn, TOut> {
  id: string;            // e.g. 'CH-MKT-001'
  name: string;
  description: string;
  version: string;
  status: FormulaStatus;
  owner: string;
  fn?: (input: TIn) => TOut;     // optional: scaffold/pointer entries may not yet implement
  example?: { input: TIn; expected: TOut; tolerance?: number };
}

// League constant; tune via config/calibration later (mandate Phase 9).
export const LEAGUE_AVG_PPP = 1.14;

const round = (x: number, d = 3) => Number(x.toFixed(d));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// -----------------------------------------------------------------------------
// 6.1 MARKET COURT ENGINE
// -----------------------------------------------------------------------------

// CH-MKT-001: implied team totals from total + spread.
// homeSpread is negative when home is favored (e.g. -4 means home favored by 4).
export function impliedTeamTotals(input: { total: number; homeSpread: number }) {
  const margin = -input.homeSpread;                  // home expected margin
  return {
    home: round((input.total + margin) / 2, 2),
    away: round((input.total - margin) / 2, 2),
  };
}

// CH-MKT-002: expected possessions per team from the game total.
export function expectedPossessions(input: { total: number; leagueAvgPpp?: number }) {
  const ppp = input.leagueAvgPpp ?? LEAGUE_AVG_PPP;
  return round(input.total / (2 * ppp), 1);
}

// CH-MKT-003: market points-per-possession for a team.
export function marketPpp(input: { impliedTeamTotal: number; expectedPossessions: number }) {
  return round(input.impliedTeamTotal / input.expectedPossessions, 4);
}

// CH-MKT-004: market-expected net rating from spread (per 100 possessions).
export function marketExpectedNetRating(input: { teamMargin: number; expectedPossessions: number }) {
  return round((input.teamMargin / input.expectedPossessions) * 100, 3);
}

// CH-MKT-005: prop suppression — how much a line is reduced from the player's baseline.
export function propSuppression(input: { tonightProp: number; normalProp: number }) {
  return round(1 - input.tonightProp / input.normalProp, 4);
}

// CH-MKT-006: matchup tax — suppression beyond the team scoring environment.
//   environmentAdjustedProp = normalProp * (impliedTeamTotal / teamAvgImpliedTotal)
export function matchupTax(input: {
  tonightProp: number; normalProp: number;
  impliedTeamTotal: number; teamAvgImpliedTotal: number;
}) {
  const envAdjusted = input.normalProp * (input.impliedTeamTotal / input.teamAvgImpliedTotal);
  return { environmentAdjustedProp: round(envAdjusted, 2), matchupTax: round(input.tonightProp - envAdjusted, 3) };
}

// CH-MKT-007: vig-removed two-way win probability from American moneylines.
export function devigWinProbability(input: { homeMoneyline: number; awayMoneyline: number }) {
  const raw = (ml: number) => (ml < 0 ? -ml / (-ml + 100) : 100 / (ml + 100));
  const h = raw(input.homeMoneyline), a = raw(input.awayMoneyline);
  const overround = h + a;
  return { home: round(h / overround, 4), away: round(a / overround, 4) };
}

// -----------------------------------------------------------------------------
// 6.4 PLAYER COURT — per-100 conversion + court beat
// -----------------------------------------------------------------------------

// CH-PLR-001: stat par per 100 on-court possessions.
export function parPer100(input: { propLine: number; expectedOnCourtPoss: number }) {
  return round((input.propLine / input.expectedOnCourtPoss) * 100, 1);
}

// CH-PLR-002: actual output per 100 on-court possessions.
export function actualPer100(input: { actualStat: number; actualOnCourtPoss: number }) {
  return round((input.actualStat / input.actualOnCourtPoss) * 100, 1);
}

// CH-PLR-003: player court beat per 100 = actual per100 - par per100.
export function playerCourtBeatPer100(input: { actualPer100: number; parPer100: number }) {
  return round(input.actualPer100 - input.parPer100, 1);
}

// -----------------------------------------------------------------------------
// 6.5 POSSESSION COURT
// -----------------------------------------------------------------------------

// CH-POS-001: possession court differential (offense perspective).
export function possessionDifferential(input: { actualPpp: number; expectedPpp: number }) {
  return round(input.actualPpp - input.expectedPpp, 4);
}

// CH-POS-002: slope-adjusted possession value.
export function slopeAdjusted(input: { rawDiff: number; courtSlope: number; lambda?: number }) {
  const lambda = input.lambda ?? 1;
  return round(input.rawDiff * (1 + lambda * input.courtSlope), 4);
}

// -----------------------------------------------------------------------------
// 6.8 CONFIDENCE + SHRINKAGE
// -----------------------------------------------------------------------------

// CH-CONF-001: sample confidence from on-court possessions (saturating).
export function sampleConfidence(input: { possessions: number; tau?: number }) {
  const tau = input.tau ?? 50;
  return round(1 - Math.exp(-input.possessions / tau), 4);
}

// CH-CONF-002: composite confidence (product of components, clamped).
export function compositeConfidence(c: {
  sample: number; market: number; role: number;
  attribution: number; lineupContinuity: number; dataIntegrity: number;
}) {
  return round(clamp01(c.sample * c.market * c.role * c.attribution * c.lineupContinuity * c.dataIntegrity), 4);
}

// CH-CONF-002b: geometric mean of components (humble, but does not collapse to
// near-zero the way a raw product of many factors does).
export function geometricMean(values: number[]): number {
  if (values.length === 0) return 0;
  const lnSum = values.reduce((s, v) => s + Math.log(Math.max(1e-6, v)), 0);
  return round(Math.exp(lnSum / values.length), 4);
}

// CH-CONF-003b: proof confidence v2 (Phase 7B). The Phase 7 audit showed the raw
// six-factor product crushed the proof layer at FULL sample (weakest in 11/12
// scenarios). v2 changes the SHAPE, not the number: a sample-size GATE multiplies
// a GEOMETRIC MEAN of the quality factors. A thin sample still collapses (sample
// is a direct multiplier); a full synthetic sample stays humble, not self-crushing.
export function proofConfidence(input: {
  sample: number; market: number; role: number; lineupContinuity: number; dataIntegrity: number;
}) {
  const quality = geometricMean([input.market, input.role, input.lineupContinuity, input.dataIntegrity]);
  return round(clamp01(input.sample * quality), 4);
}

// CH-CONF-003: Bayesian shrinkage toward a prior.
export function shrink(input: { observed: number; prior: number; confidence: number }) {
  const w = clamp01(input.confidence);
  return round(w * input.observed + (1 - w) * input.prior, 3);
}

// -----------------------------------------------------------------------------
// 7. MASTER COMPOSITE — Player Court Handicap (PCH)
//   PCH = [ Σ λk · beatk ] · (1 + slope) · (1 + roleBurden) · conf + prior·(1-conf)
// Status: scaffold — possession/role beats arrive with later phases; structure final.
// -----------------------------------------------------------------------------

export interface PchComponents {
  marketPropBeat: number;
  possessionCourtBeat: number;
  roleCourtBeat: number;
  teamMarketCredit: number;
  lineupFitCredit: number;
  courtSlope: number;
  roleBurden: number;
  confidence: number;
  prior: number;
}

export function playerCourtHandicap(c: PchComponents, w: LambdaWeights) {
  const weighted =
    w.marketPropBeat * c.marketPropBeat +
    w.possessionCourtBeat * c.possessionCourtBeat +
    w.roleCourtBeat * c.roleCourtBeat +
    w.teamMarketCredit * c.teamMarketCredit +
    w.lineupFitCredit * c.lineupFitCredit;
  const raw = weighted * (1 + c.courtSlope) * (1 + c.roleBurden);
  const conf = clamp01(c.confidence);
  return {
    rawHandicap: round(raw, 3),
    shrunkHandicap: round(conf * raw + (1 - conf) * c.prior, 3),
  };
}

// -----------------------------------------------------------------------------
// 31. TEAM COURT HANDICAP
// -----------------------------------------------------------------------------

export function teamCourtHandicap(input: {
  actualMargin: number; spreadImpliedMargin: number; possessions: number;
  courtDifficultyAdj?: number;
}) {
  const actualNR = (input.actualMargin / input.possessions) * 100;
  const marketNR = (input.spreadImpliedMargin / input.possessions) * 100;
  const adj = input.courtDifficultyAdj ?? 0;
  return {
    actualNetRating: round(actualNR, 3),
    marketExpectedNetRating: round(marketNR, 3),
    teamCourtHandicap: round(actualNR - marketNR + adj, 3),
    teamMarketBeat: round(input.actualMargin - input.spreadImpliedMargin, 3),
  };
}

// =============================================================================
// REGISTRY — declarative index. The DB table formula_versions mirrors this.
// =============================================================================

export const FORMULA_REGISTRY: FormulaSpec<any, any>[] = [
  { id: "CH-MKT-001", name: "Implied Team Totals", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Split a game total by the spread into per-team implied totals.",
    fn: impliedTeamTotals,
    example: { input: { total: 202, homeSpread: -4 }, expected: { home: 103, away: 99 } } },
  { id: "CH-MKT-002", name: "Expected Possessions", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Estimate per-team possessions from the game total and league PPP.",
    fn: expectedPossessions,
    example: { input: { total: 202 }, expected: 88.6, tolerance: 0.1 } },
  { id: "CH-MKT-003", name: "Market PPP", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Market-implied points per possession for a team.",
    fn: marketPpp,
    example: { input: { impliedTeamTotal: 103, expectedPossessions: 88.6 }, expected: 1.1626, tolerance: 0.001 } },
  { id: "CH-MKT-005", name: "Prop Suppression", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Fractional reduction of a player's line vs their normal baseline.",
    fn: propSuppression,
    example: { input: { tonightProp: 24.5, normalProp: 27.5 }, expected: 0.1091, tolerance: 0.001 } },
  { id: "CH-MKT-006", name: "Matchup Tax", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Player-specific suppression beyond the team scoring environment." },
  { id: "CH-MKT-007", name: "De-vig Win Probability", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Two-way vig-removed win probabilities from American moneylines." },
  { id: "CH-PLR-001", name: "Par per 100", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Stat par normalized to 100 on-court possessions.",
    fn: parPer100,
    example: { input: { propLine: 24.5, expectedOnCourtPoss: 66.5 }, expected: 36.8, tolerance: 0.1 } },
  { id: "CH-PLR-003", name: "Player Court Beat per 100", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Actual per-100 minus par per-100." },
  { id: "CH-POS-001", name: "Possession Differential", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Actual minus expected points on a possession." },
  { id: "CH-POS-002", name: "Slope-Adjusted Value", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Reward beating high-slope (skill-revealing) possessions." },
  { id: "CH-CONF-001", name: "Sample Confidence", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Saturating confidence from possession count." },
  { id: "CH-CONF-003", name: "Bayesian Shrinkage", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Blend observed value toward a prior by confidence." },
  { id: "CH-PCH-001", name: "Player Court Handicap (composite)", version: "0.9.0", status: "scaffold", owner: "court-handicap",
    description: "Master five-lambda composite; possession/role beats fill in later phases." },
  { id: "CH-TEAM-001", name: "Team Court Handicap", version: "1.0.0", status: "active", owner: "court-handicap",
    description: "Actual net rating minus spread-implied net rating, court-adjusted." },
];

// =============================================================================
// SELF-CHECKS — the mandate's validation set (sec. 13). These must pass.
// =============================================================================

export function runSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const approx = (a: number, b: number, tol = 0.05) => Math.abs(a - b) <= tol;
  const check = (name: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${name}`); };

  const itt = impliedTeamTotals({ total: 202, homeSpread: -4 });
  check("Team X -4, total 202 -> implied 103 / 99", itt.home === 103 && itt.away === 99);

  check("Points 24.5 vs 27.5 -> 10.9% suppression", approx(propSuppression({ tonightProp: 24.5, normalProp: 27.5 }), 0.109, 0.001));

  const ep = expectedPossessions({ total: 202 });
  check("Total 202 -> ~88.6 expected possessions", approx(ep, 88.6, 0.1));

  check("103 / 88.6 -> market PPP 1.163", approx(marketPpp({ impliedTeamTotal: 103, expectedPossessions: 88.6 }), 1.163, 0.001));

  check("24.5 over 66.5 poss -> 36.8 per 100", approx(parPer100({ propLine: 24.5, expectedOnCourtPoss: 66.5 }), 36.8, 0.1));

  check("29 over 67 poss -> 43.3 per 100", approx(actualPer100({ actualStat: 29, actualOnCourtPoss: 67 }), 43.3, 0.1));

  check("Court beat -> +6.5 per 100", approx(playerCourtBeatPer100({ actualPer100: 43.3, parPer100: 36.8 }), 6.5, 0.05));

  check("Shrinkage: 0.62*11.1 + 0.38*4.5 -> ~8.59", approx(shrink({ observed: 11.1, prior: 4.5, confidence: 0.62 }), 8.59, 0.02));

  return { passed, failed, details };
}

// Execute self-checks when run directly.
if (typeof require !== "undefined" && require.main === module) {
  const r = runSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n"));
  // eslint-disable-next-line no-console
  console.log(`\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
