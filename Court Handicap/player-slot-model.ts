// =============================================================================
// GINGEBALL COURT HANDICAP — PLAYER SLOT MODEL (Phase 12, Step 2)
//
// The PURE, testable core behind the reusable PlayerSlot editor component. This
// repo's convention (see ui-labels.ts) is to extract the honesty-critical and
// logic-critical pieces into ONE pure place so they can be unit-tested without a
// DOM — the React component (PlayerSlot.tsx) only renders what lives here.
//
// What lives here:
//   - display labels for the 10 sim archetypes, 17 stats, 11 categories
//     (the engine speaks in snake_case ids; the UI must read in English)
//   - the inverse-stat set (fewer is better) + per-stat offense/defense side,
//     mirrored from the engine for display (engine stays the source of truth)
//   - IMMUTABLE update helpers — the editor is a controlled component, so every
//     edit returns a brand-new PlayerSlot and never mutates the caller's object
//   - grouping/baseline helpers the editor uses to lay stats out by category
//   - runPlayerSlotModelSelfChecks(): proves the maps are complete and the
//     update helpers are correct + non-mutating. Run it with:
//       tsx --tsconfig tsconfig.check.json \
//         components/court-handicap/sim/player-slot-model.ts
//
// HONESTY: nothing here invents engine behavior. Baselines are read straight
// from the archetype profiles; the offense/defense side and inverse flags mirror
// the engine's own maps. If the engine changes, the self-checks here catch drift.
// =============================================================================

import {
  defaultRatesForArchetype,
  SIM_ARCHETYPES,
  STAT_SIDE,
  type PlayerSlot,
  type Side,
  type StatSide,
} from "@/lib/sim/game-sim";
import {
  getStatProfile,
  STAT_CATEGORY,
  type StatId,
  type StatCategory,
} from "@/lib/stat-par/stat-par";
import { C } from "../tokens";

// ---------------------------------------------------------------------------
// 1. DISPLAY LABELS
// ---------------------------------------------------------------------------

export interface ArchetypeMeta {
  /** Human label shown in the picker. */
  label: string;
  /** One-line role descriptor (what this archetype is FOR). */
  role: string;
}

/** The 10 sim archetypes, in a sensible picker order (initiators → bigs → defenders). */
export const ARCHETYPE_META: Record<string, ArchetypeMeta> = {
  high_usage_star: { label: "High-Usage Star", role: "primary engine — heavy scoring + creation load" },
  scoring_guard: { label: "Scoring Guard", role: "shot-hunting lead guard, rim + line pressure" },
  secondary_creator: { label: "Secondary Creator", role: "off-hand playmaker, eases the star's load" },
  connector: { label: "Connector", role: "passing glue — assists, secondary assists, low turnovers" },
  spot_up_wing: { label: "Spot-Up Wing", role: "spacing + catch-and-shoot threes, light defense" },
  low_usage_specialist: { label: "Low-Usage Specialist", role: "role-dependent floor spacer, small sample" },
  roll_big: { label: "Roll Big", role: "vertical rim threat — rolls, rim attempts, rim gravity" },
  screen_assist_big: { label: "Screen-Assist Big", role: "screen setter — screen assists + rim gravity" },
  rim_protector: { label: "Rim Protector", role: "paint anchor — blocks, deterrence, defensive boards" },
  defensive_stopper: { label: "Defensive Stopper", role: "point-of-attack defender — steals, contests, fouls" },
};

/** Short labels for the 17 stats (engine id → English). */
export const STAT_LABEL: Record<StatId, string> = {
  points: "Points",
  fg3m: "3PT Made",
  rim_attempts: "Rim Attempts",
  fta: "Free Throw Att.",
  assists: "Assists",
  secondary_assists: "Secondary Assists",
  turnovers: "Turnovers",
  oreb: "Off. Rebounds",
  dreb: "Def. Rebounds",
  blocks: "Blocks",
  steals: "Steals",
  fouls: "Fouls",
  screen_assists: "Screen Assists",
  deterrence_events: "Rim Deterrence",
  rim_contests: "Rim Contests",
  spacing_gravity: "Spacing Gravity",
  rim_gravity: "Rim Gravity",
};

