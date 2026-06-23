# Phase 10B — Pixel Capture, Frame.io Review & Semantic Palette Correction

10A built the path. 10B uses it, and fixes the first visual lie-risk: the amber
collision. This phase ships the one thing that survives into pixels and is
verifiable here — the **semantic palette correction** — and prepares the capture +
review as the honest external step.

> **the rendered screen tells the same truth the engines earned.**

---

## 1. Capture + review: an honest external step (named, not faked)

This sandbox has no browser and no Frame.io access. So, as in 10A, the pixels are
**not faked**. The capture runs locally with the 10A harness:

```
npm run dev
node scripts/capture-court-handicap.mjs        # → screenshots/court-handicap/<state>.<desktop|mobile>.png
```

- **Where screenshots live:** `screenshots/court-handicap/`, one PNG per state per
  viewport (desktop 1440, mobile 390).
- **Frame.io organization:** a project per review pass; folders grouped by the
  checklist axes — *source* (live/stale/LKG/fallback/synthetic), *confidence*
  (LOW/MED/HIGH/PROVISIONAL), *graph* (partial/thin/withheld/shadow), *market*
  (MarketHub authority, what-if). Comments annotate exact frames: "stale reads too
  live," "provisional too quiet," "shadow too prominent," "mobile too dense."
- **Reviewed first:** the three amber-bearing states — STALE, MEDIUM-confidence,
  MARKET — then fallback-vs-live and the shadow line.

Until Jack runs it, the visual-truth checklist below is a **completed template**, not
findings. The caveat stays real; the command makes it actionable.

---

## 2. Visual-truth checklist (run against the captures)

| inspection | pass condition | now reinforced by |
|---|---|---|
| LIVE ≠ STALE | live blue+dot vs rust+clock | hue **and** marker (v2) |
| FALLBACK ≠ LIVE | fallback dark+▼, never the trust tone | readsLive invariant |
| SYNTHETIC ≠ measured | bone+flask, says SYNTHETIC | nodeBasis "fixture estimate" |
| SHADOW reads not-applied | dashed/dimmed ghost line | shadow tone 35% + "not applied" |
| PROVISIONAL visible | hatch + word on any synthetic diet | confidenceBadge label |
| LOW < MEDIUM | crimson rung below amber rung | ladder shape, not a badge |
| HIGH ≠ guaranteed | green + "audit/provisional" honesty | tier label |
| withheld ≠ missing | "withheld — thin graph" + reason | trust-gated fragility |
| non-scoring separated | "tracked · not valued" off the headline | NON_SCORING_LABEL |
| evidence-adjusted density | one line, weight-source tag readable | — (watch on mobile) |
| mobile hierarchy | the verdict + confidence survive 390px | — (watch) |
| MarketHub vs badge | big numerals don't bury the source badge | marker glyph on badge |

The three-second test: **what can a user understand at a glance?**

---

## 3. The amber correction (a semantic decision, implemented + verified)

**Self-correction first (honesty):** the 10A palette study labeled STALE as amber. In
the *shipped code*, STALE was crimson (`warn`) — so it was colliding with FALLBACK and
LOW, not with amber. The real amber overload was **MEDIUM confidence + LAST-KNOWN-GOOD
+ what-if** (and market marks) all sharing the single gold `caution` tone. v2 fixes
both the gold overload and the crimson overload.

**The decision — axis separation:**

| truth | v1 (collided) | v2 (resolved) | shape / marker |
|---|---|---|---|
| MEDIUM confidence | gold `#E49B18` | gold `#E49B18` — **amber is confidence-only now** | ladder rung |
| last-known-good | gold `#E49B18` | grey `#6E6A60` (cached) | pill + ⛁ cache |
| what-if | gold `#E49B18` | blue `#5BA8D4` (hypothetical) | chip + ~ tilde |
| STALE | crimson `#CC6B6B` | rust `#C2611C` | pill + ◷ clock |
| FALLBACK | crimson | crimson (kept) | pill + ▼ down |
| MARKET pressure | gold | gold, as a directional **force** (▲), not a badge | distinct shape/place |

**Tokens, shapes, AND labels — all three.** New tokens `staleRust #C2611C` and
`cached #6E6A60`; an expanded, axis-separated `Tone` vocabulary; a shared `toneColor()`
(so the audit can assert hues are pairwise-distinct); and a `marker` glyph on every
source badge so the state survives **grayscale** and a small mobile glance.

**MARKET keeps amber** — it owns it as a force/burn, never as a tier/state badge, so it
no longer collides with the MEDIUM rung by shape and placement. Fully moving market →
ember (`#CF4E15`) is the cleaner long-term move, but it's a broad change to many market
marks I can't see in pixels — so it's **flagged as the pixel-validated next option**,
not done blind.

**Verified:** 7 new self-checks in `ui-honesty-audit` assert the resolution — amber is
confidence-only, LKG moved off amber, stale moved off crimson, the three former-amber
meanings are now distinct hues, no two source states share a hue, every badge has a
marker, and only LIVE reads live. See `design/semantic-palette-v2.svg` (with a grayscale
proof strip).

---

## 4. Mobile density (named, pixel-pending)

The harness captures 390px. Named suspects, to confirm in pixels: the rim-protector
panel (par chain + verdict + non-scoring + slope + graph + shadow stacked), the
deeper-math strip wrapping, and the provenance bar's badge + age + missing chips
wrapping. The new badge markers add one glyph each — cheap, and they buy grayscale
safety, but the reviewer should confirm they don't crowd the 390px bar.

---

## 5. Fixed now vs parked

**Fixed now (verifiable, code):** the amber collision (tokens + tones + markers +
what-if + stale age color), with self-checks. **Parked (needs real pixels):** exact
spacing/contrast in situ, mobile crowding confirmation, whether market should fully
move to ember, whether the outcome stamp needs less drama on LOW and the confidence
ring a stronger settle (motion, deferred per the brief).

---

## Checks

Strict `tsc -p tsconfig.check.json --noEmit` clean. **495** self-checks green across 19
suites (ui-honesty 39→**46**, +7 Palette v2). Canonical math byte-stable. No engine or
shipped grade values moved — 10B touches only the label/token presentation layer.

## Out of scope (held)

3D/WebGL, full motion implementation, Pressure Lab, reopening Phase 9, wholesale
redesign, AI mood images decorating a truth problem.
