"""
Gingeball TCV Lab — DSV / RPV / DPC Update Script (2024-25 season)
====================================================================
Fills in DSV, RPV, and DPC for every 2025 tcv_components row that
currently has 0 because the def/reb files weren't available during the
original upload_2425.py run.

Source files (in PBPselfscraped/):
  2425def.csv.xlsx  → DSV (Defensive Shell Value), DPC (Defensive Playmaking)
  2425reb.csv.xlsx  → RPV (Rebounding Value)

Formulas:
  DSV:
    rim_fg_pct  = Def Rim FGM / Def Rim FGA           (capped 0–1, league avg ~0.60)
    rim_detr    = (0.60 - rim_fg_pct) * (Def Rim FGA / Possessions)
    stl_rate    = Steals / Possessions
    blk_rate    = Blocks / Possessions
    dsv_raw     = rim_detr * 0.5 + stl_rate * 0.3 + blk_rate * 0.2
    → rank-norm to ±3 within season

  DPC (rim deterrence — kept DISTINCT from DSV/RPV to avoid double-counting):
    rim_fg_pct = Def Rim FGM / Def Rim FGA            (capped 0–1, league avg ~0.60)
    rim_deter  = -(rim_fg_pct)            higher = opponents shoot worse at rim
    blk_rate   = Blocks / Possessions    shot denial at the rim
    dpc_raw    = rim_deter * 0.6 + blk_rate * 0.4
    → rank-norm to ±3 within season
    NOTE: DPC intentionally does NOT use steals (that's DSV) or DReb (that's RPV).
          DPC = "does this player make the rim a bad place to shoot."

  RPV:
    oreb_rate  = OReb / OReb Chances
    dreb_rate  = DReb / DReb Chances
    oreb_cont  = OReb Contested / OReb
    dreb_cont  = DReb Contested / DReb
    rpv_raw    = oreb_rate*0.25 + dreb_rate*0.25 + oreb_cont*0.25 + dreb_cont*0.25
    → rank-norm to ±2 within season

Filter: min 500 possessions. Players below threshold are left NULL (not ranked),
which keeps the percentile distribution clean instead of dumping everyone at a floor.

After updating DSV/RPV/DPC, recalculates d_tcv and tcv for each row.

Run from oursafetynet/:
  py update_dsv_rpv_dpc_2425.py
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

PBP         = r"PBPselfscraped"
SEASON_YEAR = 2025
MIN_POSS    = 500
DEF_FILE    = f"{PBP}\\2425def.csv.xlsx"
REB_FILE    = f"{PBP}\\2425reb.csv.xlsx"

# League minimums (floor for below-threshold players)
# Below-threshold players are left NULL (not floored) — see compute_* functions.


# ── Helpers ─────────────────────────────────────────────────────────────────

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

def norm(series: pd.Series, target_range: float) -> pd.Series:
    return ((series.rank(pct=True) - 0.5) * 2 * target_range).round(3)

def read_file(filepath: str, label: str) -> pd.DataFrame:
    path = Path(filepath)
    if not path.exists():
        # Try forward-slash variant (in case running on mac/linux)
        alt = filepath.replace("\\", "/")
        if Path(alt).exists():
            filepath = alt
        else:
            log.error(f"File not found: {filepath}")
            log.error(f"Make sure {label} is in your PBPselfscraped/ folder.")
            sys.exit(1)
    df = pd.read_excel(filepath)
    log.info(f"  Loaded {label}: {len(df)} rows, columns: {list(df.columns)}")
    return df


# ── Component computation ────────────────────────────────────────────────────

def compute_dsv_dpc(def_df: pd.DataFrame) -> pd.DataFrame:
    """Compute DSV and DPC. Returns df with Player, dsv_n, dpc_n.
    Below-threshold players are left NaN (NULL) rather than floored, so they
    don't distort the percentile distribution for qualified players."""
    qualified = def_df[def_df["Possessions"] >= MIN_POSS].copy()
    below     = def_df[def_df["Possessions"] <  MIN_POSS].copy()

    log.info(f"  DSV/DPC: {len(qualified)} qualified players, {len(below)} below threshold (left NULL)")

    poss_q = qualified["Possessions"].replace(0, np.nan)

    rim_fg_pct = (
        qualified["Def Rim FGM"] /
        qualified["Def Rim FGA"].replace(0, np.nan)
    ).fillna(0.6).clip(0, 1)

    # DSV — event-creation defense: steals + blocks (the disruptive plays a
    # defender personally generates). NO rim% here (that's DPC's job).
    stl_rate  = qualified["Steals"] / poss_q
    blk_rate  = qualified["Blocks"] / poss_q
    dsv_raw   = stl_rate * 0.5 + blk_rate * 0.5
    qualified["dsv_n"] = norm(dsv_raw, 3)

    # DPC — pure rim DETERRENCE: holding opponents below league-avg FG% at the
    # rim, weighted by how much rim volume they defend. NO steals, NO blocks,
    # NO DReb — those live in DSV/RPV. This keeps the three D-TCV parts distinct
    # (validated DSV–DPC correlation ~0.52 vs ~0.85 for the old shared formula).
    rim_vol  = qualified["Def Rim FGA"] / poss_q
    rim_stop = 0.60 - rim_fg_pct
    dpc_raw  = rim_stop.rank(pct=True) * 0.6 + rim_vol.rank(pct=True) * 0.4
    qualified["dpc_n"] = norm(dpc_raw, 3)

    # Below threshold -> NULL (not floored)
    below["dsv_n"] = np.nan
    below["dpc_n"] = np.nan

    result = pd.concat(
        [qualified[["Player","dsv_n","dpc_n"]], below[["Player","dsv_n","dpc_n"]]],
        ignore_index=True
    )

    log.info(f"  DSV range: {qualified['dsv_n'].min():.2f} to {qualified['dsv_n'].max():.2f}")
    log.info(f"  DPC range: {qualified['dpc_n'].min():.2f} to {qualified['dpc_n'].max():.2f}")
    log.info(f"  DSV top 5:\n{qualified.nlargest(5,'dsv_n')[['Player','dsv_n']].to_string(index=False)}")
    log.info(f"  DPC top 5:\n{qualified.nlargest(5,'dpc_n')[['Player','dpc_n']].to_string(index=False)}")

    return result


