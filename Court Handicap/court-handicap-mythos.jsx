import React, { useState, useEffect, useRef } from "react";

// =============================================================================
// COURT HANDICAP — THE MYTHOS  ·  the four relics + the laws that govern them
//
// LAWS OF THE COURT (named legends, each a meaning — never decoration):
//   THE BURN        market gravity scorched into center court
//   THE SEAMS       the floor's stitching, pulled taut by the lineup (frays at conflict)
//   THE TRANSLATION the archetype warps the same court into trap or relief
//   THE TRAIL       possessions leave evidence along the baseline
//   THE SCAR        a player who beats the court cuts up through par
//   THE RESOLVE     confidence = how fully the court draws itself in
//   THE RULING      the verdict lands on the baseline as final judgment
//   THE BREAKTHROUGH the product glyph — a struck par line, cut through
//
// WET COURT type, wired as swappable CSS vars (Adobe kit swaps in 1 line/role).
// MarketHub type fixed: amber pulled back, values stamped, mono only where earned.
// Math + contracts untouched: 103·99 · par 23.1 · +8.6.
// =============================================================================

const C = {
  void: "#09090B", pitch: "#0D0E14", bench: "#1A1C28", woodgrain: "#2A1C0C",
  chalk: "#F0EBE1", bone: "#968D82", fade: "#4A4744",
  ember: "#CF4E15", scoreboard: "#E49B18", blueprint: "#1B6BA8", bpText: "#5BA8D4",
  crimson: "#B32424", crText: "#CC6B6B", emberGlow: "rgba(207,78,21,0.12)", emberEdge: "rgba(207,78,21,0.28)",
};
const FONTS = {
  "--f-title": "'Bricolage Grotesque',sans-serif",
  "--f-num": "'Anton',Impact,sans-serif",
  "--f-serif": "'Fraunces',Georgia,serif",
  "--f-label": "'Rubik Spray Paint',sans-serif",
  "--f-diff": "'Rubik Wet Paint',sans-serif",
  "--f-mono": "'Space Mono',monospace",
  "--f-annot": "'Caveat',cursive",
  "--f-stamp": "'Rubik Dirt',sans-serif",
  "--f-ui": "'Bricolage Grotesque',sans-serif",
};

const rd = (x, d = 1) => Number(x.toFixed(d));
const M = (() => {
  const imp = { home: (202 - -4) / 2, away: (202 + -4) / 2 };
  const mp = rd(24.5 / 66.5 * 100), lp = rd(23.1 / 66.5 * 100), ac = rd(29 / 67 * 100);
  return { imp, mp, lp, ac, beat: rd(ac - lp), beatMkt: rd(ac - mp), normalPar: 27.5, marketPar: 24.5, lineupPar: 23.1, actual: 29 };
})();

