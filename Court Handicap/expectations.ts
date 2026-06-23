// =============================================================================
// GINGEBALL COURT HANDICAP — AUDIT UNIVERSE: INTEGRITY GATES (Phase 11A)
//
// The named full-chain behaviors a messy-but-controlled synthetic basketball world
// must NOT be able to break. These are integrity gates, not unit tests — each spans
// layers (source -> engines -> confidence -> view -> ui -> motion -> provenance) and
// asserts the system stays honest from odds to verdict. The audit-runner maps every
// gate to a concrete assertion against the REAL chain.
//
// Centerpiece: Court Handicap behaves like Court Handicap in a fake world built to
// challenge it.
// =============================================================================

export type AuditLayer =
  | "market" | "lineup" | "archetype" | "proof" | "confidence"
  | "source" | "provenance" | "view" | "ui" | "motion" | "verdict";

export interface IntegrityGate {
  id: string;
  statement: string;
  layer: AuditLayer;
}

export const INTEGRITY_GATES: IntegrityGate[] = [
  { id: "market_stable",                statement: "market math holds at the canonical par",                         layer: "market" },
  { id: "stale_stays_stale",            statement: "a stale line is never labeled fresh or live",                    layer: "source" },
  { id: "fallback_never_live",          statement: "a fallback is never labeled live",                               layer: "source" },
  { id: "missing_ml_no_winprob",        statement: "a missing moneyline never invents a win probability",            layer: "source" },
  { id: "lineup_moves_par",             statement: "a lineup change moves lineupPar",                                 layer: "lineup" },
  { id: "archetype_differs_by_role",    statement: "archetype reads differ by role on the same court",               layer: "archetype" },
  { id: "same_court_two_truths",        statement: "the same court reads differently by role — harder/worse-fit for one, easier/better-fit for another", layer: "archetype" },
  { id: "thin_sample_lowers_confidence",statement: "a thin possession sample lowers confidence",                     layer: "confidence" },
  { id: "strong_verdict_low_confidence",statement: "a strong verdict can coexist with low confidence",               layer: "verdict" },
  { id: "whatif_no_overwrite",          statement: "a what-if never overwrites the real market state",               layer: "view" },
  { id: "synthetic_provenance_explicit",statement: "synthetic-audit provenance is always explicit",                  layer: "provenance" },
  { id: "motion_lock_held",             statement: "the 2D motion lock holds under the full chain",                  layer: "motion" },
  { id: "no_product_contamination",     statement: "the product path is never tagged synthetic-audit",               layer: "provenance" },

  // ---- Phase 11B: edge-case pressure + render-state contract -------------------
  { id: "crossing_court_two_truths",    statement: "one court crosses the line — guard hostile (>50), rim favorable (<50)", layer: "archetype" },
  { id: "injured_starter_degrades",     statement: "an injured starter moves lineupPar and lowers lineup confidence", layer: "lineup" },
  { id: "late_change_provisional",      statement: "a late lineup change stays provisional and lowers lineup confidence", layer: "confidence" },
  { id: "provider_failure_guarded",     statement: "a provider failure drops market confidence and invents no win prob", layer: "source" },
  { id: "extreme_lines_stable",         statement: "extreme spread/total keep the par math finite and the verdict resolved", layer: "market" },
  { id: "pace_moves_possessions",       statement: "fast pace yields more expected possessions than slow pace",      layer: "market" },
  { id: "render_thin_is_provisional",   statement: "a thin sample renders LOW/PROVISIONAL confidence treatment",     layer: "ui" },
  { id: "render_nonmodeled_is_estimate",statement: "a non-modeled archetype renders a fixture-estimate label, not engine", layer: "ui" },
];
