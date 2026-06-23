// app/court-handicap/sandbox/roster/page.tsx — real players & teams builder.
//
// Seeds two real teams from the last COMPLETE season (the newest season can be
// in-progress / partial), then hands off to the client RosterBuilder, where each
// side shows its full roster and the user picks the five that play. No Supabase
// dependency — box data is bundled (sim-roster-data.ts). Composite verdict stays
// shadow; this only changes WHO fills the slots, with real names and rates.
import { RosterBuilder } from "@/components/court-handicap/sim/RosterBuilder";
import { getSimRosterBoxes } from "@/components/court-handicap/sim/sim-roster-data";
import { latestCompleteSeason, teamsForSeason } from "@/components/court-handicap/sim/roster-archetype-map";

export const metadata = { title: "Live Court Simulation · Real Roster" };

export default function RosterSandboxPage() {
  const boxes = getSimRosterBoxes();
  const season = latestCompleteSeason(boxes);
  const teams = teamsForSeason(boxes, season);
  const teamX = teams.includes("BOS") ? "BOS" : (teams[0] ?? "");
  const teamY = teams.includes("OKC") ? "OKC" : (teams.find((t) => t !== teamX) ?? teams[0] ?? "");
  return <RosterBuilder initialSeason={season} initialTeamX={teamX} initialTeamY={teamY} />;
}
