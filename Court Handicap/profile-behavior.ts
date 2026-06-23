// profile-behavior.ts — Stage 2 of the Archetype Family Scorer wiring.
// Stage 1 attached each player's real profile/family/scoreVector to their slot.
// This module turns that identity into BEHAVIOR: how a profile plays, distinct
// from its raw box rates.
//
// Levers so far:
//   usage    — shot share (who the offense runs through)
//   foulDraw — how often this profile draws shooting fouls (scales the player's
//              real sp.foulDrawn rate; rim attackers up, spot-up shooters down)
// More levers (suppression, playmaking) slot in as additional fields.
//
// All values are RELATIVE weights (neutral = 1.0) applied on top of the player's
// real per-possession rates. They do NOT change per-player make% (that stays the
// real 2024-25 shot-profile calibration).

import type { PlayerSlot } from "./game-sim";

export interface ProfileBehavior {
  /** Shot-usage weight. >1 = takes a bigger share of the offense, <1 = defers. */
  usage: number;
  /** Shooting-foul draw weight. Multiplies the player's real foul-drawn rate. */
  foulDraw?: number;
}

const NEUTRAL: Required<ProfileBehavior> = { usage: 1, foulDraw: 1 };

/** All 45 scoring profiles → behavior. Tuned so star usage lands near real life
 *  and rim-pressure profiles get to the line like they do in the NBA. */
export const PROFILE_BEHAVIOR: Record<string, ProfileBehavior> = {
  // ---- STAR ---------------------------------------------------------------
  heliocentric_star: { usage: 1.5, foulDraw: 1.15 },
  advantage_creator: { usage: 1.45, foulDraw: 1.3 },
  gravity_star: { usage: 1.4 },
  two_way_star: { usage: 1.38, foulDraw: 1.15 },
  // ---- GUARD --------------------------------------------------------------
  primary_pick_and_roll_creator: { usage: 1.38, foulDraw: 1.28 },
  scoring_guard: { usage: 1.32, foulDraw: 1.2 },
  rim_pressure_guard: { usage: 1.25, foulDraw: 1.45 },
  combo_guard: { usage: 1.12, foulDraw: 1.1 },
  secondary_creator: { usage: 1.12, foulDraw: 1.1 },
  pace_pushing_guard: { usage: 1.05, foulDraw: 1.1 },
  point_of_attack_defense_guard: { usage: 0.88, foulDraw: 0.95 },
  // ---- WING ---------------------------------------------------------------
  high_usage_scoring_wing: { usage: 1.4, foulDraw: 1.2 },
  slashing_wing: { usage: 1.15, foulDraw: 1.4 },
  transition_wing: { usage: 0.98 },
  movement_shooter: { usage: 0.95, foulDraw: 0.7 },
  connector_wing: { usage: 0.92, foulDraw: 0.95 },
  three_and_d_wing: { usage: 0.9, foulDraw: 0.8 },
  spot_up_wing: { usage: 0.88, foulDraw: 0.7 },
  lockdown_wing: { usage: 0.85, foulDraw: 0.85 },
  // ---- BIG ----------------------------------------------------------------
  post_hub_big: { usage: 1.28, foulDraw: 1.25 },
  screen_assist_big: { usage: 0.98, foulDraw: 1.05 },
  roll_big: { usage: 0.92, foulDraw: 1.2 },
  stretch_big: { usage: 0.92, foulDraw: 0.85 },
  offensive_rebound_big: { usage: 0.85, foulDraw: 1.12 },
  non_spacing_big: { usage: 0.85, foulDraw: 1.05 },
  rim_protector: { usage: 0.8 },
  // ---- CONNECTOR ----------------------------------------------------------
  touch_hub: { usage: 1.15 },
  ball_mover: { usage: 0.95, foulDraw: 0.9 },
  connector: { usage: 0.95, foulDraw: 0.95 },
  transition_connector: { usage: 0.92 },
  // ---- FORWARD ------------------------------------------------------------
  face_up_forward: { usage: 1.12, foulDraw: 1.1 },
  short_roll_connector: { usage: 0.95, foulDraw: 1.05 },
  small_ball_four: { usage: 0.95 },
  defensive_roamer_forward: { usage: 0.82, foulDraw: 0.95 },
  low_usage_dirty_work_forward: { usage: 0.8 },
  // ---- SPECIALIST ---------------------------------------------------------
  foul_draw_specialist: { usage: 0.98, foulDraw: 1.6 },
  corner_three_specialist: { usage: 0.9, foulDraw: 0.6 },
  lob_threat_specialist: { usage: 0.85, foulDraw: 1.25 },
  low_usage_specialist: { usage: 0.82, foulDraw: 0.8 },
  low_minute_specialist: { usage: 0.82, foulDraw: 0.8 },
  offensive_rebound_specialist: { usage: 0.8, foulDraw: 1.1 },
  // ---- DEFENSE ------------------------------------------------------------
  defensive_stopper: { usage: 0.85, foulDraw: 0.9 },
  screen_navigator: { usage: 0.85, foulDraw: 0.9 },
  switch_defender: { usage: 0.82, foulDraw: 0.9 },
  help_side_roamer: { usage: 0.82, foulDraw: 0.95 },
};

