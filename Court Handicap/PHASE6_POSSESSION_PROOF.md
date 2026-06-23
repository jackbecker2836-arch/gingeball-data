# Phase 6 — Possession Proof Engine (the fourth law)

> The market sets it. The lineup shapes it. The archetype translates it.
> **Now the possessions prove it.**

The first three engines *define* the court. Phase 6 adds the engine that sits
after them and turns possessions from decoration into **evidence**: it rebuilds
the player's actual production from labeled possession events and measures it
against the court the earlier engines defined.

```
market → lineup → archetype → possession proof → verdict
```

## The reconciliation (the honesty test)

The verdict's actual is no longer a stamped scalar. It is **rebuilt from 67
labeled possessions** that sum to 29 points, and the proof's expected per-100 IS
the lineup-court par (34.7) — so its value-over-expected must equal the chain's
beat-vs-lineup. It does:

| | from possessions |
|---|---|
| Actual points | 29 (summed from events) |
| Used possessions | 67 |
| Actual / 100 | 43.3 |
| Expected / 100 | 34.7 (lineup-court par, engine-backed) |
| **Value over expected** | **+8.6** — identical to beat-vs-lineup |
| Beat vs market | +6.5 (unchanged) |

If the possessions did not reconstruct the headline, the engine would be lying.
A self-check asserts the reconciliation in both the engine and the build path.

## The test that matters most

```
a hostile court does not automatically mean a bad verdict
```

The studied guard faced a hostile court (difficulty 75) and still produced
**88.2 / 100 across 17 possessions under pressure**. The verdict reads BEAT THE
COURT, and `beatHostileCourt` is engine-true. Possessions are allowed to prove a
player beat the environment — that is the whole idea.

## What's engine-backed vs honest-pending

- **Engine-backed:** actual points + per-100 (summed from possessions), value
  over expected, the action-family breakdown (rim / pull-up / catch-shoot / free
  throws), pressure resilience, sample-size-aware confidence (capped for
  synthetic), the CourtGraph proof trail.
- **synthetic_fixture:** the possession events themselves (authored, plausible,
  labeled, summing to the canonical line).
- **Named pending (not faked):** non-scoring possession value
  (assists/screens/roll/deterrence) is *tracked* but not yet valued into the
  headline — no invented value units; the rim protector's possession proof; live
  play-by-play ingestion.

## The CourtGraph trail is now evidence

Each baseline mark is one possession: made buckets rise by value (and glow gold
when produced under a hostile court), misses fade, turnovers leave a dead red
notch, passes are faint ticks. A trail mark now means "this possession helped
prove the verdict," not "this looked cool."

## Scope discipline

No live ingestion, no event-type sprawl, no faked possession *quality* — pressure
tags are authored and labeled. v1 is the studied guard's scoring proof, shaped to
grow into big-man proof (screen/roll/deterrence) later.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 14 +
20 + **16** + 16 + **45** = **126** green. The proof engine proves the
reconciliation and the hostile-court test from first principles; the source suite
proves the verdict's actual is rebuilt from possessions, both beats reconcile, the
trail encodes 67 possessions, and provenance names every synthetic input and
pending gap. Market, lineup, archetype, and the 5B inversion all remain stable.
