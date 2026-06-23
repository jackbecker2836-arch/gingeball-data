import React, { useState, useMemo, useEffect } from "react";

// =============================================================================
// GINGEBALL COURT HANDICAP — PHASE 2 PROTOTYPE  (/court-handicap/prototype)
//
// The court IS the graph. The market sets it; the lineup shapes it; the
// archetype translates it; the scorecard stamps who beat it.
//
// Everything below flows from ONE fixture (FAKE_GAME) through the SAME formula
// functions defined in Phase 1's lib/formula-registry.ts. In the real repo these
// formulas are IMPORTED, not redefined, and the fixture is the typed file at
// fixtures/court-handicap/fake-game.ts. They are inlined here only so this single
// file runs standalone. No value below is hardcoded in a component — they are all
// computed from the fixture via the registry math.
// =============================================================================

// ----------------------------------------------------------------------------
// FORMULA REGISTRY (mirror of lib/formula-registry.ts — same ids, same math)
// ----------------------------------------------------------------------------
const r = (x, d = 3) => Number(x.toFixed(d));
const LEAGUE_AVG_PPP = 1.14;
const F = {
  impliedTeamTotals: ({ total, homeSpread }) => {           // CH-MKT-001
    const margin = -homeSpread;
    return { home: r((total + margin) / 2, 2), away: r((total - margin) / 2, 2) };
  },
  expectedPossessions: ({ total, ppp = LEAGUE_AVG_PPP }) => r(total / (2 * ppp), 1), // CH-MKT-002
  marketPpp: ({ impliedTeamTotal, expectedPossessions }) => r(impliedTeamTotal / expectedPossessions, 4), // CH-MKT-003
  propSuppression: ({ tonightProp, normalProp }) => r(1 - tonightProp / normalProp, 4), // CH-MKT-005
  parPer100: ({ propLine, poss }) => r((propLine / poss) * 100, 1),         // CH-PLR-001
  actualPer100: ({ actualStat, poss }) => r((actualStat / poss) * 100, 1),  // CH-PLR-002
  beatPer100: ({ actualPer100, parPer100 }) => r(actualPer100 - parPer100, 1), // CH-PLR-003
  // CH-CHT-001 (Phase 2) deterministic court tilt: tilt toward the favored team,
  // proportional to the lineup-adjusted spread; delta shows how the lineup bent it.
  courtTilt: ({ marketSpread, lineupAdjustedSpread, scale = 0.6, cap = 6 }) => {
    const base = marketSpread * scale;
    const shaped = lineupAdjustedSpread * scale;
    const clamp = (v) => Math.max(-cap, Math.min(cap, v));
    return { baseTilt: r(clamp(base), 2), tiltDeg: r(clamp(shaped), 2), tiltDelta: r(clamp(shaped) - clamp(base), 2) };
  },
};

// ----------------------------------------------------------------------------
// PALETTE — the brief's visual language, given concrete tokens
// ----------------------------------------------------------------------------
const C = {
  void: "#070A11",
  voidLift: "#0C111B",
  panel: "#0E1521",
  panelEdge: "#1B2638",
  chalk: "#D7D2C2",
  chalkDim: "rgba(215,210,194,0.30)",
  chalkFaint: "rgba(215,210,194,0.12)",
  amber: "#F3A93B",      // market / scoreboard
  ember: "#FF5C2A",      // Gingeball final grade
  blueprint: "#4EA8DE",  // offense / creation
  crimson: "#C24A52",    // defense / suppression
  purple: "#9D6BFF",     // hazards / penalties
  lime: "#C2E84A",       // prototype / pending
  text: "#E9E7DE",
  textDim: "#8A93A6",
};
const FONT_DISPLAY = "'Oswald','Arial Narrow',system-ui,sans-serif";
const FONT_MONO = "'JetBrains Mono',ui-monospace,'SF Mono',Menlo,Consolas,monospace";
const FONT_BODY = "system-ui,-apple-system,Segoe UI,Roboto,sans-serif";