def compute_rpv(reb_df: pd.DataFrame) -> pd.DataFrame:
    """Compute RPV. Returns df with Player, rpv_n."""
    # Possessions may be in the reb file or need merging — handle both cases
    if "Possessions" not in reb_df.columns:
        log.warning("  RPV: 'Possessions' column not in reb file — all players treated as qualified")
        qualified = reb_df.copy()
        below     = pd.DataFrame(columns=reb_df.columns)
    else:
        qualified = reb_df[reb_df["Possessions"] >= MIN_POSS].copy()
        below     = reb_df[reb_df["Possessions"] <  MIN_POSS].copy()

    log.info(f"  RPV: {len(qualified)} qualified players, {len(below)} below threshold")

    oreb_rate = (
        qualified["OReb"] /
        qualified["OReb Chances"].replace(0, np.nan)
    ).fillna(0)
    dreb_rate = (
        qualified["DReb"] /
        qualified["DReb Chances"].replace(0, np.nan)
    ).fillna(0)
    oreb_cont = (
        qualified["OReb Contested"] /
        qualified["OReb"].replace(0, np.nan)
    ).fillna(0)
    dreb_cont = (
        qualified["DReb Contested"] /
        qualified["DReb"].replace(0, np.nan)
    ).fillna(0)

    rpv_raw = (
        oreb_rate * 0.25 +
        dreb_rate * 0.25 +
        oreb_cont * 0.25 +
        dreb_cont * 0.25
    )
    qualified["rpv_n"] = norm(rpv_raw, 2)
    below["rpv_n"]     = np.nan

    result = pd.concat(
        [qualified[["Player","rpv_n"]], below[["Player","rpv_n"]]],
        ignore_index=True
    )

    log.info(f"  RPV range: {qualified['rpv_n'].min():.2f} to {qualified['rpv_n'].max():.2f}")
    log.info(f"  RPV top 5:\n{qualified.nlargest(5,'rpv_n')[['Player','rpv_n']].to_string(index=False)}")

    return result


# ── DB update ────────────────────────────────────────────────────────────────

def get_season_id() -> str:
    res = sb.table("seasons").select("id").eq("season_year", SEASON_YEAR).execute()
    if not res.data:
        log.error(f"Season {SEASON_YEAR} not found in DB.")
        sys.exit(1)
    return res.data[0]["id"]


