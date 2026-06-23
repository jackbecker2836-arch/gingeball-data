import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Gingeball",
  description: "House of Cards · Court Handicap · TCV Lab · NBA analytics",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gb-surface text-gb-text min-h-screen">
        <nav className="border-b border-gb-border px-6 py-3 flex items-center gap-6 bg-gb-base flex-wrap">
          <Link href="/" className="font-mono text-sm font-medium tracking-tight text-white">
            Gingeball
          </Link>

          {/* House of Cards group */}
          <div className="flex gap-6 text-sm">
            <a href="/hoc/house-of-cards.html"
               className="text-gb-coral hover:text-white transition-colors font-medium">
              House of Cards
            </a>
            <Link href="/mock-draft"
                  className="text-gb-coral hover:text-white transition-colors font-medium">
              Mock Draft
            </Link>
          </div>

          <div className="w-px h-4 bg-gb-border mx-1"></div>

          {/* Court Handicap group */}
          <div className="flex gap-6 text-sm">
            <Link href="/court-handicap"
                  className="text-gb-blue hover:text-white transition-colors font-medium">
              Court Handicap
            </Link>
            <Link href="/court-handicap/sandbox"
                  className="text-gb-blue hover:text-white transition-colors inline-flex items-center gap-1.5 font-medium">
              Live Sim
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-900/30 text-blue-400 border border-blue-700/40">
                new
              </span>
            </Link>
            <Link href="/internal/pressure-lab"
                  className="text-gb-muted hover:text-white transition-colors inline-flex items-center gap-1.5">
              Pressure Lab
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-900/30 text-amber-400 border border-amber-700/40">
                experimental
              </span>
            </Link>
          </div>

          <div className="w-px h-4 bg-gb-border mx-1"></div>

          {/* TCV group */}
          <div className="flex gap-6 text-sm text-gb-muted">
            <Link href="/tcvoverview" className="hover:text-white transition-colors">TCV Lab</Link>
            <Link href="/leaderboard" className="hover:text-white transition-colors">TCV leaderboard</Link>
            <Link href="/glossary"    className="hover:text-white transition-colors">Glossary</Link>
            <Link href="/hypotheses"  className="hover:text-white transition-colors">Hypotheses</Link>
          </div>

          <div className="ml-auto text-xs font-mono text-gb-muted">
            <span className="px-2 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-700/40">
              v0.1.0-bootstrap
            </span>
          </div>
        </nav>
        <main>{children}</main>
        <footer className="border-t border-gb-border px-6 py-6 mt-16 flex items-center gap-6 text-sm text-gb-muted">
          <span className="font-mono text-xs tracking-widest uppercase text-gb-muted">Gingeball</span>
          <a href="/hoc/archive.html" className="hover:text-white transition-colors">
            Newsletter Archive
          </a>
        </footer>
      </body>
    </html>
  );
}
