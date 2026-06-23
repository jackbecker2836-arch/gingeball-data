"use client";
// =============================================================================
// GINGEBALL COURT HANDICAP — LIVE COURT PANEL (Phase 12, Step 3)
//
// The "court on top" for the live sandbox. It renders exactly what
// deriveCourt(state) produces — the five CourtContext factors, the projected
// total, and the rising confidence — and nothing else. This is Gap C made
// visible: the handicap EMERGING from play, recomputed every possession.
//
// Deliberately NOT the signature market CourtGraph: that object is built from
// the odds/manifest pipeline (burn-implied score, synergies, par-beat) which the
// sim doesn't produce. Showing those here would mean inventing data. Instead this
// shows the honest live court object; wiring the full CourtGraph to live state is
// a separate follow-up noted in the blueprint.
// =============================================================================

import React from "react";
import type { CourtContext } from "@/lib/stat-par/composite-verdict";
import { C } from "../tokens";
import { confidenceBadge, toneColor } from "../ui-labels";

const FACTORS: { key: keyof CourtContext; label: string; hi: string; lo: string }[] = [
  { key: "spacingScarcity", label: "Spacing Scarcity", hi: "cramped floor", lo: "open floor" },
  { key: "poaPressure", label: "POA Pressure", hi: "ball-hawked", lo: "uncontested" },
  { key: "rimProtectionFaced", label: "Rim Protection Faced", hi: "walled rim", lo: "open rim" },
  { key: "synergy", label: "Synergy", hi: "connected", lo: "isolated" },
];

export function LiveCourtPanel({ court, possessionCount }: { court: CourtContext; possessionCount: number }) {
  const conf = court.confidence ?? 0;
  const cb = confidenceBadge(conf, true); // sim court is always synthetic → provisional
  const confCol = toneColor(cb.tone);

  return (
    <div className="ch-anim" style={{ background: C.pitch, border: `1px solid ${C.hairline}`, padding: "14px 18px 16px", position: "relative", overflow: "hidden" }}>
      {/* faint court hatching, consistent with the other panels */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 23px,rgba(255,255,255,.022) 23px,rgba(255,255,255,.022) 24px)", pointerEvents: "none" }} />

      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 13, letterSpacing: ".16em", color: C.bone, textTransform: "uppercase" }}>
            The Live Court
          </div>
          <div style={{ fontFamily: "var(--f-annot)", fontSize: 14, color: C.fade, marginTop: 1 }}>
            derived from play · recomputed every possession
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <span title="the court here is computed from the evolving game state (Gap C), uncalibrated v1"
            style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: C.bpText, border: `1px solid ${C.bpEdge}`, padding: "2px 7px" }}>
            ⚗ {court.provenance ?? "sim_derived"}
          </span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".12em", textTransform: "uppercase", color: confCol, border: `1px solid ${confCol}55`, padding: "2px 7px" }}>
            conf {cb.label}
          </span>
        </div>
      </div>

      {/* total + label */}
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 14, marginTop: 10 }}>
        <div>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", color: C.bone }}>projected total</div>
          <div style={{ fontFamily: "var(--f-num)", fontSize: 52, lineHeight: 0.85, color: C.scoreboard }}>{court.total.toFixed(1)}</div>
        </div>
        <div style={{ flex: 1, paddingBottom: 6 }}>
          <div style={{ fontFamily: "var(--f-label)", fontSize: 17, color: C.chalk, textTransform: "uppercase", lineHeight: 1.05 }}>{court.label}</div>
          {/* confidence meter */}
          <div style={{ marginTop: 6, height: 5, background: C.bench, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, width: `${Math.round(conf * 100)}%`, background: confCol, transition: "width .4s ease" }} />
          </div>
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, color: C.fade, marginTop: 3 }}>
            confidence {Math.round(conf * 100)}% · grows with game elapsed + trips played ({possessionCount} so far)
          </div>
        </div>
      </div>

      {/* the four 0..1 factors */}
      <div style={{ position: "relative", marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "9px 18px" }}>
        {FACTORS.map((f) => {
          const v = (court[f.key] as number) ?? 0;
          return (
            <div key={String(f.key)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, letterSpacing: ".06em", textTransform: "uppercase", color: C.bone }}>{f.label}</span>
                <span style={{ fontFamily: "var(--f-num)", fontSize: 16, color: C.chalk }}>{v.toFixed(2)}</span>
              </div>
              <div style={{ marginTop: 3, height: 6, background: C.bench, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, width: `${Math.round(v * 100)}%`, background: C.ember, opacity: 0.8, transition: "width .4s ease" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--f-mono)", fontSize: 8, color: C.fade, marginTop: 2 }}>
                <span>{f.lo}</span><span>{f.hi}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
