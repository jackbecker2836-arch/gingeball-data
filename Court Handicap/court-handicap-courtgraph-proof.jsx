import React, { useState, useMemo } from "react";

// =============================================================================
// COURT HANDICAP — COURTGRAPH  ·  "THE PROOF SURFACE"  (creative swing)
//
// Every court is a trap. Every great game is an escape. Gingeball shows the cut.
//
// The court is drawn BY HAND (authored irregular linework, grease-pencil double
// pass — not a turbulence filter faking grit). The market BURNS par into center.
// The lineup OVERWRITES it. The archetype CARVES pressure. The trapped player is
// swallowed by the smear; the one who beats it leaves a SCAR through the system.
// Every mark means something. Switch the player and the court is redrawn by hand.
//
// New product glyph: THE BREAKTHROUGH — a struck par line with a stroke cutting
// through it. Through = beat the court. Short = trapped.
//
// Same fake game + formula registry as Phases 1–2. Real Gingeball tokens.
// =============================================================================

const C = {
  void: "#09090B", pitch: "#0D0E14", chalk: "#F0EBE1", bone: "#968D82", fade: "#4A4744",
  ember: "#CF4E15", scoreboard: "#E49B18", blueprint: "#1B6BA8", bpText: "#5BA8D4",
  crimson: "#B32424", crText: "#CC6B6B", emberGlow: "rgba(207,78,21,0.12)", emberEdge: "rgba(207,78,21,0.28)",
};
const FD = "'Big Shoulders Display',Impact,'Arial Narrow',sans-serif";
const FA = "'Rubik Dirt',Impact,sans-serif";
const FU = "'Syne','Helvetica Neue',Arial,sans-serif";
const FM = "'Syne Mono','Courier New',monospace";

const rd = (x, d = 1) => Number(x.toFixed(d));
const MODEL = (() => {
  const imp = { home: (202 - -4) / 2, away: (202 + -4) / 2 };
  const mp = rd(24.5 / 66.5 * 100), lp = rd(23.1 / 66.5 * 100), ac = rd(29 / 67 * 100);
  return { imp, mp, lp, ac, beat: rd(ac - lp), beatMkt: rd(ac - mp) };
})();

// players + their lens config (how the court is redrawn for each)
const VB = { w: 960, h: 560 };
const PX = (p) => 60 + p[0] * (VB.w - 120), PY = (p) => 40 + p[1] * (VB.h - 80);
const PLAYERS = [
  { id: "x1", code: "X1", t: "X", name: "Star Scoring Guard", arch: "Pressure-Rim Midrange Assassin", label: "TRAP COURT", pos: [0.37, 0.5],
    mood: "trap", smear: [0.2, 0.5], overwrite: true, scar: true, beat: MODEL.beat, conf: "medium",
    arrows: [{ to: [0.2, 0.5], from: [0.34, 0.5] }, { to: [0.37, 0.27], from: [0.5, 0.16] }] },
  { id: "x2", code: "X2", t: "X", name: "Secondary Wing Creator", arch: "Two-Way Wing Engine", label: "NEUTRAL", pos: [0.3, 0.24], mood: "neutral", conf: "medium" },
  { id: "x3", code: "X3", t: "X", name: "3-and-D Wing", arch: "Wing-Stopper Spacing Blade", label: "CONNECTOR WINDOW", pos: [0.1, 0.15], mood: "relief", relief: [0.1, 0.15], conf: "low" },
  { id: "x4", code: "X4", t: "X", name: "Non-Shooting Forward", arch: "Defensive Utility Forward", label: "ROLE", pos: [0.2, 0.82], mood: "neutral", conf: "low" },
  { id: "x5", code: "X5", t: "X", name: "Rim-Running Center", arch: "Lob-and-Glass Anchor", label: "ROLL", pos: [0.12, 0.52], mood: "neutral", conf: "low" },
  { id: "y4", code: "Y4", t: "Y", name: "Rim Protector", arch: "Paint-Wall Rim Protector", label: "RIM ANCHOR", pos: [0.88, 0.5],
    mood: "relief", relief: [0.86, 0.5], paintOpen: true, conf: "medium", arrows: [{ to: [0.97, 0.5], from: [0.86, 0.5] }, { to: [0.97, 0.18], from: [0.86, 0.28] }] },
  { id: "y1", code: "Y1", t: "Y", name: "Elite POA Stopper", arch: "Point-of-Attack Havoc Guard", label: "STOPPER", pos: [0.64, 0.5], mood: "neutral", conf: "medium" },
  { id: "y2", code: "Y2", t: "Y", name: "Big Wing Stopper", arch: "Physical 3-and-D Wing", label: "NEUTRAL", pos: [0.7, 0.24], mood: "neutral", conf: "medium" },
  { id: "y3", code: "Y3", t: "Y", name: "Switch Forward", arch: "Switchable Utility Forward", label: "SWITCH", pos: [0.86, 0.82], mood: "neutral", conf: "low" },
  { id: "y5", code: "Y5", t: "Y", name: "Low-Usage Spacer", arch: "Corner Spacer Connector", label: "CONNECTOR WINDOW", pos: [0.9, 0.18], mood: "relief", relief: [0.9, 0.18], conf: "low" },
];
const SYN = [["x1", "x5", "off"], ["x1", "x3", "off"], ["x1", "x4", "haz"], ["y1", "y4", "def"]];
const POSS = [1.42, 0, 1.18, 2.1, 0, 1.5, 0.92, 1.33, 0, 1.0, 1.66, 0, 0.84, 1.5, 1.1, 0, 1.3, 0];