const VB = { w: 960, h: 560 };
const PX = (p) => 60 + p[0] * (VB.w - 120), PY = (p) => 40 + p[1] * (VB.h - 80);
const cx = VB.w / 2, cy = VB.h / 2;
const quadY = (y0, cyc, y1, t) => (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cyc + t * t * y1;

const PLAYERS = [
  { id: "x1", code: "X1", t: "X", name: "Star Scoring Guard", arch: "Pressure-Rim Midrange Assassin", label: "TRAP COURT", pos: [0.37, 0.5],
    mood: "trap", smear: [0.2, 0.5], scar: true, beat: M.beat, conf: "medium",
    arrows: [{ from: [0.34, 0.5], to: [0.2, 0.5] }, { from: [0.5, 0.18], to: [0.37, 0.3] }] },
  { id: "x2", code: "X2", t: "X", name: "Secondary Wing Creator", arch: "Two-Way Wing Engine", label: "NEUTRAL", pos: [0.3, 0.24], mood: "neutral", conf: "medium" },
  { id: "x3", code: "X3", t: "X", name: "3-and-D Wing", arch: "Wing-Stopper Spacing Blade", label: "OPEN COURT", pos: [0.1, 0.15], mood: "relief", relief: [0.1, 0.15], conf: "low" },
  { id: "x4", code: "X4", t: "X", name: "Non-Shooting Forward", arch: "Defensive Utility Forward", label: "ROLE", pos: [0.2, 0.82], mood: "neutral", conf: "low" },
  { id: "x5", code: "X5", t: "X", name: "Rim-Running Center", arch: "Lob-and-Glass Anchor", label: "ROLL", pos: [0.12, 0.52], mood: "neutral", conf: "low" },
  { id: "y4", code: "Y4", t: "Y", name: "Rim Protector", arch: "Paint-Wall Rim Protector", label: "DREAM COURT", pos: [0.88, 0.5],
    mood: "relief", relief: [0.86, 0.5], conf: "medium", arrows: [{ from: [0.86, 0.5], to: [0.97, 0.5] }, { from: [0.86, 0.3], to: [0.97, 0.18] }] },
  { id: "y1", code: "Y1", t: "Y", name: "Elite POA Stopper", arch: "Point-of-Attack Havoc Guard", label: "STOPPER", pos: [0.64, 0.5], mood: "neutral", conf: "medium" },
  { id: "y2", code: "Y2", t: "Y", name: "Big Wing Stopper", arch: "Physical 3-and-D Wing", label: "NEUTRAL", pos: [0.7, 0.24], mood: "neutral", conf: "medium" },
  { id: "y3", code: "Y3", t: "Y", name: "Switch Forward", arch: "Switchable Utility Forward", label: "SWITCH", pos: [0.86, 0.82], mood: "neutral", conf: "low" },
  { id: "y5", code: "Y5", t: "Y", name: "Low-Usage Spacer", arch: "Corner Spacer Connector", label: "OPEN COURT", pos: [0.9, 0.18], mood: "relief", relief: [0.9, 0.18], conf: "low" },
];
const SYN = [["x1", "x5", "off"], ["x1", "x3", "off"], ["x1", "x4", "haz"], ["y1", "y4", "def"]];
const POSS = [1.42, 0, 1.18, 2.1, 0, 1.5, 0.92, 1.33, 0, 1.0, 1.66, 0, 0.84, 1.5, 1.1, 0, 1.3, 0];

function Stroke({ d, color = C.chalk, w = 2, o = 1, dash, draw, delay = 0 }) {
  const ds = draw ? { pathLength: 1, strokeDasharray: 1, style: { animation: `cgDraw .7s ${delay}s ease both` } } : { strokeDasharray: dash };
  return (
    <>
      <path d={d} fill="none" stroke={color} strokeWidth={w} opacity={o} strokeLinecap="round" strokeLinejoin="round" {...ds} />
      {!draw && <path d={d} fill="none" stroke={color} strokeWidth={w * 0.5} opacity={o * 0.4} strokeLinecap="round" transform="translate(0.8 1.1)" strokeDasharray={dash} />}
    </>
  );
}
function Breakthrough({ size = 30, beat = true, color = C.ember }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }}>
      <path d="M 5 27 C 14 26, 26 28, 35 26" fill="none" stroke={C.bone} strokeWidth="2.4" strokeLinecap="round" />
      <path d={beat ? "M 11 36 C 17 24, 22 18, 31 5" : "M 13 36 C 16 33, 18 31, 20 29"} fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
      {beat && <path d="M 31 5 l -1.5 6 l 6 -2 z" fill={color} />}
    </svg>
  );
}
const Micro = ({ children, c = C.fade }) => <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: c }}>{children}</span>;
const LawTag = ({ children }) => <span style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".18em", color: C.ember, border: `1px solid ${C.emberEdge}`, padding: "2px 7px", textTransform: "uppercase" }}>{children}</span>;

const ACTS = ["MARKET", "LINEUP", "ARCHETYPE", "PROOF", "VERDICT"];

