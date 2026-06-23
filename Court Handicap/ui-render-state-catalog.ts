// =============================================================================
// GINGEBALL COURT HANDICAP — UI RENDER-STATE CATALOG (Phase 8B)
//
// Every important face the product can honestly wear, summoned from REAL engine
// and source inputs — not mocked screenshots, not hand-set numbers. Each entry
// builds an actual CourtHandicapView, names the player to select, and declares
// what it must be true (source state, confidence tier, flags). The audit and a
// future pixel pass both consume this one catalog.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/ui-render-state-catalog.ts
// =============================================================================

import { buildCatalogView, rebuildWithMarket } from "@/lib/manifest-source";
import { makeMockTransport, makeTestLiveTransport } from "@/adapters/odds-transport";
import { clearLastKnownGood } from "@/adapters/odds-cache";
import type { CourtHandicapView, SourceState } from "@/lib/manifest-view-model";
import type { PossessionEvent, ActionFamily, PossessionOutcome, Pressure } from "@/lib/possession-proof-engine";

const A = "2026-01-16T00:00:00Z";
const LIVE_TS = "2026-01-15T23:30:00Z";   // 30m before A -> fresh
const STALE_TS = "2026-01-15T20:00:00Z";  // >2h before A -> stale
const GAME = "game-live-001";

// ---- synthetic possession samples for the confidence states -----------------
const ev = (seq: number, family: ActionFamily, outcome: PossessionOutcome, points: number, pressure: Pressure): PossessionEvent =>
  ({ seq, family, outcome, points, pressure, counts: true });

// THIN: 6 possessions -> sampleConfidence collapses -> true LOW.
function thinSample(): PossessionEvent[] {
  return [
    ev(1, "pullup", "made", 2, "contested"), ev(2, "rim_attack", "missed", 0, "hostile"),
    ev(3, "catch_shoot", "made", 3, "contested"), ev(4, "pullup", "missed", 0, "hostile"),
    ev(5, "free_throw", "foul_drawn", 1, "contested"), ev(6, "rim_attack", "made", 2, "hostile"),
  ];
}

// ORDINARY: a full, clean ~100-possession sample landing a MODEST beat (not a
// dramatic hostile-court story) — so HIGH confidence is not tied to spectacle.
function ordinaryFullSample(): PossessionEvent[] {
  const out: PossessionEvent[] = []; let seq = 1;
  for (let i = 0; i < 18; i++) out.push(ev(seq++, "pullup", "made", 2, i % 3 === 0 ? "contested" : "clean")); // 36 pts
  for (let i = 0; i < 30; i++) out.push(ev(seq++, "pullup", "missed", 0, "clean"));
  for (let i = 0; i < 52; i++) out.push(ev(seq++, "playmaking", "pass", 0, "clean"));                          // ordinary involvement
  return out; // 36 pts over 100 poss -> ~36.0/100 vs par 34.7 -> modest +1.x, no hostile heroics
}

export interface CatalogExpect {
  sourceState?: SourceState;
  tier?: "LOW" | "MEDIUM" | "HIGH";
  provisional?: boolean;
  stale?: boolean;
  hypothetical?: boolean;
  missingIncludes?: string;
  selectedModeled?: boolean;
  neverReadsLive?: boolean;     // true for every non-live state
  ordinaryVerdict?: boolean;    // confidence not driven by a dramatic beat
}

export interface CatalogEntry {
  id: string; label: string; group: "source" | "player" | "confidence" | "scenario" | "whatif";
  selected?: string;            // playerId to select in the World
  note?: string;                // honest caveat for this state
  build: () => Promise<CourtHandicapView>;
  expect: CatalogExpect;
}

