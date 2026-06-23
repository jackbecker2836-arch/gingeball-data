import React, { useState, useMemo } from "react";

// =============================================================================
// COURT HANDICAP — DESIGN STUDIES  (Phase 2B reset)
//
// THREE directions, ONE fake game, SAME formula/metric/fixture contracts. These
// are studies for SELECTION, not a prototype — they solve the core objects
// (MarketHub, CourtGraph, lineup, Player Court Conditions, Scorecard, Stamp,
// glossary) in three authored systems so one can be chosen and then built out.
//
//   A — Swiss Basketball Intelligence   (Brockmann · Vignelli · Tufte · Sutnar)
//   B — Editorial Basketball Map        (Scher · Carson · Brody · Kruger)
//   C — Computational Artifact          (Cooper · Greiman · Maeda · Saville)
//
// No faux paper, tape, chalk, distress, neon, sportsbook, or shot-chart styling.
// Type is principled-placeholder pending the real Gingeball/TCV stack.
// =============================================================================

// ---- shared math (mirror of lib/formula-registry.ts) ------------------------
const r = (x, d = 3) => Number(x.toFixed(d));
const F = {
  impliedTeamTotals: (t, s) => { const m = -s; return { home: r((t + m) / 2, 2), away: r((t - m) / 2, 2) }; },
  expectedPossessions: (t) => r(t / (2 * 1.14), 1),
  marketPpp: (it, ep) => r(it / ep, 4),
  propSuppression: (tn, no) => r(1 - tn / no, 4),
  parPer100: (l, p) => r((l / p) * 100, 1),
  actualPer100: (a, p) => r((a / p) * 100, 1),
  courtTilt: (s) => r(Math.max(-6, Math.min(6, s * 0.6)), 2),
};

// ---- shared fixture (subset; mirror of fixtures/fake-game.ts) ----------------
const G = {
  matchup: ["TEAM X", "TEAM Y"], market: { spread: -4, total: 202 },
  lineup: { spread: -4.4, total: 194.2 }, courtType: "Low-Total Defensive Grind",
  players: [
    { id: "x1", t: "X", code: "X1", name: "Star Scoring Guard", arch: "Pressure-Rim Midrange Assassin", fit: 38, diff: 86, conf: 0.74, label: "TRAP COURT", pos: [0.34, 0.5],
      cond: { normalPar: 27.5, marketPar: 24.5, lineupPar: 23.1, actual: 29, expPoss: 66.5, actPoss: 67, slope: "HIGH" },
      lens: { zones: { paint: "rust", top: "ember", wing: "rust" }, read: ["Points par cut 27.5 → 24.5 (10.9% suppression)", "Lineup shrinks par to 23.1", "Fit 38 / Difficulty 86 — a Plus-Handicap Test"] } },
    { id: "x2", t: "X", code: "X2", name: "Secondary Wing Creator", arch: "Two-Way Wing Engine", fit: 61, diff: 58, conf: 0.6, label: "NEUTRAL", pos: [0.28, 0.26] },
    { id: "x3", t: "X", code: "X3", name: "Low-Usage 3-and-D Wing", arch: "Wing-Stopper Spacing Blade", fit: 70, diff: 49, conf: 0.55, label: "CONNECTOR WINDOW", pos: [0.13, 0.16],
      lens: { zones: { corner: "blue", wing: "rust" }, read: ["Box score under-rates him", "Value = spacing gravity + high-leverage defense", "Judged on role, not points"] } },
    { id: "x4", t: "X", code: "X4", name: "Non-Shooting Forward", arch: "Defensive Utility Forward", fit: 52, diff: 55, conf: 0.5, label: "ROLE", pos: [0.2, 0.74] },
    { id: "x5", t: "X", code: "X5", name: "Rim-Running Center", arch: "Vertical Lob-and-Glass Anchor", fit: 64, diff: 51, conf: 0.57, label: "ROLL", pos: [0.14, 0.53] },
    { id: "y1", t: "Y", code: "Y1", name: "Elite POA Stopper", arch: "Point-of-Attack Havoc Guard", fit: 72, diff: 44, conf: 0.66, label: "STOPPER", pos: [0.66, 0.5] },
    { id: "y2", t: "Y", code: "Y2", name: "Big Wing Stopper", arch: "Physical 3-and-D Wing", fit: 67, diff: 47, conf: 0.6, label: "NEUTRAL", pos: [0.72, 0.26] },
    { id: "y3", t: "Y", code: "Y3", name: "Switch Forward", arch: "Switchable Utility Forward", fit: 63, diff: 50, conf: 0.55, label: "SWITCH", pos: [0.83, 0.76] },
    { id: "y4", t: "Y", code: "Y4", name: "Rim Protector", arch: "Paint-Wall Rim Protector", fit: 76, diff: 41, conf: 0.68, label: "RIM ANCHOR", pos: [0.88, 0.53],
      lens: { zones: { paint: "blue", corner: "gold" }, read: ["Opponent implied at 99 — a grind court", "Rim-pressure env HIGH: deterrence opportunity elevated", "Fit 76 — the game that traps the guard is a dream here"] } },
    { id: "y5", t: "Y", code: "Y5", name: "Low-Usage Spacer", arch: "Corner Spacer Connector", fit: 69, diff: 46, conf: 0.52, label: "CONNECTOR WINDOW", pos: [0.89, 0.18] },
  ],
  syn: [["x1", "x5", "off"], ["x1", "x3", "off"], ["x1", "x4", "haz"], ["y1", "y4", "def"]],
  poss: [1.42, 0, 1.18, 2.1, 0, 1.5, 0.92, 1.33, 0, 1.0, 1.66, 0],
};

