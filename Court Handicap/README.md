# Gingeball Court Handicap

> **The market sets the court. The lineup shapes it. The archetype translates it. The possessions prove it. Gingeball grades who beat it.**

A future-season-ready basketball intelligence environment that measures how good a
player, lineup, or team was **after adjusting for the difficulty of the court they
were asked to play on**. Court Handicap is not one metric — it is a family of
connected engines with its own home inside Gingeball.

## What this package is

This is **Phase 1 — Canon & Contracts**: the durable foundation. None of it depends
on data you don't have yet. It's the skeleton every later phase plugs into, built so
that when next season's data flows in, the operating system is already standing.

```
court-handicap/
  db/schema.sql                     # Postgres/Supabase schema v1 — the backbone (3 layers + audit)
  lib/types.ts                      # TypeScript data contracts (single source of truth for shapes)
  lib/formula-registry.ts           # implemented, versioned, SELF-VALIDATING core math
  lib/metric-registry.ts            # how every metric renders on the CourtGraph
  docs/CANON.md                     # locked terminology (Court, not Course)
  docs/ROUTES_AND_COMPONENTS.md     # product route map + named UI component contracts
```

## Architecture (three layers + audit)

1. **Inputs** (source-agnostic): games, market lines, player props, starting lineups, box scores, play-by-play, archetypes. Populated by ingestion as data arrives — the table shapes don't care which provider it comes from.
2. **Par / Context** (derived expectations = *court par*): team market court, player court par, possessions with expected PPP / court rating / court slope.
3. **Outcome / Handicap** (actual vs par): team game handicap, player possession values, player game handicap, role handicap, rolling indices.
4. **Audit**: versioned formulas + calc runs so any game is reproducible deterministically.

## Integration with TCV

Same Supabase DB, dedicated `court_handicap` schema. Reuses `public.players` and
`public.seasons` (UUID ids), the locked accent-stripping `slug()`, and the ending-year
`season_year` convention. It connects to TCV's leaderboard/player/team/matchup pages
but lives at its own `/court-handicap/*` routes — a destination, not a submodule.

## Verify it

```bash
npx tsx lib/formula-registry.ts   # runs the mandate's validation set — 8/8 must pass
npx tsc --noEmit                  # strict typecheck across lib/ — must be clean
```

The validation set (all passing): implied totals 103/99 from −4/202; 10.9% suppression
on 24.5 vs 27.5; 88.6 expected possessions; 1.163 market PPP; 36.8 par-per-100 and
43.3 actual-per-100 → **+6.5 court beat**; Bayesian shrinkage → +8.59.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 1 | Canon, registries, contracts, schema v1, route/component map | **delivered (this package)** |
| 2 | Fake-data CourtGraph prototype (MarketHub, lineup nodes, tilt, scorecard, glossary) | next |
| 3 | Market Court + player par engine | math implemented; needs odds ingestion |
| 4 | PBP ingestion + possession engine | blocked on the scraper (per TCV handoff) |
| 5 | Starting Lineup Court | schema + contracts ready |
| 6 | Player / Team Court Handicap v1 | composite scaffolded |
| 7 | Role Court v2 | schema ready; needs manual role labels |
| 8 | Real-time game operations | audit tables in place |
| 9 | Advanced math (Bayes, slope model, lineup graph, Kalman live) | reserved in contracts |
| 10 | Full 3D / animation system | states + components mapped |
| 11 | Historical backfill | last, never blocks the live system |

## Principles enforced here

No formula logic in UI components (it lives in `formula-registry.ts`). No metric in
the UI without a registry entry + glossary key. Every derived/outcome row carries a
confidence and a formula version. Missing data is representable, never a silent crash.
The handicap is never flattened to a single black-box number — the five lambda
components are preserved end to end.
