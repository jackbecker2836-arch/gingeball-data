// =============================================================================
// GINGEBALL COURT HANDICAP — FULL-SYSTEM AUDIT UNIVERSE (Phase 7)
//
// ⚠ synthetic_audit_fixture — a WIDER stress world than the 5B lab. Its job is to
// make the whole chain prove itself when basketball gets messy: hostile courts
// beaten and failed, favorable courts squandered, missing/stale/low-agreement
// odds, thin samples, non-modeled archetypes, and synthetic-vs-live provenance.
//
// Scenarios are declared as OVERRIDES on a canonical base plus BEHAVIORAL
// expectations (signs, orderings, labels) — never memorized numbers — so the
// audit tests behavior, not a frozen snapshot. The runner lives in
// lib/audit-harness.ts and flows each scenario through the real engines.
// =============================================================================

import type { InputProvenance } from "../lib/types";

export const AUDIT_PROVENANCE: InputProvenance = "synthetic_audit_fixture";

// raw possession line as compact groups: [count, points, pressure]
export type AuditPoss = [number, number, "clean" | "contested" | "hostile"];

export interface AuditScenario {
  id: string;
  label: string;
  // market
  spread: number; total: number;
  homeMoneyline?: number | null; awayMoneyline?: number | null;
  bookCount: number; bookAgreement: number;
  phase: "open" | "midweek" | "day_of" | "close";
  openSpread?: number; openTotal?: number;       // for movement / staleness framing
  // studied player
  normalPar: number; marketLine: number;
  // lineup signals (0..1)
  spacing: number; poa: number; rim: number; burden: number; synergy: number;
  lineupStatusConfidence: number;
  // archetype
  archetype: string;
  // possessions for the studied player (sum drives actual)
  possessions: AuditPoss[];
  expectedPossForPer100: number;                 // actual on-court poss (actual per-100 denominator)
  parPoss?: number;                              // par denominator (defaults to actual); production uses a slightly lower expected-poss for par
  // provenance for the model inputs
  provenance: InputProvenance;
  // missing-field injections (audited for honesty)
  marketMissingMoneylines?: boolean;
  // behavioral expectations
  expect: Partial<{
    verdictWord: "BEAT THE COURT" | "TRAPPED BY THE COURT" | "MET THE COURT";
    beatLineupSign: "pos" | "neg" | "zero";
    beatMarketSign: "pos" | "neg" | "zero";
    beatHostileCourt: boolean;
    courtTypeIncludes: string;
    archetypeModeled: boolean;
    provisional: boolean;
    winProbAvailable: boolean;
    finalConfidenceBelow: number;
    finalConfidenceAbove: number;
    note: string;
  }>;
}

// ---- canonical base (the happy path the rest deviate from) ------------------
const BASE = {
  spread: -4, total: 202, homeMoneyline: -180, awayMoneyline: 150,
  bookCount: 3, bookAgreement: 0.92, phase: "close" as const, openSpread: -3, openTotal: 200,
  normalPar: 27.5, marketLine: 24.5,
  spacing: 0.72, poa: 0.85, rim: 0.78, burden: 0.62, synergy: 0.40, lineupStatusConfidence: 0.9,
  archetype: "scoring_guard",
  expectedPossForPer100: 67,
  provenance: AUDIT_PROVENANCE,
};

// a possession line summing to `pts` points across `poss` possessions, with a
// share marked hostile — keeps scenarios terse while staying basketball-shaped.
function line(pts: number, poss: number, hostileShare = 0.4): AuditPoss[] {
  const made2 = Math.floor(pts / 2);
  const leftover = pts - made2 * 2;                  // 0 or 1 -> a free throw
  const scoringPoss = made2 + (leftover ? 1 : 0);
  const misses = Math.max(0, poss - scoringPoss);
  const hostileMisses = Math.round(misses * hostileShare);
  const out: AuditPoss[] = [];
  out.push([made2, 2, "hostile"]);
  if (leftover) out.push([1, 1, "hostile"]);
  if (hostileMisses) out.push([hostileMisses, 0, "hostile"]);
  if (misses - hostileMisses) out.push([misses - hostileMisses, 0, "contested"]);
  return out;
}

