/**
 * GINGEBALL — TCV SCOUTING MATRIX (redesign Stage 1)
 * components/GingeballLeaderboard.tsx  — replaces the v6 leaderboard.
 *
 * Reads design tokens from app/globals.css (single source of truth).
 * Data: /api/leaderboard?season=YYYY  ·  archetypes from lib/archetype-index.ts
 * Photos: lib/player-assets.ts (NBA CDN headshot via getBobbleheadRenderDebug).
 *
 * Patterns taken from the DraftBallr review (function only, not its skin):
 *   · many metrics at once  · click any column to sort  · hover header for definition
 *   · percentile heatmap (shaded by group: offense=blue, defense=red, total=ember)
 *   · metric VIEWS (Overview[landing] / Offense / Defense / All)  · group bands  · expandable rows
 * Confidence intentionally lives in Formula Atlas / Research, not here.
 */
"use client";
import { useState, useMemo, useEffect, useCallback, Fragment } from "react";
import { getBobbleheadRenderDebug } from "@/lib/player-assets";
import { ARCHETYPE_INDEX, normName } from "@/lib/archetype-index";

type Conf = "high" | "medium" | "low";
interface Row {
  id: string; name: string; slug: string; pos: string; tc: string;
  arch: string; sec: string; conf: Conf; rank?: number;
  tcv: number; o: number; d: number; iib: number; oiib: number; diib: number;
  pva: number; sgv: number; cov: number; miv: number; sav: number; ptv: number;
  dsv: number; dpc: number; rpv: number; up: number; cfp: number;
}

type Grp = "tot" | "off" | "def" | "pen";
interface Col { k: keyof Row; l: string; grp: Grp; name: string; def: string; invert?: boolean }

const COLS: Col[] = [
  { k:"tcv", l:"TCV",  grp:"tot", name:"Total Creation Value", def:"Every component summed into one player-value number, graded against the market." },
  { k:"o",   l:"O-TCV",grp:"tot", name:"Offensive TCV", def:"Sum of the offensive components — total offensive value over expectation." },
  { k:"d",   l:"D-TCV",grp:"tot", name:"Defensive TCV", def:"Sum of the defensive components — total defensive value over expectation." },
  { k:"iib", l:"IIB",  grp:"off", name:"Individual Impact on Basket", def:"On/off scoring impact attributable to the player, separated from teammates." },
  { k:"oiib",l:"oIIB", grp:"off", name:"Offensive IIB", def:"The offensive half of Individual Impact on Basket." },
  { k:"pva", l:"PVA",  grp:"off", name:"Passing Value Added", def:"Expected points created by passes — including foul-drawn free-throw value, not just assists." },
  { k:"sgv", l:"SGV",  grp:"off", name:"Shot Generation Value", def:"Value of the shots a player creates for the offense, by quality and volume." },
  { k:"cov", l:"COV",  grp:"off", name:"Contextual Opportunity Value", def:"Adjusts for the role, pace and lineup context a player is used in." },
  { k:"miv", l:"MIV",  grp:"off", name:"Movement Intelligence Value", def:"Off-ball movement, spacing and gravity value. Prototype — needs tracking data." },
  { k:"sav", l:"SAV",  grp:"off", name:"Scheme Adaptability Value", def:"How well a player's value holds across different schemes. Prototype." },
  { k:"ptv", l:"PTV",  grp:"off", name:"Playoff Translation Value", def:"Projected carry-over of regular-season value into the playoffs. Pending." },
  { k:"diib",l:"dIIB", grp:"def", name:"Defensive IIB", def:"The defensive half of Individual Impact on Basket." },
  { k:"dsv", l:"DSV",  grp:"def", name:"Defensive Stopper Value", def:"Matchup-adjusted suppression of the primary assignment vs that opponent's own baseline." },
  { k:"dpc", l:"DPC",  grp:"def", name:"Defensive Positioning Created", def:"Help defense, rotations and positioning value beyond the on-ball stop." },
  { k:"rpv", l:"RPV",  grp:"def", name:"Rim Protection Value", def:"Points saved at the rim — deterrence and contests, shrunk for sample size." },
  { k:"up",  l:"UP",   grp:"pen", name:"Uncertainty Penalty", def:"Reliability shrinkage — how much the score is held back by thin or noisy data. Higher = more penalty.", invert:true },
  { k:"cfp", l:"CFP",  grp:"pen", name:"Context-Fit Penalty", def:"Penalty for value that may not transfer to other contexts. Higher = more penalty.", invert:true },
];
const COLMAP = Object.fromEntries(COLS.map(c => [c.k, c])) as Record<string, Col>;

