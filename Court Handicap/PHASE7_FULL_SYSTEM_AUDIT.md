# Phase 7 — Full-System Audit & Canonicalization

The core chain exists end-to-end. Phase 7 makes it prove itself across a wider,
messier synthetic world — and produces an evidence-based list of what to tune
next. **Nothing was tuned in this phase; the audit only reads the chain.**

## What was built

- `fixtures/court-handicap-audit-universe.ts` — the audit world, labeled
  `synthetic_audit_fixture` (a new, distinct provenance), separate from the 5B
  lab. A canonical base + 12 scenario overrides, each carrying *behavioral*
  expectations (signs, orderings, flags, labels), never memorized numbers.
- `lib/audit-harness.ts` — runs every scenario through the REAL chain
  (market → lineup → archetype → proof → verdict-confidence), checks expectations,
  and emits findings. 26 behavioral checks, all green.

## Scenarios audited

canonical (hostile, beaten) · hostile court failed · favorable court still
underperformed · loses-market-beats-lineup · lineup-helps (par rises above
market) · thin possession sample · missing moneylines · low book agreement ·
stale/steamed line · rim-protector inversion · non-modeled archetype ·
clean/live-like inputs. The most important test — **the system behaves honestly
when basketball gets messy** — holds: difficulty never decides the verdict, an
easy court never manufactures a beat, and missing inputs are named, not invented.

## Findings — the prioritized tuning list (for later, with evidence)

1. **Provenance penalty is stacked.** Identical chain scores **0.47 synthetic vs
   0.60 live** — a 0.13 gap. Synthetic is penalized in proof + lineup + archetype
   `dataIntegrity` *and* again in the consolidator's provenance factor. **Lean:**
   drop the consolidator's separate factor (keep the PROVISIONAL label); the
   per-layer `dataIntegrity` already encodes it.
2. **Proof confidence collapses hard.** Six multiplicative factors pull it to
   **0.41 at full sample, 0.13 thin**. It is the weakest layer in **11 of 12**
   scenarios, so it dominates the cap almost everywhere. **Lean:** soften the
   proof composite (fewer factors, or a floor) before it makes every verdict LOW.
3. **Tier thresholds need a universe, not one case.** canonical = LOW·PROVISIONAL,
   clean = MEDIUM, thin = LOW·PROVISIONAL. Review HIGH/MEDIUM/LOW cutoffs against
   the spread of cases, not the canonical alone.
4. **Par ordering is honest and flexible.** The lineup engine *can* raise par
   above market (lineup_helps: 24.6 > 24.5), so the "beat market / lose lineup"
   mirror is representable — no hidden clamp. Good.
5. **Favorable-court honesty confirmed.** difficulty 26 (easy) with beat-lineup
   −7.2 — an easy court does not manufacture a beat. Good.
6. **Audit path simplification noted.** The harness uses a single per-100
   denominator (vs the pipeline's 66.5/67 split), so canonical final reads 0.47
   here vs 0.44 in production — same label, ~0.03 from the denominator choice.
   Not a bug; flagged so the two numbers aren't mistaken for a regression.

## Provenance states exercised

engine-backed · synthetic_fixture · synthetic_audit_fixture · fixture · live ·
missing fields (moneylines → no win prob) · pendingEngine (non-modeled archetype).
The chain never blurred these.

## Not done (held the line)

No 5C grading, no 4D transport, no non-scoring valuation, **no constant tuning.**
The findings above are recommendations, not changes.

## Checks

`tsc -p tsconfig.check.json --noEmit` clean (strict). Self-checks: 8 + 7 + 14 +
20 + 16 + 15 + 21 + 52 + **26** = **179** green. The canonical chain still
produces 103·99 / 24.5 / 23.1 / +8.6, and every prior suite remains stable.
