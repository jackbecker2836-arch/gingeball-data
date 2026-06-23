# Phase 9F — Shadow Graph→Confidence Coupling

The graph knows which court it describes (9D) and how strongly it may describe it
(9E). 9F lets it **audition** for influence: it computes what a graph-aware lineup
confidence *would* be, beside the live number, and explains the delta — without
touching anything shipped.

> **the graph can audition for influence without stealing authority.**

## Coupling engine (`ch-graph-conf-coupling@1.0.0`, SHADOW)

`computeGraphConfidenceCandidate({ currentLineupConfidence, trust, teamLabel })`
returns `currentLineupConfidence`, `graphAwareLineupConfidenceCandidate`,
`confidenceDelta`, `direction`, `reason`, `couplingMode: "shadow"`, `applied: false`,
`wouldApply`, `blockedBecause[]`, `policyVersion`. It is driven by the graph **trust
display mode**, not raw fragility.

| graph | displayMode | shadow delta | candidate |
|---|---|---|---|
| X (guard, offense-led) | partial | **−0.03** (small caution) | 0.73 → 0.70 |
| Y (rim protector, defense-led) | thin | **−0.10** (stronger caution) | lower |
| full | full | ±0 (no boost from authored data) | unchanged |
| none | limited/no-graph | 0, `wouldApply:false` | withheld |

The caution is **authored and small**. `full` does not boost — a partial-data graph
hasn't earned the right to *raise* confidence.

## The honesty that matters

A thin-graph caution lowers the candidate **because the graph's structural read is
thin — not because the player performed worse and not because par moved.** The
`reason` says exactly that, and self-checks assert the wording. The candidate is a
statement about *graph coverage*, never about the player.

## Shadow, not live

`applied` is always `false`; `couplingMode` is always `"shadow"`; `blockedBecause`
leads with "shadow mode — candidate computed, not applied to the chain." Nothing
writes back: `lineupPar` **23.1**, observed beats **+8.6 / +4.0**, shipped final
confidence **0.60**, and the live lineup-layer confidence are all unchanged
(asserted). The UI shows one dashed, dimmed line — "shadow · if graph trust
influenced lineup confidence: 0.73 → 0.70 (−0.03) · *not applied*" — trivially
removable, never the user-facing truth.

## Why shadow is the right step

The graph is authored, the thresholds are authored, Y is thin, X is partial. Full
coupling would be premature; doing nothing would waste the trust policy. Shadow is
the bridge: the product learns what influence would mean without pretending it is
calibrated.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean. **473** self-checks across 18 suites
(new coupling engine 11; source +8).

## Out of scope (held)

Applying the candidate live, calibrating thresholds, graph-driven par, binding
fragility, Y offensive enrichment, second-chance value, Role Court v2, Pressure Lab,
historical baselines. Order: 9D right side → 9E how strongly → **9F audition** →
later, graduate to influence only if earned.