// ----------------------------------------------------------------------------
// FAKE GAME FIXTURE  (mirror of fixtures/court-handicap/fake-game.ts)
// ----------------------------------------------------------------------------
const FAKE_GAME = {
  game: { id: "fake-game", label: "TONIGHT'S COURT", matchup: "Team X vs Team Y", courtType: "Low-Total Defensive Grind" },
  market: { homeSpread: -4, total: 202 },               // Team X (home) -4, total 202
  lineup: { adjustedSpread: -4.4, adjustedTotal: 194.2 }, // starting-lineup-shaped court
  teams: {
    X: { code: "X", name: "Team X", color: C.blueprint },
    Y: { code: "Y", name: "Team Y", color: C.crimson },
  },
  // court positions are illustrative basketball spots on a full horizontal court (viewBox 1040x600)
  players: [
    { id: "x1", team: "X", name: "Star Scoring Guard", archetype: "Pressure-Rim Midrange Assassin", archCode: "scoring_guard",
      role: "Primary on-ball creator", minutes: 36, fit: 38, difficulty: 86, slope: "High", confidence: 0.74,
      label: "Trap Court / Plus-Handicap Test", pos: { x: 360, y: 300 }, zone: "top",
      conditions: { normalPar: 27.5, marketPar: 24.5, lineupPar: 23.1, actual: 29, expPoss: 66.5, actPoss: 67 },
      lens: { tint: C.crimson, headline: "TRAP COURT",
        highlights: [
          { zone: "paint", color: C.crimson, note: "Rim walled off — drives meet the Paint-Wall" },
          { zone: "top", color: C.purple, note: "POA Havoc Guard hounds the handle up top" },
          { zone: "wing", color: C.purple, note: "Non-shooter on the floor shrinks his pull-up space" },
        ],
        read: ["Market cut his points par 27.5 → 24.5 (10.9% suppression)", "Lineup shrinks par further to 23.1", "Court Fit 38 / Difficulty 86 — a Plus-Handicap Test"] } },
    { id: "x2", team: "X", name: "Secondary Wing Creator", archetype: "Two-Way Wing Engine", archCode: "wing_scorer",
      role: "Secondary creation", minutes: 33, fit: 61, difficulty: 58, confidence: 0.6, label: "Neutral Court", pos: { x: 300, y: 150 }, zone: "wing" },
    { id: "x3", team: "X", name: "Low-Usage 3-and-D Wing", archetype: "Wing-Stopper Spacing Blade", archCode: "three_and_d_stopper",
      role: "Spacing + POA defense", minutes: 30, fit: 70, difficulty: 49, confidence: 0.55, label: "Connector Value Window", pos: { x: 130, y: 90 }, zone: "corner",
      conditions: { roleClarity: "Medium / High", spacingValue: "Important", defenseAssignment: "High leverage", boxSensitivity: "Low" },
      lens: { tint: C.blueprint, headline: "CONNECTOR VALUE WINDOW",
        highlights: [
          { zone: "corner", color: C.blueprint, note: "Corner spacing keeps the floor legal" },
          { zone: "wing", color: C.crimson, note: "Drawn onto the toughest perimeter assignment" },
        ],
        read: ["Box score will under-rate him", "Value is spacing gravity + a high-leverage defensive matchup", "Judged on role execution, not points"] } },
    { id: "x4", team: "X", name: "Non-Shooting Defensive Forward", archetype: "Defensive Utility Forward", archCode: "defensive_chaos",
      role: "Help defense / glass", minutes: 26, fit: 52, difficulty: 55, confidence: 0.5, label: "Role Court", pos: { x: 205, y: 440 }, zone: "elbow" },
    { id: "x5", team: "X", name: "Rim-Running Center", archetype: "Vertical Lob-and-Glass Anchor", archCode: "roll_big",
      role: "Roll gravity / rim run", minutes: 28, fit: 64, difficulty: 51, confidence: 0.57, label: "Roll Window", pos: { x: 140, y: 320 }, zone: "paint" },
    { id: "y1", team: "Y", name: "Elite POA Stopper", archetype: "Point-of-Attack Havoc Guard", archCode: "three_and_d_stopper",
      role: "Ball pressure", minutes: 34, fit: 72, difficulty: 44, confidence: 0.66, label: "Stopper Court", pos: { x: 680, y: 300 }, zone: "top" },
    { id: "y2", team: "Y", name: "Big Wing Stopper", archetype: "Physical 3-and-D Wing", archCode: "three_and_d_stopper",
      role: "Wing defense", minutes: 32, fit: 67, difficulty: 47, confidence: 0.6, label: "Neutral Court", pos: { x: 740, y: 150 }, zone: "wing" },
    { id: "y3", team: "Y", name: "Switch Forward", archetype: "Switchable Utility Forward", archCode: "connector",
      role: "Switch everything", minutes: 27, fit: 63, difficulty: 50, confidence: 0.55, label: "Switch Court", pos: { x: 850, y: 450 }, zone: "elbow" },
    { id: "y4", team: "Y", name: "Rim Protector", archetype: "Paint-Wall Rim Protector", archCode: "rim_protector",
      role: "Drop coverage / rim deterrence", minutes: 30, fit: 76, difficulty: 41, confidence: 0.68, label: "Rim Anchor Court", pos: { x: 905, y: 320 }, zone: "paint",
      conditions: { oppImpliedTotal: 99, rimPressureEnv: "High", reboundOpp: "Elevated", deterrenceOpp: "Elevated" },
      lens: { tint: C.blueprint, headline: "RIM ANCHOR COURT",
        highlights: [
          { zone: "paint", color: C.blueprint, note: "Low total + rim pressure = a dream anchor court" },
          { zone: "corner", color: C.lime, note: "Weak-side help windows open" },
        ],
        read: ["Opponent implied at 99 — a low-scoring, grind court", "Rim-pressure environment is HIGH: block + deterrence opportunity elevated", "Court Fit 76 — the same game that traps a scoring guard is a dream here"] } },
    { id: "y5", team: "Y", name: "Low-Usage Spacer", archetype: "Corner Spacer Connector", archCode: "connector",
      role: "Corner spacing", minutes: 24, fit: 69, difficulty: 46, confidence: 0.52, label: "Connector Value Window", pos: { x: 910, y: 110 }, zone: "corner" },
  ],
  synergies: [
    { a: "x1", b: "x5", type: "offense", label: "creator–roll synergy" },
    { a: "x1", b: "x3", type: "offense", label: "spacing dependency" },
    { a: "x1", b: "x4", type: "hazard", label: "spacing hazard (non-shooter)" },
    { a: "y1", b: "y4", type: "defense", label: "defensive chain (POA → rim)" },
  ],
  outcome: { stamp: "BEAT THE COURT", selectedPlayerId: "x1" },
  possessionsPreview: [
    { ppp: 1.42, exp: 0.98 }, { ppp: 0.0, exp: 1.05 }, { ppp: 1.18, exp: 1.10 },
    { ppp: 2.1, exp: 1.0 }, { ppp: 0.0, exp: 0.92 }, { ppp: 1.5, exp: 1.12 },
  ],
};

