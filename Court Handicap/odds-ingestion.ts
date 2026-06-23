// =============================================================================
// GINGEBALL COURT HANDICAP — ODDS INGESTION CONTRACTS (Phase 3)
//
// "The market sets the court." This is the boundary where raw sportsbook lines
// enter the system. Everything downstream (the Market Court engine, market par,
// the CourtGraph burn) consumes the NORMALIZED shapes defined here — never a
// provider's raw payload. That keeps a live odds API swappable: implement
// `OddsFeed` for Pinnacle, The Odds API, a scraper, or the stub, and nothing
// downstream changes.
//
// Convention: homeSpread is negative when home is favored (-4 = home by 4).
// Confidence is in [0,1]. Ids are strings (UUIDs in production).
// =============================================================================

import type { UUID, Confidence } from "./types";

const round = (x: number, d = 3) => Number(x.toFixed(d));
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

// One book's quote for one game at one moment — the raw unit a provider gives us.
export interface RawOddsQuote {
  book: string;            // 'pinnacle', 'draftkings', ...
  capturedTs: string;      // ISO timestamp
  homeSpread: number;      // negative = home favored
  total: number;
  homeMoneyline?: number;  // American odds
  awayMoneyline?: number;
}

// A normalized consensus reading at a phase (open / close / live). Maps to the
// GameMarket row in db/schema.sql, plus the breadth/agreement we derive here.
export interface MarketSnapshot {
  gameId: UUID;
  phase: "open" | "close" | "live";
  capturedTs: string;
  homeTeamId?: UUID;
  awayTeamId?: UUID;
  homeSpread: number;
  total: number;
  homeMoneyline?: number;
  awayMoneyline?: number;
  bookCount: number;         // how many books fed this consensus
  bookAgreement: Confidence; // how tightly the books cluster (0..1)
}

// The line's life over time: open -> ... -> close (and live). Movement is signal.
export interface MarketSeries {
  gameId: UUID;
  homeTeamId?: UUID;
  awayTeamId?: UUID;
  snapshots: MarketSnapshot[]; // chronological
}

// THE ADAPTER BOUNDARY. A real provider implements this; the rest of the system
// only ever sees MarketSnapshot / MarketSeries.
export interface OddsFeed {
  source: string;                                       // 'stub', 'pinnacle', ...
  listGameIds(): Promise<UUID[]> | UUID[];
  getSeries(gameId: UUID): Promise<MarketSeries> | MarketSeries;
  getLatest(gameId: UUID): Promise<MarketSnapshot> | MarketSnapshot;
}

// -----------------------------------------------------------------------------
// Normalization — collapse many books into one consensus reading.
// -----------------------------------------------------------------------------

const median = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const stdev = (xs: number[], mu: number): number =>
  Math.sqrt(xs.reduce((a, x) => a + (x - mu) ** 2, 0) / xs.length);

// Consensus core from a set of book quotes. Agreement falls as books disperse:
// ~0pt spread stdev -> 1.0, ~1.5pt stdev -> ~0.5. Sharp markets cluster tightly.
export function consensus(quotes: RawOddsQuote[]) {
  if (!quotes.length) throw new Error("consensus: no quotes provided");
  const spreads = quotes.map((q) => q.homeSpread);
  const totals = quotes.map((q) => q.total);
  const spread = median(spreads);
  const total = median(totals);
  const dispersion = stdev(spreads, spread) + stdev(totals, total) / 4;
  const bookAgreement = clamp01(1 - dispersion / 3);
  const withMl = quotes.filter((q) => q.homeMoneyline != null && q.awayMoneyline != null);
  return {
    homeSpread: round(spread, 1),
    total: round(total, 1),
    homeMoneyline: withMl.length ? Math.round(median(withMl.map((q) => q.homeMoneyline!))) : undefined,
    awayMoneyline: withMl.length ? Math.round(median(withMl.map((q) => q.awayMoneyline!))) : undefined,
    bookCount: quotes.length,
    bookAgreement: round(bookAgreement, 3),
  };
}

export function snapshotFromQuotes(
  gameId: UUID,
  phase: MarketSnapshot["phase"],
  capturedTs: string,
  quotes: RawOddsQuote[],
  teams?: { homeTeamId?: UUID; awayTeamId?: UUID },
): MarketSnapshot {
  return { gameId, phase, capturedTs, ...teams, ...consensus(quotes) };
}
