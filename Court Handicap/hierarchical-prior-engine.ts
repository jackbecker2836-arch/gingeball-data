// =============================================================================
// GINGEBALL COURT HANDICAP — HIERARCHICAL PRIOR ENGINE (Phase 9B)
//
// Shrinkage used to pull every beat toward 0 — "no demonstrated edge." That is a
// safe null, but it is not basketball. A scoring guard and a rim protector should
// not share a prior. This engine gives the system better instincts: it shrinks
// toward an archetype/role-aware prior WHEN that prior is earned, and falls back
// to 0 when it is not.
//
// HONESTY (loud): we have NO historical seasons yet. The archetype/role/context
// priors here are AUTHORED synthetic baselines, labeled synthetic_fixture, with a
// deliberately LOW prior confidence. The deliverable is the ARCHITECTURE (the
// hierarchy shape + the confidence-collapse), not calibrated numbers. Real data
// replaces these constants later without touching the shape.
//
//   effectivePrior = priorConfidence × priorValue
//
// So an untrusted prior collapses toward 0 on its own — smart prior when earned,
// neutral prior when not.
//
// Run: npx tsx --tsconfig tsconfig.check.json lib/hierarchical-prior-engine.ts
// =============================================================================

import type { Confidence, InputProvenance } from "@/lib/types";

export const PRIOR_ENGINE_VERSION = "ch-hier-prior@1.0.0";

const round = (x: number, d = 2) => Number(x.toFixed(d));
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

export type PriorLevelName = "global" | "archetype" | "role" | "player" | "context";

export interface PriorLevel {
  level: PriorLevelName;
  value: number;            // per-100 beat-vs-court offset this level contributes
  weight: number;           // specificity weight in the blend
  provenance: InputProvenance;
  note: string;
}

export interface PriorRead {
  priorValue: number;       // raw hierarchical blend (per-100)
  effectivePrior: number;   // priorValue × priorConfidence — what shrinkage consumes
  priorSource: string;      // dominant contributing level, human-readable
  priorHierarchy: PriorLevel[];
  priorConfidence: Confidence;
  whyThisPrior: string;
  fallbackToZero: boolean;
  missing: string[];
  source: "engine";
  modelVersion: string;
}

// ---- AUTHORED synthetic baselines (NOT calibrated; labeled, low-confidence) ---
// per-100 beat-vs-court priors. Small by design; the architecture is the point.
const ARCHETYPE_PRIORS: Record<string, number> = {
  scoring_guard: 0.5,     // high-usage creators tend to edge a market-suppressed par (foul-draw the par underrates)
  rim_protector: -0.5,    // their value isn't scoring; a SCORING-par beat near/below 0 is typical
  roll_big: -0.3,
};
const ROLE_FROM_ARCHETYPE: Record<string, string> = {
  scoring_guard: "primary_creator",
  rim_protector: "low_usage_finisher",
  roll_big: "low_usage_finisher",
};
const ROLE_PRIORS: Record<string, number> = {
  primary_creator: 0.4,
  low_usage_finisher: -0.4,
};
// authored prior trust: synthetic & uncalibrated -> low. Live/measured later -> higher.
const SYNTHETIC_PRIOR_CONFIDENCE = 0.35;

