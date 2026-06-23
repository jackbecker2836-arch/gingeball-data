// scripts/capture-pressure-lab.mjs — BROWSER PIXEL PASS capture harness (Phase 11K)
//
// This sandbox cannot render React to pixels. Run this on real hardware against the running
// app to capture the internal Pressure Lab route at desktop, mobile, and reduced-motion, then
// walk docs/PIXEL_PASS_CHECKLIST.md against the captures. Only after a human review is recorded
// (lib/pixel-pass-manifest.ts: reviewed=true) does `browser_pixel_pass_missing` clear.
//
// Usage:
//   npm run dev   # serve the app
//   node scripts/capture-pressure-lab.mjs   # in another shell
//
// Requires: npm i -D playwright && npx playwright install chromium

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const BASE = process.env.LAB_URL ?? "http://localhost:3000";
const ROUTE = "/internal/pressure-lab";
const OUT = "pixel-pass-captures";

const shots = [
  { name: "desktop", viewport: { width: 1280, height: 1600 }, reducedMotion: "no-preference" },
  { name: "mobile", viewport: { width: 390, height: 2400 }, reducedMotion: "no-preference" },
  { name: "reduced-motion", viewport: { width: 1280, height: 1600 }, reducedMotion: "reduce" },
];

const run = async () => {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  for (const s of shots) {
    const ctx = await browser.newContext({ viewport: s.viewport, reducedMotion: s.reducedMotion });
    const page = await ctx.newPage();
    await page.goto(BASE + ROUTE, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/pressure-lab-${s.name}.png`, fullPage: true });
    // surface the computed banner text so the reviewer can confirm BLOCKED is shown
    const banner = await page.locator("text=DEPLOYMENT STATUS").first().textContent().catch(() => null);
    console.log(`[${s.name}] captured. banner: ${banner ?? "(not found — FAIL: banner must be visible)"}`);
    await ctx.close();
  }
  await browser.close();
  console.log(`\nCaptures in ./${OUT}. Now walk docs/PIXEL_PASS_CHECKLIST.md before recording the review.`);
};

run().catch((e) => { console.error(e); process.exit(1); });
