// =============================================================================
// GINGEBALL COURT HANDICAP — DATA CONTRACTS (Phase 1)
//
// Single source of truth for the shapes that flow through every engine. These
// mirror db/schema.sql. Backend calculators and the frontend CourtGraph both
// import from here so a metric can never mean two different things in two places.
//
// Convention: Ids are UUID strings (matching public.players / public.seasons).
// Confidence is always a number in [0, 1]. Per-100 means "per 100 possessions".
// =============================================================================

export type UUID = string;
export type Confidence = number; // 0..1

// Where a model's INPUTS came from. `synthetic_fixture` = labeled test data built
// to exercise the engines; `synthetic_audit_fixture` = the full-system audit
// universe (Phase 7), a wider stress world. Neither is measured or live.
export type InputProvenance = "synthetic_fixture" | "synthetic_audit_fixture" | "fixture" | "live" | "mixed";

export type Phase = "pregame" | "live" | "postgame" | "season";
export type SideOfBall = "offense" | "defense";

export type PropStat =
  | "points" | "rebounds" | "assists" | "pra"
  | "threes" | "steals" | "blocks" | "turnovers" | "ft_made";

export type RoleFamily = "guard" | "wing" | "big" | "hybrid";

// The 12 Archetype Court families (mandate 6.3). Codes are stable identifiers.
export type ArchetypeCode =
  | "scoring_guard" | "playmaking_guard" | "movement_shooter" | "wing_scorer"
  | "rim_pressure" | "hub_big" | "roll_big" | "rim_protector"
  | "three_and_d_stopper" | "connector" | "microwave_scorer" | "defensive_chaos";

// Court labels (mandate 6.3 / glossary).
export type CourtLabel =
  | "dream" | "eruption" | "plus_handicap_test" | "trap"
  | "role_amplifier" | "role_suppression" | "neutral" | "low_signal" | "high_burden";

// -----------------------------------------------------------------------------
// LAYER 1 — INPUTS
// -----------------------------------------------------------------------------

export interface Game {
  id: UUID;
  seasonId: UUID;
  gameDate: string;          // ISO date
  tipoffTs?: string;
  homeTeamId: UUID;
  awayTeamId: UUID;
  venue?: string;
  gameType: "regular" | "playoff" | "preseason" | "play_in";
  status: "scheduled" | "pregame" | "live" | "final" | "postponed" | "cancelled";
  homeScore?: number;
  awayScore?: number;
  homePossessions?: number;
  awayPossessions?: number;
}

export interface GameMarket {
  id: UUID;
  gameId: UUID;
  book: string;              // 'consensus' by default
  phase: "open" | "close" | "live";
  capturedTs: string;
  homeSpread?: number;       // negative = home favored
  total?: number;
  homeMoneyline?: number;
  awayMoneyline?: number;
  marketConfidence?: Confidence;
}

export interface PlayerProp {
  id: UUID;
  gameId: UUID;
  playerId: UUID;
  book: string;
  phase: "open" | "close" | "live";
  capturedTs: string;
  stat: PropStat;
  line: number;
  normalBaseline?: number;   // typical line for this player/stat
}

export interface StartingLineup {
  id: UUID;
  gameId: UUID;
  teamId: UUID;
  status: "projected" | "confirmed" | "final";
  confirmedTs?: string;
  source?: string;
  confidence: Confidence;
  playerIds: [UUID, UUID, UUID, UUID, UUID];
}

export interface BoxScoreLine {
  gameId: UUID; playerId: UUID; teamId: UUID;
  minutes?: number;
  pts?: number; reb?: number; ast?: number; stl?: number; blk?: number; tov?: number; pf?: number;
  fga?: number; fgm?: number; tpa?: number; tpm?: number; fta?: number; ftm?: number;
  plusMinus?: number; isStarter: boolean;
}

export interface PbpEvent {
  id: UUID; gameId: UUID; seq: number; period: number; gameClock?: string;
  teamId?: UUID; playerId?: UUID;
  eventType: "shot" | "free_throw" | "rebound" | "assist" | "turnover" | "foul"
    | "steal" | "block" | "substitution" | "jump_ball" | "timeout" | "period" | "other";
  shotMade?: boolean; shotValue?: 2 | 3;
  assistPlayerId?: UUID; reboundType?: "offensive" | "defensive";
  isTurnover?: boolean; isFoul?: boolean; ftMade?: number; ftAtt?: number;
  homeScore?: number; awayScore?: number; description?: string;
}

export interface Archetype {
  id: UUID; code: ArchetypeCode; name: string; roleFamily: RoleFamily;
  description?: string;
  propWeights?: Partial<Record<PropStat, number>>;     // weighting for prop-beat blend
  courtSensitivities?: Record<string, number>;         // court-feature -> sensitivity
}

// -----------------------------------------------------------------------------
// LAYER 2 — PAR / CONTEXT (derived expectations)
// -----------------------------------------------------------------------------

