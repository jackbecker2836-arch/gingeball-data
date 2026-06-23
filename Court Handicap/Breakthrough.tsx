import React from "react";
import { C } from "./tokens";

// THE BREAKTHROUGH — the product mark. `beat` toggles the cut: through the par
// line (beat the court) vs. stopping short (trapped). Pure, no state.
export function Breakthrough({ size = 30, beat = true, color = C.ember }: { size?: number; beat?: boolean; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M 5 27 C 14 26, 26 28, 35 26" fill="none" stroke={C.bone} strokeWidth="2.4" strokeLinecap="round" />
      <path d={beat ? "M 11 36 C 17 24, 22 18, 31 5" : "M 13 36 C 16 33, 18 31, 20 29"} fill="none" stroke={color} strokeWidth="3.2" strokeLinecap="round" />
      {beat && <path d="M 31 5 l -1.5 6 l 6 -2 z" fill={color} />}
    </svg>
  );
}
