# Phase 8B — Render-State Catalog & Remaining Scenario Audit

A bridge phase: catalog every honest face the product can wear, summoned from REAL
engine and source inputs, and close the two named Phase 8 gaps — a true end-to-end
LOW view and a true end-to-end HIGH view. The governing test:

> **every important UI state can be summoned, inspected, and trusted.**

## The catalog (`lib/ui-render-state-catalog.ts`)

15 named states, each building an actual `CourtHandicapView`, naming the player to
select, and declaring what must be true. Built and asserted by 38 self-checks.

| id | source | tier | the truth it must tell |
|---|---|---|---|
| live_fresh_guard_medium | live | MEDIUM | fresh, not stale |
| stale_live_guard_medium | stale_live | — | stale flagged, badge not fresh-live |
| last_known_good_guard_medium | last_known_good | — | never reads live |
| fixture_fallback_guard_medium | fixture_fallback | — | never reads live |
| mock_synthetic_guard_medium | mock | — | SYNTHETIC, never live |
| rim_protector_medium | fixture | — | second full grade, provisional |
| non_modeled_fixture_estimate | fixture | — | node reads "fixture estimate" |
| missing_moneyline | live | — | win-prob named missing, not invented |
| missing_total | fallback | — | no court -> fall back, not live |
| what_if_hypothetical | (any) | — | hypothetical; real line history intact |
| **thin_sample_low** | fixture | **LOW** | 0.22 · LOW · PROVISIONAL, strong verdict survives |
| **clean_inputs_high** | live | **HIGH** | 0.75 · HIGH · not provisional (labeled audit) |
| injured_starter_removed | fixture | — | availability named; lineup confidence drops |
| late_lineup_change | fixture | — | projected five, not stable certainty |
| **high_confidence_ordinary_verdict** | live | **HIGH** | 0.83 · HIGH on a MODEST beat (not spectacle) |

## True LOW and HIGH, end-to-end (gaps closed)

These are computed by the real engines, not hand-set:

- **LOW** — a 6-possession sample collapses `sampleConfidence`; the proof layer
  falls to 0.10 and the chain lands **0.22 · LOW · PROVISIONAL**. The verdict word
  stays strong (BEAT) while the confidence honestly reads LOW — the weakest layer
  visible in crimson.
- **HIGH** — a clearly-labeled **audit** state: a live source plus measured-grade
  inputs (provenance `live`, full sample, confirmed lineup). The chain clears
  **0.75 · HIGH · not provisional**, weakest layer proof. This is NOT real player
  data — it is the honest answer to "what does HIGH look like." A `GradeProfile`
  carries these overrides; absent it, the canonical synthetic grade is byte-stable.
- **HIGH + ordinary** — the same clean state on a modest sample lands **0.83 · HIGH**
  on a small beat with no hostile-court heroics, proving HIGH is earned by clean
  evidence, not by drama.

## The three parked scenarios, added

- **injured_starter_removed** — drops lineup-status confidence and names "starter
  OUT (injury) — lineup context changed, not yet re-modeled" in provenance. The
  change is surfaced, not hidden; the grade stays provisional.
- **late_lineup_change** — a projected (not confirmed) five: low lineup confidence
  + a "projected five, not confirmed" note. Never reads as stable certainty.
- **high_confidence_ordinary_verdict** — see above: HIGH is not reserved for
  spectacular beats.

## MarketHub source-authority review (inspection, no change yet)

Finding: the big implied number (e.g. "103·99") renders identically under every
source state; the honest signal lives in the adjacent provenance badge
(LIVE / STALE / FALLBACK / SYNTHETIC) directly above it, now color-coded by tone.
Assessment: the adjacent, color-coded badge is probably sufficient, but a stricter
reviewer could argue a fallback/stale market number should look less authoritative.
Recommendation (not done this phase, per direction): consider subduing the number
under non-fresh states (reduced opacity + a small inline state tag on the number
itself). Left as a deliberate future call; not auto-dimmed.

## Pixel pass

This environment cannot render React to pixels. Status:

```
render-state catalog complete
pixel screenshots pending external/browser rendering
```

The catalog is screenshot-ready: each entry builds a real view and names the
selection, so a browser harness can render and capture all 15 states directly.

## Visual-emphasis review (state hierarchy, code-level)

PROVISIONAL appears in the reliability label (always rendered) and the humble
ladder sentence; STALE is a warn-tone badge + a crimson "· STALE" age chip,
distinct from the green LIVE badge; FALLBACK is warn-tone, visually unlike LIVE;
tracked-not-valued sits in its own blueprint strip, separate from valued families;
non-modeled reads "FIXTURE ESTIMATE"; LOW keeps a strong verdict with a crimson
weakest layer; HIGH still shows the weakest layer and caps (no guaranteed-truth
styling). Pixel confirmation pending.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 20 +
20 + 21 + 15 + 22 + 76 + 27 + **38** + 35 = **289** green. Engine math byte-stable
(guard 0.60 / +8.6 / 103·99; rim protector grade intact; 7/7B audit green).

## Out of scope (held)

No redesign, no Pressure Lab, no second-chance value, no archetype-confidence
tuning, no new providers, no core-math change.
