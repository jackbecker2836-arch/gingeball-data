#!/usr/bin/env python3
"""
xPTS v1 — Expected Points per shot (the TCV blueprint keystone).
Builds a LEAGUE-EXPECTED make-probability model across all shot families
(rim / mid / three), so a player's value = makes ABOVE this baseline.

Validated on real gingeball-data (2024-25): well-calibrated across all deciles,
beats a family-only baseline, and the shot-making-over-expectation leaderboard
independently recovers known elite shot-makers (Durant #1) using NO shooter identity.

DATA (from github.com/jackbecker2836-arch/gingeball-data, public):
  - 2425trackingshottotals.csv.xlsx   <- PRIMARY. rim(u10)/mid(o10)/three makes&att
                                         by close_def_dist x shot_clock x touch_time x dribble_range
  - 2425shotstotals.csv.xlsx          <- per-shot 3PT (X/Y/CatchAndShoot/WideOpen); used for
                                         aggregate context + PVA, NOT single-shot prediction
Bridge entity_id->name: nba_api.stats.static.players (offline).

USAGE:
  pip install scikit-learn pandas openpyxl nba_api joblib
  python xpts_build.py                 # reads files from DATA_DIR (local), else fetches from GitHub
"""
import os, json, urllib.request, urllib.parse
import numpy as np, pandas as pd
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import OrdinalEncoder
from sklearn.model_selection import cross_val_predict, StratifiedKFold
from sklearn.metrics import roc_auc_score, log_loss, brier_score_loss

# ── CONFIG ───────────────────────────────────────────────────────────────────────
DATA_DIR   = "."                      # where the .xlsx live locally; else auto-fetched
GH_RAW     = "https://raw.githubusercontent.com/jackbecker2836-arch/gingeball-data/main/"
TRACK_FILE = "2425trackingshottotals.csv.xlsx"
SHOTS_FILE = "2425shotstotals.csv.xlsx"
MIN_ATT    = 200                      # min shots for the shot-making leaderboard
BUCKET_FEATS = ["family","close_def_dist","shot_clock","touch_time","dribble_range"]

# ── IO ───────────────────────────────────────────────────────────────────────────
def get(name):
    local = os.path.join(DATA_DIR, name)
    if os.path.exists(local): return local
    dst = name.replace("/","_")
    if not os.path.exists(dst):
        url = GH_RAW + urllib.parse.quote(name)
        print(f"fetching {name} ...")
        urllib.request.urlretrieve(urllib.request.Request(url, headers={"User-Agent":"M"}).full_url, dst)
    return dst

def id2name():
    try:
        from nba_api.stats.static import players as P
        return {p["id"]: p["full_name"] for p in P.get_players()}
    except Exception:
        s = pd.read_excel(get(SHOTS_FILE), engine="openpyxl")
        return dict(zip(s["PlayerId"].astype(int), s["Player"]))

# ── 1. tracking buckets -> per-attempt rows (rim/mid/three) ───────────────────────
def load_attempts():
    t = pd.read_excel(get(TRACK_FILE), engine="openpyxl")
    fams = [("rim",2,"u10_ft_fg2m","u10_ft_fg2a"),
            ("mid",2,"o10_ft_fg2m","o10_ft_fg2a"),
            ("three",3,"fg3m","fg3a")]
    long = []
    for fam,val,mc,ac in fams:
        s = t[["entity_id","close_def_dist","shot_clock","touch_time","dribble_range",mc,ac]].copy()
        s = s[s[ac] > 0]
        s.columns = ["entity_id","close_def_dist","shot_clock","touch_time","dribble_range","makes","att"]
        s["family"], s["value"] = fam, val
        long.append(s)
    long = pd.concat(long, ignore_index=True)
    made = long.loc[long.index.repeat(long["makes"].astype(int))].assign(made=1)
    miss = long.loc[long.index.repeat((long["att"]-long["makes"]).astype(int))].assign(made=0)
    return pd.concat([made,miss], ignore_index=True)

# ── 2. train xPTS (out-of-fold probabilities for every attempt) ───────────────────
def train_xpts(att):
    enc = OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1)
    Xe  = enc.fit_transform(att[BUCKET_FEATS].astype(str))
    y   = att["made"].values
    clf = HistGradientBoostingClassifier(max_depth=4, learning_rate=0.08, max_iter=300,
            categorical_features=list(range(len(BUCKET_FEATS))), random_state=0)
    cv  = StratifiedKFold(5, shuffle=True, random_state=0)
    p   = cross_val_predict(clf, Xe, y, cv=cv, method="predict_proba", n_jobs=-1)[:,1]
    clf.fit(Xe, y)                                  # final full-data fit for saving/scoring
    return p, clf, enc

