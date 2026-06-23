// =============================================================================
// GINGEBALL COURT HANDICAP — METRIC REGISTRY (Phase 1)
//
// Single source of truth for EVERY metric the system can show. The CourtGraph
// reads this to know where a metric lives on the semantic court, what color
// family it belongs to, how it renders, and which formula produced it. This is
// the answer to "how do we graph thousands of metrics" — each metric declares
// its own visual identity; the renderer never hardcodes positions.
//
// Mandate rule: no metric appears in the UI without a registry entry + glossary.
// =============================================================================

import type { PropStat } from "./types";

export type MetricFamily =
  | "market" | "lineup" | "archetype" | "player"
  | "possession" | "role" | "team" | "confidence";

// Semantic CourtGraph zones (mandate sec. 8).
export type CourtZone =
  | "center"     // Market Court
  | "top"        // creation burden
  | "elbow"      // decision nodes
  | "wing"       // matchup pressure
  | "corner"     // spacing / low-usage value
  | "paint"      // rim pressure / protection / glass
  | "sideline"   // rest / venue / conditions
  | "baseline";  // result vs par

export type EntityLevel = "team" | "lineup" | "player" | "role" | "possession";
export type RenderAs = "node" | "edge" | "rail" | "field" | "stamp" | "trail" | "ring" | "glyph";
export type Unit = "points" | "per100" | "percent" | "probability" | "zscore" | "rating" | "count";
export type Polarity = "goodHigh" | "badHigh" | "neutral";
export type Phase = "pregame" | "live" | "postgame" | "season";

// Visual family -> color token (semantic, not literal hex; resolved by the theme).
export const FAMILY_COLOR: Record<MetricFamily, string> = {
  market: "scoreboard-amber",
  lineup: "blueprint-blue",
  archetype: "bone",
  player: "ember",
  possession: "blueprint-blue",
  role: "lime-chalk",
  team: "ember",
  confidence: "chalk",
};

export interface MetricSpec {
  id: string;                 // stable metric id, e.g. 'mkt.implied_team_total'
  family: MetricFamily;
  label: string;              // display label
  description: string;
  unit: Unit;
  polarity: Polarity;
  entityLevel: EntityLevel;
  courtZone: CourtZone;
  renderAs: RenderAs;
  formulaId?: string;         // cross-references lib/formula-registry.ts
  phase: Phase;
  glossaryKey: string;        // cross-references docs/CANON.md
  status: "active" | "scaffold";
}

