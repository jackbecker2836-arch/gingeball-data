# Phase 5B — Second Archetype Translation (the inversion) + Synthetic Lab

The product's signature idea is now real **and** fed by a proper laboratory: the
same court means opposite things to different archetypes, proven from a fully
synthetic, clearly-labeled basketball world.

## The synthetic lab (`fixtures/synthetic-game.ts`)

⚠ `synthetic_fixture` — authored test data, not measured, not live. Both fives,
ten players, each with ~30 archetype-relevant fields (usage, TS, rim/pull-up
tendencies, rebounding, block/steal, POA defense, rim protection, spacing
gravity, creation burden, roll gravity, switchability, synergy tags) plus
lineup-level context. Designed to exercise translation — a trapped guard, a
relief big, a spacing-dependent wing, a secondary-creation connector, a
pressure-rising stopper — so nothing overfits to one player. Provenance flows as
`synthetic_fixture` everywhere.

## One unified signal vector (craft fix)

The guard previously fed the lineup and archetype engines two different POA/
spacing numbers. Phase 5B unifies them: both engines now read the SAME synthetic
guard vector, and the lineup coefficients were re-derived so the approved
+2.2/+1.8/+1.5/+0.8/−0.6 → **23.1** breakdown stays byte-identical.

## The inversion

The X −4 / 202 low-total rim-pressure grind that *traps* the scoring guard is a
*relief path* for the rim protector — and the engine explains why.

## Same game, two reads

| | Scoring guard (x1) | Rim protector (y4) |
|---|---|---|
| **Fit** | 28 (poor outlet) | **73** (good outlet) |
| **Difficulty** | 75 (hostile) | **43** (favorable) |
| **Slope** | High · **harder** | High · **easier** |
| Confidence | 0.63 | 0.56 (younger, no par chain) |

Same expected possessions, same court type, same game. Opposite translation.

## Not a renamed model — different basketball logic

The two archetypes have **distinct factor sets**. Several signals invert:

- **Rim attack volume:** what makes the guard dangerous *and* walls his finishes is
  the big's **deterrence value** (his single biggest fit factor).
- **Low-total grind:** pull-up scarcity for the guard; **ideal value environment**
  for the big.
- **Perimeter pressure:** taxes the guard's handle; ~irrelevant to the big.

Guard difficulty factors: spacing, POA, rim, market supp, lineup supp, pace.
Big difficulty factors: touch scarcity, pace, paint-finish congestion, opponent
interior. A self-check asserts the factor keys differ — it cannot be a rename.

## Slope is now archetype-sensitive

New `slopeDirection` makes the inversion explicit: the guard's court got **harder**
(par-based, 5A-stable 0.16); the big's got **easier** (net-favorability basis,
with the rigorous par-chain slope for non-scorers named pending).

## The CourtGraph re-translates

Selecting the rim protector flips the warp ring from large hostile-red
("DIFF 75 · FIT 28 · harder") to relief-blue at a smaller real magnitude
("DIFF 43 · FIT 73 · easier"). The selection banner shows the same-court
re-translation in numbers. The same court object becomes a different world.

## Honesty (unchanged discipline)

- **Engine-backed:** fit / difficulty / slope for *both* modeled archetypes.
- **Fixture-derived:** the scouting signals (named per layer in provenance + missing[]).
- **Pending, named:** all other archetypes (`modeled:false`), the big's full
  per-player conditions/verdict, and his par-chain slope.
- Conditions + Verdict stay pinned to the studied guard (his par chain is real);
  the big's read drives the CourtGraph translation + banner, not a faked panel.

## Untouched / stable

Phase 5A's guard read is byte-stable (75 / 28 / High). Market and lineup math
unchanged. The archetype engine version bumped to `ch-archetype-court@1.1.0`.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 14 +
**20** + 16 + **34** = **99** green. The archetype suite proves the inversion
(big difficulty < guard, big fit > guard, opposite slope directions) and that the
models are not renames; the source suite proves the inversion surfaces in the
CourtGraph nodes, that lineup + archetype inputs are labeled `synthetic_fixture`
(distinct from the market feed's `fixture` source), and that market + lineup +
guard reads stay stable.
