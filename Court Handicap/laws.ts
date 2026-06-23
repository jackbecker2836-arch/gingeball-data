// =============================================================================
// COURT HANDICAP — LAWS OF THE COURT (glossary data)
// The product's mythology, as data. The glossary component renders from this;
// adding a law is a data edit, not a UI change.
// =============================================================================

export interface Law { key: string; role: string; definition: string; }

export const LAWS: Law[] = [
  { key: "THE BURN", role: "market gravity",
    definition: "The betting line scorched into center court. The implied score is branded into the floor, and the favorite burns hotter. The first law — the market sets the court before the ball is tipped." },
  { key: "THE SEAMS", role: "lineup tension",
    definition: "The floor's stitching, pulled taut toward the lineup's center of mass. A different five tensions the court differently — and a role conflict frays a seam into a broken thread." },
  { key: "THE TRANSLATION", role: "archetype warp",
    definition: "The same court, redrawn for each archetype. A pressure-rim guard meets a trap; a rim protector meets relief. The geometry doesn't change — its meaning does." },
  { key: "THE TRAIL", role: "possession proof",
    definition: "Every possession leaves an evidence mark along the baseline. Beats burn ember; misses fade to bone. Proof, not opinion." },
  { key: "THE SCAR", role: "the court beaten",
    definition: "When a player beats the court, the proof rises into a single stroke that cuts up through the par line. The scar is earned, never placed." },
  { key: "THE RESOLVE", role: "confidence",
    definition: "Confidence is how fully the court draws itself in. A sure read is inked solid; a shaky one is left sketched and unfinished, refusing to resolve." },
  { key: "THE RULING", role: "the verdict",
    definition: "Gingeball's final judgment, landed on the baseline like a sentence entered into the record. Beat, survived, or crushed." },
  { key: "THE BREAKTHROUGH", role: "the glyph",
    definition: "The product's mark: a struck par line with a stroke cutting through it. Through the line = beat the court. Short of it = trapped." },
];