def update_player(name: str, season_id: str,
                  dsv: float, dpc: float, rpv: float) -> str:
    """
    Returns: 'updated', 'skipped_no_player', 'skipped_no_score', 'error'
    """
    name_slug = slug(name)

    try:
        # Look up player
        pr = sb.table("players").select("id").eq("name_slug", name_slug).execute()
        if not pr.data:
            return "skipped_no_player"
        player_id = pr.data[0]["id"]

        # Look up tcv_score for this player + season
        sr = (sb.table("tcv_scores").select("id")
                .eq("player_id", player_id)
                .eq("season_id", season_id)
                .execute())
        if not sr.data:
            return "skipped_no_score"
        score_id = sr.data[0]["id"]

        # Update only the components that are non-NULL (below-threshold players
        # keep whatever they had rather than getting a floored value written).
        update = {}
        if pd.notna(dsv): update["dsv"] = safe(dsv); update["dsv_tier"] = "proxy"
        if pd.notna(rpv): update["rpv"] = safe(rpv); update["rpv_tier"] = "proxy"
        if pd.notna(dpc): update["dpc"] = safe(dpc); update["dpc_tier"] = "proxy"
        if not update:
            return "skipped_no_score"  # nothing to write for this player
        sb.table("tcv_components").update(update).eq("tcv_score_id", score_id).execute()

        # Fetch all components to recompute tcv
        comp = (sb.table("tcv_components")
                  .select("iib,pva,sgv,cov,miv,ptv,dsv,rpv,dpc")
                  .eq("tcv_score_id", score_id)
                  .execute())
        if comp.data:
            c = comp.data[0]
            def v(x): return float(x) if x is not None else 0.0
            o_tcv = round(v(c["iib"]) + v(c["pva"]) + v(c["sgv"]) +
                          v(c["cov"]) + v(c["miv"]) + v(c["ptv"]), 3)
            d_tcv = round(v(c["dsv"]) + v(c["rpv"]) + v(c["dpc"]), 3)
            tcv   = round(o_tcv + d_tcv, 3)
            sb.table("tcv_scores").update({
                "tcv": tcv, "o_tcv": o_tcv, "d_tcv": d_tcv
            }).eq("id", score_id).execute()

        return "updated"

    except Exception as e:
        log.error(f"  Error on {name}: {e}")
        return "error"


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    log.info(f"=== DSV / RPV / DPC Update — 2024-25 season (season_year={SEASON_YEAR}) ===")

    # Load files
    log.info("\nLoading files...")
    def_df = read_file(DEF_FILE, "2425def.csv.xlsx")
    reb_df = read_file(REB_FILE, "2425reb.csv.xlsx")

    # Compute components
    log.info("\nComputing DSV + DPC...")
    dsv_dpc = compute_dsv_dpc(def_df)

    log.info("\nComputing RPV...")
    rpv_df  = compute_rpv(reb_df)

    # Merge on Player. Missing values stay NaN (NULL) — we skip writing them below
    # rather than flooring, so below-threshold players keep clean NULL components.
    combined = dsv_dpc.merge(rpv_df, on="Player", how="outer")
    log.info(f"\nCombined player set: {len(combined)} players")

    # Get season ID
    season_id = get_season_id()
    log.info(f"Season ID for {SEASON_YEAR}: {season_id}")

    # Update DB
    log.info(f"\nUpdating tcv_components for {SEASON_YEAR}...")
    counts = {"updated": 0, "skipped_no_player": 0, "skipped_no_score": 0, "error": 0}

    for i, row in combined.iterrows():
        name   = str(row["Player"]).strip()
        result = update_player(
            name      = name,
            season_id = season_id,
            dsv       = row["dsv_n"],
            dpc       = row["dpc_n"],
            rpv       = row["rpv_n"],
        )
        counts[result] += 1

        if counts["updated"] % 50 == 0 and counts["updated"] > 0:
            log.info(f"  {counts['updated']} updated so far...")

    # Summary
    log.info("\n=== Done ===")
    log.info(f"  Updated:            {counts['updated']}")
    log.info(f"  Skipped (no player in DB): {counts['skipped_no_player']}")
    log.info(f"  Skipped (no 2025 score):   {counts['skipped_no_score']}")
    log.info(f"  Errors:             {counts['error']}")
    log.info(f"\nCheck gingeball.com/leaderboard → 2024-25")
    log.info("D-TCV should now be non-zero for all 2025 players.")

    # Sanity check — pull a few known players
    log.info("\n── Sanity check (Gobert, Wembanyama, Bam) ──")
    for test_slug in ["rudy-gobert", "victor-wembanyama", "bam-adebayo"]:
        pr = sb.table("players").select("id").eq("name_slug", test_slug).execute()
        if not pr.data:
            log.info(f"  {test_slug}: not in DB")
            continue
        player_id = pr.data[0]["id"]
        res = sb.table("tcv_scores").select("id,tcv,o_tcv,d_tcv").eq("player_id", player_id).eq("season_id", season_id).execute()
        if res.data:
            r = res.data[0]
            log.info(f"  {test_slug}: tcv={r['tcv']} o={r['o_tcv']} d={r['d_tcv']}")
        else:
            log.info(f"  {test_slug}: no 2025 row")


if __name__ == "__main__":
    main()
