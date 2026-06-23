# Phase 9D — Dual-Lineup Graph & Selection-Correct Context

Phase 9A built a lineup graph — for the guard's team only. The honest note was that
when the rim protector was selected, the graph still spoke from the guard's side.
9D closes that gap: the graph now speaks for the **selected player's actual court**,
for both teams, without moving par or overclaiming.

> **the graph must speak for the selected player's actual court, not just the first team we modeled.**

## Both teams, honestly asymmetric

Both graphs run through the same `computeLineupGraph` engine (`ch-lineup-graph@1.0.0`),
now carrying `team`, `coverage`, and `limitations`. Neither fixture team is "full" —
and we say so rather than invent edges to fake symmetry:

| graph | nodes | edges | dimension | coverage | named limitation |
|---|---|---|---|---|---|
| **X** (guard) | 5 | 3 | offense-led (creator-roll, spacing) | **partial** | defensive structure not modeled |
| **Y** (rim protector) | 5 | 1 | defense-led (POA→rim backbone) | **thin** | offensive structure not modeled; sparse |

`coverage` carries `{ team, nodeCount, edgeCount, offensiveEdges, defensiveEdges,
level, missing[] }`; `limitations[]` spells out what each graph does **not** model,
and every graph declares itself **non-binding**.

## Selection-correct resolution

`resolveSelectedLineupGraph(view, playerId)` reads the team from the player and
returns `{ team, selected, opponent, covered, coverageNote }`:

- guard `x1` → **X** graph; opponent **Y**.
- rim protector `y4` → **Y** graph; opponent **X**.
- an unmodeled id → `covered: false`, "limited graph coverage — fixture estimate,"
  never silently the wrong team's graph.

The view carries `lineupGraphs: { x, y }` (and keeps `lineupGraph` = X for
back-compat). The deeper-math card follows the selection, labels the side
("LINEUP GRAPH · Y SIDE"), shows the coverage level, lists what isn't modeled, and
notes the opponent.

## Non-binding (proven)

The Y graph changed nothing earned: `lineupPar` still **23.1**, final confidence
still **0.60**, observed beats still **+8.6** (guard) / **+4.0** (big). Self-checks
assert the par and confidence are untouched. The graph explains first; it will only
influence later, if earned.

## Stability

Canonical byte-stable (103/99, 24.5, 23.1, +8.6; big +4.0). Shrinkage policy (9C),
priors (9B), slope (9A), audit universe, render-state catalog, and UI honesty audit
all green.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean. **427** self-checks across 16 suites
(graph +9, view-model +3, source +11).

## Out of scope (held)

Pressure Lab, Role Court v2, second-chance/deterrence value, prior calibration,
historical/player baselines, graph-driven par, graph→confidence coupling, Kalman,
volatility model, external pixel pass. The graph knows which team it speaks for now;
power comes later.