const VIEWS: Record<string, (keyof Row)[]> = {
  overview: ["tcv","o","d","iib","pva","dsv"],
  offense:  ["o","oiib","pva","sgv","cov","miv"],
  defense:  ["d","diib","dsv","dpc","rpv"],
  all:      ["tcv","o","d","iib","oiib","diib","pva","sgv","cov","miv","sav","ptv","dsv","dpc","rpv","up","cfp"],
};
const VIEW_TABS: [string,string][] = [["overview","Overview"],["offense","Offense"],["defense","Defense"],["all","All"]];
const GRP_META: Record<Grp,{label:string;hue:[number,number,number]}> = {
  tot:{label:"Overall",hue:[255,106,43]}, off:{label:"Offense",hue:[61,139,245]},
  def:{label:"Defense",hue:[242,101,92]}, pen:{label:"Penalty",hue:[154,132,204]},
};
const FAMILY_COLOR: Record<string,string> = {
  guard:"#3D8BF5", wing:"#9A84CC", big:"#F2655C", connector:"#3FB950",
  specialist:"#E3A008", forward:"#5EC8C4",
};

const SEASONS: [string,boolean][] = [["2024-25",true],["2023-24",true],["2022-23",true],["2025-26",false]];
const SEASON_YEAR: Record<string,number> = {"2024-25":2025,"2023-24":2024,"2022-23":2023};
const POSITIONS = ["ALL","G","F","C"];
const mapPos = (p:string|null) => p==="guard"?"G":p==="wing"?"F":p==="big"?"C":(p??"?");

function resolveArch(name:string, apiArch:string|null){
  const rec = ARCHETYPE_INDEX[normName(name)];
  return { label: rec?.label ?? apiArch ?? "Unknown", family: rec?.family ?? "", tc: FAMILY_COLOR[rec?.family ?? ""] ?? "#52607A" };
}

