# Phase 4A — Production Component Integration

The four-object world now renders from **real Next.js components** that consume a
single `CourtHandicapView`. The exploratory `.jsx` is archived; this is the
canonical product path.

## Data flow (one direction)

```
StubOddsFeed ──▶ computeMarketCourt / lineMovement ──▶ buildCourtHandicapView ──▶ CourtHandicapView
 (adapters)            (lib/market-court-engine)          (lib/manifest-view-model)        │
 fixtures/fake-game ───────────────────────────────────────────────┘                      │
                                                                                            ▼
                              app/court-handicap/page.tsx (server)  ──▶  CourtHandicapWorld (client)
                                                                              ├─ CourtGraph
                                                                              ├─ MarketHub
                                                                              ├─ PlayerCourtConditions
                                                                              └─ OutcomeVerdict
```

`lib/manifest-source.ts` is the **only** place the feed + fixture are joined.
When the live odds adapter lands (Phase 4B), only that file changes.

## What each component consumes (no scattered constants)

| Component | Prop | Source |
|---|---|---|
| CourtGraph | `CourtGraphView` + `onSelect` | engine burn + fixture players/synergies/possessions |
| MarketHub | `MarketHubView` + `onAdjust` | **engine** (implied, poss, ppp, win prob, movement) |
| PlayerCourtConditions | `ConditionsView` | engine marketPar/actual; **fixture** lineupPar/fit/diff/slope |
| OutcomeVerdict | `VerdictView` | engine per-100 + beat-vs-market; lineup basis pending |

## Provenance (visible + honest)

The `provenance` block is rendered in the World header. Engine-backed fields show
solid; pending-engine fields (lineup par, fit/difficulty/slope) render with a
dotted "○" treatment and a legend. The interface never implies fake computed data.

## Run / verify

```
npm install --no-bin-links --no-save react@18 react-dom@18 @types/react@18 @types/react-dom@18 @types/node
npx tsc -p tsconfig.check.json --noEmit     # clean
npx tsx lib/manifest-view-model.ts          # 10/10
```

In the gingeball-app repo, drop `app/ components/ lib/ adapters/ fixtures/` into
the root (merging `app/`). Imports use the `@/*` alias already configured in Next.

## Parked (named, not faked)

Phase 4 lineup engine (earns 24.5 → 23.1) · Phase 5 archetype engine
(fit/difficulty/slope) · live odds adapter (4B) · full per-player conditions ·
game-night Handicap Manifest (reference artifact kept in `/reference`).
