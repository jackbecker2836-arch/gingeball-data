// =============================================================================
// COURT HANDICAP — DESIGN TOKENS (Phase 4A)
// Single source for color, type roles, and motion. Components never hardcode a
// hex or a font-family; they read from here. Mirrors the Gingeball leaderboard
// token system (ember = identity, scoreboard = market, blueprint/crimson = O/D).
// =============================================================================

export const C = {
  void: "#09090B", pitch: "#0D0E14", bench: "#1A1C28", woodgrain: "#2A1C0C",
  chalk: "#F0EBE1", bone: "#968D82", fade: "#4A4744",
  ember: "#CF4E15", scoreboard: "#E49B18", blueprint: "#1B6BA8", bpText: "#5BA8D4",
  crimson: "#B32424", crText: "#CC6B6B",
  staleRust: "#C2611C", cached: "#6E6A60",
  emberGlow: "rgba(207,78,21,0.12)", emberEdge: "rgba(207,78,21,0.28)",
  bpGlow: "rgba(27,107,168,0.12)", bpEdge: "rgba(91,168,212,0.28)",
  hairline: "rgba(255,255,255,0.08)",
} as const;

// Type roles, as CSS variables. Swap a role to a licensed Adobe face in ONE line.
export const FONT_VARS: Record<string, string> = {
  "--f-title": "'Bricolage Grotesque',sans-serif",
  "--f-num": "'Anton',Impact,sans-serif",
  "--f-serif": "'Fraunces',Georgia,serif",
  "--f-label": "'Rubik Spray Paint',sans-serif",
  "--f-diff": "'Rubik Wet Paint',sans-serif",
  "--f-mono": "'Space Mono',monospace",
  "--f-annot": "'Caveat',cursive",
  "--f-stamp": "'Rubik Dirt',sans-serif",
  "--f-ui": "'Bricolage Grotesque',sans-serif",
};

// Global CSS the world injects once. In production prefer next/font; this keeps
// the component bundle self-contained and portable.
export const COURT_HANDICAP_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,700;12..96,800&family=Anton&family=Fraunces:ital,opsz,wght@1,9..144,600&family=Rubik+Spray+Paint&family=Rubik+Wet+Paint&family=Rubik+Dirt&family=Space+Mono:wght@400;700&family=Caveat:wght@600;700&display=swap');
@keyframes ch-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}
@keyframes ch-pop{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
@keyframes ch-up{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
/* Phase 10C — meaningful motion v1. BASE CSS = the truthful end-state (everything
   visible, ring at its earned arc). Motion is ADDED only under no-preference, so
   reduced-motion users get the full truth instantly. Stage delays mirror ENTRANCE
   in motion.ts; the order encodes the spine (proof before verdict, ring after). */
@keyframes ch-ring{to{stroke-dashoffset:var(--ring-offset)}}
@keyframes ch-breath-once{0%{transform:scale(.99)}55%{transform:scale(1.004)}100%{transform:scale(1)}}
.ch-stage{opacity:1;transform:none}
.ch-ring .ch-ring-fill{stroke-dashoffset:var(--ring-offset)}
@media(prefers-reduced-motion:no-preference){
  /* market (delay 0) + verdict fade in; the verdict's delay comes inline from the
     timeline (motion.ts ENTRANCE.verdictStamp). The court card no longer fades as a
     block — its internal marks carry the staging (10F: removes a competing fade). */
  .ch-anim .ch-stage{opacity:0;animation:ch-up .5s ease both}
  .ch-anim .ch-stage[data-market-form="alive"]{opacity:0;animation:ch-up .5s ease both, ch-breath-once 1.2s ease .5s both}
  /* the ring fills to the earned arc only; its delay is single-sourced via --ring-delay */
  .ch-anim .ch-ring .ch-ring-fill{stroke-dashoffset:var(--ring-circ);animation:ch-ring var(--ring-dur,900ms) var(--ring-ease,ease) var(--ring-delay,2080ms) both}
}
@media(prefers-reduced-motion:reduce){.ch-anim *{animation:none!important}}
`;
