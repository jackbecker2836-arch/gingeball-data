"""
Gingeball TCV Lab — PVA Upgrade Script
Upgrades PVA from adj_ast proxy to real passing formula using pbpstats data.

Formula:
  raw = (adj_ast_per_poss * 1.0) + (potential_ast_per_poss * 0.4)
        + (secondary_ast_per_poss * 0.3) + (ast_pts_per_poss * 0.3)
  Rank-normalized within each season to ±4 range.

Usage:
  py update_pva.py
"""

import os, sys, re, logging
import pandas as pd
import numpy as np
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

try:
    from supabase import create_client
except ImportError:
    print("Run: pip install supabase python-dotenv pandas openpyxl --break-system-packages")
    sys.exit(1)

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
if not url or not key:
    log.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

sb = create_client(url, key)

PBP_DIR = r"PBPselfscraped"

SEASON_FILES = {
    2014: f"{PBP_DIR}\\pass1314.csv.xlsx",
    2015: f"{PBP_DIR}\\pass1415.csv.xlsx",
    2016: f"{PBP_DIR}\\pass1516.csv.xlsx",
    2017: f"{PBP_DIR}\\pass1617.csv.xlsx",
    2018: f"{PBP_DIR}\\pass1718.csv.xlsx",
    2019: f"{PBP_DIR}\\pass1819.csv.xlsx",
    2020: f"{PBP_DIR}\\pass1920.csv.xlsx",
    2021: f"{PBP_DIR}\\pass2021.csv.xlsx",
    2022: f"{PBP_DIR}\\pass2122.csv.xlsx",
    2023: f"{PBP_DIR}\\pass2223.csv.xlsx",
    2024: f"{PBP_DIR}\\pass2324.csv.xlsx",
    2025: f"{PBP_DIR}\\passes2425.csv.xlsx",
    2026: f"{PBP_DIR}\\passing2526.csv.xlsx",
}

def slug(name: str) -> str:
    import unicodedata
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def safe(val):
    if val is None: return None
    if isinstance(val, float) and np.isnan(val): return None
    if isinstance(val, (np.integer,)): return int(val)
    if isinstance(val, (np.floating,)): return float(val)
    return val

def normalize(series: pd.Series, target_range: float) -> pd.Series:
    pct = series.rank(pct=True)
    return ((pct - 0.5) * 2 * target_range).round(3)

def compute_pva(df: pd.DataFrame) -> pd.Series:
    poss = df["Possessions"].replace(0, np.nan)
    adj_ast_pp       = df["Adj Ast"]       / poss
    potential_ast_pp = df["Potential Ast"] / poss
    secondary_ast_pp = df["Secondary Ast"] / poss
    ast_pts_pp       = df["Ast Pts"]       / poss
    raw = (
        adj_ast_pp       * 1.0 +
        potential_ast_pp * 0.4 +
        secondary_ast_pp * 0.3 +
        ast_pts_pp       * 0.3
    )
    return normalize(raw, 4)

def get_season_id(season_year: int):
    res = sb.table("seasons").select("id").eq("season_year", season_year).execute()
    return res.data[0]["id"] if res.data else None

def get_model_version_id():
    res = sb.table("model_versions").select("id").eq("is_current", True).execute()
    return res.data[0]["id"] if res.data else None

def process_season(season_year: int, filepath: str, model_version_id: str) -> dict:
    log.info(f"\n── Season {season_year} ──────────────────────────────")
    df = pd.read_excel(filepath)
    log.info(f"  Loaded {len(df)} players")

    season_id = get_season_id(season_year)
    if not season_id:
        log.warning(f"  Season {season_year} not found in DB — skipping")
        return {"season": season_year, "updated": 0, "skipped": 0, "errors": 0}

    df["pva_real"] = compute_pva(df)
    log.info(f"  PVA range: {df['pva_real'].min():.2f} to {df['pva_real'].max():.2f}")

    updated = skipped = errors = 0

    for _, row in df.iterrows():
        name      = str(row["Player"]).strip()
        name_slug = slug(name)
        pva_val   = safe(row["pva_real"])

        try:
            pr = sb.table("players").select("id").eq("name_slug", name_slug).execute()
            if not pr.data:
                skipped += 1
                continue
            player_id = pr.data[0]["id"]

            sr = (sb.table("tcv_scores").select("id")
                    .eq("player_id", player_id)
                    .eq("season_id", season_id)
                    .execute())
            if not sr.data:
                skipped += 1
                continue
            score_id = sr.data[0]["id"]

            sb.table("tcv_components").update({
                "pva": pva_val, "pva_tier": "proxy"
            }).eq("tcv_score_id", score_id).execute()

            # Recalculate tcv/o_tcv/d_tcv
            comp = (sb.table("tcv_components")
                      .select("iib,pva,sgv,cov,miv,ptv,dsv,rpv,dpc")
                      .eq("tcv_score_id", score_id)
                      .execute())
            if comp.data:
                c = comp.data[0]
                def v(x): return float(x) if x is not None else 0.0
                o_tcv = round(v(c["iib"]) + v(c["pva"]) + v(c["sgv"]) + v(c["cov"]) + v(c["miv"]) + v(c["ptv"]), 3)
                d_tcv = round(v(c["dsv"]) + v(c["rpv"]) + v(c["dpc"]), 3)
                tcv   = round(o_tcv + d_tcv, 3)
                sb.table("tcv_scores").update({
                    "tcv": tcv, "o_tcv": o_tcv, "d_tcv": d_tcv
                }).eq("id", score_id).execute()

            updated += 1
            if updated % 100 == 0:
                log.info(f"  {updated} updated...")

        except Exception as e:
            log.error(f"  Error on {name}: {e}")
            errors += 1

    log.info(f"  Done: {updated} updated, {skipped} skipped, {errors} errors")
    return {"season": season_year, "updated": updated, "skipped": skipped, "errors": errors}


def main():
    log.info("=== PVA Upgrade — all seasons ===")
    model_version_id = get_model_version_id()
    if not model_version_id:
        log.error("No current model version found.")
        sys.exit(1)

    results = []
    for season_year, filename in sorted(SEASON_FILES.items()):
        if not Path(filename).exists():
            log.warning(f"File not found, skipping: {filename}")
            continue
        results.append(process_season(season_year, filename, model_version_id))

    log.info("\n=== Summary ===")
    total = 0
    for r in results:
        log.info(f"  {r['season']}: {r['updated']} updated, {r['skipped']} skipped, {r['errors']} errors")
        total += r["updated"]
    log.info(f"\nTotal PVA rows updated: {total}")
    log.info("Check gingeball.com/leaderboard")

if __name__ == "__main__":
    main()
