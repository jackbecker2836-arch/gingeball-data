import React, { useState, useMemo, useEffect } from "react";

// =============================================================================
// GINGEBALL COURT HANDICAP — PHASE 2B PROTOTYPE  (visual authenticity pass)
//
// Same fixture, same formula registry, same component contracts as Phase 2.
// ONLY the skin changes: from generic sports-tech to a hand-built basketball-
// intelligence dossier — warm ink board, hand-struck chalk lines, molten gold
// market, ginger-ember verdicts, electric-blue creation, parchment report cards,
// a distressed inked stamp. Grounded in the confirmed Gingeball brand world.
// See docs/COURT_HANDICAP_VISUAL_CANON.md. (v1 file is the deprecated structural proof.)
// =============================================================================

// ---- FORMULA REGISTRY (mirror of lib/formula-registry.ts) -------------------
const r = (x, d = 3) => Number(x.toFixed(d));
const LEAGUE_AVG_PPP = 1.14;
const F = {
  impliedTeamTotals: ({ total, homeSpread }) => { const m = -homeSpread; return { home: r((total + m) / 2, 2), away: r((total - m) / 2, 2) }; },
  expectedPossessions: ({ total, ppp = LEAGUE_AVG_PPP }) => r(total / (2 * ppp), 1),
  marketPpp: ({ impliedTeamTotal, expectedPossessions }) => r(impliedTeamTotal / expectedPossessions, 4),
  propSuppression: ({ tonightProp, normalProp }) => r(1 - tonightProp / normalProp, 4),
  parPer100: ({ propLine, poss }) => r((propLine / poss) * 100, 1),
  actualPer100: ({ actualStat, poss }) => r((actualStat / poss) * 100, 1),
  beatPer100: ({ actualPer100, parPer100 }) => r(actualPer100 - parPer100, 1),
  courtTilt: ({ marketSpread, lineupAdjustedSpread, scale = 0.6, cap = 6 }) => {
    const c = (v) => Math.max(-cap, Math.min(cap, v));
    return { baseTilt: r(c(marketSpread * scale), 2), tiltDeg: r(c(lineupAdjustedSpread * scale), 2), tiltDelta: r(c(lineupAdjustedSpread * scale) - c(marketSpread * scale), 2) };
  },
};

// ---- GINGEBALL PALETTE (see canon) ------------------------------------------
const C = {
  ink: "#0D0A07", ink2: "#15110B", board: "#120D08",
  paper: "#E9DEC6", paperEdge: "#C9B891", paperShade: "#DCCFAE",
  gold: "#F0A92B", ember: "#FF5A1F", rust: "#B5371A",
  blue: "#2E9BE6", chalk: "#E7DCC2", chalkDim: "rgba(231,220,194,0.34)",
  chalkFaint: "rgba(231,220,194,0.13)", ash: "#8A7E66", inkText: "#221A10",
};
const DISPLAY = "'Big Shoulders Display','Arial Narrow',sans-serif";
const BODY = "'Syne',system-ui,sans-serif";
const MONO = "'Syne Mono',ui-monospace,monospace";
const STAMP = "'Rubik Dirt','Big Shoulders Display',sans-serif";

