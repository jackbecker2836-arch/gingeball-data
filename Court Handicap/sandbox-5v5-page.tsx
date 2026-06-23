// app/court-handicap/sandbox/5v5/page.tsx — the 5v5 live-sim sandbox (Phase 12, Step 4).
//
// "Mostly free": SimSandbox already owns the whole live loop and renders any-size
// lineups (slots auto-collapse past one per side). So this route is just the two
// opening five-man lineups handed to the same component the 1v1 tester uses.
// Every slot's archetype + rates are editable in-page, so these are only sensible
// starting fives; the user can re-pick any of them.
import { makeSlot, type LineupState } from "@/lib/sim/game-sim";
import { SimSandbox } from "@/components/court-handicap/sim/SimSandbox";

export const metadata = { title: "Live Court Simulation · 5v5" };

// A scoring-leaning five vs. a defense-leaning five — distinct archetypes so the
// derived court and the per-slot verdicts have something to chew on out of the box.
const X_ARCHETYPES = ["high_usage_star", "scoring_guard", "spot_up_wing", "connector", "roll_big"];
const Y_ARCHETYPES = ["secondary_creator", "spot_up_wing", "defensive_stopper", "screen_assist_big", "rim_protector"];

export default function Sandbox5v5Page() {
  const X: LineupState = { side: "X", slots: X_ARCHETYPES.map((a, i) => makeSlot(`x${i + 1}`, a)) };
  const Y: LineupState = { side: "Y", slots: Y_ARCHETYPES.map((a, i) => makeSlot(`y${i + 1}`, a)) };
  return <SimSandbox initialX={X} initialY={Y} title="5v5" />;
}
