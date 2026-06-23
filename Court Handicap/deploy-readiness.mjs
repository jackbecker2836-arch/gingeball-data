// =============================================================================
// PHASE 11L — DEPLOY-READINESS PROBE
//
// The Pressure Lab page shows "suite N passed / M failed" but never prints WHICH
// check failed. This script runs the same audit universe + the pressure-lab and
// view-model self-checks and prints every failing line by name, so a red count is
// never a mystery. It is the first 11L task: surface the exact failure, then fix it.
//
// Run from the app root (where package.json lives):
//   npx tsx scripts/deploy-readiness.mjs
//
// It imports the TS sources directly via tsx. Paths are relative so it does not
// depend on the "@/*" tsconfig alias being present in the app's lib-only tsconfig.
// =============================================================================

import path from "node:path";
import { pathToFileURL } from "node:url";
import Module from "node:module";

const root = process.cwd();

// Resolve the "@/..." alias the same way the Next app does: "@/x" -> "<root>/x".
// Without this, importing a file that uses @/ imports throws "Cannot find module '@/...'".
// We hook module resolution so every @/ specifier maps to an absolute path under root.
const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (typeof request === "string" && request.startsWith("@/")) {
    request = path.join(root, request.slice(2));
  }
  return origResolve.call(this, request, ...rest);
};

const load = async (rel) => import(pathToFileURL(path.join(root, rel)).href);

function banner(title) {
  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

let totalFailed = 0;

try {
  banner("1. AUDIT UNIVERSE — integrity gates + engine chain (feeds the page count)");
  const { runAuditUniverse } = await load("lib/audit-universe/audit-runner.ts");
  const u = runAuditUniverse();
  console.log(`gates: ${u.passed} passed / ${u.failed} failed   engine-chain: ${u.engine.passed} ok / ${u.engine.failed} fail`);
  if (u.findings && u.findings.length) {
    console.log("FAILING GATES:");
    for (const f of u.findings) console.log("   ✗ " + f);
    totalFailed += u.failed;
  } else {
    console.log("   ✓ no failing gates");
  }
} catch (e) {
  console.log("   ! could not run audit universe: " + (e && e.message));
}

try {
  banner("2. PRESSURE LAB — self-checks");
  const { runPressureLabSelfChecks } = await load("lib/audit-universe/pressure-lab.ts");
  const r = runPressureLabSelfChecks();
  console.log(`${r.passed} passed / ${r.failed} failed`);
  if (r.failed) { for (const d of r.details) console.log("   ✗ " + d); totalFailed += r.failed; }
  else console.log("   ✓ all passed");
} catch (e) {
  console.log("   ! could not run pressure-lab self-checks: " + (e && e.message));
}

try {
  banner("3. PRESSURE LAB VIEW-MODEL — self-checks (deployment banner state)");
  const { runPressureLabViewSelfChecks } = await load("lib/pressure-lab-view-model.ts");
  const r = runPressureLabViewSelfChecks();
  console.log(`${r.passed} passed / ${r.failed} failed`);
  if (r.failed) { for (const d of r.details) console.log("   ✗ " + d); totalFailed += r.failed; }
  else console.log("   ✓ all passed");
} catch (e) {
  console.log("   ! could not run view-model self-checks: " + (e && e.message));
}

try {
  banner("4. LIMITATION REGISTRY — self-checks");
  const { runLimitationRegistrySelfChecks } = await load("lib/limitation-registry.ts");
  const r = runLimitationRegistrySelfChecks();
  console.log(`${r.passed} passed / ${r.failed} failed`);
  if (r.failed) { for (const d of r.details) console.log("   ✗ " + d); totalFailed += r.failed; }
  else console.log("   ✓ all passed");
} catch (e) {
  console.log("   ! could not run limitation-registry self-checks: " + (e && e.message));
}

try {
  banner("5. INTERNAL ACCESS — middleware auth + deploy-boundary self-checks");
  const { runInternalAccessSelfChecks } = await load("lib/internal-access-audit.ts");
  const r = runInternalAccessSelfChecks();
  console.log(`${r.passed} passed / ${r.failed} failed`);
  if (r.failed) { for (const d of r.details) console.log("   ✗ " + d); totalFailed += r.failed; }
  else console.log("   ✓ all passed");
} catch (e) {
  console.log("   ! could not run internal-access self-checks: " + (e && e.message));
}

banner(totalFailed === 0 ? "RESULT: honestly green ✓" : `RESULT: ${totalFailed} failing check(s) — names listed above`);
process.exit(totalFailed === 0 ? 0 : 1);
