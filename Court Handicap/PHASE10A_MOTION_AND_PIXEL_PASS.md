# Phase 10A — CourtGraph Motion Architecture & Pixel Reality Pass

Phase 9 gave the product honest bones. 10A makes sure the screen can carry that
truth — and makes the court breathe again — without telling a stronger story than
the system earned.

> **the screen must feel alive without telling a stronger story than the system earned.**

This phase ships an honest pixel path, a visual-truth audit, and a motion
architecture where every state means something. It builds **no spectacle** and does
not reopen Phase 9.

---

## 1. Can this environment render screenshots? No — so the harness is real, the run is external

This sandbox has no browser and cannot rasterize React. Per the standing rule, the
pixel pass is therefore **not faked**. Instead it ships as a runnable harness that
captures real pixels in the app repo:

- **`app/court-handicap/catalog/page.tsx`** — a screenshot-addressable route. Every
  render-state is reachable at `/court-handicap/catalog?state=<id>`; the route awaits
  the catalog's real end-to-end build and stamps `data-catalog-state` on the DOM so
  captures never race the render.
- **`scripts/capture-court-handicap.mjs`** — a Playwright harness that walks all 15
  truth-critical states at desktop (1440) and mobile (390), full-page, 2–3× DPR.

Run it (in gingeball-app):

```
npm i -D playwright && npx playwright install chromium
npm run dev
node scripts/capture-court-handicap.mjs        # → screenshots/court-handicap/*.png
```

The screenshots then go into **Frame.io** and run against §2. The pixel-pending
caveat is now a concrete command, not a vague "later."

---

## 2. Render-state visual-truth audit (the checklist Frame.io review runs)

For each captured state, the reviewer confirms the truth survives pixels. Pass = the
glance matches the engine.

| state | the glance must show | the lie to hunt |
|---|---|---|
| canonical guard | BEAT +8.6 · CONF 0.60 · PROVISIONAL visible | provisional too quiet |
| rim protector | his Y court; non-scoring "tracked · not valued" separated | non-scoring counted in headline |
| thin LOW | LOW tier loud; +0.9 evidence-weighted selected | LOW reading like MEDIUM |
| clean HIGH (audit) | HIGH, not PROVISIONAL; labeled audit | HIGH implying real data |
| live | LIVE badge, the only one that reads "trust" | anything else reading live |
| stale | LIVE · STALE distinct from fresh | stale ≈ fresh |
| last-known-good | dulled cached badge | reads current |
| fallback | clearly not live | masquerades as live |
| synthetic (mock) | SYNTHETIC neutral, demonstration | reads measured |
| missing moneyline | win-prob shows "— (no moneyline)" | a fabricated win prob |
| missing total | falls back, labeled | silent substitution |
| what-if | hypothetical line flagged | reads as real market |
| non-modeled archetype | per-node "FIXTURE ESTIMATE" | reads as ENGINE |
| partial X graph | fragility shown + caution | caution missing |
| thin Y graph | fragility **withheld** + reason | a confident number from 1 edge |
| shadow line | dashed/dimmed "not applied" | reads as applied |

**Density / hierarchy pass:** the deeper-math strip (slope + graph cards), the shadow
line, the evidence-adjusted line, and the provenance bar can compete on a single
screen. Reviewer flags any state where two truth signals fight for the same glance.
First suspects: rim-protector panel (par chain + verdict + non-scoring + slope +
graph + shadow) and mobile width.

**Known palette risk (see semantic-palette.svg):** amber is overloaded — MEDIUM
confidence, MARKET pressure, and STALE all sit near `#E49B18`. They must be
disambiguated by **shape + label**, not hue alone. This is the first thing to verify
in pixels.

---

## 3. Motion-state architecture (meaning first)

Eight states, each mapped to a basketball/statistical truth. See
`design/courtgraph-genesis-storyboard.svg` for the still-frame language.

