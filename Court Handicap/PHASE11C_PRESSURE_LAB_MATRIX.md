# Phase 11C — Internal Pressure Lab Runner & Two-Team Archetype Impact Matrix

Pressure Lab begins — internally, as a truth engine. The lab now has a cockpit, and it
can show not only *whether* Court Handicap passed, but *what kind of basketball truth it
has and has not proven — for both teams.*

> **The court is made of both teams. The player reads the court — and changes it.**

Internal. Synthetic. Not public. Not a polished feature.

---

## 1. What was built

- **`lib/audit-universe/archetype-impact-matrix.ts`** — the two-team matrix. Each
  archetype is tested on Team X and Team Y across three separated directions: **self-read**
  (how the court reads him), **own-team impact** (how he changes his own team's court),
  **opponent impact** (how he changes the opponent's court). 20 self-checks.
- **`lib/audit-universe/pressure-lab.ts`** — the cockpit runner. For every synthetic
  scenario it emits expected-vs-actual checks, a pass flag, and full layer traces
  (market / lineup / archetype / proof / confidence / verdict / render-state / motion-lock),
  then folds in the integrity gates (`runAuditUniverse`) and the coverage rollup. 13 self-checks.
- **`design/pressure-lab-cockpit.html`** — the visible audit panel (static, renders here,
  stamped Synthetic · Internal). The React route stays parked behind the browser pixel pass.

---

## 2. The impact method (honest proxy, not a simulation)

Own-team and opponent impact are **signal-sensitivity deltas on the real engine chain**:
vary the one signal an archetype plausibly controls, and measure how a guard's court
moves. This is engine-backed but is *not* a roster re-simulation — every impact is tagged
`signal-sensitivity proxy · synthetic_audit_fixture` so it can never read as a lineup swap.

**Engine finding (and a correction to 11B).** Probing the guard's court revealed the true
polarity of the signals:

| signal | raising it does | so it is really |
|---|---|---|
| spacing | difficulty 61 → 80, fit 40 → 24 | a **spacing-scarcity / difficulty** factor, not a "good spacing" knob |
| poa | difficulty 59 → 76 | point-of-attack **pressure** |
| rim | difficulty 64 → 77 | **rim protection faced** |
| synergy | difficulty −1, fit 25 → 36 | a **fit / relief** factor (moves fit, barely difficulty) |

So an archetype's effect must be modeled by the direction it pushes its signal, read on the
metric that signal actually moves. This also corrects the 11B narrative: the crossing
court's guard was hostile because of **high POA + rim pressure**, not "low spacing" — low
spacing actually mildly *helped* the guard while strongly helping the rim (uncongested
paint). The crossing result held; my stated mechanism for the guard was loose. The lab
caught it.

---

## 3. The matrix (engine-computed, both teams)

| archetype | self-read | own-team | opponent | coverage |
|---|---|---|---|---|
| scoring_guard | d75/f28 (X), d62/f36 (Y) · modeled | — (hero read) | — | covered |
| rim_protector | d56/f71 (X), d50/f62 (Y) · modeled | — | rim↑ → opp diff **+6** ✓ | covered |
| roll_big | estimate | synergy↑ → fit **+6/+5** ✓ | — | partial |
| spot_up_wing | estimate | spacing↓ → diff **−8** ✓ | — | partial |
| connector | estimate | synergy↑ → fit **+6/+5** ✓ | — | partial |
| defensive_stopper | estimate | — | poa↑ → opp diff **+8** ✓ | partial |
| secondary_creator | not modeled | — | — | missing |
| high_usage_star | not modeled | — | — | missing |
| low_usage_specialist | not modeled | — | — | missing |

Every engine-backed effect holds in the correct basketball direction, and **holds on both
teams** (mildly weaker on the thinner Team Y for synergy: +6 → +5). Coverage of 18 rows:
**4 covered · 8 partial · 6 missing.** Gaps are named, not hidden: secondary_creator,
high_usage_star, low_usage_specialist.

Honesty held in the model: only scoring_guard and rim_protector have a **modeled self-read**
in the audit chain; every other row confesses a **fixture estimate** for its own par.
Impact can still be engine-backed via the signal lever — those are distinct claims, and the
matrix keeps them distinct.

---

## 4. The cockpit runner

`runPressureLab()` produces a trace per scenario: expected-vs-actual pairs, a pass flag, and
the eight layer readings, plus a summary (scenarios passed, integrity gates passed,
motion-lock, coverage rollup). The self-checks assert traces exist for every scenario, the
confidence tier and render-state badge are always shown, a non-modeled scenario renders a
fixture-estimate basis, missing-moneyline shows no invented win prob, the integrity gates
are green, and coverage names the gaps.

---

## Checks

Strict `tsc` clean. New suites: `archetype-impact-matrix` **20**, `pressure-lab` **13**.
All existing suites remain green; canonical math byte-stable; no product path
contaminated (the lab is read-only and never imported by the product page).

## Deployment posture (unchanged)

Still not public. Sequence: 11C internal runner → browser pixel pass → fix truth issues →
protected internal/staging route → later public decision. Public is a trust event for
someone who did not watch the build.

## Out of scope (held)

Public/polished Pressure Lab UI, flashy or AI-generated visuals, deploy, coefficient
overfitting, forcing effects the engine won't produce, full roster-swap simulation, the
React pixel pass.

## Parked / next

- Modeled self-read par for roll_big, spot_up_wing, connector, defensive_stopper (promote
  estimate → engine).
- Wire secondary_creator / high_usage_star / low_usage_specialist levers (close the 6 missing).
- Per-archetype distinct levers (a connector's turnover-relief vs a wing's spacing) rather
  than the shared guard-read probe.
- The React cockpit route + the browser pixel pass (the open gate before internal deploy).