const STYLE_ID = "gb-matrix-styles";
const CSS = `
.gm{font-family:var(--font-sans);color:var(--text);background:var(--ink);min-height:100vh}
.gm-wrap{max-width:1320px;margin:0 auto;padding:0 22px}
.gm-head{display:flex;align-items:flex-end;gap:18px;padding:30px 0 6px;flex-wrap:wrap}
.gm-eyebrow{font-family:var(--font-mono);font-size:11px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}
.gm-title{font-family:var(--font-display);font-weight:900;font-size:46px;line-height:.9;letter-spacing:-.01em;text-transform:uppercase}
.gm-title em{color:var(--ember);font-style:normal}
.gm-legend{margin-left:auto;display:flex;gap:15px;align-items:center;font-family:var(--font-mono);font-size:10px;color:var(--muted);letter-spacing:.05em;text-transform:uppercase;margin-bottom:6px;flex-wrap:wrap}
.gm-legend i{width:9px;height:9px;border-radius:2px;display:inline-block;margin-right:5px;vertical-align:middle}
.gm-views{display:flex;gap:4px;border-bottom:1px solid var(--line);margin:14px 0 0}
.gm-view{font-family:var(--font-mono);font-size:12px;letter-spacing:.05em;text-transform:uppercase;padding:9px 16px;background:none;border:none;border-bottom:2px solid transparent;color:var(--muted);cursor:pointer;transition:.12s;margin-bottom:-1px}
.gm-view:hover{color:var(--text)}
.gm-view.on{color:var(--ember);border-bottom-color:var(--ember)}
.gm-console{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 0 16px}
.gm-seg{display:flex;border:1px solid var(--line);border-radius:3px;overflow:hidden}
.gm-seg button{font-family:var(--font-mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;padding:7px 12px;background:none;border:0;border-right:1px solid var(--line);color:var(--muted);cursor:pointer;transition:.12s}
.gm-seg button:last-child{border-right:0}
.gm-seg button.on{background:var(--ember-soft);color:var(--ember)}
.gm-seg button.on-pos{background:rgba(255,255,255,.06);color:var(--text)}
.gm-seg button:disabled{color:var(--faint);cursor:not-allowed}
.gm-search{margin-left:auto;font-family:var(--font-mono);font-size:11px;background:var(--panel-2);border:1px solid var(--line);border-radius:3px;color:var(--text);padding:8px 11px;width:220px}
.gm-search::placeholder{color:var(--faint)}
.gm-banner{font-family:var(--font-mono);font-size:11px;letter-spacing:.05em;padding:8px 13px;border-radius:3px;margin-bottom:14px}
.gm-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:18px}
.gm-stat{background:var(--panel);border:1px solid var(--line);border-radius:4px;padding:15px 17px}
.gm-stat .l{font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--faint)}
.gm-stat .b{font-family:var(--font-display);font-weight:900;font-size:38px;line-height:.95;letter-spacing:-.02em;margin-top:8px}
.gm-stat .s{font-size:12.5px;color:var(--muted);margin-top:5px}
.gm-scroll{overflow-x:auto;border:1px solid var(--line);border-radius:5px;background:var(--panel)}
.gm-tbl{border-collapse:collapse;width:100%;min-width:760px}
.gm-tbl th,.gm-tbl td{white-space:nowrap;border-bottom:1px solid var(--line)}
.gm-band{height:24px}
.gm-band th{font-family:var(--font-mono);font-size:9px;letter-spacing:.14em;text-transform:uppercase;text-align:left;padding:0 13px;border-left:1px solid var(--line);position:sticky;top:0;background:#0A0D14;z-index:3}
.gm-lab{position:sticky;top:24px;background:#0A0D14;z-index:3}
.gm-lab th{font-family:var(--font-mono);font-size:10px;letter-spacing:.05em;color:var(--muted);height:40px;padding:0 13px;text-align:right;cursor:pointer;user-select:none;transition:.12s}
.gm-lab th:hover{color:var(--text)}
.gm-lab th .ar{font-size:8px;opacity:0;margin-left:4px}
.gm-lab th.act{color:var(--ember)} .gm-lab th.act .ar{opacity:1}
.gm-cr{width:46px;text-align:center!important;position:sticky;left:0;background:#0A0D14;z-index:4}
.gm-cp{min-width:226px;text-align:left!important;position:sticky;left:46px;background:var(--panel);z-index:4;border-right:1px solid var(--line)}
.gm-tbl tbody tr:nth-child(even) td{background:var(--row-alt)}
.gm-tbl tbody tr:nth-child(even) td.gm-cp{background:var(--row-alt)}
.gm-tbl tbody td.gm-cp{background:var(--panel)}
.gm-tbl tbody tr.exp-row:hover td{background:var(--panel-2)!important;cursor:pointer}
.gm-tbl td{padding:0 13px;height:54px;font-family:var(--font-mono);font-size:13.5px;text-align:right}
.gm-rank{font-family:var(--font-display);font-weight:800;font-size:18px;color:var(--faint)}
.gm-rank.top{color:var(--ember)}
.gm-player{display:flex;align-items:center;gap:11px}
.gm-av{width:38px;height:38px;border-radius:50%;flex-shrink:0;border:1.5px solid;overflow:hidden;display:flex;align-items:center;justify-content:center;background:var(--panel-2)}
.gm-av img{width:100%;height:100%;object-fit:cover;object-position:center 12%}
.gm-av svg{width:21px;height:21px;opacity:.45}
.gm-pn{font-family:var(--font-sans);font-weight:600;font-size:13.5px;line-height:1.12}
.gm-pt{font-family:var(--font-mono);font-size:10px;color:var(--muted);margin-top:2px;letter-spacing:.03em}
.gm-tag{display:inline-block;font-family:var(--font-mono);font-size:9px;letter-spacing:.04em;text-transform:uppercase;padding:2px 7px;border-radius:3px;border:1px solid;margin-top:3px;max-width:200px;overflow:hidden;text-overflow:ellipsis}
.gm-tcv{font-family:var(--font-display);font-weight:900;font-size:22px;color:var(--ember);letter-spacing:-.01em}
.gm-pct{font-family:var(--font-mono);font-size:9px;color:var(--faint);display:block;text-align:right;margin-top:1px}
.gm-exp td{background:var(--panel-2)!important;padding:0}
.gm-exp-in{padding:18px 20px;display:flex;gap:18px;flex-wrap:wrap}
.gm-exp-why{flex:1;min-width:260px}
.gm-exp-h{font-family:var(--font-mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ember);margin-bottom:6px}
.gm-exp-b{font-size:13px;color:var(--muted);line-height:1.6;max-width:520px}
.gm-bars{display:flex;flex-wrap:wrap;gap:10px 18px;margin-top:12px}
.gm-bar{display:flex;align-items:center;gap:7px}
.gm-bar .bk{font-family:var(--font-mono);font-size:10px;color:var(--muted);width:34px;text-align:right}
.gm-bar .tk{width:74px;height:4px;background:var(--panel);border-radius:2px;overflow:hidden}
.gm-bar .tk i{display:block;height:100%;border-radius:2px}
.gm-bar .vv{font-family:var(--font-mono);font-size:11px;color:var(--text);min-width:30px}
.gm-links{display:flex;gap:8px;align-items:center;margin-top:14px;flex-wrap:wrap}
.gm-link{font-family:var(--font-mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;padding:8px 14px;border-radius:3px;text-decoration:none;border:1px solid}
.gm-link.p{color:var(--ember);background:var(--ember-soft);border-color:var(--line-2)}
.gm-link.s{color:var(--muted);background:transparent;border-color:var(--line)}
.gm-foot{font-family:var(--font-mono);font-size:10px;color:var(--faint);letter-spacing:.1em;text-transform:uppercase;text-align:center;padding:26px 0 50px}
#gm-tip{position:fixed;z-index:99;max-width:280px;background:#05070C;border:1px solid var(--line-2);border-radius:5px;padding:11px 13px;pointer-events:none;opacity:0;transition:opacity .1s;box-shadow:0 12px 40px rgba(0,0,0,.6)}
#gm-tip .n{font-family:var(--font-display);font-weight:800;font-size:15px;text-transform:uppercase;color:var(--ember);margin-bottom:3px}
#gm-tip .g{font-family:var(--font-mono);font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
#gm-tip .d{font-family:var(--font-sans);font-size:12px;color:var(--text);line-height:1.5;margin-top:6px}
@media(max-width:880px){.gm-stats{grid-template-columns:1fr 1fr}.gm-title{font-size:34px}.gm-band th{display:none}}
`;