// ---------------------------------------------------------------------------
// Defensive suppression: how much a profile lowers the make% of the shot it
// contests, in make-probability points (before re-centering in the engine).
// Good defenders positive, poor defenders negative. The engine re-centers so
// the league-average contest nets ~0 (no drift in league FG%) — only the
// spread between elite and poor defenders matters. Scaled per player by their
// DEFENSE/BIG score vector (the 120 graded players) and coverage cap.
// ---------------------------------------------------------------------------
const SUPPRESS: Record<string, number> = {
  // elite stoppers
  rim_protector: 0.105, lockdown_wing: 0.09, defensive_stopper: 0.09,
  point_of_attack_defense_guard: 0.08, switch_defender: 0.07,
  screen_navigator: 0.065, help_side_roamer: 0.06, defensive_roamer_forward: 0.06,
  // plus / two-way
  two_way_star: 0.05, screen_assist_big: 0.04, three_and_d_wing: 0.04,
  low_usage_dirty_work_forward: 0.03, connector_wing: 0.025, non_spacing_big: 0.02,
  post_hub_big: 0.02, roll_big: 0.018, small_ball_four: 0.02, offensive_rebound_big: 0.012,
  connector: 0.012,
  // neutral-ish
  touch_hub: 0, ball_mover: 0, transition_connector: 0, transition_wing: -0.01,
  stretch_big: -0.01, low_usage_specialist: 0, low_minute_specialist: 0,
  lob_threat_specialist: 0, face_up_forward: 0, offensive_rebound_specialist: 0,
  // offense-first → leak on D
  spot_up_wing: -0.02, corner_three_specialist: -0.03, movement_shooter: -0.03,
  scoring_guard: -0.03, combo_guard: -0.02, secondary_creator: -0.02,
  heliocentric_star: -0.02, advantage_creator: -0.02, gravity_star: -0.02,
  primary_pick_and_roll_creator: -0.03, rim_pressure_guard: -0.02,
  high_usage_scoring_wing: -0.03, slashing_wing: -0.02, foul_draw_specialist: -0.02,
  pace_pushing_guard: -0.02,
};

/** Defensive strength from the score vector (defense-ish), ~0 when absent. */
function vectorDefScale(slot: PlayerSlot): number {
  const v = slot.scoreVector;
  if (!v) return 1;
  const d = Math.max(v.defense ?? 0, (v.big ?? 0) * 0.7, (v.forward ?? 0) * 0.5);
  const cap = slot.statusCap ?? 0.85;
  // d ~ 0..10; center at 4. Trust the vector more for higher-coverage players.
  return Math.max(0.4, Math.min(1.6, 1 + ((d - 4) / 6) * 0.6 * cap));
}