function useModel() {
  return useMemo(() => {
    const imp = F.impliedTeamTotals(G.market.total, G.market.spread);
    const ep = F.expectedPossessions(G.market.total);
    const sg = G.players[0].cond;
    const supp = F.propSuppression(sg.marketPar, sg.normalPar);
    const mp = F.parPer100(sg.marketPar, sg.expPoss), lp = F.parPer100(sg.lineupPar, sg.expPoss), ac = F.actualPer100(sg.actual, sg.actPoss);
    return { imp, ep, xPpp: F.marketPpp(imp.home, ep), yPpp: F.marketPpp(imp.away, ep), tilt: F.courtTilt(G.lineup.spread),
      sg: { ...sg, supp, mp, lp, ac, beatMarket: r(ac - mp, 1), beatLineup: r(ac - lp, 1) } };
  }, []);
}

const TINT = { rust: "#B5371A", ember: "#FF5A1F", blue: "#2E9BE6", gold: "#F0A92B" };

// court coordinate helper (normalized pos -> viewBox)
const VB = { w: 920, h: 460 };
const xy = (p) => [40 + p[0] * (VB.w - 80), 30 + p[1] * (VB.h - 60)];

// =============================================================================
// DIRECTION A — SWISS BASKETBALL INTELLIGENCE
// Grid, hairlines, one signal color, the court as a precision control surface.
// =============================================================================
function StudyA({ model, sel, setSel }) {
  const P = G.players.find((p) => p.id === sel);
  const ink = "#16140F", ground = "#F2F0E9", line = "#B9B4A5", signal = "#FF5A1F", market = "#9A6F12";
  const sg = model.sg;
  const HRule = () => <div style={{ height: 1, background: line, margin: "0" }} />;
  const Cell = ({ k, v, hot }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: `1px solid ${line}` }}>
      <span style={{ fontSize: 10, letterSpacing: "0.04em", color: "#6b6553", textTransform: "uppercase" }}>{k}</span>
      <span style={{ fontSize: 12.5, fontWeight: hot ? 700 : 400, color: hot ? signal : ink, fontVariantNumeric: "tabular-nums" }}>{v}</span>
    </div>
  );
  return (
    <div style={{ background: ground, color: ink, fontFamily: "'Helvetica Neue',Helvetica,Arial,sans-serif", padding: "26px 30px", minHeight: 560 }}>
      {/* masthead — strict baseline */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", borderBottom: `2px solid ${ink}`, paddingBottom: 8 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.34em", color: "#6b6553" }}>GINGEBALL / COURT HANDICAP</div>
          <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.01em", marginTop: 2 }}>{G.matchup[0]} — {G.matchup[1]}</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11, color: "#6b6553", letterSpacing: "0.04em" }}>
          TONIGHT'S COURT<br />{G.courtType}<br />FIG. 1 / STUDY A
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 28, marginTop: 18 }}>
        {/* COURT as precision diagram */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#6b6553", marginBottom: 6 }}>COURTGRAPH — SPATIAL CONTROL SURFACE</div>
          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={{ width: "100%", border: `1px solid ${line}` }}>
            {/* modular hairline grid */}
            {Array.from({ length: 9 }).map((_, i) => <line key={"v" + i} x1={40 + i * (VB.w - 80) / 8} y1="30" x2={40 + i * (VB.w - 80) / 8} y2={VB.h - 30} stroke={line} strokeWidth="0.5" />)}
            {Array.from({ length: 5 }).map((_, i) => <line key={"h" + i} x1="40" y1={30 + i * (VB.h - 60) / 4} x2={VB.w - 40} y2={30 + i * (VB.h - 60) / 4} stroke={line} strokeWidth="0.5" />)}
            <rect x="40" y="30" width={VB.w - 80} height={VB.h - 60} fill="none" stroke={ink} strokeWidth="1.2" />
            <line x1={VB.w / 2} y1="30" x2={VB.w / 2} y2={VB.h - 30} stroke={ink} strokeWidth="1" />
            <circle cx={VB.w / 2} cy={VB.h / 2} r="52" fill="none" stroke={ink} strokeWidth="1" />
            {/* zone labels — Sutnar navigational */}
            {[["MARKET", VB.w / 2, VB.h / 2 - 60], ["PRESSURE", 110, VB.h / 2], ["SPACING", 110, 52], ["CREATION", VB.w * 0.34, 52], ["MATCHUP", VB.w * 0.72, 52], ["RESULT", VB.w / 2, VB.h - 14]].map(([t, x, y]) => (
              <text key={t} x={x} y={y} textAnchor="middle" style={{ fontSize: 8.5, letterSpacing: "0.18em", fill: "#9a937f" }}>{t}</text>
            ))}
            {/* lens signal (rule lines, not fills) */}
            {P?.lens && Object.keys(P.lens.zones).map((z) => {
              const a = { paint: [110, VB.h / 2], top: [VB.w * 0.34, 70], wing: [VB.w * 0.72, 80], corner: [110, 60] }[z];
              return a ? <rect key={z} x={a[0] - 60} y={a[1] - 12} width="120" height="2" fill={signal} /> : null;
            })}
            {/* market hub numerals */}
            <text x={VB.w / 2} y={VB.h / 2 - 4} textAnchor="middle" style={{ fontSize: 26, fontWeight: 700, fill: ink, fontVariantNumeric: "tabular-nums" }}>{model.imp.home}:{model.imp.away}</text>
            <text x={VB.w / 2} y={VB.h / 2 + 14} textAnchor="middle" style={{ fontSize: 9, fill: market, letterSpacing: "0.1em" }}>PPP {model.xPpp} / {model.yPpp}</text>
            {/* synergy hairlines */}
            {G.syn.map(([a, b, ty], i) => { const A = xy(G.players.find((p) => p.id === a).pos), B = xy(G.players.find((p) => p.id === b).pos); return <line key={i} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={ty === "haz" ? signal : ink} strokeWidth="0.6" strokeDasharray={ty === "haz" ? "2 3" : "0"} />; })}
            {/* nodes — precise squares */}
            {G.players.map((p) => { const [cx, cy] = xy(p.pos); const on = p.id === sel; return (
              <g key={p.id} transform={`translate(${cx} ${cy})`} onClick={() => setSel(p.id)} style={{ cursor: "pointer" }}>
                <rect x="-13" y="-13" width="26" height="26" fill={on ? signal : ground} stroke={ink} strokeWidth={on ? 0 : 1} />
                <text textAnchor="middle" y="4" style={{ fontSize: 11, fontWeight: 700, fill: on ? ground : ink }}>{p.code}</text>
                <rect x="-13" y="15" width={26 * (p.fit / 100)} height="2" fill={ink} />
              </g> ); })}
          </svg>
          <div style={{ display: "flex", gap: 22, marginTop: 6, fontSize: 9.5, color: "#6b6553" }}>
            <span>— SYNERGY</span><span style={{ color: signal }}>·· HAZARD</span><span>▮ FIT INDEX</span><span style={{ color: signal }}>■ SELECTED</span>
          </div>
        </div>

        {/* control surface: conditions + scorecard */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.2em", color: "#6b6553" }}>PLAYER COURT CONDITIONS</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 3 }}>{P?.name}</div>
          <div style={{ fontSize: 11, color: "#6b6553", marginBottom: 6 }}>{P?.arch}</div>
          {P?.cond ? (<>
            <Cell k="Normal par" v={sg.normalPar} /><Cell k="Market par" v={sg.marketPar} /><Cell k="Lineup par" v={sg.lineupPar} />
            <Cell k="Suppression" v={`${(sg.supp * 100).toFixed(1)}%`} /><Cell k="Fit / Difficulty" v={`${P.fit} / ${P.diff}`} />
            <Cell k="Par /100 (mkt)" v={sg.mp} /><Cell k="Actual /100" v={sg.ac} hot /><Cell k="Court beat /100" v={`+${sg.beatLineup}`} hot />
          </>) : (<><Cell k="Court fit" v={P.fit} /><Cell k="Difficulty" v={P.diff} /><Cell k="Label" v={P.label} /></>)}

          {/* possessions sparkline — Tufte */}
          <div style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "#6b6553", margin: "12px 0 3px" }}>POSSESSION PPP</div>
          <svg viewBox="0 0 220 30" style={{ width: "100%" }}>
            {G.poss.map((v, i) => <rect key={i} x={i * 18 + 2} y={30 - v * 12} width="14" height={Math.max(1, v * 12)} fill={v > 1.14 ? signal : ink} opacity={v > 1.14 ? 1 : 0.5} />)}
            <line x1="0" y1={30 - 1.14 * 12} x2="220" y2={30 - 1.14 * 12} stroke={market} strokeWidth="0.5" strokeDasharray="2 2" />
          </svg>

          {/* scorecard / stamp — a precise framed module, NOT distressed */}
          {P?.cond && (
            <div style={{ marginTop: 14, border: `1.5px solid ${ink}` }}>
              <div style={{ background: ink, color: ground, padding: "6px 10px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 12, letterSpacing: "0.14em", fontWeight: 700 }}>BEAT THE COURT</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: signal, fontVariantNumeric: "tabular-nums" }}>+{sg.beatLineup}<span style={{ fontSize: 10, color: ground }}> /100</span></span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", padding: "6px 10px", fontSize: 11 }}>
                <span style={{ color: "#6b6553" }}>Market par {sg.marketPar}</span><span style={{ textAlign: "right" }}>Actual {sg.actual}</span>
                <span style={{ color: "#6b6553" }}>Confidence</span><span style={{ textAlign: "right" }}>{Math.round(P.conf * 100)}%</span>
              </div>
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 10, letterSpacing: "0.04em", color: "#6b6553", borderTop: `1px solid ${line}`, paddingTop: 6 }}>
            <b style={{ color: ink }}>GLOSSARY · COURT PAR</b> — expected output for an average player in this exact context.
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DIRECTION B — EDITORIAL BASKETBALL MAP
// Type as environment, declarative confrontation, court as a map of power.
// =============================================================================
function StudyB({ model, sel, setSel }) {
  const P = G.players.find((p) => p.id === sel);
  const sg = model.sg;
  const bg = "#0A0A0A", fg = "#F4F1EA", ember = "#FF5A1F", gold = "#F0A92B", blue = "#2E9BE6", rust = "#B5371A";
  const Big = ({ children, size = 64, color = fg }) => <div style={{ fontFamily: "'Arial Black',Helvetica,sans-serif", fontWeight: 900, fontSize: size, lineHeight: 0.86, letterSpacing: "-0.02em", color }}>{children}</div>;
  return (
    <div style={{ background: bg, color: fg, fontFamily: "Helvetica,Arial,sans-serif", padding: "24px 30px", minHeight: 560 }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid #333`, paddingBottom: 6, fontSize: 11, letterSpacing: "0.2em", color: "#888" }}>
        <span>GINGEBALL · COURT HANDICAP</span><span>STUDY B · EDITORIAL MAP</span>
      </div>

      {/* thesis as environment (Scher/Kruger) */}
      <div style={{ marginTop: 16, position: "relative" }}>
        <Big size={84}>THE MARKET</Big>
        <Big size={84} color={gold}>SET PAR.</Big>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
          <Big size={84}>HE BEAT</Big>
          <Big size={84} color={ember}>THE COURT.</Big>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 26, marginTop: 18 }}>
        {/* court as bold typographic map */}
        <div>
          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={{ width: "100%" }}>
            <rect x="0" y="0" width={VB.w} height={VB.h} fill="#0F0F0F" />
            {/* diagonal tension (Lissitzky) tied to tilt */}
            <line x1="0" y1={VB.h * 0.5 - model.tilt * 10} x2={VB.w} y2={VB.h * 0.5 + model.tilt * 10} stroke="#222" strokeWidth="1" />
            {/* huge zone words as the map */}
            {[["CREATION", VB.w * 0.32, 70, 30], ["MATCHUP", VB.w * 0.7, 80, 26], ["PRESSURE", 150, VB.h * 0.55, 30], ["SPACING", 150, 60, 22], ["RESULT", VB.w * 0.5, VB.h - 20, 22]].map(([t, x, y, s]) => (
              <text key={t} x={x} y={y} textAnchor="middle" style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, fontSize: s, fill: "#1c1c1c", letterSpacing: "-0.02em" }}>{t}</text>
            ))}
            {/* lens wash blocks */}
            {P?.lens && Object.entries(P.lens.zones).map(([z, c]) => { const a = { paint: [150, VB.h * 0.55], top: [VB.w * 0.32, 70], wing: [VB.w * 0.7, 80], corner: [150, 60] }[z]; return a ? <rect key={z} x={a[0] - 70} y={a[1] - 30} width="140" height="44" fill={TINT[c]} opacity="0.22" /> : null; })}
            <rect x="30" y="20" width={VB.w - 60} height={VB.h - 40} fill="none" stroke="#3a3a3a" strokeWidth="2" />
            <circle cx={VB.w / 2} cy={VB.h / 2} r="58" fill="none" stroke={gold} strokeWidth="2" />
            <text x={VB.w / 2} y={VB.h / 2 + 2} textAnchor="middle" style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, fontSize: 30, fill: fg }}>{model.imp.home}·{model.imp.away}</text>
            <text x={VB.w / 2} y={VB.h / 2 + 22} textAnchor="middle" style={{ fontSize: 10, fill: gold, letterSpacing: "0.1em" }}>MARKET COURT</text>
            {G.syn.map(([a, b, ty], i) => { const A = xy(G.players.find((p) => p.id === a).pos), B = xy(G.players.find((p) => p.id === b).pos); return <line key={i} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={ty === "off" ? blue : ty === "def" ? rust : ember} strokeWidth="2.5" opacity="0.7" strokeDasharray={ty === "haz" ? "1 8" : "0"} strokeLinecap="round" />; })}
            {G.players.map((p) => { const [cx, cy] = xy(p.pos); const on = p.id === sel; return (
              <g key={p.id} transform={`translate(${cx} ${cy})`} onClick={() => setSel(p.id)} style={{ cursor: "pointer" }}>
                <circle r={on ? 17 : 14} fill={on ? ember : "#111"} stroke={p.t === "X" ? gold : blue} strokeWidth="2" />
                <text textAnchor="middle" y="5" style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, fontSize: 13, fill: on ? "#0A0A0A" : fg }}>{p.code}</text>
              </g> ); })}
          </svg>
        </div>

        {/* editorial conditions: numbers as headlines */}
        <div style={{ borderLeft: `2px solid #2a2a2a`, paddingLeft: 16 }}>
          <div style={{ fontSize: 11, letterSpacing: "0.2em", color: ember }}>{P?.label}</div>
          <div style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, fontSize: 24, lineHeight: 0.95, margin: "2px 0" }}>{P?.name}</div>
          <div style={{ fontSize: 11, color: "#888", fontStyle: "italic", marginBottom: 12 }}>{P?.arch}</div>
          {P?.cond ? (<>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><Big size={56} color={ember}>+{sg.beatLineup}</Big><span style={{ fontSize: 12, color: "#888" }}>COURT<br />BEAT /100</span></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px 14px", marginTop: 14 }}>
              {[["MARKET PAR", sg.marketPar, gold], ["LINEUP PAR", sg.lineupPar, ember], ["ACTUAL", sg.actual, fg], ["SUPPRESSION", `${(sg.supp * 100).toFixed(0)}%`, rust], ["FIT", P.fit, fg], ["DIFFICULTY", P.diff, rust]].map(([k, v, c]) => (
                <div key={k}><div style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, fontSize: 26, color: c }}>{v}</div><div style={{ fontSize: 9, letterSpacing: "0.12em", color: "#888" }}>{k}</div></div>
              ))}
            </div>
            {/* Kruger stamp bar */}
            <div style={{ marginTop: 16, background: ember, color: "#0A0A0A", padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontFamily: "'Arial Black',sans-serif", fontWeight: 900, fontSize: 18, letterSpacing: "-0.01em" }}>BEAT THE COURT</span>
              <span style={{ fontSize: 11, fontWeight: 700 }}>{Math.round(P.conf * 100)}% CONF</span>
            </div>
          </>) : (
            <div style={{ marginTop: 10 }}>
              <Big size={40} color={blue}>{P?.fit}</Big><div style={{ fontSize: 10, color: "#888", letterSpacing: "0.12em" }}>COURT FIT</div>
              <Big size={40} color={rust}>{P?.diff}</Big><div style={{ fontSize: 10, color: "#888", letterSpacing: "0.12em" }}>DIFFICULTY</div>
            </div>
          )}
          <div style={{ marginTop: 14, fontSize: 11, color: "#888", borderTop: "1px solid #2a2a2a", paddingTop: 8 }}>
            <span style={{ color: gold, fontWeight: 700 }}>COURT PAR</span> — what an average player was expected to do here. Nothing means anything without it.
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// DIRECTION C — COMPUTATIONAL ARTIFACT
// Interface as living system, designed-by-the-math, layered depth, motion-ready.
// =============================================================================
function StudyC({ model, sel, setSel }) {
  const P = G.players.find((p) => p.id === sel);
  const sg = model.sg;
  const bg = "#0B0D11", grid = "rgba(120,150,180,0.10)", fg = "#D6DEE8", gold = "#F0A92B", ember = "#FF5A1F", blue = "#3FA9F5", rust = "#C24A52";
  const mono = "ui-monospace,'SF Mono',Menlo,Consolas,monospace";
  const sans = "'Helvetica Neue',Helvetica,Arial,sans-serif";
  const Field = ({ label, value, c = fg }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: "1px solid rgba(120,150,180,0.12)" }}>
      <span style={{ fontFamily: mono, fontSize: 10, color: "#6E7A88", letterSpacing: "0.04em" }}>{label}</span>
      <span style={{ fontFamily: mono, fontSize: 12.5, color: c }}>{value}</span>
    </div>
  );
  return (
    <div style={{ background: bg, color: fg, fontFamily: sans, padding: "24px 30px", minHeight: 560,
      backgroundImage: "linear-gradient(rgba(120,150,180,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(120,150,180,0.05) 1px,transparent 1px)", backgroundSize: "26px 26px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: mono, fontSize: 10.5, color: "#6E7A88", letterSpacing: "0.18em", borderBottom: "1px solid rgba(120,150,180,0.18)", paddingBottom: 7 }}>
        <span>GINGEBALL :: COURT_HANDICAP</span><span>STUDY_C / COMPUTATIONAL_ARTIFACT</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 16, margin: "14px 0 4px" }}>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: "0.04em" }}>{G.matchup[0]} <span style={{ color: "#6E7A88" }}>×</span> {G.matchup[1]}</div>
        <div style={{ fontFamily: mono, fontSize: 11, color: gold }}>court.type = "{G.courtType}"</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.55fr 1fr", gap: 26, marginTop: 12 }}>
        {/* court as expected-value field */}
        <div>
          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={{ width: "100%" }}>
            <defs>
              <radialGradient id="evfield" cx="50%" cy="50%" r="55%"><stop offset="0%" stopColor="rgba(63,169,245,0.18)" /><stop offset="100%" stopColor="rgba(63,169,245,0)" /></radialGradient>
            </defs>
            {/* lens as a continuous EV field, not a block */}
            {P?.lens && Object.entries(P.lens.zones).map(([z, c]) => { const a = { paint: [150, VB.h * 0.5], top: [VB.w * 0.34, 90], wing: [VB.w * 0.72, 90], corner: [140, 70] }[z]; return a ? <circle key={z} cx={a[0]} cy={a[1]} r="120" fill={TINT[c]} opacity="0.12" /> : null; })}
            {/* court geometry — thin luminous computed lines */}
            <rect x="40" y="30" width={VB.w - 80} height={VB.h - 60} fill="none" stroke="rgba(120,150,180,0.4)" strokeWidth="1" />
            <line x1={VB.w / 2} y1="30" x2={VB.w / 2} y2={VB.h - 30} stroke="rgba(120,150,180,0.3)" strokeWidth="1" />
            <circle cx={VB.w / 2} cy={VB.h / 2} r="62" fill="url(#evfield)" stroke={gold} strokeWidth="1" />
            <circle cx="150" cy={VB.h / 2} r="46" fill="none" stroke="rgba(120,150,180,0.25)" strokeWidth="1" />
            <circle cx={VB.w - 150} cy={VB.h / 2} r="46" fill="none" stroke="rgba(120,150,180,0.25)" strokeWidth="1" />
            {/* possession marks along baseline — generative, motion-ready (Cooper) */}
            {G.poss.map((v, i) => <rect key={i} x={48 + i * ((VB.w - 96) / G.poss.length)} y={VB.h - 40} width="6" height={Math.max(1, v * 9)} fill={v > 1.14 ? ember : "rgba(120,150,180,0.4)"} transform={`translate(0 ${-v * 9})`} />)}
            {/* synergy hairlines with nodes */}
            {G.syn.map(([a, b, ty], i) => { const A = xy(G.players.find((p) => p.id === a).pos), B = xy(G.players.find((p) => p.id === b).pos); return <line key={i} x1={A[0]} y1={A[1]} x2={B[0]} y2={B[1]} stroke={ty === "off" ? blue : ty === "def" ? rust : ember} strokeWidth="1" opacity="0.55" strokeDasharray={ty === "haz" ? "1 5" : "0"} />; })}
            {G.players.map((p) => { const [cx, cy] = xy(p.pos); const on = p.id === sel; return (
              <g key={p.id} transform={`translate(${cx} ${cy})`} onClick={() => setSel(p.id)} style={{ cursor: "pointer" }}>
                {on && <circle r="15" fill="none" stroke={ember} strokeWidth="1" opacity="0.8" />}
                <circle r="5" fill={on ? ember : (p.t === "X" ? gold : blue)} />
                <text textAnchor="middle" y="-11" style={{ fontFamily: mono, fontSize: 9, fill: on ? ember : "#8a97a6" }}>{p.code}</text>
              </g> ); })}
            <text x={VB.w / 2} y={VB.h / 2 - 4} textAnchor="middle" style={{ fontFamily: mono, fontSize: 22, fill: fg }}>{model.imp.home}/{model.imp.away}</text>
            <text x={VB.w / 2} y={VB.h / 2 + 13} textAnchor="middle" style={{ fontFamily: mono, fontSize: 9, fill: gold }}>ppp {model.xPpp}·{model.yPpp}</text>
          </svg>
          <div style={{ fontFamily: mono, fontSize: 9.5, color: "#6E7A88", marginTop: 4 }}>// field intensity = court difficulty · baseline marks = possession ppp vs expected</div>
        </div>

        {/* computational readout */}
        <div>
          <div style={{ fontFamily: mono, fontSize: 10.5, color: ember, letterSpacing: "0.06em" }}>{P?.label}</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginTop: 2 }}>{P?.name}</div>
          <div style={{ fontFamily: mono, fontSize: 10.5, color: "#6E7A88", marginBottom: 8 }}>{P?.arch}</div>
          {P?.cond ? (<>
            <Field label="normal_par" value={sg.normalPar} /><Field label="market_par" value={sg.marketPar} c={gold} />
            <Field label="lineup_par" value={sg.lineupPar} c={ember} /><Field label="suppression" value={`${(sg.supp * 100).toFixed(1)}%`} c={rust} />
            <Field label="fit / diff" value={`${P.fit} / ${P.diff}`} /><Field label="par_per_100" value={sg.mp} c={gold} />
            <Field label="actual_per_100" value={sg.ac} /><Field label="court_beat_100" value={`+${sg.beatLineup}`} c={ember} />
          </>) : (<><Field label="court_fit" value={P.fit} c={blue} /><Field label="difficulty" value={P.diff} c={rust} /><Field label="label" value={P.label} /></>)}

          {P?.cond && (
            <div style={{ marginTop: 14, border: `1px solid ${ember}`, padding: "10px 12px", position: "relative", background: "rgba(255,90,31,0.04)" }}>
              <div style={{ fontFamily: mono, fontSize: 9.5, color: "#6E7A88", letterSpacing: "0.1em" }}>VERDICT</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.05em", color: fg }}>BEAT THE COURT</span>
                <span style={{ fontFamily: mono, fontSize: 24, color: ember }}>+{sg.beatLineup}</span>
              </div>
              <div style={{ fontFamily: mono, fontSize: 10, color: "#6E7A88", marginTop: 4 }}>conf={P.conf} · market_beat=+{sg.beatMarket}</div>
              {/* confidence as a thin computed bar */}
              <div style={{ height: 2, background: "rgba(120,150,180,0.2)", marginTop: 8 }}><div style={{ height: 2, width: `${P.conf * 100}%`, background: ember }} /></div>
            </div>
          )}
          <div style={{ marginTop: 12, fontFamily: mono, fontSize: 10, color: "#6E7A88", lineHeight: 1.5 }}>
            <span style={{ color: gold }}>court_par</span> := E[output | context]. expected output for an average player given tonight's court.
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SELECTOR
// =============================================================================
const DIRS = [
  { id: "A", name: "Swiss Basketball Intelligence", who: "Brockmann · Vignelli · Tufte · Sutnar", line: "The court is a precision instrument; the grid makes the math trustworthy." },
  { id: "B", name: "Editorial Basketball Map", who: "Scher · Carson · Brody · Kruger", line: "The court is a map of power; type and scale make the verdict hit." },
  { id: "C", name: "Computational Artifact", who: "Cooper · Greiman · Maeda · Saville", line: "The court is a living system; the design looks made by the math." },
];