// ----------------------------------------------------------------------------
// METRIC ZONES (mirror of lib/metric-registry.ts) → court anchor coordinates.
// Components read a metric's courtZone and place themselves here; positions are
// NOT hardcoded per metric. One map, single source of truth.
// ----------------------------------------------------------------------------
const ZONE_ANCHORS = {
  center:   { x: 520, y: 300 },
  top:      { x: 520, y: 120 },
  elbow:    { x: 520, y: 235 },
  wing:     { x: 760, y: 175 },
  corner:   { x: 300, y: 90 },
  paint:    { x: 110, y: 300 },
  sideline: { x: 520, y: 560 },
  baseline: { x: 520, y: 575 },
};

// ----------------------------------------------------------------------------
// DERIVED VALUES — computed once from fixture + formulas
// ----------------------------------------------------------------------------
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
    const marketParPer100 = F.parPer100({ propLine: sg.marketPar, poss: sg.expPoss });
    const lineupParPer100 = F.parPer100({ propLine: sg.lineupPar, poss: sg.expPoss });
    const actualPer100v = F.actualPer100({ actualStat: sg.actual, poss: sg.actPoss });
    const beatMarket = F.beatPer100({ actualPer100: actualPer100v, parPer100: marketParPer100 });
    const beatLineup = F.beatPer100({ actualPer100: actualPer100v, parPer100: lineupParPer100 });

    return {
      implied, expPoss, xPpp, yPpp, tilt,
      sg: { ...sg, supp, marketParPer100, lineupParPer100, actualPer100: actualPer100v, beatMarket, beatLineup,
        beatMarketRaw: r(sg.actual - sg.marketPar, 1), beatLineupRaw: r(sg.actual - sg.lineupPar, 1) },
    };
  }, []);
}

// ----------------------------------------------------------------------------
// SMALL UI PRIMITIVES
// ----------------------------------------------------------------------------
const Eyebrow = ({ children, color = C.textDim }) => (
  <div style={{ fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color }}>{children}</div>
);
const Stat = ({ label, value, color = C.text, accent }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, padding: "5px 0", borderBottom: `1px solid ${C.chalkFaint}` }}>
    <span style={{ fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.08em", color: C.textDim, textTransform: "uppercase" }}>{label}</span>
    <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 500, color: accent || color }}>{value}</span>
  </div>
);