// =============================================================================
// COURTGRAPH — the relic. THE SEAMS pull, THE SCAR cuts, it plays its genesis.
// =============================================================================
function CourtGraph({ sel, setSel }) {
  const P = PLAYERS.find((p) => p.id === sel);
  const [act, setAct] = useState(5);
  const timers = useRef([]);
  const node = (id) => PLAYERS.find((p) => p.id === id);
  const play = () => { timers.current.forEach(clearTimeout); timers.current = []; setAct(0); [1, 2, 3, 4, 5].forEach((n, i) => timers.current.push(setTimeout(() => setAct(n), 650 + i * 850))); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const lineOpacity = P.conf === "low" ? 0.5 : 0.8;
  const sketch = P.conf === "low" ? "4 7" : undefined;
  const team = PLAYERS.filter((p) => p.t === P.t);
  const massX = PX([team.reduce((s, p) => s + p.pos[0], 0) / 5, 0]);
  const massY = PY([0, team.reduce((s, p) => s + p.pos[1], 0) / 5]);

  // THE SEAMS — the floor's stitching, pulled toward the lineup's mass
  const seams = [0.26, 0.5, 0.74].map((sy) => {
    const y = PY([0, sy]); const cyc = y + (massY - y) * 0.34;
    const d = `M 60 ${y} Q ${massX} ${cyc} ${VB.w - 60} ${y}`;
    const ticks = [0.18, 0.34, 0.5, 0.66, 0.82].map((t) => { const tx = 60 + t * (VB.w - 120), ty = quadY(y, cyc, y, t); return { tx, ty }; });
    return { d, ticks };
  });

  const court = {
    bound: `M 62 44 C 320 40, 640 40, 898 45 C 902 200, 901 360, 897 516 C 640 520, 320 521, 63 515 C 59 360, 58 200, 62 44 Z`,
    mid: `M ${cx + 1} 46 C ${cx - 2} 200, ${cx + 3} 360, ${cx} 514`,
    keyL: `M 62 222 C 140 220, 200 223, 214 222 C 215 280, 214 338, 214 340 C 150 339, 100 341, 62 340`,
    keyR: `M 898 222 C 820 220, 760 223, 746 222 C 745 280, 746 338, 746 340 C 810 339, 860 341, 898 340`,
    arcL: `M 62 110 C 250 180, 252 384, 64 452`, arcR: `M 898 110 C 710 180, 708 384, 896 452`,
  };

  return (
    <div style={{ border: `1px solid rgba(255,255,255,0.08)`, background: C.void, position: "relative" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", borderBottom: `1px solid rgba(255,255,255,0.08)`, flexWrap: "wrap" }}>
        <button onClick={play} style={{ fontFamily: "var(--f-stamp)", fontSize: 14, letterSpacing: ".04em", color: C.ember, background: C.emberGlow, border: `1px solid ${C.emberEdge}`, padding: "5px 13px", cursor: "pointer", textTransform: "uppercase" }}>▶ play genesis</button>
        {ACTS.map((a, i) => (
          <button key={a} onClick={() => { timers.current.forEach(clearTimeout); setAct(i + 1); }}
            style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, letterSpacing: ".1em", padding: "5px 9px", cursor: "pointer", textTransform: "uppercase",
              border: `1px solid ${act === i + 1 ? C.emberEdge : "rgba(255,255,255,0.1)"}`, background: act === i + 1 ? C.emberGlow : "transparent", color: act >= i + 1 ? C.chalk : C.fade }}>{i + 1}·{a}</button>
        ))}
        <button onClick={() => { timers.current.forEach(clearTimeout); setAct(5); }} style={{ marginLeft: "auto", fontFamily: "var(--f-mono)", fontSize: 9.5, padding: "5px 9px", cursor: "pointer", color: C.bone, background: "transparent", border: `1px solid rgba(255,255,255,0.1)` }}>FULL</button>
      </div>

      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} style={{ width: "100%", display: "block" }}>
        <defs>
          <radialGradient id="burn" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(228,155,24,0.6)" /><stop offset="38%" stopColor="rgba(207,78,21,0.3)" /><stop offset="100%" stopColor="rgba(207,78,21,0)" /></radialGradient>
          <radialGradient id="smear" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(179,36,36,0.62)" /><stop offset="100%" stopColor="rgba(179,36,36,0)" /></radialGradient>
          <radialGradient id="relief" cx="50%" cy="50%" r="50%"><stop offset="0%" stopColor="rgba(27,107,168,0.44)" /><stop offset="100%" stopColor="rgba(27,107,168,0)" /></radialGradient>
          <filter id="soft"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>

        {act >= 3 && <text x={VB.w - 36} y={cy + 92} textAnchor="end" style={{ fontFamily: "var(--f-num)", fontSize: 240, fill: "transparent", stroke: "rgba(207,78,21,0.08)", strokeWidth: 1.5, letterSpacing: "-.03em", textTransform: "uppercase", animation: "cgUp .6s ease both" }}>{P.label.split(" ")[0]}</text>}

        {/* THE SEAMS — the floor's stitching, pulled by the lineup */}
        <g key={`seams-${P.t}`}>
          {seams.map((s, i) => (
            <g key={i} style={{ animation: act >= 2 ? "cgUp .6s ease both" : undefined }}>
              <path d={s.d} fill="none" stroke="rgba(240,235,225,0.13)" strokeWidth="1.2" />
              {s.ticks.map((tk, j) => <line key={j} x1={tk.tx} y1={tk.ty - 4} x2={tk.tx} y2={tk.ty + 4} stroke="rgba(240,235,225,0.13)" strokeWidth="1" />)}
            </g>
          ))}
        </g>

        {/* hand-drawn court — THE RESOLVE: completeness = confidence */}
        <g key={`court-${act === 5 ? "f" : "l"}-${P.conf}`}>
          <Stroke d={court.bound} color={C.chalk} w={2.4} o={lineOpacity} dash={sketch} draw={act <= 1} />
          <Stroke d={court.mid} w={1.8} o={0.5} dash={sketch} draw={act <= 1} delay={0.1} />
          <Stroke d={court.keyL} w={1.8} o={0.6} dash={sketch} draw={act <= 1} delay={0.15} />
          <Stroke d={court.keyR} w={1.8} o={0.6} dash={sketch} draw={act <= 1} delay={0.15} />
          <Stroke d={court.arcL} w={1.6} o={0.4} dash={sketch} draw={act <= 1} delay={0.2} />
          <Stroke d={court.arcR} w={1.6} o={0.4} dash={sketch} draw={act <= 1} delay={0.2} />
        </g>
        <circle cx="92" cy={cy} r="9" fill="none" stroke={C.ember} strokeWidth="2" opacity="0.7" />
        <circle cx={VB.w - 92} cy={cy} r="9" fill="none" stroke={C.ember} strokeWidth="2" opacity="0.7" />
        {[["CREATION", cx - 6, 70], ["MATCHUP", VB.w * 0.74, 96], ["SPACING", 132, 64], ["RIM", 150, VB.h - 70]].map(([t, x, y]) => (
          <text key={t} x={x} y={y} textAnchor="middle" style={{ fontFamily: "var(--f-label)", fontSize: 14, letterSpacing: ".02em", fill: "rgba(150,141,130,0.55)" }}>{t}</text>
        ))}

        {/* ACT 1 — THE BURN */}
        {act >= 1 && (
          <g key={`burn-${act >= 1}`} style={{ animation: "cgPop .6s ease both", transformOrigin: `${cx}px ${cy}px` }}>
            <circle cx={cx} cy={cy} r="88" fill="url(#burn)" />
            <text x={cx} y={cy - 32} textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".24em", fill: C.scoreboard }}>THE BURN</text>
            <text x={cx} y={cy + 8} textAnchor="middle" style={{ fontFamily: "var(--f-num)", fontSize: 48, fill: C.chalk, letterSpacing: "-.01em" }}>{M.imp.home}·{M.imp.away}</text>
            <text x={cx} y={cy + 28} textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 9, fill: C.bone }}>PAR STAMPED · O/U 202</text>
          </g>
        )}

        {/* ACT 2 — THE SEAMS pulled between players + overwrite */}
        {act >= 2 && (
          <g key={`lineup-${act >= 2}`}>
            {SYN.map(([a, b, ty], i) => {
              const A = node(a), B = node(b), ax = PX(A.pos), ay = PY(A.pos), bx = PX(B.pos), by = PY(B.pos);
              const mx = (ax + bx) / 2, my = (ay + by) / 2;
              const col = ty === "off" ? C.blueprint : ty === "def" ? C.crimson : C.ember;
              return (
                <g key={i}>
                  <Stroke d={`M ${ax} ${ay} Q ${mx} ${my - 16} ${bx} ${by}`} color={col} w={1.6} o={0.62} dash={ty === "haz" ? "1 8" : undefined} draw delay={i * 0.08} />
                  {ty !== "haz" && <line x1={mx - 4} y1={my - 12} x2={mx + 4} y2={my - 12} stroke={col} strokeWidth="1.4" opacity="0.6" />}
                </g>
              );
            })}
            <g transform={`translate(${cx - 14} 116)`} style={{ animation: "cgUp .5s .3s ease both" }}>
              <text style={{ fontFamily: "var(--f-num)", fontSize: 24, fill: C.bone }}>24.5</text>
              <line x1="-4" y1="-8" x2="48" y2="-12" stroke={C.crimson} strokeWidth="2.6" strokeLinecap="round" />
              <text x="58" y="2" style={{ fontFamily: "var(--f-annot)", fontSize: 30, fill: C.ember }}>23.1</text>
              <text x="0" y="20" style={{ fontFamily: "var(--f-mono)", fontSize: 8, letterSpacing: ".1em", fill: C.bone }}>LINEUP REWROTE PAR</text>
            </g>
          </g>
        )}

        {/* ACT 3 — THE TRANSLATION: warp into trap / relief; brush density = pressure */}
        {act >= 3 && (
          <g key={`arch-${sel}`}>
            {P.smear && <ellipse cx={PX(P.smear)} cy={PY(P.smear)} rx="152" ry="120" fill="url(#smear)" filter="url(#soft)" style={{ animation: "cgPop .6s ease both" }} />}
            {P.relief && <ellipse cx={PX(P.relief)} cy={PY(P.relief)} rx="152" ry="122" fill="url(#relief)" filter="url(#soft)" style={{ animation: "cgPop .6s ease both" }} />}
            {P.smear && <text x={PX(P.smear)} y={PY(P.smear) + 8} textAnchor="middle" style={{ fontFamily: "var(--f-diff)", fontSize: 30, fill: C.crText, opacity: 0.9, animation: "cgUp .6s .2s ease both" }}>PRESSURE</text>}
            {(P.arrows || []).map((a, i) => {
              const fx = PX(a.from), fy = PY(a.from), tx = PX(a.to), ty = PY(a.to), col = P.mood === "relief" ? C.bpText : C.crimson;
              const ang = Math.atan2(ty - fy, tx - fx), hx = tx - 12 * Math.cos(ang), hy = ty - 12 * Math.sin(ang);
              return (
                <g key={i} style={{ animation: `cgUp .5s ${0.2 + i * 0.1}s ease both` }}>
                  <Stroke d={`M ${fx} ${fy} C ${(fx + tx) / 2 + 6} ${(fy + ty) / 2 - 8}, ${tx} ${ty}, ${tx} ${ty}`} color={col} w={2.4} o={0.85} draw delay={0.2 + i * 0.1} />
                  <path d={`M ${tx} ${ty} L ${hx + 7 * Math.sin(ang)} ${hy - 7 * Math.cos(ang)} L ${hx - 7 * Math.sin(ang)} ${hy + 7 * Math.cos(ang)} Z`} fill={col} opacity="0.85" />
                </g>
              );
            })}
          </g>
        )}

        {/* ACT 4 — THE TRAIL: possession evidence */}
        {act >= 4 && (
          <g key={`poss-${act >= 4}`}>
            {POSS.map((v, i) => {
              const x = 124 + i * ((VB.w - 248) / POSS.length), beat = v > 1.14;
              return <line key={i} x1={x} y1={VB.h - 42} x2={x + (beat ? 3 : 1)} y2={VB.h - 42 - Math.max(3, v * 12)} stroke={beat ? C.ember : "rgba(150,141,130,0.4)"} strokeWidth={beat ? 3 : 2} strokeLinecap="round" style={{ animation: `cgUp .25s ${i * 0.04}s ease both` }} />;
            })}
          </g>
        )}

        {/* ACT 5 — THE SCAR: cut through par, built from the proof */}
        {act >= 5 && P.scar && (() => {
          const nx = PX(P.pos), ny = PY(P.pos);
          const scarD = `M ${nx - 6} ${VB.h - 60} C ${nx + 4} ${ny + 90}, ${nx + 24} ${ny + 30}, ${nx + 64} ${ny - 110}`;
          return (
            <g key={`scar-${sel}`}>
              <line x1="120" y1={VB.h - 96} x2={VB.w - 120} y2={VB.h - 104} stroke={C.bone} strokeWidth="2" strokeDasharray="1 6" opacity="0.7" />
              <text x="124" y={VB.h - 102} style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".14em", fill: C.bone }}>PAR LINE</text>
              <path d={scarD} fill="none" stroke={C.ember} strokeWidth="5" strokeLinecap="round" pathLength="1" strokeDasharray="1" style={{ animation: "cgDraw .8s ease both" }} />
              <path d={scarD} fill="none" stroke={C.scoreboard} strokeWidth="1.6" strokeLinecap="round" opacity="0.7" pathLength="1" strokeDasharray="1" style={{ animation: "cgDraw .8s ease both" }} />
              <text x={nx + 72} y={ny - 110} style={{ fontFamily: "var(--f-num)", fontSize: 24, fill: C.ember, animation: "cgUp .4s .6s ease both" }}>+{P.beat}</text>
            </g>
          );
        })()}

        {/* players — fractured edge = role conflict */}
        {PLAYERS.map((p) => {
          const x = PX(p.pos), y = PY(p.pos), on = p.id === sel, tc = p.t === "X" ? C.scoreboard : C.bpText;
          const hazard = SYN.some(([a, b, t]) => t === "haz" && (a === p.id || b === p.id));
          return (
            <g key={p.id} transform={`translate(${x} ${y})`} onClick={() => setSel(p.id)} style={{ cursor: "pointer" }}>
              {on && <rect x="-18" y="-13" width="36" height="26" fill="none" stroke={C.ember} strokeWidth="2.2" />}
              <rect x="-15" y="-11" width="30" height="22" fill={on ? C.emberGlow : C.void} stroke={on ? C.ember : tc} strokeWidth="1.2" strokeDasharray={hazard ? "3 3" : undefined} />
              <text textAnchor="middle" y="4.5" style={{ fontFamily: "var(--f-mono)", fontSize: 10, fill: on ? C.ember : C.chalk }}>{p.code}</text>
            </g>
          );
        })}

        <text x="64" y={VB.h - 16} style={{ fontFamily: "var(--f-stamp)", fontSize: 12, fill: C.ember, opacity: 0.2, letterSpacing: ".02em", textTransform: "uppercase" }} transform={`rotate(-0.8 64 ${VB.h - 16})`}>par = base − env − matchup − lineup · beat = actual − par</text>
      </svg>

      <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, padding: "9px 14px", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 14, color: C.chalk }}>{P.name}</span>
        <span style={{ fontFamily: "var(--f-annot)", fontSize: 16, color: C.bone }}>{P.arch}</span>
        <span style={{ fontFamily: "var(--f-label)", fontSize: 14, color: P.mood === "trap" ? C.crText : P.mood === "relief" ? C.bpText : C.bone }}>{P.label}</span>
        {P.scar && <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Breakthrough size={20} /><span style={{ fontFamily: "var(--f-num)", fontSize: 18, color: C.ember }}>+{P.beat}</span></span>}
        <span style={{ marginLeft: "auto" }}><Micro>select a node — the seams pull, the court redraws · ▶ to watch it build</Micro></span>
      </div>
    </div>
  );
}

