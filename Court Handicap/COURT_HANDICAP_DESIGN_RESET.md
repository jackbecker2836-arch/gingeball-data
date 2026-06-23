# Court Handicap — Design Reset

No rationalizing. Two visual passes failed; this resets from principles.

## 1. Why did v1 fail visually?
It was built from defaults, not decisions. Cold blue-black void plus one bright
accent is a documented AI-design cliché; Oswald + JetBrains Mono is the reflexive
"scoreboard font + code font" answer to "sports analytics"; panels were glossy
rounded SaaS cards; the court was a pristine vector drawing. Nothing was *authored*.
It could have belonged to any sports startup. There was no point of view.

## 2. Why did v2 fail visually?
It confused texture with taste. To escape "generic," it manufactured authenticity
with surface grit — faux parchment, fake tape, chalk-displacement wobble, distressed
stamps, a scouting-dossier costume. That is chartjunk (Tufte): decoration competing
with evidence. A theme is not an identity. It started from effects instead of grid,
hierarchy, and meaning, so it read as "AI cosplaying a handmade artifact." Worse,
not better, because it was confidently wrong about the assignment.

## 3. Which parts are structurally worth keeping?
Everything below the skin: the typed fixture, formula registry, metric registry,
component contracts, deterministic math, reduced-motion support, the route
structure — and three *ideas* that are sound: the court-as-graph spatial mapping,
the archetype-lens transformation (one game → many courts), and zone semantics
(center = market, paint = pressure, corners = spacing, etc.).

## 4. Which visual choices must be deleted completely?
Faux paper/parchment, fake tape corners, chalk-displacement filter, distressed
stamp gimmicks, grain overlays, scrapbook rotations, the dossier-card metaphor,
warm-ink "board" cosplay, decorative grime — and both prior color schemes as-is.
Also gone: novelty fonts chosen because they "feel sporty," and any effect that
cannot be justified as part of a system.

## 5. Which Gingeball/TCV/TSV traits should carry over?
From the confirmed brand: the molten-gold / ginger-ember / electric-blue signal
palette and black — but used as *meaning* (gold = market, ember = Gingeball's grade,
blue = creation, rust = defense), never as flavor. The declarative, culturally-alive
voice ("The market set par. He beat the court."). The TCV/TSV leaderboard remains the
authenticity benchmark for type system and grid; until its exact tokens are in hand,
type below is principled-placeholder, flagged as such.

## 6. Which design references, and why?
- **Brockmann / Vignelli / Tufte / Sutnar** → discipline: grid, system integrity,
  signal over chartjunk, navigational labeling. (Direction A.)
- **Scher / Carson / Brody / Kruger** → editorial force: type as environment,
  the court as a map of power, declarative confrontation. (Direction B.)
- **Cooper / Greiman / Maeda / Saville** → computational artifact: interface as
  living structure, designed-by-the-math, motion-ready depth, iconic restraint.
  (Direction C.)
- **Rand** (identity mark), **Lissitzky** (diagonal/spatial force for Court Tilt),
  **Bass** (entry-sequence motion, later) inform specific objects across directions.

## 7. The new design principle, one sentence
**The basketball environment becomes a graph: a strict system where the court is a
spatial data instrument, every mark is evidence, and nothing is decoration.**

## 8. What is forbidden going forward?
Faux texture and "handmade" affectation; the dossier/scrapbook/clipboard metaphor;
neon sports-tech; sportsbook or golf-sim styling; SaaS cards; shot-chart looks;
distressed-poster templates; novelty fonts as a substitute for hierarchy; any
decoration that outweighs information; and shipping a full page before the core
objects (CourtGraph, MarketHub, Player Court Conditions, OutcomeStamp) are solved
in isolation.
