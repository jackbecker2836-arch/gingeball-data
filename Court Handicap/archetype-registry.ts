// =============================================================================
// GINGEBALL COURT HANDICAP — DEEP POSITIONAL ARCHETYPE REGISTRY (Phase 11D)
//
// The archetype layer is the translation layer ("the archetype translates it"), so it
// must be as calculated as the rest of the system — not a handful of labels. This is a
// MULTI-AXIS, status-honest registry the Pressure Lab consumes. Every archetype declares
// what it is, which signals it moves, what proof should validate it, and what makes its
// confidence fragile — and confesses, per direction, what is modeled vs proxy vs missing.
//
// HONESTY CONTRACT: declaring vocabulary (axes, levers, proof expectations) is authored
// knowledge and allowed. Claiming an engine-MODELED self-read where none exists is not.
// Only scoring_guard and rim_protector have a modeled self-read today. Everything else is
// a fixture_estimate self-read with — at most — an engine-tested signal_proxy IMPACT.
// =============================================================================

export type Family = "guard" | "wing" | "forward" | "big" | "star" | "defense" | "connector" | "specialist";
export type Status = "modeled" | "partial" | "signal_proxy" | "fixture_estimate" | "stubbed" | "missing" | "not_applicable";
export type Signal = "spacing" | "poa" | "rim" | "synergy" | "burden";

// Validated engine polarity (probed in 11C/11D):
//   spacing — difficulty/scarcity factor (raising it makes the guard's court harder)
//   poa     — point-of-attack pressure (raises difficulty)
//   rim     — rim protection faced (raises difficulty)
//   synergy — fit/relief factor (raises fit)
//   burden  — creation-burden factor (raises burden lowers fit)
export interface ImpactLever {
  signal: Signal;
  pushes: "up" | "down";          // direction the archetype moves the signal in real basketball
  read: "guard" | "oppGuard";     // whose court the effect is measured on
  metric: "difficulty" | "fit";   // the metric that signal actually moves
  expectedSign: "neg" | "pos";    // expected sign of metric(pushed) − metric(neutral)
  helpsWhen: "down" | "up";       // metric direction that means "helps the acting team"
  rationale: string;
}

export interface ArchetypeAxes {
  positionFamily: Family;
  usageBand?: "low" | "medium" | "high" | "hub";
  creation?: string;
  shotDiet?: string;
  spacingGravity?: "none" | "low" | "medium" | "high";
  rimFunction?: string;
  screenFunction?: string;
  passingFunction?: string;
  defensiveRole?: string;
  reboundingRole?: string;
  transitionRole?: string;
  paceImpact?: "slows" | "neutral" | "pushes";
  lineupDependency?: "low" | "medium" | "high";
  opponentDependency?: "low" | "medium" | "high";
}

export interface CoverageStatuses {
  selfRead: Status;
  ownTeamImpact: Status;
  opponentImpact: Status;
  proof: Status;
  confidence: Status;
  renderState: Status;
  teamX: Status;
  teamY: Status;
}

export interface ArchetypeSpec {
  id: string;
  name: string;
  family: Family;
  primaryFunction: string;
  secondaryFunctions?: string[];
  axes: ArchetypeAxes;
  ownTeamLever?: ImpactLever;
  opponentLever?: ImpactLever;
  proofExpectations: string[];       // what proof should validate this type (declared, not yet engine-wired)
  confidenceVulnerabilities: string[]; // what missing data makes this type's confidence fragile (declared)
  status: CoverageStatuses;
  notes?: string;
}

const DECLARED: Status = "stubbed"; // proof/confidence vocabularies are declared, not engine-wired yet