// ---- FIXTURE (mirror of fixtures/court-handicap/fake-game.ts) ----------------
const FAKE_GAME = {
  game: { id: "fake-game", label: "TONIGHT'S COURT", matchup: "TEAM X · TEAM Y", courtType: "Low-Total Defensive Grind" },
  market: { homeSpread: -4, total: 202 },
  lineup: { adjustedSpread: -4.4, adjustedTotal: 194.2 },
  teams: { X: { name: "Team X" }, Y: { name: "Team Y" } },
  players: [
    { id: "x1", team: "X", name: "Star Scoring Guard", archetype: "Pressure-Rim Midrange Assassin", archCode: "scoring_guard",
      role: "Primary on-ball creator", minutes: 36, fit: 38, difficulty: 86, slope: "High", confidence: 0.74,
      label: "Trap Court / Plus-Handicap Test", pos: { x: 360, y: 300 }, rot: -3,
      conditions: { normalPar: 27.5, marketPar: 24.5, lineupPar: 23.1, actual: 29, expPoss: 66.5, actPoss: 67 },
      lens: { tint: C.rust, headline: "TRAP COURT",
        highlights: [{ zone: "paint", color: C.rust }, { zone: "top", color: C.ember }, { zone: "wing", color: C.rust }],
        read: ["Market cut his points par 27.5 → 24.5 (10.9% suppression)", "Lineup shrinks par further to 23.1", "Court Fit 38 / Difficulty 86 — a Plus-Handicap Test"] } },
    { id: "x2", team: "X", name: "Secondary Wing Creator", archetype: "Two-Way Wing Engine", archCode: "wing_scorer", role: "Secondary creation", minutes: 33, fit: 61, difficulty: 58, confidence: 0.6, label: "Neutral Court", pos: { x: 300, y: 150 }, rot: 2 },
    { id: "x3", team: "X", name: "Low-Usage 3-and-D Wing", archetype: "Wing-Stopper Spacing Blade", archCode: "three_and_d_stopper", role: "Spacing + POA defense", minutes: 30, fit: 70, difficulty: 49, confidence: 0.55, label: "Connector Value Window", pos: { x: 132, y: 92 }, rot: -2,
      conditions: { roleClarity: "Medium / High", spacingValue: "Important", defenseAssignment: "High leverage", boxSensitivity: "Low" },
      lens: { tint: C.blue, headline: "CONNECTOR VALUE WINDOW", highlights: [{ zone: "corner", color: C.blue }, { zone: "wing", color: C.rust }],
        read: ["Box score will under-rate him", "Value is spacing gravity + a high-leverage defensive matchup", "Judged on role execution, not points"] } },
    { id: "x4", team: "X", name: "Non-Shooting Defensive Forward", archetype: "Defensive Utility Forward", archCode: "defensive_chaos", role: "Help defense / glass", minutes: 26, fit: 52, difficulty: 55, confidence: 0.5, label: "Role Court", pos: { x: 205, y: 442 }, rot: 3 },
    { id: "x5", team: "X", name: "Rim-Running Center", archetype: "Vertical Lob-and-Glass Anchor", archCode: "roll_big", role: "Roll gravity / rim run", minutes: 28, fit: 64, difficulty: 51, confidence: 0.57, label: "Roll Window", pos: { x: 142, y: 320 }, rot: -2 },
    { id: "y1", team: "Y", name: "Elite POA Stopper", archetype: "Point-of-Attack Havoc Guard", archCode: "three_and_d_stopper", role: "Ball pressure", minutes: 34, fit: 72, difficulty: 44, confidence: 0.66, label: "Stopper Court", pos: { x: 680, y: 300 }, rot: 2 },
    { id: "y2", team: "Y", name: "Big Wing Stopper", archetype: "Physical 3-and-D Wing", archCode: "three_and_d_stopper", role: "Wing defense", minutes: 32, fit: 67, difficulty: 47, confidence: 0.6, label: "Neutral Court", pos: { x: 740, y: 150 }, rot: -3 },
    { id: "y3", team: "Y", name: "Switch Forward", archetype: "Switchable Utility Forward", archCode: "connector", role: "Switch everything", minutes: 27, fit: 63, difficulty: 50, confidence: 0.55, label: "Switch Court", pos: { x: 850, y: 452 }, rot: 2 },
    { id: "y4", team: "Y", name: "Rim Protector", archetype: "Paint-Wall Rim Protector", archCode: "rim_protector", role: "Drop coverage / rim deterrence", minutes: 30, fit: 76, difficulty: 41, confidence: 0.68, label: "Rim Anchor Court", pos: { x: 905, y: 320 }, rot: -2,
      conditions: { oppImpliedTotal: 99, rimPressureEnv: "High", reboundOpp: "Elevated", deterrenceOpp: "Elevated" },
      lens: { tint: C.blue, headline: "RIM ANCHOR COURT", highlights: [{ zone: "paint", color: C.blue }, { zone: "corner", color: C.gold }],
        read: ["Opponent implied at 99 — a low-scoring, grind court", "Rim-pressure environment HIGH: block + deterrence opportunity elevated", "Court Fit 76 — the game that traps the guard is a dream here"] } },
    { id: "y5", team: "Y", name: "Low-Usage Spacer", archetype: "Corner Spacer Connector", archCode: "connector", role: "Corner spacing", minutes: 24, fit: 69, difficulty: 46, confidence: 0.52, label: "Connector Value Window", pos: { x: 910, y: 112 }, rot: 3 },
  ],
  synergies: [
    { a: "x1", b: "x5", type: "offense" }, { a: "x1", b: "x3", type: "offense" },
    { a: "x1", b: "x4", type: "hazard" }, { a: "y1", b: "y4", type: "defense" },
  ],
};

