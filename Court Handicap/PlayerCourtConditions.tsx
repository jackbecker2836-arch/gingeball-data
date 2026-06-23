"use client";
import React, { useEffect, useRef, useState } from "react";
import type { ConditionsView } from "@/lib/manifest-view-model";
import { C } from "./tokens";

// 03 · PLAYER COURT CONDITIONS — THE TRANSLATION.
// Renders the studied player's par ladder. CRITICAL HONESTY: marketPar + actual
// are engine-backed (solid); lineupPar + fit/difficulty/slope are fixture values
// awaiting the Phase 4/5 engines — they render with a dotted "pending" treatment
// so the interface never implies they are computed.
const PENDING = `1px dotted ${C.bone}`;

export function PlayerCourtConditions({ view }: { view: ConditionsView }) {
  const lo = 20, hi = 31, h = 150;
  const Y = (v: number) => h - ((v - lo) / (hi - lo)) * h;
  const rows: { k: string; v: number; col: string; struck?: boolean; pending?: boolean; note: string }[] = [
    { k: "NORMAL", v: view.normalPar, col: C.bone, note: "baseline scoring par before tonight" },
    { k: "MARKET", v: view.marketPar, col: C.scoreboard, struck: true, note: "what the market's pace + total implied (engine)" },
    { k: "LINEUP", v: view.lineupPar, col: C.crText, note: `lineup engine: ${view.lineupAdjustment > 0 ? "+" : ""}${view.lineupAdjustment} pts (${(view.lineupSuppressionPct * 100).toFixed(1)}%), conf ${Math.round(view.lineupConfidence * 100)}%` },
    { k: "ACTUAL", v: view.actual, col: C.ember, note: "what he actually did (engine, from box + on-court poss)" },
  ];
  const [step, setStep] = useState(4);
  const [insp, setInsp] = useState(3);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const play = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setStep(0); setInsp(-1);
    [1, 2, 3, 4].forEach((n, i) => timers.current.push(setTimeout(() => { setStep(n); if (n === 4) setInsp(3); }, 300 + i * 650)));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const chip = (label: string, col: string, pending: boolean) => (
    <span key={label} title={pending ? "fixture — pending engine" : "engine-backed"}
      style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, letterSpacing: ".08em", color: col, border: pending ? PENDING : `1px solid ${col}44`, padding: "2px 7px" }}>
      {label}{pending ? " ○" : ""}
    </span>
  );

  return (
    <div className="ch-anim" style={{ background: C.woodgrain, border: `1px solid rgba(255,255,255,.1)`, padding: "14px 18px 16px", position: "relative", overflow: "hidden", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(255,255,255,.022) 23px,rgba(255,255,255,.022) 24px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 12, right: 14, fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".18em", color: C.ember, border: `1px solid ${C.emberEdge}`, padding: "2px 7px" }}>THE TRANSLATION</div>

      <div style={{ position: "relative", marginBottom: 6 }}>
        <div style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: C.chalk, lineHeight: 0.95, maxWidth: 220 }}>{view.name}</div>
        <span style={{ fontFamily: "var(--f-label)", fontSize: 15, color: view.mood === "trap" ? C.crText : view.mood === "relief" ? C.bpText : C.bone, display: "inline-block", marginTop: 4, textTransform: "uppercase" }}>{view.label}</span>
      </div>
      <div style={{ position: "absolute", right: 16, top: 46, textAlign: "right" }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: C.bone }}>beat /100</span>
        <div style={{ fontFamily: "var(--f-num)", fontSize: 44, color: C.ember, lineHeight: 0.9 }}>+{view.actualPer100 - view.parPer100 > 0 ? "" : ""}{(view.actualPer100 - view.parPer100).toFixed(1)}</div>
      </div>

      <svg viewBox="0 0 360 172" style={{ width: "100%", position: "relative" }}>
        <line x1="20" y1={Y(view.lineupPar)} x2="320" y2={Y(view.lineupPar)} stroke={C.crText} strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
        <text x="322" y={Y(view.lineupPar) + 3} style={{ fontFamily: "var(--f-mono)", fontSize: 8, fill: C.crText }}>PAR</text>
        {rows.map((r, i) => {
          const x = 34 + i * 92, shown = step > i, active = insp === i;
          return (
            <g key={r.k} onClick={() => setInsp(i)} style={{ cursor: "pointer", opacity: shown ? 1 : 0, transition: "opacity .4s" }}>
              <line x1={x} y1={h} x2={x} y2={Y(r.v)} stroke={r.col} strokeWidth={r.k === "ACTUAL" ? 4 : 2} strokeLinecap="round" strokeDasharray={r.pending ? "3 3" : undefined} opacity={r.k === "ACTUAL" ? 1 : 0.78} />
              <circle cx={x} cy={Y(r.v)} r={active ? 6.5 : r.k === "ACTUAL" ? 5 : 3.5} fill={r.pending ? C.void : r.col} stroke={r.pending ? r.col : active ? C.chalk : "none"} strokeWidth="1.5" />
              <text x={x} y={Y(r.v) - 10} textAnchor="middle" style={{ fontFamily: "var(--f-num)", fontSize: 18, fill: r.col }}>{r.v}</text>
              {r.struck && <line x1={x - 15} y1={Y(r.v) - 15} x2={x + 15} y2={Y(r.v) - 19} stroke={C.crimson} strokeWidth="2.4" strokeLinecap="round" />}
              <text x={x} y={h + 16} textAnchor="middle" style={{ fontFamily: "var(--f-mono)", fontSize: 8, fill: active ? C.chalk : C.bone }}>{r.k}{r.pending ? " ○" : ""}</text>
            </g>
          );
        })}
      </svg>

      <div style={{ position: "relative", display: "flex", gap: 10, alignItems: "center", marginTop: 4, minHeight: 28 }}>
        <button onClick={play} style={{ fontFamily: "var(--f-stamp)", fontSize: 12, color: C.ember, background: C.emberGlow, border: `1px solid ${C.emberEdge}`, padding: "4px 10px", cursor: "pointer", textTransform: "uppercase" }}>▶ translation</button>
        <span style={{ fontFamily: "var(--f-annot)", fontSize: 16, color: insp >= 0 ? rows[insp].col : C.fade }}>{insp >= 0 ? rows[insp].note : "tap a marker to read the layer"}</span>
      </div>

      {/* lineup engine factor breakdown — the explanation of why par bent */}
      {view.lineupFactors.length > 0 && (
        <div style={{ position: "relative", marginTop: 8, borderTop: `1px solid ${C.hairline}`, paddingTop: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.crText }}>lineup engine · why {view.lineupPar}</span>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 8, color: C.fade }}>engine · {view.lineupInputProvenance} inputs</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 4 }}>
            {view.lineupFactors.map((f) => (
              <span key={f.key} title={f.note} style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: f.weightPct < 0 ? "#357A4E" : C.bone }}>
                {f.label.split(" (")[0]} <span style={{ color: f.weightPct < 0 ? "#357A4E" : C.crText }}>{f.weightPct > 0 ? "+" : ""}{f.weightPct}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* archetype engine factor breakdown — why this court is hostile to him */}
      {view.difficultyFactors.length > 0 && (
        <div style={{ position: "relative", marginTop: 8, borderTop: `1px solid ${C.hairline}`, paddingTop: 7 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bpText }}>archetype engine · why difficulty {view.difficulty}</span>
            <span style={{ fontFamily: "var(--f-mono)", fontSize: 8, color: C.fade }}>engine · {view.archetypeInputProvenance} inputs · conf {Math.round(view.archetypeConfidence * 100)}%</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 4 }}>
            {view.difficultyFactors.map((f) => (
              <span key={f.key} title={f.note} style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.bone }}>
                {f.label} <span style={{ color: C.crText }}>{f.points}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ position: "relative", display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center", marginTop: 8 }}>
        {chip(`SUPP ${(view.marketSuppression * 100).toFixed(0)}%`, C.scoreboard, false)}
        {chip(`LINEUP ${view.lineupAdjustment > 0 ? "+" : ""}${view.lineupAdjustment}`, C.crText, false)}
        {chip(`FIT ${view.fit}`, C.bpText, false)}
        {chip(`DIFF ${view.difficulty}`, C.crText, false)}
        {view.slope ? chip(`SLOPE ${view.slope}`, "#B4C472", false) : null}
        <span style={{ marginLeft: "auto", fontFamily: "var(--f-mono)", fontSize: 8.5, color: C.fade }}>engine-backed · inputs still fixture-derived</span>
      </div>
    </div>
  );
}
