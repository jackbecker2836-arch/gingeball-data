// =============================================================================
// GINGEBALL COURT HANDICAP — UI LABELS (Phase 8)
//
// The honesty-critical labels the interface renders, extracted into ONE pure,
// testable place. Components import these; the UI honesty audit imports the SAME
// functions and asserts their output. That makes "fallback never looks live" a
// literal unit test instead of an eyeball check — the audit tests exactly the
// strings and tones the screen shows.
//
// Tone vocabulary (Palette v2, Phase 10B — axis-separated so no two different
// truths share a near-identical hue+shape):
//   trust       -> green   (ONLY a genuine fresh live read earns this)
//   warn        -> crimson (failed / degraded source: fallback; LOW confidence)
//   caution     -> amber   (MEDIUM confidence ONLY — confidence owns amber)
//   synthetic   -> blue    (mock / fixture / synthetic — honest, not measured)
//   stale       -> rust    (a live read aging past freshness; + clock marker)
//   cached      -> grey    (last-known-good: a cached truth, dulled)
//   hypothetical-> blue    (what-if override; + ~ marker, never a truth-state)
//
// Palette-v2 correction: amber (#E49B18) was overloaded across MEDIUM confidence,
// last-known-good, and what-if. It is now confidence-only. last-known-good moved to
// grey (cached); stale moved off crimson to rust + a clock so it never reads like a
// fallback; what-if moved off amber to blue + a tilde. The collision is resolved by
// hue + shape + label together, and every badge survives grayscale via its marker.
// =============================================================================

import type { SourceState } from "@/lib/manifest-view-model";
import { C } from "./tokens";

export type Tone = "trust" | "warn" | "caution" | "synthetic" | "stale" | "cached" | "hypothetical";
export type BadgeMarker = "dot" | "clock" | "cache" | "down" | "flask" | "tilde";

// The single tone -> color map. Components import THIS instead of a local copy, so
// the UI honesty audit can assert the colors are pairwise-distinct per axis.
export function toneColor(tone: Tone): string {
  switch (tone) {
    case "trust":        return "#357A4E";
    case "warn":         return C.crText;       // #CC6B6B
    case "caution":      return C.scoreboard;   // #E49B18 — MEDIUM confidence
    case "synthetic":    return C.bpText;        // #5BA8D4
    case "stale":        return C.staleRust;     // #C2611C — oxidized, aging
    case "cached":       return C.cached;        // #6E6A60 — dulled cache
    case "hypothetical": return C.bpText;        // blue + tilde marker
  }
}

export interface SourceBadge { label: string; tone: Tone; readsLive: boolean; marker: BadgeMarker }

// The single source of truth for the source-state badge. INVARIANT: only the
// "live" state may produce readsLive=true or the trust tone. Everything else must
// say what it is — so a mock, a stale line, or a fallback can never look live. Each
// badge also carries a MARKER glyph so it disambiguates without relying on hue.
export function sourceStateBadge(state: SourceState): SourceBadge {
  switch (state) {
    case "live":             return { label: "LIVE", tone: "trust", readsLive: true, marker: "dot" };
    case "stale_live":       return { label: "LIVE · STALE", tone: "stale", readsLive: false, marker: "clock" };
    case "last_known_good":  return { label: "LAST-KNOWN-GOOD", tone: "cached", readsLive: false, marker: "cache" };
    case "fixture_fallback": return { label: "FALLBACK", tone: "warn", readsLive: false, marker: "down" };
    case "mock":             return { label: "SYNTHETIC", tone: "synthetic", readsLive: false, marker: "flask" };
    case "fixture":          return { label: "FIXTURE", tone: "synthetic", readsLive: false, marker: "flask" };
    case "synthetic_audit":  return { label: "SYNTHETIC", tone: "synthetic", readsLive: false, marker: "flask" };
  }
}

export interface ConfidenceBadge { tier: "HIGH" | "MEDIUM" | "LOW"; label: string; tone: Tone }

// Mirrors the verdict-confidence engine thresholds (HIGH>=0.72, MEDIUM>=0.50).
// PROVISIONAL is appended whenever the grade rests on a synthetic data diet — so a
// strong verdict can never visually hide a low or provisional confidence.
export function confidenceBadge(finalConfidence: number, provisional: boolean): ConfidenceBadge {
  const tier = finalConfidence >= 0.72 ? "HIGH" : finalConfidence >= 0.5 ? "MEDIUM" : "LOW";
  const tone: Tone = tier === "HIGH" ? "trust" : tier === "MEDIUM" ? "caution" : "warn";
  const label = `${tier}${provisional ? " · PROVISIONAL" : ""}`;
  return { tier, label, tone };
}

// Win probability display: never invent a number. Undefined -> an explicit dash.
export function winProbabilityLabel(wp?: { home: number; away: number }): string {
  return wp ? `${wp.home}·${wp.away}` : "— (no moneyline)";
}

// The per-node provenance tag on the CourtGraph: an engine-graded player vs a
// fixture-estimated one. A non-modeled archetype must NOT read as engine-graded.
export function nodeBasisTag(modeled: boolean): { label: string; tone: Tone } {
  return modeled ? { label: "engine", tone: "trust" } : { label: "fixture estimate", tone: "synthetic" };
}

// The non-scoring proof is ALWAYS tracked-not-valued in v1. One phrase, one place.
export const NON_SCORING_LABEL = "tracked · not valued";
