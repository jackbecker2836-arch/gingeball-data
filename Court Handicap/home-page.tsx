import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-20">

      <div className="mb-16">
        <div className="text-xs font-mono text-gb-muted tracking-widest uppercase mb-4">Gingeball</div>
        <h1 className="text-5xl font-medium tracking-tight text-white mb-4 leading-tight">
          NBA, three ways.
        </h1>
        <p className="text-lg text-gb-muted max-w-2xl leading-relaxed">
          A roster-building game, a market-graded performance model, and a player-value
          analytics layer. Pick a lane.
        </p>
      </div>

      {/* Three equal heroes */}
      <div className="grid grid-cols-3 gap-4 mb-16">

        {/* House of Cards */}
        <a href="/hoc/house-of-cards.html"
          className="bg-gb-card border border-gb-border rounded-xl p-6 hover:border-gb-coral/50 transition-colors group flex flex-col">
          <div className="text-xs font-mono text-gb-coral mb-2">Game</div>
          <div className="text-xl font-medium text-white mb-2 group-hover:text-gb-coral transition-colors">
            House of Cards
          </div>
          <div className="text-sm text-gb-muted leading-relaxed flex-1">
            Build the best 7-man NBA roster you can. Badge synergies, fatigue modeling,
            cap management, 4,000+ player-seasons back to 2005.
          </div>
          <div className="text-xs font-mono text-gb-coral mt-4 group-hover:translate-x-0.5 transition-transform">
            Play →
          </div>
        </a>

        {/* Court Handicap */}
        <Link href="/court-handicap"
          className="bg-gb-card border border-gb-border rounded-xl p-6 hover:border-gb-blue/50 transition-colors group flex flex-col">
          <div className="text-xs font-mono text-gb-blue mb-2">Model</div>
          <div className="text-xl font-medium text-white mb-2 group-hover:text-gb-blue transition-colors">
            Court Handicap
          </div>
          <div className="text-sm text-gb-muted leading-relaxed flex-1">
            Grades NBA lineups on whether they beat the difficulty the betting market
            set for them. The market sets the court; Gingeball grades who beat it.
          </div>
          <div className="text-xs font-mono text-gb-blue mt-4 group-hover:translate-x-0.5 transition-transform">
            Explore →
          </div>
        </Link>

        {/* TCV Lab */}
        <Link href="/tcvoverview"
          className="bg-gb-card border border-gb-border rounded-xl p-6 hover:border-gb-blue/50 transition-colors group flex flex-col">
          <div className="text-xs font-mono text-gb-blue mb-2">Analytics</div>
          <div className="text-xl font-medium text-white mb-2 group-hover:text-gb-blue transition-colors">
            TCV Lab
          </div>
          <div className="text-sm text-gb-muted leading-relaxed flex-1">
            Total Creation Value — a player-value framework. Rankings, a full formula
            glossary, and research hypotheses with evidence logs.
          </div>
          <div className="text-xs font-mono text-gb-blue mt-4 group-hover:translate-x-0.5 transition-transform">
            Overview →
          </div>
        </Link>

      </div>

      {/* Play & simulate */}
      <div className="border-t border-gb-border pt-12 mb-16">
        <div className="text-xs font-mono text-gb-muted tracking-widest uppercase mb-6">
          Play &amp; simulate
        </div>
        <div className="grid grid-cols-2 gap-3">

          {/* Mock Draft */}
          <Link href="/mock-draft"
            className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-coral/50 transition-colors group">
            <div className="text-xs font-mono text-gb-coral mb-2">Game</div>
            <div className="text-base font-medium text-white mb-1 group-hover:text-gb-coral transition-colors">
              Mock Draft
            </div>
            <div className="text-sm text-gb-muted">
              Draft a roster pick-by-pick against the model and see how your board stacks up.
            </div>
          </Link>

          {/* Live Sim — 1v1 */}
          <Link href="/court-handicap/sandbox"
            className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-blue/50 transition-colors group">
            <div className="text-xs font-mono text-gb-blue mb-2 inline-flex items-center gap-1.5">
              Live Sim
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-900/30 text-blue-400 border border-blue-700/40">
                new
              </span>
            </div>
            <div className="text-base font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
              Live Sim (1v1)
            </div>
            <div className="text-sm text-gb-muted">
              Watch the Court Handicap recompute live, possession by possession.
            </div>
          </Link>

          {/* Team Sim — 5v5 */}
          <Link href="/court-handicap/sandbox/5v5"
            className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-blue/50 transition-colors group">
            <div className="text-xs font-mono text-gb-blue mb-2">Live Sim</div>
            <div className="text-base font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
              Team Sim (5v5)
            </div>
            <div className="text-sm text-gb-muted">
              Full five-on-five lineups, graded live as the game plays out.
            </div>
          </Link>

          {/* Real Roster */}
          <Link href="/court-handicap/sandbox/roster"
            className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-blue/50 transition-colors group">
            <div className="text-xs font-mono text-gb-blue mb-2">Live Sim</div>
            <div className="text-base font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
              Real Roster
            </div>
            <div className="text-sm text-gb-muted">
              Auto-fills both lineups from the live TCV leaderboard, then simulates.
            </div>
          </Link>

        </div>
      </div>

      {/* Secondary: TCV layer */}
      <div className="border-t border-gb-border pt-12">
        <div className="text-xs font-mono text-gb-muted tracking-widest uppercase mb-6">
          TCV Lab — analytics layer
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Link href="/leaderboard"
            className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-blue/50 transition-colors group">
            <div className="text-xs font-mono text-gb-blue mb-2">Rankings</div>
            <div className="text-base font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
              TCV Leaderboard
            </div>
            <div className="text-sm text-gb-muted">Top 50 by Total Creation Value</div>
          </Link>
          <Link href="/glossary"
            className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-blue/50 transition-colors group">
            <div className="text-xs font-mono text-gb-blue mb-2">Reference</div>
            <div className="text-base font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
              Formula Glossary
            </div>
            <div className="text-sm text-gb-muted">All 12 TCV components defined</div>
          </Link>
          <Link href="/hypotheses"
            className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-blue/50 transition-colors group">
            <div className="text-xs font-mono text-gb-blue mb-2">Research</div>
            <div className="text-base font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
              Hypotheses
            </div>
            <div className="text-sm text-gb-muted">30 OURIP tests with evidence logs</div>
          </Link>
        </div>
      </div>

    </div>
  );
}
