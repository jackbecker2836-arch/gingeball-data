# Phase 9A — Advanced Math Foundations

Deeper bones, not fog. Three engine-owned, versioned, tested, explainable
foundations — each **additive**, so the guard and rim protector stay byte-stable.
The governing test:

> **advanced math improves trust without reducing explainability.**

## 1. Shrinkage engine (`ch-shrinkage@1.0.0`)

`shrunk = confidence × observed + (1 − confidence) × prior`. Applied v1 to the
beat-vs-court with prior **0** (the null: "met the court, no demonstrated edge").
The headline observed beat is unchanged; the shrunk value travels alongside it.

| state | observed beat | confidence | evidence-adjusted | held back |
|---|---|---|---|---|
| guard (canonical) | +8.6 | 0.60 | **+5.2** | 3.4 |
| thin sample (LOW) | +8.6 | 0.22 | **+1.9** | 6.7 |
| clean inputs (HIGH) | +8.6 | 0.75 | **+6.5** | 2.1 |

A thin-sample +8.6 is not the same claim as a full-sample +8.6 — and now the
product says so. Every read carries observed / prior / confidence / shrunk /
amount / a plain-words reason. Bold without reckless.

## 2. Court Slope v2 (`ch-court-slope@2.0.0`)

Slope was a label; now it has magnitude, direction, a source breakdown, and
confidence — separating three things the old label blurred:

- **how far par slid** (`slopeMagnitude`, normalized) — distinct from a merely *low* par.
- **who bent it** — market % vs lineup % of the par movement.
- **archetype hostility** — a SEPARATE overlay axis, because the same par can feel
  harder or easier to different players.

Guard court: **MODERATE · harder · market-led** (par slid 16% from normal, 68%
market / 32% lineup; archetype overlay +0.5 = feels harder still). Rim protector:
**GENTLE · harder · market-led** on par, but archetype overlay **−0.14 → feels
EASIER** — the inversion, finally separable: his par dipped slightly on pace while
the matchup itself is friendly. Folding archetype into the par split would have
hidden exactly that.

## 3. Lineup graph foundation (`ch-lineup-graph@1.0.0`)

The lineup engine's scalar (lineupPar 23.1) compresses a web of relationships.
The graph makes them visible, **beside** the engine — it explains, it does **not**
move par. Nodes = the five on-court players; edges = synergies. Derived: spacing
clusters, non-shooter clusters, creator-roll edges, a defensive backbone, key
synergies, `clusterWarnings`, and a `fragilityScore`.

Canonical X lineup: one creator + two non-shooters + sparse connectivity →
**FRAGILE (0.80)**, with "single-creator dependence" and "2 non-shooters cramp the
floor" warnings, and creator-roll + shooting-gravity flagged as the key synergies.
v1 surfaces fragility / warnings / key synergies; the full node-edge visualization
and any graph-driven par adjustment are reserved (explicitly non-binding).

## UI (explains, doesn't overwhelm)

A one-line **evidence-adjusted** beat under the headline; a compact **court slope**
strip (label + market/lineup source bar + a separate archetype-overlay line); a
short **lineup graph** card (fragility + key synergies + warnings). The slope and
graph strips follow the selected player (guard ↔ rim protector). All labeled
synthetic; none replaces an existing mark.

## Stability

Guard byte-stable (beat **+8.6**, confidence **0.60**, implied **103/99**); rim
protector grade intact; the 7/7B audit universe, the render-state catalog, and the
UI honesty audit all remain green.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 20 + 20
+ 21 + 15 + **12** + **13** + **15** + 22 + **88** + 27 + 38 + 35 = **341** green
(three new engine suites; source +12 for the 9A wiring).

## Out of scope (held)

Pressure Lab, Role Court v2, 3D, graph-driven par, full hierarchical priors /
Kalman / volatility, and any tuning. Disciplined depth, not sprawl.