/** Labels for the 11 stat categories. */
export const CATEGORY_LABEL: Record<StatCategory, string> = {
  scoring: "Scoring",
  shooting: "Shooting",
  creation: "Creation",
  ball_security: "Ball Security",
  rebounding: "Rebounding",
  rim_defense: "Rim Defense",
  perimeter_defense: "Perimeter Defense",
  screening: "Screening",
  spacing: "Spacing",
  gravity: "Gravity",
  possession_value: "Possession Value",
};

/** Category display order — roughly offense → defense → influence. */
export const CATEGORY_ORDER: StatCategory[] = [
  "scoring", "shooting", "creation", "ball_security",
  "rebounding", "rim_defense", "perimeter_defense",
  "screening", "spacing", "gravity", "possession_value",
];

/**
 * Inverse stats: fewer than baseline is GOOD. Mirrors the engine's private
 * INVERSE set (stat-par.ts) for DISPLAY purposes only — so the editor can mark
 * "↓ better" without re-deriving grading logic. A self-check guards the mirror.
 */
export const INVERSE_STATS = new Set<StatId>(["turnovers", "fouls"]);

export function isInverseStat(stat: StatId): boolean {
  return INVERSE_STATS.has(stat);
}

export function statSideOf(stat: StatId): StatSide {
  return STAT_SIDE[stat];
}

export function archetypeLabel(archetype: string): string {
  return ARCHETYPE_META[archetype]?.label ?? archetype;
}

export function archetypeRole(archetype: string): string {
  return ARCHETYPE_META[archetype]?.role ?? "";
}

// ---------------------------------------------------------------------------
// 2. SIDE THEMING (X = ember / offense identity, Y = blueprint)
// ---------------------------------------------------------------------------

export interface SideTheme {
  accent: string; // strong accent (lines, badge bg text)
  accentText: string; // readable accent text on dark
  glow: string; // faint fill
  edge: string; // border tint
}

export function sideTheme(side: Side): SideTheme {
  return side === "Y"
    ? { accent: C.blueprint, accentText: C.bpText, glow: C.bpGlow, edge: C.bpEdge }
    : { accent: C.ember, accentText: C.ember, glow: C.emberGlow, edge: C.emberEdge };
}

/** Default badge label for a slot, e.g. "X1" / "Y3". index is 1-based. */
export function defaultSlotLabel(side: Side, index: number): string {
  return `${side}${index}`;
}

// ---------------------------------------------------------------------------
// 3. BASELINES + GROUPING (what the editor lays out)
// ---------------------------------------------------------------------------

/** Per-100 baseline for each stat in an archetype's profile (id → baseline). */
export function archetypeBaselines(archetype: string): Partial<Record<StatId, number>> {
  const profile = getStatProfile(archetype);
  const out: Partial<Record<StatId, number>> = {};
  if (!profile) return out;
  for (const e of profile.entries) out[e.stat] = e.baseline;
  return out;
}

export interface StatRow {
  stat: StatId;
  label: string;
  side: StatSide;
  inverse: boolean;
  baselinePer100: number | null; // null = not in this archetype's profile
}

export interface CategoryGroup {
  category: StatCategory;
  label: string;
  rows: StatRow[];
}

const ALL_STAT_IDS = Object.keys(STAT_CATEGORY) as StatId[];

/**
 * Group ALL 17 stats by category (in CATEGORY_ORDER), annotated with side,
 * inverse flag, and this archetype's per-100 baseline (null when the archetype
 * doesn't track the stat). The editor renders every variable — the blueprint's
 * "library of editable variables" intent — and the baseline column shows which
 * ones are native to the chosen archetype.
 */
