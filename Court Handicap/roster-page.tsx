// app/court-handicap/sandbox/roster/page.tsx — real players & teams builder.
//
// Replaces the old TCV-leaderboard prefill with a real-data builder: the page
// seeds an opening matchup from two real teams (full box rates), and the
// client RosterBuilder lets you load any team or search any player into either
// side before/while the live sim runs. No Supabase dependency — the box data is
// bundled (sim-roster-data.ts). The composite verdict stays shadow; this only
// changes WHO fills the slots, now with real names and real rates.
import { makeSlot, type LineupState } from "@/lib/sim/game-sim";
import { RosterBuilder } from "@/components/court-handicap/sim/RosterBuilder";
import { getSimRosterBoxes } from "@/components/court-handicap/sim/sim-roster-data";
import { defaultTeamSeason, latestCompleteSeason, lineupFromTeam } from "@/components/court-handicap/sim/roster-archetype-map";

export const metadata = { title: "Live Court Simulation · Real Roster" };

// Archetype-only fallback, in case a default team can't be fielded from the data.
function archetypeLineup(side: "X" | "Y", archs: string[]): LineupState {
  return { side, slots: archs.map((a, i) => makeSlot(`${side.toLowerCase()}${i + 1}`, a)) };
}

// Seed the opening matchup from two real teams, using the last COMPLETE season
// (the newest season can be in-progress / partial). Per-team fallback to that
// team's own newest full-ish season, then to an archetype five.
function openingMatchup(): { X: LineupState; Y: LineupState } {
  const boxes = getSimRosterBoxes();
  const season = latestCompleteSeason(boxes);
  const build = (team: string, side: "X" | "Y", fallback: string[]): LineupState => {
    const lu =
      (season ? lineupFromTeam(boxes, season, team, side, 5) : null) ??
      ((): LineupState | null => { const s = defaultTeamSeason(boxes, team, 5); return s ? lineupFromTeam(boxes, s, team, side, 5) : null; })();
    return lu ?? archetypeLineup(side, fallback);
  };
  return {
    X: build("BOS", "X", ["high_usage_star", "scoring_guard", "spot_up_wing", "connector", "roll_big"]),
    Y: build("OKC", "Y", ["secondary_creator", "spot_up_wing", "defensive_stopper", "screen_assist_big", "rim_protector"]),
  };
}

export default function RosterSandboxPage() {
  const { X, Y } = openingMatchup();
  return <RosterBuilder initialX={X} initialY={Y} />;
}
