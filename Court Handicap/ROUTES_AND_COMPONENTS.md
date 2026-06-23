# Court Handicap — Route Map & Component Map

Court Handicap connects to TCV (leaderboard, player/team/matchup pages) but is its
own destination with its own navigation, identity, and visual language. It is not
buried inside TCV.

## Route map

| Route | Surface | Primary question |
|---|---|---|
| `/court-handicap` | Home | What is Court Handicap, and what's on tonight? |
| `/court-handicap/games` | Tonight's Court + Game CourtGraph | What court is each game? |
| `/court-handicap/games/[id]` | Game CourtGraph | Who beat this court? |
| `/court-handicap/players` | Player leaderboards / search | Who beats the hardest courts? |
| `/court-handicap/players/[id]` | Player Court Conditions + history | How does this player fare by court? |
| `/court-handicap/teams` | Team Court Handicap | Which teams beat their market court? |
| `/court-handicap/teams/[id]` | Team court history | — |
| `/court-handicap/lineups` | Starting Lineup Court | How do starters bend spread/total? |
| `/court-handicap/roles` | Role Court Handicap | Best low-man rotators, Spain screeners, etc. |
| `/court-handicap/leaderboards` | Cross-cutting leaderboards | Court beaters, trap-court survivors, high-slope. |
| `/court-handicap/glossary` | Interactive learning page | What does each term mean (spatially)? |
| `/court-handicap/methodology` | Formula library | How is every number computed? |

## Component map

Each component has a single responsibility, a typed props contract, and reads
metrics by id from `lib/metric-registry.ts`. No formula logic lives in any of them.

| Component | Responsibility | Reads |
|---|---|---|
| `CourtGraph` | The semantic court canvas (the graph). Hosts all layers. | metric-registry, all layers |
| `MarketHub` | Center-circle market scoreboard (spread/total/implied/ML). | `mkt.*` metrics |
| `SpreadRail` | Top rail showing market vs lineup-adjusted spread. | `mkt.implied_team_total`, `lineup.spread_adjustment` |
| `ImpliedTotalNode` | Per-team implied total node. | `mkt.implied_team_total` |
| `StartingLineupNodes` | Five archetype-shaped nodes per team. | `StartingLineup`, `Archetype` |
| `SynergyEdge` | Player-to-player synergy/hazard edges. | `lineup.synergy_edge` |
| `CourtTiltEngine` | Tilts the court by the lineup spread edge. | `lineup.spread_adjustment` |
| `ArchetypeLens` | Re-skins the court for a selected player's archetype. | `player.court_fit`, `player.court_difficulty` |
| `HazardField` | Purple/crimson pressure overlays (POA, spacing cracks, foul risk). | `player.court_difficulty`, `mkt.matchup_tax` |
| `PossessionBead` / `PossessionTrail` | Animated per-possession value beads. | `poss.differential` |
| `ConfidenceRing3D` | Ring completeness = confidence, on any node. | `conf.composite` |
| `MetricGlyph` | A single metric chip with id/value/unit. | any metric |
| `CourtScorecard` | The golf-style stamped result card. | `player.court_beat_per_100`, `team.court_handicap` |
| `OutcomeStamp` | "BEAT THE COURT +X" baseline stamp. | `player.court_handicap`, `team.court_handicap` |
| `LineMovementPath` | Open→close line movement ticks. | `mkt.*` (open vs close) |
| `RoleZoneOverlay` | Zone-specific role handicap stamps. | `role.handicap_index` |
| `FormulaForge` / `FormulaTooltip` | Show the formula behind any number (from formula-registry). | formula-registry |
| `GlossaryOverlay` | Hover a term → light up its court zone. | metric-registry, CANON |

## CourtGraph semantic zones

`center` = Market Court · `top` = creation burden · `elbow` = decision nodes ·
`wing` = matchup pressure · `corner` = spacing / low-usage value ·
`paint` = rim pressure / protection / glass · `sideline` = rest / venue / conditions ·
`baseline` = result vs par.

## Visual language

market = scoreboard amber · final grade = ember · offense/creation = blueprint blue ·
defense/suppression = slate crimson · hazards = purple · prototype/pending = lime chalk ·
neutral geometry = chalk/bone · confidence = rings · results = stamps.

## Animation states (Phase 10)

`empty → market-forming → court-drawing → lineups-entering → court-tilting →
archetype-lens → possession-replay → outcome-stamp`. Every motion must reveal a
basketball or statistical transformation; if it doesn't, it's removed.
Reduced-motion and a 2D fallback are required from day one.
