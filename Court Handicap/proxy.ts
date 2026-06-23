// =============================================================================
// proxy.ts - PHASE 11L INTERNAL ACCESS GATE (Next.js 16 proxy convention)
//
// Enforces HTTP Basic auth on /internal/* at the edge, BEFORE any internal page
// (the Pressure Lab cockpit, which shows synthetic/shadow audit truth) can render.
// This is the app-level gate. Vercel Deployment Protection is the outer layer; we
// do not rely on Vercel alone, and we never rely on the "/internal" path name alone.
//
// POSTURE: deny by default.
//   - If INTERNAL_ACCESS_USER / INTERNAL_ACCESS_PASSWORD are not set, EVERY request
//     to /internal/* is denied (503). A missing secret must never mean "open".
//   - Missing or wrong credentials -> 401 with a WWW-Authenticate challenge so the
//     browser shows its native login prompt.
//   - Correct credentials -> request passes through.
//
// SCOPE: the matcher is limited to /internal/:path* so public product routes are
// never touched by this middleware.
//
// Credentials come from environment variables only. None are hardcoded here, and
// none belong in the repo. Set them in .env.local (local) and in Vercel project
// settings (deployed). See .env.local.example.
// =============================================================================

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Only run on internal routes. Everything else is untouched by this middleware.
export const config = {
  matcher: ["/internal/:path*"],
};

const REALM = "Gingeball Internal - synthetic/shadow audit. Not public.";

function deny(status: number, message: string, challenge: boolean): NextResponse {
  const res = new NextResponse(message, { status });
  if (challenge) {
    // Prompt the browser for credentials (native basic-auth popup).
    res.headers.set("WWW-Authenticate", `Basic realm="${REALM}", charset="UTF-8"`);
  }
  // Internal responses must never be indexed, even the 401/503 bodies.
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  // Internal responses should never be cached by shared caches.
  res.headers.set("Cache-Control", "no-store");
  return res;
}

/** Constant-time-ish string compare to avoid trivial timing leaks on the secret. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Parse a "Basic base64(user:pass)" header into { user, pass }, or null if malformed. */
export function parseBasicAuth(header: string | null): { user: string; pass: string } | null {
  if (!header) return null;
  const [scheme, encoded] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "basic" || !encoded) return null;
  let decoded: string;
  try {
    decoded = typeof atob === "function"
      ? atob(encoded)
      : Buffer.from(encoded, "base64").toString("utf-8");
  } catch {
    return null;
  }
  // Only split on the FIRST colon; passwords may contain colons.
  const idx = decoded.indexOf(":");
  if (idx === -1) return null;
  return { user: decoded.slice(0, idx), pass: decoded.slice(idx + 1) };
}

/**
 * Pure decision function (exported for unit tests). Given the credentials from env
 * and the incoming Authorization header, decide what to do. Keeping this pure means
 * the auth logic is fully testable without simulating the Next edge runtime.
 */
export type AuthDecision =
  | { kind: "deny_misconfigured" }   // env vars missing -> fail closed (503)
  | { kind: "challenge" }            // missing/invalid credentials -> 401 + prompt
  | { kind: "allow" };               // correct credentials -> pass through

export function decideAccess(
  envUser: string | undefined,
  envPass: string | undefined,
  authHeader: string | null,
): AuthDecision {
  // Fail closed: no configured secret means no access, never open access.
  if (!envUser || !envPass) return { kind: "deny_misconfigured" };
  const creds = parseBasicAuth(authHeader);
  if (!creds) return { kind: "challenge" };
  const ok = safeEqual(creds.user, envUser) && safeEqual(creds.pass, envPass);
  return ok ? { kind: "allow" } : { kind: "challenge" };
}

export function proxy(req: NextRequest): NextResponse {
  const decision = decideAccess(
    process.env.INTERNAL_ACCESS_USER,
    process.env.INTERNAL_ACCESS_PASSWORD,
    req.headers.get("authorization"),
  );

  switch (decision.kind) {
    case "deny_misconfigured":
      // 503: the gate exists but is not configured. Deny rather than expose.
      return deny(503, "Internal access is not configured.", false);
    case "challenge":
      return deny(401, "Authentication required.", true);
    case "allow":
      return NextResponse.next();
  }
}
