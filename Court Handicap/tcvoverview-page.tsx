import Link from "next/link";

export default function TcvOverview() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-20">

      <div className="text-xs font-mono text-gb-blue tracking-widest uppercase mb-4">
        TCV Lab
      </div>
      <h1 className="text-4xl font-medium tracking-tight text-white mb-6 leading-tight">
        Total Creation Value
      </h1>

      <p className="text-lg text-gb-muted leading-relaxed mb-6">
        TCV is a single number for how much offense a player actually creates — not just
        the points they score, but the shots and advantages they generate for everyone
        on the floor. It rolls 12 separate components into one comparable value so you can
        line players up side by side, regardless of role or era.
      </p>

      <p className="text-base text-gb-muted leading-relaxed mb-10">
        Every component is defined in plain terms in the glossary, and the framework is
        stress-tested against research hypotheses with evidence logs — so the number isn&apos;t
        a black box, it&apos;s a stack of assumptions you can inspect.
      </p>

      {/* Primary funnel: Leaderboard */}
      <Link href="/leaderboard"
        className="block bg-gb-card border border-gb-border rounded-xl p-6 hover:border-gb-blue/50 transition-colors group mb-4">
        <div className="text-xs font-mono text-gb-blue mb-2">Start here</div>
        <div className="text-xl font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
          TCV Leaderboard →
        </div>
        <div className="text-sm text-gb-muted">
          See the top 50 players ranked by Total Creation Value.
        </div>
      </Link>

      {/* Secondary links */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/glossary"
          className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-blue/50 transition-colors group">
          <div className="text-xs font-mono text-gb-blue mb-2">Reference</div>
          <div className="text-base font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
            Formula Glossary
          </div>
          <div className="text-sm text-gb-muted">All 12 TCV components defined.</div>
        </Link>
        <Link href="/hypotheses"
          className="bg-gb-card border border-gb-border rounded-xl p-5 hover:border-gb-blue/50 transition-colors group">
          <div className="text-xs font-mono text-gb-blue mb-2">Research</div>
          <div className="text-base font-medium text-white mb-1 group-hover:text-gb-blue transition-colors">
            Hypotheses
          </div>
          <div className="text-sm text-gb-muted">30 OURIP tests with evidence logs.</div>
        </Link>
      </div>

    </div>
  );
}
