# RAPM / EPM Improvement — Proposed Frameworks & Honest Triage

**Date:** 2026-06-21
**Status:** assessment of proposed equations + the real, implementable path forward.

This records a batch of proposed "advanced math" frameworks for improving our RAPM/EPM
impact data, **with an honest engineering triage** so that whoever picks this up later
builds the parts that are real and skips the parts that aren't. Read the triage before
implementing anything here.

---

## TL;DR

RAPM is, underneath, a penalized linear regression:

```
(XᵀX + Λ) β = XᵀY
```

where `X` = lineup/possession design matrix, `Λ` = penalty (regularization) structure,
`Y` = possession outcomes, `β` = player impact ratings.

An "improvement" is only real if it changes `X`, `Λ`, `Y`, or the prior in a **defined,
computable** way that reduces collinearity, sample bias, or noise. Judged on that bar:

- **Most of the proposed equations are metaphorical** — real pure-math objects (persistent
  homology, derived tensor products, Kan extensions, univalence) mapped onto basketball
  terms without a computable construction. Not implementable as written.
- **A few contain genuine, useful kernels** once stripped of the formalism. Those are
  flagged KEEP below and map onto established, proven techniques.

When a method "doesn't exist anywhere," the honest prior is usually *it doesn't work / isn't
well-defined*, not *untapped edge*. That is mostly the case here. The genuine improvements
to RAPM **do** already exist (Bayesian priors, possession weighting, multi-season decay) and
are what we should build.

---

## Triage of the proposed frameworks

### 1. Topological Data Analysis (TDA)
- **1.1 Persistence-weighted ridge penalty** — KERNEL: a *non-uniform* penalty `Λ`
  (fused/Laplacian ridge) using player-similarity beats uniform shrinkage. **KEEP the idea**,
  drop the persistence-diagram machinery; use archetype/position similarity for the off-diagonal
  structure. Implementable.
- **1.2 Wasserstein cross-season alignment** — NEED is real (cross-season normalization).
  Tool is overkill/unmotivated. Use aging curves + decay-weighted multi-season ridge instead. SKIP as written.
- **1.3 Betti-number regularization** — no defined player manifold to compute Betti curves over. SKIP.
- **1.4 Landmark subsampling** — real technique, but RAPM's problem isn't dataset size; doesn't address collinearity. LOW VALUE.
- **1.5 Euler-characteristic smoothing** — decorative; no Vietoris-Rips complex defined on players. SKIP.

### 2. Geometric Measure Theory (GMT)
- **2.1 Minimal-surface penalty** — no spatial manifold the players live on; `∇β` undefined. SKIP.
- **2.2 Total-variation target denoising** — KERNEL: *down-weight garbage-time / low-leverage
  possessions before fitting*. **KEEP the intent** (possession/leverage weighting). TV-denoising
  specifically is misapplied (possessions have no 1-D ordering). Implement as possession weights, not TV.
- **2.3 Flat-metric low-sample distance** — restates "regularize low-sample stints," which ridge already does. LOW VALUE.
- **2.4 Varifold playoff deformation** — metaphor; no computable construction. SKIP.
- **2.5 Caccioppoli/BV perimeter penalty** — BV/total-variation penalty on β is a real regularizer,
  but motivation here is thin vs. ridge/elastic-net. LOW VALUE.

### 3. Arithmetic Geometry — **SKIP ENTIRELY**
Derived fiber products, cohomological Euler characteristics, Serre intersection multiplicity,
Grothendieck–Riemann–Roch, Néron–Severi. These act on cycles/sheaves/schemes over a ring.
There is no object in RAPM that *is* such a scheme; "Tor groups = spacing nullification" is
analogy, not math. Nothing to implement. Not real for this problem.

### 4. Category Theory — mostly SKIP
- **4.4 Pullback offense/defense sync** — the only one with a usable shadow: it's describing an
  aligned join of offensive and defensive design matrices on a common key. That's a data-join, not
  a new method. LOW VALUE (we already align on player/season).
- **4.1 natural transformations, 4.2 Kan extension, 4.3 monad ("Unit Unit Unit"), 4.5 sheaf gluing**
  — metaphorical; no computable functor categories defined. SKIP.

### 5. Homotopy Type Theory (HoTT)
- **5.2 Path-transport for sample-deficit extrapolation** — KERNEL, and the best one here:
  stripped of univalence/transport, this is *borrow strength from similar players via priors*
  for low-sample players. **KEEP** — this is hierarchical / Bayesian RAPM and directly fixes our
  112-player tail and the part-time-player rate problem.
- **5.1 univalence, 5.3 HIT, 5.4 homotopy extension, 5.5 loop-space filter** — decorative; the
  statistical content (shrinkage, stability across roster changes) is already handled by priors +
  ridge. SKIP the formalism.

---

## What actually moves RAPM/EPM (established, proven, build these)

1. **Bayesian / prior-informed RAPM.** Use box-score (BPM/EPM) or archetype priors as the mean
   the ridge shrinks toward, instead of shrinking toward zero. This is the real version of the
   "transport to low-sample players" idea (Eq 5.2) and the single highest-value upgrade —
   it gives stable ratings to bench/low-minute players (our 112 tail) and tempers rate-inflated
   part-timers (the Steven-Adams case).
2. **Similarity-structured penalty (Eq 1.1 kernel).** Non-uniform `Λ` using archetype/position
   similarity so similar players regularize toward each other. Modest, real gain.
3. **Possession / leverage weighting (Eq 2.2 kernel).** Down-weight garbage time and low-leverage
   possessions in `Y`. Modest, real gain; cheap to add.
4. **Multi-season decay + aging curves** for cross-season stability (the real version of Eq 1.2's
   intent). Proven.
5. **CV-tuned regularization** (pick `λ` by cross-validation rather than by hand). Free accuracy.

## Connection to current model state (as of this session)
- We just rebuilt `iib` for the 2024-25 published model: RAPM-primary, calibrated ESPN/BPM fill,
  coverage 167 → 457, with 112 still in the tail.
- **Items 1 (Bayesian priors) and 3 (possession weighting) are the direct upgrades** that would
  shrink that 112 tail and reduce the part-time-player rate spikes we had to calibrate around.
- These require re-running RAPM ourselves (we currently consume external RAPM/EPM), which is a
  GPU/compute phase, not something the current CPU sandbox can fit.
