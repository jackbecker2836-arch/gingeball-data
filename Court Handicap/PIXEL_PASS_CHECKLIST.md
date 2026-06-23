# Browser Pixel Pass — Checklist (Phase 11K)

**Status: PARTIALLY REVIEWED (sandbox raster) — full-fidelity confirmation pending on real Chromium.**

A pixel pass asks: *does the actual browser-rendered UI tell the truth?* It does not require a
deployment — a local browser render counts. The real cockpit component was server-rendered and
rasterized to real pixels in a sandbox WebKit engine (wkhtmltoimage) at desktop (1280) and
mobile (390), then inspected. That partial pass verified content-truth + color + overflow and
**caught a real mobile bug** (the provenance column scrolled off-screen — the honesty signal
hiding), now fixed and re-verified.

`browser_pixel_pass_missing` stays an active blocker (deploy banner = BLOCKED) until the four
unverified items below are confirmed on a real Chromium/localhost render and the review is
recorded in `lib/pixel-pass-manifest.ts` (`reviewed: true`).

## How to finish the pass (you, on localhost)

1. `npm run dev` → open `http://localhost:3000/internal/pressure-lab` (real Chromium, real webfonts).
2. Optionally `node scripts/capture-pressure-lab.mjs` for Chromium captures.
3. Confirm the four **[ ] (confirm on localhost)** items below.
4. If clean, set `reviewed: true` + `reviewedBy` + `reviewedDate` in the manifest. That removes
   the blocker; the banner recomputes to INTERNAL-ONLY (shadow composite still blocks live graduation).

## The one question

> Can a human misunderstand this as a public-ready product verdict?

If yes — **fail the pass.**

## Verified in the sandbox raster (real pixels, viewed)

- [x] INTERNAL / SYNTHETIC / NOT PUBLIC / SHADOW COMPOSITE / NOT LIVE APPLIED stamps visible without scrolling.
- [x] Deploy banner reads **BLOCKED** and names the pixel-pass blocker.
- [x] `browser_pixel_pass_missing` shown in banner + chips + legend (blocks deploy), not buried.
- [x] Deployment blockers obvious (not hidden behind an accordion).
- [x] Limitations visible per scenario, including on passing scenarios.
- [x] Green "BEATS COURT" pass states do not visually overpower blocker/limitation warnings.
- [x] Shadow composite does not look live-applied (applied:false footer + shadow language present).
- [x] Provenance color-distinct: engine_modeled green, *_engine_v1 amber, pending crimson, synthetic rust, fixture/estimate grey.
- [x] spacing_gravity_engine_v1 does not look like engine_modeled; deterrence_engine_v1 does not look like measured tracking.
- [x] Pass/fail does not hide limitations (passing scenarios still show their chips).
- [x] Provenance anchored left (proof 2nd column + colored row border) so it survives mobile horizontal overflow. **(bug found + fixed here)**
- [x] Engine-upgrade panel shows pending before→after honestly.
- [x] Archetype coverage shows modeled vs estimate vs missing counts.
- [x] No motion is used (reduced-motion trivially safe).

## Confirm on real Chromium/localhost (sandbox raster could not verify)

- [ ] (confirm on localhost) Typography: real webfonts load (Bricolage/Anton/Fraunces/Space Mono/Rubik Dirt) and the type treatment holds — sandbox used system fallback.
- [ ] (confirm on localhost) CSS-grid legend renders multi-column in Chromium (WebKit raster stacked it).
- [ ] (confirm on localhost) Text/chip contrast is comfortable (bone-on-void, chip text on severity colors) — measure if unsure.
- [ ] (confirm on localhost) Tables scroll horizontally on touch rather than crush at 390px.

## Recorded review

```
sandbox raster:  PERFORMED (Claude, 2026-06-18, wkhtmltoimage/WebKit, webfonts offline)
artifacts:       pixel-pass-captures/pressure-lab-desktop.png, pixel-pass-captures/pressure-lab-mobile.png
bug found+fixed: mobile provenance column hidden by overflow → anchored left
full pass:       reviewed=false (pending Chromium confirmation of the four items above)
reviewedBy:      —
reviewedDate:    —
```
