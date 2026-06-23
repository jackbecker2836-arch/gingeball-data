#!/usr/bin/env python3
# GINGEBALL_PLAYER_RATES_V2
# Per-player per-possession RATE TABLE for the sim engine (supersedes V1).
#
# Output values = expected counts PER RELEVANT POSSESSION, matching game-sim.ts's
# `rates: Partial<Record<StatId, number>>` (offensive StatIds over offensive trips,
# defensive over defensive trips). They REPLACE defaultRatesForArchetype() per-StatId
# via a {...archetypeDefault, ...realRates} merge; absent StatIds fall back.
#
# Keys = same normalized name as sim-shot-profiles.ts.
#
# PRIMARY source: 2425totals (2024-25, tracking_player_totals) — TRUE off_poss/def_poss
#   denominators + full 2024-25 counts (same season as the shot profiles). entity_id is a
#   stats.nba.com id, resolved to name via nba_api static list.
#     defense (per def_poss):  steals, blocks, dreb, rim_contests(=def_rim_fga)
#     offense (per off_poss):  assists(=assists), secondary_assists, oreb
#   DERIVED offense from shot profiles / off_poss:
#     rim_attempts, fg3m  (exact from shot shares); points, fta  (FT portion ESTIMATED
#     from foulDrawn x fga x 2; points slightly undercounts heavy FT-drawers).
#
# FALLBACK (players absent from 2425totals): defense2526 + component_master_2526 (2025-26),
#   using defense2526.Possessions as the per-end denominator. Keeps coverage maximal.
#
# Still left to archetype default (no clean per-player total source): turnovers, fouls,
#   screen_assists, spacing_gravity, rim_gravity, deterrence_events.
#
# Usage: python gen_player_rates.py --data DIR --profiles sim-shot-profiles.ts --out-dir OUT
import argparse, json, os, re, unicodedata
import pandas as pd

MARKER = "GINGEBALL_PLAYER_RATES_V2"
RATE_STAT_IDS = ["points","fg3m","rim_attempts","fta","assists","secondary_assists",
    "turnovers","oreb","screen_assists","spacing_gravity","rim_gravity",
    "dreb","blocks","steals","fouls","deterrence_events","rim_contests"]

def norm(s):
    s=unicodedata.normalize("NFKD",str(s)).encode("ascii","ignore").decode().lower().strip()
    return re.sub(r"\s+"," ",re.sub(r"[^a-z0-9 -]","",s))

def read_table(p):
    try: return pd.read_excel(p)
    except Exception: return pd.read_csv(p)

def r4(x): return round(float(x),4)

def load_profiles(path):
    txt=open(path,encoding="utf-8").read()
    m=re.search(r'SHOT_PROFILES:\s*Record<string,\s*ShotProfile>\s*=\s*(\{.*?\});',txt,re.S)
    return json.loads(m.group(1))

