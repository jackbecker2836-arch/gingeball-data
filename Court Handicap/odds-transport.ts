// =============================================================================
// GINGEBALL COURT HANDICAP — ODDS TRANSPORT (Phase 4D)
//
// The boundary between "a real sportsbook over the wire" and the rest of the
// product. Three honesty rules:
//
//   1. CREDENTIALS ARE SERVER-ONLY. The API key is read through serverOnlyApiKey,
//      which THROWS if it detects a browser context, lives only in the transport
//      closure, and is never placed in returned data, thrown messages, logs, or
//      provenance. The feed and engines never see it.
//
//   2. isLive IS THE TRUTH SWITCH. Only a real, credentialed provider sets
//      isLive=true. The deployed default is a MockTransport with isLive=false, so
//      the app honestly shows SYNTHETIC until real credentials are wired. The
//      "live" label downstream can ONLY appear when isLive is true — so a mock or
//      a fallback can never masquerade as live.
//
//   3. PROVIDER SHAPE STAYS QUARANTINED. A transport returns the raw provider
//      RawProviderSeries; the ONLY place that decodes it is mapProviderToQuotes
//      (live-odds-feed.ts). Nothing here leaks provider field names downstream.
// =============================================================================

import type { UUID } from "@/lib/types";
import type { RawProviderSeries, RawProviderGame } from "@/adapters/live-odds-feed";

export class ProviderError extends Error { constructor(m: string) { super(m); this.name = "ProviderError"; } }
export class RateLimitError extends ProviderError { constructor(m = "provider rate limit") { super(m); this.name = "RateLimitError"; } }

// The injected wire. `isLive` is a CONTRACT: true means "a real provider with a
// real credential". `source` is a human label for provenance (never the key).
export interface OddsTransport {
  readonly isLive: boolean;
  readonly source: string;
  fetchGame(gameId: UUID): Promise<RawProviderSeries>;
}

// ---- server-only credential boundary ----------------------------------------
// Reads the key at call time, in the closure only. Throws loudly in a browser so
// a credential can never be shipped to the client. The key never leaves here.
export function serverOnlyApiKey(envVar: string): string {
  if (typeof window !== "undefined") {
    throw new ProviderError("odds credential requested in a browser context — keys are server-only");
  }
  const key = typeof process !== "undefined" ? process.env?.[envVar] : undefined;
  if (!key) throw new ProviderError(`missing ${envVar} (server-only odds credential not configured)`);
  return key;
}

// ---- real provider transport (credential-ready) -----------------------------
// Shaped for The-Odds-API-style endpoints. NOT exercised in the sandbox (no key),
// but wired so production only needs the env var. The key is interpolated into
// the request URL inside this closure and is NEVER returned or logged.
export interface HttpTransportConfig {
  provider: string;                 // e.g. "the-odds-api", "pinnacle"
  envVar: string;                   // e.g. "ODDS_API_KEY"
  buildUrl: (gameId: UUID, key: string) => string;  // key used here, only here
  parse: (json: unknown) => RawProviderSeries;       // provider JSON -> raw series
  fetchImpl?: typeof fetch;         // injectable for tests; defaults to global fetch
  timeoutMs?: number;
}

export function createHttpTransport(cfg: HttpTransportConfig): OddsTransport {
  return {
    isLive: true,
    source: cfg.provider,
    async fetchGame(gameId: UUID): Promise<RawProviderSeries> {
      const key = serverOnlyApiKey(cfg.envVar);   // closure-only
      const url = cfg.buildUrl(gameId, key);
      const doFetch = cfg.fetchImpl ?? (typeof fetch !== "undefined" ? fetch : undefined);
      if (!doFetch) throw new ProviderError("no fetch implementation available on this runtime");
      let res: Response;
      try {
        res = await doFetch(url, { method: "GET" });
      } catch {
        // never echo the URL (it carries the key) into the error
        throw new ProviderError(`network error contacting ${cfg.provider}`);
      }
      if (res.status === 429) throw new RateLimitError(`${cfg.provider} rate limit`);
      if (!res.ok) throw new ProviderError(`${cfg.provider} responded ${res.status}`);
      const json = await res.json().catch(() => { throw new ProviderError(`${cfg.provider} returned invalid JSON`); });
      return cfg.parse(json);
    },
  };
}

// ---- mock transport (deployed default; isLive=false) ------------------------
// Returns the canonical -4 / 202 game so the app renders, but is HONEST: isLive
// is false, so downstream can only ever label this SYNTHETIC / MOCK — never live.
export function makeMockTransport(opts?: { capturedTs?: string; withMoneylines?: boolean }): OddsTransport {
  const ts = opts?.capturedTs ?? new Date().toISOString();
  const ml = opts?.withMoneylines ?? true;
  return {
    isLive: false,
    source: "mock",
    async fetchGame(gameId: UUID): Promise<RawProviderSeries> {
      return canonicalRawSeries(gameId, ts, ml);
    },
  };
}

// ---- test live double (isLive=true; SELF-CHECKS ONLY) -----------------------
// A clearly-labeled stand-in used to exercise the live-labeling branch in tests.
// Production never imports this for real data. It can simulate staleness, a
// missing moneyline, a missing total, a provider error, or a rate limit.
export function makeTestLiveTransport(opts?: {
  capturedTs?: string; withMoneylines?: boolean; withTotal?: boolean;
  fail?: "error" | "ratelimit"; source?: string;
}): OddsTransport {
  const ts = opts?.capturedTs ?? new Date().toISOString();
  return {
    isLive: true,
    source: opts?.source ?? "test-live",
    async fetchGame(gameId: UUID): Promise<RawProviderSeries> {
      if (opts?.fail === "ratelimit") throw new RateLimitError();
      if (opts?.fail === "error") throw new ProviderError("simulated provider outage");
      return canonicalRawSeries(gameId, ts, opts?.withMoneylines ?? true, opts?.withTotal ?? true);
    },
  };
}

// ---- shared raw builder (provider-shaped; decoded only by mapProviderToQuotes)
function canonicalRawSeries(gameId: UUID, capturedTs: string, withMoneylines: boolean, withTotal = true): RawProviderSeries {
  const game = (spread: number, total: number, ts: string): RawProviderGame => {
    const markets: RawProviderGame["bookmakers"][number]["markets"] = [
      { key: "spreads", outcomes: [{ name: "Home", point: spread }, { name: "Away", point: -spread }] },
    ];
    if (withTotal) markets.push({ key: "totals", outcomes: [{ name: "Over", point: total }, { name: "Under", point: total }] });
    if (withMoneylines) markets.push({ key: "h2h", outcomes: [{ name: "Home", price: -170 }, { name: "Away", price: 145 }] });
    const book = (k: string): RawProviderGame["bookmakers"][number] => ({ key: k, last_update: ts, markets });
    return { id: gameId, commence_time: ts, home_team: "Home", away_team: "Away", bookmakers: [book("pinnacle"), book("draftkings"), book("fanduel")] };
  };
  return {
    open: game(-3, 200, capturedTs),
    close: game(-4, 202, capturedTs),
    live: game(-4, 202, capturedTs),
  };
}
