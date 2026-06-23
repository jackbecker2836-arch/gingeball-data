"use client";
// =============================================================================
// GINGEBALL COURT HANDICAP — ROSTER BUILDER (real players & teams)
//
// Wraps the live SimSandbox with a setup panel. Loading a team populates that
// side's FULL pool for the season (every player in the data for that team), and
// the user picks the five that take the floor (a sensible starting five is
// pre-selected, fully editable). Search adds any player from any team. Changing
// the chosen five re-seeds the game below; slots stay editable in the sim. The
// composite verdict stays shadow — this only changes WHO fills the slots, with
// real names and real box rates.
//
// Pool depth is whatever players.js contains (currently a ≥15-mpg subset); this
// UI shows everything available and scales automatically as the data grows.
// =============================================================================

import React, { useMemo, useState } from "react";
import { C, FONT_VARS, COURT_HANDICAP_CSS } from "../tokens";
import type { LineupState, PlayerSlot as Slot, Side } from "@/lib/sim/game-sim";
import { getSimRosterBoxes } from "./sim-roster-data";
import {
  searchPlayers, seasonsAvailable, teamsForSeason, teamRoster, startingFive,
  slotFromBox, type RosterBox,
} from "./roster-archetype-map";
import { makeRoster } from "@/lib/sim/sim-subs";
import { SimSandbox } from "./SimSandbox";

const prettyArch = (a: string) => a.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
const accentOf = (side: Side) => (side === "Y" ? C.blueprint : C.ember);
const reId = (slots: Slot[], side: Side): Slot[] => slots.map((s, i) => ({ ...s, id: `${side.toLowerCase()}${i + 1}` }));
const slotsFromBoxes = (rows: RosterBox[], side: Side): Slot[] => reId(rows.map((b) => slotFromBox(b, "tmp")), side);

// Attach a 10-man rotation to a picked lineup: the chosen five are the starters,
// the bench is the next-best of the loaded team pool by minutes. Without this the
// sim only ever runs the starters (no rosters -> no substitutions).
function withBench(lu: LineupState, pool: RosterBox[], side: Side): LineupState {
  const prefix = side.toLowerCase();
  const starterNames = new Set(lu.slots.map((s) => s.name));
  const starterSpecs = lu.slots.map((s, i) => {
    const b = pool.find((x) => x.name === s.name);
    return { slot: { ...s, id: `${prefix}${i + 1}` }, pos: b?.pos ?? "SF", mpg: b?.mpg ?? 28 };
  });
  const bench = pool.filter((b) => !starterNames.has(b.name)).sort((a, b) => (b.mpg ?? 0) - (a.mpg ?? 0)).slice(0, 5);
  const benchSpecs = bench.map((b, j) => ({ slot: slotFromBox(b, `${prefix}${6 + j}`), pos: b.pos, mpg: b.mpg ?? 12 }));
  return { ...lu, team: (pool[0]?.teams ?? [])[0], roster: makeRoster([...starterSpecs, ...benchSpecs]) };
}

export interface RosterBuilderProps {
  initialSeason: string;
  initialTeamX: string;
  initialTeamY: string;
}

