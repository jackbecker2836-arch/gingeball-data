"use client";
import React, { useEffect, useRef, useState } from "react";
import type { CourtGraphView } from "@/lib/manifest-view-model";
import { C } from "./tokens";
import { nodeBasisTag } from "./ui-labels";
import { prefersReducedMotion, possessionBeadDelayMs, GENESIS_ACT_STEP_MS, INTERNAL_MARKS } from "./motion";

// 01 · COURTGRAPH — the signature object. The court IS the graph: a hand-drawn
// proof surface that draws itself in across five acts. Every mark is sourced
// from CourtGraphView; nothing about the data is hardcoded here (geometry of the
// warp/seam is presentation derived from each player's mood + position).
const ACTS = ["MARKET", "LINEUP", "ARCHETYPE", "PROOF", "VERDICT"] as const;
const VB_W = 1000, VB_H = 540, PAR_Y = 250;

const centroid = (pts: { x: number; y: number }[]) =>
  pts.length ? { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length } : { x: 0, y: 0 };

export function CourtGraph({ view, onSelect }: { view: CourtGraphView; onSelect: (id: string) => void }) {
  const [act, setAct] = useState(4);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const play = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    // Reduced-motion: skip the staged reveal and show the truthful end-state at once.
    if (prefersReducedMotion()) { setAct(4); return; }
    setAct(0);
    ACTS.forEach((_, i) => i > 0 && timers.current.push(setTimeout(() => setAct(i), i * GENESIS_ACT_STEP_MS)));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const xs = view.players.filter((p) => p.team === "X");
  const ys = view.players.filter((p) => p.team === "Y");
  const cx = centroid(xs.map((p) => p.pos)), cy = centroid(ys.map((p) => p.pos));
  const sel = view.players.find((p) => p.id === view.selectedPlayerId) ?? view.players[0];
  const moodCol = (m: string) => (m === "trap" ? C.crText : m === "relief" ? C.bpText : C.bone);
  const byId = (id: string) => view.players.find((p) => p.id === id);
  const beat = view.scarBeatPer100, won = beat > 0.05;

  return (
    <div className="ch-anim" style={{ background: C.pitch, border: `1px solid ${C.hairline}`, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 12, left: 16, zIndex: 2, fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 12, letterSpacing: ".16em", color: C.bone }}>
        THE COURTGRAPH <span style={{ color: C.fade, fontWeight: 400 }}>· {view.courtType}</span>
      </div>
      <div style={{ position: "absolute", top: 10, right: 14, zIndex: 2, display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end", maxWidth: 360 }}>
        <button onClick={play} style={{ fontFamily: "var(--f-stamp)", fontSize: 12, color: C.ember, background: C.emberGlow, border: `1px solid ${C.emberEdge}`, padding: "3px 9px", cursor: "pointer" }}>▶ genesis</button>
        {ACTS.map((a, i) => (
          <button key={a} onClick={() => setAct(i)} style={{
            fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: ".06em", padding: "3px 7px", cursor: "pointer",
            color: act === i ? C.void : C.bone, background: act === i ? C.scoreboard : "transparent", border: `1px solid ${act >= i ? C.emberEdge : C.hairline}`,
          }}>{i + 1}·{a}</button>
        ))}
      </div>

      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} style={{ width: "100%", display: "block" }}>
        <defs>
          <radialGradient id="ch-burn" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(228,155,24,0.5)" />
            <stop offset="45%" stopColor="rgba(207,78,21,0.22)" />
            <stop offset="100%" stopColor="rgba(207,78,21,0)" />
          </radialGradient>
        </defs>

        {/* court outline — hand-drawn double pass (mark: court geometry) */}
        <g stroke={C.fade} strokeWidth="1.4" fill="none" opacity="0.55" strokeLinecap="round" style={{ animation: "ch-up .5s ease both", animationDelay: `${INTERNAL_MARKS.courtGeometry}ms` }}>
          <path d="M 40 40 C 320 34, 680 36, 960 42 C 966 200, 964 360, 958 500 C 660 506, 320 504, 44 498 C 38 360, 36 200, 40 40 Z" />
          <line x1="500" y1="40" x2="500" y2="500" strokeDasharray="2 6" />
          <circle cx="500" cy="270" r="74" />
        </g>

        {/* ACT 1 — THE BURN */}
        {act >= 0 && (
          <g style={{ animation: "ch-pop .6s ease both" }}>
            <circle cx="500" cy="270" r="150" fill="url(#ch-burn)" />
            <text x="500" y="262" textAnchor="middle" style={{ fontFamily: "var(--f-num)", fontSize: 76, fill: C.chalk }}>
              {view.burnImplied.home}<tspan fill={C.scoreboard}>·</tspan>{view.burnImplied.away}
            </text>
            <text x="500" y="292" textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: ".2em", fill: C.ember }}>THE BURN</text>
          </g>
        )}

        {/* ACT 2 — THE SEAMS (bend toward each lineup's center of mass = lineup tension) */}
        {act >= 1 && (
          <g fill="none" strokeWidth="1.3" opacity="0.5" style={{ animation: "ch-up .5s ease both", animationDelay: `${INTERNAL_MARKS.lineupNodes}ms` }}>
            <path d={`M 120 90 Q ${cx.x} ${cx.y}, 120 460`} stroke={C.bpText} />
            <path d={`M 880 90 Q ${cy.x} ${cy.y}, 880 460`} stroke={C.crText} />
          </g>
        )}

        {/* ACT 2 — synergies */}
        {act >= 1 && view.synergies.map((s, i) => {
          const a = byId(s.a), b = byId(s.b); if (!a || !b) return null;
          const col = s.type === "offense" ? C.blueprint : s.type === "defense" ? C.crimson : C.scoreboard;
          return <line key={i} x1={a.pos.x} y1={a.pos.y} x2={b.pos.x} y2={b.pos.y} stroke={col} strokeWidth={s.type === "hazard" ? 2 : 1.3} strokeDasharray={s.type === "hazard" ? "4 4" : undefined} opacity="0.6" style={{ animation: "ch-up .5s ease both", animationDelay: `${s.type === "hazard" ? INTERNAL_MARKS.pressureField : INTERNAL_MARKS.lineupNodes}ms` }} />;
        })}

        {/* ACT 3 — THE TRANSLATION: warp at selected player, sized by difficulty */}
        {act >= 2 && sel && (() => {
          const r = 34 + (Math.max(0, Math.min(100, sel.difficulty)) / 100) * 48; // magnitude-driven
          return (
            <g style={{ animation: "ch-pop .5s ease both", animationDelay: `${INTERNAL_MARKS.archetypeLens}ms` }}>
              {sel.mood === "trap" && <circle cx={sel.pos.x} cy={sel.pos.y} r={r} fill="none" stroke={C.crimson} strokeWidth="2" strokeDasharray="3 6" opacity="0.7" />}
              {sel.mood === "relief" && <circle cx={sel.pos.x} cy={sel.pos.y} r={r} fill={`${C.blueprint}22`} stroke={C.bpText} strokeWidth="1.5" opacity="0.7" />}
              {sel.id === view.selectedPlayerId && (
                <text x={sel.pos.x} y={sel.pos.y - r - 6} textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 10, fill: sel.mood === "trap" ? C.crText : C.bpText }}>
                  DIFF {sel.difficulty} · FIT {sel.fit}{sel.slopeDirection ? ` · ${sel.slopeDirection}` : ""}
                </text>
              )}
              {sel.id === view.selectedPlayerId && (
                <text x={sel.pos.x} y={sel.pos.y - r - 18} textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 8, letterSpacing: ".1em", fill: sel.modeled ? "#357A4E" : C.fade }}>
                  {nodeBasisTag(!!sel.modeled).label.toUpperCase()}
                </text>
              )}
            </g>
          );
        })()}

        {/* ACT 4 — THE TRAIL: every mark is a possession that proves the verdict.
            made (relief blue) rises by value; a made bucket that clears the court
            scars upward; misses fade; turnovers leave a dead red notch; passes are
            faint ticks. Meaning, not decoration. */}
        {act >= 3 && (() => {
          const n = view.proofTrail.length;
          return view.proofTrail.map((e, i) => {
            const x = 120 + i * (760 / Math.max(1, n - 1));
            // beads accrue in order — proof accumulating, capped so it never drags.
            // treatment mirrors possessionResultMotion(e.outcome): nothing celebrates.
            const d = `${possessionBeadDelayMs(i, { baseMs: INTERNAL_MARKS.proofTrail, stepMs: 24, capMs: 700 })}ms`;
            if (e.outcome === "turnover")
              return <line key={i} x1={x} y1="512" x2={x} y2="520" stroke={C.crText} strokeWidth="2.4" strokeLinecap="round" opacity="0.85" style={{ animation: "ch-up .35s ease both", animationDelay: d }} />;
            if (e.outcome === "pass")
              return <line key={i} x1={x} y1="512" x2={x} y2="508" stroke={C.bone} strokeWidth="1.6" strokeLinecap="round" opacity="0.12" />;
            if (e.points > 0) {
              const h = 6 + e.points * 9;                 // value -> reach
              const col = e.pressure === "hostile" ? C.scoreboard : C.bpText; // proof under fire glows gold
              return <line key={i} x1={x} y1="512" x2={x} y2={512 - h} stroke={col} strokeWidth={e.beatsCourt ? 3.2 : 2.4} strokeLinecap="round" opacity="0.96" style={{ animation: "ch-up .4s ease both", animationDelay: d }} />;
            }
            return <line key={i} x1={x} y1="512" x2={x} y2="506" stroke={C.bone} strokeWidth="2" strokeLinecap="round" opacity="0.28" style={{ animation: "ch-up .3s ease both", animationDelay: d }} />;
          });
        })()}

        {/* player nodes */}
        {act >= 1 && view.players.map((p) => {
          const isSel = p.id === view.selectedPlayerId;
          return (
            <g key={p.id} onClick={() => onSelect(p.id)} style={{ cursor: "pointer", animation: "ch-pop .4s ease both", animationDelay: `${INTERNAL_MARKS.lineupNodes}ms` }}>
              {p.hazard && <circle cx={p.pos.x} cy={p.pos.y} r="17" fill="none" stroke={C.scoreboard} strokeWidth="1" strokeDasharray="2 3" opacity="0.8" style={{ animation: "ch-up .4s ease both", animationDelay: `${INTERNAL_MARKS.pressureField}ms` }} />}
              <circle cx={p.pos.x} cy={p.pos.y} r={isSel ? 13 : 10} fill={C.pitch} stroke={isSel ? C.chalk : moodCol(p.mood)} strokeWidth={isSel ? 3 : 2} />
              <text x={p.pos.x} y={p.pos.y + 4} textAnchor="middle" style={{ fontFamily: "var(--f-num)", fontSize: 12, fill: isSel ? C.chalk : C.bone }}>{p.code}</text>
              {isSel && <text x={p.pos.x} y={p.pos.y - 20} textAnchor="middle" style={{ fontFamily: "var(--f-label)", fontSize: 13, fill: moodCol(p.mood) }}>{p.label}</text>}
            </g>
          );
        })}

        {/* ACT 5 — THE SCAR + par line (mark: par scar) */}
        {act >= 4 && (
          <g style={{ animation: "ch-up .6s ease both", animationDelay: `${INTERNAL_MARKS.parScar}ms` }}>
            <line x1="120" y1={PAR_Y} x2="880" y2={PAR_Y} stroke={C.crText} strokeWidth="1.4" strokeDasharray="2 6" opacity="0.7" />
            <text x="884" y={PAR_Y + 4} style={{ fontFamily: "var(--f-mono)", fontSize: 11, fill: C.crText }}>PAR</text>
            {sel && (
              <path
                d={won
                  ? `M ${sel.pos.x} ${sel.pos.y} C ${sel.pos.x - 12} ${(sel.pos.y + PAR_Y) / 2}, ${sel.pos.x + 10} ${PAR_Y + 10}, ${sel.pos.x + 4} ${PAR_Y - 60}`
                  : `M ${sel.pos.x} ${sel.pos.y} C ${sel.pos.x - 6} ${sel.pos.y - 12}, ${sel.pos.x + 4} ${PAR_Y + 18}, ${sel.pos.x} ${PAR_Y + 12}`}
                fill="none" stroke={won ? C.ember : C.crText} strokeWidth="3.4" strokeLinecap="round" />
            )}
          </g>
        )}
      </svg>

      <div style={{ position: "absolute", bottom: 8, left: 16, right: 16, display: "flex", justifyContent: "space-between", fontFamily: "var(--f-mono)", fontSize: 8.5, color: C.fade }}>
        <span>selected: <span style={{ color: moodCol(sel?.mood ?? "neutral") }}>{sel?.name}</span></span>
        <span>warp = difficulty magnitude (engine for modeled · fixture for others)</span>
      </div>
    </div>
  );
}
