import React, { useState } from "react";

// =============================================================================
// COURT HANDICAP — TYPE SEARCH  (a specimen you can feel)
//
// Five type VOICES applied to the same real Court Handicap moments so they can
// be compared directly. Every face here is free/OFL and loads live (Google
// Fonts). The discoveries that matter most are the ones where type CARRIES
// MEANING — wet paint = difficulty, spray = court markings, glitch = low
// confidence, marker = a human annotation. Pick one (or a mix) and I'll rebuild
// the four objects in it.
// =============================================================================

const C = {
  void: "#09090B", pitch: "#0D0E14", bench: "#1A1C28", woodgrain: "#2A1C0C",
  chalk: "#F0EBE1", bone: "#968D82", fade: "#4A4744",
  ember: "#CF4E15", scoreboard: "#E49B18", blueprint: "#1B6BA8", bpText: "#5BA8D4",
  crimson: "#B32424", crText: "#CC6B6B", emberGlow: "rgba(207,78,21,0.12)", emberEdge: "rgba(207,78,21,0.28)",
};

// each VOICE assigns faces to product roles + says where each lives / what it means
const VOICES = {
  house: {
    name: "HOUSE", tag: "the current Gingeball stack — the baseline to beat",
    display: "'Big Shoulders Display',sans-serif", number: "'Big Shoulders Display',sans-serif",
    label: "'Syne',sans-serif", mono: "'Syne Mono',monospace", stamp: "'Rubik Dirt',sans-serif",
    annot: "'Syne',sans-serif", annotStyle: { fontStyle: "italic" },
    notes: ["Big Shoulders — titles & numbers", "Syne — UI / labels", "Syne Mono — glyphs / formulas", "Rubik Dirt — verdict stamp"],
  },
  wet: {
    name: "WET COURT", tag: "distressed faces used for what they MEAN — my recommendation",
    display: "'Bricolage Grotesque',sans-serif", number: "'Anton',sans-serif",
    label: "'Rubik Spray Paint',sans-serif", mono: "'Space Mono',monospace", stamp: "'Rubik Dirt',sans-serif",
    annot: "'Caveat',cursive", difficulty: "'Rubik Wet Paint',sans-serif",
    notes: ["Bricolage Grotesque — titles, characterful not corporate", "Anton — the verdict number, heavy", "Rubik Spray Paint — court markings / labels", "Rubik Wet Paint — difficulty words (literally wet paint)", "Caveat — the human annotation", "Space Mono — formulas"],
  },
  press: {
    name: "PRESS ROW", tag: "editorial / magazine gravity — serif verdict is the risk",
    display: "'Anton',sans-serif", number: "'Archivo Black',sans-serif",
    label: "'Bricolage Grotesque',sans-serif", mono: "'Space Mono',monospace", stamp: "'Anton',sans-serif",
    annot: "'Instrument Serif',serif", annotStyle: { fontStyle: "italic" }, serifVerdict: "'Fraunces',serif",
    notes: ["Anton — condensed display", "Archivo Black — numbers", "Fraunces — a serif verdict (gravity, risk)", "Instrument Serif — editorial annotation", "Bricolage — labels"],
  },
  warroom: {
    name: "WAR ROOM", tag: "xerox + marker — the obsessive's wall; the market 'wrong'",
    display: "'Big Shoulders Display',sans-serif", number: "'Anton',sans-serif",
    label: "'Martian Mono',monospace", mono: "'Martian Mono',monospace", stamp: "'Rubik Dirt',sans-serif",
    annot: "'Permanent Marker',cursive", degraded: "'Redacted Script',cursive",
    notes: ["Big Shoulders — title", "Anton — verdict number", "Redacted Script — the superseded market number (degraded)", "Permanent Marker — hand annotations", "Martian Mono — technical/glyphs"],
  },
  blacktop: {
    name: "BLACKTOP", tag: "playground / graffiti energy — loudest, most dangerous",
    display: "'Rubik Spray Paint',sans-serif", number: "'Bebas Neue',sans-serif",
    label: "'Rubik Marker Hatch',sans-serif", mono: "'Space Mono',monospace", stamp: "'Rubik Spray Paint',sans-serif",
    annot: "'Permanent Marker',cursive", lowconf: "'Rubik Glitch',sans-serif",
    notes: ["Rubik Spray Paint — title / court paint", "Bebas Neue — tall numbers", "Rubik Marker Hatch — labels", "Rubik Glitch — low-confidence reads (broken)", "Permanent Marker — annotation"],
  },
};

