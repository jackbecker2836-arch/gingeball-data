// =============================================================================
// COURT HANDICAP — PHASE 2 FAKE GAME FIXTURE (repo-ready, typed)
//
// The single source of fake data for the /court-handicap/prototype route. Every
// Phase 2 component reads from here; nothing is hardcoded in a component. These
// shapes reuse the Phase 1 contracts in lib/types.ts so the same components will
// later accept REAL data with no shape change — only the source swaps.
//
// Court positions, archetype "lens" descriptors, and read-outs are PRESENTATION
// concerns (Phase 2 view-model), so they live in lightweight local types below
// rather than polluting the data contracts.
// =============================================================================

import type {
  Game, GameMarket, StartingLineup, PlayerProp, ArchetypeCode, CourtLabel, UUID, PropStat,
} from "../lib/types";

// ---- Phase 2 view-model types (presentation only) ---------------------------
export interface CourtPoint { x: number; y: number; }
export type CourtZoneName = "center" | "top" | "elbow" | "wing" | "corner" | "paint" | "sideline" | "baseline";

export interface ArchetypeLens {
  tint: string;
  headline: string;
  highlights: { zone: CourtZoneName; color: string; note: string }[];
  read: string[];
}

export interface FakePlayer {
  id: UUID;
  team: "X" | "Y";
  name: string;
  archetype: string;          // display archetype name
  archCode: ArchetypeCode;
  role: string;
  minutes: number;
  fit: number;                // Court Fit 0..100
  difficulty: number;         // Court Difficulty 0..100
  slope?: "Low" | "Medium" | "High";
  confidence: number;         // 0..1
  label: CourtLabel | string; // Court Label
  pos: CourtPoint;            // court anchor for the node
  zone: CourtZoneName;
  // full pregame->postgame conditions (only the studied player needs all of these):
  conditions?: Partial<{
    normalPar: number; marketPar: number; lineupPar: number; actual: number;
    expPoss: number; actPoss: number;
    // role-style conditions for non-scoring archetypes:
    roleClarity: string; spacingValue: string; defenseAssignment: string; boxSensitivity: string;
    oppImpliedTotal: number; rimPressureEnv: string; reboundOpp: string; deterrenceOpp: string;
  }>;
  lens?: ArchetypeLens;
}

export interface FakeSynergy { a: UUID; b: UUID; type: "offense" | "defense" | "hazard"; label: string; }

// ---- Fixture exports --------------------------------------------------------

export const fakeTeams = {
  X: { code: "X", name: "Team X" },
  Y: { code: "Y", name: "Team Y" },
};

export const fakeGame: Partial<Game> & { label: string; matchup: string; courtType: string } = {
  id: "fake-game",
  gameType: "regular",
  status: "final",
  label: "TONIGHT'S COURT",
  matchup: "Team X vs Team Y",
  courtType: "Low-Total Defensive Grind",
};

// Team X is home; spread negative = home favored.
export const fakeMarket: Partial<GameMarket> = {
  gameId: "fake-game",
  book: "consensus",
  phase: "close",
  homeSpread: -4,
  total: 202,
};

export const fakeLineupMetrics = {
  adjustedSpread: -4.4,   // Starting Lineup Court spread
  adjustedTotal: 194.2,   // Starting Lineup Court total
};

