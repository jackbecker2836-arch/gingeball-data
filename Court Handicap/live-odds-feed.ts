// =============================================================================
// GINGEBALL COURT HANDICAP — LIVE ODDS FEED (Phase 4B)
//
// A real OddsFeed implementation for a live provider (shaped after The Odds API,
// the common case). Two honesty rules drive the design:
//
//   1. PROVIDER SHAPE IS QUARANTINED. The raw provider payload only ever touches
//      `mapProviderToQuotes`. Everything else speaks our normalized RawOddsQuote
//      / MarketSnapshot contract, so the engine, view-model, and components never
//      see a provider's field names.
//
//   2. NO SECRET, NO HIDDEN NETWORK. The HTTP call is injected as `transport`.
//      The real wiring (fetch with an API key from an env var) lives in the app's
//      server boundary, not in this reusable adapter — so this file can be unit
//      tested deterministically and never holds a credential.
//
// If the feed is unconfigured or a call fails, the source layer
// (manifest-source.ts) falls back to the fixture and SAYS SO in provenance.
// =============================================================================

import type { UUID } from "@/lib/types";
import {
  type OddsFeed, type MarketSeries, type MarketSnapshot, type RawOddsQuote,
  snapshotFromQuotes,
} from "@/lib/odds-ingestion";

// ---- raw provider shapes (quarantined to this file) -------------------------
export interface RawProviderOutcome { name: string; point?: number; price?: number }
export interface RawProviderMarket { key: string; outcomes: RawProviderOutcome[] }     // 'spreads' | 'totals' | 'h2h'
export interface RawProviderBook { key: string; last_update?: string; markets: RawProviderMarket[] }
export interface RawProviderGame {
  id: string; commence_time?: string;
  home_team?: string; away_team?: string;
  bookmakers: RawProviderBook[];
}
export interface RawProviderSeries { open?: RawProviderGame; close?: RawProviderGame; live?: RawProviderGame }

// The injected boundary. Real impl: fetch the provider with a key, return JSON.
export interface LiveOddsConfig {
  provider: string;                                      // becomes OddsFeed.source
  gameIds: UUID[];
  transport: (gameId: UUID) => Promise<RawProviderSeries>;
  teamIds?: (g: RawProviderGame) => { homeTeamId?: UUID; awayTeamId?: UUID };
}

// ---- normalization: provider -> our RawOddsQuote (one per book) --------------
export function mapProviderToQuotes(g: RawProviderGame): RawOddsQuote[] {
  if (!g.home_team) throw new Error("live feed: game missing home_team");
  const home = g.home_team, away = g.away_team;
  const quotes: RawOddsQuote[] = [];
  for (const bk of g.bookmakers) {
    const spreads = bk.markets.find((m) => m.key === "spreads");
    const totals = bk.markets.find((m) => m.key === "totals");
    const h2h = bk.markets.find((m) => m.key === "h2h");
    const homeSpread = spreads?.outcomes.find((o) => o.name === home)?.point;
    const total = totals?.outcomes.find((o) => o.name.toLowerCase() === "over")?.point ?? totals?.outcomes[0]?.point;
    if (homeSpread == null || total == null) continue;       // skip a book that can't price the game
    quotes.push({
      book: bk.key, capturedTs: bk.last_update ?? g.commence_time ?? new Date().toISOString(),
      homeSpread, total,
      homeMoneyline: h2h?.outcomes.find((o) => o.name === home)?.price,
      awayMoneyline: away ? h2h?.outcomes.find((o) => o.name === away)?.price : undefined,
    });
  }
  if (!quotes.length) throw new Error(`live feed: no priceable books for game ${g.id}`);
  return quotes;
}

export class LiveOddsFeed implements OddsFeed {
  source: string;
  constructor(private cfg: LiveOddsConfig) { this.source = cfg.provider; }

  async listGameIds(): Promise<UUID[]> { return this.cfg.gameIds; }

  async getSeries(gameId: UUID): Promise<MarketSeries> {
    const raw = await this.cfg.transport(gameId);
    const phases: ("open" | "close" | "live")[] = ["open", "close", "live"];
    let teams: { homeTeamId?: UUID; awayTeamId?: UUID } = {};
    const snapshots: MarketSnapshot[] = [];
    for (const phase of phases) {
      const g = raw[phase];
      if (!g) continue;
      if (this.cfg.teamIds) teams = this.cfg.teamIds(g);
      snapshots.push(snapshotFromQuotes(gameId, phase, g.commence_time ?? new Date().toISOString(), mapProviderToQuotes(g), teams));
    }
    if (!snapshots.length) throw new Error(`live feed: no snapshots for game ${gameId}`);
    return { gameId, ...teams, snapshots };
  }

  async getLatest(gameId: UUID): Promise<MarketSnapshot> {
    const s = await this.getSeries(gameId);
    return s.snapshots[s.snapshots.length - 1];
  }
}