function Cell({ label, children, w }) {
  return (
    <div style={{ border: `1px solid rgba(255,255,255,0.08)`, background: C.void, padding: "12px 14px", position: "relative", minWidth: w }}>
      <div style={{ fontFamily: "'Syne Mono',monospace", fontSize: 8.5, letterSpacing: ".16em", textTransform: "uppercase", color: C.fade, marginBottom: 8 }}>{label}</div>
      {children}
    </div>
  );
}

export default function CourtHandicapTypeSearch() {
  const [v, setV] = useState("wet");
  const V = VOICES[v];
  return (
    <div style={{ background: C.pitch, minHeight: "100vh", color: C.chalk, fontFamily: "'Syne',sans-serif", padding: "22px 20px 50px" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=Syne:wght@400;600;700;800&family=Syne+Mono&family=Rubik+Dirt&family=Bricolage+Grotesque:wght@400;700;800&family=Anton&family=Archivo+Black&family=Rubik+Spray+Paint&family=Rubik+Wet+Paint&family=Rubik+Marker+Hatch&family=Rubik+Glitch&family=Space+Mono:wght@400;700&family=Martian+Mono:wght@400;700&family=Caveat:wght@600;700&family=Permanent+Marker&family=Instrument+Serif:ital@0;1&family=Fraunces:ital,wght@0,600;1,600&family=Redacted+Script:wght@400;700&family=Bebas+Neue&display=swap');
        *{box-sizing:border-box}`}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ fontFamily: "'Syne Mono',monospace", fontSize: 10, letterSpacing: ".2em", color: C.ember }}>COURT HANDICAP · TYPE SEARCH</div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, color: C.bone, fontStyle: "italic", marginBottom: 14 }}>same words, five voices — find the one with a pulse</div>

        {/* voice toggle */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {Object.entries(VOICES).map(([k, vo]) => (
            <button key={k} onClick={() => setV(k)} style={{ cursor: "pointer", padding: "8px 13px", textAlign: "left",
              border: `1px solid ${v === k ? C.emberEdge : "rgba(255,255,255,0.1)"}`, background: v === k ? C.emberGlow : "transparent", color: v === k ? C.ember : C.bone }}>
              <div style={{ fontFamily: "'Syne Mono',monospace", fontSize: 11, letterSpacing: ".1em" }}>{vo.name}</div>
            </button>
          ))}
        </div>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, color: C.chalk, marginBottom: 6 }}><b style={{ color: C.ember }}>{V.name}</b> — {V.tag}</div>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontFamily: "'Syne Mono',monospace", fontSize: 9, color: C.bone, marginBottom: 18 }}>
          {V.notes.map((n) => <span key={n}>· {n}</span>)}
        </div>

        {/* VERDICT — the hero moment */}
        <div style={{ border: `1px solid ${C.emberEdge}`, borderTop: `3px solid ${C.ember}`, background: C.void, padding: "18px 20px", marginBottom: 16, position: "relative", overflow: "hidden" }}>
          <span style={{ position: "absolute", right: -8, bottom: -40, fontFamily: V.number, fontSize: 170, color: "transparent", WebkitTextStroke: "1.5px rgba(207,78,21,0.08)" }}>+8.6</span>
          <div style={{ fontFamily: "'Syne Mono',monospace", fontSize: 9, letterSpacing: ".16em", color: C.bone, textTransform: "uppercase" }}>the market set the trap — the player escaped it</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginTop: 4 }}>
            <div style={{ fontFamily: V.serifVerdict || V.stamp, fontSize: V.serifVerdict ? 40 : 34, color: C.ember, textTransform: "uppercase", lineHeight: 0.9, fontStyle: V.serifVerdict ? "italic" : "normal" }}>Beat the Court</div>
            <div style={{ fontFamily: V.number, fontSize: 92, color: C.chalk, lineHeight: 0.8, marginLeft: "auto", letterSpacing: V.number.includes("Bebas") ? "0" : "-.03em" }}>+8.6</div>
          </div>
          <div style={{ fontFamily: V.mono, fontSize: 11, color: C.bone, marginTop: 8, borderTop: `2px solid ${C.ember}`, paddingTop: 6 }}>actual 43.3 − lineup par 34.7 / 100 · Gingeball has ruled</div>
        </div>

        {/* grid of moments */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Cell label="market burn · center court numbers">
            <div style={{ fontFamily: V.number, fontSize: 58, color: C.chalk, lineHeight: 0.9 }}>103<span style={{ color: C.scoreboard }}>·</span>99</div>
            <div style={{ fontFamily: V.mono, fontSize: 10, color: C.scoreboard, marginTop: 2 }}>PAR STAMPED · O/U 202 · PPP 1.163</div>
          </Cell>

          <Cell label="the overwrite · lineup rewrote par">
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: V.degraded || V.number, fontSize: 40, color: C.bone, position: "relative" }}>24.5
                <span style={{ position: "absolute", left: -4, right: -4, top: "55%", height: 3, background: C.crimson, transform: "rotate(-4deg)" }} /></span>
              <span style={{ fontFamily: V.annot, fontSize: 40, color: C.ember, ...(V.annotStyle || {}) }}>23.1</span>
            </div>
            <div style={{ fontFamily: V.annot, fontSize: 18, color: C.crText, marginTop: 4, ...(V.annotStyle || {}) }}>lineup changed the court</div>
          </Cell>

          <Cell label="courtgraph labels · zones & state">
            <div style={{ fontFamily: V.difficulty || V.label, fontSize: 26, color: C.crText, lineHeight: 1.05 }}>TRAP COURT</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6, fontFamily: V.label, fontSize: 13, color: C.bone, letterSpacing: ".04em" }}>
              <span>CREATION</span><span>MATCHUP</span><span>SPACING</span><span style={{ color: C.bpText }}>RIM RELIEF</span>
            </div>
          </Cell>

          <Cell label="formulas / glyphs / confidence">
            <div style={{ fontFamily: V.mono, fontSize: 13, color: C.chalk }}>par = base − env − matchup − lineup</div>
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {[["GRADE", C.ember], ["FIT 38", C.bpText], ["DIFF 86", C.crText]].map(([t, col]) => (
                <span key={t} style={{ fontFamily: V.mono, fontSize: 10, letterSpacing: ".1em", color: col, border: `1px solid ${col}55`, padding: "2px 7px" }}>{t}</span>
              ))}
              <span style={{ fontFamily: (V.lowconf || V.mono), fontSize: 12, color: C.crText, padding: "2px 4px" }}>34% CONF</span>
            </div>
          </Cell>

          <Cell label="player court conditions · plate name" w={"100%"}>
            <div style={{ background: C.woodgrain, padding: "10px 12px", border: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontFamily: V.display, fontSize: 26, color: C.chalk, textTransform: "uppercase", lineHeight: 0.95, fontWeight: 800 }}>Star Scoring Guard</div>
              <div style={{ fontFamily: V.annot, fontSize: 16, color: C.bone, marginTop: 2, ...(V.annotStyle || {}) }}>pressure-rim midrange assassin</div>
            </div>
          </Cell>

          <Cell label="handwritten annotation · the obsessive's note" w={"100%"}>
            <div style={{ fontFamily: V.annot, fontSize: 22, color: C.chalk, ...(V.annotStyle || {}) }}>same game, different court — he beat the trap</div>
          </Cell>
        </div>
      </div>
    </div>
  );
}