export function statGroupsForArchetype(archetype: string): CategoryGroup[] {
  const baselines = archetypeBaselines(archetype);
  const byCat = new Map<StatCategory, StatRow[]>();
  for (const stat of ALL_STAT_IDS) {
    const cat = STAT_CATEGORY[stat];
    const row: StatRow = {
      stat,
      label: STAT_LABEL[stat],
      side: STAT_SIDE[stat],
      inverse: INVERSE_STATS.has(stat),
      baselinePer100: baselines[stat] ?? null,
    };
    const arr = byCat.get(cat) ?? [];
    arr.push(row);
    byCat.set(cat, arr);
  }
  const groups: CategoryGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const rows = byCat.get(cat);
    if (rows && rows.length) groups.push({ category: cat, label: CATEGORY_LABEL[cat], rows });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// 4. IMMUTABLE UPDATE HELPERS (controlled-component edits)
// ---------------------------------------------------------------------------
// Each returns a NEW PlayerSlot; the caller's object is never mutated. The React
// component calls these in its onChange path so parent state stays the owner.

export function withName(slot: PlayerSlot, name: string): PlayerSlot {
  const trimmed = name.trim();
  return { ...slot, name: trimmed === "" ? undefined : name };
}

/**
 * Switch archetype. Because the rate inputs are archetype-derived, switching
 * reloads this archetype's default rates and clears any random-mode tuning — a
 * deliberate "start from these defaults" action. Accumulated totals are left
 * untouched (the engine owns them; pre-game they're empty anyway).
 */
export function withArchetype(slot: PlayerSlot, archetype: string): PlayerSlot {
  return {
    ...slot,
    archetype,
    rates: defaultRatesForArchetype(archetype),
    random: undefined,
  };
}

export function withRate(slot: PlayerSlot, stat: StatId, value: number): PlayerSlot {
  const next = { ...slot.rates };
  if (!Number.isFinite(value)) return slot;
  next[stat] = value;
  return { ...slot, rates: next };
}

export function withRandom(
  slot: PlayerSlot,
  key: "usage" | "makeBias" | "threeBias",
  value: number,
): PlayerSlot {
  if (!Number.isFinite(value)) return slot;
  const clamped = Math.max(0, Math.min(1, value));
  return { ...slot, random: { ...slot.random, [key]: clamped } };
}

/** Mode-C stretch: edit a running total directly. Off by default in the UI. */
export function withAccumulated(slot: PlayerSlot, stat: StatId, value: number): PlayerSlot {
  if (!Number.isFinite(value)) return slot;
  const next = { ...slot.accumulated };
  next[stat] = value;
  return { ...slot, accumulated: next };
}

/** Reset rate inputs + random tuning to this archetype's defaults. */
export function resetToArchetypeDefaults(slot: PlayerSlot): PlayerSlot {
  return { ...slot, rates: defaultRatesForArchetype(slot.archetype), random: undefined };
}

// ---------------------------------------------------------------------------
// 5. SELF-CHECKS
// ---------------------------------------------------------------------------

export function runPlayerSlotModelSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0;
  let failed = 0;
  const check = (name: string, cond: boolean) => {
    if (cond) { passed += 1; details.push(`  ok  ${name}`); }
    else { failed += 1; details.push(`FAIL  ${name}`); }
  };

  // -- label completeness --
  check("every sim archetype has display meta", SIM_ARCHETYPES.every((a) => !!ARCHETYPE_META[a]));
  check("no stray archetype meta keys", Object.keys(ARCHETYPE_META).every((k) => (SIM_ARCHETYPES as readonly string[]).includes(k)));
  const allStats = Object.keys(STAT_CATEGORY) as StatId[];
  check("every stat has a label", allStats.every((s) => !!STAT_LABEL[s]));
  check("17 stats labeled", Object.keys(STAT_LABEL).length === 17 && allStats.length === 17);
  const allCats = new Set(Object.values(STAT_CATEGORY));
  check("every category has a label", [...allCats].every((c) => !!CATEGORY_LABEL[c]));
  check("CATEGORY_ORDER covers every used category", [...allCats].every((c) => CATEGORY_ORDER.includes(c)));
  check("CATEGORY_ORDER has no duplicates", new Set(CATEGORY_ORDER).size === CATEGORY_ORDER.length);

  // -- inverse mirror matches engine intent (turnovers, fouls) --
  check("inverse set is exactly {turnovers, fouls}", INVERSE_STATS.size === 2 && INVERSE_STATS.has("turnovers") && INVERSE_STATS.has("fouls"));

  // -- side mirror: offense/defense split sanity --
  check("oreb is offense, dreb is defense", statSideOf("oreb") === "offense" && statSideOf("dreb") === "defense");
  check("blocks/steals/fouls are defense", ["blocks", "steals", "fouls"].every((s) => statSideOf(s as StatId) === "defense"));

  // -- grouping --
  const groups = statGroupsForArchetype("high_usage_star");
  const groupedCount = groups.reduce((n, g) => n + g.rows.length, 0);
  check("grouping covers all 17 stats", groupedCount === 17);
  check("groups follow CATEGORY_ORDER", groups.map((g) => g.category).every((c, i, arr) => i === 0 || CATEGORY_ORDER.indexOf(arr[i - 1]) < CATEGORY_ORDER.indexOf(c)));
  const starScoring = groups.find((g) => g.category === "scoring");
  const ptsRow = starScoring?.rows.find((r) => r.stat === "points");
  check("high_usage_star points baseline surfaced (30)", ptsRow?.baselinePer100 === 30);
  const tovRow = groups.flatMap((g) => g.rows).find((r) => r.stat === "turnovers");
  check("turnovers row marked inverse", tovRow?.inverse === true);
  const spacerRow = groups.flatMap((g) => g.rows).find((r) => r.stat === "screen_assists");
  check("stat not in archetype profile has null baseline", spacerRow?.baselinePer100 === null);

  // -- immutable update helpers (must NOT mutate input) --
  const base: PlayerSlot = { id: "t1", archetype: "scoring_guard", rates: defaultRatesForArchetype("scoring_guard"), accumulated: {} };
  const frozenRatesRef = base.rates;

  const named = withName(base, "Curry");
  check("withName sets name, new object", named.name === "Curry" && named !== base);
  check("withName('') clears to undefined", withName(base, "   ").name === undefined);
  check("withName did not mutate base", base.name === undefined);

  const r2 = withRate(base, "points", 0.5);
  check("withRate sets the rate", r2.rates.points === 0.5);
  check("withRate did not mutate base.rates", base.rates === frozenRatesRef && base.rates.points !== 0.5);
  check("withRate ignores non-finite", withRate(base, "points", NaN) === base);

  const ra = withRandom(base, "usage", 1.5);
  check("withRandom clamps to 0..1", ra.random?.usage === 1);
  check("withRandom merges keys", withRandom(ra, "makeBias", 0.3).random?.usage === 1 && withRandom(ra, "makeBias", 0.3).random?.makeBias === 0.3);
  check("withRandom did not mutate base", base.random === undefined);

  const arch = withArchetype(base, "rim_protector");
  check("withArchetype switches archetype", arch.archetype === "rim_protector");
  check("withArchetype reloads default rates", JSON.stringify(arch.rates) === JSON.stringify(defaultRatesForArchetype("rim_protector")));
  check("withArchetype clears random tuning", arch.random === undefined);
  check("withArchetype keeps accumulated", arch.accumulated === base.accumulated);
  check("withArchetype did not mutate base", base.archetype === "scoring_guard");

  const acc = withAccumulated(base, "points", 12);
  check("withAccumulated sets total", acc.accumulated.points === 12);
  check("withAccumulated did not mutate base", base.accumulated.points === undefined);

  const edited = withRate(withRandom(base, "usage", 0.9), "points", 0.99);
  const reset = resetToArchetypeDefaults(edited);
  check("resetToArchetypeDefaults restores rates", JSON.stringify(reset.rates) === JSON.stringify(defaultRatesForArchetype("scoring_guard")));
  check("resetToArchetypeDefaults clears random", reset.random === undefined);

  // -- labels / theming --
  check("archetypeLabel falls back to id for unknown", archetypeLabel("nope") === "nope");
  check("sideTheme X uses ember, Y uses blueprint", sideTheme("X").accent === C.ember && sideTheme("Y").accent === C.blueprint);
  check("defaultSlotLabel formats side+index", defaultSlotLabel("Y", 3) === "Y3");

  return { passed, failed, details };
}

// ---------------------------------------------------------------------------
// CLI self-check entrypoint (mirrors the engine files' pattern)
// ---------------------------------------------------------------------------
const isMain = (() => {
  try { return typeof process !== "undefined" && Array.isArray(process.argv) && /player-slot-model\.ts$/.test(process.argv[1] ?? ""); }
  catch { return false; }
})();

if (isMain) {
  const res = runPlayerSlotModelSelfChecks();
  // eslint-disable-next-line no-console
  console.log(res.details.join("\n"));
  // eslint-disable-next-line no-console
  console.log(`\n${res.passed} passed, ${res.failed} failed`);
  if (res.failed > 0) process.exitCode = 1;
}
