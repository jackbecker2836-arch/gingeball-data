"use client";
// =============================================================================
// GINGEBALL COURT HANDICAP — PLAYER SLOT (Phase 12, Step 2)
//
// The reusable per-player slot editor. The 1v1 tester (Step 3) mounts one per
// side; the 5v5 page (Step 4) mounts five per side — so getting this right makes
// 5v5 essentially free, exactly as the blueprint intends.
//
// CONTRACT: this is a CONTROLLED component. It owns no slot state. The parent
// holds the PlayerSlot (and the live GameState) and passes `slot` + `onChange`.
// Every edit returns a new slot via the pure helpers in player-slot-model.ts —
// the component never mutates and never grades; grading stays in the engine and
// arrives back through the optional `grade` prop. That keeps the live loop's
// single source of truth in lib/sim, with this purely a view + input surface.
//
// AESTHETIC: matches the existing court-handicap components — inline styles over
// the `C` palette, type via the --f-* font roles (the host page injects
// FONT_VARS + COURT_HANDICAP_CSS, as CourtHandicapWorld does). Honesty cues are
// reused, not reinvented: the verdict readout uses confidenceBadge/toneColor and
// always stamps SHADOW, because the composite verdict takes no live authority.
// =============================================================================

import React, { useId } from "react";
import { C } from "../tokens";
import { confidenceBadge, toneColor } from "../ui-labels";
import type { PlayerSlot, Side, PossessionMode, PlayerGrade } from "@/lib/sim/game-sim";
import { type StatId } from "@/lib/stat-par/stat-par";
import {
  ARCHETYPE_META,
  CATEGORY_LABEL,
  STAT_LABEL,
  archetypeRole,
  defaultSlotLabel,
  resetToArchetypeDefaults,
  sideTheme,
  statGroupsForArchetype,
  withAccumulated,
  withName,
  withRandom,
  withRate,
} from "./player-slot-model";
import { FAMILY_PROFILES, profileToSim, profileFamily, prettyProfile, prettyFamily } from "./archetype-index";

export interface PlayerSlotProps {
  /** The engine slot to edit (definition + running accumulated totals). */
  slot: PlayerSlot;
  /** Controlled-update callback — receives a brand-new slot. */
  onChange: (next: PlayerSlot) => void;
  /** Side, for color theming + default badge. Default "X". */
  side?: Side;
  /** 1-based index for the default badge label (e.g. X1). Default 1. */
  index?: number;
  /** Which possession mode is selected — governs which inputs read as active. */
  possessionMode?: PossessionMode;
  /** Optional live verdict for this slot (Step 3+ passes gradeState output). */
  grade?: PlayerGrade | null;
  /** This slot's offensive trips so far — context line for the readout. */
  offTrips?: number;
  /** Mode-C stretch: allow editing accumulated totals directly. Default false. */
  editAccumulated?: boolean;
  /** Start collapsed (compact) — useful for the 5v5 grid. Default false. */
  defaultCollapsed?: boolean;
  /** Lock editing (e.g. while autoplay is running). Default false. */
  readOnly?: boolean;
}