export function computePlayerPrior(input: {
  archetype: string;            // archetype CODE (e.g. "scoring_guard")
  contextTags?: string[];       // explicit game-context tags (e.g. ["low_scoring_grind"]) — no prose parsing
  inputProvenance?: InputProvenance;
}): PriorRead {
  const prov: InputProvenance = input.inputProvenance ?? "synthetic_fixture";
  const archPrior = ARCHETYPE_PRIORS[input.archetype];
  const role = ROLE_FROM_ARCHETYPE[input.archetype];
  const rolePrior = role ? ROLE_PRIORS[role] : undefined;
  const known = archPrior !== undefined;

  // FALLBACK: no earned archetype prior -> neutral null, clearly said.
  if (!known) {
    return {
      priorValue: 0, effectivePrior: 0, priorSource: "global null (no earned archetype prior)",
      priorHierarchy: [{ level: "global", value: 0, weight: 0.5, provenance: "fixture", note: "league-neutral null: no demonstrated edge" }],
      priorConfidence: 0.1, whyThisPrior: "No archetype/role prior available for this player, so we shrink toward 0 — the safe neutral.",
      fallbackToZero: true, missing: ["archetype/role prior table entry", "historical/player baseline"],
      source: "engine", modelVersion: PRIOR_ENGINE_VERSION,
    };
  }

  const tags = input.contextTags ?? [];
  const grind = tags.includes("low_scoring_grind");
  const contextPrior = grind ? -0.1 : 0;

  const levels: PriorLevel[] = [
    { level: "global", value: 0, weight: 0.5, provenance: "fixture", note: "league-neutral null" },
    { level: "archetype", value: archPrior, weight: 2, provenance: prov, note: `authored ${input.archetype} baseline (synthetic, uncalibrated)` },
  ];
  if (rolePrior !== undefined) levels.push({ level: "role", value: rolePrior, weight: 3, provenance: prov, note: `authored ${role} baseline (synthetic, uncalibrated)` });
  levels.push({ level: "player", value: 0, weight: 0, provenance: prov, note: "player historical baseline reserved (no data yet)" });
  if (contextPrior !== 0) levels.push({ level: "context", value: contextPrior, weight: 1, provenance: prov, note: "low-total grind nudges scoring beats down" });

  const wsum = levels.reduce((s, l) => s + l.weight, 0);
  const priorValue = round(levels.reduce((s, l) => s + l.value * l.weight, 0) / Math.max(1e-6, wsum), 2);
  const priorConfidence = SYNTHETIC_PRIOR_CONFIDENCE;
  const effectivePrior = round(priorValue * priorConfidence, 2);

  // dominant non-global level by |value × weight|
  const dominant = [...levels].filter((l) => l.level !== "global" && l.value !== 0)
    .sort((a, b) => Math.abs(b.value * b.weight) - Math.abs(a.value * a.weight))[0];
  const priorSource = dominant ? `${dominant.level}: ${dominant.note.split(" (")[0]}` : "global null";

  const dir = priorValue > 0 ? "above" : priorValue < 0 ? "below" : "at";
  const whyThisPrior =
    `Shrinking toward the ${input.archetype.replace(/_/g, " ")} prior (${priorValue > 0 ? "+" : ""}${priorValue}/100, ${dir} the null), ` +
    `but it is synthetic/uncalibrated so we only trust it ${Math.round(priorConfidence * 100)}% — effective pull ${effectivePrior > 0 ? "+" : ""}${effectivePrior}/100. ` +
    `A neutral 0 prior would be the fallback without it.`;

  return {
    priorValue, effectivePrior, priorSource, priorHierarchy: levels, priorConfidence,
    whyThisPrior, fallbackToZero: false,
    missing: ["historical/player-specific baselines", "prior calibration against outcomes"],
    source: "engine", modelVersion: PRIOR_ENGINE_VERSION,
  };
}

// =============================================================================
export function runPriorSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = []; let passed = 0, failed = 0;
  const check = (n: string, ok: boolean) => { ok ? passed++ : failed++; details.push(`${ok ? "PASS" : "FAIL"}  ${n}`); };

  const guard = computePlayerPrior({ archetype: "scoring_guard", contextTags: ["low_scoring_grind"] });
  const big = computePlayerPrior({ archetype: "rim_protector", contextTags: ["low_scoring_grind"] });

  check("guard -> POSITIVE scoring prior", guard.priorValue > 0 && guard.fallbackToZero === false);
  check("big -> NEGATIVE scoring prior", big.priorValue < 0 && big.fallbackToZero === false);
  check("guard and big priors DIFFER IN SIGN (not identical)", Math.sign(guard.priorValue) !== Math.sign(big.priorValue));
  check("guard -> source names the role/archetype (not 0)", /role|archetype/.test(guard.priorSource));
  check("effective prior = value × confidence (collapses toward 0)", Math.abs(guard.effectivePrior - guard.priorValue * guard.priorConfidence) < 0.011 && Math.abs(guard.effectivePrior) < Math.abs(guard.priorValue));
  check("prior confidence is LOW (synthetic, uncalibrated)", guard.priorConfidence <= 0.4 && big.priorConfidence <= 0.4);
  check("hierarchy carries global+archetype+role levels", guard.priorHierarchy.some((l) => l.level === "archetype") && guard.priorHierarchy.some((l) => l.level === "role") && guard.priorHierarchy.some((l) => l.level === "global"));
  check("context level present under a grind", guard.priorHierarchy.some((l) => l.level === "context"));
  check("levels labeled synthetic (honest provenance)", guard.priorHierarchy.filter((l) => l.level !== "global").every((l) => l.provenance === "synthetic_fixture"));

  // FALLBACK: unknown archetype -> 0 prior, said plainly
  const unknown = computePlayerPrior({ archetype: "mystery_archetype" });
  check("fallback -> unknown archetype shrinks toward 0", unknown.priorValue === 0 && unknown.effectivePrior === 0 && unknown.fallbackToZero === true);
  check("fallback -> source says global null", unknown.priorSource.includes("global null") && unknown.missing.length > 0);

  // context off when not a grind
  const noGrind = computePlayerPrior({ archetype: "scoring_guard", contextTags: [] });
  check("no-grind -> no context level", !noGrind.priorHierarchy.some((l) => l.level === "context"));

  check("explainable -> whyThisPrior + version present", guard.whyThisPrior.length > 30 && guard.modelVersion === PRIOR_ENGINE_VERSION);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runPriorSelfChecks();
  // eslint-disable-next-line no-console
  console.log(r.details.join("\n") + `\n\n${r.passed} passed, ${r.failed} failed`);
  if (r.failed > 0) process.exit(1);
}