// ---- MARKETHUB — THE BURN (type fixed: amber pulled back, values stamped) ---
function MarketHub() {
  const reads = [["EXP POSS", "88.6", false], ["MKT PPP", "1.163·1.117", false], ["PAR", "set for the night", true]];
  return (
    <div style={{ border: `1px solid rgba(255,255,255,0.08)`, background: C.void, padding: "20px 22px", position: "relative", overflow: "hidden", minHeight: 156 }}>
      <svg viewBox="0 0 600 156" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid slice">
        <defs><radialGradient id="mhb" cx="30%" cy="50%" r="55%"><stop offset="0%" stopColor="rgba(228,155,24,0.42)" /><stop offset="44%" stopColor="rgba(207,78,21,0.2)" /><stop offset="100%" stopColor="rgba(207,78,21,0)" /></radialGradient></defs>
        <ellipse cx="178" cy="78" rx="150" ry="96" fill="url(#mhb)" />
        <path d="M 88 46 C 150 30, 236 32, 282 52 C 296 94, 246 120, 184 122 C 116 118, 72 92, 88 46 Z" fill="none" stroke={C.scoreboard} strokeWidth="1.3" opacity="0.4" />
      </svg>
      <div style={{ position: "absolute", top: 12, right: 16 }}><LawTag>THE BURN</LawTag></div>
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone }}>the line stamped reality</div>
          <div style={{ fontFamily: "var(--f-num)", fontSize: 68, color: C.chalk, lineHeight: 0.85, marginTop: 2 }}>103<span style={{ color: C.scoreboard }}>·</span>99</div>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 12, color: C.bone, marginTop: 4 }}>X −4 / 202 O/U <span style={{ color: C.fade }}>—</span> the favorite burns hotter</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, textAlign: "right" }}>
          {reads.map(([k, v, soft]) => (
            <div key={k}>
              <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.fade }}>{k}</div>
              <div style={{ fontFamily: soft ? "var(--f-serif)" : "var(--f-num)", fontStyle: soft ? "italic" : "normal", fontSize: soft ? 22 : 26, color: soft ? C.bone : C.chalk, lineHeight: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- PLAYER COURT CONDITIONS — THE TRANSLATION ------------------------------
function Conditions() {
  const lo = 20, hi = 31, h = 150;
  const Y = (v) => h - ((v - lo) / (hi - lo)) * h;
  const rows = [["NORMAL", M.normalPar, C.bone, false], ["MARKET", M.marketPar, C.scoreboard, true], ["LINEUP", M.lineupPar, C.crText, false], ["ACTUAL", M.actual, C.ember, false]];
  return (
    <div style={{ background: C.woodgrain, border: "1px solid rgba(255,255,255,.1)", padding: "16px 18px", position: "relative", overflow: "hidden", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(255,255,255,.022) 23px,rgba(255,255,255,.022) 24px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 12, right: 14 }}><LawTag>THE TRANSLATION</LawTag></div>
      <div style={{ position: "relative", marginBottom: 10 }}>
        <div style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: C.chalk, lineHeight: 0.95, maxWidth: 220 }}>Star Scoring Guard</div>
        <span style={{ fontFamily: "var(--f-label)", fontSize: 15, color: C.crText, display: "inline-block", marginTop: 4 }}>TRAP COURT</span>
      </div>
      <div style={{ position: "absolute", right: 16, top: 44, textAlign: "right" }}><Micro c={C.bone}>beat /100</Micro><div style={{ fontFamily: "var(--f-num)", fontSize: 46, color: C.ember, lineHeight: 0.9 }}>+{M.beat}</div></div>
      <svg viewBox="0 0 360 172" style={{ width: "100%", position: "relative" }}>
        <line x1="20" y1={Y(M.lineupPar)} x2="320" y2={Y(M.lineupPar)} stroke={C.crText} strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
        <text x="322" y={Y(M.lineupPar) + 3} style={{ fontFamily: "var(--f-mono)", fontSize: 8, fill: C.crText }}>PAR</text>
        {rows.map(([k, v, col, struck], i) => {
          const x = 34 + i * 92;
          return (
            <g key={k}>
              <line x1={x} y1={h} x2={x} y2={Y(v)} stroke={col} strokeWidth={k === "ACTUAL" ? 4 : 2} strokeLinecap="round" opacity={k === "ACTUAL" ? 1 : 0.75} />
              <circle cx={x} cy={Y(v)} r={k === "ACTUAL" ? 5 : 3.5} fill={col} />
              <text x={x} y={Y(v) - 10} textAnchor="middle" style={{ fontFamily: "var(--f-num)", fontSize: 18, fill: col }}>{v}</text>
              {struck && <line x1={x - 15} y1={Y(v) - 15} x2={x + 15} y2={Y(v) - 19} stroke={C.crimson} strokeWidth="2.4" strokeLinecap="round" />}
              <text x={x} y={h + 16} textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 8, letterSpacing: ".04em", fill: C.bone }}>{k}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ position: "relative", display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
        {[["FIT 38", C.bpText], ["DIFF 86", C.crText], ["SLOPE HIGH", "#B4C472"], ["SUPP 11%", C.scoreboard]].map(([t, col]) => (
          <span key={t} style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, letterSpacing: ".08em", color: col, border: `1px solid ${col}44`, padding: "2px 7px" }}>{t}</span>
        ))}
        <span style={{ marginLeft: "auto", fontFamily: "var(--f-mono)", fontSize: 9, color: C.bone }}>43.3 vs 34.7 /100 · 74% conf</span>
      </div>
    </div>
  );
}

// ---- OUTCOME VERDICT — THE RULING -------------------------------------------
function Verdict() {
  return (
    <div style={{ background: C.void, borderTop: `3px solid ${C.ember}`, border: `1px solid ${C.emberEdge}`, padding: "18px 22px", position: "relative", overflow: "hidden", height: "100%" }}>
      <span style={{ position: "absolute", right: -10, bottom: -50, fontFamily: "var(--f-num)", fontSize: 200, color: "transparent", WebkitTextStroke: "1.5px rgba(207,78,21,0.08)" }}>+{M.beat}</span>
      <div style={{ position: "absolute", top: 12, right: 16 }}><LawTag>THE RULING</LawTag></div>
      <Micro c={C.bone}>the market set the trap — the player escaped it</Micro>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 4, position: "relative" }}>
        <Breakthrough size={52} />
        <div style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 38, color: C.ember, lineHeight: 0.85 }}>Beat the Court</div>
        <span style={{ fontFamily: "var(--f-num)", fontSize: 96, color: C.chalk, lineHeight: 0.75, marginLeft: "auto" }}>+{M.beat}</span>
      </div>
      <div style={{ borderTop: `2px solid ${C.ember}`, marginTop: 12, paddingTop: 8, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, position: "relative" }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: C.bone }}>actual <span style={{ color: C.chalk }}>43.3</span> − lineup par <span style={{ color: C.crText }}>34.7</span> /100 · mkt beat +{M.beatMkt}</span>
        <span style={{ fontFamily: "var(--f-stamp)", fontSize: 13, letterSpacing: ".04em", textTransform: "uppercase", color: C.ember }}>Gingeball has ruled · 74%</span>
      </div>
    </div>
  );
}