// metric zones (mirror of metric-registry) → court anchors
const ZONE_ANCHORS = {
  center: { x: 520, y: 300 }, top: { x: 360, y: 130 }, elbow: { x: 520, y: 235 },
  wing: { x: 300, y: 175 }, corner: { x: 150, y: 96 }, paint: { x: 150, y: 300 },
  sideline: { x: 520, y: 560 }, baseline: { x: 520, y: 575 },
};

function useCourtModel() {
  return useMemo(() => {
    const { market, lineup } = FAKE_GAME;
    const implied = F.impliedTeamTotals({ total: market.total, homeSpread: market.homeSpread });
    const expPoss = F.expectedPossessions({ total: market.total });
    const xPpp = F.marketPpp({ impliedTeamTotal: implied.home, expectedPossessions: expPoss });
    const yPpp = F.marketPpp({ impliedTeamTotal: implied.away, expectedPossessions: expPoss });
    const tilt = F.courtTilt({ marketSpread: market.homeSpread, lineupAdjustedSpread: lineup.adjustedSpread });
    const sg = FAKE_GAME.players.find((p) => p.id === "x1").conditions;
    const supp = F.propSuppression({ tonightProp: sg.marketPar, normalProp: sg.normalPar });
    const mp100 = F.parPer100({ propLine: sg.marketPar, poss: sg.expPoss });
    const lp100 = F.parPer100({ propLine: sg.lineupPar, poss: sg.expPoss });
    const a100 = F.actualPer100({ actualStat: sg.actual, poss: sg.actPoss });
    return { implied, expPoss, xPpp, yPpp, tilt,
      sg: { ...sg, supp, marketParPer100: mp100, lineupParPer100: lp100, actualPer100: a100,
        beatMarket: F.beatPer100({ actualPer100: a100, parPer100: mp100 }), beatLineup: F.beatPer100({ actualPer100: a100, parPer100: lp100 }) } };
  }, []);
}

// ---- PRIMITIVES -------------------------------------------------------------
const Label = ({ children, color = C.ash }) => (
  <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color }}>{children}</span>
);

// dossier ledger row (replaces SaaS card stats)
const Row = ({ k, v, accent }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "4px 0", borderBottom: `1px dashed ${C.paperEdge}` }}>
    <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: "0.04em", color: "#6F6244", textTransform: "uppercase" }}>{k}</span>
    <span style={{ fontFamily: MONO, fontSize: 13, color: accent || C.inkText, fontWeight: accent ? 700 : 400 }}>{v}</span>
  </div>
);

function Ring({ value, size = 54 }) {
  const sw = 5, rad = (size - sw) / 2, circ = 2 * Math.PI * rad, pct = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} style={{ overflow: "visible" }}>
      <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke={C.paperEdge} strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke={C.ember} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${circ * pct} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray .7s cubic-bezier(.2,.8,.2,1)" }} />
      <text x="50%" y="51%" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, fill: C.inkText }}>{Math.round(pct * 100)}</text>
    </svg>
  );
}