export const auditScenarios: AuditScenario[] = [
  { ...BASE, id: "canonical", label: "Canonical: hostile court, guard beats it",
    parPoss: 66.5, possessions: line(29, 67), expect: {
      verdictWord: "BEAT THE COURT", beatLineupSign: "pos", beatMarketSign: "pos",
      beatHostileCourt: true, courtTypeIncludes: "grind", archetypeModeled: true,
      provisional: true, winProbAvailable: true,
      finalConfidenceAbove: 0.5, finalConfidenceBelow: 0.7,
      note: "the reference chain — 103·99 / 24.5 / 23.1 / +8.6; confidence now MEDIUM after 7B calibration",
    } },

  { ...BASE, id: "hostile_fail", label: "Hostile court, guard FAILS it",
    possessions: line(18, 67), expect: {
      verdictWord: "TRAPPED BY THE COURT", beatLineupSign: "neg", beatMarketSign: "neg",
      beatHostileCourt: false, archetypeModeled: true,
      note: "low output on a hostile court -> trapped; difficulty alone never decides the verdict",
    } },

  { ...BASE, id: "favorable_underperform", label: "Favorable court, guard still underperforms",
    spacing: 0.2, poa: 0.25, rim: 0.2, burden: 0.3, synergy: 0.8, marketLine: 27.0,
    possessions: line(22, 67), expect: {
      beatLineupSign: "neg", archetypeModeled: true,
      note: "an easy court does NOT guarantee a beat — proof can still come in under par",
    } },

  { ...BASE, id: "lose_market_beat_lineup", label: "Loses market par, beats lineup par",
    possessions: line(24, 67), expect: {
      beatLineupSign: "pos", beatMarketSign: "neg",
      note: "actual between lineup par and market par per-100; the two bases disagree honestly",
    } },

  { ...BASE, id: "lineup_helps", label: "Lineup HELPS (par rises above market)",
    spacing: 0.1, poa: 0.1, rim: 0.1, burden: 0.2, synergy: 0.95,
    possessions: line(26, 67), expect: {
      note: "negative suppression -> lineupPar > marketPar; audits the mirror ordering case",
    } },

  { ...BASE, id: "thin_sample", label: "Thin possession sample",
    possessions: line(8, 14), expectedPossForPer100: 14, expect: {
      finalConfidenceBelow: 0.45,
      note: "few possessions -> proof confidence collapses -> final drops",
    } },

  { ...BASE, id: "missing_moneylines", label: "Missing moneylines",
    homeMoneyline: null, awayMoneyline: null, marketMissingMoneylines: true,
    possessions: line(29, 67), expect: {
      winProbAvailable: false,
      note: "no moneylines -> win probability must be named missing, not invented",
    } },

  { ...BASE, id: "low_book_agreement", label: "Low book agreement",
    bookCount: 2, bookAgreement: 0.45,
    possessions: line(29, 67), expect: {
      finalConfidenceBelow: 0.45,
      note: "thin, disagreeing books -> lower market confidence -> lower final",
    } },

  { ...BASE, id: "stale_steam", label: "Stale-ish line with heavy steam",
    phase: "day_of", openSpread: -1, openTotal: 196,
    possessions: line(29, 67), expect: {
      courtTypeIncludes: "grind",
      note: "big movement from open -> steamed; movement stays real even as line is what-if",
    } },

  { ...BASE, id: "rim_protector", label: "Same court, rim protector (inversion)",
    archetype: "rim_protector",
    possessions: line(14, 40), expectedPossForPer100: 40, expect: {
      archetypeModeled: true,
      note: "the big experiences the SAME court differently (fit up / difficulty down)",
    } },

  { ...BASE, id: "non_modeled", label: "Non-modeled archetype (connector)",
    archetype: "connector",
    possessions: line(16, 45), expectedPossForPer100: 45, expect: {
      archetypeModeled: false,
      note: "no model yet -> modeled:false, named pending; chain still produces a guarded read",
    } },

  { ...BASE, id: "clean_modest", label: "Cleaner (live-like) inputs, ordinary verdict",
    provenance: "live", bookAgreement: 0.97, lineupStatusConfidence: 0.97,
    possessions: line(25, 67), expect: {
      provisional: false, finalConfidenceAbove: 0.55,
      note: "live-like provenance + ordinary beat -> higher, non-provisional confidence",
    } },

  // ---- Phase 11B edge cases (each asserts BEHAVIOR; cross-scenario claims live
  //      in the audit-universe runner where they can be compared) ---------------

  // 50-CROSSING COURT — one court, two truths. Low spacing + low total makes the
  // floor HOSTILE for the guard (cramped, defensive grind) yet FAVORABLE for the
  // rim protector (uncongested paint, low-total grind value). IDENTICAL court inputs.
  { ...BASE, id: "cross_guard", label: "Crossing court — guard side",
    spread: -2, total: 190, spacing: 0.28, poa: 0.93, rim: 0.9, burden: 0.68, synergy: 0.28,
    possessions: line(26, 64), expectedPossForPer100: 64,
    expect: { note: "low spacing + low total -> guard difficulty should read hostile (>50)" } },
  { ...BASE, id: "cross_rim", label: "Crossing court — rim protector side",
    archetype: "rim_protector",
    spread: -2, total: 190, spacing: 0.28, poa: 0.93, rim: 0.9, burden: 0.68, synergy: 0.28,
    possessions: line(12, 40), expectedPossForPer100: 40,
    expect: { note: "SAME court -> rim difficulty should read favorable (<50)" } },

  // INJURED STARTER REMOVED — lineup signals degrade, status confidence drops.
  { ...BASE, id: "injured_starter", label: "Injured starter removed",
    spacing: 0.55, poa: 0.85, rim: 0.74, burden: 0.76, synergy: 0.26, lineupStatusConfidence: 0.55,
    possessions: line(27, 67),
    expect: { note: "starter out -> lineupPar shifts, lineup confidence drops, verdict stays guarded" } },

  // LATE LINEUP CHANGE — projected lineup, lower status confidence.
  { ...BASE, id: "late_lineup_change", label: "Late lineup change (projected)",
    synergy: 0.34, burden: 0.70, lineupStatusConfidence: 0.6, possessions: line(27, 67),
    expect: { provisional: true, note: "projected lineup -> lower lineup confidence, provisional verdict" } },

  // PROVIDER FAILURE — market read degraded (no moneylines, thin book agreement).
  { ...BASE, id: "provider_failure", label: "Provider failure (degraded market read)",
    marketMissingMoneylines: true, bookCount: 1, bookAgreement: 0.5, possessions: line(27, 67),
    expect: { winProbAvailable: false, note: "degraded provider -> no win prob, lower market confidence" } },

  // EXTREME SPREAD / TOTAL — the par math must stay stable + finite.
  { ...BASE, id: "extreme_spread", label: "Extreme spread (blowout line)",
    spread: -16.5, total: 232, possessions: line(31, 74), expectedPossForPer100: 74,
    expect: { note: "blowout line -> court math stays stable, verdict still resolves" } },
  { ...BASE, id: "extreme_total", label: "Extreme total (track meet)",
    spread: -3, total: 252, possessions: line(33, 78), expectedPossForPer100: 78,
    expect: { note: "very high total -> more possessions, not a grind" } },

  // PACE — fast vs slow change the possession base.
  { ...BASE, id: "fast_pace", label: "Fast pace (high total)",
    total: 236, possessions: line(31, 76), expectedPossForPer100: 76,
    expect: { note: "fast pace -> more expected possessions" } },
  { ...BASE, id: "slow_pace", label: "Slow pace (low-total grind)",
    total: 186, possessions: line(23, 60), expectedPossForPer100: 60,
    expect: { courtTypeIncludes: "grind", note: "slow pace -> fewer possessions, grind court" } },
];

// the same canonical chain expressed as synthetic vs live, for the provenance
// double-counting measurement (run side by side in the harness).
export const provenancePair = {
  synthetic: { ...BASE, id: "prov_synthetic", label: "Provenance probe (synthetic)", possessions: line(29, 67), expect: {} },
  live: { ...BASE, id: "prov_live", label: "Provenance probe (live)", provenance: "live" as InputProvenance, possessions: line(29, 67), expect: {} },
};
