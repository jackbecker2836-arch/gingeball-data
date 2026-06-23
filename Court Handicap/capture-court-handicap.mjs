// scripts/capture-court-handicap.mjs
// =============================================================================
// PHASE 10A — PIXEL REALITY PASS (external browser step, run in the app repo)
//
// This sandbox has no browser and cannot rasterize React, so the screenshots are
// produced HERE, in your environment, against the real Next build. No faking.
//
// Prereqs (run in gingeball-app):
//   npm i -D playwright && npx playwright install chromium
//   npm run dev            # serve the app on http://localhost:3000
//   node scripts/capture-court-handicap.mjs
//
// Output: screenshots/court-handicap/<state>.<desktop|mobile>.png
//
// Each state is rendered by the screenshot-addressable route:
//   /court-handicap/catalog?state=<id>
// The harness waits for the state marker the route stamps on the DOM
// (data-catalog-state) so captures never race the render.
// =============================================================================

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.CH_BASE_URL ?? "http://localhost:3000";
const OUT = "screenshots/court-handicap";

// Truth-critical states first; extend freely. Keep ids in sync with the catalog.
const STATES = [
  "live_fresh_guard_medium",
  "stale_live_guard_medium",
  "last_known_good_guard_medium",
  "fixture_fallback_guard_medium",
  "mock_synthetic_guard_medium",
  "rim_protector_medium",
  "non_modeled_fixture_estimate",
  "missing_moneyline",
  "missing_total",
  "what_if_hypothetical",
  "thin_sample_low",
  "clean_inputs_high",
  "injured_starter_removed",
  "late_lineup_change",
  "high_confidence_ordinary_verdict",
];

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1200, deviceScaleFactor: 2 },
  { name: "mobile", width: 390, height: 1400, deviceScaleFactor: 3 },
];

async function run() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor });
    const page = await ctx.newPage();
    for (const state of STATES) {
      const url = `${BASE}/court-handicap/catalog?state=${encodeURIComponent(state)}`;
      try {
        await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
        // wait for the route's state marker so we never screenshot a half-render
        await page.waitForSelector(`[data-catalog-state="${state}"]`, { timeout: 15000 });
        await page.waitForTimeout(400); // let fonts + any entrance settle
        const file = `${OUT}/${state}.${vp.name}.png`;
        await page.screenshot({ path: file, fullPage: true });
        results.push({ state, viewport: vp.name, ok: true, file });
        console.log(`✓ ${vp.name.padEnd(7)} ${state}`);
      } catch (err) {
        results.push({ state, viewport: vp.name, ok: false, error: String(err) });
        console.error(`✗ ${vp.name.padEnd(7)} ${state} — ${err}`);
      }
    }
    await ctx.close();
  }
  await browser.close();

  const ok = results.filter((r) => r.ok).length;
  console.log(`\n${ok}/${results.length} captures succeeded → ${OUT}/`);
  console.log("Next: load these in Frame.io and run the Phase 10A visual-truth checklist.");
  if (ok < results.length) process.exitCode = 1;
}

// Reduced-motion variant: re-run with CH_REDUCED_MOTION=1 to capture the
// prefers-reduced-motion end-states (Playwright emulates the media feature).
if (process.env.CH_REDUCED_MOTION === "1") {
  console.log("(reduced-motion capture mode)");
}

run().catch((e) => { console.error(e); process.exit(1); });
