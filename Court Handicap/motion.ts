// =============================================================================
// GINGEBALL COURT HANDICAP — MOTION (Phase 10C, Meaningful Motion v1)
//
// The motion semantics live HERE as pure constants/functions so the truth rules
// are testable, not vibes. The CSS reads these numbers; this file's self-checks
// assert the rules that keep motion from lying:
//   - the entrance order follows the spine (proof before verdict, ring after verdict)
//   - the confidence ring settles to the EARNED arc and never celebrates
//   - only a genuine live read may "breathe"; degraded states never animate live
//   - reduced motion collapses every motion to its truthful end-state instantly
//
// CENTERPIECE: motion must explain the system without increasing the claim.
// =============================================================================

import { COURT_HANDICAP_CSS } from "./tokens";

export type Tier = "LOW" | "MEDIUM" | "HIGH";
export type SourceStateLike =
  | "live" | "stale_live" | "last_known_good" | "fixture_fallback" | "mock" | "fixture" | "synthetic_audit";

// Entrance delays (ms). The order IS the Court Handicap spine:
//   market sets it -> court is drawn -> lineup shapes it -> archetype translates it
//   -> possessions prove it (only after the court exists) -> verdict rules it
//   (only after proof) -> confidence confesses (the ring settles after the verdict).
export const ENTRANCE = {
  market: 0,
  courtDraw: 180,
  lineupNodes: 360,
  archetypeRing: 540,
  proofTrail: 820,
  verdictStamp: 1780,    // 10F: after proof fully accrues (820 + cap 560 + bead 320 = 1700)
  confidenceRing: 2080,  // 10F: after the verdict, with breathing room — the last beat
} as const;
export type EntranceStage = keyof typeof ENTRANCE;

// proof must precede the verdict; the ring must follow the verdict; market is first.
export function entranceOrderValid(e: typeof ENTRANCE = ENTRANCE): boolean {
  return (
    e.market === 0 &&
    e.market < e.courtDraw &&
    e.courtDraw < e.lineupNodes &&
    e.lineupNodes < e.archetypeRing &&
    e.archetypeRing < e.proofTrail &&
    e.proofTrail < e.verdictStamp &&     // the verdict never arrives before proof
    e.verdictStamp < e.confidenceRing    // confidence settles only after the verdict
  );
}

export interface RingSettle {
  tier: Tier;
  finalArcFraction: number; // === finalConfidence (clamped) — motion never exceeds the earned number
  durationMs: number;
  easing: string;
  overshoot: boolean;       // ALWAYS false: a confidence ring confesses, it never celebrates
  glow: boolean;            // only HIGH earns a faint firmness; never a burst
  provisionalPersists: true;
}

// LOW settles slow + quiet; MEDIUM restrained; HIGH firmer but never absolute.
export function confidenceRingSettle(tier: Tier, finalConfidence: number): RingSettle {
  const finalArcFraction = Math.max(0, Math.min(1, finalConfidence));
  const profile: Record<Tier, { durationMs: number; easing: string; glow: boolean }> = {
    LOW:    { durationMs: 1100, easing: "cubic-bezier(.22,.61,.36,1)", glow: false },
    MEDIUM: { durationMs: 900,  easing: "cubic-bezier(.22,.61,.36,1)", glow: false },
    HIGH:   { durationMs: 760,  easing: "cubic-bezier(.16,.84,.44,1)", glow: true  },
  };
  const p = profile[tier];
  return { tier, finalArcFraction, durationMs: p.durationMs, easing: p.easing, overshoot: false, glow: p.glow, provisionalPersists: true };
}

export function tierOf(finalConfidence: number): Tier {
  return finalConfidence >= 0.72 ? "HIGH" : finalConfidence >= 0.5 ? "MEDIUM" : "LOW";
}

// Only a genuine live read may "breathe". Everything else gets a plain entrance and
// NO living motion, so motion can never make a fallback/stale/synthetic feel live.
export function sourceMotion(state: SourceStateLike): { alive: boolean; entrance: "clean" | "plain" } {
  return state === "live" ? { alive: true, entrance: "clean" } : { alive: false, entrance: "plain" };
}

