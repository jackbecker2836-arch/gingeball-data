"use client";
import React from "react";
import { C } from "./tokens";
import type { PressureLabView, ScenarioView, ScenarioLimitationView } from "@/lib/pressure-lab-view-model";

// INTERNAL PRESSURE LAB COCKPIT — clear first, not pretty. A visible lab has to be visually
// honest: green never hides a blocker, shadow never looks live, v1 engines never look measured.
// No motion (reduced-motion safe by default). No data fabrication — every value is from the view.

const SEV: Record<string, string> = { blocker: C.crimson, high: C.ember, medium: C.scoreboard, low: C.blueprint, info: C.bone };
const DEPLOY_COLOR: Record<string, string> = { BLOCKED: C.crimson, INTERNAL_ONLY: C.scoreboard, READY_FOR_PROTECTED_STAGING: "#357A4E" };

function provColor(p: string): string {
  if (p === "engine_modeled" || p === "box_score") return "#357A4E";        // measured/engine — green
  if (p === "deterrence_engine_v1" || p === "spacing_gravity_engine_v1") return C.scoreboard; // v1 — amber, distinct
  if (p === "synthetic_audit_fixture") return C.staleRust;
  if (p === "pending_engine") return C.crimson;                              // pending — crimson, cannot hide
  return C.cached;                                                          // fixture/tracking/missing — grey
}

const mono = { fontFamily: "var(--f-mono)" as const };

export function PressureLabCockpit({ view }: { view: PressureLabView }) {
  return (
    <div style={{ background: C.void, color: C.chalk, minHeight: "100vh", padding: "20px 18px 64px", maxWidth: 1100, margin: "0 auto" }}>
      {/* STAMP BAND — unmistakable, always visible */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {view.stamps.map((s) => (
          <span key={s} style={{ fontFamily: "var(--f-stamp)", fontSize: 13, color: C.ember, border: `1px solid ${C.emberEdge}`, background: C.emberGlow, padding: "3px 9px", letterSpacing: ".04em" }}>{s}</span>
        ))}
      </div>

      {/* DEPLOY BANNER — computed from the limitation registry, dominates the page */}
      <div style={{ border: `2px solid ${DEPLOY_COLOR[view.deployment.status]}`, padding: "12px 14px", marginBottom: 18, background: "rgba(0,0,0,0.25)" }}>
        <div style={{ fontFamily: "var(--f-num)", fontSize: 22, color: DEPLOY_COLOR[view.deployment.status], letterSpacing: ".02em" }}>{view.deployment.label}</div>
        <div style={{ ...mono, fontSize: 12, color: C.bone, marginTop: 4 }}>{view.deployment.reason}</div>
        {view.deployment.deploymentBlockers.length > 0 && (
          <div style={{ ...mono, fontSize: 11, color: C.crText, marginTop: 6 }}>deployment blockers: {view.deployment.deploymentBlockers.join(" · ")}</div>
        )}
        {view.deployment.liveGraduationBlockers.length > 0 && (
          <div style={{ ...mono, fontSize: 11, color: C.bone, marginTop: 3 }}>live-graduation blockers: {view.deployment.liveGraduationBlockers.join(" · ")}</div>
        )}
      </div>

      <h1 style={{ fontFamily: "var(--f-title)", fontSize: 26, margin: "0 0 2px" }}>Pressure Lab — Internal Audit Cockpit</h1>
      <div style={{ ...mono, fontSize: 12, color: C.bone, marginBottom: 4 }}>
        {view.totals.scenarios} archetype scenarios · {view.totals.passing} beating their court (shadow) · suite {view.totals.suitePassed} passed / {view.totals.suiteFailed} failed
      </div>
      <div style={{ ...mono, fontSize: 11, color: view.pixelPassReviewed ? "#357A4E" : C.crText, marginBottom: 18 }}>
        browser pixel pass: {view.pixelPassReviewed ? "REVIEWED" : "NOT REVIEWED"} — {view.pixelPassNote}
      </div>

      {/* ENGINE UPGRADES */}
      <Section title="Non-scoring engine upgrades">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
          <EngineCard label="Deterrence v1" prov={view.engineUpgrades.deterrence.provenance} before={view.engineUpgrades.deterrence.pendingBefore} after={view.engineUpgrades.deterrence.pendingAfter} />
          <EngineCard label="Spacing gravity v1" prov={view.engineUpgrades.spacingGravity.provenance} before={view.engineUpgrades.spacingGravity.pendingBefore} after={view.engineUpgrades.spacingGravity.pendingAfter} extra={`${view.engineUpgrades.spacingGravity.upgradedArchetypes} archetypes upgraded`} />
        </div>
      </Section>

      {/* COVERAGE */}
      <Section title="Archetype coverage (registry self-read)">
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {Object.entries(view.coverage.byStatus).map(([k, n]) => (
            <span key={k} style={{ ...mono, fontSize: 11, color: C.bone, border: `1px solid ${C.fade}`, padding: "3px 8px" }}>{k}: <b style={{ color: C.chalk }}>{n}</b></span>
          ))}
        </div>
        <div style={{ ...mono, fontSize: 11, color: C.bone, marginTop: 6 }}>{view.coverage.activeArchetypes} active · {view.coverage.gapsNamed.length} self-read gaps named</div>
      </Section>

      {/* SCENARIOS */}
      <Section title="Scenarios — expected vs actual, with limitations">
        {view.scenarios.map((s) => <ScenarioCard key={s.archetype} s={s} />)}
      </Section>

      {/* LEGEND */}
      <Section title="Limitation legend">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 6 }}>
          {view.limitationsLegend.map((l) => (
            <div key={l.id} style={{ ...mono, fontSize: 10.5, color: C.bone, borderLeft: `3px solid ${SEV[l.severity]}`, padding: "2px 8px" }}>
              <b style={{ color: C.chalk }}>{l.displayLabel}</b> <span style={{ color: SEV[l.severity] }}>[{l.severity}]</span>
              {l.blocksDeployment && <span style={{ color: C.crText }}> · blocks deploy</span>}
            </div>
          ))}
        </div>
      </Section>

      <div style={{ ...mono, fontSize: 10.5, color: C.fade, marginTop: 28, borderTop: `1px solid ${C.fade}`, paddingTop: 10 }}>
        Shadow composite — applied: false · mode: shadow. This cockpit is internal and synthetic. It does not show a live product verdict.
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 22 }}>
      <h2 style={{ fontFamily: "var(--f-mono)", fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: C.bone, borderBottom: `1px solid ${C.fade}`, paddingBottom: 4, marginBottom: 10 }}>{title}</h2>
      {children}
    </section>
  );
}