export const METRIC_REGISTRY: MetricSpec[] = [
  // --- Market Court ---
  { id: "mkt.implied_team_total", family: "market", label: "Implied Team Total",
    description: "Market-implied points for a team, from total + spread.",
    unit: "points", polarity: "neutral", entityLevel: "team", courtZone: "center",
    renderAs: "node", formulaId: "CH-MKT-001", phase: "pregame", glossaryKey: "implied-team-total", status: "active" },
  { id: "mkt.expected_possessions", family: "market", label: "Expected Possessions",
    description: "Market-implied per-team pace.",
    unit: "count", polarity: "neutral", entityLevel: "team", courtZone: "center",
    renderAs: "rail", formulaId: "CH-MKT-002", phase: "pregame", glossaryKey: "expected-possessions", status: "active" },
  { id: "mkt.market_ppp", family: "market", label: "Market PPP",
    description: "Implied points per possession.",
    unit: "rating", polarity: "neutral", entityLevel: "team", courtZone: "center",
    renderAs: "glyph", formulaId: "CH-MKT-003", phase: "pregame", glossaryKey: "market-ppp", status: "active" },
  { id: "mkt.prop_suppression", family: "market", label: "Prop Suppression",
    description: "How far a player's line is cut from baseline.",
    unit: "percent", polarity: "neutral", entityLevel: "player", courtZone: "top",
    renderAs: "field", formulaId: "CH-MKT-005", phase: "pregame", glossaryKey: "prop-suppression", status: "active" },
  { id: "mkt.matchup_tax", family: "market", label: "Matchup Tax",
    description: "Player-specific suppression beyond the team environment.",
    unit: "points", polarity: "badHigh", entityLevel: "player", courtZone: "wing",
    renderAs: "field", formulaId: "CH-MKT-006", phase: "pregame", glossaryKey: "matchup-tax", status: "active" },
  { id: "mkt.win_probability", family: "market", label: "Win Probability",
    description: "Vig-removed implied win probability.",
    unit: "probability", polarity: "goodHigh", entityLevel: "team", courtZone: "center",
    renderAs: "node", formulaId: "CH-MKT-007", phase: "pregame", glossaryKey: "win-probability", status: "active" },

  // --- Starting Lineup Court ---
  { id: "lineup.spread_adjustment", family: "lineup", label: "Lineup Spread Adjustment",
    description: "How much the confirmed starters bend the spread.",
    unit: "points", polarity: "neutral", entityLevel: "lineup", courtZone: "center",
    renderAs: "rail", phase: "pregame", glossaryKey: "lineup-spread-adjustment", status: "scaffold" },
  { id: "lineup.spacing_score", family: "lineup", label: "Lineup Spacing Score",
    description: "Floor spacing the five-man unit provides.",
    unit: "rating", polarity: "goodHigh", entityLevel: "lineup", courtZone: "corner",
    renderAs: "field", phase: "pregame", glossaryKey: "lineup-spacing", status: "scaffold" },
  { id: "lineup.synergy_edge", family: "lineup", label: "Synergy Edge",
    description: "Value created by player combinations (graph edges).",
    unit: "rating", polarity: "goodHigh", entityLevel: "lineup", courtZone: "top",
    renderAs: "edge", phase: "pregame", glossaryKey: "synergy-edge", status: "scaffold" },

  // --- Archetype / Player Court ---
  { id: "player.court_fit", family: "archetype", label: "Court Fit",
    description: "0-100 compatibility of the court with the player's archetype.",
    unit: "rating", polarity: "goodHigh", entityLevel: "player", courtZone: "top",
    renderAs: "ring", phase: "pregame", glossaryKey: "court-fit", status: "scaffold" },
  { id: "player.court_difficulty", family: "archetype", label: "Court Difficulty",
    description: "0-100 difficulty of the assignment.",
    unit: "rating", polarity: "badHigh", entityLevel: "player", courtZone: "paint",
    renderAs: "field", phase: "pregame", glossaryKey: "court-difficulty", status: "scaffold" },
  { id: "player.court_slope", family: "archetype", label: "Court Slope",
    description: "How much the context separates elite from replacement.",
    unit: "rating", polarity: "neutral", entityLevel: "player", courtZone: "top",
    renderAs: "ring", formulaId: "CH-POS-002", phase: "pregame", glossaryKey: "court-slope", status: "scaffold" },
  { id: "player.par_per_100", family: "player", label: "Par per 100",
    description: "Court par for a stat, per 100 on-court possessions.",
    unit: "per100", polarity: "neutral", entityLevel: "player", courtZone: "baseline",
    renderAs: "glyph", formulaId: "CH-PLR-001", phase: "pregame", glossaryKey: "court-par", status: "active" },
  { id: "player.court_beat_per_100", family: "player", label: "Player Court Beat",
    description: "Actual minus court par, per 100.",
    unit: "per100", polarity: "goodHigh", entityLevel: "player", courtZone: "baseline",
    renderAs: "stamp", formulaId: "CH-PLR-003", phase: "postgame", glossaryKey: "beat-the-court", status: "active" },
  { id: "player.court_handicap", family: "player", label: "Player Court Handicap",
    description: "The composite five-lambda handicap (shrunk).",
    unit: "per100", polarity: "goodHigh", entityLevel: "player", courtZone: "baseline",
    renderAs: "stamp", formulaId: "CH-PCH-001", phase: "postgame", glossaryKey: "player-court-handicap", status: "scaffold" },

  // --- Possession Court ---
  { id: "poss.differential", family: "possession", label: "Possession Court Differential",
    description: "Actual minus expected points on a possession.",
    unit: "points", polarity: "goodHigh", entityLevel: "possession", courtZone: "paint",
    renderAs: "trail", formulaId: "CH-POS-001", phase: "live", glossaryKey: "possession-par", status: "scaffold" },

  // --- Role Court ---
  { id: "role.handicap_index", family: "role", label: "Role Court Handicap",
    description: "Value above role par for a specific basketball job.",
    unit: "per100", polarity: "goodHigh", entityLevel: "role", courtZone: "wing",
    renderAs: "stamp", phase: "season", glossaryKey: "role-court-handicap", status: "scaffold" },

  // --- Team Court ---
  { id: "team.court_handicap", family: "team", label: "Team Court Handicap",
    description: "Actual net rating minus market-implied, court-adjusted.",
    unit: "per100", polarity: "goodHigh", entityLevel: "team", courtZone: "baseline",
    renderAs: "stamp", formulaId: "CH-TEAM-001", phase: "postgame", glossaryKey: "team-court-handicap", status: "active" },
  { id: "team.market_beat", family: "team", label: "Team Market Beat",
    description: "Actual margin minus spread-implied margin.",
    unit: "points", polarity: "goodHigh", entityLevel: "team", courtZone: "baseline",
    renderAs: "stamp", formulaId: "CH-TEAM-001", phase: "postgame", glossaryKey: "team-market-beat", status: "active" },

  // --- Confidence ---
  { id: "conf.composite", family: "confidence", label: "Confidence",
    description: "Composite trust in a number; rendered as ring completeness.",
    unit: "probability", polarity: "goodHigh", entityLevel: "player", courtZone: "baseline",
    renderAs: "ring", formulaId: "CH-CONF-002", phase: "postgame", glossaryKey: "confidence-ring", status: "active" },
];

// Lookup helpers used by the renderer.
export const metricById = (id: string) => METRIC_REGISTRY.find((m) => m.id === id);
export const metricsByZone = (zone: CourtZone) => METRIC_REGISTRY.filter((m) => m.courtZone === zone);
export const metricsByFamily = (f: MetricFamily) => METRIC_REGISTRY.filter((m) => m.family === f);