// Reduced motion: the static end-state IS the truth. Duration collapses to 0.
export function effectiveDuration(prefersReduced: boolean, durationMs: number): number {
  return prefersReduced ? 0 : durationMs;
}

// SSR-safe read of the OS reduced-motion setting (false on the server / in node).
export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

// ---------------------------------------------------------------------------
// PHASE 10D — internal CourtGraph mark staging + possession replay
// ---------------------------------------------------------------------------
// The CourtGraph's internal marks reveal on the same clock as the entrance. The
// rule the engine reasons by: the possessions PROVE the court, they do not create
// it — so proof reveals only after court + lineup + archetype context exist.
export const INTERNAL_MARKS = {
  courtGeometry: 180,
  lineupNodes: 360,
  archetypeLens: 540,
  pressureField: 660,
  proofTrail: 820,    // proof after all context
  parScar: 1700,      // the scar cuts as proof completes, before the verdict (1780)
} as const;
export type InternalMark = keyof typeof INTERNAL_MARKS;

// Proof accrual is the longest beat; bound it so it FINISHES before the verdict.
export const PROOF_ACCRUAL_CAP_MS = 560;  // last bead starts at proofTrail + this
export const BEAD_DURATION_MS = 320;      // ...and ends one bead-duration later

// The coarse genesis act stepper (the ▶ replay) shares this constant.
export const GENESIS_ACT_STEP_MS = 720;

export function internalOrderValid(m: typeof INTERNAL_MARKS = INTERNAL_MARKS): boolean {
  return (
    m.courtGeometry < m.lineupNodes &&
    m.lineupNodes < m.archetypeLens &&
    m.archetypeLens < m.pressureField &&
    m.pressureField < m.proofTrail &&     // proof only after context
    m.proofTrail < m.parScar &&
    m.parScar < ENTRANCE.verdictStamp     // the scar cuts before the verdict
  );
}

export type ProofOutcome = "made" | "missed" | "turnover" | "foul_drawn" | "blocked" | "pass" | "event";
export type ProofTreatment = "lit" | "weighted" | "faded" | "scar" | "neutral";
export interface ProofResultMotion { treatment: ProofTreatment; emphasized: boolean; celebrates: boolean }

// Map an EXISTING engine outcome to how it reads. This invents no possessions; it
// only describes a real result. Nothing celebrates — a beat is emphasized (taller),
// never triumphant; a miss fades; a turnover scars; proof under fire carries weight.
export function possessionResultMotion(outcome: ProofOutcome, opts?: { beatsCourt?: boolean; pressure?: string }): ProofResultMotion {
  const beats = !!opts?.beatsCourt;
  switch (outcome) {
    case "made":       return { treatment: opts?.pressure === "hostile" ? "weighted" : "lit", emphasized: beats, celebrates: false };
    case "foul_drawn": return { treatment: "weighted", emphasized: false, celebrates: false };
    case "missed":     return { treatment: "faded", emphasized: false, celebrates: false };
    case "blocked":    return { treatment: "faded", emphasized: false, celebrates: false };
    case "turnover":   return { treatment: "scar", emphasized: false, celebrates: false };
    case "pass":       return { treatment: "neutral", emphasized: false, celebrates: false };
    case "event":      return { treatment: "neutral", emphasized: false, celebrates: false };
  }
}

// Beads accrue in sequence like evidence; the per-bead delay is capped so a long
// trail never drags into theatre.
export function possessionBeadDelayMs(i: number, opts?: { baseMs?: number; stepMs?: number; capMs?: number }): number {
  const base = opts?.baseMs ?? INTERNAL_MARKS.proofTrail;
  const step = opts?.stepMs ?? 24;
  const cap = opts?.capMs ?? PROOF_ACCRUAL_CAP_MS;
  return base + Math.min(Math.max(0, i) * step, cap);
}

