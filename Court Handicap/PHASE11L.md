# PHASE 11L — Internal/Staging Hardening & Protected Deployment

Mission: can the internal Pressure Lab route be deployed behind real protected access
without exposing synthetic/shadow/proxy outputs as public product truth?

## Status of the build steps

1. **Readiness suite written** — `scripts/deploy-readiness.mjs`. Runs every self-check
   suite and the audit universe, and prints the NAME of any failing check (the page
   only ever showed a count). Run: `npx tsx scripts/deploy-readiness.mjs`.
2. **Real failure surfaced** — the prior mystery "1 failed" was `pace_moves_possessions`
   reading `fast=undefined > slow=undefined`.
3. **Failure fixed** — root cause was a stale `lib/audit-harness.ts` in the app that did
   not put `expectedPossessions` on the scenario result. Replaced; gate now reads
   103.5 > 81.6 and passes. Suite genuinely 22/0.
4. **Pixel pass recorded** — `lib/pixel-pass-manifest.ts`: `reviewed: true`,
   `reviewedBy: "Jack Becker"`, `reviewedDate: "2026-06-18"`, real desktop+mobile
   artifacts. The reduced-motion capture was NOT generated; it is recorded honestly
   under `pendingCaptures` (reduced-motion safety currently rests on the motion lock —
   no motion present — with a dedicated capture still owed). Not faked.
5. **Protected access** — `middleware.ts` (basic-auth) + tests (this phase).

## Protected access design (middleware.ts)

- **Matcher:** `/internal/:path*` only. Public product routes are never touched.
- **Credentials:** env only — `INTERNAL_ACCESS_USER`, `INTERNAL_ACCESS_PASSWORD`.
  Nothing hardcoded, nothing committed. See `.env.local.example`.
- **Deny by default (fail closed):** if either env var is missing/empty, every
  `/internal/*` request returns **503** ("not configured"). A missing secret never
  means open access.
- **Missing/wrong credentials:** **401** with `WWW-Authenticate: Basic` → native
  browser login prompt.
- **Correct credentials:** pass through.
- **Internal responses** carry `X-Robots-Tag: noindex, nofollow` and `Cache-Control:
  no-store`, including the 401/503 bodies.
- **Outer layer:** keep Vercel Deployment Protection enabled on top of this. Do not
  rely on Vercel alone, and never on the `/internal` path name alone.

The auth logic is split into pure, exported functions — `parseBasicAuth()` and
`decideAccess()` — so it is fully unit-testable without the edge runtime.

## What is verified in the sandbox (deterministic)

- `npx tsc -p tsconfig.check.json --noEmit` → clean (with `next` present, as in the app).
- Deploy-readiness probe → all five sections green:
  - audit universe: gates 22/0, engine-chain 30/0
  - pressure lab self-checks: 32/0
  - view-model self-checks: 11/0 (reviewed-state branch)
  - limitation registry: 15/0
  - internal access (auth + boundary): 23/0
- Auth unit checks cover: no creds → 401; wrong creds → 401; correct → allow;
  missing env → 503 (fail closed); empty-string env → 503; basic-auth parsing
  (colons in password, case-insensitive scheme, junk → null); matcher scoped to
  `/internal` only; labels present; composite `applied:false`; limitations visible;
  status not BLOCKED; live-graduation blockers still present.

## What MUST be run in the app (cannot be done in the sandbox)

The package is a feature bundle (lib + components + the internal route), not a full
Next app — there is no `app/layout.tsx`, `next.config`, or root shell here. So the
edge-runtime request cycle and the production build must be verified in your repo:

1. **Production build:** `npm run build` — must complete with no type/lint/build errors.
2. **Live auth (server running):** with the dev or built server up, from a second shell:
   - No creds → 401:  `curl -i http://localhost:3000/internal/pressure-lab`
   - Wrong creds → 401:  `curl -i -u wrong:wrong http://localhost:3000/internal/pressure-lab`
   - Correct creds → 200:  `curl -i -u "$INTERNAL_ACCESS_USER:$INTERNAL_ACCESS_PASSWORD" http://localhost:3000/internal/pressure-lab`
   - Unset both env vars → 503 (fail closed) on `/internal/pressure-lab`
   - Public route unaffected → 200 without creds: `curl -i http://localhost:3000/court-handicap`
3. **noindex preserved:** confirm `X-Robots-Tag: noindex` on the internal response and
   the page metadata `robots: { index:false, follow:false }` (already in the page).

## Deployment gauntlet (run before declaring 11L done)

```
npx tsc --noEmit                     # or your app's typecheck script
npx tsx scripts/deploy-readiness.mjs # all five sections green
npm run build                        # production build clean
# live curl checks above (401 / 401 / 200 / 503 / public-200)
```

If build or any check fails, inspect the whole failure chain, fix root causes, and
re-run everything. Only deploy when the path is honestly green.

## Boundary (unchanged)

- Public product routes may deploy publicly.
- `/internal/pressure-lab` stays protected (middleware + Vercel).
- Shadow composite stays `applied:false`; Pressure Lab is not public product truth.
- Out of scope: composite graduation (11M), removing shadow/synthetic stamps, mutating
  the live verdict, image generation / fabricated captures.

## Install order in the app

```
# 1. middleware at the PROJECT ROOT (next to package.json / app/)
copy middleware.ts            -> <app root>/middleware.ts
copy .env.local.example       -> <app root>/.env.local.example   (then make a real .env.local)
# 2. suite + probe
copy lib/internal-access-audit.ts -> <app>/lib/internal-access-audit.ts
copy scripts/deploy-readiness.mjs -> <app>/scripts/deploy-readiness.mjs   (overwrite)
# 3. set real secrets
#    .env.local:  INTERNAL_ACCESS_USER=...  INTERNAL_ACCESS_PASSWORD=...
#    Vercel:      same two vars in Project Settings -> Environment Variables
```

## Remaining in the Pressure Lab arc

- 11L (this) — protected internal/staging deployment.
- 11M — shadow graduation readiness review. Then stop.
