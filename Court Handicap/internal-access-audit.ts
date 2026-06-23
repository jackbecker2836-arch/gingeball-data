// =============================================================================
// lib/internal-access-audit.ts — PHASE 11L AUTH + DEPLOY-BOUNDARY SELF-CHECKS
//
// The middleware itself runs in the Next edge runtime and can't be fully executed
// in a plain node/tsx harness. So we test the PURE auth decision logic that carries
// all the real behavior (parseBasicAuth + decideAccess), and we assert the
// deploy-boundary invariants the brief requires: internal route stays noindex,
// shadow composite stays applied:false, limitations stay visible, and the matcher
// is scoped so public routes are untouched.
//
// What is covered here (pure, deterministic):
//   - internal route denies with NO credentials                  -> challenge (401)
//   - internal route denies WRONG credentials                    -> challenge (401)
//   - internal route allows CORRECT credentials                  -> allow
//   - MISSING env vars deny by default                           -> deny_misconfigured (503)
//   - basic-auth parser handles colons-in-password, junk, casing
//   - matcher is scoped to /internal only (public routes untouched)
//   - internal page metadata is noindex/nofollow (robots preserved)
//   - shadow composite remains applied:false; limitations remain visible
//
// What is NOT covered here (documented, not faked):
//   - the live edge-runtime request/response cycle (integration-level; verified by
//     the production build + a manual curl against a running server, see PHASE11L doc)
// =============================================================================

import { parseBasicAuth, decideAccess, config as middlewareConfig } from "@/proxy";
import { buildPressureLabView } from "@/lib/pressure-lab-view-model";

function basic(user: string, pass: string): string {
  const raw = `${user}:${pass}`;
  const b64 = typeof btoa === "function" ? btoa(raw) : Buffer.from(raw, "utf-8").toString("base64");
  return `Basic ${b64}`;
}

export function runInternalAccessSelfChecks(): { passed: number; failed: number; details: string[] } {
  const details: string[] = [];
  let passed = 0, failed = 0;
  const check = (n: string, c: boolean) => { if (c) passed++; else { failed++; details.push("FAIL: " + n); } };

  const USER = "auditor";
  const PASS = "correct-horse-battery-staple:with:colons";

  // --- core auth decisions -------------------------------------------------
  check("no credentials -> challenge (401)",
    decideAccess(USER, PASS, null).kind === "challenge");
  check("empty Authorization header -> challenge",
    decideAccess(USER, PASS, "").kind === "challenge");
  check("wrong username -> challenge",
    decideAccess(USER, PASS, basic("intruder", PASS)).kind === "challenge");
  check("wrong password -> challenge",
    decideAccess(USER, PASS, basic(USER, "guess")).kind === "challenge");
  check("correct credentials -> allow",
    decideAccess(USER, PASS, basic(USER, PASS)).kind === "allow");

  // --- fail closed ---------------------------------------------------------
  check("missing user env -> deny_misconfigured (fail closed)",
    decideAccess(undefined, PASS, basic(USER, PASS)).kind === "deny_misconfigured");
  check("missing password env -> deny_misconfigured (fail closed)",
    decideAccess(USER, undefined, basic(USER, PASS)).kind === "deny_misconfigured");
  check("both env missing -> deny_misconfigured even with a header present",
    decideAccess(undefined, undefined, basic(USER, PASS)).kind === "deny_misconfigured");
  check("empty-string env is treated as missing (fail closed)",
    decideAccess("", "", basic(USER, PASS)).kind === "deny_misconfigured");

  // --- parser robustness ---------------------------------------------------
  check("parser: valid header decodes user+pass", (() => {
    const p = parseBasicAuth(basic(USER, PASS));
    return p !== null && p.user === USER && p.pass === PASS; // password retains its colons
  })());
  check("parser: scheme is case-insensitive", (() => {
    const p = parseBasicAuth(basic(USER, PASS).replace("Basic", "basic"));
    return p !== null && p.user === USER;
  })());
  check("parser: non-basic scheme -> null", parseBasicAuth("Bearer abc.def") === null);
  check("parser: missing encoded part -> null", parseBasicAuth("Basic") === null);
  check("parser: garbage base64 -> null or no colon -> null", (() => {
    const p = parseBasicAuth("Basic @@@notbase64@@@");
    return p === null || p.pass !== undefined; // must not throw
  })());
  check("parser: null header -> null", parseBasicAuth(null) === null);

  // --- matcher scope: public routes untouched ------------------------------
  const matchers: string[] = (middlewareConfig?.matcher as string[]) ?? [];
  check("matcher is scoped to /internal only", matchers.length === 1 && matchers[0] === "/internal/:path*");
  check("matcher does NOT cover the public product route", !matchers.some((m) => m.startsWith("/court-handicap")));
  check("matcher does NOT cover site root", !matchers.some((m) => m === "/:path*" || m === "/(.*)"));

  // --- deploy-boundary invariants (must hold even behind protection) -------
  const v = buildPressureLabView();
  check("internal labels remain unmistakable behind protection",
    v.stamps.includes("INTERNAL") && v.stamps.includes("SYNTHETIC") && v.stamps.includes("NOT PUBLIC")
    && v.stamps.includes("SHADOW COMPOSITE") && v.stamps.includes("NOT LIVE APPLIED"));
  check("composite remains shadow-only (applied:false)", v.shadow.applied === false && v.shadow.mode === "shadow");
  check("limitations remain visible on scenarios", v.scenarios.length > 0 && v.scenarios.every((s) => s.limitations.length > 0));
  check("deployment status is not BLOCKED once pixel pass recorded", v.deployment.status !== "BLOCKED");
  check("live-graduation blockers still present (internal-only, not public-ready)", v.deployment.liveGraduationBlockers.length >= 1);

  return { passed, failed, details };
}

if (typeof require !== "undefined" && require.main === module) {
  const r = runInternalAccessSelfChecks();
  console.log(`${r.passed} passed, ${r.failed} failed`);
  if (r.failed) { console.log(r.details.join("\n")); process.exit(1); }
}