function ConfidenceRing({ value, size = 46, label = true }) {
  const stroke = 4, rad = (size - stroke) / 2, circ = 2 * Math.PI * rad;
  const pct = Math.max(0, Math.min(1, value));
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke={C.chalkFaint} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={rad} fill="none" stroke={C.ember} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: "stroke-dashoffset .6s ease" }} />
        <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontFamily: FONT_MONO, fontSize: 12, fill: C.text, fontWeight: 700 }}>{Math.round(pct * 100)}</text>
      </svg>
      {label && <Eyebrow>conf</Eyebrow>}
    </div>
  );
}

function OutcomeStamp({ text, sub }) {
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 16px",
      border: `2.5px solid ${C.ember}`, color: C.ember, transform: "rotate(-3deg)", borderRadius: 4,
      background: "rgba(255,92,42,0.06)", boxShadow: `inset 0 0 0 1px rgba(255,92,42,0.25)` }}>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 18, letterSpacing: "0.08em" }}>{text}</span>
      {sub && <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.1em", color: C.text }}>{sub}</span>}
    </div>
  );
}

// ----------------------------------------------------------------------------
// THE COURT (signature element) — chalk court on void, tilts + re-skins by lens
// ----------------------------------------------------------------------------
function CourtGraph({ model, selected, onSelect, reduced }) {
  const lens = selected?.lens;
  const tiltDeg = lens ? 0 : model.tilt.tiltDeg; // when a lens is active we square the court to read zones; otherwise show market/lineup tilt
  const highlightByZone = useMemo(() => {
    const m = {};
    (lens?.highlights || []).forEach((h) => { m[h.zone] = h; });
    return m;
  }, [lens]);

  const playerById = (id) => FAKE_GAME.players.find((p) => p.id === id);
  const transition = reduced ? "none" : "transform .7s cubic-bezier(.2,.7,.2,1), opacity .5s ease";

  // chalk line helper
  const line = (props) => <line stroke={C.chalkDim} strokeWidth="1.5" {...props} />;

  return (
    <svg viewBox="0 0 1040 600" style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <radialGradient id="floor" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#0E1623" /><stop offset="100%" stopColor={C.void} />
        </radialGradient>
      </defs>

      {/* court group — tilts as a unit (the court IS the graph) */}
      <g transform={`rotate(${tiltDeg} 520 300)`} style={{ transition, transformOrigin: "520px 300px" }}>
        <rect x="40" y="40" width="960" height="520" rx="6" fill="url(#floor)" stroke={C.chalkDim} strokeWidth="2" />
        {/* zone highlight fields (archetype lens) */}
        {Object.entries(highlightByZone).map(([zone, h]) => {
          const a = ZONE_ANCHORS[zone] || ZONE_ANCHORS.center;
          return <circle key={zone} cx={a.x} cy={a.y} r="86" fill={h.color} opacity={reduced ? 0.16 : 0.2}
            style={{ transition, filter: "blur(2px)" }} />;
        })}
        {/* halfcourt + center circle (Market Court lives here) */}
        {line({ x1: 520, y1: 40, x2: 520, y2: 560 })}
        <circle cx="520" cy="300" r="74" fill="none" stroke={C.chalkDim} strokeWidth="1.5" />
        {/* left key + hoop */}
        <rect x="40" y="230" width="150" height="140" fill="none" stroke={C.chalkDim} strokeWidth="1.5" />
        <circle cx="190" cy="300" r="42" fill="none" stroke={C.chalkDim} strokeWidth="1.5" />
        <circle cx="78" cy="300" r="8" fill="none" stroke={C.chalkDim} strokeWidth="1.5" />
        {/* right key + hoop */}
        <rect x="850" y="230" width="150" height="140" fill="none" stroke={C.chalkDim} strokeWidth="1.5" />
        <circle cx="850" cy="300" r="42" fill="none" stroke={C.chalkDim} strokeWidth="1.5" />
        <circle cx="962" cy="300" r="8" fill="none" stroke={C.chalkDim} strokeWidth="1.5" />
        {/* three-point arcs (suggested) */}
        <path d="M 40 110 Q 360 300 40 490" fill="none" stroke={C.chalkFaint} strokeWidth="1.5" />
        <path d="M 1000 110 Q 680 300 1000 490" fill="none" stroke={C.chalkFaint} strokeWidth="1.5" />

        {/* synergy edges (drawn under nodes) */}
        {FAKE_GAME.synergies.map((s, i) => {
          const a = playerById(s.a).pos, b = playerById(s.b).pos;
          const stroke = s.type === "offense" ? C.blueprint : s.type === "defense" ? C.crimson : C.purple;
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={stroke} strokeWidth="2"
            strokeDasharray={s.type === "hazard" ? "5 6" : "0"} opacity="0.55" />;
        })}

        {/* lineup nodes */}
        {FAKE_GAME.players.map((p) => {
          const isSel = selected?.id === p.id;
          const teamColor = FAKE_GAME.teams[p.team].color;
          return (
            <g key={p.id} transform={`translate(${p.pos.x} ${p.pos.y})`} style={{ cursor: "pointer", transition }}
              onClick={() => onSelect(p.id)}>
              {isSel && <circle r="26" fill="none" stroke={C.ember} strokeWidth="2.5" opacity="0.9" />}
              <circle r="17" fill={C.panel} stroke={teamColor} strokeWidth={isSel ? 3 : 2} />
              <text textAnchor="middle" dy="5" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 15, fill: isSel ? C.ember : C.chalk }}>
                {p.team}{FAKE_GAME.players.filter((q) => q.team === p.team).indexOf(p) + 1}
              </text>
              {/* tiny fit/difficulty ticks */}
              <rect x="-17" y="20" width={34 * (p.fit / 100)} height="3" fill={C.blueprint} opacity="0.8" />
              <rect x="-17" y="25" width={34 * (p.difficulty / 100)} height="3" fill={C.crimson} opacity="0.8" />
            </g>
          );
        })}
      </g>

      {/* MARKET HUB — center court, scoreboard amber (does not tilt; it's the fixed market truth) */}
      <g transform="translate(520 300)">
        <circle r="62" fill="rgba(243,169,59,0.05)" stroke={C.amber} strokeWidth="1.5" />
        <text textAnchor="middle" dy="-30" style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: "0.2em", fill: C.amber }}>MARKET COURT</text>
        <text textAnchor="middle" dy="-8" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 26, fill: C.text }}>
          {model.implied.home} <tspan fill={C.textDim} fontSize="14">–</tspan> {model.implied.away}
        </text>
        <text textAnchor="middle" dy="12" style={{ fontFamily: FONT_MONO, fontSize: 9.5, fill: C.textDim }}>IMPLIED · {FAKE_GAME.market.total} O/U</text>
        <text textAnchor="middle" dy="30" style={{ fontFamily: FONT_MONO, fontSize: 9.5, fill: C.amber }}>
          PPP {model.xPpp} · {model.yPpp}
        </text>
      </g>
    </svg>
  );
}