function EngineCard({ label, prov, before, after, extra }: { label: string; prov: string; before: number; after: number; extra?: string }) {
  return (
    <div style={{ border: `1px solid ${C.fade}`, padding: "10px 12px", minWidth: 200 }}>
      <div style={{ fontFamily: "var(--f-num)", fontSize: 16, color: C.chalk }}>{label}</div>
      <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: C.scoreboard, marginTop: 2 }}>{prov}</div>
      <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: C.bone, marginTop: 6 }}>pending stats: <b style={{ color: C.crText }}>{before}</b> → <b style={{ color: "#357A4E" }}>{after}</b></div>
      {extra && <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: C.bone, marginTop: 3 }}>{extra}</div>}
    </div>
  );
}

function chip(l: ScenarioLimitationView) {
  return (
    <span key={l.id} title={l.whatItLimits} style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.void, background: SEV[l.severity], padding: "2px 7px", borderRadius: 2 }}>{l.displayLabel}</span>
  );
}

function ScenarioCard({ s }: { s: ScenarioView }) {
  return (
    <div style={{ border: `1px solid ${C.fade}`, padding: "12px 14px", marginBottom: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <div style={{ fontFamily: "var(--f-num)", fontSize: 18, color: C.chalk }}>{s.archetype} <span style={{ fontSize: 12, color: C.bone }}>· {s.courtLabel} · Team {s.teamSide}</span></div>
        <div style={{ fontFamily: "var(--f-mono)", fontSize: 11 }}>
          <span style={{ color: s.pass ? "#357A4E" : C.crText }}>{s.pass ? "BEATS COURT (shadow)" : "below court"}</span>
          {s.proxyDriven && <span style={{ color: C.crText }}> · proxy-driven</span>}
          <span style={{ color: C.bone }}> · conf {s.compositeConfidence.toFixed(2)}</span>
          {s.headline && <span style={{ color: C.bone }}> · headline {s.headline}</span>}
        </div>
      </div>

      <div style={{ overflowX: "auto", marginTop: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 440 }}>
          <thead>
            <tr style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.bone, textAlign: "left" }}>
              <th style={th}>stat</th><th style={th}>proof</th><th style={th}>rel</th><th style={th}>exp</th><th style={th}>act</th><th style={th}>Δ</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((r) => (
              <tr key={r.stat} style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: C.chalk, borderTop: `1px solid ${C.bench}`, borderLeft: `3px solid ${provColor(r.provenance)}` }}>
                <td style={{ ...td, paddingLeft: 8 }}>{r.stat}{r.inverse ? " ↓" : ""}</td>
                <td style={td}><span style={{ color: provColor(r.provenance) }}>{r.proofStatus}</span></td>
                <td style={{ ...td, color: C.bone }}>{r.relevance}</td>
                <td style={td}>{r.expected}</td>
                <td style={td}>{r.actual}</td>
                <td style={{ ...td, color: (r.inverse ? r.delta < 0 : r.delta > 0) ? "#357A4E" : (r.delta === 0 ? C.bone : C.crText) }}>{r.delta > 0 ? "+" : ""}{r.delta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>{s.limitations.map(chip)}</div>
    </div>
  );
}

const th: React.CSSProperties = { padding: "2px 8px", fontWeight: 400, letterSpacing: ".06em", textTransform: "uppercase" };
const td: React.CSSProperties = { padding: "3px 8px" };
