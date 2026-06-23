"""
Gingeball TCV Lab — Component Master Upload (v2, fixed normalization)
Run from your oursafetynet folder:
  py upload_components.py --csv component_master_2526.csv
"""

import os, sys, argparse, logging, re
from pathlib import Path

import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s")
log = logging.getLogger(__name__)

try:
    from supabase import create_client
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    log.error("pip install supabase python-dotenv pandas --break-system-packages")
    sys.exit(1)

url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")
if not url or not key:
    log.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env")
    sys.exit(1)

sb = create_client(url, key)

def slug(name):
    import unicodedata
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def normalize(series, target_range):
    pct = series.rank(pct=True)
    return ((pct - 0.5) * 2 * target_range).round(3)

def safe(val):
    if val is None: return None
    if isinstance(val, float) and np.isnan(val): return None
    if isinstance(val, (np.integer,)): return int(val)
    if isinstance(val, (np.floating,)): return float(val)
    return val

def run(csv_path):
    df = pd.read_csv(csv_path)
    log.info(f"Loaded {len(df)} rows")

    # Normalize proxies to TCV scale (no overflow)
    df['cov_n'] = normalize(df['cov_proxy'], 4)
    df['pva_n'] = normalize(df['pva_proxy'], 4)
    df['sgv_n'] = normalize(df['efg_above_league'], 3)
    df['ptv_n'] = normalize(df['ptv_proxy'], 2)
    df['miv_n'] = normalize(df['high_value_touch_rate'], 2)
    df['dsv_n'] = normalize(df['dsv_proxy'], 3)
    df['rpv_n'] = normalize(df['rpv_proxy'], 2)
    df['o_tcv'] = (df['cov_n'] + df['pva_n'] + df['sgv_n'] + df['ptv_n'] + df['miv_n']).round(3)
    df['d_tcv'] = (df['dsv_n'] + df['rpv_n']).round(3)
    df['tcv']   = (df['o_tcv'] + df['d_tcv']).round(3)

    log.info(f"TCV range: {df['tcv'].min():.2f} to {df['tcv'].max():.2f}")

    # Get model version
    mv = sb.table("model_versions").select("id").eq("is_current", True).execute()
    if not mv.data:
        log.error("No current model version. Run seed.py first.")
        sys.exit(1)
    model_version_id = mv.data[0]["id"]

    # Get or create season
    season_year = int(df["season_year"].iloc[0])
    sv = sb.table("seasons").select("id").eq("season_year", season_year).execute()
    if not sv.data:
        sb.table("seasons").insert({"season_year": season_year, "label": f"{season_year-1}-{str(season_year)[2:]}", "is_current": True}).execute()
        sv = sb.table("seasons").select("id").eq("season_year", season_year).execute()
    season_id = sv.data[0]["id"]
    log.info(f"Season {season_year}, model version loaded")

    ok = 0
    errors = 0

    for _, row in df.iterrows():
        name = row["player"]
        try:
            # Upsert player
            pr = sb.table("players").upsert({"name": name, "name_slug": slug(name), "name_hoc": name.lower(), "position": "unknown"}, on_conflict="name_slug").execute()
            player_id = pr.data[0]["id"]

            # Upsert tcv_score
            sr = sb.table("tcv_scores").upsert({
                "player_id": player_id,
                "season_id": season_id,
                "model_version_id": model_version_id,
                "tcv":   safe(row['tcv']),
                "o_tcv": safe(row['o_tcv']),
                "d_tcv": safe(row['d_tcv']),
                # possessions: use a real possessions column if the CSV has one;
                # do NOT silently store FGA as possessions (that was a mislabel).
                "possessions": int(safe(row.get("possessions") or row.get("Possessions") or 0) or 0),
                "confidence_tier": "medium",
                "status": "published",
            }, on_conflict="player_id,season_id,model_version_id").execute()
            score_id = sr.data[0]["id"]

            # Upsert tcv_components
            sb.table("tcv_components").upsert({
                "tcv_score_id": score_id,
                "iib": None, "oiib": None, "diib": None,
                "pva": safe(row['pva_n']),
                "sgv": safe(row['sgv_n']),
                "dsv": safe(row['dsv_n']),
                "cov": safe(row['cov_n']),
                "miv": safe(row['miv_n']),
                "rpv": safe(row['rpv_n']),
                "ptv": safe(row['ptv_n']),
                "dpc": None, "sav": None,
                "up": 0, "cfp": 0,
                "iib_tier": "prototype", "pva_tier": "proxy",
                "sgv_tier": "proxy", "dsv_tier": "proxy",
                "cov_tier": "proxy", "miv_tier": "proxy",
                "rpv_tier": "proxy", "ptv_tier": "proxy",
                "dpc_tier": "prototype", "sav_tier": "prototype",
            }, on_conflict="tcv_score_id").execute()

            ok += 1
            if ok % 50 == 0:
                log.info(f"  {ok}/{len(df)} uploaded...")

        except Exception as e:
            log.error(f"  Error on {name}: {e}")
            errors += 1

    log.info(f"\nDone. {ok} uploaded, {errors} errors.")
    log.info("Check gingeball.com/leaderboard")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True)
    args = parser.parse_args()
    if not Path(args.csv).exists():
        log.error(f"File not found: {args.csv}")
        sys.exit(1)
    run(args.csv)