// ---- CORE archetypes (full axis data + engine-testable levers, honest statuses) -----------
const CORE: ArchetypeSpec[] = [
  {
    id: "scoring_guard", name: "Pull-up scoring guard", family: "guard",
    primaryFunction: "on-ball shot creation", secondaryFunctions: ["spacing gravity", "high-leverage defensive matchup"],
    axes: { positionFamily: "guard", usageBand: "high", creation: "pull-up + drive", shotDiet: "three-level", spacingGravity: "high", defensiveRole: "POA / high-leverage", lineupDependency: "medium", opponentDependency: "high", paceImpact: "neutral" },
    proofExpectations: ["pull-up efficiency", "assisted/unassisted split", "late-clock makes", "rim frequency"],
    confidenceVulnerabilities: ["missing shot-quality context", "thin possession sample", "no matchup data"],
    status: { selfRead: "modeled", ownTeamImpact: "not_applicable", opponentImpact: "not_applicable", proof: DECLARED, confidence: "modeled", renderState: "modeled", teamX: "modeled", teamY: "modeled" },
    notes: "the hero modeled self-read",
  },
  {
    id: "rim_protector", name: "Paint-wall rim protector", family: "big",
    primaryFunction: "rim deterrence / drop coverage", secondaryFunctions: ["defensive rebounding", "backline organization"],
    axes: { positionFamily: "big", usageBand: "low", rimFunction: "deter + contest", defensiveRole: "drop anchor", reboundingRole: "high", spacingGravity: "none", lineupDependency: "medium", opponentDependency: "high", paceImpact: "slows" },
    opponentLever: { signal: "rim", pushes: "up", read: "oppGuard", metric: "difficulty", expectedSign: "pos", helpsWhen: "up", rationale: "raises rim protection the opponent guard faces" },
    proofExpectations: ["rim FG% allowed", "deterrence (rim attempts suppressed)", "blocks", "foul rate"],
    confidenceVulnerabilities: ["missing deterrence/tracking data", "no opponent rim-rate context"],
    status: { selfRead: "modeled", ownTeamImpact: "missing", opponentImpact: "signal_proxy", proof: DECLARED, confidence: "modeled", renderState: "modeled", teamX: "modeled", teamY: "modeled" },
  },
  {
    id: "roll_big", name: "Roll / rim-running big", family: "big",
    primaryFunction: "roll gravity + rim finishing", secondaryFunctions: ["screen setting", "lob threat"],
    axes: { positionFamily: "big", usageBand: "medium", rimFunction: "finish", screenFunction: "ball-screen hub", spacingGravity: "low", lineupDependency: "high", paceImpact: "neutral" },
    ownTeamLever: { signal: "synergy", pushes: "up", read: "guard", metric: "fit", expectedSign: "pos", helpsWhen: "up", rationale: "roll gravity manufactures creator relief / easy looks" },
    proofExpectations: ["screen assists", "roll gravity", "rim finishes", "creator relief"],
    confidenceVulnerabilities: ["missing screen-tracking data", "no roll-gravity context"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
  },
  {
    id: "spot_up_wing", name: "Spot-up corner wing", family: "wing",
    primaryFunction: "floor spacing", secondaryFunctions: ["secondary connector", "low-usage finisher"],
    axes: { positionFamily: "wing", usageBand: "low", creation: "none", shotDiet: "catch-and-shoot corner", spacingGravity: "high", defensiveRole: "team defender", lineupDependency: "high", paceImpact: "neutral" },
    ownTeamLever: { signal: "spacing", pushes: "down", read: "guard", metric: "difficulty", expectedSign: "neg", helpsWhen: "down", rationale: "relieves spacing scarcity, opening the creator's floor" },
    proofExpectations: ["catch-and-shoot attempts", "assisted makes", "spacing effect"],
    confidenceVulnerabilities: ["missing shot-quality context", "no spacing-tracking data"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
  },
  {
    id: "connector", name: "Offensive connector / glue", family: "connector",
    primaryFunction: "ball movement + role clarity", secondaryFunctions: ["quick decisions", "turnover relief"],
    axes: { positionFamily: "connector", usageBand: "low", creation: "swing / dribble-handoff", passingFunction: "secondary playmaking", lineupDependency: "medium", paceImpact: "pushes" },
    ownTeamLever: { signal: "synergy", pushes: "up", read: "guard", metric: "fit", expectedSign: "pos", helpsWhen: "up", rationale: "raises synergy / role clarity without a usage spike" },
    proofExpectations: ["secondary assists", "quick decisions", "turnovers avoided", "swing passes"],
    confidenceVulnerabilities: ["missing passing-tracking data", "no role-clarity context"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
  },
  {
    id: "defensive_stopper", name: "Point-of-attack stopper", family: "defense",
    primaryFunction: "on-ball defensive suppression", secondaryFunctions: ["screen navigation", "matchup burden"],
    axes: { positionFamily: "defense", usageBand: "low", defensiveRole: "POA lockdown", opponentDependency: "high", lineupDependency: "low", paceImpact: "slows" },
    opponentLever: { signal: "poa", pushes: "up", read: "oppGuard", metric: "difficulty", expectedSign: "pos", helpsWhen: "up", rationale: "raises point-of-attack pressure on the opponent creator" },
    proofExpectations: ["opponent efficiency suppression", "forced turnovers", "contest quality"],
    confidenceVulnerabilities: ["missing matchup-assignment data", "no opponent-tracking data"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "missing", opponentImpact: "signal_proxy", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
  },
  {
    id: "stretch_big", name: "Stretch / pick-and-pop big", family: "big",
    primaryFunction: "frontcourt spacing", secondaryFunctions: ["pick-and-pop gravity", "variable rim protection"],
    axes: { positionFamily: "big", usageBand: "medium", shotDiet: "pick-and-pop three", spacingGravity: "high", rimFunction: "variable", screenFunction: "pop", lineupDependency: "medium", paceImpact: "neutral" },
    ownTeamLever: { signal: "spacing", pushes: "down", read: "guard", metric: "difficulty", expectedSign: "neg", helpsWhen: "down", rationale: "a shooting big pulls the opposing big out, relieving spacing scarcity" },
    proofExpectations: ["pick-and-pop gravity", "three-point volume", "spacing effect"],
    confidenceVulnerabilities: ["missing spacing-tracking data", "rim-protection tradeoff uncertain"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
  },
  {
    id: "screen_assist_big", name: "Screen-assist hub big", family: "big",
    primaryFunction: "advantage creation via screening", secondaryFunctions: ["short-roll passing", "off-ball shot quality"],
    axes: { positionFamily: "big", usageBand: "medium", screenFunction: "screen-assist hub", passingFunction: "short-roll", lineupDependency: "high", paceImpact: "neutral" },
    ownTeamLever: { signal: "synergy", pushes: "up", read: "guard", metric: "fit", expectedSign: "pos", helpsWhen: "up", rationale: "screens manufacture creator advantage and cleaner looks" },
    proofExpectations: ["screen assists", "off-ball shot quality", "short-roll passes"],
    confidenceVulnerabilities: ["missing screen-tracking data"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
  },
  {
    id: "secondary_creator", name: "Secondary creation guard", family: "guard",
    primaryFunction: "off-primary shot creation", secondaryFunctions: ["burden relief", "bench engine"],
    axes: { positionFamily: "guard", usageBand: "medium", creation: "drive-kick / pick-and-roll", lineupDependency: "medium", paceImpact: "neutral" },
    ownTeamLever: { signal: "burden", pushes: "down", read: "guard", metric: "fit", expectedSign: "pos", helpsWhen: "up", rationale: "absorbs creation load, relieving the primary's burden (fit up)" },
    proofExpectations: ["bench/second-unit creation", "assisted relief", "turnover economy"],
    confidenceVulnerabilities: ["role overlap with primary", "thin staggered-minutes sample"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
  },
  {
    id: "high_usage_star", name: "High-usage star", family: "star",
    primaryFunction: "shot creation engine", secondaryFunctions: ["gravity", "late-clock creation"],
    axes: { positionFamily: "star", usageBand: "hub", creation: "advantage creation", spacingGravity: "high", lineupDependency: "low", opponentDependency: "high", paceImpact: "neutral" },
    ownTeamLever: { signal: "burden", pushes: "up", read: "guard", metric: "fit", expectedSign: "neg", helpsWhen: "up", rationale: "RISK: concentration raises burden / role ambiguity for a secondary guard (fit down) — a tradeoff, not a pure help" },
    proofExpectations: ["creation volume + efficiency", "gravity effect", "teammate shot-quality lift"],
    confidenceVulnerabilities: ["missing usage context", "teammate role-ambiguity not modeled"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
    notes: "tradeoff lever: the engine-tested direction is fit DOWN (role compression), so this does not 'help' the secondary guard",
  },
  {
    id: "low_usage_specialist", name: "Low-usage specialist", family: "specialist",
    primaryFunction: "context-dependent role value", secondaryFunctions: ["fit amplification", "dirty work"],
    axes: { positionFamily: "specialist", usageBand: "low", lineupDependency: "high", opponentDependency: "medium", paceImpact: "neutral" },
    ownTeamLever: { signal: "synergy", pushes: "up", read: "guard", metric: "fit", expectedSign: "pos", helpsWhen: "up", rationale: "value only appears in the right lineup — modeled weakly via synergy fit" },
    proofExpectations: ["low-touch efficiency", "lineup fit", "role clarity"],
    confidenceVulnerabilities: ["high fit sensitivity", "thin possessions / low minutes"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
    notes: "value is context-dependent; the proxy is deliberately weak",
  },
  {
    id: "movement_shooter", name: "Movement shooter", family: "wing",
    primaryFunction: "off-screen / relocation shooting", secondaryFunctions: ["spacing gravity", "screen chase burden on defense"],
    axes: { positionFamily: "wing", usageBand: "medium", shotDiet: "off-screen + relocation three", spacingGravity: "high", lineupDependency: "high", paceImpact: "neutral" },
    ownTeamLever: { signal: "spacing", pushes: "down", read: "guard", metric: "difficulty", expectedSign: "neg", helpsWhen: "down", rationale: "constant relocation relieves spacing scarcity and bends defensive attention" },
    proofExpectations: ["off-screen attempts", "relocation makes", "defensive attention moved"],
    confidenceVulnerabilities: ["missing tracking data (movement is invisible to box score)", "no shot-quality context"],
    status: { selfRead: "fixture_estimate", ownTeamImpact: "signal_proxy", opponentImpact: "missing", proof: DECLARED, confidence: "partial", renderState: "fixture_estimate", teamX: "signal_proxy", teamY: "signal_proxy" },
  },
];

// ---- SCAFFOLD breadth (named, family-tagged, status = missing — visible gaps) -------------
function scaffold(id: string, family: Family, primaryFunction: string): ArchetypeSpec {
  const m: Status = "missing";
  return {
    id, name: id.replace(/_/g, " "), family, primaryFunction,
    axes: { positionFamily: family },
    proofExpectations: [], confidenceVulnerabilities: [],
    status: { selfRead: m, ownTeamImpact: m, opponentImpact: m, proof: m, confidence: m, renderState: m, teamX: m, teamY: m },
    notes: "scaffolded — named, not modeled",
  };
}

const SCAFFOLD: ArchetypeSpec[] = [
  // guard
  scaffold("primary_pick_and_roll_creator", "guard", "primary PnR creation"),
  scaffold("rim_pressure_guard", "guard", "downhill rim pressure"),
  scaffold("drive_and_kick_guard", "guard", "drive-and-kick creation"),
  scaffold("off_ball_movement_guard", "guard", "off-ball movement scoring"),
  scaffold("combo_guard", "guard", "on/off-ball combo"),
  scaffold("pace_pushing_guard", "guard", "transition pace push"),
  scaffold("three_level_scoring_guard", "guard", "three-level scoring"),
  scaffold("point_of_attack_defense_guard", "guard", "POA defensive guard"),
  // wing
  scaffold("three_and_d_wing", "wing", "spacing + perimeter defense"),
  scaffold("slashing_wing", "wing", "downhill slashing"),
  scaffold("connector_wing", "wing", "wing-sized connector"),
  scaffold("transition_wing", "wing", "transition finishing"),
  scaffold("lockdown_wing", "wing", "perimeter lockdown defense"),
  scaffold("cutting_wing", "wing", "off-ball cutting"),
  scaffold("high_usage_scoring_wing", "wing", "high-usage wing scoring"),
  // forward
  scaffold("small_ball_four", "forward", "small-ball spacing four"),
  scaffold("short_roll_connector", "forward", "short-roll passing"),
  scaffold("high_low_forward", "forward", "high-low actions"),
  scaffold("defensive_roamer_forward", "forward", "weakside defensive roaming"),
  scaffold("face_up_forward", "forward", "face-up scoring"),
  scaffold("low_usage_dirty_work_forward", "forward", "low-usage dirty work"),
  // big
  scaffold("paint_anchor", "big", "interior defensive anchor"),
  scaffold("drop_coverage_big", "big", "drop pick-and-roll coverage"),
  scaffold("switch_big", "big", "switchable big defense"),
  scaffold("post_hub_big", "big", "post-up offensive hub"),
  scaffold("offensive_rebound_big", "big", "offensive-rebound creation"),
  scaffold("vertical_spacing_big", "big", "vertical lob spacing"),
  scaffold("non_spacing_big", "big", "non-spacing interior big"),
  // star / usage
  scaffold("heliocentric_star", "star", "heliocentric creation engine"),
  scaffold("gravity_star", "star", "off-ball gravity star"),
  scaffold("two_way_star", "star", "two-way star"),
  scaffold("advantage_creator", "star", "advantage creation"),
  // defense
  scaffold("screen_navigator", "defense", "screen navigation"),
  scaffold("switch_defender", "defense", "multi-positional switch defense"),
  scaffold("help_side_roamer", "defense", "help-side rim protection"),
  scaffold("defensive_playmaker", "defense", "events / passing-lane defense"),
  // connector
  scaffold("ball_mover", "connector", "0.5-second ball movement"),
  scaffold("dribble_handoff_connector", "connector", "dribble-handoff hub"),
  scaffold("touch_hub", "connector", "high-touch connective hub"),
  scaffold("transition_connector", "connector", "transition continuity"),
  // specialist
  scaffold("corner_three_specialist", "specialist", "corner three shooting"),
  scaffold("lob_threat_specialist", "specialist", "vertical lob threat"),
  scaffold("offensive_rebound_specialist", "specialist", "second-chance creation"),
  scaffold("foul_draw_specialist", "specialist", "foul drawing"),
  scaffold("low_minute_specialist", "specialist", "low-minute role player"),
  scaffold("injury_limited_specialist", "specialist", "injury-limited unknown"),
];

export const ARCHETYPE_REGISTRY: ArchetypeSpec[] = [...CORE, ...SCAFFOLD];

export const FAMILIES: Family[] = ["guard", "wing", "forward", "big", "star", "defense", "connector", "specialist"];

export function getArchetype(id: string): ArchetypeSpec | undefined {
  return ARCHETYPE_REGISTRY.find((a) => a.id === id);
}

/** Archetypes with an engine-testable lever (modeled self-read or a declared impact lever). */
export function activeArchetypes(): ArchetypeSpec[] {
  return ARCHETYPE_REGISTRY.filter((a) => a.ownTeamLever || a.opponentLever || a.status.selfRead === "modeled");
}

export interface FamilyRollup {
  family: Family;
  total: number;
  selfReadModeled: number;
  impactProxy: number;       // archetypes with an engine-tested impact lever
  missing: number;
}

export function familyRollup(): FamilyRollup[] {
  return FAMILIES.map((family) => {
    const rows = ARCHETYPE_REGISTRY.filter((a) => a.family === family);
    return {
      family,
      total: rows.length,
      selfReadModeled: rows.filter((a) => a.status.selfRead === "modeled").length,
      impactProxy: rows.filter((a) => a.status.ownTeamImpact === "signal_proxy" || a.status.opponentImpact === "signal_proxy").length,
      missing: rows.filter((a) => a.status.selfRead === "missing").length,
    };
  });
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runRegistrySelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const reg = ARCHETYPE_REGISTRY;
  check("registry is substantially larger than the prior 9", reg.length >= 40);
  check("all 8 families represented", FAMILIES.every((f) => reg.some((a) => a.family === f)));
  check("unique ids", new Set(reg.map((a) => a.id)).size === reg.length);
  check("every archetype carries a position family axis", reg.every((a) => a.axes.positionFamily === a.family));
  check("every archetype carries all 8 per-direction statuses", reg.every((a) => ["selfRead", "ownTeamImpact", "opponentImpact", "proof", "confidence", "renderState", "teamX", "teamY"].every((k) => (a.status as any)[k] !== undefined)));

  // honesty: only guard + rim have a modeled self-read; no faked modeled reads
  const modeledSelf = reg.filter((a) => a.status.selfRead === "modeled").map((a) => a.id);
  check("only scoring_guard + rim_protector are modeled self-reads", modeledSelf.length === 2 && modeledSelf.includes("scoring_guard") && modeledSelf.includes("rim_protector"));
  check("no archetype claims modeled self-read without engine support", reg.every((a) => a.status.selfRead !== "modeled" || a.id === "scoring_guard" || a.id === "rim_protector"));

  // promotion honesty: a meaningful set has an engine-testable impact lever beyond the pair
  const promoted = reg.filter((a) => (a.ownTeamLever || a.opponentLever) && a.id !== "scoring_guard" && a.id !== "rim_protector");
  check("at least 6 archetypes promoted to an engine-testable impact lever", promoted.length >= 6);
  check("promoted archetypes are NOT marked modeled self-read (estimate stays honest)", promoted.every((a) => a.status.selfRead === "fixture_estimate"));
  check("every lever declares signal/metric/expectedSign/rationale", reg.every((a) => [a.ownTeamLever, a.opponentLever].every((l) => !l || (l.signal && l.metric && l.expectedSign && l.rationale.length > 0))));

  // breadth + visible gaps
  check("at least 30 scaffolded/missing archetypes remain visible", reg.filter((a) => a.status.selfRead === "missing").length >= 30);
  check("scaffolded archetypes have no fake levers", reg.filter((a) => a.status.selfRead === "missing").every((a) => !a.ownTeamLever && !a.opponentLever));

  // proof + confidence vocabularies on the core set
  const core = reg.filter((a) => a.status.selfRead !== "missing");
  check("core archetypes declare proof expectations", core.every((a) => a.proofExpectations.length > 0));
  check("core archetypes declare confidence vulnerabilities", core.every((a) => a.confidenceVulnerabilities.length > 0));

  // family rollup
  const roll = familyRollup();
  check("family rollup totals equal registry size", roll.reduce((s, r) => s + r.total, 0) === reg.length);
  check("rollup surfaces missing per family", roll.some((r) => r.missing > 0));
  check("active archetypes are the levered/modeled ones", activeArchetypes().every((a) => a.ownTeamLever || a.opponentLever || a.status.selfRead === "modeled"));

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runRegistrySelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
