# Phase 9E — Graph Trust Policy & Explicit Team Identity

9D made the graph speak from the right side of the court. But a graph built from one
defensive edge could still compute a fragility scalar — and a one-edge number can
sound as confident as a five-edge one. 9E closes that gap, and removes the brittle
id-prefix team inference, before the graph is ever allowed influence.

> **the graph should not only describe the right court — it should describe its own uncertainty.**

## Graph trust policy (`ch-graph-trust@1.0.0`)

`decideGraphTrust(graph)` reads coverage (node/edge counts, offensive vs defensive
edges, level) and returns `showFragilityScore`, `fragilityTrustLevel`,
`graphTrustLabel`, `graphTrustReason`, `withheldMetrics[]`, `displayMode`,
`recommendation`. Same philosophy as confidence and shrinkage: **produce the right
to believe the number, not just the number.** It governs **display only** — never
par, never confidence.

| coverage | displayMode | fragility scalar |
|---|---|---|
| full (both dimensions) | `full_graph` | shown plainly |
| **partial** (one dimension) | `partial_graph` | **shown, caution-labeled** |
| **thin** (≤1 edge) | `thin_graph` | **WITHHELD** — structural notes only |
| none / 0 nodes | `limited_coverage` / `no_graph` | none |

On the fixture: **X** (offense-led, 3 edges) → partial → fragility shown with a
caution line. **Y** (defense-led, 1 edge) → thin → fragility **withheld**, with
`withheldMetrics: ["fragilityScore"]` and the reason *"1 edge over 5 nodes — too
sparse for a fragility scalar."* A thin graph no longer sounds like a full one.

## Explicit team identity

Resolution no longer leans on the `x`/`y` id prefix. `resolveSelectedLineupGraph`
reads the player's **`team` field** first (`teamSource: "explicit"`), falling back
to the prefix only when no explicit team is present (`prefix_fallback`), and to
`unknown` otherwise. Graphs now carry an explicit `teamId` (`team-x` / `team-y`).
This is future-season-ready: real player ids that don't encode team still resolve.

## UI by mode

The lineup-graph card header shows the side and the trust label
("LINEUP GRAPH · Y SIDE · THIN GRAPH · defense-led"). When the scalar is earned it
renders (with a caution line on partial); when it isn't, the card shows
*"fragility withheld — …"* plus the backbone, clusters, and what isn't modeled.

## Non-binding (proven)

Trust is display-only. `lineupPar` still **23.1**, final confidence still **0.60**,
observed beats **+8.6** / **+4.0**, implied **103/99** — asserted in the source and
UI-honesty suites. The graph is learning *how strongly it may speak*; it still moves
nothing.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean. **454** self-checks across 17 suites
(new trust policy 13; view-model +2; source +8; UI honesty +4).

## Out of scope (held)

graph→confidence coupling, graph-driven par, Y offensive enrichment (no invented
edges), second-chance value, Role Court v2, Pressure Lab, prior calibration,
historical/player baselines, Kalman, volatility, pixel pass. The order stays:
9D right side → 9E how strongly it may speak → later, influence if earned.