export function PlayerSlot({
  slot,
  onChange,
  side = "X",
  index = 1,
  possessionMode = "rate",
  grade,
  offTrips,
  editAccumulated = false,
  defaultCollapsed = false,
  readOnly = false,
}: PlayerSlotProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);
  const theme = sideTheme(side);
  const uid = useId();
  const badge = defaultSlotLabel(side, index);
  const groups = statGroupsForArchetype(slot.archetype);
  const rateActive = possessionMode === "rate";
  const randomActive = possessionMode === "random";
  const scriptedActive = possessionMode === "scripted";

  const emit = (next: PlayerSlot) => { if (!readOnly) onChange(next); };

  // ---- shared inline style atoms ------------------------------------------
  const mono = (size: number, color: string): React.CSSProperties => ({
    fontFamily: "var(--f-mono)", fontSize: size, color, letterSpacing: ".02em",
  });
  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--f-mono)", fontSize: 8.5, letterSpacing: ".16em",
    textTransform: "uppercase", color: C.bone,
  };

  // ---- header --------------------------------------------------------------
  const header = (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div style={{
        fontFamily: "var(--f-num)", fontSize: 20, lineHeight: 1, color: theme.accentText,
        border: `1px solid ${theme.edge}`, background: theme.glow, padding: "5px 8px 3px", minWidth: 34, textAlign: "center",
      }}>{badge}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <input
          value={slot.name ?? ""}
          onChange={(e) => emit(withName(slot, e.target.value))}
          placeholder={ARCHETYPE_META[slot.archetype]?.label ?? slot.archetype}
          disabled={readOnly}
          className="ps-input ps-name"
          style={{
            fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 16, color: C.chalk,
            background: "transparent", border: "none", borderBottom: `1px solid ${C.hairline}`,
            width: "100%", padding: "1px 0 3px", textTransform: "uppercase",
          }}
        />
        {slot.archetypeLabel && (
          <div style={{ marginTop: 5, fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 13, color: theme.accentText, textTransform: "uppercase", letterSpacing: ".02em", lineHeight: 1.15 }}>
            {slot.archetypeLabel}
          </div>
        )}
        <select
          value={slot.profile ?? ""}
          onChange={(e) => {
            const profile = e.target.value;
            if (profile) emit({ ...slot, profile, family: profileFamily(profile), archetype: profileToSim(profile) });
          }}
          disabled={readOnly}
          className="ps-select"
          title="behavior profile — drives usage, foul-draw, defense, playmaking"
          style={{
            marginTop: 6, width: "100%", fontFamily: "var(--f-ui)", fontSize: 12, color: theme.accentText,
            background: C.pitch, border: `1px solid ${theme.edge}`, padding: "5px 7px", cursor: readOnly ? "default" : "pointer",
          }}
        >
          {!slot.profile && <option value="" style={{ background: C.pitch, color: C.bone }}>— unclassified —</option>}
          {FAMILY_PROFILES.map((g) => (
            <optgroup key={g.family} label={prettyFamily(g.family)}>
              {g.profiles.map((p) => (
                <option key={p} value={p} style={{ background: C.pitch, color: C.chalk }}>{prettyProfile(p)}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div style={{ fontFamily: "var(--f-annot)", fontSize: 11, color: C.bone, marginTop: 3, lineHeight: 1.15 }}>
          {slot.profile ? `${prettyFamily(slot.family ?? profileFamily(slot.profile))} family` : archetypeRole(slot.archetype)}
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="ps-btn"
          title={collapsed ? "expand" : "collapse"}
          style={{ ...mono(10, C.bone), background: "transparent", border: `1px solid ${C.hairline}`, padding: "3px 7px", cursor: "pointer" }}
        >{collapsed ? "▸" : "▾"}</button>
        {!collapsed && !readOnly && (
          <button
            onClick={() => emit(resetToArchetypeDefaults(slot))}
            className="ps-btn"
            title="reset rates + dials to this archetype's defaults"
            style={{ ...mono(9, theme.accentText), background: theme.glow, border: `1px solid ${theme.edge}`, padding: "3px 7px", cursor: "pointer", textTransform: "uppercase", letterSpacing: ".1em" }}
          >reset</button>
        )}
      </div>
    </div>
  );

  // ---- live verdict readout (optional) ------------------------------------
  const readout = (() => {
    if (!grade) return null;
    const v = grade.verdict;
    const comp = v.compositeCandidate;
    const beats = comp > 0.0001;
    const flat = Math.abs(comp) <= 0.0001;
    const compColor = flat ? C.bone : beats ? toneColor("trust") : C.crText;
    const cb = confidenceBadge(v.compositeConfidence, v.proxyDriven);
    const headline = v.headlineCategory ? CATEGORY_LABEL[v.headlineCategory] : "—";
    const drivers = [...v.drivers].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)).slice(0, 3);

    return (
      <div style={{ marginTop: 12, borderTop: `1px solid ${C.hairline}`, paddingTop: 9 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={sectionLabel}>live verdict</span>
          <span title="the composite verdict is observational — it takes no live authority"
            style={{ ...mono(8, C.fade), border: `1px solid ${C.hairline}`, padding: "1px 5px", textTransform: "uppercase", letterSpacing: ".12em" }}>
            shadow · not applied
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 6 }}>
          <div>
            <div style={{ fontFamily: "var(--f-num)", fontSize: 40, lineHeight: 0.85, color: compColor }}>
              {comp > 0 ? "+" : ""}{comp.toFixed(3)}
            </div>
            <div style={{ ...mono(9, compColor), marginTop: 3, textTransform: "uppercase", letterSpacing: ".08em" }}>
              {flat ? "at court" : beats ? "▲ beats court" : "▼ below court"}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ ...mono(9, toneColor(cb.tone)), border: `1px solid ${toneColor(cb.tone)}55`, padding: "2px 6px", textTransform: "uppercase", letterSpacing: ".06em" }}>
                conf {cb.label}
              </span>
              <span style={{ ...mono(9, C.bone), border: `1px solid ${C.hairline}`, padding: "2px 6px" }}>
                headline: <span style={{ color: C.chalk }}>{headline}</span>
              </span>
              {typeof offTrips === "number" && (
                <span style={{ ...mono(9, C.fade), border: `1px solid ${C.hairline}`, padding: "2px 6px" }}>
                  {offTrips} off-trips
                </span>
              )}
            </div>
            {v.proxyDriven && (
              <div style={{ ...mono(8.5, toneColor("warn")), marginTop: 4 }}>
                proxy-driven · pending share {(v.pendingShare * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        {drivers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 7 }}>
            {drivers.map((d) => {
              const pos = d.contribution >= 0;
              return (
                <span key={d.stat} title={`${d.provenance} · conf ${d.confidence.toFixed(2)}`} style={mono(9.5, C.bone)}>
                  {STAT_LABEL[d.stat]}{" "}
                  <span style={{ color: pos ? toneColor("trust") : C.crText }}>
                    {pos ? "+" : ""}{d.contribution.toFixed(3)}
                  </span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    );
  })();

  // ---- collapsed compact summary ------------------------------------------
  if (collapsed) {
    return (
      <div className="ch-anim" style={cardStyle(theme)}>
        <ScopedControlCSS uid={uid} accent={theme.accent} />
        {header}
        {grade && (
          <div style={{ ...mono(10, C.bone), marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <span>comp <span style={{ color: grade.verdict.compositeCandidate > 0 ? toneColor("trust") : C.crText }}>
              {grade.verdict.compositeCandidate > 0 ? "+" : ""}{grade.verdict.compositeCandidate.toFixed(3)}
            </span></span>
            <span>conf {confidenceBadge(grade.verdict.compositeConfidence, grade.verdict.proxyDriven).label}</span>
          </div>
        )}
      </div>
    );
  }

  // ---- rates editor --------------------------------------------------------
  const ratesNote = rateActive
    ? "expected count per relevant possession · baseline shown is the archetype's per-100"
    : randomActive
      ? "random mode active — rates are inactive; tune the dials below"
      : "scripted mode active — the script feed drives stats; rates are inactive";

  const ratesSection = (
    <div style={{ marginTop: 12, opacity: rateActive ? 1 : 0.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={sectionLabel}>per-possession rates</span>
        {!rateActive && <span style={mono(8, theme.accentText)}>{randomActive ? "random mode" : "scripted mode"}</span>}
      </div>
      <div style={{ fontFamily: "var(--f-annot)", fontSize: 12.5, color: C.fade, marginBottom: 6 }}>{ratesNote}</div>

      {groups.map((g) => (
        <div key={g.category} style={{ marginBottom: 7 }}>
          <div style={{ ...mono(8, theme.accentText), textTransform: "uppercase", letterSpacing: ".12em", marginBottom: 2 }}>{g.label}</div>
          {g.rows.map((row) => {
            const val = slot.rates[row.stat];
            return (
              <div key={row.stat} style={{ display: "flex", alignItems: "center", gap: 6, padding: "1.5px 0" }}>
                <span title={row.side === "offense" ? "accrues on offense" : "accrues on defense"}
                  style={{ ...mono(8, row.side === "offense" ? C.ember : C.bpText), width: 12, textAlign: "center" }}>
                  {row.side === "offense" ? "O" : "D"}
                </span>
                <span style={{ ...mono(10.5, C.chalk), flex: 1 }}>
                  {row.label}
                  {row.inverse && <span title="inverse — fewer than baseline is better" style={{ color: C.scoreboard, marginLeft: 4 }}>↓</span>}
                </span>
                <span style={{ ...mono(8.5, C.fade), width: 58, textAlign: "right" }} title="archetype baseline, per 100 possessions">
                  {row.baselinePer100 == null ? "—" : `${row.baselinePer100}/100`}
                </span>
                <input
                  type="number" step={0.01} min={0}
                  value={val ?? ""}
                  placeholder="0"
                  disabled={readOnly}
                  onChange={(e) => emit(withRate(slot, row.stat, e.target.value === "" ? 0 : parseFloat(e.target.value)))}
                  className="ps-input ps-num"
                  style={numInputStyle(theme, val != null && val !== 0)}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );

  // ---- random-mode dials ---------------------------------------------------
  const dial = (key: "usage" | "makeBias" | "threeBias", label: string, hint: string) => {
    const v = slot.random?.[key] ?? 0.5;
    return (
      <div style={{ marginBottom: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={mono(10, C.chalk)} title={hint}>{label}</span>
          <span style={mono(10, theme.accentText)}>{v.toFixed(2)}</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.01} value={v}
          disabled={readOnly}
          onChange={(e) => emit(withRandom(slot, key, parseFloat(e.target.value)))}
          className="ps-range"
          style={{ width: "100%", accentColor: theme.accent }}
        />
      </div>
    );
  };

  const randomSection = (
    <div style={{ marginTop: 12, opacity: randomActive ? 1 : 0.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={sectionLabel}>random-mode dials</span>
        {!randomActive && <span style={mono(8, C.fade)}>inactive in {possessionMode} mode</span>}
      </div>
      {dial("usage", "Usage", "how often this slot is the offensive actor on a random trip")}
      {dial("makeBias", "Make Bias", "shifts shot-making up or down from neutral")}
      {dial("threeBias", "Three Bias", "how much shot diet leans to threes vs rim")}
    </div>
  );

  // ---- accumulated readout (Mode-C optional edit) -------------------------
  const profileStats = groups.flatMap((g) => g.rows).filter((r) => r.baselinePer100 != null).map((r) => r.stat);
  const accumulatedSection = (() => {
    const entries = Object.entries(slot.accumulated).filter(([, n]) => typeof n === "number" && n !== 0) as [StatId, number][];
    if (!editAccumulated && entries.length === 0) return null;
    return (
      <div style={{ marginTop: 12, borderTop: `1px solid ${C.hairline}`, paddingTop: 8 }}>
        <span style={sectionLabel}>{editAccumulated ? "accumulated (editable)" : "accumulated so far"}</span>
        {editAccumulated ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 10px", marginTop: 5 }}>
            {profileStats.map((s) => (
              <label key={s} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ ...mono(9.5, C.bone), flex: 1 }}>{STAT_LABEL[s]}</span>
                <input
                  type="number" step={1} value={slot.accumulated[s] ?? ""}
                  placeholder="0" disabled={readOnly}
                  onChange={(e) => emit(withAccumulated(slot, s, e.target.value === "" ? 0 : parseFloat(e.target.value)))}
                  className="ps-input ps-num"
                  style={numInputStyle(theme, (slot.accumulated[s] ?? 0) !== 0)}
                />
              </label>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 10px", marginTop: 5 }}>
            {entries.map(([s, n]) => (
              <span key={s} style={mono(10, C.bone)}>
                {STAT_LABEL[s]} <span style={{ color: C.chalk }}>{Number.isInteger(n) ? n : n.toFixed(1)}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  })();

  return (
    <div className="ch-anim" style={cardStyle(theme)}>
      <ScopedControlCSS uid={uid} accent={theme.accent} />
      {header}
      {ratesSection}
      {randomSection}
      {accumulatedSection}
      {readout}
    </div>
  );
}

// ---------------------------------------------------------------------------
// style helpers
// ---------------------------------------------------------------------------
function cardStyle(theme: { edge: string }): React.CSSProperties {
  return {
    background: C.woodgrain,
    border: `1px solid ${C.hairline}`,
    borderLeft: `3px solid ${theme.edge}`,
    padding: "13px 15px 15px",
    position: "relative",
    overflow: "hidden",
  };
}

function numInputStyle(theme: { accent: string; edge: string }, edited: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--f-mono)", fontSize: 11, width: 62, textAlign: "right",
    color: edited ? C.chalk : C.bone,
    background: C.pitch,
    border: `1px solid ${edited ? theme.edge : C.hairline}`,
    padding: "3px 6px",
  };
}

// Scoped control CSS (focus rings + native-spinner taming for number/range/
// select). Idempotent — selectors are class-based so repeated mounts in a 5v5
// grid don't conflict. Kept inline so the component bundle stays portable, the
// same rationale tokens.ts uses for COURT_HANDICAP_CSS.
function ScopedControlCSS({ uid, accent }: { uid: string; accent: string }) {
  void uid;
  const css = `
.ps-input:focus,.ps-select:focus{outline:none;border-color:${accent};box-shadow:0 0 0 1px ${accent}55}
.ps-num::-webkit-outer-spin-button,.ps-num::-webkit-inner-spin-button{opacity:.4;height:18px}
.ps-name::placeholder{color:${C.fade}}
.ps-btn:hover{border-color:${accent}!important;color:${C.chalk}!important}
.ps-range{height:18px}
`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
