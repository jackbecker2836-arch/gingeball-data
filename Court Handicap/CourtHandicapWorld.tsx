"use client";
import React, { useMemo, useState } from "react";
import type { CourtHandicapView } from "@/lib/manifest-view-model";
import { resolveSelectedLineupGraph } from "@/lib/manifest-view-model";
import { rebuildWithMarket } from "@/lib/manifest-source";
import { sourceStateBadge } from "./ui-labels";
import { C, FONT_VARS, COURT_HANDICAP_CSS } from "./tokens";
import { LAWS } from "./laws";
import { CourtGraph } from "./CourtGraph";
import { MarketHub } from "./MarketHub";
import { PlayerCourtConditions } from "./PlayerCourtConditions";
import { OutcomeVerdict } from "./OutcomeVerdict";

const SPINE = ["The market sets the court.", "The lineup shapes it.", "The archetype translates it.", "The possessions prove it.", "Gingeball grades who beat it."];

export function CourtHandicapWorld({ initialView }: { initialView: CourtHandicapView }) {
  const [market, setMarket] = useState({ spread: initialView.marketHub.spread, total: initialView.marketHub.total });
  const [selected, setSelected] = useState(initialView.courtGraph.selectedPlayerId);
  const [openLaw, setOpenLaw] = useState<string | null>(null);
  const [showProv, setShowProv] = useState(false);

  const view = useMemo(() => rebuildWithMarket(initialView, market), [market, initialView]);
  const adjust = (d: { spread?: number; total?: number }) =>
    setMarket((m) => ({ spread: +(m.spread + (d.spread ?? 0)).toFixed(1), total: +(m.total + (d.total ?? 0)).toFixed(1) }));

  const studiedName = view.conditions.name;
  const selName = view.courtGraph.players.find((p) => p.id === selected)?.name ?? studiedName;
  const rootStyle = { ...FONT_VARS, background: C.void, color: C.chalk, minHeight: "100vh", padding: "28px 22px 60px", fontFamily: "var(--f-ui)" } as React.CSSProperties;
  const cgView = { ...view.courtGraph, selectedPlayerId: selected };

  return (
    <div style={rootStyle}>
      <style dangerouslySetInnerHTML={{ __html: COURT_HANDICAP_CSS }} />
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>

        {/* header */}
        <header style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 40, letterSpacing: "-.01em", lineHeight: 0.95 }}>
            COURT <span style={{ color: C.ember }}>HANDICAP</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 8 }}>
            {SPINE.map((s, i) => (
              <span key={i} style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: i === SPINE.length - 1 ? C.ember : C.bone }}>{s}</span>
            ))}
          </div>
        </header>

        {/* provenance — visible + honest */}
        <button onClick={() => setShowProv((v) => !v)} style={{
          width: "100%", textAlign: "left", cursor: "pointer", background: C.pitch, border: `1px solid ${C.hairline}`,
          padding: "8px 14px", marginBottom: 18, display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap",
        }}>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone }}>provenance</span>
          {(() => {
            const m = view.provenance.market;
            if (!m) return null;
            const TONE: Record<string, string> = { trust: "#357A4E", warn: C.crText, caution: C.scoreboard, synthetic: C.bpText };
            const badge = sourceStateBadge(m.sourceState);
            return (
              <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 9, letterSpacing: ".12em", color: C.void, background: TONE[badge.tone], padding: "2px 6px" }}>{badge.label}</span>
                <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: badge.readsLive ? "#357A4E" : C.bone }}>
                  ◆ market: {m.source}{m.feedSource ? ` · ${m.feedSource}` : ""}
                </span>
                {m.sourceQuality != null && m.sourceQuality < 1 && (
                  <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.crText }}>conf ×{m.sourceQuality}</span>
                )}
                {m.ageMinutes != null && (
                  <span style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: m.stale ? C.crText : C.bone }}>
                    {m.ageMinutes}m old{m.stale ? " · STALE" : ""}
                  </span>
                )}
                {m.hypothetical && <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.scoreboard, border: `1px solid ${C.emberEdge}`, padding: "1px 5px" }}>WHAT-IF</span>}
                {m.missing.length > 0 && <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.crText }}>○ {m.missing.length} missing</span>}
              </span>
            );
          })()}
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: "#357A4E" }}>● {view.provenance.engineBacked.length} engine</span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.bone }}>○ {view.provenance.pendingEngine.length} pending</span>
          <span style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.fade, marginLeft: "auto" }}>{view.generatedFrom.engineVersion} · {showProv ? "hide" : "details"}</span>
        </button>
        {showProv && (
          <div style={{ background: C.pitch, border: `1px solid ${C.hairline}`, padding: "12px 16px", marginTop: -10, marginBottom: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <div style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: "#357A4E", marginBottom: 6 }}>● ENGINE-BACKED</div>
              {view.provenance.engineBacked.map((s, i) => <div key={i} style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.bone, marginBottom: 3 }}>{s}</div>)}
            </div>
            <div>
              <div style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.scoreboard, marginBottom: 6 }}>○ PENDING ENGINE (synthetic for now)</div>
              {view.provenance.pendingEngine.map((s, i) => <div key={i} style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.bone, marginBottom: 3 }}>{s}</div>)}
              {view.provenance.market?.note && <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.crText, marginTop: 8 }}>⚠ {view.provenance.market.note}</div>}
              {view.provenance.market?.missing.map((s, i) => <div key={`m${i}`} style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.crText, marginTop: 3 }}>○ {s}</div>)}
              {view.provenance.lineup && (
                <div style={{ marginTop: 10, fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.bone }}>
                  <span style={{ color: C.crText }}>lineup engine</span> {view.provenance.lineup.modelVersion} · conf {Math.round(view.provenance.lineup.confidence * 100)}% · {view.provenance.lineup.inputProvenance} inputs
                  {view.provenance.lineup.missing.map((s, i) => <div key={`l${i}`} style={{ color: C.fade }}>○ {s}</div>)}
                </div>
              )}
              {view.provenance.archetype && (
                <div style={{ marginTop: 8, fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.bone }}>
                  <span style={{ color: C.bpText }}>archetype engine</span> {view.provenance.archetype.modelVersion} · conf {Math.round(view.provenance.archetype.confidence * 100)}% · {view.provenance.archetype.inputProvenance} inputs
                  {view.provenance.archetype.missing.map((s, i) => <div key={`a${i}`} style={{ color: C.fade }}>○ {s}</div>)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 01 courtgraph */}
        <div style={{ marginBottom: 16 }}><CourtGraph view={cgView} onSelect={setSelected} /></div>

        {/* 02 markethub */}
        <div style={{ marginBottom: view.provenance.market?.hypothetical ? 6 : 16 }}><MarketHub view={view.marketHub} onAdjust={adjust} /></div>
        {view.provenance.market?.hypothetical && (
          <div style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.scoreboard, marginBottom: 14 }}>
            Movement history stays real (open → close). The current line is a <b style={{ color: C.chalk }}>what-if</b> override —{" "}
            <button onClick={() => setMarket({ spread: initialView.basis?.snapshot.homeSpread ?? initialView.marketHub.spread, total: initialView.basis?.snapshot.total ?? initialView.marketHub.total })}
              style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.ember, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>reset to real line</button>
          </div>
        )}

        {/* selection honesty banner */}
        {selected !== view.conditions.playerId && selected !== view.secondGrade?.playerId && (() => {
          const sp = view.courtGraph.players.find((p) => p.id === selected);
          const modeled = sp?.modeled;
          return (
            <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.scoreboard, background: C.emberGlow, border: `1px solid ${C.emberEdge}`, padding: "7px 12px", marginBottom: 12 }}>
              {modeled && sp ? (
                <>Same court, re-translated for <b style={{ color: C.chalk }}>{selName}</b>: <b style={{ color: sp.mood === "relief" ? C.bpText : C.crText }}>fit {sp.fit} · difficulty {sp.difficulty} · {sp.slopeDirection}</b> <span style={{ color: C.bone }}>(archetype engine).</span> </>
              ) : (
                <>Court shown for <b style={{ color: C.chalk }}>{selName}</b>. </>
              )}
              Full conditions + ruling are logged for the studied player only — <b style={{ color: C.chalk }}>{studiedName}</b>.{" "}
              <button onClick={() => setSelected(view.conditions.playerId)} style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.ember, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>back to studied</button>
            </div>
          );
        })()}

        {/* 03 + 04 — selecting the rim protector shows HIS full grade */}
        {(() => {
          const second = view.secondGrade;
          const showSecond = !!second && selected === second.playerId;
          if (showSecond && second) {
            return (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
                <div style={{ border: `1px solid ${C.hairline}`, padding: 14 }}>
                  <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone, marginBottom: 8 }}>
                    {second.name} — scoring par chain
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: C.chalk, lineHeight: 1.9 }}>
                    normal {second.normalPar} → market {second.marketPar} → <b style={{ color: C.scoreboard }}>lineup {second.lineupPar}</b>
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.bpText, marginTop: 8 }}>
                    relief court · scoring is not where he wins
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.fade, marginTop: 8 }}>
                    a big graded as a big — scoring valued, non-scoring tracked below. synthetic inputs (labeled).
                  </div>
                </div>
                <div>
                  <OutcomeVerdict view={second.verdict} />
                  <div style={{ marginTop: 12, border: `1px solid ${C.bpEdge}`, background: C.bpGlow, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bpText, marginBottom: 6 }}>
                      non-scoring proof · tracked, not valued
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {second.nonScoringProof.map((p) => (
                        <span key={p.type} style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.chalk }}>{p.type.replace(/_/g, " ")} <b style={{ color: C.bpText }}>{p.count}</b></span>
                      ))}
                    </div>
                    <div style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 12.5, color: C.bone, marginTop: 8 }}>
                      His value is mostly here. Court Handicap does not yet value deterrence, boards, or screens into the headline — and won&apos;t pretend to.
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
              <PlayerCourtConditions view={view.conditions} />
              <OutcomeVerdict view={view.verdict} />
            </div>
          );
        })()}

        {/* Phase 9A — deeper math: court slope v2 + lineup graph (explain, don't overwhelm) */}
        {(() => {
          const second = view.secondGrade;
          const showSecond = !!second && selected === second.playerId;
          const slope = showSecond ? second?.slope : view.courtSlope;
          const graphRes = resolveSelectedLineupGraph(view, selected);
          const lg = graphRes.selected;
          if (!slope && !lg && graphRes.covered) return null;
          const ov = slope?.slopeSourceBreakdown.archetypeOverlay ?? 0;
          return (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
              {slope && (
                <div style={{ border: `1px solid ${C.hairline}`, padding: 14 }}>
                  <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone, marginBottom: 8 }}>court slope</div>
                  <div style={{ fontFamily: "var(--f-num)", fontSize: 22, color: C.chalk, lineHeight: 1 }}>{slope.slopeLabel}</div>
                  <div style={{ display: "flex", height: 6, borderRadius: 3, overflow: "hidden", marginTop: 10, background: C.hairline }}>
                    <div style={{ width: `${Math.round(slope.slopeSourceBreakdown.marketPct * 100)}%`, background: C.scoreboard }} title="market-created" />
                    <div style={{ width: `${Math.round(slope.slopeSourceBreakdown.lineupPct * 100)}%`, background: C.crimson }} title="lineup-created" />
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.fade, marginTop: 6 }}>
                    par slid {Math.round(slope.slopeMagnitude * 100)}% from normal · <span style={{ color: C.scoreboard }}>{Math.round(slope.slopeSourceBreakdown.marketPct * 100)}% market</span> / <span style={{ color: C.crText }}>{Math.round(slope.slopeSourceBreakdown.lineupPct * 100)}% lineup</span>
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: ov < 0 ? C.bpText : C.crText, marginTop: 6 }}>
                    archetype overlay: court feels <b>{slope.archetypeFeel}</b> {ov !== 0 ? `(${ov > 0 ? "+" : ""}${ov})` : ""} — a separate axis from par
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 8, color: C.fade, marginTop: 6 }}>slope v2 · conf {Math.round((slope.slopeConfidence) * 100)}% · synthetic inputs</div>
                </div>
              )}
              {lg ? (
                <div style={{ border: `1px solid ${C.hairline}`, padding: 14 }}>
                  <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone, marginBottom: 8 }}>
                    lineup graph · <span style={{ color: C.bpText }}>{(lg.team ?? graphRes.team).toUpperCase()} side</span> · <span style={{ color: graphRes.trust.displayMode === "thin_graph" ? C.crText : C.fade }}>{graphRes.trust.graphTrustLabel}</span>
                  </div>
                  {graphRes.trust.showFragilityScore ? (
                    <>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontFamily: "var(--f-num)", fontSize: 22, color: lg.fragilityLabel === "FRAGILE" ? C.crText : lg.fragilityLabel === "SOLID" ? "#5BBd86" : C.scoreboard }}>{lg.fragilityLabel}</span>
                        <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.fade }}>fragility {lg.fragilityScore}</span>
                      </div>
                      {graphRes.trust.fragilityTrustLevel === "medium" && (
                        <div style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, color: C.scoreboard, marginTop: 3 }}>⚠ caution: {graphRes.trust.graphTrustReason}</div>
                      )}
                    </>
                  ) : (
                    <div style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.crText }}>fragility withheld — {graphRes.trust.graphTrustReason}</div>
                  )}
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.bpText, marginTop: 8 }}>
                    key synergies: {lg.keySynergies.map((s) => s.type.replace(/_/g, " ")).join(" · ") || "none modeled"}
                  </div>
                  {lg.clusterWarnings.map((w, i) => (
                    <div key={i} style={{ fontFamily: "var(--f-mono)", fontSize: 9, color: C.crText, marginTop: 4 }}>○ {w}</div>
                  ))}
                  {lg.coverage.missing.length > 0 && (
                    <div style={{ fontFamily: "var(--f-mono)", fontSize: 8.5, color: C.fade, marginTop: 6, fontStyle: "italic" }}>
                      not modeled here: {lg.coverage.missing.join("; ")}
                    </div>
                  )}
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 8, color: C.fade, marginTop: 6 }}>explains structure · does not move par or confidence · conf {Math.round(lg.graphConfidence * 100)}%{graphRes.opponent ? ` · opponent: ${(graphRes.opponent.team ?? "").toUpperCase()} (${graphRes.opponent.coverage.level})` : ""}</div>
                  {graphRes.shadowConfidence && graphRes.shadowConfidence.confidenceDelta !== 0 && (
                    <div style={{ fontFamily: "var(--f-mono)", fontSize: 8, color: C.fade, marginTop: 5, opacity: 0.7, borderTop: `1px dashed ${C.hairline}`, paddingTop: 5 }}>
                      <span style={{ color: C.bone }}>shadow</span> · if graph trust influenced lineup confidence: {graphRes.shadowConfidence.currentLineupConfidence} → {graphRes.shadowConfidence.graphAwareLineupConfidenceCandidate} ({graphRes.shadowConfidence.confidenceDelta > 0 ? "+" : ""}{graphRes.shadowConfidence.confidenceDelta}) · <i>not applied</i>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ border: `1px solid ${C.hairline}`, padding: 14 }}>
                  <div style={{ fontFamily: "var(--f-title)", fontWeight: 700, fontSize: 9.5, letterSpacing: ".14em", textTransform: "uppercase", color: C.bone, marginBottom: 8 }}>lineup graph · {graphRes.trust.graphTrustLabel}</div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 9.5, color: C.fade }}>{graphRes.coverageNote}</div>
                </div>
              )}
            </div>
          );
        })()}

        {/* laws of the court */}
        <div style={{ borderTop: `1px solid ${C.hairline}`, paddingTop: 16 }}>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 13, letterSpacing: ".16em", color: C.bone, marginBottom: 10 }}>LAWS OF THE COURT</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {LAWS.map((law) => (
              <button key={law.key} onClick={() => setOpenLaw(openLaw === law.key ? null : law.key)} style={{
                fontFamily: "var(--f-stamp)", fontSize: 13, cursor: "pointer", padding: "5px 10px",
                color: openLaw === law.key ? C.void : C.ember, background: openLaw === law.key ? C.ember : C.emberGlow, border: `1px solid ${C.emberEdge}`,
              }}>{law.key}</button>
            ))}
          </div>
          {openLaw && (
            <div style={{ marginTop: 12, background: C.pitch, border: `1px solid ${C.hairline}`, padding: "14px 16px" }}>
              {(() => { const l = LAWS.find((x) => x.key === openLaw)!; return (
                <>
                  <div style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 16, color: C.chalk }}>{l.key} <span style={{ fontFamily: "var(--f-mono)", fontSize: 10, color: C.scoreboard, fontWeight: 400 }}>· {l.role}</span></div>
                  <div style={{ fontFamily: "var(--f-serif)", fontStyle: "italic", fontSize: 16, color: C.bone, marginTop: 6, lineHeight: 1.45 }}>{l.definition}</div>
                </>
              ); })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
