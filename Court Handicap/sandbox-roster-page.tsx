// app/court-handicap/sandbox/roster/page.tsx — real-roster prefill (Phase 12, Step 5).
//
// Pulls real players from the TCV leaderboard (Supabase `v_leaderboard`, the same
// source the public leaderboard uses), classifies each into a sim archetype via
// the roster map, and hands two lineups to the same SimSandbox the other routes
// use. The composite verdict stays shadow; this only changes WHO fills the slots.
//
// Honest note on rates: `v_leaderboard` carries TCV impact components, not box
// counts, so leaderboard-sourced slots start at archetype-typical rates (real
// name + real archetype, generic rates). When box-score data is available
// (HOC `PLAYERS_RAW`), `lineupFromBox` produces REAL per-100 scoring/passing/
// rebounding/defense rates — see roster-archetype-map.ts. Wiring the box join in
// is a noted follow-up; this route uses the live leaderboard the user pointed to.
//
// Resilience: if the DB/env isn't reachable, the page falls back to a default
// archetype lineup so it always renders (and says so in the title).
import { createClient } from "@supabase/supabase-js";
import { makeSlot, type LineupState } from "@/lib/sim/game-sim";
import { SimSandbox } from "@/components/court-handicap/sim/SimSandbox";
import { lineupFromLeaderboard, type LeaderboardRow } from "@/components/court-handicap/sim/roster-archetype-map";

export const metadata = { title: "Live Court Simulation · Real Roster" };
export const revalidate = 300;

const LB_COLUMNS =
  "name, name_slug, position, pos_label, tcv, o_tcv, d_tcv, possessions, iib, pva, sgv, dsv, cov, sav, miv, rpv, ptv, dpc";

async function fetchTopPlayers(limit = 10): Promise<LeaderboardRow[] | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key);
    // Top players by TCV. Add `.eq("season", "2024-25")` to pin a single season.
    const { data, error } = await supabase
      .from("v_leaderboard")
      .select(LB_COLUMNS)
      .order("tcv", { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error || !data || data.length < 2) return null;
    return data as unknown as LeaderboardRow[];
  } catch {
    return null;
  }
}

// Fallback when the leaderboard isn't reachable — a default archetype 5v5.
function fallbackLineups(): { X: LineupState; Y: LineupState } {
  const xa = ["high_usage_star", "scoring_guard", "spot_up_wing", "connector", "roll_big"];
  const ya = ["secondary_creator", "spot_up_wing", "defensive_stopper", "screen_assist_big", "rim_protector"];
  return {
    X: { side: "X", slots: xa.map((a, i) => makeSlot(`x${i + 1}`, a)) },
    Y: { side: "Y", slots: ya.map((a, i) => makeSlot(`y${i + 1}`, a)) },
  };
}

export default async function RosterSandboxPage() {
  const top = await fetchTopPlayers(10);

  if (!top) {
    const { X, Y } = fallbackLineups();
    return <SimSandbox initialX={X} initialY={Y} title="Real Roster (sample — leaderboard unavailable)" />;
  }

  // Split the top players into two balanced lineups: odd ranks → X, even → Y.
  const xRows = top.filter((_, i) => i % 2 === 0).slice(0, 5);
  const yRows = top.filter((_, i) => i % 2 === 1).slice(0, 5);
  const X = lineupFromLeaderboard(xRows, "X");
  const Y = lineupFromLeaderboard(yRows, "Y");

  return <SimSandbox initialX={X} initialY={Y} title="Real Roster (TCV leaderboard)" />;
}