// ----------------------------------------------------------------------------
// RAILS — market vs lineup-adjusted (spread + total), scoreboard ticker feel
// ----------------------------------------------------------------------------
function Rail({ title, marketLabel, marketVal, modelLabel, modelVal, delta, deltaColor }) {
  return (
    <div style={{ flex: 1, minWidth: 220, background: C.panel, border: `1px solid ${C.panelEdge}`, borderRadius: 8, padding: "10px 14px" }}>
      <Eyebrow color={C.textDim}>{title}</Eyebrow>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 6 }}>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.amber }}>{marketLabel}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 22, color: C.amber }}>{marketVal}</div>
        </div>
        <div style={{ color: C.textDim, fontFamily: FONT_MONO }}>→</div>
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.ember }}>{modelLabel}</div>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 22, color: C.ember }}>{modelVal}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: C.textDim }}>Δ</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 15, fontWeight: 700, color: deltaColor }}>{delta}</div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// PLAYER COURT CONDITIONS + SCORECARD (right column)
// ----------------------------------------------------------------------------
function PlayerPanel({ selected, model }) {
  if (!selected) return (
    <div style={{ color: C.textDim, fontFamily: FONT_BODY, fontSize: 13, padding: 20, textAlign: "center" }}>
      Tap any node on the court to read its <span style={{ color: C.lime }}>Court Conditions</span> through that player's archetype.
    </div>
  );

  const teamColor = FAKE_GAME.teams[selected.team].color;
  const hasFull = selected.id === "x1";
  const sg = model.sg;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <Eyebrow color={teamColor}>{FAKE_GAME.teams[selected.team].name} · {selected.archCode.replace(/_/g, " ")}</Eyebrow>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22, color: C.text, lineHeight: 1.1, marginTop: 2 }}>{selected.name}</div>
        <div style={{ fontFamily: FONT_BODY, fontSize: 12, color: C.textDim }}>{selected.archetype}</div>
        <div style={{ display: "inline-block", marginTop: 7, padding: "3px 10px", borderRadius: 999,
          border: `1px solid ${selected.lens?.tint || C.chalkDim}`, color: selected.lens?.tint || C.chalk,
          fontFamily: FONT_MONO, fontSize: 10, letterSpacing: "0.08em" }}>{selected.label}</div>
      </div>

      {/* lens read */}
      {selected.lens && (
        <div style={{ background: C.voidLift, border: `1px solid ${C.panelEdge}`, borderRadius: 8, padding: "10px 12px" }}>
          <Eyebrow color={selected.lens.tint}>Archetype lens · {selected.lens.headline}</Eyebrow>
          <ul style={{ margin: "6px 0 0", paddingLeft: 16, color: C.text, fontFamily: FONT_BODY, fontSize: 12.5, lineHeight: 1.5 }}>
            {selected.lens.read.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      {/* conditions */}
      <div style={{ background: C.panel, border: `1px solid ${C.panelEdge}`, borderRadius: 8, padding: "10px 14px" }}>
        <Eyebrow>Player Court Conditions</Eyebrow>
        <div style={{ marginTop: 6 }}>
          {hasFull ? (
            <>
              <Stat label="Normal PTS par" value={sg.normalPar} />
              <Stat label="Market PTS par" value={sg.marketPar} accent={C.amber} />
              <Stat label="Lineup court par" value={sg.lineupPar} accent={C.ember} />
              <Stat label="Suppression" value={`${(sg.supp * 100).toFixed(1)}%`} accent={C.crimson} />
              <Stat label="Court fit / difficulty" value={`${selected.fit} / ${selected.difficulty}`} />
              <Stat label="Court slope" value={selected.slope} accent={C.purple} />
              <Stat label="Exp · actual poss" value={`${sg.expPoss} · ${sg.actPoss}`} />
              <Stat label="Market par /100" value={sg.marketParPer100} accent={C.amber} />
              <Stat label="Lineup par /100" value={sg.lineupParPer100} accent={C.ember} />
              <Stat label="Actual /100" value={sg.actualPer100} accent={C.text} />
            </>
          ) : selected.conditions ? (
            Object.entries(selected.conditions).map(([k, v]) => (
              <Stat key={k} label={k.replace(/([A-Z])/g, " $1")} value={String(v)} />
            ))
          ) : (
            <>
              <Stat label="Court fit" value={selected.fit} accent={C.blueprint} />
              <Stat label="Court difficulty" value={selected.difficulty} accent={C.crimson} />
              <Stat label="Expected minutes" value={selected.minutes} />
              <div style={{ marginTop: 8, fontFamily: FONT_BODY, fontSize: 11.5, color: C.textDim }}>
                Full market/possession par fills in for this archetype once Phase 3 odds land.
              </div>
            </>
          )}
        </div>
      </div>

      {/* scorecard — only the player with a full result gets the stamp */}
      {hasFull && (
        <div style={{ background: `linear-gradient(180deg, ${C.voidLift}, ${C.panel})`, border: `1px solid ${C.panelEdge}`,
          borderRadius: 10, padding: "14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <Eyebrow color={C.ember}>Court Scorecard</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <OutcomeStamp text="BEAT THE COURT" sub={`+${sg.beatLineup} PER 100`} />
            <ConfidenceRing value={selected.confidence} size={56} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
            <Stat label="Court type" value={FAKE_GAME.game.courtType} />
            <Stat label="Player label" value="Plus-Handicap Test" accent={C.purple} />
            <Stat label="Market par" value={sg.marketPar} accent={C.amber} />
            <Stat label="Lineup par" value={sg.lineupPar} accent={C.ember} />
            <Stat label="Actual" value={sg.actual} accent={C.text} />
            <Stat label="Beat market /100" value={`+${sg.beatMarket}`} accent={C.amber} />
            <Stat label="Beat lineup /100" value={`+${sg.beatLineup}`} accent={C.ember} />
            <Stat label="Confidence" value={`${Math.round(selected.confidence * 100)}%`} />
          </div>
          <div style={{ fontFamily: FONT_BODY, fontSize: 11, color: C.textDim, lineHeight: 1.5 }}>
            Headline stamp = lineup-adjusted court beat per 100 (actual {sg.actualPer100} − lineup par {sg.lineupParPer100}).
            Market court beat is +{sg.beatMarket}. Both flow from the formula registry; see Phase 2 notes for the
            +6.5 vs +8.6 reconciliation.
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// GLOSSARY OVERLAY
// ----------------------------------------------------------------------------
const GLOSSARY = [
  ["Court", "The full basketball environment — market, lineup, archetype, matchup, pace, rest, leverage — not just the hardwood."],
  ["Par", "Expected performance for an average player/team in this exact context. Raw stats mean nothing without it."],
  ["Market Court", "The court the betting market sets: spread, total, implied totals, expected possessions, market PPP."],
  ["Starting Lineup Court", "How the confirmed five bends the court before tip — its own adjusted spread and total."],
  ["Court Fit", "0–100 compatibility between a player's archetype and tonight's court."],
  ["Court Difficulty", "0–100 difficulty of the assignment, distinct from fit."],
  ["Court Slope", "How much the context separates elite from replacement. High-slope possessions reveal skill."],
  ["Lineup-Adjusted Par", "Par after the starting lineup reshapes the scoring environment."],
  ["Beat the Court", "Actual output minus court-adjusted par. The whole point."],
  ["Confidence Ring", "Every number ships with a 0–1 trust score, shown as ring completeness — never a generic pill."],
];
function GlossaryOverlay({ open, onClose }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(3,5,9,0.78)", zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560, width: "100%", maxHeight: "82vh", overflow: "auto",
        background: C.panel, border: `1px solid ${C.panelEdge}`, borderRadius: 12, padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 20, color: C.text, letterSpacing: "0.04em" }}>COURT HANDICAP — A NEW LANGUAGE</div>
          <button onClick={onClose} style={{ background: "none", border: `1px solid ${C.panelEdge}`, color: C.textDim, borderRadius: 6, cursor: "pointer", padding: "4px 9px", fontFamily: FONT_MONO }}>esc</button>
        </div>
        {GLOSSARY.map(([term, def]) => (
          <div key={term} style={{ padding: "9px 0", borderBottom: `1px solid ${C.chalkFaint}` }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 15, color: C.lime, letterSpacing: "0.03em" }}>{term}</div>
            <div style={{ fontFamily: FONT_BODY, fontSize: 13, color: C.text, lineHeight: 1.5, marginTop: 2 }}>{def}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// APP
// ----------------------------------------------------------------------------
export default function CourtHandicapPrototype() {
  const model = useCourtModel();
  const [selectedId, setSelectedId] = useState("x1");
  const [glossary, setGlossary] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    }
  }, []);

  const selected = FAKE_GAME.players.find((p) => p.id === selectedId) || null;
  const tiltLabel = `${Math.abs(model.tilt.tiltDeg)}° → Team ${model.tilt.tiltDeg <= 0 ? "X" : "Y"}`;

  return (
    <div style={{ background: C.void, minHeight: "100vh", color: C.text, fontFamily: FONT_BODY, padding: "0 0 40px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
        * { box-sizing: border-box; } ::selection { background: rgba(255,92,42,0.3); }`}</style>

      {/* product header — its own home */}
      <header style={{ borderBottom: `1px solid ${C.panelEdge}`, padding: "14px 22px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, letterSpacing: "0.12em", fontSize: 18 }}>
          GINGEBALL <span style={{ color: C.ember }}>COURT HANDICAP</span>
        </div>
        <nav style={{ display: "flex", gap: 14, fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>
          {["games", "players", "teams", "lineups", "roles", "leaderboards"].map((x) => (
            <span key={x} style={{ opacity: 0.6 }}>/{x}</span>
          ))}
        </nav>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <button onClick={() => setReduced((v) => !v)} title="Toggle reduced motion"
            style={{ background: reduced ? C.panel : "none", border: `1px solid ${C.panelEdge}`, color: reduced ? C.lime : C.textDim,
              borderRadius: 6, cursor: "pointer", padding: "5px 10px", fontFamily: FONT_MONO, fontSize: 10.5 }}>
            {reduced ? "motion: off" : "motion: on"}
          </button>
          <button onClick={() => setGlossary(true)}
            style={{ background: "none", border: `1px solid ${C.lime}`, color: C.lime, borderRadius: 6, cursor: "pointer",
              padding: "5px 12px", fontFamily: FONT_MONO, fontSize: 10.5, letterSpacing: "0.06em" }}>glossary</button>
        </div>
      </header>

      {/* title strip */}
      <div style={{ padding: "16px 22px 6px", display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <Eyebrow color={C.amber}>{FAKE_GAME.game.label} · prototype</Eyebrow>
        <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 26, letterSpacing: "0.02em" }}>{FAKE_GAME.game.matchup}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.textDim }}>{FAKE_GAME.game.courtType}</div>
      </div>

      {/* rails */}
      <div style={{ display: "flex", gap: 12, padding: "8px 22px", flexWrap: "wrap" }}>
        <Rail title="Spread Rail" marketLabel="MARKET" marketVal={`X ${FAKE_GAME.market.homeSpread}`}
          modelLabel="LINEUP" modelVal={`X ${FAKE_GAME.lineup.adjustedSpread}`}
          delta={`${model.tilt.tiltDelta <= 0 ? "" : "+"}${(FAKE_GAME.lineup.adjustedSpread - FAKE_GAME.market.homeSpread).toFixed(1)}`}
          deltaColor={C.blueprint} />
        <Rail title="Total Rail" marketLabel="MARKET" marketVal={FAKE_GAME.market.total}
          modelLabel="LINEUP" modelVal={FAKE_GAME.lineup.adjustedTotal}
          delta={`${(FAKE_GAME.lineup.adjustedTotal - FAKE_GAME.market.total).toFixed(1)}`} deltaColor={C.crimson} />
        <div style={{ flex: 1, minWidth: 200, background: C.panel, border: `1px solid ${C.panelEdge}`, borderRadius: 8, padding: "10px 14px" }}>
          <Eyebrow>Court Tilt Engine</Eyebrow>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
            <div style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, fontSize: 22, color: C.ember }}>{tiltLabel}</div>
            <div style={{ flex: 1, height: 8, background: C.voidLift, borderRadius: 4, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 2, background: C.chalkDim }} />
              <div style={{ position: "absolute", top: 0, bottom: 0, background: C.ember,
                width: `${Math.min(50, Math.abs(model.tilt.tiltDeg) / 6 * 50)}%`,
                right: model.tilt.tiltDeg <= 0 ? "50%" : "auto", left: model.tilt.tiltDeg <= 0 ? "auto" : "50%",
                transition: reduced ? "none" : "width .5s ease" }} />
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, color: C.textDim, marginTop: 4 }}>deterministic from lineup-adjusted spread</div>
        </div>
      </div>

      {/* main: court + panel */}
      <div style={{ display: "flex", gap: 16, padding: "10px 22px", alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 560px", minWidth: 320, background: C.voidLift, border: `1px solid ${C.panelEdge}`, borderRadius: 12, padding: 10 }}>
          <CourtGraph model={model} selected={selected} onSelect={setSelectedId} reduced={reduced} />
          <div style={{ display: "flex", gap: 16, justifyContent: "center", padding: "8px 0 2px", flexWrap: "wrap" }}>
            {[["offensive synergy", C.blueprint, false], ["defensive synergy", C.crimson, false], ["spacing hazard", C.purple, true],
              ["court fit", C.blueprint, false], ["court difficulty", C.crimson, false]].map(([l, col, dash]) => (
              <span key={l} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontFamily: FONT_MONO, fontSize: 9.5, color: C.textDim }}>
                <span style={{ width: 16, height: 0, borderTop: `2px ${dash ? "dashed" : "solid"} ${col}` }} />{l}
              </span>
            ))}
          </div>
        </div>
        <div style={{ flex: "1 1 320px", minWidth: 300, maxWidth: 440 }}>
          <PlayerPanel selected={selected} model={model} />
        </div>
      </div>

      {/* footing note */}
      <div style={{ padding: "10px 22px", fontFamily: FONT_MONO, fontSize: 10, color: C.textDim, lineHeight: 1.6 }}>
        FIXTURE-DRIVEN PROTOTYPE · no live data · all values computed from FAKE_GAME via the Phase 1 formula registry
        (CH-MKT-001/002/003/005, CH-PLR-001/002/003) · select a different player to watch the same game become a different court.
      </div>

      <GlossaryOverlay open={glossary} onClose={() => setGlossary(false)} />
    </div>
  );
}