# ── 3. validation ─────────────────────────────────────────────────────────────────
def validate(att, p):
    y = att["made"].values
    fam = att.groupby("family")["made"].transform("mean").values
    print("\n[OOF] model vs family-only baseline")
    print(f"  AUC     {roc_auc_score(y,p):.4f} / {roc_auc_score(y,fam):.4f}")
    print(f"  LogLoss {log_loss(y,p):.4f} / {log_loss(y,fam):.4f}")
    print(f"  Brier   {brier_score_loss(y,p):.4f} / {brier_score_loss(y,fam):.4f}")
    d = att.assign(p=p)
    cal = d.groupby(pd.qcut(p,10,duplicates="drop"), observed=True).agg(
            pred=("p","mean"), actual=("made","mean"), n=("made","size"))
    print("\n[calibration] pred vs actual by decile\n", cal.round(3).to_string())

# ── 4. shot-making over expectation (this is the IIB scoring core) ────────────────
def shotmaking(att, p, names):
    d = att.assign(p=p, xpts=p*att["value"], pts=att["made"]*att["value"])
    g = d.groupby("entity_id").agg(att=("made","size"), pts=("pts","sum"), xpts=("xpts","sum"),
                                   makes=("made","sum"), exp_makes=("p","sum"))
    g["sm_pts_per100"] = (g["pts"]-g["xpts"])/g["att"]*100      # POINTS above expectation / 100 shots
    g["fg_over_exp"]   = (g["makes"]-g["exp_makes"])/g["att"]
    g["name"] = [names.get(int(i), str(i)) for i in g.index]
    return g.sort_values("sm_pts_per100", ascending=False)

# ── main ──────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    att = load_attempts()
    print(f"attempts: {len(att):,}  make%={att['made'].mean():.4f}  "
          f"families={att.groupby('family').size().to_dict()}")
    p, clf, enc = train_xpts(att)
    validate(att, p)
    board = shotmaking(att, p, id2name())
    big = board[board["att"] >= MIN_ATT]
    print(f"\n[shot-making over expectation] pts/100 shots, min {MIN_ATT} att (n={len(big)})")
    print("TOP 15:\n", big.head(15)[["name","att","sm_pts_per100","fg_over_exp"]].round(3).to_string(index=False))
    print("BOTTOM 10:\n", big.tail(10)[["name","att","sm_pts_per100","fg_over_exp"]].round(3).to_string(index=False))
    board.to_csv("xpts_player_shotmaking.csv")
    import joblib; joblib.dump({"model":clf,"encoder":enc,"feats":BUCKET_FEATS}, "xpts_model.joblib")
    print("\nsaved xpts_player_shotmaking.csv + xpts_model.joblib")

# ──────────────────────────────────────────────────────────────────────────────────
# EXTENSION PATHS (documented; not run here)
#
# (A) PORTABLE xPTS for ALL 6,452 scraped games (after the crawl):
#     raw_pbp has shot_zone + shot_dist + shot_made but NOT touch_time/dribbles/contest.
#     Retrain with a REDUCED feature set both sources share:
#         feats = ["family","shot_zone","shot_dist_bucket"]   (+ def_dist if you parse it)
#     Then score every scraped shot -> xPTS on the full multi-season sample. This is the
#     version that feeds RAPM-era possession work. Expect lower AUC (fewer features) but it
#     applies everywhere — calibration is what matters, not AUC.
#
# (B) MULTI-SEASON: shotzone20xx files share this exact schema. Concatenate across seasons
#     before train_xpts() for a stable league-expected baseline; add a season term if needed.
#
# (C) FEEDS THE BLUEPRINT COMPONENTS:
#     - IIB (scoring core)  = sm_pts_per100 above (points scored above league expectation).
#     - PVA (passing)       = sum xPTS of shots a player CREATED via pass. Join 2425shotstotals
#                             on PassFromPlayerId -> credit xPTS(shot) minus receiver self-baseline.
#     - DSV (defense)       = mirror: opponent xPTS minus actual allowed. Cross-check vs shotdif2425
#                             (defender eFG suppression) which is the pre-built player-season version.
#     - Leverage weighting  = multiply per-shot (pts - xpts) by possession leverage before summing.
#
# NOTE on the per-shot 3PT file (2425shotstotals): tested, AUC ~0.53 for single-shot prediction
# (3PT make is mostly shooter+variance, not location) -> do NOT use it to sharpen single-shot xPTS.
# Its value is aggregate wide-open/contested rates and the PassFrom* fields for PVA.
