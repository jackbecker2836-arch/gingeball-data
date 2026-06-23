// app/court-handicap/sandbox/page.tsx — the 1v1 live-sim sandbox (Phase 12, Step 3).
//
// First usable sandbox: one slot per side, the live court on top, the editable
// player slots in the middle, the lineup rollup below. The page is a thin server
// component — it only builds the opening lineups (pure makeSlot) and hands them
// to the client SimSandbox, which owns the live loop. The existing internal audit
// cockpit at /internal/pressure-lab is untouched.
//
// Step 4 (5v5) will reuse SimSandbox verbatim with five-slot lineups.
import { makeSlot, type LineupState } from "@/lib/sim/game-sim";
import { SimSandbox } from "@/components/court-handicap/sim/SimSandbox";

export const metadata = { title: "Live Court Simulation · 1v1 Tester" };

export default function SimSandboxPage() {
  const X: LineupState = { side: "X", slots: [makeSlot("x1", "high_usage_star", "Star X")] };
  const Y: LineupState = { side: "Y", slots: [makeSlot("y1", "rim_protector", "Anchor Y")] };
  return <SimSandbox initialX={X} initialY={Y} title="1v1 Tester" />;
}