export default function CourtHandicapDesignStudies() {
  const model = useModel();
  const [dir, setDir] = useState("C");
  const [sel, setSel] = useState("x1");
  return (
    <div style={{ fontFamily: "Helvetica,Arial,sans-serif", background: "#1A1A1A", minHeight: "100vh" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "12px 16px", background: "#111", borderBottom: "1px solid #333", alignItems: "center" }}>
        <span style={{ color: "#777", fontSize: 11, letterSpacing: "0.16em", marginRight: 6 }}>DESIGN STUDIES — PICK A DIRECTION</span>
        {DIRS.map((d) => (
          <button key={d.id} onClick={() => setDir(d.id)} style={{ cursor: "pointer", padding: "7px 12px", border: dir === d.id ? "1px solid #FF5A1F" : "1px solid #444",
            background: dir === d.id ? "rgba(255,90,31,0.12)" : "transparent", color: dir === d.id ? "#FF5A1F" : "#aaa", fontSize: 12, letterSpacing: "0.04em" }}>
            {d.id} · {d.name}
          </button>
        ))}
        <span style={{ marginLeft: "auto", color: "#777", fontSize: 11 }}>select any node to change the studied player</span>
      </div>
      <div style={{ padding: "8px 16px", background: "#141414", color: "#999", fontSize: 12 }}>
        <b style={{ color: "#ddd" }}>{DIRS.find((d) => d.id === dir).who}</b> — {DIRS.find((d) => d.id === dir).line}
      </div>
      {dir === "A" && <StudyA model={model} sel={sel} setSel={setSel} />}
      {dir === "B" && <StudyB model={model} sel={sel} setSel={setSel} />}
      {dir === "C" && <StudyC model={model} sel={sel} setSel={setSel} />}
    </div>
  );
}