const SIL = (<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>);

function Portrait({ p }: { p: Row }) {
  const [err, setErr] = useState(false);
  let url: string | null = null;
  try { const dbg:any = getBobbleheadRenderDebug(p.slug); if (dbg?.selectedRenderBranch !== "fallback") url = dbg?.selectedAssetUrl ?? null; } catch { url = null; }
  return (
    <div className="gm-av" style={{ borderColor: p.tc, color: p.tc }}>
      {url && !err ? <img src={url} alt="" loading="lazy" onError={() => setErr(true)} /> : SIL}
    </div>
  );
}

export default function GingeballLeaderboard() {
  const [season, setSeason] = useState("2024-25");
  const [view, setView]     = useState<keyof typeof VIEWS>("overview");
  const [pos, setPos]       = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort]     = useState<{k: keyof Row; dir: number}>({ k: "tcv", dir: -1 });
  const [exp, setExp]       = useState<string | null>(null);
  const [players, setPlayers] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  // inject styles (idempotent)
  useEffect(() => {
    if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
    const t = document.createElement("style"); t.id = STYLE_ID; t.textContent = CSS;
    document.head.appendChild(t);
  }, []);

  // fetch
  useEffect(() => {
    const yr = SEASON_YEAR[season]; if (!yr) return;
    setLoading(true); setError(null);
    fetch(`/api/leaderboard?season=${yr}&limit=300`)
      .then(r => { if (!r.ok) throw new Error(`API ${r.status}`); return r.json(); })
      .then((j: { data: any[] }) => {
        const rows: Row[] = (j.data ?? [])
          .filter(r => r.eligibility_tier !== "insufficient_sample" && r.tcv != null)
          .map(r => {
            const slug = r.name_slug ?? r.player_id;
            const a = resolveArch(r.name, r.archetype);
            const n = (x:any) => (x == null ? 0 : +x);
            return {
              id: slug, name: r.name, slug, pos: mapPos(r.position), tc: a.tc,
              arch: a.label, sec: r.secondary_archetype ?? "",
              conf: (r.confidence_tier ?? "low") as Conf,
              tcv:n(r.tcv), o:n(r.o_tcv), d:n(r.d_tcv), iib:n(r.iib), oiib:n(r.oiib), diib:n(r.diib),
              pva:n(r.pva), sgv:n(r.sgv), cov:n(r.cov), miv:n(r.miv), sav:n(r.sav), ptv:n(r.ptv),
              dsv:n(r.dsv), dpc:n(r.dpc), rpv:n(r.rpv), up:n(r.up), cfp:n(r.cfp),
            };
          });
        setPlayers(rows); setLoading(false);
        if (!rows.length) setError("No ranked players for this season yet.");
      })
      .catch((e: Error) => { setError(`Could not load rankings (${e.message}).`); setPlayers([]); setLoading(false); });
  }, [season]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return players
      .filter(p => pos === "ALL" || p.pos === pos)
      .filter(p => !q || [p.name, p.arch, p.pos].some(f => f?.toLowerCase().includes(q)))
      .slice()
      .sort((a, b) => ((a[sort.k] as number) - (b[sort.k] as number)) * sort.dir)
      .map((p, i) => ({ ...p, rank: i + 1 }));
  }, [players, pos, search, sort]);

  // percentiles per metric over the filtered pool
  const pct = useMemo(() => {
    const m: Record<string, Record<string, number>> = {};
    const n = filtered.length || 1;
    COLS.forEach(c => {
      const sorted = filtered.map(p => p[c.k] as number).slice().sort((x, y) => x - y);
      filtered.forEach(p => {
        const v = p[c.k] as number;
        let r = sorted.findIndex(x => x >= v); if (r < 0) r = n - 1;
        let pp = Math.round((r / (n - 1 || 1)) * 100);
        if (c.invert) pp = 100 - pp;
        (m[p.id] ||= {})[c.k] = pp;
      });
    });
    return m;
  }, [filtered]);

  const cols = VIEWS[view].map(k => COLMAP[k]);
  const groups = (["tot","off","def","pen"] as Grp[])
    .map(g => ({ g, cols: cols.filter(c => c.grp === g) }))
    .filter(x => x.cols.length);

  const sortBy = useCallback((k: keyof Row) =>
    setSort(s => s.k === k ? { k, dir: -s.dir } : { k, dir: -1 }), []);

  const cellBg = (g: Grp, p: number) => {
    const [r, gr, b] = GRP_META[g].hue;
    return `rgba(${r},${gr},${b},${(Math.max(0, (p - 38) / 62) * 0.30).toFixed(3)})`;
  };
  const tip = (e: React.MouseEvent, c: Col) => {
    const el = document.getElementById("gm-tip"); if (!el) return;
    (el.querySelector(".n") as HTMLElement).textContent = c.name;
    (el.querySelector(".g") as HTMLElement).textContent = c.l + " · " + GRP_META[c.grp].label + " component";
    (el.querySelector(".d") as HTMLElement).textContent = c.def;
    el.style.opacity = "1";
    let x = e.clientX + 14; if (x > window.innerWidth - 300) x = e.clientX - 294;
    el.style.left = x + "px"; el.style.top = (e.clientY + 14) + "px";
  };
  const hideTip = () => { const el = document.getElementById("gm-tip"); if (el) el.style.opacity = "0"; };

  const leader = filtered[0];
  const avg = filtered.length ? (filtered.reduce((s, p) => s + p.tcv, 0) / filtered.length).toFixed(1) : "--";

  const whyText = (p: Row) => {
    const f = p.name.split(" ")[0];
    if (p.iib >= 4.5) return `Elite individual impact — IIB of ${p.iib.toFixed(1)} puts ${f} in the top tier of on-court scoring influence.`;
    if (p.pva >= 4.0) return `Passing creation drives the score — a PVA of ${p.pva.toFixed(1)} reflects rare playmaking value.`;
    if (p.dsv >= 4.0) return `Defensive disruption is the engine — DSV of ${p.dsv.toFixed(1)} marks an elite stopper.`;
    if (p.rpv >= 3.5) return `Rim protection anchors the profile — RPV of ${p.rpv.toFixed(1)} in points saved at the basket.`;
    if (p.o >= 7.0)   return `Offensive volume is the differentiator — O-TCV of ${p.o.toFixed(1)} leads this group.`;
    return `Balanced profile — IIB ${p.iib.toFixed(1)} / PVA ${p.pva.toFixed(1)} / DSV ${p.dsv.toFixed(1)} spread evenly.`;
  };

  return (
    <div className="gm">
      <div className="gm-wrap">
        <div className="gm-head">
          <div>
            <div className="gm-eyebrow">{season} · {loading ? "loading…" : `${players.length} qualified`}</div>
            <h1 className="gm-title">Scouting <em>Matrix</em></h1>
          </div>
          <div className="gm-legend">
            <span><i style={{ background: "var(--blue)" }} />Offense</span>
            <span><i style={{ background: "var(--red)" }} />Defense</span>
            <span><i style={{ background: "var(--ember)" }} />Total</span>
            <span style={{ color: "var(--faint)" }}>cell shade = percentile</span>
          </div>
        </div>

        {/* VIEW TABS */}
        <div className="gm-views" role="tablist">
          {VIEW_TABS.map(([k, l]) => (
            <button key={k} role="tab" aria-selected={view === k}
              className={`gm-view${view === k ? " on" : ""}`} onClick={() => setView(k as keyof typeof VIEWS)}>{l}</button>
          ))}
        </div>

        {/* CONSOLE */}
        <div className="gm-console">
          <div className="gm-seg">
            {SEASONS.map(([s, ok]) => (
              <button key={s} className={season === s && ok ? "on" : ""} disabled={!ok}
                onClick={() => ok && setSeason(s)} title={!ok ? "Pending" : undefined}>{ok ? s : `${s} · pending`}</button>
            ))}
          </div>
          <div className="gm-seg">
            {POSITIONS.map(p => (
              <button key={p} className={pos === p ? "on-pos" : ""} onClick={() => setPos(p)}>{p}</button>
            ))}
          </div>
          <input className="gm-search" placeholder="/ search name, archetype…" value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>

        {(loading || error) && (
          <div className="gm-banner" style={{
            background: error ? "rgba(242,101,92,.1)" : "var(--ember-soft)",
            border: `1px solid ${error ? "rgba(242,101,92,.3)" : "var(--line-2)"}`,
            color: error ? "var(--red)" : "var(--ember)" }}>
            {loading ? "Loading live rankings…" : error}
          </div>
        )}

        {/* STAT STRIP */}
        <div className="gm-stats">
          <div className="gm-stat"><div className="l" style={{ color: "var(--ember)" }}>Leader · {season}</div>
            <div className="b" style={{ color: "var(--ember)" }}>{leader ? leader.tcv.toFixed(1) : "--"}</div>
            <div className="s">{leader ? `${leader.name} · ${leader.arch}` : "—"}</div></div>
          <div className="gm-stat"><div className="l">Ranked</div><div className="b">{filtered.length}</div>
            <div className="s">{pos === "ALL" ? "all positions" : `${pos} only`}</div></div>
          <div className="gm-stat"><div className="l">Average TCV</div><div className="b" style={{ color: "var(--blue)" }}>{avg}</div>
            <div className="s">filtered pool</div></div>
          <div className="gm-stat"><div className="l">View</div><div className="b" style={{ color: "var(--text)", fontSize: 30 }}>{VIEW_TABS.find(v => v[0] === view)?.[1]}</div>
            <div className="s">{cols.length} metrics shown</div></div>
        </div>

        {/* MATRIX */}
        <div className="gm-scroll">
          <table className="gm-tbl">
            <thead>
              <tr className="gm-band">
                <th className="gm-cr" rowSpan={2} style={{ borderLeft: 0 }}>#</th>
                <th className="gm-cp" rowSpan={2} style={{ verticalAlign: "bottom", paddingBottom: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".05em", color: "var(--muted)" }}>PLAYER · ARCHETYPE</span>
                </th>
                {groups.map(({ g, cols }) => (
                  <th key={g} colSpan={cols.length} style={{ color: `rgb(${GRP_META[g].hue.join(",")})` }}>{GRP_META[g].label}</th>
                ))}
              </tr>
              <tr className="gm-lab">
                {groups.flatMap(({ cols }) => cols).map(c => (
                  <th key={c.k} className={sort.k === c.k ? "act" : ""}
                    onClick={() => sortBy(c.k)} onMouseMove={e => tip(e, c)} onMouseLeave={hideTip}>
                    {c.l}<span className="ar">{sort.dir < 0 ? "▼" : "▲"}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const isExp = exp === p.id;
                return (
                  <Fragment key={p.id}>
                    <tr key={p.id} className="exp-row" onClick={() => setExp(isExp ? null : p.id)}
                      style={{ borderLeft: `3px solid ${p.tc}` }}>
                      <td className="gm-cr"><span className={`gm-rank${(p.rank ?? 99) <= 3 ? " top" : ""}`}>{String(p.rank).padStart(2, "0")}</span></td>
                      <td className="gm-cp">
                        <div className="gm-player">
                          <Portrait p={p} />
                          <div style={{ minWidth: 0 }}>
                            <div className="gm-pn">{p.name}</div>
                            <div className="gm-pt">{p.pos}</div>
                            <span className="gm-tag" style={{ color: p.tc, borderColor: `${p.tc}55`, background: `${p.tc}14` }}>{p.arch}</span>
                          </div>
                        </div>
                      </td>
                      {groups.flatMap(({ cols }) => cols).map(c => {
                        const v = p[c.k] as number; const pp = pct[p.id]?.[c.k] ?? 50;
                        const isTcv = c.k === "tcv";
                        return (
                          <td key={c.k} style={{ background: cellBg(c.grp, pp) }}>
                            <span className={isTcv ? "gm-tcv" : ""}>{v.toFixed(1)}</span>
                            {!isTcv && <span className="gm-pct">{pp}</span>}
                          </td>
                        );
                      })}
                    </tr>
                    {isExp && (
                      <tr className="gm-exp" key={p.id + "-x"}>
                        <td colSpan={cols.length + 2}>
                          <div className="gm-exp-in">
                            <Portrait p={p} />
                            <div className="gm-exp-why">
                              <div className="gm-exp-h">Why ranked here</div>
                              <p className="gm-exp-b">{whyText(p)}</p>
                              <div className="gm-bars">
                                {(["iib","pva","sgv","dsv","dpc","rpv"] as (keyof Row)[]).map(k => {
                                  const c = COLMAP[k]; const v = p[k] as number; const pp = pct[p.id]?.[k] ?? 0;
                                  return (
                                    <div className="gm-bar" key={k}>
                                      <span className="bk">{c.l}</span>
                                      <span className="tk"><i style={{ width: `${pp}%`, background: `rgb(${GRP_META[c.grp].hue.join(",")})` }} /></span>
                                      <span className="vv">{v.toFixed(1)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="gm-links">
                                <a className="gm-link p" href={`/players/${p.slug}`}>Full profile →</a>
                                <a className="gm-link s" href="/glossary">Formula Atlas</a>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="gm-foot">Gingeball · TCV Scouting Matrix · {season}</div>
      </div>
      <div id="gm-tip"><div className="n" /><div className="g" /><div className="d" /></div>
    </div>
  );
}