// ---------------------------------------------------------------------------
// PHASE 10E — market-forming motion (the first sentence of the product)
// ---------------------------------------------------------------------------
// "the market sets the court." Chips collapse into the hub; the hub burns the
// implied score; the court responds only after. But the market cannot animate
// every source like live truth — the forming intensity confesses the source state.
export type MarketFormIntensity = "alive" | "decay" | "dulled" | "plain" | "neutral" | "hypothetical";
export interface MarketFormingMotion { intensity: MarketFormIntensity; breathes: boolean; burns: boolean }

export function marketFormingMotion(state: SourceStateLike | "what_if"): MarketFormingMotion {
  switch (state) {
    case "live":             return { intensity: "alive", breathes: true, burns: true };   // a single settle, never a loop
    case "stale_live":       return { intensity: "decay", breathes: false, burns: true };
    case "last_known_good":  return { intensity: "dulled", breathes: false, burns: false };
    case "fixture_fallback": return { intensity: "plain", breathes: false, burns: false };
    case "mock":
    case "fixture":
    case "synthetic_audit":  return { intensity: "neutral", breathes: false, burns: false };
    case "what_if":          return { intensity: "hypothetical", breathes: false, burns: false };
  }
}

// ---------------------------------------------------------------------------
// PHASE 10F — combined-timeline hierarchy: the beats must not compete
// ---------------------------------------------------------------------------
// Proof must FINISH before the verdict; the verdict precedes the ring with room;
// the confidence ring is the last beat to begin. One place verifies the whole rhythm.
export function timelineNonCompeting(): boolean {
  const proofDone = INTERNAL_MARKS.proofTrail + PROOF_ACCRUAL_CAP_MS + BEAD_DURATION_MS;
  const lastStart = Math.max(
    ENTRANCE.market, INTERNAL_MARKS.courtGeometry, INTERNAL_MARKS.lineupNodes,
    INTERNAL_MARKS.archetypeLens, INTERNAL_MARKS.pressureField, INTERNAL_MARKS.proofTrail,
    INTERNAL_MARKS.parScar, ENTRANCE.verdictStamp, ENTRANCE.confidenceRing,
  );
  return (
    proofDone <= ENTRANCE.verdictStamp &&                 // proof finishes before the verdict
    INTERNAL_MARKS.parScar <= ENTRANCE.verdictStamp &&    // scar lands by the verdict
    ENTRANCE.verdictStamp + 200 <= ENTRANCE.confidenceRing && // the ring gets breathing room
    ENTRANCE.confidenceRing === lastStart                 // the ring is the last beat to begin
  );
}

// The ring delay is single-sourced here for the component CSS var.
export const RING_DELAY_MS = ENTRANCE.confidenceRing;

// ---------------------------------------------------------------------------
// PHASE 10G — 2D motion lock / 3D-readiness decision
// ---------------------------------------------------------------------------
// The decision is recorded AND enforced: the lock holds only while the core truth
// invariants hold, so a future change that breaks them fails a self-check.
export type MotionDecision = "LOCK_2D" | "DEFER_3D" | "PROTOTYPE_3D_NARROWLY";

export const MOTION_LOCK = {
  version: "ch-motion@1.0.0-2D-locked",
  decision: "LOCK_2D" as MotionDecision,
  threeD: "DEFER_3D" as MotionDecision,
  rationale:
    "The CSS/SVG system explains all six spine sentences, stays truthful, survives " +
    "reduced-motion, and keeps DOM/SVG text as the truth carrier. No depth need " +
    "currently clears the bar 'depth reveals a truth flat motion cannot.'",
  threeDBar: "depth must reveal a truth that flat motion cannot",
  // a narrow prototype is earned ONLY by a named truth need that passes the bar:
  threeDCandidates: ["court_tilt_depth", "archetype_lens_depth", "pressure_field_z"] as const,
  invariants: [
    "proof completes before the verdict (timelineNonCompeting)",
    "the confidence ring fills to the earned arc and never celebrates",
    "only a live read breathes; degraded states never animate live",
    "no ambient / looping motion",
    "reduced-motion collapses to the truthful end-state",
    "DOM/SVG text is the truth carrier; WebGL never carries facts alone",
  ],
} as const;

