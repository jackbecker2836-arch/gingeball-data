import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_KEY!;

// Public client (browser-safe, respects RLS)
export const supabase = createClient(url, anon);

// Server client (bypasses RLS — server-side only)
export const supabaseAdmin = createClient(url, service);

export type Player = {
  player_id: string;
  name: string;
  name_slug: string;
  position: string;
  pos_label: string;
  season: string;
  season_year: number;
  tcv: number;
  o_tcv: number;
  d_tcv: number;
  confidence_tier: "high" | "medium" | "low";
  possessions: number;
  iib: number;
  oiib: number;
  diib: number;
  pva: number;
  dpc: number;
  sgv: number;
  dsv: number;
  cov: number;
  miv: number;
  rpv: number;
  ptv: number;
  // RESERVED — undefined/unbuilt TCV component slots, excluded from o_tcv/d_tcv
  // and not in the model (as of 2026-06-20). Nullable so the type stops implying
  // real data; sav/riv are empty, up/cfp are inert NOT NULL DEFAULT 0 placeholders.
  sav: number | null;
  riv: number | null;
  up: number | null;
  cfp: number | null;
  model_version: string;
};