| state | what moves | the truth it reveals |
|---|---|---|
| empty | nothing; faint baseline | before the market speaks, there is no court |
| market-forming | odds chips collapse into the MarketHub (the burn) | the market sets the court |
| court-drawing | implied score lays the par geometry | implied score becomes the floor |
| lineups-entering | five starters drop in as nodes | the lineup shapes it |
| court-tilting | floor warps; crimson pressure / blue relief | lineup + archetype bend the par |
| archetype-lens | a lens re-warps the same floor per player | same court, different translation |
| possession-replay | the proof trail lights actual evidence; the scar cuts the par | the possessions prove it |
| outcome-stamp | the verdict stamps; the confidence ring fills to its earned arc | the verdict arrives only after evidence; confidence confesses |

**Rejected as decorative (explicitly):** idle ambient drift, parallax for its own
sake, particle noise with no referent, easing flourishes that *delay* the verdict,
celebratory bursts on a LOW/PROVISIONAL grade. Rule: **if a motion does not explain
the system, it is removed.**

**Sequence map (timing intent, to be tuned in Premiere before code):** market-forming
(fast, 400ms, decisive) → court-drawing (steady) → lineups-entering (staggered drop)
→ court-tilting (slow, the floor *settling*) → archetype-lens (on selection, quick)
→ possession-replay (paced, evidence accruing) → outcome-stamp (impact beat) →
confidence-ring (quiet settle, never triumphant on low confidence). The verdict
**never** precedes the proof in time — order encodes the spine.

---

## 4. Reduced-motion, 2D fallback, accessibility (not deferred)

- **Every motion has a static end-frame.** The storyboard panels *are* those frames.
  `prefers-reduced-motion: reduce` cuts straight to the end-state — no information is
  motion-only.
- **Truth lives in the DOM**, not the canvas. Every label (badges, tiers, withheld
  notes, shadow line, non-scoring separation) is real text/SVG with roles and
  contrast — a WebGL/3D layer, if added, is **enhancement only** and never the sole
  carrier of a fact. If canvas fails or is disabled, the 2D component tree already
  tells the whole truth (it does today).
- **Accessibility stays outside the canvas:** semantic markup, focus order, AA
  contrast on `#F0EBE1` over dark surfaces, color never the sole signal (every state
  pairs color with label + shape). Tap targets ≥ 44px on mobile.

---

## 5. Adobe study track (human-run exploration; ships only if it maps to a truth)

Authored here as real, brand-controlled vector (renders, inspectable, maps to the
semantic system): the **genesis storyboard** and the **semantic palette/badge sheet**.
The rest of the stack is the exploration track, with a single gate — *what basketball
or statistical truth does this reveal?*:

- **Illustrator** — refine node/ring/badge/hazard glyphs until each shape is inevitable.
- **Adobe Color** — extend the semantic palette; resolve the amber collision.
- **Adobe Fonts** — pressure-test the type voice at 8px provenance notes *and* display stamps.
- **Premiere → Media Encoder** — pacing studies for §3; export reduced-motion comparisons.
- **Frame.io** — run §2 against real screenshots; annotate exact frames where truth is weak.
- **Substance / Project Neo / Firefly** — material + atmosphere studies (live = clean
  signal, fallback = dulled, stale = oxidized, proof = lit, shadow = ghosted). Studies
  only; nothing ships until it maps back to a semantic token.

Explicitly **not** done: auto-generated AI mood images treated as product. Studies
inspire; the semantic system decides.

---

## 6. Implementation recommendations

1. **Ship the harness + route now**; run the external capture; file the audit results.
2. **Fix the amber collision first** — it is the highest-risk truth bug in pixels.
3. **Build motion as CSS/SVG transitions on the existing components first** (entrance +
   the ring settle), gated behind `prefers-reduced-motion`. Defer WebGL until 2D motion
   proves it carries meaning.
4. **Keep the shadow line dimmed/dashed**; if any state feels crowded, move it behind a
   dev/audit toggle (as you flagged in 9F).
5. **Re-audit mobile** specifically — density is worst there.

---

## Checks

Strict `tsc -p tsconfig.check.json --noEmit` clean **including** the new catalog route.
All engine/math suites remain green (**488** self-checks across 19 suites); canonical
byte-stable (par 23.1, conf 0.60, beats +8.6/+4.0). No shipped values moved — 10A adds
a review route, a harness, two vector studies, and this audit.

## Out of scope (held)

Spectacle for spectacle, WebGL carrying critical info alone, trapping truth in canvas,
Pressure Lab, reopening Phase 9, redesigning components wholesale.
