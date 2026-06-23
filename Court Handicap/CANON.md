# Court Handicap — Terminology Canon

> **The market sets the court. The lineup shapes it. The archetype translates it. The possessions prove it. Gingeball grades who beat it.**

This file is the locked vocabulary for Court Handicap. Code, schema, UI copy, and
formulas use these terms exactly. The word is **Court**, never *Course* — *Course*
appears only when explaining the golf analogy historically.

## Deprecated → Correct

| Deprecated (do not use) | Canonical |
|---|---|
| Course Rating | **Court Rating** |
| Course Handicap | **Court Handicap** |
| Course Difficulty | **Court Difficulty** |
| Beat the Course | **Beat the Court** |

## Core concepts

- **Court** — the full basketball environment a player/lineup/team is asked to perform in: market expectation, spread, total, moneyline, implied totals, props, starting lineups, spacing, creation, defense, opponent scheme, archetype, role burden, possession type, pace, rest, venue, travel, injuries, score state, shot clock, leverage, garbage weight, and confidence. Not just the hardwood.
- **Court Par** — the expected performance for an average player/team/lineup in this exact context. Raw stats are meaningless without it.
- **Beat the Court** — actual performance minus court-adjusted par.
- **Court Rating** — expected value for a league-average performer in the context.
- **Court Slope** — how much the context separates elite performers from replacement-level. High-slope = skill-revealing.
- **Court Fit** — 0–100 compatibility between a player's archetype and the court.
- **Court Difficulty** — 0–100 difficulty of the assignment (distinct from Fit).
- **Court Label** — the human-readable verdict: Dream, Eruption, Plus-Handicap Test, Trap, Role Amplifier, Role Suppression, Neutral, Low-Signal, High-Burden.

## The handicap family (never one black-box number)

- **Player Court Handicap** — composite five-lambda player value vs court par.
- **Team Court Handicap** — team net rating vs market/context-adjusted par.
- **Market Court Handicap** — performance vs market-implied par.
- **Possession Court Handicap** — per-possession value vs possession par.
- **Role Court Handicap** — value above par inside a specific basketball job (the moat).

## Par variants

- **Market-Implied Par** — par derived from spread/total/props.
- **Lineup-Adjusted Par** — par after the confirmed starting lineup bends the court.
- **Role Par** — expected value for an average player in a specific role/context.
- **Possession Par** — expected points for a possession given its context.

## Pregame surfaces

- **Tonight's Court** — the pregame court for a game.
- **Player Court Conditions** — the per-player pregame card (par, fit, difficulty, slope, label).
- **Starting Lineup Court** — the court created by the confirmed five.
- **Archetype Court** — the same game seen through one of the 12 archetype families.

## Confidence

- **Confidence Ring** — every number ships with a 0–1 confidence, rendered as ring completeness, never a generic text pill. Components: sample, market, role, attribution, lineup-continuity, data-integrity.

## The 12 Archetype Courts

Scoring Guard · Playmaking Guard · Movement Shooter · Wing Scorer · Rim Pressure ·
Hub Big · Roll Big · Rim Protector · 3-and-D Stopper · Connector · Microwave Scorer ·
Defensive Chaos Athlete.

A low-total game is not universally good or bad — it is a trap court for a scoring
guard and a dream court for a rim protector. The court is always evaluated **through
the archetype**.