function Stamp({ text, sub }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 1, padding: "8px 14px",
      border: `3px solid ${C.ember}`, color: C.ember, transform: "rotate(-4deg)",
      background: "rgba(255,90,31,0.05)", boxShadow: `2px 2px 0 rgba(181,55,26,0.5)` }}>
      <span style={{ fontFamily: STAMP, fontSize: 19, lineHeight: 1, letterSpacing: "0.01em" }}>{text}</span>
      {sub && <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.06em", color: C.rust }}>{sub}</span>}
    </div>
  );
}

// pinned scouting chip (replaces glossy node circle)
function Chip({ p, selected, onSelect }) {
  const teamGold = p.team === "X";
  return (
    <g transform={`translate(${p.pos.x} ${p.pos.y}) rotate(${p.rot})`} style={{ cursor: "pointer" }} onClick={() => onSelect(p.id)}>
      {selected && <rect x="-30" y="-26" width="60" height="52" fill="none" stroke={C.ember} strokeWidth="2.5" />}
      <rect x="-28" y="-24" width="56" height="48" fill={C.paper} stroke={C.inkText} strokeWidth="1.2" />
      <rect x="-28" y="-24" width="56" height="9" fill={teamGold ? C.gold : C.blue} opacity="0.85" />
      <circle cx="0" cy="-24" r="2.6" fill={C.rust} />{/* pin */}
      <text textAnchor="middle" y="3" style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 17, fill: C.inkText }}>
        {p.team}{FAKE_GAME.players.filter((q) => q.team === p.team).indexOf(p) + 1}
      </text>
      <rect x="-22" y="11" width={44 * (p.fit / 100)} height="2.4" fill={C.blue} />
      <rect x="-22" y="15" width={44 * (p.difficulty / 100)} height="2.4" fill={C.rust} />
    </g>
  );
}

