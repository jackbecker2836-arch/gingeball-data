// =============================================================================
// GINGEBALL COURT HANDICAP — STUB ODDS FEED (Phase 3, placeholder adapter)
//
// A deterministic OddsFeed so the Market Court engine, the MarketHub, and the
// CourtGraph burn all run TODAY with zero external dependencies. It emits real
// book quotes (with open->close movement) and normalizes them through the same
// consensus() path a live provider would.
//
// THIS IS A PLACEHOLDER. To go live, write a class that implements OddsFeed
// against Pinnacle / The Odds API / your scraper and hand it to the engine
// instead of this one — nothing downstream changes. See PHASE3_MARKET_COURT.md.
//
// Run `npx tsx adapters/stub-odds-feed.ts` to see the engine read the feed.
// =============================================================================

import type { UUID } from "../lib/types";
import {
  type OddsFeed, type MarketSeries, type MarketSnapshot, type RawOddsQuote,
  snapshotFromQuotes,
} from "../lib/odds-ingestion";
import { computeMarketCourt, computeMarketPar, lineMovement } from "../lib/market-court-engine";

interface StubGame {
  gameId: UUID; homeTeamId: UUID; awayTeamId: UUID;
  open: RawOddsQuote[];   // multiple books at open
  close: RawOddsQuote[];  // multiple books at close
}

// Canonical fixture (matches fixtures/fake-game.ts: Team X -4 / total 202) plus
// one second game so the feed isn't a single hardcoded row.
const GAMES: StubGame[] = [
  {
    gameId: "game-fixture-001", homeTeamId: "team-x", awayTeamId: "team-y",
    open: [
      { book: "pinnacle", capturedTs: "2026-01-15T14:00:00Z", homeSpread: -3, total: 200, homeMoneyline: -150, awayMoneyline: 130 },
      { book: "draftkings", capturedTs: "2026-01-15T14:00:00Z", homeSpread: -3.5, total: 201, homeMoneyline: -155, awayMoneyline: 132 },
      { book: "fanduel", capturedTs: "2026-01-15T14:00:00Z", homeSpread: -3, total: 200, homeMoneyline: -148, awayMoneyline: 128 },
    ],
    close: [
      { book: "pinnacle", capturedTs: "2026-01-15T23:30:00Z", homeSpread: -4, total: 202, homeMoneyline: -180, awayMoneyline: 150 },
      { book: "draftkings", capturedTs: "2026-01-15T23:30:00Z", homeSpread: -4, total: 202, homeMoneyline: -182, awayMoneyline: 152 },
      { book: "fanduel", capturedTs: "2026-01-15T23:30:00Z", homeSpread: -3.5, total: 201, homeMoneyline: -175, awayMoneyline: 148 },
    ],
  },
  {
    gameId: "game-fixture-002", homeTeamId: "team-a", awayTeamId: "team-b",
    open: [
      { book: "pinnacle", capturedTs: "2026-01-15T14:00:00Z", homeSpread: 6.5, total: 231, homeMoneyline: 220, awayMoneyline: -270 },
      { book: "draftkings", capturedTs: "2026-01-15T14:00:00Z", homeSpread: 6.5, total: 230, homeMoneyline: 225, awayMoneyline: -275 },
    ],
    close: [
      { book: "pinnacle", capturedTs: "2026-01-15T23:30:00Z", homeSpread: 7, total: 233, homeMoneyline: 240, awayMoneyline: -300 },
      { book: "draftkings", capturedTs: "2026-01-15T23:30:00Z", homeSpread: 7, total: 234, homeMoneyline: 238, awayMoneyline: -295 },
    ],
  },
];

export class StubOddsFeed implements OddsFeed {
  source = "stub";
  listGameIds(): UUID[] { return GAMES.map((g) => g.gameId); }

  getSeries(gameId: UUID): MarketSeries {
    const g = GAMES.find((x) => x.gameId === gameId);
    if (!g) throw new Error(`StubOddsFeed: unknown game ${gameId}`);
    const teams = { homeTeamId: g.homeTeamId, awayTeamId: g.awayTeamId };
    return {
      gameId, ...teams,
      snapshots: [
        snapshotFromQuotes(gameId, "open", g.open[0].capturedTs, g.open, teams),
        snapshotFromQuotes(gameId, "close", g.close[0].capturedTs, g.close, teams),
      ],
    };
  }

  getLatest(gameId: UUID): MarketSnapshot {
    const series = this.getSeries(gameId);
    return series.snapshots[series.snapshots.length - 1];
  }
}

// ---- demo: feed -> engine ---------------------------------------------------
if (typeof require !== "undefined" && require.main === module) {
  const feed = new StubOddsFeed();
  const log = (...a: unknown[]) => console.log(...a); // eslint-disable-line no-console
  log(`OddsFeed source: ${feed.source}\n`);
  for (const id of feed.listGameIds()) {
    const latest = feed.getLatest(id);
    const mc = computeMarketCourt(latest);
    const mv = lineMovement(feed.getSeries(id));
    log(`${id}  (${mc.courtType}, conf ${mc.confidence})`);
    log(`  implied ${mc.home.impliedTeamTotal}\u00b7${mc.away.impliedTeamTotal}  |  exp poss ${mc.expectedPossessions}  |  ppp ${mc.home.marketPpp}\u00b7${mc.away.marketPpp}`);
    log(`  win prob ${mc.home.impliedWinProbability}\u00b7${mc.away.impliedWinProbability}  |  moved ${mv.spreadMove >= 0 ? "+" : ""}${mv.spreadMove} spread / ${mv.totalMove >= 0 ? "+" : ""}${mv.totalMove} total${mv.steamed ? " (steamed)" : ""}`);
    if (id === "game-fixture-001") {
      const par = computeMarketPar({ normalBaseline: 27.5, marketLine: 24.5 });
      log(`  star scoring guard: normal 27.5 -> market par ${par.marketPar} (${(par.suppression * 100).toFixed(1)}% suppression, ${par.source})`);
    }
    log("");
  }
}
