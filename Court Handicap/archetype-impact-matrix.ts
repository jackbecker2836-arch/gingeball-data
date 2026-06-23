// =============================================================================
// GINGEBALL COURT HANDICAP — TWO-TEAM ARCHETYPE IMPACT MATRIX (Phase 11C → 11D)
//
// Now REGISTRY-DRIVEN. The matrix reads each archetype's declared lever from the deep
// archetype registry and computes an honest SIGNAL-SENSITIVITY DELTA on the real engine
// chain (vary the one signal the archetype controls; measure how a guard's court moves).
// Self-read is modeled only where the registry says so (guard + rim); everything else is
// a labeled fixture estimate. Coverage rolls up by family + status across the whole
// registry, so the gaps stay visible. No roster re-simulation; no faked modeled reads.
// =============================================================================

import { auditScenarios, AUDIT_PROVENANCE } from "@/fixtures/court-handicap-audit-universe";
import { runScenario } from "@/lib/audit-harness";
import {
  activeArchetypes, familyRollup, ARCHETYPE_REGISTRY,
  type ImpactLever, type ArchetypeSpec, type Status, type FamilyRollup,
} from "@/lib/audit-universe/archetype-registry";

export type TeamSide = "X" | "Y";
export interface SignalProfile { spacing: number; poa: number; rim: number; burden: number; synergy: number }

// Synthetic team signal profiles. X = strong canonical floor; Y = a thinner, less-spaced
// side (its lineup graph is genuinely thin in the fixtures) — so the SAME effect is
// expected present but smaller on Y. Both synthetic.
export const TEAM_PROFILES: Record<TeamSide, SignalProfile> = {
  X: { spacing: 0.72, poa: 0.85, rim: 0.78, burden: 0.62, synergy: 0.40 },
  Y: { spacing: 0.50, poa: 0.70, rim: 0.60, burden: 0.70, synergy: 0.25 },
};

const IMPACT_PROVENANCE = `signal-sensitivity proxy · ${AUDIT_PROVENANCE}`;

export interface Impact {
  metric: "difficulty" | "fit"; read: "guard" | "oppGuard"; signal: string; pushes: "up" | "down";
  deltaFromNeutral: number; matchesTheory: boolean; helpsItsTeam: boolean; engineBacked: boolean; provenance: string;
}
export interface SelfRead { difficulty: number | null; fit: number | null; modeled: boolean; provenance: string }
export interface ArchetypeImpactRow {
  archetype: string; family: string; team: TeamSide;
  selfRead: SelfRead; ownTeamImpact: Impact | null; opponentImpact: Impact | null;
  coverage: Status; notes: string;
}

function guardRead(profile: SignalProfile, override: Partial<SignalProfile>): { difficulty: number; fit: number } {
  const base = auditScenarios.find((s) => s.id === "canonical");
  if (!base) throw new Error("matrix: canonical base scenario missing");
  const r = runScenario({ ...base, ...profile, ...override, archetype: "scoring_guard", id: "impact-probe", label: "impact probe" });
  return { difficulty: r.difficulty, fit: r.fit };
}

function selfReadFor(team: TeamSide, spec: ArchetypeSpec): SelfRead {
  if (spec.status.selfRead === "modeled") {
    const base = auditScenarios.find((s) => s.id === "canonical")!;
    const r = runScenario({ ...base, ...TEAM_PROFILES[team], archetype: spec.id, id: "self-probe", label: "self probe" });
    return { difficulty: r.difficulty, fit: r.fit, modeled: true, provenance: `engine · ${AUDIT_PROVENANCE}` };
  }
  return { difficulty: null, fit: null, modeled: false, provenance: `${spec.status.selfRead} · ${AUDIT_PROVENANCE}` };
}

function impactFrom(team: TeamSide, lever: ImpactLever | undefined): Impact | null {
  if (!lever) return null;
  const readProfile = lever.read === "guard" ? TEAM_PROFILES[team] : TEAM_PROFILES[team === "X" ? "Y" : "X"];
  const pushed = lever.pushes === "up" ? 0.85 : 0.2;
  const mNeutral = guardRead(readProfile, { [lever.signal]: 0.5 })[lever.metric];
  const mPushed = guardRead(readProfile, { [lever.signal]: pushed })[lever.metric];
  const delta = Math.round((mPushed - mNeutral) * 10) / 10;
  const matchesTheory = lever.expectedSign === "neg" ? delta < 0 : delta > 0;
  const helps = lever.helpsWhen === "down" ? delta < 0 : delta > 0;
  return { metric: lever.metric, read: lever.read, signal: lever.signal, pushes: lever.pushes, deltaFromNeutral: delta, matchesTheory, helpsItsTeam: helps, engineBacked: true, provenance: IMPACT_PROVENANCE };
}

function rowCoverage(spec: ArchetypeSpec): Status {
  if (spec.status.selfRead === "modeled") return "modeled";
  if (spec.status.ownTeamImpact === "signal_proxy" || spec.status.opponentImpact === "signal_proxy") return "signal_proxy";
  return spec.status.selfRead;
}

export function buildArchetypeImpactMatrix(): ArchetypeImpactRow[] {
  const rows: ArchetypeImpactRow[] = [];
  for (const spec of activeArchetypes()) {
    for (const team of ["X", "Y"] as TeamSide[]) {
      rows.push({
        archetype: spec.id, family: spec.family, team,
        selfRead: selfReadFor(team, spec),
        ownTeamImpact: impactFrom(team, spec.ownTeamLever),
        opponentImpact: impactFrom(team, spec.opponentLever),
        coverage: rowCoverage(spec), notes: spec.notes ?? "",
      });
    }
  }
  return rows;
}

