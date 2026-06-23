"use client";
// =============================================================================
// GINGEBALL COURT HANDICAP — SIM SANDBOX (Phase 12, Step 5)
//
// Owns the live GameState and drives the loop (autoplay on a timer / step on a
// click). New in Step 5: a data-driven PLAY-BY-PLAY FEED off game.log and a live
// BOX SCORE built from the play feed + engine accumulators. The named feed lives
// in "random" mode (the seeded event engine), so the sandbox defaults to it.
// =============================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  advancePossession, gradeState, initGameState, formatClock,
  type GameState, type LineupState, type PlayerSlot as Slot, type PossessionMode, type Side, type SimSettings,
} from "@/lib/sim/game-sim";
import { C, FONT_VARS, COURT_HANDICAP_CSS } from "../tokens";
import { confidenceBadge, toneColor } from "../ui-labels";
import { CATEGORY_LABEL, sideTheme } from "./player-slot-model";
import { PlayerSlot } from "./PlayerSlot";
import { LiveCourtPanel } from "./LiveCourtPanel";
import type { StatCategory } from "@/lib/stat-par/stat-par";

const SPEEDS: { label: string; ms: number }[] = [
  { label: "slow", ms: 1400 }, { label: "med", ms: 650 }, { label: "fast", ms: 250 }, { label: "blitz", ms: 90 },
];

const DEFAULTS: SimSettings = {
  possessionMode: "random", progressionMode: "autoplay", possessionSeconds: 19, openingOffense: "X", seed: 1,
};

export interface SimSandboxProps {
  initialX: LineupState;
  initialY: LineupState;
  title?: string;
}