// The lock is valid only while these hold. If any truth invariant breaks, so does
// the lock — and a self-check turns red.
export function motionLockHeld(): boolean {
  const ring = confidenceRingSettle("HIGH", 0.78);
  return (
    timelineNonCompeting() &&
    !COURT_HANDICAP_CSS.includes("infinite") &&
    COURT_HANDICAP_CSS.includes("prefers-reduced-motion:reduce") &&
    marketFormingMotion("live").breathes === true &&
    marketFormingMotion("fixture_fallback").breathes === false &&
    ring.overshoot === false &&
    ring.finalArcFraction <= 1
  );
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runMotionChecks() {
  let passed = 0, failed = 0; const details: string[] = [];
  const check = (name: string, cond: boolean) => { if (cond) { passed++; } else { failed++; details.push(name); } };

  check("entrance order follows the spine", entranceOrderValid());
  check("proof strictly precedes the verdict", ENTRANCE.proofTrail < ENTRANCE.verdictStamp);
  check("confidence ring strictly follows the verdict", ENTRANCE.verdictStamp < ENTRANCE.confidenceRing);
  check("market is the first entrance stage", ENTRANCE.market === 0);

  const low = confidenceRingSettle("LOW", 0.42);
  const med = confidenceRingSettle("MEDIUM", 0.6);
  const high = confidenceRingSettle("HIGH", 0.78);
  check("no tier overshoots (no celebration)", !low.overshoot && !med.overshoot && !high.overshoot);
  check("LOW settles slowest, HIGH fastest (quiet -> firm)", low.durationMs > med.durationMs && med.durationMs > high.durationMs);
  check("only HIGH earns glow", !low.glow && !med.glow && high.glow);
  check("ring arc equals the earned confidence (0.60 -> 0.60)", med.finalArcFraction === 0.6);
  check("ring arc never exceeds 1 even if confidence does", confidenceRingSettle("HIGH", 1.5).finalArcFraction === 1);
  check("ring arc never implies a full celebratory loop at MEDIUM", med.finalArcFraction < 1);
  check("PROVISIONAL persists through the settle", low.provisionalPersists === true && med.provisionalPersists === true);

  check("tierOf thresholds mirror the verdict engine", tierOf(0.6) === "MEDIUM" && tierOf(0.78) === "HIGH" && tierOf(0.42) === "LOW");

  check("only LIVE breathes", sourceMotion("live").alive === true);
  check("stale/fallback/synthetic never animate live", (["stale_live", "fixture_fallback", "mock", "fixture", "synthetic_audit", "last_known_good"] as SourceStateLike[]).every((s) => sourceMotion(s).alive === false && sourceMotion(s).entrance === "plain"));

  check("reduced motion collapses duration to 0 (instant truth)", effectiveDuration(true, 900) === 0);
  check("full motion passes duration through", effectiveDuration(false, 900) === 900);

  // ---- Phase 10D: internal mark staging + possession replay --------------------
  check("internal marks reveal in spine order", internalOrderValid());
  check("proof reveals strictly after lineup + archetype context", INTERNAL_MARKS.archetypeLens < INTERNAL_MARKS.proofTrail && INTERNAL_MARKS.lineupNodes < INTERNAL_MARKS.proofTrail);
  check("the par scar cuts before the verdict stamp", INTERNAL_MARKS.parScar < ENTRANCE.verdictStamp);
  check("made -> lit, missed -> faded, turnover -> scar", possessionResultMotion("made").treatment === "lit" && possessionResultMotion("missed").treatment === "faded" && possessionResultMotion("turnover").treatment === "scar");
  check("made under fire carries weight, not light", possessionResultMotion("made", { pressure: "hostile" }).treatment === "weighted");
  check("a beat is emphasized but never celebrates", possessionResultMotion("made", { beatsCourt: true }).emphasized === true && possessionResultMotion("made", { beatsCourt: true }).celebrates === false);
  check("NO possession outcome ever celebrates", (["made", "missed", "turnover", "foul_drawn", "blocked", "pass", "event"] as ProofOutcome[]).every((o) => possessionResultMotion(o, { beatsCourt: true, pressure: "hostile" }).celebrates === false));
  check("beads accrue in order (monotonic delay)", possessionBeadDelayMs(0) < possessionBeadDelayMs(3) && possessionBeadDelayMs(3) < possessionBeadDelayMs(10));
  check("a long trail's accrual is capped (never drags)", possessionBeadDelayMs(10000) === INTERNAL_MARKS.proofTrail + PROOF_ACCRUAL_CAP_MS);
  check("reduced-motion read is SSR-safe (false without a window)", prefersReducedMotion() === false);

  // ---- Phase 10E: market-forming motion respects source state -----------------
  check("market forms before the court draws", ENTRANCE.market < INTERNAL_MARKS.courtGeometry);
  check("only LIVE market breathes", marketFormingMotion("live").breathes === true);
  check("no degraded market state breathes", (["stale_live", "last_known_good", "fixture_fallback", "mock", "fixture", "synthetic_audit", "what_if"] as (SourceStateLike | "what_if")[]).every((s) => marketFormingMotion(s).breathes === false));
  check("stale forms with decay, LKG dulled, fallback plain", marketFormingMotion("stale_live").intensity === "decay" && marketFormingMotion("last_known_good").intensity === "dulled" && marketFormingMotion("fixture_fallback").intensity === "plain");
  check("synthetic forms neutral, what-if hypothetical", marketFormingMotion("mock").intensity === "neutral" && marketFormingMotion("what_if").intensity === "hypothetical");
  check("only live/stale burn the implied score (a real read existed)", marketFormingMotion("live").burns === true && marketFormingMotion("stale_live").burns === true && marketFormingMotion("fixture_fallback").burns === false && marketFormingMotion("mock").burns === false);

  // ---- Phase 10F: combined-timeline hierarchy + reduced-motion QA -------------
  check("combined timeline: beats do not compete", timelineNonCompeting());
  check("proof fully accrues before the verdict stamp", INTERNAL_MARKS.proofTrail + PROOF_ACCRUAL_CAP_MS + BEAD_DURATION_MS <= ENTRANCE.verdictStamp);
  check("the confidence ring is the last beat to begin", ENTRANCE.confidenceRing >= ENTRANCE.verdictStamp && ENTRANCE.confidenceRing >= INTERNAL_MARKS.parScar);
  check("ring delay is single-sourced from the timeline", RING_DELAY_MS === ENTRANCE.confidenceRing);
  check("ENTRANCE and INTERNAL_MARKS agree (no timing drift)", ENTRANCE.courtDraw === INTERNAL_MARKS.courtGeometry && ENTRANCE.lineupNodes === INTERNAL_MARKS.lineupNodes && ENTRANCE.archetypeRing === INTERNAL_MARKS.archetypeLens && ENTRANCE.proofTrail === INTERNAL_MARKS.proofTrail);
  check("no ambient / looping motion — nothing animates forever", !COURT_HANDICAP_CSS.includes("infinite"));
  check("reduced-motion guard is present in the stylesheet", COURT_HANDICAP_CSS.includes("prefers-reduced-motion:reduce"));

  // ---- Phase 10G: 2D motion lock / 3D-readiness decision ----------------------
  check("the decision is LOCK_2D", MOTION_LOCK.decision === "LOCK_2D");
  check("3D is deferred until a truth need appears", MOTION_LOCK.threeD === "DEFER_3D");
  check("the 3D bar is a truth bar, not a desire bar", MOTION_LOCK.threeDBar.includes("flat motion cannot"));
  check("the lock reaffirms DOM/SVG as the truth carrier", MOTION_LOCK.invariants.some((i) => i.includes("truth carrier")));
  check("the 2D motion lock HOLDS (all truth invariants intact)", motionLockHeld());

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runMotionChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log("FAILURES:\n - " + r.details.join("\n - ")); process.exit(1); }
}