// ---- THE COURT — evidence board with hand-struck chalk -----------------------
function CourtGraph({ model, selected, onSelect, reduced }) {
  const lens = selected?.lens;
  const tiltDeg = lens ? 0 : model.tilt.tiltDeg;
  const hi = useMemo(() => { const m = {}; (lens?.highlights || []).forEach((h) => (m[h.zone] = h)); return m; }, [lens]);
  const pById = (id) => FAKE_GAME.players.find((p) => p.id === id);
  const trans = reduced ? "none" : "transform .8s cubic-bezier(.2,.7,.2,1), opacity .5s";
  const L = (p) => <line stroke={C.chalkDim} strokeWidth="1.6" strokeLinecap="round" {...p} />;

  return (
    <svg viewBox="0 0 1040 600" style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        {/* hand-struck wobble — chalk on a board, not pristine vector */}
        <filter id="chalk" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="7" result="n" />
          <feDisplacementMap in="SourceGraphic" in2="n" scale={reduced ? 0 : 2.6} />
        </filter>
        <radialGradient id="cosmic" cx="78%" cy="20%" r="60%">
          <stop offset="0%" stopColor="rgba(240,169,43,0.10)" /><stop offset="60%" stopColor="rgba(181,55,26,0.04)" /><stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </radialGradient>
      </defs>

      <rect x="0" y="0" width="1040" height="600" fill={C.board} />
      <rect x="0" y="0" width="1040" height="600" fill="url(#cosmic)" />

      {/* lens washes (inked, not neon) */}
      {Object.entries(hi).map(([z, h]) => {
        const a = ZONE_ANCHORS[z] || ZONE_ANCHORS.center;
        return <rect key={z} x={a.x - 95} y={a.y - 70} width="190" height="140" fill={h.color} opacity={reduced ? 0.12 : 0.16}
          style={{ transition: trans }} transform={`rotate(${(z.length * 3) % 7 - 3} ${a.x} ${a.y})`} />;
      })}

      {/* court group tilts as a unit; chalk filter applied to geometry only */}
      <g transform={`rotate(${tiltDeg} 520 300)`} style={{ transition: trans, transformOrigin: "520px 300px" }}>
        <g filter="url(#chalk)">
          <rect x="46" y="46" width="948" height="508" fill="none" stroke={C.chalkDim} strokeWidth="2.4" />
          {L({ x1: 520, y1: 46, x2: 520, y2: 554 })}
          <circle cx="520" cy="300" r="76" fill="none" stroke={C.chalkDim} strokeWidth="1.8" />
          <rect x="46" y="226" width="156" height="148" fill="none" stroke={C.chalkDim} strokeWidth="1.8" />
          <circle cx="202" cy="300" r="44" fill="none" stroke={C.chalkDim} strokeWidth="1.8" />
          <rect x="838" y="226" width="156" height="148" fill="none" stroke={C.chalkDim} strokeWidth="1.8" />
          <circle cx="838" cy="300" r="44" fill="none" stroke={C.chalkDim} strokeWidth="1.8" />
          <path d="M 46 120 Q 360 300 46 480" fill="none" stroke={C.chalkFaint} strokeWidth="1.8" />
          <path d="M 994 120 Q 680 300 994 480" fill="none" stroke={C.chalkFaint} strokeWidth="1.8" />
        </g>

        {/* zone labels — faint mono annotations, like a coach's marks */}
        {[["CREATION", 360, 96], ["MATCHUP", 760, 110], ["SPACING", 150, 70], ["RIM", 150, 300], ["RESULT", 520, 588]].map(([t, x, y]) => (
          <text key={t} x={x} y={y} textAnchor="middle" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", fill: "rgba(231,220,194,0.28)" }}>{t}</text>
        ))}

        {/* synergy strokes (marker, hand-drawn) */}
        {FAKE_GAME.synergies.map((s, i) => {
          const a = pById(s.a).pos, b = pById(s.b).pos;
          const col = s.type === "offense" ? C.blue : s.type === "defense" ? C.rust : C.ember;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth="2.4" opacity="0.6"
            strokeDasharray={s.type === "hazard" ? "2 7" : "0"} strokeLinecap="round" filter="url(#chalk)" />;
        })}

        {FAKE_GAME.players.map((p) => <Chip key={p.id} p={p} selected={selected?.id === p.id} onSelect={onSelect} />)}
      </g>

      {/* MARKET HUB — inked gold stamp at center (the market's truth, untilted) */}
      <g transform="translate(520 300)">
        <circle r="60" fill="rgba(240,169,43,0.06)" stroke={C.gold} strokeWidth="2" filter="url(#chalk)" />
        <text textAnchor="middle" y="-30" style={{ fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.22em", fill: C.gold }}>MARKET COURT</text>
        <text textAnchor="middle" y="-4" style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 30, fill: C.chalk }}>
          {model.implied.home}<tspan fill={C.ash} fontSize="15">·</tspan>{model.implied.away}
        </text>
        <text textAnchor="middle" y="16" style={{ fontFamily: MONO, fontSize: 9, fill: C.ash }}>O/U {FAKE_GAME.market.total}</text>
        <text textAnchor="middle" y="32" style={{ fontFamily: MONO, fontSize: 9, fill: C.gold }}>PPP {model.xPpp}·{model.yPpp}</text>
      </g>
    </svg>
  );
}

// ---- LEDGER RAIL (market → lineup, as a board ledger not a card) ------------
function LedgerRail({ title, marketVal, modelVal, delta, deltaColor }) {
  return (
    <div style={{ flex: 1, minWidth: 200, padding: "8px 0", borderTop: `2px solid ${C.chalkFaint}` }}>
      <Label>{title}</Label>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 4 }}>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, color: C.gold }}>{marketVal}</span>
        <span style={{ fontFamily: MONO, color: C.ash, fontSize: 12 }}>→</span>
        <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 22, color: C.ember }}>{modelVal}</span>
        <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 14, fontWeight: 700, color: deltaColor }}>{delta}</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
        <Label color="rgba(240,169,43,0.7)">market</Label><Label color="rgba(255,90,31,0.7)">lineup court</Label>
      </div>
    </div>
  );
}

