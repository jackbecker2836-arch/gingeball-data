// =============================================================================
// GINGEBALL COURT HANDICAP — DEPLOYMENT STATUS (Phase 11K)
//
// The deploy-readiness banner must be COMPUTED from the limitation registry, never
// hand-written. If a deployment blocker is present (e.g. browser_pixel_pass_missing), the
// route is BLOCKED. If deploy blockers clear but live-graduation blockers remain (the shadow
// composite), it is INTERNAL_ONLY. Only when everything clears is it READY_FOR_PROTECTED_STAGING.
// =============================================================================

import { resolveLimitations, type Limitation, type LimitationId } from "@/lib/limitation-registry";

export type DeploymentStatus = "BLOCKED" | "INTERNAL_ONLY" | "READY_FOR_PROTECTED_STAGING";

export interface DeploymentReadiness {
  status: DeploymentStatus;
  label: string;
  reason: string;
  deploymentBlockers: Limitation[];
  liveGraduationBlockers: Limitation[];
}

export function computeDeploymentStatus(ids: LimitationId[]): DeploymentReadiness {
  const limits = resolveLimitations(ids);
  const deploymentBlockers = limits.filter((l) => l.blocksDeployment);
  const liveGraduationBlockers = limits.filter((l) => l.blocksLiveGraduation);

  if (deploymentBlockers.length > 0) {
    return {
      status: "BLOCKED", label: "DEPLOYMENT STATUS: BLOCKED",
      reason: `blocked by ${deploymentBlockers.map((l) => l.displayLabel).join(", ")}`,
      deploymentBlockers, liveGraduationBlockers,
    };
  }
  if (liveGraduationBlockers.length > 0) {
    return {
      status: "INTERNAL_ONLY", label: "DEPLOYMENT STATUS: INTERNAL-ONLY",
      reason: `internal/staging only — live graduation blocked by ${liveGraduationBlockers.map((l) => l.displayLabel).join(", ")}`,
      deploymentBlockers, liveGraduationBlockers,
    };
  }
  return {
    status: "READY_FOR_PROTECTED_STAGING", label: "DEPLOYMENT STATUS: READY FOR PROTECTED STAGING",
    reason: "no deployment or live-graduation blockers detected",
    deploymentBlockers, liveGraduationBlockers,
  };
}

// ---------------------------------------------------------------------------
// SELF-CHECKS
// ---------------------------------------------------------------------------
export function runDeploymentStatusSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  // pixel pass present → BLOCKED
  const blocked = computeDeploymentStatus(["browser_pixel_pass_missing", "composite_shadow_only", "shadow_composite_not_applied"]);
  check("pixel pass present → BLOCKED", blocked.status === "BLOCKED");
  check("BLOCKED reason names the pixel pass", blocked.reason.toLowerCase().includes("pixel"));
  check("BLOCKED lists the deployment blocker", blocked.deploymentBlockers.length >= 1);

  // pixel pass cleared, shadow remains → INTERNAL_ONLY
  const internal = computeDeploymentStatus(["composite_shadow_only", "shadow_composite_not_applied"]);
  check("deploy blocker cleared, shadow remains → INTERNAL_ONLY", internal.status === "INTERNAL_ONLY");
  check("INTERNAL_ONLY has no deployment blockers", internal.deploymentBlockers.length === 0);
  check("INTERNAL_ONLY still names a live-graduation blocker", internal.liveGraduationBlockers.length >= 1);

  // everything cleared → READY
  const ready = computeDeploymentStatus(["fixture_estimate_screen_assist"]);
  check("all blockers cleared → READY_FOR_PROTECTED_STAGING", ready.status === "READY_FOR_PROTECTED_STAGING");

  // empty → READY
  check("no limitations → READY", computeDeploymentStatus([]).status === "READY_FOR_PROTECTED_STAGING");

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runDeploymentStatusSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
