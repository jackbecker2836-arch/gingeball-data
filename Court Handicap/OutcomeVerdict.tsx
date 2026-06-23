"use client";
import React, { useEffect, useRef, useState } from "react";
import type { VerdictView } from "@/lib/manifest-view-model";
import { C } from "./tokens";
import { Breakthrough } from "./Breakthrough";
import { confidenceRingSettle, tierOf } from "./motion";

// 04 · OUTCOME VERDICT — THE RULING. The sentence entered into the record.
// Basis toggle compares the actual line against the lineup par (the headline)
// or the market par. Both numbers come straight from the view-model.
export function OutcomeVerdict({ view }: { view: VerdictView }) {
  const [basis, setBasis] = useState<"lineup" | "market">("lineup");
  const [ruled, setRuled] = useState(true);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const par = basis === "lineup" ? view.lineupParPer100 : view.marketParPer100;
  const beat = basis === "lineup" ? view.beatLineupPer100 : view.beatMarketPer100;
  const won = beat > 0.05;

  const render = () => {
    timers.current.forEach(clearTimeout); timers.current = [];
    setRuled(false);
    timers.current.push(setTimeout(() => setRuled(true), 850));
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const pill = (k: "lineup" | "market", label: string) => (
    <button onClick={() => setBasis(k)} style={{
      fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase",
      padding: "4px 10px", cursor: "pointer", color: basis === k ? C.void : C.bone,
      background: basis === k ? C.scoreboard : "transparent", border: `1px solid ${basis === k ? C.scoreboard : C.hairline}`,
    }}>{label}</button>
  );

  return (
    <div className="ch-anim" style={{ background: C.void, border: `1px solid ${C.emberEdge}`, padding: "16px 18px 18px", position: "relative", overflow: "hidden", height: "100%" }}>
      <div style={{ position: "absolute", inset: 0, background: won ? `radial-gradient(120% 80% at 50% 120%, ${C.emberGlow}, transparent)` : "none", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 12, right: 14, fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".18em", color: C.ember, border: `1px solid ${C.emberEdge}`, padding: "2px 7px" }}>THE RULING</div>

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12 }}>
        <Breakthrough size={42} beat={won} color={won ? C.ember : C.crText} />
        <div style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontWeight: 600, fontSize: 30, color: C.chalk, lineHeight: 0.95 }}>{view.word}</div>
      </div>

      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 14, marginTop: 14, opacity: ruled ? 1 : 0, transform: ruled ? "none" : "translateY(8px)", transition: "all .5s" }}>
        <div>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone }}>beat vs {basis} / 100</div>
          <div style={{ fontFamily: "var(--f-num)", fontSize: 64, color: won ? C.ember : C.crText, lineHeight: 0.82 }}>{beat > 0 ? "+" : ""}{beat.toFixed(1)}</div>
        </div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: C.bone, paddingBottom: 8, lineHeight: 1.5 }}>
          actual <span style={{ color: C.chalk }}>{view.actualPer100.toFixed(1)}</span><br />
          {basis} par <span style={{ color: C.chalk }}>{par.toFixed(1)}</span><br />
          <span style={{ color: won ? C.ember : C.crText }}>{view.actualPer100.toFixed(1)} − {par.toFixed(1)} = {beat > 0 ? "+" : ""}{beat.toFixed(1)}</span>
        </div>
      </div>

      {view.evidenceAdjusted && basis === "lineup" && (
        <div style={{ position: "relative", marginTop: 10, fontFamily: "var(--f-mono)", fontSize: 10.5, color: C.bpText }}>
          evidence-adjusted <b style={{ color: C.chalk }}>{view.evidenceAdjusted.shrunk > 0 ? "+" : ""}{view.evidenceAdjusted.shrunk}/100</b> at {Math.round(view.evidenceAdjusted.confidence * 100)}%
          {view.evidenceAdjusted.policy && (
            <span style={{ color: view.evidenceAdjusted.policy.selectedWeightSource === "final confidence" ? C.fade : C.scoreboard, fontWeight: 700 }}>
              {" "}[{view.evidenceAdjusted.policy.selectedWeightSource === "final confidence" ? "final" : "proof"}]
            </span>
          )}
          {view.evidenceAdjusted.priorSource && (
            <span style={{ color: C.fade }}> · toward the {view.evidenceAdjusted.priorSource.replace(/^role: authored /, "").replace(/ baseline$/, "").replace(/_/g, " ")} prior</span>
          )}
          {view.evidenceAdjusted.comparison && Math.abs(view.evidenceAdjusted.comparison.difference) >= 0.5 && (
            <span style={{ color: C.fade }}> · other candidate {view.evidenceAdjusted.policy ? (view.evidenceAdjusted.policy.comparisonValue > 0 ? "+" : "") + view.evidenceAdjusted.policy.comparisonValue : ""}</span>
          )}
        </div>
      )}

      <div style={{ position: "relative", display: "flex", gap: 8, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <button onClick={render} style={{ fontFamily: "var(--f-stamp)", fontSize: 12, color: C.ember, background: C.emberGlow, border: `1px solid ${C.emberEdge}`, padding: "4px 10px", cursor: "pointer", textTransform: "uppercase" }}>▶ render ruling</button>
        {pill("lineup", "vs lineup")}
        {pill("market", "vs market")}
        {(() => {
          const conf = view.confidence;
          const tier = tierOf(conf);
          const settle = confidenceRingSettle(tier, conf);
          const R = 17, CIRC = +(2 * Math.PI * R).toFixed(1);
          const offset = +(CIRC * (1 - settle.finalArcFraction)).toFixed(1);
          const ringColor = tier === "HIGH" ? "#357A4E" : tier === "MEDIUM" ? C.scoreboard : C.crimson;
          // The ring fills to the EARNED arc only (= finalConfidence). It settles; it
          // never overshoots or celebrates. PROVISIONAL keeps a visible tick.
          const ringVars = { ["--ring-circ" as string]: `${CIRC}`, ["--ring-offset" as string]: `${offset}`, ["--ring-dur" as string]: `${settle.durationMs}ms`, ["--ring-ease" as string]: settle.easing } as React.CSSProperties;
          return (
            <span style={{ marginLeft: "auto", display: "inline-flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 14, color: C.bone }}>
                Gingeball has ruled · {view.consolidated.reliabilityLabel}
              </span>
              <svg className="ch-ring" width="42" height="42" viewBox="0 0 42 42" style={ringVars} role="img"
                   aria-label={`confidence ${Math.round(conf * 100)} percent ${tier}${view.consolidated.provisional ? " provisional" : ""}`}>
                <circle cx="21" cy="21" r={R} fill="none" stroke={C.hairline} strokeWidth="4" />
                <circle className="ch-ring-fill" cx="21" cy="21" r={R} fill="none" stroke={ringColor} strokeWidth="4"
                        strokeLinecap="round" strokeDasharray={`${CIRC}`} strokeDashoffset={`${offset}`}
                        transform="rotate(-90 21 21)" opacity={settle.glow ? 1 : 0.92} />
                <text x="21" y="25" textAnchor="middle" style={{ fontFamily: "var(--f-num)", fontSize: 12, fill: C.chalk }}>{Math.round(conf * 100)}</text>
                {view.consolidated.provisional && <circle cx="36" cy="6" r="3" fill={C.scoreboard} />}
              </svg>
            </span>
          );
        })()}
      </div>

      {/* THE CONFIDENCE LADDER — the ruling tells the truth about the chain */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.hairline}` }}>
        <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone, marginBottom: 8 }}>
          confidence by law
        </div>
        {view.consolidated.layerBreakdown.map((l) => {
          const weakest = l.layer === view.consolidated.weakestLayer.layer;
          return (
            <div key={l.layer} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: weakest ? C.crText : C.bone, width: 78, textTransform: "uppercase" }}>{l.layer}</span>
              <div style={{ flex: 1, height: 6, background: C.hairline, borderRadius: 3, overflow: "hidden" }}>
                <div style={{ width: `${Math.round(l.confidence * 100)}%`, height: "100%", background: weakest ? C.crimson : C.blueprint }} />
              </div>
              <span style={{ fontFamily: "var(--f-num)", fontSize: 11, color: C.chalk, width: 30, textAlign: "right" }}>{l.confidence.toFixed(2)}</span>
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, paddingTop: 6, borderTop: `1px solid ${C.hairline}` }}>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.scoreboard, width: 78, textTransform: "uppercase", fontWeight: 700 }}>final</span>
          <div style={{ flex: 1, height: 7, background: C.hairline, borderRadius: 3, overflow: "hidden" }}>
            <div style={{ width: `${Math.round(view.confidence * 100)}%`, height: "100%", background: C.scoreboard }} />
          </div>
          <span style={{ fontFamily: "var(--f-num)", fontSize: 12, color: C.scoreboard, width: 30, textAlign: "right", fontWeight: 700 }}>{view.confidence.toFixed(2)}</span>
        </div>
        <div style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 13, color: C.chalk, marginTop: 10 }}>
          Held by the weakest layer ({view.consolidated.weakestLayer.layer} {view.consolidated.weakestLayer.confidence.toFixed(2)}){view.consolidated.provisional ? " and a synthetic data diet" : ""}. The ruling is strong; the confidence stays humble.
        </div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.fade, marginTop: 6 }}>
          {view.consolidated.caps.join(" · ")}
        </div>
      </div>

      {/* THE PROOF — the possessions behind the ruling */}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${C.hairline}` }}>
        <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone, marginBottom: 8 }}>
          proven by {view.proof.usedPossessions} possessions · {view.proof.actualPoints} pts
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {view.proof.topFamilies.map((f) => (
            <span key={f.family} style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.bpText, background: C.bpGlow, border: `1px solid ${C.bpEdge}`, padding: "3px 8px", borderRadius: 2 }}>
              {f.family.replace(/_/g, " ")} +{f.per100.toFixed(1)}
            </span>
          ))}
        </div>
        {view.proof.beatHostileCourt && (
          <div style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 13.5, color: C.chalk }}>
            The court was hostile. He still produced {view.proof.resiliencePer100.toFixed(1)}/100 across {view.proof.hostilePossessions} possessions under pressure. This is how he beat it.
          </div>
        )}
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.fade, marginTop: 8 }}>
          possession proof engine · {view.proof.inputProvenance} events · {Math.round(view.proof.confidence * 100)}%
        </div>
      </div>
    </div>
  );
}