export const fakePlayers: FakePlayer[] = [
  {
    id: "x1", team: "X", name: "Star Scoring Guard", archetype: "Pressure-Rim Midrange Assassin",
    archCode: "scoring_guard", role: "Primary on-ball creator", minutes: 36,
    fit: 38, difficulty: 86, slope: "High", confidence: 0.74, label: "trap",
    pos: { x: 360, y: 300 }, zone: "top",
    conditions: { normalPar: 27.5, marketPar: 24.5, lineupPar: 23.1, actual: 29, expPoss: 66.5, actPoss: 67 },
    lens: {
      tint: "#C24A52", headline: "TRAP COURT",
      highlights: [
        { zone: "paint", color: "#C24A52", note: "Rim walled off — drives meet the Paint-Wall" },
        { zone: "top", color: "#9D6BFF", note: "POA Havoc Guard hounds the handle up top" },
        { zone: "wing", color: "#9D6BFF", note: "Non-shooter on the floor shrinks his pull-up space" },
      ],
      read: [
        "Market cut his points par 27.5 → 24.5 (10.9% suppression)",
        "Lineup shrinks par further to 23.1",
        "Court Fit 38 / Difficulty 86 — a Plus-Handicap Test",
      ],
    },
  },
  { id: "x2", team: "X", name: "Secondary Wing Creator", archetype: "Two-Way Wing Engine", archCode: "wing_scorer",
    role: "Secondary creation", minutes: 33, fit: 61, difficulty: 58, confidence: 0.6, label: "neutral", pos: { x: 300, y: 150 }, zone: "wing" },
  { id: "x3", team: "X", name: "Low-Usage 3-and-D Wing", archetype: "Wing-Stopper Spacing Blade", archCode: "three_and_d_stopper",
    role: "Spacing + POA defense", minutes: 30, fit: 70, difficulty: 49, confidence: 0.55, label: "role_amplifier", pos: { x: 130, y: 90 }, zone: "corner",
    conditions: { roleClarity: "Medium / High", spacingValue: "Important", defenseAssignment: "High leverage", boxSensitivity: "Low" },
    lens: { tint: "#4EA8DE", headline: "CONNECTOR VALUE WINDOW",
      highlights: [
        { zone: "corner", color: "#4EA8DE", note: "Corner spacing keeps the floor legal" },
        { zone: "wing", color: "#C24A52", note: "Drawn onto the toughest perimeter assignment" },
      ],
      read: ["Box score will under-rate him", "Value is spacing gravity + a high-leverage defensive matchup", "Judged on role execution, not points"] } },
  { id: "x4", team: "X", name: "Non-Shooting Defensive Forward", archetype: "Defensive Utility Forward", archCode: "defensive_chaos",
    role: "Help defense / glass", minutes: 26, fit: 52, difficulty: 55, confidence: 0.5, label: "neutral", pos: { x: 205, y: 440 }, zone: "elbow" },
  { id: "x5", team: "X", name: "Rim-Running Center", archetype: "Vertical Lob-and-Glass Anchor", archCode: "roll_big",
    role: "Roll gravity / rim run", minutes: 28, fit: 64, difficulty: 51, confidence: 0.57, label: "role_amplifier", pos: { x: 140, y: 320 }, zone: "paint" },
  { id: "y1", team: "Y", name: "Elite POA Stopper", archetype: "Point-of-Attack Havoc Guard", archCode: "three_and_d_stopper",
    role: "Ball pressure", minutes: 34, fit: 72, difficulty: 44, confidence: 0.66, label: "role_amplifier", pos: { x: 680, y: 300 }, zone: "top" },
  { id: "y2", team: "Y", name: "Big Wing Stopper", archetype: "Physical 3-and-D Wing", archCode: "three_and_d_stopper",
    role: "Wing defense", minutes: 32, fit: 67, difficulty: 47, confidence: 0.6, label: "neutral", pos: { x: 740, y: 150 }, zone: "wing" },
  { id: "y3", team: "Y", name: "Switch Forward", archetype: "Switchable Utility Forward", archCode: "connector",
    role: "Switch everything", minutes: 27, fit: 63, difficulty: 50, confidence: 0.55, label: "neutral", pos: { x: 850, y: 450 }, zone: "elbow" },
  {
    id: "y4", team: "Y", name: "Rim Protector", archetype: "Paint-Wall Rim Protector", archCode: "rim_protector",
    role: "Drop coverage / rim deterrence", minutes: 30, fit: 76, difficulty: 41, confidence: 0.68, label: "dream",
    pos: { x: 905, y: 320 }, zone: "paint",
    conditions: { oppImpliedTotal: 99, rimPressureEnv: "High", reboundOpp: "Elevated", deterrenceOpp: "Elevated" },
    lens: { tint: "#4EA8DE", headline: "RIM ANCHOR COURT",
      highlights: [
        { zone: "paint", color: "#4EA8DE", note: "Low total + rim pressure = a dream anchor court" },
        { zone: "corner", color: "#C2E84A", note: "Weak-side help windows open" },
      ],
      read: [
        "Opponent implied at 99 — a low-scoring, grind court",
        "Rim-pressure environment is HIGH: block + deterrence opportunity elevated",
        "Court Fit 76 — the same game that traps a scoring guard is a dream here",
      ] } },
  { id: "y5", team: "Y", name: "Low-Usage Spacer", archetype: "Corner Spacer Connector", archCode: "connector",
    role: "Corner spacing", minutes: 24, fit: 69, difficulty: 46, confidence: 0.52, label: "role_amplifier", pos: { x: 910, y: 110 }, zone: "corner" },
];

// Starting fives, typed to the Phase 1 contract (player ids point at fakePlayers).
export const fakeStartingLineups: Partial<StartingLineup>[] = [
  { gameId: "fake-game", status: "confirmed", confidence: 0.9, playerIds: ["x1", "x2", "x3", "x4", "x5"] as any },
  { gameId: "fake-game", status: "confirmed", confidence: 0.9, playerIds: ["y1", "y2", "y3", "y4", "y5"] as any },
];

export const fakeSynergies: FakeSynergy[] = [
  { a: "x1", b: "x5", type: "offense", label: "creator–roll synergy" },
  { a: "x1", b: "x3", type: "offense", label: "spacing dependency" },
  { a: "x1", b: "x4", type: "hazard", label: "spacing hazard (non-shooter)" },
  { a: "y1", b: "y4", type: "defense", label: "defensive chain (POA → rim)" },
];

// A sample of the studied player's props (drives market par).
export const fakePlayerCourtConditions: Partial<PlayerProp>[] = [
  { gameId: "fake-game", playerId: "x1", stat: "points" as PropStat, line: 24.5, normalBaseline: 27.5, phase: "close", book: "consensus" },
];

export const fakeOutcome = { stamp: "BEAT THE COURT", selectedPlayerId: "x1" as UUID };

export const fakePossessionsPreview = [
  { ppp: 1.42, exp: 0.98 }, { ppp: 0.0, exp: 1.05 }, { ppp: 1.18, exp: 1.10 },
  { ppp: 2.1, exp: 1.0 }, { ppp: 0.0, exp: 0.92 }, { ppp: 1.5, exp: 1.12 },
];