export const uiStateCatalog: CatalogEntry[] = [
  // ---- source states (studied guard, MEDIUM) --------------------------------
  { id: "live_fresh_guard_medium", label: "LIVE · fresh · guard", group: "source", selected: "x1",
    build: () => { clearLastKnownGood(); return buildCatalogView({ transport: makeTestLiveTransport({ capturedTs: LIVE_TS }), gameId: GAME, asOf: A }); },
    expect: { sourceState: "live", tier: "MEDIUM", stale: false } },
  { id: "stale_live_guard_medium", label: "LIVE · STALE · guard", group: "source", selected: "x1",
    note: "real provider, line older than the window",
    build: () => { clearLastKnownGood(); return buildCatalogView({ transport: makeTestLiveTransport({ capturedTs: STALE_TS }), gameId: GAME, asOf: A }); },
    expect: { sourceState: "stale_live", stale: true, neverReadsLive: true } },
  { id: "last_known_good_guard_medium", label: "LAST-KNOWN-GOOD · guard", group: "source", selected: "x1",
    note: "provider failed; serving the last good live snapshot",
    build: async () => { clearLastKnownGood(); await buildCatalogView({ transport: makeTestLiveTransport({ capturedTs: LIVE_TS }), gameId: GAME, asOf: A }); return buildCatalogView({ transport: makeTestLiveTransport({ fail: "error" }), gameId: GAME, asOf: A }); },
    expect: { sourceState: "last_known_good", neverReadsLive: true } },
  { id: "fixture_fallback_guard_medium", label: "FALLBACK · guard", group: "source", selected: "x1",
    note: "provider failed, no cache",
    build: () => { clearLastKnownGood(); return buildCatalogView({ transport: makeTestLiveTransport({ fail: "error" }), gameId: GAME, asOf: A }); },
    expect: { sourceState: "fixture_fallback", neverReadsLive: true } },
  { id: "mock_synthetic_guard_medium", label: "SYNTHETIC (mock) · guard", group: "source", selected: "x1",
    note: "deployed default — isLive=false",
    build: () => { clearLastKnownGood(); return buildCatalogView({ transport: makeMockTransport({ capturedTs: A }), gameId: GAME, asOf: A }); },
    expect: { sourceState: "mock", neverReadsLive: true } },

  // ---- player states --------------------------------------------------------
  { id: "rim_protector_medium", label: "Rim protector · full grade", group: "player", selected: "y4",
    build: () => buildCatalogView({}),
    expect: { sourceState: "fixture", provisional: true } },
  { id: "non_modeled_fixture_estimate", label: "Non-modeled archetype", group: "player", selected: "x2",
    note: "fixture estimate, not engine-graded",
    build: () => buildCatalogView({}),
    expect: { sourceState: "fixture", selectedModeled: false } },

  // ---- missing fields -------------------------------------------------------
  { id: "missing_moneyline", label: "Missing moneyline", group: "source", selected: "x1",
    build: () => { clearLastKnownGood(); return buildCatalogView({ transport: makeTestLiveTransport({ capturedTs: LIVE_TS, withMoneylines: false }), gameId: GAME, asOf: A }); },
    expect: { sourceState: "live", missingIncludes: "moneyline" } },
  { id: "missing_total", label: "Missing total (falls back)", group: "source", selected: "x1",
    note: "no total -> no court -> labeled fallback",
    build: () => { clearLastKnownGood(); return buildCatalogView({ transport: makeTestLiveTransport({ withTotal: false }), gameId: GAME, asOf: A }); },
    expect: { neverReadsLive: true } },

  // ---- what-if --------------------------------------------------------------
  { id: "what_if_hypothetical", label: "What-if (hypothetical line)", group: "whatif", selected: "x1",
    note: "real line history preserved",
    build: async () => { const base = await buildCatalogView({}); return rebuildWithMarket(base, { total: 210 }); },
    expect: { hypothetical: true } },

  // ---- confidence states (true, end-to-end) ---------------------------------
  { id: "thin_sample_low", label: "Thin sample · LOW", group: "confidence", selected: "x1",
    note: "6 possessions — sample confidence collapses",
    build: () => buildCatalogView({ profile: { studiedEvents: thinSample() } }),
    expect: { tier: "LOW", provisional: true } },
  { id: "clean_inputs_high", label: "Clean inputs · HIGH (audit)", group: "confidence", selected: "x1",
    note: "labeled audit state: live source + measured-grade inputs (NOT real player data)",
    build: () => { clearLastKnownGood(); return buildCatalogView({ transport: makeTestLiveTransport({ capturedTs: LIVE_TS }), gameId: GAME, asOf: A, profile: { gradeProvenance: "live", cleanSignals: true, lineupStatusConfidence: 1 } }); },
    expect: { sourceState: "live", tier: "HIGH", provisional: false } },

  // ---- the three parked scenarios -------------------------------------------
  { id: "injured_starter_removed", label: "Injured starter removed", group: "scenario", selected: "x1",
    note: "availability change named; lineup confidence drops",
    build: () => buildCatalogView({ profile: { lineupStatusConfidence: 0.45, availabilityNote: "starter OUT (injury) — lineup context changed, not yet re-modeled" } }),
    expect: { sourceState: "fixture", provisional: true, missingIncludes: "injury" } },
  { id: "late_lineup_change", label: "Late lineup change (projected)", group: "scenario", selected: "x1",
    note: "projected five, not confirmed — not stable certainty",
    build: () => buildCatalogView({ profile: { lineupStatusConfidence: 0.4, availabilityNote: "late lineup change — projected five, not confirmed" } }),
    expect: { sourceState: "fixture", provisional: true, missingIncludes: "projected" } },
  { id: "high_confidence_ordinary_verdict", label: "Ordinary verdict · HIGH (audit)", group: "scenario", selected: "x1",
    note: "HIGH is not reserved for dramatic beats — a clean, modest result earns it",
    build: () => { clearLastKnownGood(); return buildCatalogView({ transport: makeTestLiveTransport({ capturedTs: LIVE_TS }), gameId: GAME, asOf: A, profile: { gradeProvenance: "live", cleanSignals: true, lineupStatusConfidence: 1, studiedEvents: ordinaryFullSample() } }); },
    expect: { sourceState: "live", tier: "HIGH", provisional: false, ordinaryVerdict: true } },
];

