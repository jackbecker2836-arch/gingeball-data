# Phase 11K — React Pressure Lab Route & Browser Pixel Pass

The lab becomes visible — and a visible lab has to be visually honest, not just internally
honest. 11K builds the internal route, a deploy-readiness banner computed from the limitation
registry, and the means to run the browser pixel pass. The pixel pass itself stays **pending**:
this sandbox cannot render React to pixels, so it must be run by a human on real hardware.

> **The lab can be seen without being misunderstood.**

---

## 1. Internal route

`app/internal/pressure-lab/page.tsx` — a server component that builds the view-model and hands
it to a client cockpit. It is **not** the public product route, is marked `robots: noindex`, and
should sit behind protected access before any staging deploy (wired in 11L). The page holds no
logic.

`components/court-handicap/PressureLabCockpit.tsx` (`"use client"`) renders, clear-first:

- a persistent **stamp band** — INTERNAL · SYNTHETIC · NOT PUBLIC · SHADOW COMPOSITE · NOT LIVE APPLIED;
- the **deploy banner** (computed, dominant, color by status);
- **engine upgrades** (deterrence + spacing-gravity pending before→after, v1 provenance);
- **archetype coverage** (registry self-read counts + gaps);
- per-scenario cards: **expected-vs-actual** tables (with inverse stats, proof status) and
  **severity-colored limitation chips**;
- a **limitation legend**;
- an explicit `applied:false · mode:shadow` footer.

Honesty-as-design: provenance is color-distinct — `engine_modeled` green, `*_engine_v1` amber,
`pending_engine` crimson, fixture/synthetic grey/rust — so a v1 engine never looks measured and
a pending stat can't hide. Green pass states never visually outweigh blocker chips. No motion
(reduced-motion safe by default).

## 2. Computed deploy banner

`lib/deployment-status.ts` — `computeDeploymentStatus(limitationIds)`:

- any `blocksDeployment` limitation → **BLOCKED** (names the blocker);
- deploy blockers clear but `blocksLiveGraduation` remains → **INTERNAL-ONLY**;
- all clear → **READY FOR PROTECTED STAGING**.

The banner is computed from the registry, never hand-written. Right now
`browser_pixel_pass_missing` is present, so the banner reads **BLOCKED** — the lab itself
refuses to look deployable.

## 3. View-model

`lib/pressure-lab-view-model.ts` — `buildPressureLabView()` assembles a serializable view (no
new math): per-scenario stat vectors, limitations (incl. the pixel-pass blocker), engine
upgrades, coverage, and the computed deployment status. This keeps the route testable without
pixels — the cockpit just renders the view.

## 4. Browser pixel pass (pending, honest)

`scripts/capture-pressure-lab.mjs` captures the route at desktop / mobile / reduced-motion;
`docs/PIXEL_PASS_CHECKLIST.md` is the human review keyed to the one question — *can a human
misunderstand this as a public-ready product verdict?* `lib/pixel-pass-manifest.ts` records
`reviewed: false`. While false, `browser_pixel_pass_missing` stays active and the banner stays
BLOCKED. The limitation clears only when a human runs the capture on real hardware, walks the
checklist, and records the review. **It is not resolved in this phase.**

---

## Checks

Strict `tsc` clean (route + cockpit + view-model compile). New `deployment-status` **8**,
`pressure-lab-view-model` **11**. All prior suites green; scoring math byte-stable; composite
`applied:false`; product path uncontaminated. The view-model self-checks assert the banner is
BLOCKED while the pixel pass is unreviewed, every scenario carries the pixel-pass blocker, a
passing scenario still shows limitations, and provenance distinguishes v1 from engine_modeled.

## Out of scope / not done

Public deploy; polishing into a consumer feature; graduating the composite; mutating the live
verdict; **resolving the pixel pass** (genuinely pending — sandbox can't render).

## Pressure Lab arc (capped)

- 11J — Limitation Registry & Spacing-Gravity Engine v1 ✓
- **11K — React Pressure Lab Route & Browser Pixel Pass** ✓ (route + harness built; pixel pass pending)
- 11L — Internal/Staging Hardening & Protected Deployment
- 11M — Shadow Graduation Readiness Review

Protected internal/staging becomes realistic once a human completes the pixel pass and 11L wires
protected access. Public remains a later trust event.
