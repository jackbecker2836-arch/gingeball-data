"use client";
import React from "react";
import type { MarketHubView } from "@/lib/manifest-view-model";
import { C } from "./tokens";

// 02 · MARKETHUB — THE BURN. Renders the engine's market physics and emits
// line-adjust intents upward; the World recomputes the view-model. No math here.
export function MarketHub({ view, onAdjust }: { view: MarketHubView; onAdjust: (d: { spread?: number; total?: number }) => void }) {
  const heat = Math.min(1, Math.abs(view.spread) / 12);
  const btn: React.CSSProperties = {
    fontFamily: "var(--f-mono)", fontSize: 13, lineHeight: 1, color: C.scoreboard,
    background: "transparent", border: `1px solid ${C.emberEdge}`, width: 22, height: 22, cursor: "pointer", borderRadius: 2,
  };
  const Step = ({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <button style={btn} onClick={onMinus} aria-label={`decrease ${label}`}>−</button>
      <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: C.chalk, minWidth: 92, textAlign: "center" }}>{label}</span>
      <button style={btn} onClick={onPlus} aria-label={`increase ${label}`}>+</button>
    </span>
  );

  return (
    <div style={{ border: `1px solid ${C.hairline}`, background: C.void, position: "relative", overflow: "hidden", minHeight: 168 }}>
      <svg viewBox="0 0 600 168" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <radialGradient id="ch-mhb" cx={`${30 + (view.spread < 0 ? 0 : 8)}%`} cy="46%" r="55%">
            <stop offset="0%" stopColor={`rgba(228,155,24,${0.32 + heat * 0.3})`} />
            <stop offset="44%" stopColor="rgba(207,78,21,0.2)" />
            <stop offset="100%" stopColor="rgba(207,78,21,0)" />
          </radialGradient>
        </defs>
        <ellipse cx="180" cy="80" rx={130 + heat * 40} ry="92" fill="url(#ch-mhb)" />
        <path d="M 88 48 C 150 32, 236 34, 282 54 C 296 96, 246 122, 184 124 C 116 120, 72 94, 88 48 Z" fill="none" stroke={C.scoreboard} strokeWidth="1.3" opacity="0.4" />
      </svg>

      <div style={{ position: "absolute", top: 12, right: 16, fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".18em", color: C.ember, border: `1px solid ${C.emberEdge}`, padding: "2px 7px" }}>THE BURN</div>

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, padding: "18px 20px 0" }}>
        <div>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone }}>the line stamps reality</div>
          <div style={{ fontFamily: "var(--f-num)", fontSize: 68, color: C.chalk, lineHeight: 0.85, marginTop: 2 }}>
            {view.implied.home}<span style={{ color: C.scoreboard }}>·</span>{view.implied.away}
          </div>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 12, color: C.bone, marginTop: 4 }}>
            X {view.spread} / {view.total} O/U <span style={{ color: C.fade }}>—</span>{" "}
            {view.movement.steamed ? `steamed ${view.movement.spreadMove >= 0 ? "+" : ""}${view.movement.spreadMove} / ${view.movement.totalMove >= 0 ? "+" : ""}${view.movement.totalMove}` : "line held"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "right" }}>
          {[["EXP POSS", String(view.expectedPossessions)], ["MKT PPP", `${view.marketPpp.home}·${view.marketPpp.away}`]].map(([k, v]) => (
            <div key={k}>
              <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.fade }}>{k}</div>
              <div style={{ fontFamily: "var(--f-num)", fontSize: 24, color: C.chalk, lineHeight: 1 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "relative", display: "flex", gap: 18, alignItems: "center", padding: "12px 20px 16px", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: ".16em", textTransform: "uppercase", color: C.bone }}>move the line — physics recompute</span>
        <Step label={`SPREAD ${view.spread}`} onMinus={() => onAdjust({ spread: 0.5 })} onPlus={() => onAdjust({ spread: -0.5 })} />
        <Step label={`TOTAL ${view.total}`} onMinus={() => onAdjust({ total: -2 })} onPlus={() => onAdjust({ total: 2 })} />
        {view.winProbability && (
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.bone, marginLeft: "auto" }}>
            win prob {view.winProbability.home}·{view.winProbability.away}
          </span>
        )}
      </div>
    </div>
  );
}
