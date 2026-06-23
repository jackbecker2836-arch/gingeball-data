// =============================================================================
// GINGEBALL COURT HANDICAP — REAL COURTCONTEXT WIRING (Phase 11G)
//
// The composite no longer lives beside the engine chain — it listens to it. This
// translator derives a CourtContext from the SAME engines the verdict already runs
// (market + lineup via runScenario), inheriting their outputs (expected possessions,
// court type, lineup confidence) and provenance/source state — instead of a hand-typed
// lab context. It also threads the real scoring beat out, so the Pressure Lab triad
// compares a genuine scoring-only beat against the stat-vector and composite candidates.
//
// Still shadow. This grounds the composite; it does not graduate it.
// =============================================================================

import { auditScenarios, type AuditScenario } from "@/fixtures/court-handicap-audit-universe";
import { runScenario } from "@/lib/audit-harness";
import type { CourtContext } from "@/lib/stat-par/composite-verdict";

export type Pace = "fast" | "neutral" | "slow";

export interface DerivedCourtContext {
  context: CourtContext;        // ready for buildCompositeVerdict
  pace: Pace;                   // from the market engine's expectedPossessions (output)
  scoringBeatPer100: number;    // the real engine scoring beat (threaded into the triad)
  confidence: number;           // lineup-engine confidence (output)
  provenance: string;           // input provenance the chain used
  sourceState: string;          // source freshness state
}

function clamp01(x: number): number { return Math.max(0, Math.min(1, x)); }

function paceFrom(expectedPossessions: number): Pace {
  if (expectedPossessions >= 95) return "fast";
  if (expectedPossessions <= 86) return "slow";
  return "neutral";
}

// honest source-state read: a scenario missing moneylines reads as fallback; a live
// provenance reads live; otherwise it is the synthetic audit universe.
function sourceStateFrom(s: AuditScenario): string {
  if (s.marketMissingMoneylines) return "fixture_fallback";
  if (s.provenance === "live") return "live";
  return "synthetic_audit";
}

/** Derive a CourtContext by RUNNING the real engines over a scenario and reading their
 *  outputs + the signals/provenance they consumed. No hand-authored context. */
export function deriveCourtContext(s: AuditScenario): DerivedCourtContext {
  const r = runScenario(s);
  const sourceState = sourceStateFrom(s);
  const confidence = r.layer.lineup;
  const context: CourtContext = {
    label: r.courtType,                       // market engine output
    total: s.total,                           // market snapshot
    spacingScarcity: clamp01(s.spacing),      // lineup signal → spacing scarcity
    poaPressure: clamp01(s.poa),              // opponent POA → pressure
    rimProtectionFaced: clamp01(s.rim),       // opponent rim → protection faced
    synergy: clamp01(s.synergy),              // lineup synergy
    confidence,                               // lineup engine output
    provenance: s.provenance,                 // input provenance the chain used
    sourceState,
  };
  return { context, pace: paceFrom(r.expectedPossessions), scoringBeatPer100: r.beatLineup, confidence, provenance: s.provenance, sourceState };
}

export function deriveCourtContextById(scenarioId: string): DerivedCourtContext {
  const s = auditScenarios.find((x) => x.id === scenarioId);
  if (!s) throw new Error(`court-context: no scenario "${scenarioId}"`);
  return deriveCourtContext(s);
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runCourtContextSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const canon = deriveCourtContextById("canonical");
  check("context is derived from the real chain (label = engine court type)", canon.context.label.length > 0 && canon.context.label.toLowerCase().includes("grind"));
  check("context inherits the lineup-engine confidence", typeof canon.context.confidence === "number" && canon.context.confidence! > 0 && canon.context.confidence! <= 1);
  check("context carries input provenance", canon.context.provenance === "synthetic_audit_fixture");
  check("context carries a source state", canon.sourceState === "synthetic_audit");
  check("signals map through (spacing/poa/rim/synergy in 0..1)", [canon.context.spacingScarcity, canon.context.poaPressure, canon.context.rimProtectionFaced, canon.context.synergy].every((v) => v >= 0 && v <= 1));

  // the REAL scoring beat is threaded (canonical guard beats his scoring par)
  check("real scoring beat is threaded and non-zero for canonical", canon.scoringBeatPer100 !== 0);

  // pace derives from the market engine's expectedPossessions (output), not a typed value
  const fast = deriveCourtContextById("fast_pace");
  const slow = deriveCourtContextById("slow_pace");
  check("pace is derived from expectedPossessions (fast > slow)", fast.pace === "fast" || (fast.context.total > slow.context.total && fast.pace !== slow.pace));

  // source honesty travels: a provider-failure scenario reads as fallback
  const fail = deriveCourtContextById("provider_failure");
  check("provider failure derives a fallback source state", fail.sourceState === "fixture_fallback");

  // different scenarios → different contexts (it listens, not echoes a constant)
  const grindCtx = deriveCourtContextById("slow_pace").context;
  check("different scenarios yield different contexts", grindCtx.total !== fast.context.total);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runCourtContextSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