export function SimSandbox({ initialX, initialY, title = "1v1 Tester" }: SimSandboxProps) {
  const [settings, setSettings] = useState<SimSettings>(DEFAULTS);
  const [game, setGame] = useState<GameState>(() => initGameState(initialX, initialY, DEFAULTS));
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(650);
  const [lockGame, setLockGame] = useState(false); // random mode: keep the same game across resets
  const [boxOpen, setBoxOpen] = useState<{ X: boolean; Y: boolean }>({ X: false, Y: false });

  const slotsPerSide = game.X.slots.length;
  const grade = useMemo(() => gradeState(game), [game]);
  const gradeBySlot = useMemo(() => new Map(grade.perPlayer.map((p) => [p.slotId, p])), [grade]);

  // ---- box score: accumulators (pts/3pm/ast/reb/stl/blk/to) + play feed (fg/ft/pf) ----
  const boxScore = useMemo(() => {
    const shoot: Record<string, { fgm: number; fga: number; tpa: number; ftm: number; fta: number; pf: number }> = {};
    for (const o of game.log) {
      const pl = o.play; if (!pl) continue;
      for (const n in pl.box) {
        const b = pl.box[n];
        const s = (shoot[n] ??= { fgm: 0, fga: 0, tpa: 0, ftm: 0, fta: 0, pf: 0 });
        s.fgm += b.fgm ?? 0; s.fga += b.fga ?? 0; s.tpa += b.tpa ?? 0;
        s.ftm += b.ftm ?? 0; s.fta += b.fta ?? 0; s.pf += b.pf ?? 0;
      }
    }
    const rowFor = (s: Slot) => {
      const a = s.accumulated; const nm = s.name ?? s.id;
      const sh = shoot[nm] ?? { fgm: 0, fga: 0, tpa: 0, ftm: 0, fta: 0, pf: 0 };
      return {
        nm, pts: a.points ?? 0, fgm: sh.fgm, fga: sh.fga, tpm: a.fg3m ?? 0, tpa: sh.tpa,
        ftm: sh.ftm, fta: sh.fta, reb: (a.oreb ?? 0) + (a.dreb ?? 0), ast: a.assists ?? 0,
        stl: a.steals ?? 0, blk: a.blocks ?? 0, to: a.turnovers ?? 0, pf: sh.pf,
      };
    };
    const rowsFor = (side: Side) => {
      const roster = game.rosters?.[side];
      if (roster && roster.players.length > 5) {
        return { starters: roster.players.slice(0, 5).map(rowFor), bench: roster.players.slice(5).map(rowFor) };
      }
      const lu = side === "X" ? game.X : game.Y;
      return { starters: lu.slots.map(rowFor), bench: [] as ReturnType<typeof rowFor>[] };
    };
    return { X: rowsFor("X"), Y: rowsFor("Y") };
  }, [game]);

  // ---- the loop: autoplay = advancePossession on a timer --------------------
  useEffect(() => {
    if (!playing) return;
    if (game.gameOver) { setPlaying(false); return; }
    const id = setTimeout(() => setGame((g) => advancePossession(g, settings)), speedMs);
    return () => clearTimeout(id);
  }, [playing, game, settings, speedMs]);

  // ---- mutators ------------------------------------------------------------
  const step = () => { if (!game.gameOver) setGame((g) => advancePossession(g, settings)); };
  const stripAccum = (l: LineupState): LineupState => ({ ...l, slots: l.slots.map((s) => ({ ...s, accumulated: {} })) });
  const reset = () => {
    setPlaying(false);
    setSettings((s) => {
      const next = s.possessionMode === "random" && !lockGame
        ? { ...s, seed: Math.floor(Math.random() * 1e9) } // fresh random game each reset
        : s;
      setGame((g) => initGameState(stripAccum(g.X), stripAccum(g.Y), next));
      return next;
    });
  };

  const updateSlot = (side: Side, idx: number, next: Slot) => setGame((g) => {
    if (side === "X") return { ...g, X: { ...g.X, slots: g.X.slots.map((s, i) => (i === idx ? next : s)) } };
    return { ...g, Y: { ...g.Y, slots: g.Y.slots.map((s, i) => (i === idx ? next : s)) } };
  });

  const patchSettings = (p: Partial<SimSettings>) => setSettings((s) => ({ ...s, ...p }));

  // ---- styling atoms -------------------------------------------------------
  const rootStyle = { ...FONT_VARS, background: C.void, color: C.chalk, minHeight: "100vh", padding: "26px 22px 64px", fontFamily: "var(--f-ui)" } as React.CSSProperties;
  const mono = (size: number, color: string): React.CSSProperties => ({ fontFamily: "var(--f-mono)", fontSize: size, color, letterSpacing: ".04em" });
  const pill = (active: boolean, accent: string): React.CSSProperties => ({
    fontFamily: "var(--f-mono)", fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", cursor: "pointer",
    padding: "5px 11px", border: `1px solid ${active ? accent : C.hairline}`, color: active ? C.void : C.bone,
    background: active ? accent : "transparent",
  });
  const ctrlBtn = (accent: string, glow: string, edge: string, disabled = false): React.CSSProperties => ({
    fontFamily: "var(--f-stamp)", fontSize: 14, textTransform: "uppercase", letterSpacing: ".06em",
    padding: "7px 16px", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1,
    color: accent, background: glow, border: `1px solid ${edge}`,
  });
  const numInput = (w = 64): React.CSSProperties => ({
    fontFamily: "var(--f-mono)", fontSize: 11, width: w, textAlign: "right", color: C.chalk,
    background: C.pitch, border: `1px solid ${C.hairline}`, padding: "4px 6px",
  });

  const modes: PossessionMode[] = ["rate", "random", "scripted"];

  // ---- header (clock / score) ---------------------------------------------
  const header = (
    <header style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <div style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 30, letterSpacing: "-.01em", lineHeight: 0.95 }}>
          LIVE COURT <span style={{ color: C.ember }}>SIMULATION</span>
        </div>
        <span style={{ ...mono(9.5, C.bone), border: `1px solid ${C.hairline}`, padding: "2px 8px", textTransform: "uppercase", letterSpacing: ".14em" }}>{title}</span>
        <span style={{ ...mono(8.5, C.bpText), border: `1px solid ${C.bpEdge}`, padding: "2px 8px", textTransform: "uppercase", letterSpacing: ".12em" }} title="this is a synthetic sandbox; the composite verdict stays shadow / not applied">⚗ synthetic sandbox</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--f-num)", fontSize: 30, color: C.ember }}>{game.score.X}</span>
          <span style={{ ...mono(11, C.fade) }}>—</span>
          <span style={{ fontFamily: "var(--f-num)", fontSize: 30, color: C.bpText }}>{game.score.Y}</span>
        </div>
        <div style={{ ...mono(13, C.chalk), letterSpacing: ".08em" }}>{formatClock(game.clock)}</div>
        <div style={mono(10, C.bone)}>poss {game.possessionCount}</div>
        {!game.gameOver && (
          <div style={mono(10, game.offense === "X" ? C.ember : C.bpText)}>
            ● {game.offense} on offense
          </div>
        )}
        {game.gameOver && (
          <div style={{ ...mono(11, C.scoreboard), border: `1px solid ${C.emberEdge}`, padding: "2px 10px", letterSpacing: ".18em" }}>FINAL</div>
        )}
      </div>
    </header>
  );

  // ---- settings + controls -------------------------------------------------
  const controls = (
    <div style={{ background: C.pitch, border: `1px solid ${C.hairline}`, padding: "12px 14px", marginBottom: 16, display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}>
        <button onClick={() => setPlaying((p) => !p)} disabled={game.gameOver}
          style={ctrlBtn(C.ember, C.emberGlow, C.emberEdge, game.gameOver)}>
          {playing ? "❚❚ pause" : "▶ play"}
        </button>
        <button onClick={step} disabled={playing || game.gameOver}
          style={ctrlBtn(C.bpText, C.bpGlow, C.bpEdge, playing || game.gameOver)}>
          ▸ step
        </button>
        <button onClick={reset} style={ctrlBtn(C.bone, "transparent", C.hairline)}>↺ reset</button>

        <span style={{ ...mono(9, C.fade), marginLeft: 6 }}>speed</span>
        {SPEEDS.map((s) => (
          <button key={s.label} onClick={() => setSpeedMs(s.ms)} style={pill(speedMs === s.ms, C.scoreboard)}>{s.label}</button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap", borderTop: `1px solid ${C.hairline}`, paddingTop: 10 }}>
        <span style={{ ...mono(9, C.bone), textTransform: "uppercase", letterSpacing: ".14em" }}>mode</span>
        {modes.map((m) => (
          <button key={m} onClick={() => patchSettings({ possessionMode: m })} style={pill(settings.possessionMode === m, C.ember)}>{m}</button>
        ))}

        {settings.possessionMode === "random" && (
          <label style={{ ...mono(9, C.bone), marginLeft: 8, display: "inline-flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <input type="checkbox" checked={lockGame} onChange={(e) => setLockGame(e.target.checked)} />
            lock this game
          </label>
        )}
        {settings.possessionMode === "rate" && (
          <span style={{ ...mono(9, C.fade) }}>rate mode = smeared EV (no named feed); switch to random for play-by-play</span>
        )}
        {settings.possessionMode === "scripted" && (
          <span style={{ ...mono(9, C.scoreboard) }}>no script feed in-sandbox → empty trips (clock still burns)</span>
        )}

        {settings.possessionMode !== "random" && (
          <>
            <span style={{ ...mono(9, C.bone), marginLeft: 8 }}>poss secs</span>
            <input type="number" min={6} max={40} value={settings.possessionSeconds ?? 19} onChange={(e) => patchSettings({ possessionSeconds: parseInt(e.target.value || "19", 10) })} style={numInput(54)} />
          </>
        )}

        <span style={{ ...mono(9, C.bone), marginLeft: 8 }}>opening</span>
        <button onClick={() => patchSettings({ openingOffense: "X" })} style={pill(settings.openingOffense === "X", C.ember)}>X</button>
        <button onClick={() => patchSettings({ openingOffense: "Y" })} style={pill(settings.openingOffense === "Y", C.blueprint)}>Y</button>

        <span style={{ ...mono(8.5, C.fade), marginLeft: 8 }}>↺ reset = fresh game · lock to replay the same one · mode/opening apply on reset</span>
      </div>
    </div>
  );

  // ---- play-by-play feed (random mode) -------------------------------------
  const feed = (
    <div style={{ background: C.pitch, border: `1px solid ${C.hairline}`, marginBottom: 16 }}>
      <div style={{ ...mono(10, C.scoreboard), textTransform: "uppercase", letterSpacing: ".16em", padding: "9px 14px", borderBottom: `1px solid ${C.hairline}` }}>
        play-by-play {settings.possessionMode !== "random" && <span style={{ color: C.fade }}>· random mode only</span>}
      </div>
      <div style={{ maxHeight: 300, overflowY: "auto", padding: "6px 0" }}>
        {game.log.length === 0 && (
          <div style={{ ...mono(10, C.fade), padding: "14px" }}>press ▶ play (or ▸ step) to run possessions…</div>
        )}
        {[...game.log].reverse().slice(0, 60).map((o, i) => {
          const pl = o.play;
          const isSub = !pl && o.note.startsWith("SUB");
          const teamColor = o.offense === "X" ? C.ember : C.bpText;
          const labelColor = !pl ? C.fade : pl.made ? C.chalk : pl.fta > 0 ? C.scoreboard : C.bone;
          if (isSub) {
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "2px 14px 2px 42px", borderBottom: `1px solid ${C.hairline}22` }}>
                <span style={{ color: C.scoreboard, fontSize: 9 }}>⇄</span>
                <span style={{ ...mono(9, C.scoreboard), letterSpacing: 0.3, lineHeight: 1.35 }}>{o.note.replace(/^SUB [XY]: /, "")}</span>
              </div>
            );
          }
          return (
            <div key={i} style={{ display: "flex", gap: 9, alignItems: "baseline", padding: "3px 14px", borderBottom: `1px solid ${C.hairline}22` }}>
              <span style={{ ...mono(8.5, C.fade), minWidth: 26, textAlign: "right" }}>{o.seq}</span>
              <span style={{ color: teamColor, fontSize: 9 }}>●</span>
              {pl && (
                <span style={{ ...mono(8, C.fade), minWidth: 78, whiteSpace: "nowrap" }}>
                  [{pl.startType}/{o.clock ? `${Math.floor(o.clock.secondsRemaining / 60)}:${String(Math.floor(o.clock.secondsRemaining % 60)).padStart(2, "0")}` : `${o.lengthSec}s`}{pl.fastbreak ? " FB" : ""}]
                </span>
              )}
              <span style={{ ...mono(10.5, labelColor), lineHeight: 1.35 }}>{pl ? pl.label : o.note}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ---- box score -----------------------------------------------------------
  type Row = (typeof boxScore.X.starters)[number];
  const COLS: { k: keyof Row | "fg" | "tp" | "ft"; label: string }[] = [
    { k: "pts", label: "PTS" }, { k: "fg", label: "FG" }, { k: "tp", label: "3P" }, { k: "ft", label: "FT" },
    { k: "reb", label: "REB" }, { k: "ast", label: "AST" }, { k: "stl", label: "STL" }, { k: "blk", label: "BLK" },
    { k: "to", label: "TO" }, { k: "pf", label: "PF" },
  ];
  const cellOf = (r: Row, k: typeof COLS[number]["k"]): string => {
    if (k === "fg") return `${r.fgm}/${r.fga}`;
    if (k === "tp") return `${r.tpm}/${r.tpa}`;
    if (k === "ft") return `${r.ftm}/${r.fta}`;
    return String(r[k as keyof Row]);
  };
  const boxCard = (side: Side) => {
    const theme = sideTheme(side);
    const rows = boxScore[side];
    const hasBench = rows.bench.length > 0;
    const th: React.CSSProperties = { ...mono(8.5, C.fade), textTransform: "uppercase", letterSpacing: ".06em", padding: "4px 6px", textAlign: "right" };
    const td: React.CSSProperties = { ...mono(10, C.chalk), padding: "4px 6px", textAlign: "right", whiteSpace: "nowrap" };
    const renderRow = (r: Row, dim = false) => (
      <tr key={r.nm} style={{ borderBottom: `1px solid ${C.hairline}22`, opacity: dim ? 0.6 : 1 }}>
        <td style={{ ...td, textAlign: "left", paddingLeft: 12, color: C.bone, maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis" }}>{r.nm}</td>
        {COLS.map((c) => (
          <td key={c.label} style={{ ...td, color: c.k === "pts" ? theme.accentText : c.k === "pf" && r.pf >= 6 ? C.crText : C.chalk }}>
            {cellOf(r, c.k)}
          </td>
        ))}
      </tr>
    );
    return (
      <div style={{ flex: 1, minWidth: 320, background: C.woodgrain, border: `1px solid ${C.hairline}`, borderTop: `3px solid ${theme.edge}`, overflowX: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px" }}>
          <span style={{ ...mono(10, theme.accentText), textTransform: "uppercase", letterSpacing: ".14em" }}>Lineup {side} · box</span>
          {hasBench && (
            <button
              onClick={() => setBoxOpen((o) => (side === "X" ? { ...o, X: !o.X } : { ...o, Y: !o.Y }))}
              style={{ ...mono(8.5, C.bone), background: "transparent", border: `1px solid ${C.hairline}`, padding: "2px 9px", cursor: "pointer", textTransform: "uppercase", letterSpacing: ".08em" }}
            >{boxOpen[side] ? "▾ starters only" : `▸ + bench (${rows.bench.length})`}</button>
          )}
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.hairline}` }}>
              <th style={{ ...th, textAlign: "left", paddingLeft: 12 }}>player</th>
              {COLS.map((c) => <th key={c.label} style={th}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.starters.map((r) => renderRow(r))}
            {boxOpen[side] && hasBench && (
              <>
                <tr key="benchdiv"><td colSpan={COLS.length + 1} style={{ ...mono(8, C.fade), textTransform: "uppercase", letterSpacing: ".12em", padding: "6px 12px", borderTop: `1px solid ${C.hairline}` }}>bench</td></tr>
                {rows.bench.map((r) => renderRow(r, true))}
              </>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  // ---- lineup columns ------------------------------------------------------
  const column = (side: Side) => {
    const theme = sideTheme(side);
    const lineup = side === "X" ? game.X : game.Y;
    return (
      <div style={{ flex: 1, minWidth: 280, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ ...mono(10, theme.accentText), textTransform: "uppercase", letterSpacing: ".16em", borderBottom: `1px solid ${theme.edge}`, paddingBottom: 5 }}>
          Lineup {side} · {grade.rollup[side].score} pts
        </div>
        {lineup.slots.map((s, i) => (
          <PlayerSlot
            key={s.id}
            slot={s}
            onChange={(next) => updateSlot(side, i, next)}
            side={side}
            index={i + 1}
            possessionMode={settings.possessionMode}
            grade={gradeBySlot.get(s.id) ?? null}
            offTrips={game.offPossessions[side]}
            readOnly={playing}
            defaultCollapsed={slotsPerSide > 1}
          />
        ))}
      </div>
    );
  };

  // ---- rollup readout ------------------------------------------------------
  const rollupCard = (side: Side) => {
    const theme = sideTheme(side);
    const r = grade.rollup[side];
    const cb = confidenceBadge(r.meanConfidence, true);
    const heads = (Object.entries(r.headlineCategories) as [StatCategory, number][])
      .sort((a, b) => b[1] - a[1]).slice(0, 3);
    return (
      <div style={{ flex: 1, minWidth: 260, background: C.woodgrain, border: `1px solid ${C.hairline}`, borderTop: `3px solid ${theme.edge}`, padding: "11px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ ...mono(10, theme.accentText), textTransform: "uppercase", letterSpacing: ".14em" }}>Lineup {side} rollup</span>
          <span style={{ fontFamily: "var(--f-num)", fontSize: 22, color: theme.accentText }}>{r.score}</span>
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
          <span style={mono(10, C.bone)}>mean comp <span style={{ color: r.meanComposite > 0 ? toneColor("trust") : C.crText }}>{r.meanComposite > 0 ? "+" : ""}{r.meanComposite.toFixed(3)}</span></span>
          <span style={mono(10, C.bone)}>conf <span style={{ color: toneColor(cb.tone) }}>{cb.label}</span></span>
          <span style={mono(10, C.bone)}>beating court <span style={{ color: C.chalk }}>{r.beatingCourt}/{r.players}</span></span>
        </div>
        {heads.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: "2px 10px" }}>
            <span style={mono(8.5, C.fade)}>headlines:</span>
            {heads.map(([cat, n]) => (
              <span key={cat} style={mono(9.5, C.bone)}>{CATEGORY_LABEL[cat]} <span style={{ color: C.fade }}>×{n}</span></span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ch-anim" style={rootStyle}>
      <style dangerouslySetInnerHTML={{ __html: COURT_HANDICAP_CSS }} />
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {header}
        {controls}
        {feed}
        <div style={{ marginBottom: 16 }}>
          <LiveCourtPanel court={game.court} possessionCount={game.possessionCount} />
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 16 }}>
          {column("X")}
          {column("Y")}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
          {boxCard("X")}
          {boxCard("Y")}
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
          {rollupCard("X")}
          {rollupCard("Y")}
        </div>

        <div style={{ ...mono(8.5, C.fade), marginTop: 18, lineHeight: 1.5, maxWidth: 760 }}>
          Play-by-play and box score are driven by the seeded event engine (random mode): named shooters, data-driven
          shot types, real free-throw / and-1 rates, and variable possession length. The composite verdict stays
          observational (shadow). FG/FT/PF come from the play feed; rebounds, steals, blocks, and turnovers from the
          engine accumulators.
        </div>
      </div>
    </div>
  );
}
