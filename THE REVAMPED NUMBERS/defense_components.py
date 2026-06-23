#!/usr/bin/env python3
"""
Defensive components, honest build.
  RPV  -> SHIPS. Rim protection in points saved, shrunk for volume. Validated:
          top = Allen/Stewart/Gobert/Gafford/Wembanyama (the real rim-protector set).
  DSV  -> HELD. Built here ONLY as a diagnostic with a loud warning. Defended-FG%
          does not measure perimeter defense (it measures who gets TARGETED):
          l_exp flavor bottoms out hunted stars (Durant/Curry/SGA);
          p_exp flavor tops out offensive guards (Booker/Simons) and buries
          real stoppers (Dillon Brooks). DO NOT USE until matchup-assignment data
          + defensive-RAPM calibration exist (post-crawl).
INPUT : 2425def.csv.xlsx (rim), shotdif2425.csv.xlsx (perimeter; diagnostic only)
OUTPUT: rpv_player.csv  (+ printed diagnostics)
"""
import pandas as pd, numpy as np

# ── RPV: rim protection (SHIP) ────────────────────────────────────────────────────
def build_rpv(path="2425def.csv.xlsx", k_rim=120, min_fga=150):
    d = pd.read_excel(path, engine="openpyxl")
    lg = d["Def Rim FGM"].sum() / d["Def Rim FGA"].sum()          # league rim FG% allowed
    d["rim_supp"]  = lg - d["Def Rim FG%"]                        # +ve = suppresses below league
    d["rel"]       = d["Def Rim FGA"] / (d["Def Rim FGA"] + k_rim)  # reliability shrinkage (the UP idea)
    d["RPV_pts"]   = d["rim_supp"] * d["rel"] * d["Def Rim FGA"] * 2  # points saved at the rim
    d["RPV_per100"]= d["RPV_pts"] / d["Possessions"].clip(lower=1) * 100
    d["lg_rim_fg"] = lg
    return d.sort_values("RPV_pts", ascending=False), lg

# ── DSV: perimeter (DIAGNOSTIC ONLY — DO NOT SHIP) ────────────────────────────────
def diagnose_dsv(path="shotdif2425.csv.xlsx", k=250, min_fga=200):
    s = pd.read_excel(path, engine="openpyxl")
    out = {}
    for tag, ex in [("l_exp","l_exp"), ("p_exp","p_exp")]:
        o = (s[f"{ex} o10 FG2%"]-s["act o10 FG2%"])*2*s["o10 FG2A"]
        t = (s[f"{ex} FG3%"]-s["act FG3%"])*3*s["FG3A"]
        fga = s["o10 FG2A"]+s["FG3A"]
        dsv = (o+t)*(fga/(fga+k))
        r = s.assign(DSV=dsv, perim_FGA=fga)
        r = r[r["perim_FGA"]>=min_fga].sort_values("DSV", ascending=False)
        out[tag] = r
    return out

if __name__ == "__main__":
    rpv, lg = build_rpv()
    big = rpv[rpv["Def Rim FGA"]>=150]
    print(f"RPV — league rim FG% allowed = {lg:.3f}; players >=150 rim FGA = {len(big)}")
    print("TOP 15:\n", big.head(15)[["Player","Def Rim FGA","Def Rim FG%","RPV_pts","RPV_per100"]].round(2).to_string(index=False))
    rpv.to_csv("rpv_player.csv", index=False)
    print("\nsaved rpv_player.csv")

    print("\n" + "="*70)
    print("DSV DIAGNOSTIC — NOT A USABLE COMPONENT. Evidence it fails:")
    dd = diagnose_dsv()
    for tag in ("l_exp","p_exp"):
        b = dd[tag]
        print(f"\n  [{tag}] TOP 5: {list(b.head(5)['Name'])}")
        print(f"  [{tag}] BOTTOM 5: {list(b.tail(5)['Name'])}")
    print("\n  -> l_exp buries hunted stars; p_exp rewards offensive guards & buries Dillon Brooks.")
    print("  -> HOLD DSV until who-guarded-whom matchup data + defensive RAPM (post-crawl).")