export function RosterBuilder({ initialSeason, initialTeamX, initialTeamY }: RosterBuilderProps) {
  const boxes = useMemo(() => getSimRosterBoxes(), []);
  const seasons = useMemo(() => seasonsAvailable(boxes), [boxes]);

  const [seasonX, setSeasonX] = useState(initialSeason);
  const [seasonY, setSeasonY] = useState(initialSeason);
  const [teamX, setTeamX] = useState(initialTeamX);
  const [teamY, setTeamY] = useState(initialTeamY);

  const [poolX, setPoolX] = useState<RosterBox[]>(() => teamRoster(boxes, initialSeason, initialTeamX));
  const [poolY, setPoolY] = useState<RosterBox[]>(() => teamRoster(boxes, initialSeason, initialTeamY));
  const [X, setX] = useState<LineupState>(() => ({ side: "X", slots: slotsFromBoxes(startingFive(teamRoster(boxes, initialSeason, initialTeamX)), "X") }));
  const [Y, setY] = useState<LineupState>(() => ({ side: "Y", slots: slotsFromBoxes(startingFive(teamRoster(boxes, initialSeason, initialTeamY)), "Y") }));
  const [simKey, setSimKey] = useState(0);

  const setSide = (side: Side, slots: Slot[]) => {
    const lu: LineupState = { side, slots: reId(slots.slice(0, 5), side) };
    if (side === "X") setX(lu); else setY(lu);
    setSimKey((k) => k + 1); // re-seed the sim with the new five
  };

  // ---- team loader: fills the pool + pre-selects a starting five ------------
  const loadTeam = (side: Side) => {
    const season = side === "X" ? seasonX : seasonY;
    const team = side === "X" ? teamX : teamY;
    const roster = teamRoster(boxes, season, team);
    if (side === "X") setPoolX(roster); else setPoolY(roster);
    setSide(side, slotsFromBoxes(startingFive(roster), side));
  };

  // ---- selection ------------------------------------------------------------
  const isSelected = (side: Side, b: RosterBox) => (side === "X" ? X : Y).slots.some((s) => s.name === b.name);
  const togglePlayer = (side: Side, b: RosterBox) => {
    const cur = (side === "X" ? X : Y).slots;
    if (cur.some((s) => s.name === b.name)) {
      if (cur.length <= 1) return;
      setSide(side, cur.filter((s) => s.name !== b.name));
    } else {
      if (cur.length >= 5) return;
      setSide(side, [...cur, slotFromBox(b, "tmp")]);
    }
  };
  const removeSlot = (side: Side, idx: number) => {
    const cur = (side === "X" ? X : Y).slots;
    if (cur.length <= 1) return;
    setSide(side, cur.filter((_, i) => i !== idx));
  };

  // ---- search add (any player, any team) ------------------------------------
  const [query, setQuery] = useState("");
  const results = useMemo(() => (query.trim() ? searchPlayers(boxes, query, 8) : []), [boxes, query]);
  const addFromSearch = (side: Side, b: RosterBox) => {
    const cur = (side === "X" ? X : Y).slots;
    if (cur.length >= 5 || cur.some((s) => s.name === b.name)) return;
    const pool = side === "X" ? poolX : poolY;
    if (!pool.some((p) => p.name === b.name)) { if (side === "X") setPoolX([...pool, b]); else setPoolY([...pool, b]); }
    setSide(side, [...cur, slotFromBox(b, "tmp")]);
  };

  // ---- styling atoms --------------------------------------------------------
  const mono = (size: number, color: string): React.CSSProperties => ({ fontFamily: "var(--f-mono)", fontSize: size, color, letterSpacing: ".04em" });
  const label: React.CSSProperties = { ...mono(9, C.bone), textTransform: "uppercase", letterSpacing: ".14em" };
  const selectStyle = (accent: string): React.CSSProperties => ({ fontFamily: "var(--f-mono)", fontSize: 11, color: C.chalk, background: C.pitch, border: `1px solid ${accent}55`, padding: "5px 7px", cursor: "pointer" });
  const btn = (accent: string): React.CSSProperties => ({ fontFamily: "var(--f-stamp)", fontSize: 12, textTransform: "uppercase", letterSpacing: ".06em", color: accent, background: "transparent", border: `1px solid ${accent}`, padding: "5px 12px", cursor: "pointer" });
  const chip = (accent: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, ...mono(10.5, C.chalk), background: C.woodgrain, border: `1px solid ${accent}44`, borderLeft: `3px solid ${accent}`, padding: "4px 8px" });

  // a single pool row (toggle membership in the five)
  const poolRow = (side: Side, b: RosterBox) => {
    const accent = accentOf(side);
    const sel = isSelected(side, b);
    const cur = (side === "X" ? X : Y).slots;
    const atCap = cur.length >= 5 && !sel;
    return (
      <button key={`${b.name}-${b.season}`} onClick={() => togglePlayer(side, b)} disabled={atCap}
        style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", textAlign: "left",
          background: sel ? `${accent}1f` : "transparent", border: `1px solid ${sel ? accent : C.hairline}`,
          padding: "5px 8px", cursor: atCap ? "not-allowed" : "pointer", opacity: atCap ? 0.4 : 1 }}>
        <span style={{ ...mono(11, sel ? accent : C.bone), width: 12, textAlign: "center" }}>{sel ? "✓" : "+"}</span>
        <span style={{ ...mono(11, C.chalk), flex: 1 }}>{b.name}</span>
        <span style={mono(9, C.fade)}>{b.pos} · {b.mpg}m · {b.ppg}p</span>
      </button>
    );
  };

  // ---- per-side setup column ------------------------------------------------
  const sidePanel = (side: Side) => {
    const accent = accentOf(side);
    const lineup = side === "X" ? X : Y;
    const pool = side === "X" ? poolX : poolY;
    const season = side === "X" ? seasonX : seasonY;
    const setSeason = side === "X" ? setSeasonX : setSeasonY;
    const teams = teamsForSeason(boxes, season);
    const team = side === "X" ? teamX : teamY;
    const setTeam = side === "X" ? setTeamX : setTeamY;
    return (
      <div style={{ flex: 1, minWidth: 300, border: `1px solid ${C.hairline}`, borderTop: `3px solid ${accent}`, background: C.pitch, padding: "11px 13px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
          <span style={{ ...mono(11, accent), textTransform: "uppercase", letterSpacing: ".14em" }}>Lineup {side}</span>
          <span style={mono(9.5, lineup.slots.length === 5 ? accent : C.scoreboard)}>{lineup.slots.length}/5 selected</span>
        </div>

        {/* team loader */}
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 9 }}>
          <span style={label}>team</span>
          <select value={season} onChange={(e) => setSeason(e.target.value)} style={selectStyle(accent)}>
            {seasons.map((s) => <option key={s} value={s} style={{ background: C.pitch }}>{s}</option>)}
          </select>
          <select value={team} onChange={(e) => setTeam(e.target.value)} style={selectStyle(accent)}>
            {teams.map((t) => <option key={t} value={t} style={{ background: C.pitch }}>{t}</option>)}
          </select>
          <button onClick={() => loadTeam(side)} style={btn(accent)}>load</button>
        </div>

        {/* current five */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 9 }}>
          {lineup.slots.map((s, i) => (
            <span key={s.id} style={chip(accent)} title={prettyArch(s.archetype)}>
              <span>{s.name ?? prettyArch(s.archetype)}</span>
              <button onClick={() => removeSlot(side, i)} title="remove" style={{ ...mono(11, C.bone), background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>✕</button>
            </span>
          ))}
        </div>

        {/* full team pool — pick the five */}
        <div style={{ ...label, marginBottom: 5 }}>team pool — pick 5</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, maxHeight: 220, overflowY: "auto" }}>
          {pool.length === 0
            ? <span style={mono(10, C.fade)}>load a team to see its players</span>
            : pool.map((b) => poolRow(side, b))}
        </div>
      </div>
    );
  };

  const rootStyle = { ...FONT_VARS, background: C.void, padding: "22px 22px 4px", fontFamily: "var(--f-ui)" } as React.CSSProperties;

  return (
    <div>
      <div className="ch-anim" style={rootStyle}>
        <style dangerouslySetInnerHTML={{ __html: COURT_HANDICAP_CSS }} />
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ fontFamily: "var(--f-title)", fontWeight: 800, fontSize: 20, color: C.chalk, marginBottom: 3 }}>
            BUILD THE <span style={{ color: C.ember }}>MATCHUP</span>
          </div>
          <div style={{ ...mono(10.5, C.bone), marginBottom: 14, lineHeight: 1.5, maxWidth: 760 }}>
            Load a real team for each side to see its full roster, then pick the five that take the floor.
            Or search any player to drop in. Slots carry real box rates; changing the five re-seeds the game below.
          </div>

          {/* search */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
            <span style={label}>search player</span>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Jokić, Curry, Tatum…"
              style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: C.chalk, background: C.pitch, border: `1px solid ${C.hairline}`, padding: "6px 9px", minWidth: 240 }} />
          </div>
          {results.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 14, maxWidth: 520 }}>
              {results.map((r) => (
                <div key={`${r.name}-${r.season}`} style={{ display: "flex", alignItems: "center", gap: 10, background: C.woodgrain, border: `1px solid ${C.hairline}`, padding: "5px 9px" }}>
                  <span style={{ ...mono(11, C.chalk), flex: 1 }}>{r.name} <span style={mono(9, C.fade)}>{r.season} · {r.pos} · {r.ppg}p/{r.rpg}r/{r.ast}a</span></span>
                  <button onClick={() => addFromSearch("X", r)} style={btn(C.ember)}>→ X</button>
                  <button onClick={() => addFromSearch("Y", r)} style={btn(C.blueprint)}>→ Y</button>
                </div>
              ))}
            </div>
          )}

          {/* per-side setup */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 4 }}>
            {sidePanel("X")}
            {sidePanel("Y")}
          </div>
        </div>
      </div>

      {/* the live sim — re-mounts (fresh game) whenever the chosen five changes */}
      <SimSandbox key={simKey} initialX={withBench(X, poolX, "X")} initialY={withBench(Y, poolY, "Y")} title="Real Roster" />
    </div>
  );
}