// ---- THE MYTHOS -------------------------------------------------------------
export default function CourtHandicapMythos() {
  const [sel, setSel] = useState("x1");
  const laws = [["THE BURN", "market gravity"], ["THE SEAMS", "lineup tension"], ["THE TRANSLATION", "archetype warp"], ["THE TRAIL", "possession proof"], ["THE SCAR", "the court beaten"], ["THE RESOLVE", "confidence"], ["THE RULING", "the verdict"]];
  return (
    <div style={{ ...FONTS, background: C.pitch, minHeight: "100vh", color: C.chalk, fontFamily: "var(--f-ui)", padding: "22px 20px 50px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Anton&family=Fraunces:ital,opsz,wght@1,9..144,600&family=Rubik+Spray+Paint&family=Rubik+Wet+Paint&family=Rubik+Dirt&family=Space+Mono:wght@400;700&family=Caveat:wght@600;700&display=swap');
        *{box-sizing:border-box}
        @keyframes cgDraw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
        @keyframes cgPop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
        @keyframes cgUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @media(prefers-reduced-motion:reduce){*{animation:none!important}}`}</style>
      <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Breakthrough size={36} />
          <div>
            <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: ".2em", color: C.ember }}>COURT HANDICAP · THE MYTHOS</div>
            <div style={{ fontFamily: "var(--f-annot)", fontSize: 18, color: C.bone }}>every court is a trap — every great game is an escape — Gingeball shows the cut</div>
          </div>
        </div>

        {/* LAWS OF THE COURT — the mythology, named */}
        <div style={{ border: `1px solid rgba(255,255,255,0.07)`, background: C.void, padding: "10px 14px", display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontFamily: "var(--f-stamp)", fontSize: 12, color: C.ember, letterSpacing: ".03em", textTransform: "uppercase" }}>Laws of the Court</span>
          {laws.map(([k, v]) => (
            <span key={k} style={{ display: "inline-flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, letterSpacing: ".08em", color: C.chalk }}>{k}</span>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.fade }}>{v}</span>
            </span>
          ))}
          <span style={{ marginLeft: "auto", display: "inline-flex", gap: 6, alignItems: "center" }}><Breakthrough size={18} /><span style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.ember }}>THE BREAKTHROUGH</span></span>
        </div>

        <div><div style={{ marginBottom: 6 }}><Micro c={C.ember}>01 · COURTGRAPH</Micro> <Micro>— the relic · it plays its own genesis</Micro></div><CourtGraph sel={sel} setSel={setSel} /></div>
        <div><Micro c={C.ember}>02 · MARKETHUB</Micro><div style={{ marginTop: 6 }}><MarketHub /></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "stretch" }}>
          <div><Micro c={C.ember}>03 · PLAYER COURT CONDITIONS</Micro><div style={{ marginTop: 6, height: "calc(100% - 22px)" }}><Conditions /></div></div>
          <div><Micro c={C.ember}>04 · OUTCOME VERDICT</Micro><div style={{ marginTop: 6, height: "calc(100% - 22px)" }}><Verdict /></div></div>
        </div>
      </div>
    </div>
  );
}