def derive_offense(sp, off):
    """rim_attempts, fg3m exact; points, fta with estimated FT portion. Per off_poss."""
    fga=sp["fga"]
    rimA=fga*sp["rim"]; tpm=fga*sp["three"]*sp["fgThree"]
    fgm2=fga*(sp["rim"]*sp["fgRim"]+sp["mid"]*sp["fgMid"])
    fta_est=sp["foulDrawn"]*fga*2.0; ftm=fta_est*sp["ftPct"]
    pts=2*fgm2+3*tpm+ftm
    out={}
    if off>0:
        out["rim_attempts"]=r4(rimA/off)
        out["fg3m"]=r4(tpm/off)
        out["fta"]=r4(fta_est/off)
        out["points"]=r4(pts/off)
    return out

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--data",required=True)
    ap.add_argument("--profiles",required=True)
    ap.add_argument("--out-dir",required=True)
    args=ap.parse_args()

    SP=load_profiles(args.profiles)
    prof_keys=set(SP.keys())

    # ---- primary: 2425totals (entity_id -> name) ----
    from nba_api.stats.static import players as nbap
    id2name={p["id"]:p["full_name"] for p in nbap.get_players()}
    t=read_table(os.path.join(args.data,"2425totals.csv.xlsx"))
    t["k"]=t["entity_id"].map(lambda i: norm(id2name[i]) if i in id2name else None)

    out={}; src={}
    for _,r in t.iterrows():
        k=r["k"]
        if k is None or k not in prof_keys: continue
        off=float(r["off_poss"]); defp=float(r["def_poss"])
        rates={}
        if defp>0:
            rates["steals"]=r4(r["steals"]/defp)
            rates["blocks"]=r4(r["blocks"]/defp)
            rates["dreb"]=r4(r["dreb"]/defp)
            rates["rim_contests"]=r4(r["def_rim_fga"]/defp)
        if off>0:
            rates["assists"]=r4(r["assists"]/off)
            rates["secondary_assists"]=r4(r["secondary_assists"]/off)
            rates["oreb"]=r4(r["oreb"]/off)
            rates.update(derive_offense(SP[k],off))
        rates={a:b for a,b in rates.items() if b and b>0}
        if rates: out[k]=rates; src[k]="2425totals"

    # ---- fallback: defense2526 + component_master (2025-26) for players not covered ----
    dfd=read_table(os.path.join(args.data,"defense2526.csv.xlsx")); dfd["k"]=dfd["Player"].map(norm)
    dfc=read_table(os.path.join(args.data,"component_master_2526.csv")); dfc["k"]=dfc["player"].map(norm)
    cmap={r["k"]:r for _,r in dfc.iterrows()}
    for _,d in dfd.iterrows():
        k=d["k"]
        if k not in prof_keys or k in out: continue
        P=float(d["Possessions"])
        if not (P>0): continue
        rates={"steals":r4(d["Steals"]/P),"blocks":r4(d["Blocks"]/P),
               "dreb":r4(d["DReb"]/P),"rim_contests":r4(d["Def Rim FGA"]/P)}
        c=cmap.get(k)
        if c is not None:
            if pd.notna(c.get("oreb")): rates["oreb"]=r4(float(c["oreb"])/P)
            if pd.notna(c.get("adj_ast")): rates["assists"]=r4(float(c["adj_ast"])/P)
            if pd.notna(c.get("secondary_ast")): rates["secondary_assists"]=r4(float(c["secondary_ast"])/P)
        rates.update(derive_offense(SP[k],P))
        rates={a:b for a,b in rates.items() if b and b>0}
        if rates: out[k]=rates; src[k]="fallback_2526"

    os.makedirs(args.out_dir,exist_ok=True)
    json.dump(out,open(os.path.join(args.out_dir,"sim-player-rates.json"),"w"),
              separators=(",",":"),sort_keys=True)
    write_ts(os.path.join(args.out_dir,"sim-player-rates.ts"),out)

    fill={s:0 for s in RATE_STAT_IDS}
    for k in out:
        for s in out[k]: fill[s]+=1
    nprim=sum(1 for v in src.values() if v=="2425totals")
    print(f"// {MARKER}")
    print(f"players with real rates: {len(out)} / {len(prof_keys)} shot-profile keys "
          f"({nprim} from 2425totals, {len(out)-nprim} fallback)")
    print("per-StatId fill:", {k:v for k,v in fill.items() if v})

def write_ts(path,out):
    union=" | ".join(f'"{s}"' for s in RATE_STAT_IDS)
    body=",\n".join(
        f'  {json.dumps(k)}:{{'+",".join(f'"{a}":{b}' for a,b in out[k].items())+'}'
        for k in sorted(out))
    ts=f'''// AUTO-GENERATED by gen_player_rates.py ({MARKER}). Do not hand-edit.
// Real per-player per-possession rates, keyed by the SAME normalized name as
// sim-shot-profiles.ts. Each value is an expected count PER RELEVANT POSSESSION; merge
// OVER defaultRatesForArchetype(arch) in game-sim.ts:
//     rates: {{ ...defaultRatesForArchetype(arch), ...(getPlayerRates(name) ?? {{}}) }}
// Primary basis: 2024-25 true off_poss/def_poss (2425totals); points/fta FT-portion is
// estimated from shot-profile foul-draw. RateStatId is a subset of the engine StatId.
export type RateStatId = {union};

export const PLAYER_RATES: Record<string, Partial<Record<RateStatId, number>>> = {{
{body}
}};

/** Same normalization as sim-shot-profiles.ts keys. */
export function normalizeName(raw: string): string {{
  return raw
    .normalize("NFKD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, "")
    .replace(/\\s+/g, " ")
    .trim();
}}

/** Real per-possession rate overrides for a player, or undefined if none. */
export function getPlayerRates(
  name: string,
): Partial<Record<RateStatId, number>> | undefined {{
  return PLAYER_RATES[normalizeName(name)];
}}
'''
    open(path,"w",encoding="utf-8").write(ts)

if __name__=="__main__":
    main()