// ---- SCOUTING DOSSIER (right column) ----------------------------------------
function Dossier({ selected, model }) {
  if (!selected) return <div style={{ fontFamily: BODY, fontSize: 13, color: C.ash, padding: 18 }}>Pin a player to open their court conditions.</div>;
  const teamGold = selected.team === "X";
  const full = selected.id === "x1";
  const sg = model.sg;
  const paper = {
    background: C.paper, color: C.inkText, border: `1px solid ${C.inkText}`,
    boxShadow: `3px 3px 0 rgba(0,0,0,0.35)`, padding: "14px 16px", position: "relative",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ ...paper, transform: "rotate(-0.4deg)" }}>
        {/* tape corner */}
        <div style={{ position: "absolute", top: -7, left: 22, width: 46, height: 14, background: "rgba(240,169,43,0.45)", transform: "rotate(-4deg)" }} />
        <Label color={teamGold ? "#9a6f12" : "#1d6fa0"}>{FAKE_GAME.teams[selected.team].name} · {selected.archCode.replace(/_/g, " ")}</Label>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 25, lineHeight: 1.02, marginTop: 3 }}>{selected.name}</div>
        <div style={{ fontFamily: BODY, fontSize: 12, color: "#5c5238", fontStyle: "italic" }}>{selected.archetype}</div>
        <div style={{ display: "inline-block", marginTop: 8, padding: "2px 9px", border: `1.5px solid ${selected.lens?.tint || C.rust}`,
          color: selected.lens?.tint || C.rust, fontFamily: MONO, fontSize: 10, letterSpacing: "0.05em" }}>{selected.label}</div>

        {selected.lens && (
          <ul style={{ margin: "10px 0 0", paddingLeft: 16, fontFamily: BODY, fontSize: 12.5, lineHeight: 1.5, color: "#3a3320" }}>
            {selected.lens.read.map((t, i) => <li key={i} style={{ marginBottom: 3 }}>{t}</li>)}
          </ul>
        )}
      </div>

      <div style={{ ...paper, transform: "rotate(0.3deg)" }}>
        <Label color="#6F6244">Player Court Conditions</Label>
        <div style={{ marginTop: 6 }}>
          {full ? (<>
            <Row k="Normal PTS par" v={sg.normalPar} />
            <Row k="Market PTS par" v={sg.marketPar} accent={C.gold} />
            <Row k="Lineup court par" v={sg.lineupPar} accent={C.ember} />
            <Row k="Suppression" v={`${(sg.supp * 100).toFixed(1)}%`} accent={C.rust} />
            <Row k="Fit / difficulty" v={`${selected.fit} / ${selected.difficulty}`} />
            <Row k="Court slope" v={selected.slope} accent={C.rust} />
            <Row k="Exp · actual poss" v={`${sg.expPoss} · ${sg.actPoss}`} />
            <Row k="Market par /100" v={sg.marketParPer100} accent={C.gold} />
            <Row k="Lineup par /100" v={sg.lineupParPer100} accent={C.ember} />
            <Row k="Actual /100" v={sg.actualPer100} />
          </>) : selected.conditions ? (
            Object.entries(selected.conditions).map(([k, v]) => <Row key={k} k={k.replace(/([A-Z])/g, " $1")} v={String(v)} />)
          ) : (<>
            <Row k="Court fit" v={selected.fit} accent={C.blue} />
            <Row k="Court difficulty" v={selected.difficulty} accent={C.rust} />
            <Row k="Expected minutes" v={selected.minutes} />
            <div style={{ marginTop: 8, fontFamily: BODY, fontSize: 11.5, color: "#6F6244" }}>Full market par fills in for this archetype when Phase 3 odds land.</div>
          </>)}
        </div>
      </div>

      {full && (
        <div style={{ ...paper, transform: "rotate(-0.5deg)", background: C.paperShade }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Label color="#9a4513">Court Scorecard</Label><Ring value={selected.confidence} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "8px 0 10px" }}>
            <Stamp text="BEAT THE COURT" sub={`+${sg.beatLineup} / 100`} />
            <div style={{ fontFamily: BODY, fontSize: 11.5, color: "#3a3320", lineHeight: 1.4 }}>
              Verdict = lineup-adjusted court beat. Market beat <b>+{sg.beatMarket}</b>.
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Row k="Court type" v="Low-Total Grind" />
            <Row k="Label" v="Plus-Hcap Test" accent={C.rust} />
            <Row k="Market par" v={sg.marketPar} accent={C.gold} />
            <Row k="Lineup par" v={sg.lineupPar} accent={C.ember} />
            <Row k="Actual" v={sg.actual} />
            <Row k="Confidence" v={`${Math.round(selected.confidence * 100)}%`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ---- GLOSSARY (dossier index) -----------------------------------------------
const GLOSSARY = [
  ["Court", "The full basketball environment — market, lineup, archetype, matchup, pace, rest, leverage. Not just the hardwood."],
  ["Par", "Expected output for an average player in this exact context. Raw stats mean nothing without it."],
  ["Market Court", "The court the market sets: spread, total, implied totals, expected possessions, market PPP."],
  ["Starting Lineup Court", "How the confirmed five bends the court before tip."],
  ["Court Fit / Difficulty", "0–100 archetype compatibility, and 0–100 assignment difficulty."],
  ["Court Slope", "How much the context separates elite from replacement."],
  ["Beat the Court", "Actual output minus court-adjusted par. The whole point."],
  ["Confidence Ring", "Every number ships with a 0–1 trust score, struck as a ring."],
];
function Glossary({ open, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(8,5,2,0.82)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: "100%", maxHeight: "82vh", overflow: "auto", background: C.paper, color: C.inkText, border: `1px solid ${C.inkText}`, boxShadow: "5px 5px 0 rgba(0,0,0,0.4)", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 22, letterSpacing: "0.02em" }}>A NEW BASKETBALL LANGUAGE</span>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.inkText}`, cursor: "pointer", fontFamily: MONO, fontSize: 11, padding: "3px 8px" }}>close</button>
        </div>
        {GLOSSARY.map(([t, d]) => (
          <div key={t} style={{ padding: "8px 0", borderBottom: `1px dashed ${C.paperEdge}` }}>
            <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, color: C.rust }}>{t}</div>
            <div style={{ fontFamily: BODY, fontSize: 13, lineHeight: 1.5, color: "#3a3320" }}>{d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- APP --------------------------------------------------------------------
export default function CourtHandicapPrototypeV2() {
  const model = useCourtModel();
  const [sel, setSel] = useState("x1");
  const [glo, setGlo] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => { if (typeof window !== "undefined" && window.matchMedia) setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches); }, []);
  const selected = FAKE_GAME.players.find((p) => p.id === sel) || null;
  const tiltLabel = `${Math.abs(model.tilt.tiltDeg)}° → TEAM ${model.tilt.tiltDeg <= 0 ? "X" : "Y"}`;

  return (
    <div style={{ background: C.ink, minHeight: "100vh", color: C.chalk, fontFamily: BODY, position: "relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@400;600;700;900&family=Syne:wght@400;600;700;800&family=Syne+Mono&family=Rubik+Dirt&display=swap');
        *{box-sizing:border-box}::selection{background:rgba(255,90,31,0.3)}`}</style>
      {/* paper grain over the whole board */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", opacity: 0.05, zIndex: 1,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

      {/* masthead */}
      <header style={{ borderBottom: `2px solid ${C.chalkFaint}`, padding: "14px 22px", display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 24, letterSpacing: "0.02em" }}>
          GINGEBALL <span style={{ color: C.gold }}>COURT HANDICAP</span>
        </div>
        <nav style={{ display: "flex", gap: 13, fontFamily: MONO, fontSize: 10.5, color: C.ash, flexWrap: "wrap" }}>
          {["today", "games", "players", "teams", "lineups", "roles", "leaderboards", "glossary", "methodology"].map((x) => <span key={x}>/{x}</span>)}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", gap: 9 }}>
          <button onClick={() => setReduced((v) => !v)} style={{ background: "none", border: `1px solid ${C.chalkFaint}`, color: reduced ? C.gold : C.ash, cursor: "pointer", fontFamily: MONO, fontSize: 10, padding: "4px 9px" }}>{reduced ? "motion off" : "motion on"}</button>
          <button onClick={() => setGlo(true)} style={{ background: "none", border: `1px solid ${C.gold}`, color: C.gold, cursor: "pointer", fontFamily: MONO, fontSize: 10, padding: "4px 11px", letterSpacing: "0.05em" }}>glossary</button>
        </div>
      </header>

      {/* dossier title */}
      <div style={{ padding: "16px 22px 4px", display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        <div>
          <Label color={C.gold}>{FAKE_GAME.game.label} · scouting dossier</Label>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 40, letterSpacing: "0.01em", lineHeight: 0.95 }}>{FAKE_GAME.game.matchup}</div>
        </div>
        <div style={{ fontFamily: STAMP, fontSize: 13, color: C.ember, transform: "rotate(-3deg)", border: `2px solid ${C.ember}`, padding: "2px 8px", marginBottom: 4 }}>PROTOTYPE · NO LIVE DATA</div>
        <div style={{ marginLeft: "auto", fontFamily: BODY, fontSize: 12, fontStyle: "italic", color: C.ash, maxWidth: 260, textAlign: "right" }}>
          The market sets the court. The lineup shapes it. The archetype translates it. Gingeball grades who beat it.
        </div>
      </div>

      {/* ledger rails */}
      <div style={{ display: "flex", gap: 26, padding: "6px 22px 0", flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        <LedgerRail title="Spread Rail" marketVal={`X ${FAKE_GAME.market.homeSpread}`} modelVal={`X ${FAKE_GAME.lineup.adjustedSpread}`}
          delta={`${(FAKE_GAME.lineup.adjustedSpread - FAKE_GAME.market.homeSpread).toFixed(1)}`} deltaColor={C.blue} />
        <LedgerRail title="Total Rail" marketVal={FAKE_GAME.market.total} modelVal={FAKE_GAME.lineup.adjustedTotal}
          delta={`${(FAKE_GAME.lineup.adjustedTotal - FAKE_GAME.market.total).toFixed(1)}`} deltaColor={C.rust} />
        <div style={{ flex: 1, minWidth: 200, padding: "8px 0", borderTop: `2px solid ${C.chalkFaint}` }}>
          <Label>Court Tilt Engine</Label>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 22, color: C.ember }}>{tiltLabel}</span>
            <div style={{ flex: 1, height: 6, background: C.chalkFaint, position: "relative" }}>
              <div style={{ position: "absolute", left: "50%", top: -3, bottom: -3, width: 1.5, background: C.chalkDim }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, background: C.ember, width: `${Math.min(50, Math.abs(model.tilt.tiltDeg) / 6 * 50)}%`,
                right: model.tilt.tiltDeg <= 0 ? "50%" : "auto", left: model.tilt.tiltDeg <= 0 ? "auto" : "50%", transition: reduced ? "none" : "width .5s" }} />
            </div>
          </div>
          <Label>deterministic · from lineup-adjusted spread</Label>
        </div>
      </div>

      {/* board + dossier */}
      <div style={{ display: "flex", gap: 18, padding: "10px 22px 40px", alignItems: "flex-start", flexWrap: "wrap", position: "relative", zIndex: 2 }}>
        <div style={{ flex: "1 1 560px", minWidth: 320, border: `1px solid ${C.chalkFaint}`, background: C.board, padding: 8 }}>
          <CourtGraph model={model} selected={selected} onSelect={setSel} reduced={reduced} />
          <div style={{ display: "flex", gap: 16, justifyContent: "center", padding: "8px 4px 2px", flexWrap: "wrap" }}>
            {[["creation synergy", C.blue, false], ["defensive chain", C.rust, false], ["spacing hazard", C.ember, true], ["fit", C.blue, false], ["difficulty", C.rust, false]].map(([l, col, d]) => (
              <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: MONO, fontSize: 9.5, color: C.ash }}>
                <span style={{ width: 16, borderTop: `2px ${d ? "dotted" : "solid"} ${col}` }} />{l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ flex: "1 1 320px", minWidth: 300, maxWidth: 440 }}><Dossier selected={selected} model={model} /></div>
      </div>

      <Glossary open={glo} onClose={() => setGlo(false)} />
    </div>
  );
}