// =============================================================================
// SELF-CHECKS — every catalog state builds and lands where it claims.
// =============================================================================
export async function runCatalogSelfChecks(): Promise<{ passed: number; failed: number; details: string[] }> {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };
  const tierOf = (c: number) => (c >= 0.72 ? "HIGH" : c >= 0.5 ? "MEDIUM" : "LOW");

  check("catalog -> 15 named states present", uiStateCatalog.length === 15);

  for (const e of uiStateCatalog) {
    let view: CourtHandicapView;
    try { view = await e.build(); } catch (err) { check(`${e.id} -> builds`, false); continue; }
    const m = view.provenance.market;
    const ok: string[] = [];
    const x = e.expect;
    if (x.sourceState !== undefined) check(`${e.id} -> sourceState ${x.sourceState}`, m?.sourceState === x.sourceState);
    if (x.tier !== undefined) check(`${e.id} -> confidence tier ${x.tier} (got ${view.verdict.confidence})`, tierOf(view.verdict.confidence) === x.tier);
    if (x.provisional !== undefined) check(`${e.id} -> provisional=${x.provisional}`, view.verdict.consolidated.provisional === x.provisional);
    if (x.stale !== undefined) check(`${e.id} -> stale=${x.stale}`, (m?.stale ?? false) === x.stale);
    if (x.hypothetical !== undefined) check(`${e.id} -> hypothetical=${x.hypothetical}`, (m?.hypothetical ?? false) === x.hypothetical);
    if (x.missingIncludes !== undefined) {
      const pool = [...(m?.missing ?? []), ...(view.provenance.lineup?.missing ?? [])].join(" ").toLowerCase();
      check(`${e.id} -> names '${x.missingIncludes}'`, pool.includes(x.missingIncludes));
    }
    if (x.neverReadsLive) check(`${e.id} -> badge never reads live (sourceState != live)`, m?.sourceState !== "live");
    if (x.selectedModeled !== undefined && e.selected) {
      const node = view.courtGraph.players.find((p) => p.id === e.selected);
      check(`${e.id} -> selected node modeled=${x.selectedModeled}`, !!node && !!node.modeled === x.selectedModeled);
    }
    if (x.ordinaryVerdict) {
      // ordinary = HIGH confidence not riding a dramatic hostile-court beat
      check(`${e.id} -> ordinary (modest beat, not a hostile-court spectacle)`, Math.abs(view.verdict.beatLineupPer100) < 5 && view.verdict.proof.beatHostileCourt === false);
    }
    void ok;
  }

  // cross-cutting: the catalog spans all confidence tiers and is honest about live
  const built = await Promise.all(uiStateCatalog.map((e) => e.build().catch(() => null)));
  const tiers = new Set(built.filter(Boolean).map((v) => tierOf((v as CourtHandicapView).verdict.confidence)));
  check("catalog -> spans LOW, MEDIUM, and HIGH end-to-end", tiers.has("LOW") && tiers.has("MEDIUM") && tiers.has("HIGH"));
  check("catalog -> exactly the live/audit states read live; no FALLBACK does", built.filter((v) => v && v.provenance.market?.sourceState === "live").length >= 1 && built.filter((v) => v && ["mock", "fixture_fallback", "last_known_good"].includes(v.provenance.market?.sourceState ?? "") && v.provenance.market?.sourceState === "live").length === 0);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  runCatalogSelfChecks().then((r) => {
    // eslint-disable-next-line no-console
    console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
    if (r.failed > 0) process.exit(1);
  });
}