/** Per-defender suppression (make-prob points) before engine re-centering. */
export function defenderSuppress(slot: PlayerSlot): number {
  const base = slot.profile ? (SUPPRESS[slot.profile] ?? 0) : 0;
  return base * vectorDefScale(slot);
}

// ---------------------------------------------------------------------------
// Playmaking: how much a profile is the one creating the assist. Hubs and
// primary creators rack them up; specialists and rim-runners rarely set up
// teammates. Multiplies the passer's real assist rate when picking who gets
// credited on an assisted make.
// ---------------------------------------------------------------------------
const PLAYMAKE: Record<string, number> = {
  // primary hubs / creators
  touch_hub: 2.2, ball_mover: 2.0, primary_pick_and_roll_creator: 2.0,
  heliocentric_star: 2.2, post_hub_big: 2.0, secondary_creator: 1.6,
  short_roll_connector: 1.4, two_way_star: 1.3, advantage_creator: 1.5,
  combo_guard: 1.5, connector: 1.4, transition_connector: 1.3, screen_assist_big: 1.3,
  pace_pushing_guard: 1.3, gravity_star: 1.2, connector_wing: 1.2,
  scoring_guard: 1.15, face_up_forward: 1.1, small_ball_four: 1.1, rim_pressure_guard: 1.1,
  // neutral-ish finishers
  point_of_attack_defense_guard: 1.0, slashing_wing: 1.0, high_usage_scoring_wing: 1.0,
  transition_wing: 0.9, low_usage_dirty_work_forward: 0.9, foul_draw_specialist: 0.8,
  // low-playmaking finishers / spacers / defenders
  three_and_d_wing: 0.7, lockdown_wing: 0.7, roll_big: 0.7, stretch_big: 0.7,
  non_spacing_big: 0.7, defensive_stopper: 0.7, switch_defender: 0.7,
  screen_navigator: 0.7, help_side_roamer: 0.7, defensive_roamer_forward: 0.8,
  spot_up_wing: 0.6, movement_shooter: 0.6, rim_protector: 0.6,
  offensive_rebound_big: 0.6, low_usage_specialist: 0.6, low_minute_specialist: 0.6,
  corner_three_specialist: 0.5, lob_threat_specialist: 0.5, offensive_rebound_specialist: 0.5,
};

/** Playmaking weight — multiplies the passer's real assist rate in the credit pick. */
export function playmakeMult(slot: PlayerSlot): number {
  return slot.profile ? (PLAYMAKE[slot.profile] ?? 1) : 1;
}

/** How hard profile usage bends shot share. 1 = use the table as tuned. */
const USAGE_DAMP = 1.0;

/** Behavior for a slot, from its real profile (NEUTRAL when not indexed). */
export function behaviorFor(slot: PlayerSlot): ProfileBehavior {
  return (slot.profile && PROFILE_BEHAVIOR[slot.profile]) || NEUTRAL;
}

/** Usage multiplier for the shot-share weighting in possessionRandom. */
export function usageMult(slot: PlayerSlot): number {
  return 1 + (behaviorFor(slot).usage - 1) * USAGE_DAMP;
}

/** Global FT-rate calibration. The engine only draws fouls on tracked shot
 *  attempts, structurally under-counting drive/continuation fouls; this lifts
 *  total FT volume to the NBA team rate (~22 FTA) without touching make%. */
export const FOUL_DRAW_GLOBAL = 1.28;

/** Foul-draw multiplier on the player\x27s real shooting-foul rate (profile × global). */
export function foulDrawMult(slot: PlayerSlot): number {
  return (behaviorFor(slot).foulDraw ?? 1) * FOUL_DRAW_GLOBAL;
}
