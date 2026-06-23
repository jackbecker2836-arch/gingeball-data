# Phase 5C — Rim Protector Full Grading Chain

Court Handicap can now fully grade a second player whose value does not look like
the scoring guard's. The big is no longer just *translated* (5B) — he is *graded*,
end to end, **without pretending he is a scoring guard.**

## Two full-chain stories, same court

| | Scoring guard | Rim protector |
|---|---|---|
| Par chain (points) | 27.5 → 24.5 → 23.1 | 12.5 → 11.5 → **11.4** |
| Verdict | BEAT THE COURT **+8.6** | BEAT THE COURT **+4.0** |
| Actual / 100 | 43.3 | 32.5 |
| Scoring families | pullup · rim · catch-shoot · FT | **roll · putback · FT** |
| Non-scoring | — | **9 reb · 3 blk · 5 deter · 4 screen (tracked, not valued)** |
| Final confidence | 0.60 MEDIUM · PROVISIONAL | **0.53 MEDIUM · PROVISIONAL** |

The guard wins by *scoring through hostility*. The big wins by a modest scoring
beat **plus** dominant non-scoring value the engine refuses to fake into a number.

## The honest modeling choice (points-only headline)

His headline values **scoring only** — points are points, fully earned, no invented
units. Rim deterrence, blocks, rebounds, and screen assists are **tracked as named
proof context**, explicitly NOT valued, because a rebound-to-points coefficient has
a real double-counting hazard (his putback points already count). The
"second-chance / deterrence value model" is named pending — the next earned step.
This refuses fake certainty while still surfacing where his value actually lives.

## Distinct chain — not a renamed guard

- **Lineup:** a new `ROLL_BIG_MODEL_V1` (opponent interior + pace scarcity suppress
  his finishing; creation support + roll gravity buy it back) — different factor
  keys than the scorer model, asserted by a test.
- **Proof:** big-man families (roll_finish / putback / post) and non-scoring proof
  (rebound / block / deterrence / screen), distinct from the guard's, asserted.
- **Verdict + confidence:** the same four-law consolidation, producing his own
  honest, humble, PROVISIONAL ruling (weakest layer: proof).

## CourtGraph / UI

Selecting the rim protector shows HIS full story: his scoring par chain, his verdict
and confidence ladder, and a clearly-separated "non-scoring proof · tracked, not
valued" strip stating the engine won't pretend to value deterrence/boards/screens
yet. The guard's panel and the 5B warp-ring inversion are untouched.

## Stability

The guard is byte-stable (103·99 / 24.5 / 23.1 / +8.6 / 0.60). The 5B inversion
holds (guard difficulty 75, big < 50). The Phase 7/7B audit still passes.

## Out of scope (held)

No other archetypes modeled, no archetype-confidence tuning, no 4D, no live
ingestion, no all-in-one big-man value metric. One second player, one full chain.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 20 +
20 + 21 + 15 + 22 + 61 + 27 = **201** green. New big-man coverage: 6 lineup, 5
proof, 9 source (full-grade + distinctness + guard-stability).