// grease-pencil stroke — one path drawn twice (main + faint offset). Hand, not filter.
function Stroke({ d, color = C.chalk, w = 2, o = 1, dash }) {
  return (
    <>
      <path d={d} fill="none" stroke={color} strokeWidth={w} opacity={o} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dash} />
      <path d={d} fill="none" stroke={color} strokeWidth={w * 0.55} opacity={o * 0.4} strokeLinecap="round" transform="translate(0.8 1.1)" strokeDasharray={dash} />
    </>
  );
}
// THE BREAKTHROUGH MARK — par line struck, stroke cutting through (beat) or short (trapped)
function Breakthrough({ size = 30, beat = true, color = C.ember }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <path d="M 5 27 C 14 26, 26 28, 35 26" fill="none" stroke={C.bone} strokeWidth="2.4" strokeLinecap="round" />
      <path d={beat ? "M 11 36 C 17 24, 22 18, 31 5" : "M 13 36 C 16 33, 18 31, 20 29"} fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
      {beat && <path d="M 31 5 l -1.5 6 l 6 -2 z" fill={color} />}
    </svg>
  );
}

export default function CourtGraphProofSurface() {
  const [sel, setSel] = useState("x1");
  const P = PLAYERS.find((p) => p.id === sel);
  const cx = VB.w / 2, cy = VB.h / 2;

  // hand-authored court geometry (slightly irregular on purpose)
  const court = useMemo(() => ({
    bound: `M 62 44 C 320 40, 640 40, 898 45 C 902 200, 901 360, 897 516 C 640 520, 320 521, 63 515 C 59 360, 58 200, 62 44 Z`,
    mid: `M ${cx + 1} 46 C ${cx - 2} 200, ${cx + 3} 360, ${cx} 514`,
    keyL: `M 62 222 C 140 220, 200 223, 214 222 C 215 280, 214 338, 214 340 C 150 339, 100 341, 62 340`,
    keyR: `M 898 222 C 820 220, 760 223, 746 222 C 745 280, 746 338, 746 340 C 810 339, 860 341, 898 340`,
    arcL: `M 62 110 C 250 180, 252 384, 64 452`,
    arcR: `M 898 110 C 710 180, 708 384, 896 452`,
  }), [cx]);

  const node = (id) => PLAYERS.find((p) => p.id === id);
  return (
    <div style={{ background: C.pitch, minHeight: "100vh", color: C.chalk, fontFamily: FU, padding: "22px 20px 50px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Syne:wght@400;500;600;700;800&family=Syne+Mono&family=Rubik+Dirt&display=swap');
        *{box-sizing:border-box}@media(prefers-reduced-motion:reduce){*{transition:none!important}}
        .cg-node{transition:transform .3s cubic-bezier(.2,.7,.2,1)}`}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        {/* object header with the new mark */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <Breakthrough size={34} />
          <div>
            <div style={{ fontFamily: FM, fontSize: 10, letterSpacing: ".2em", color: C.ember }}>COURTGRAPH · THE PROOF SURFACE</div>
            <div style={{ fontFamily: FU, fontSize: 12, color: C.bone, fontStyle: "italic" }}>every court is a trap · every great game is an escape · Gingeball shows the cut</div>
          </div>
        </div>

        <div style={{ border: `1px solid rgba(255,255,255,0.08)`, background: C.void, position: "relative" }}>
          <svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={{ width: "100%", display: "block" }}>
            <defs>
              <radialGradient id="burn" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(228,155,24,0.55)" /><stop offset="40%" stopColor="rgba(207,78,21,0.28)" /><stop offset="100%" stopColor="rgba(207,78,21,0)" /></radialGradient>
              <radialGradient id="smear" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(179,36,36,0.55)" /><stop offset="100%" stopColor="rgba(179,36,36,0)" /></radialGradient>
              <radialGradient id="relief" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(27,107,168,0.4)" /><stop offset="100%" stopColor="rgba(27,107,168,0)" /></radialGradient>
              <filter id="soft"><feGaussianBlur stdDeviation="11" /></filter>
            </defs>

            {/* ghost verdict word — the headline force of this court */}
            <text x={VB.w - 36} y={cy + 92} textAnchor="end" style={{ fontFamily: FD, fontWeight: 900, fontSize: 250, fill: "transparent", stroke: "rgba(207,78,21,0.08)", strokeWidth: 1.5, letterSpacing: "-.05em", textTransform: "uppercase" }}>{P.label.split(" ")[0]}</text>

            {/* TRAP SMEAR (suppression) — wet paint closing in. Meaningful, not decorative. */}
            {P.smear && <ellipse cx={PX(P.smear)} cy={PY(P.smear)} rx="150" ry="118" fill="url(#smear)" filter="url(#soft)" />}
            {/* RELIEF — the court opens for this archetype */}
            {P.relief && <ellipse cx={PX(P.relief)} cy={PY(P.relief)} rx="150" ry="120" fill="url(#relief)" filter="url(#soft)" />}

            {/* hand-drawn court */}
            <Stroke d={court.bound} color={C.chalk} w={2.4} o={P.conf === "low" ? 0.55 : 0.78} dash={P.conf === "low" ? "2 5" : undefined} />
            <Stroke d={court.mid} w={1.8} o={0.5} />
            <Stroke d={court.keyL} w={1.8} o={0.6} />
            <Stroke d={court.keyR} w={1.8} o={0.6} />
            <Stroke d={court.arcL} w={1.6} o={0.4} />
            <Stroke d={court.arcR} w={1.6} o={0.4} />
            {/* rims */}
            <circle cx="92" cy={cy} r="9" fill="none" stroke={C.ember} strokeWidth="2" opacity="0.7" />
            <circle cx={VB.w - 92} cy={cy} r="9" fill="none" stroke={C.ember} strokeWidth="2" opacity="0.7" />

            {/* zone marks (grease pencil) */}
            {[["CREATION", cx - 6, 70], ["MATCHUP", VB.w * 0.74, 96], ["SPACING", 130, 64], ["RIM", 150, VB.h - 70]].map(([t, x, y]) => (
              <text key={t} x={x} y={y} textAnchor="middle" style={{ fontFamily: FM, fontSize: 9.5, letterSpacing: ".16em", fill: "rgba(150,141,130,0.5)" }}>{t}</text>
            ))}

            {/* MARKET BURN — the betting line stamped into center court */}
            <circle cx={cx} cy={cy} r="86" fill="url(#burn)" />
            <Stroke d={`M ${cx - 56} ${cy - 30} C ${cx - 20} ${cy - 60}, ${cx + 30} ${cy - 58}, ${cx + 56} ${cy - 28} C ${cx + 62} ${cy + 10}, ${cx + 40} ${cy + 50}, ${cx} ${cy + 56} C ${cx - 44} ${cy + 52}, ${cx - 64} ${cy + 14}, ${cx - 56} ${cy - 30} Z`} color={C.scoreboard} w={2} o={0.85} />
            <text x={cx} y={cy - 30} textAnchor="middle" style={{ fontFamily: FM, fontSize: 8.5, letterSpacing: ".24em", fill: C.scoreboard }}>MARKET BURN</text>
            <text x={cx} y={cy + 4} textAnchor="middle" style={{ fontFamily: FD, fontWeight: 900, fontSize: 42, fill: C.chalk, letterSpacing: "-.02em" }}>{MODEL.imp.home}·{MODEL.imp.away}</text>
            <text x={cx} y={cy + 26} textAnchor="middle" style={{ fontFamily: FM, fontSize: 9, fill: C.scoreboard }}>PAR STAMPED · O/U 202</text>

            {/* PAR OVERWRITE — the lineup changed the court (struck market par → ember lineup par) */}
            {P.overwrite && (
              <g transform={`translate(${cx - 10} 118)`}>
                <text style={{ fontFamily: FD, fontWeight: 800, fontSize: 26, fill: C.bone }}>24.5</text>
                <line x1="-4" y1="-9" x2="52" y2="-13" stroke={C.crimson} strokeWidth="2.4" strokeLinecap="round" />
                <text x="62" y="-2" style={{ fontFamily: FA, fontSize: 24, fill: C.ember }}>23.1</text>
                <text x="0" y="20" style={{ fontFamily: FM, fontSize: 8, letterSpacing: ".12em", fill: C.bone }}>LINEUP REWROTE PAR</text>
              </g>
            )}

            {/* PRESSURE ARROWS — carved toward (trap) or outward from (relief) the archetype */}
            {(P.arrows || []).map((a, i) => {
              const fx = PX(a.from), fy = PY(a.from), tx = PX(a.to), ty = PY(a.to);
              const col = P.mood === "relief" ? C.bpText : C.crimson;
              const ang = Math.atan2(ty - fy, tx - fx);
              const hx = tx - 12 * Math.cos(ang), hy = ty - 12 * Math.sin(ang);
              return (
                <g key={i}>
                  <Stroke d={`M ${fx} ${fy} C ${(fx + tx) / 2 + 6} ${(fy + ty) / 2 - 8}, ${tx} ${ty}, ${tx} ${ty}`} color={col} w={2.4} o={0.8} />
                  <path d={`M ${tx} ${ty} L ${hx + 7 * Math.sin(ang)} ${hy - 7 * Math.cos(ang)} L ${hx - 7 * Math.sin(ang)} ${hy + 7 * Math.cos(ang)} Z`} fill={col} opacity="0.85" />
                </g>
              );
            })}

            {/* lineup strings — tensioned; hazard frays */}
            {SYN.map(([a, b, ty], i) => {
              const A = node(a), B = node(b);
              const ax = PX(A.pos), ay = PY(A.pos), bx = PX(B.pos), by = PY(B.pos);
              const col = ty === "off" ? C.blueprint : ty === "def" ? C.crimson : C.ember;
              return <Stroke key={i} d={`M ${ax} ${ay} C ${(ax + bx) / 2} ${(ay + by) / 2 - 14}, ${(ax + bx) / 2} ${(ay + by) / 2 + 14}, ${bx} ${by}`} color={col} w={ty === "haz" ? 1.6 : 1.6} o={0.6} dash={ty === "haz" ? "1 8" : undefined} />;
            })}

            {/* PAR LINE + BREAKTHROUGH SCAR — the cut that means he beat the court */}
            {P.scar && (() => {
              const nx = PX(P.pos), ny = PY(P.pos);
              return (
                <g>
                  <line x1="120" y1={VB.h - 96} x2={VB.w - 120} y2={VB.h - 104} stroke={C.bone} strokeWidth="2" strokeDasharray="1 6" opacity="0.7" />
                  <text x="124" y={VB.h - 102} style={{ fontFamily: FM, fontSize: 8.5, letterSpacing: ".14em", fill: C.bone }}>PAR LINE</text>
                  <path d={`M ${nx - 6} ${ny + 18} C ${nx + 8} ${ny + 70}, ${nx + 30} ${VB.h - 120}, ${nx + 64} ${VB.h - 150}`} fill="none" stroke={C.ember} strokeWidth="5" strokeLinecap="round" />
                  <path d={`M ${nx - 6} ${ny + 18} C ${nx + 8} ${ny + 70}, ${nx + 30} ${VB.h - 120}, ${nx + 64} ${VB.h - 150}`} fill="none" stroke={C.scoreboard} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" />
                  <text x={nx + 70} y={VB.h - 150} style={{ fontFamily: FA, fontSize: 16, fill: C.ember }}>+{P.beat}</text>
                </g>
              );
            })()}

            {/* players */}
            {PLAYERS.map((p) => {
              const x = PX(p.pos), y = PY(p.pos), on = p.id === sel, tc = p.t === "X" ? C.scoreboard : C.bpText;
              return (
                <g key={p.id} className="cg-node" transform={`translate(${x} ${y})`} onClick={() => setSel(p.id)} style={{ cursor: "pointer" }}>
                  {on && <rect x="-18" y="-13" width="36" height="26" fill="none" stroke={C.ember} strokeWidth="2.2" />}
                  <rect x="-15" y="-11" width="30" height="22" fill={on ? C.emberGlow : C.void} stroke={on ? C.ember : tc} strokeWidth="1.2" />
                  <text textAnchor="middle" y="4.5" style={{ fontFamily: FM, fontSize: 10, fill: on ? C.ember : C.chalk }}>{p.code}</text>
                </g>
              );
            })}

            {/* POSSESSION TALLIES — proof struck along the baseline */}
            {POSS.map((v, i) => {
              const x = 124 + i * ((VB.w - 248) / POSS.length), beat = v > 1.14;
              return <line key={i} x1={x} y1={VB.h - 42} x2={x + 2} y2={VB.h - 42 - Math.max(3, v * 12)} stroke={beat ? C.ember : "rgba(150,141,130,0.4)"} strokeWidth="2.5" strokeLinecap="round" />;
            })}

            {/* formula ghost */}
            <text x="64" y={VB.h - 16} style={{ fontFamily: FA, fontSize: 12, fill: C.ember, opacity: 0.2, letterSpacing: ".03em", textTransform: "uppercase" }} transform={`rotate(-0.8 64 ${VB.h - 16})`}>par = base − env − matchup − lineup · beat = actual − par</text>
          </svg>

          {/* read-out strip */}
          <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, padding: "9px 14px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: FU, fontWeight: 700, fontSize: 13, color: C.chalk }}>{P.name}</span>
            <span style={{ fontFamily: FU, fontSize: 11, fontStyle: "italic", color: C.bone }}>{P.arch}</span>
            <span style={{ fontFamily: FM, fontSize: 10, letterSpacing: ".08em", color: P.mood === "trap" ? C.crText : P.mood === "relief" ? C.bpText : C.bone, border: `1px solid ${P.mood === "trap" ? C.crEdge || "rgba(179,36,36,0.32)" : "rgba(255,255,255,0.1)"}`, padding: "2px 8px" }}>{P.label}</span>
            {P.scar && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Breakthrough size={20} beat /><span style={{ fontFamily: FD, fontWeight: 900, fontSize: 18, color: C.ember }}>+{P.beat}</span></span>}
            <span style={{ marginLeft: "auto", fontFamily: FM, fontSize: 9, letterSpacing: ".1em", color: C.fade }}>select a node — the court is redrawn by hand</span>
          </div>
        </div>

        {/* legend — every mark means something */}
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginTop: 12, fontFamily: FM, fontSize: 9.5, color: C.bone, letterSpacing: ".04em" }}>
          {[["MARKET BURN", "the line stamped par into the floor", C.scoreboard],
            ["STRUCK PAR", "the lineup rewrote what the market set", C.ember],
            ["SMEAR", "difficulty closing in — suppression", C.crText],
            ["RELIEF", "the court opens for this archetype", C.bpText],
            ["FRAYED STRING", "spacing hazard / role conflict", C.ember],
            ["SCAR", "the cut through par — beat the court", C.ember]].map(([k, v, col]) => (
            <span key={k} style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ color: col, fontWeight: 700 }}>{k}</span><span style={{ color: C.fade }}>{v}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