export interface CoverageSummary {
  byStatus: Record<Status, number>;          // registry-wide, by self-read status
  families: FamilyRollup[];
  teamsCovered: TeamSide[];
  archetypesTotal: number;                    // whole registry
  activeArchetypes: number;                   // levered/modeled
  archetypesWithEngineImpact: number;
  gapsNamed: string[];                        // missing self-reads
}

export function coverageSummary(rows: ArchetypeImpactRow[]): CoverageSummary {
  const byStatus = { modeled: 0, partial: 0, signal_proxy: 0, fixture_estimate: 0, stubbed: 0, missing: 0, not_applicable: 0 } as Record<Status, number>;
  for (const a of ARCHETYPE_REGISTRY) byStatus[a.status.selfRead]++;
  const withImpact = new Set(rows.filter((r) => r.ownTeamImpact?.engineBacked || r.opponentImpact?.engineBacked).map((r) => r.archetype));
  const gaps = ARCHETYPE_REGISTRY.filter((a) => a.status.selfRead === "missing").map((a) => a.id);
  return {
    byStatus,
    families: familyRollup(),
    teamsCovered: [...new Set(rows.map((r) => r.team))] as TeamSide[],
    archetypesTotal: ARCHETYPE_REGISTRY.length,
    activeArchetypes: activeArchetypes().length,
    archetypesWithEngineImpact: withImpact.size,
    gapsNamed: gaps,
  };
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runMatrixSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const rows = buildArchetypeImpactMatrix();
  const sum = coverageSummary(rows);
  const find = (id: string, t: TeamSide) => rows.find((r) => r.archetype === id && r.team === t)!;

  check("matrix is registry-driven (active set only)", rows.length === sum.activeArchetypes * 2);
  check("both team sides present", sum.teamsCovered.includes("X") && sum.teamsCovered.includes("Y"));
  check("every active archetype has an X and a Y row", activeArchetypes().every((a) => rows.filter((r) => r.archetype === a.id).length === 2));

  // engine-backed directions hold (basketball truth, correct polarity)
  check("spot-up wing relieves spacing → guard difficulty↓", find("spot_up_wing", "X").ownTeamImpact!.deltaFromNeutral < 0 && find("spot_up_wing", "X").ownTeamImpact!.helpsItsTeam);
  check("connector raises synergy → guard fit↑", find("connector", "X").ownTeamImpact!.deltaFromNeutral > 0 && find("connector", "X").ownTeamImpact!.helpsItsTeam);
  check("stretch big relieves spacing → guard difficulty↓", find("stretch_big", "X").ownTeamImpact!.deltaFromNeutral < 0);
  check("screen-assist big raises synergy → guard fit↑", find("screen_assist_big", "X").ownTeamImpact!.deltaFromNeutral > 0);
  check("secondary creator lowers burden → guard fit↑", find("secondary_creator", "X").ownTeamImpact!.deltaFromNeutral > 0 && find("secondary_creator", "X").ownTeamImpact!.helpsItsTeam);
  check("defensive stopper raises opp POA → opp difficulty↑", find("defensive_stopper", "X").opponentImpact!.deltaFromNeutral > 0 && find("defensive_stopper", "X").opponentImpact!.helpsItsTeam);
  check("rim protector raises opp rim → opp difficulty↑", find("rim_protector", "X").opponentImpact!.deltaFromNeutral > 0);

  // honest tradeoff: a high-usage star compresses a secondary's fit (does NOT help)
  const star = find("high_usage_star", "X").ownTeamImpact!;
  check("high-usage star is a tradeoff (fit↓, not a help) — theory matches", star.deltaFromNeutral < 0 && star.matchesTheory && star.helpsItsTeam === false);

  // both-teams: the wing effect holds on Y too (same sign)
  check("spot-up wing effect holds on Team Y too", Math.sign(find("spot_up_wing", "Y").ownTeamImpact!.deltaFromNeutral) === Math.sign(find("spot_up_wing", "X").ownTeamImpact!.deltaFromNeutral));

  // every engine-backed impact matches its declared theory direction
  check("every engine impact matches its declared sign", rows.every((r) => (!r.ownTeamImpact || r.ownTeamImpact.matchesTheory) && (!r.opponentImpact || r.opponentImpact.matchesTheory)));

  // self-read honesty
  check("only guard + rim self-reads are modeled", rows.filter((r) => r.selfRead.modeled).every((r) => r.archetype === "scoring_guard" || r.archetype === "rim_protector"));
  check("promoted archetypes self-read as estimate, not modeled", ["spot_up_wing", "connector", "defensive_stopper", "stretch_big", "screen_assist_big", "secondary_creator"].every((a) => find(a, "X").selfRead.modeled === false));

  // provenance
  check("impacts tagged signal-sensitivity proxy, never live", rows.every((r) => [r.ownTeamImpact, r.opponentImpact].every((i) => !i || (i.provenance.includes("signal-sensitivity proxy") && !i.provenance.includes("live")))));
  check("self-reads carry synthetic_audit provenance", rows.every((r) => r.selfRead.provenance.includes(AUDIT_PROVENANCE)));

  // coverage rollup by family + status, gaps visible
  check("coverage rolls up by all families", sum.families.length === 8);
  check("rollup surfaces missing per family", sum.families.some((f) => f.missing > 0));
  check("gaps named (missing self-reads remain visible)", sum.gapsNamed.length >= 30);
  check("byStatus counts cover the whole registry", Object.values(sum.byStatus).reduce((a, b) => a + b, 0) === sum.archetypesTotal);
  check("at least 6 archetypes carry an engine-backed impact", sum.archetypesWithEngineImpact >= 6);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runMatrixSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