export interface Possession {
  id: UUID; gameId: UUID; seq: number;
  offTeamId: UUID; defTeamId: UUID; period: number;
  startType?: string; isTransition?: boolean; isHalfcourt?: boolean;
  isAto?: boolean; isBob?: boolean; isSlob?: boolean; hadOreb?: boolean;
  endedInTurnover?: boolean; points: number;
  expectedPpp?: number; courtRating?: number; courtSlope?: number;
  garbageWeight: number; leverageWeight: number;
  offPlayerIds?: UUID[]; defPlayerIds?: UUID[];
  formulaVersion?: string;
}

export interface TeamMarketCourt {
  gameId: UUID; teamId: UUID;
  impliedTeamTotal?: number;
  expectedPossessions?: number;
  marketPpp?: number;
  impliedWinProbability?: number;      // vig-removed
  marketExpectedNetRating?: number;
  courtType?: string;
  confidence?: Confidence;
  formulaVersion?: string;
}

// Per-stat numeric maps keyed by PropStat.
export type StatMap = Partial<Record<PropStat, number>>;

export interface PlayerCourtPar {
  gameId: UUID; playerId: UUID; archetypeId?: UUID;
  marketPar?: StatMap;
  envAdjustedPar?: StatMap;
  matchupTax?: StatMap;
  lineupAdjustedPar?: StatMap;
  shareOfTeamTotal?: number;
  expectedOnCourtPoss?: number;
  parPer100?: StatMap;
  courtFit?: number;            // 0..100
  courtDifficulty?: number;     // 0..100
  courtSlope?: number;
  courtLabel?: CourtLabel;
  roleBurden?: number;
  confidence?: Confidence;
  formulaVersion?: string;
}

// -----------------------------------------------------------------------------
// LAYER 3 — OUTCOME / HANDICAP
// -----------------------------------------------------------------------------

export interface TeamGameHandicap {
  gameId: UUID; teamId: UUID;
  actualNetRating?: number;
  marketExpectedNetRating?: number;
  courtDifficultyAdj?: number;
  teamCourtHandicap?: number;
  teamMarketBeat?: number;
  teamTotalBeat?: number;
  oppTotalSuppression?: number;
  confidence?: Confidence;
  formulaVersion?: string;
}

export interface PlayerPossessionValue {
  possessionId: UUID; playerId: UUID; side: SideOfBall;
  attributionWeight: number;    // sums to 1 per (possession, side)
  actualValue?: number; expectedValue?: number;
  courtDiff?: number; slopeAdj?: number; confidence?: Confidence;
}

// The five lambda components are kept separate forever; never flatten to one number.
export interface PlayerGameHandicap {
  gameId: UUID; playerId: UUID;
  marketPropBeatPer100?: number;
  possessionCourtBeatPer100?: number;
  roleBeatPer100?: number;
  teamMarketCreditPer100?: number;
  lineupFitCreditPer100?: number;
  courtSlope?: number;
  roleBurden?: number;
  rawHandicap?: number;
  confidence?: Confidence;
  prior?: number;
  shrunkHandicap?: number;      // the displayed number
  courtLabel?: CourtLabel;
  formulaVersion?: string;
}

export interface RoleHandicap {
  playerId: UUID; seasonId: UUID; roleName: string;
  rolePossessions: number; rolePar?: number; roleDiff?: number;
  roleHandicapIndex?: number; confidence?: Confidence;
}

export interface PlayerHandicapIndex {
  playerId: UUID; seasonId: UUID; asOfDate: string;
  possessionWeighted?: number; bestNofM?: number; seasonPrior?: number;
  blendedIndex?: number; confidence?: Confidence;
}

// -----------------------------------------------------------------------------
// CONFIDENCE — every number carries a breakdown (mandate 6.8). Visible as rings.
// -----------------------------------------------------------------------------

export interface ConfidenceBreakdown {
  sample: Confidence;
  market: Confidence;
  role: Confidence;
  attribution: Confidence;
  lineupContinuity: Confidence;
  dataIntegrity: Confidence;
  // composite is the product (or weighted product) of the above; clamped to [0,1].
  composite: Confidence;
}

// -----------------------------------------------------------------------------
// LAMBDA WEIGHTS — the master PCH blend (mandate 7). Config, not hardcoded.
// -----------------------------------------------------------------------------

export interface LambdaWeights {
  marketPropBeat: number;       // λ1
  possessionCourtBeat: number;  // λ2
  roleCourtBeat: number;        // λ3
  teamMarketCredit: number;     // λ4
  lineupFitCredit: number;      // λ5
}

// Phase-aware defaults (mandate: v1 vs v2-with-labels weights).
export const LAMBDA_V1: LambdaWeights = {
  marketPropBeat: 0.30, possessionCourtBeat: 0.40, roleCourtBeat: 0.10,
  teamMarketCredit: 0.15, lineupFitCredit: 0.05,
};
export const LAMBDA_V2_WITH_LABELS: LambdaWeights = {
  marketPropBeat: 0.20, possessionCourtBeat: 0.35, roleCourtBeat: 0.30,
  teamMarketCredit: 0.10, lineupFitCredit: 0.05,
};
