"""
Gingeball TCV Lab — Admin Upload Pipeline
==========================================
Validates and ingests new data CSVs into Supabase.
Run this whenever you have new data to push — new season,
updated components, or PBP Stats exports.

Supported dataset types:
  tcv_scores     — player_tcv_scores_top50.csv or all players
  iib_scores     — player_iib_scores.csv from rapm_engine.py
  pbpstats_lineups — lineup exports from pbpstats.com
  pbpstats_clutch  — clutch splits from pbpstats.com
  pbpstats_poss    — possession-type splits from pbpstats.com

Usage:
  py upload_pipeline.py --type tcv_scores --csv player_tcv_scores_top50.csv --season 2024
  py upload_pipeline.py --type iib_scores  --csv player_iib_scores.csv
  py upload_pipeline.py --type pbpstats_lineups --csv pbpstats_exports/lineups_2025.csv --season 2025
  py upload_pipeline.py --validate-only --type tcv_scores --csv player_tcv_scores_top50.csv
"""

import os
import sys
import argparse
import logging
from datetime import datetime, timezone
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
    log.error("pip install supabase python-dotenv")
    sys.exit(1)

# ── Validation schemas ────────────────────────────────────────────────────────

SCHEMAS = {
    "tcv_scores": {
        "required": ["player","season","tcv","o_tcv","d_tcv","iib"],
        "numeric":  ["tcv","o_tcv","d_tcv","iib","oiib","diib",
                     "pva","dpc","sgv","dsv","cov","sav","miv","rpv","ptv","up","cfp"],
        "ranges": {
            "tcv":   (-20, 50),
            "o_tcv": (-15, 35),
            "d_tcv": (-10, 15),
            "iib":   (-12, 12),
        },
    },
    "iib_scores": {
        "required": ["player","season","oiib","diib","iib","possessions"],
        "numeric":  ["oiib","diib","iib","possessions"],
        "ranges": {
            "iib":         (-12, 12),
            "possessions": (0, 50000),
        },
    },
    "pbpstats_lineups": {
        "required": ["lineup","possessions","net_rating"],
        "numeric":  ["possessions","net_rating","off_rating","def_rating"],
        "ranges": {
            "possessions": (0, 5000),
            "net_rating":  (-60, 60),
        },
    },
    "pbpstats_clutch": {
        "required": ["player","possessions"],
        "numeric":  ["possessions"],
        "ranges": {
            "possessions": (0, 2000),
        },
    },
    "pbpstats_poss": {
        "required": ["player"],
        "numeric":  [],
        "ranges":   {},
    },
}

# ── Validation ────────────────────────────────────────────────────────────────

def validate(df: pd.DataFrame, dataset_type: str) -> list[str]:
    """Return list of validation errors. Empty = valid."""
    schema = SCHEMAS.get(dataset_type)
    if not schema:
        return [f"Unknown dataset type: {dataset_type}"]

    errors = []

    # Required columns
    for col in schema["required"]:
        if col not in df.columns:
            errors.append(f"Missing required column: {col}")

    if errors:
        return errors  # can't proceed without required cols

    # Null checks on required
    for col in schema["required"]:
        null_count = df[col].isna().sum()
        if null_count > 0:
            errors.append(f"Column '{col}' has {null_count} null values")

    # Numeric range checks
    for col, (lo, hi) in schema["ranges"].items():
        if col not in df.columns:
            continue
        vals = pd.to_numeric(df[col], errors="coerce")
        out_of_range = ((vals < lo) | (vals > hi)).sum()
        if out_of_range > 0:
            errors.append(f"Column '{col}': {out_of_range} values outside range [{lo}, {hi}]")

    # Duplicate check
    if "player" in df.columns and "season" in df.columns:
        dupes = df.duplicated(subset=["player","season"]).sum()
        if dupes > 0:
            errors.append(f"Duplicate player-season rows: {dupes}")

    # Row count sanity
    if len(df) < 1:
        errors.append("Empty file — no rows found")
    if len(df) > 10000:
        errors.append(f"Unusually large file: {len(df)} rows (expected <10,000)")

    return errors


def print_validation_report(df: pd.DataFrame, errors: list[str], dataset_type: str):
    log.info(f"\n{'='*50}")
    log.info(f"Validation report — {dataset_type}")
    log.info(f"{'='*50}")
    log.info(f"Rows:    {len(df)}")
    log.info(f"Columns: {len(df.columns)} — {list(df.columns)[:8]}{'…' if len(df.columns)>8 else ''}")

    if "player" in df.columns:
        log.info(f"Players: {df['player'].nunique()} unique")
    if "season" in df.columns:
        seasons = sorted(df["season"].dropna().unique())
        log.info(f"Seasons: {seasons}")

    # Numeric summaries
    schema = SCHEMAS.get(dataset_type, {})
    for col in schema.get("numeric", [])[:4]:
        if col in df.columns:
            vals = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(vals):
                log.info(f"  {col}: min={vals.min():.2f} mean={vals.mean():.2f} max={vals.max():.2f}")

    if errors:
        log.warning(f"\n{len(errors)} validation error(s):")
        for e in errors:
            log.warning(f"  ✗ {e}")
    else:
        log.info(f"\n✓ Validation passed — ready to ingest")


# ── Ingest functions ──────────────────────────────────────────────────────────

def slug(name: str) -> str:
    # Must match the slug() in every other Gingeball script: strip accents
    # (Jokić -> jokic) and collapse all non-alphanumerics to single hyphens.
    # The old version kept accents and produced 'nikola-jokić', which never
    # matched the 'nikola-jokic' player records the rest of the pipeline creates.
    import unicodedata, re
    name = unicodedata.normalize("NFKD", name)
    name = "".join(c for c in name if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")

def safe_float(val, default=None):
    try:
        v = float(val)
        return None if (v != v) else round(v, 3)  # NaN check
    except (TypeError, ValueError):
        return default

def get_or_create_player(db, name: str, player_cache: dict) -> str | None:
    s = slug(name)
    if s in player_cache:
        return player_cache[s]

    result = db.table("players").upsert({
        "name": name,
        "name_slug": s,
        "name_hoc": name.lower(),
        "position": "unknown",
        "pos_label": "",
    }, on_conflict="name_slug").execute()

    if result.data:
        pid = result.data[0]["id"]
        player_cache[s] = pid
        return pid
    return None


def ingest_tcv_scores(db, df: pd.DataFrame, season_map: dict, mv_id: str, dry_run: bool = False):
    log.info("Ingesting TCV scores…")
    inserted = skipped = 0
    player_cache = {}

    # Load existing players
    existing = db.table("players").select("id,name_slug").execute()
    for r in existing.data:
        player_cache[r["name_slug"]] = r["id"]

    for _, row in df.iterrows():
        name = str(row["player"])
        player_id = get_or_create_player(db, name, player_cache)
        if not player_id:
            log.warning(f"Could not upsert player: {name}")
            skipped += 1
            continue

        # Parse season into the ending-year convention, robustly.
        # Accepts "2023-24" (-> 2024) OR a plain year "2024"/2024 (-> 2024).
        # The old code blindly did split("-")[0]+1, which turned a plain "2024"
        # into 2025 — an off-by-one that silently created phantom-season rows.
        season_raw = row.get("season", "2023-24")
        season_label = str(season_raw).strip()
        if "-" in season_label:
            season_year = int(season_label.split("-")[0]) + 1
        else:
            season_year = int(float(season_label))  # already an ending year
        season_id    = season_map.get(season_year)
        if not season_id:
            log.warning(f"Season not found: {season_label} → {season_year}")
            skipped += 1
            continue

        tcv = safe_float(row.get("tcv"))
        if tcv is None:
            skipped += 1
            continue

        sfposs = int(row.get("sfposs") or 0)
        if sfposs >= 15000:   ctier = "high"
        elif sfposs >= 8000:  ctier = "medium"
        else:                  ctier = "low"

        if dry_run:
            log.info(f"  [DRY RUN] Would insert: {name} {season_label} TCV={tcv}")
            inserted += 1
            continue

        score_resp = db.table("tcv_scores").upsert({
            "player_id":        player_id,
            "season_id":        season_id,
            "model_version_id": mv_id,
            "tcv":              tcv,
            "o_tcv":            safe_float(row.get("o_tcv")),
            "d_tcv":            safe_float(row.get("d_tcv")),
            "possessions":      sfposs or None,
            "sfposs":           sfposs or None,
            "confidence_tier":  ctier,
            "status":           "published",
            "published_at":     datetime.now(timezone.utc).isoformat(),
        }, on_conflict="player_id,season_id,model_version_id").execute()

        if not score_resp.data:
            skipped += 1
            continue

        score_id = score_resp.data[0]["id"]

        db.table("tcv_components").upsert({
            "tcv_score_id": score_id,
            "iib":  safe_float(row.get("iib")),
            "oiib": safe_float(row.get("oiib")),
            "diib": safe_float(row.get("diib")),
            "iib_tier": "calculated",
            "pva":  safe_float(row.get("pva")),  "pva_tier": "prototype",
            "dpc":  safe_float(row.get("dpc")),  "dpc_tier": "prototype",
            "sgv":  safe_float(row.get("sgv")),  "sgv_tier": "prototype",
            "dsv":  safe_float(row.get("dsv")),  "dsv_tier": "prototype",
            "cov":  safe_float(row.get("cov")),  "cov_tier": "prototype",
            "sav":  safe_float(row.get("sav")),  "sav_tier": "prototype",
            "miv":  safe_float(row.get("miv")),  "miv_tier": "prototype",
            "rpv":  safe_float(row.get("rpv")),  "rpv_tier": "prototype",
            "ptv":  safe_float(row.get("ptv")),  "ptv_tier": "prototype",
            "up":   safe_float(row.get("up"), 0),
            "cfp":  safe_float(row.get("cfp"), 0),
        }, on_conflict="tcv_score_id").execute()

        inserted += 1

    log.info(f"TCV scores: {inserted} inserted, {skipped} skipped")


def ingest_iib_scores(db, df: pd.DataFrame, season_map: dict, mv_id: str, dry_run: bool = False):
    """
    Update IIB values on existing TCV scores, or create bare IIB-only records.
    Used when rapm_engine.py produces fresh RAPM after PBP scrape completes.
    """
    log.info("Ingesting IIB scores (RAPM update)…")
    updated = skipped = 0
    player_cache = {}
    existing = db.table("players").select("id,name_slug").execute()
    for r in existing.data:
        player_cache[r["name_slug"]] = r["id"]

    for _, row in df.iterrows():
        name = str(row["player"])
        s    = slug(name)
        pid  = player_cache.get(s)
        if not pid:
            skipped += 1
            continue

        season_year = int(row.get("season", 2024))
        season_id   = season_map.get(season_year)
        if not season_id:
            skipped += 1
            continue

        if dry_run:
            log.info(f"  [DRY RUN] Would update IIB: {name} {season_year} IIB={row.get('iib')}")
            updated += 1
            continue

        # Find existing TCV score and update components
        score = db.table("tcv_scores").select("id").eq("player_id", pid).eq("season_id", season_id).eq("model_version_id", mv_id).execute()
        if not score.data:
            skipped += 1
            continue

        score_id = score.data[0]["id"]
        db.table("tcv_components").update({
            "iib":  safe_float(row.get("iib")),
            "oiib": safe_float(row.get("oiib")),
            "diib": safe_float(row.get("diib")),
            "iib_tier": "calculated",
            "iib_source": str(row.get("source","computed_rapm")),
        }).eq("tcv_score_id", score_id).execute()
        updated += 1

    log.info(f"IIB scores: {updated} updated, {skipped} skipped")


def ingest_pbpstats_lineups(db, df: pd.DataFrame, season_id: str, dry_run: bool = False):
    """Stub for PBP Stats lineup data — schema TBD after first export."""
    log.info(f"PBP Stats lineups: {len(df)} rows loaded")
    log.info("  Columns found: " + ", ".join(df.columns.tolist()[:10]))
    log.info("  → Stub. Review column mapping after first pbpstats export and update this function.")
    if not dry_run:
        log.info("  No data written — implement column mapping first.")


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Gingeball TCV Upload Pipeline")
    parser.add_argument("--type",    required=True, choices=list(SCHEMAS.keys()), help="Dataset type")
    parser.add_argument("--csv",     required=True, help="Path to CSV file")
    parser.add_argument("--season",  type=int, default=None, help="Season year (e.g. 2025 for 2024-25)")
    parser.add_argument("--validate-only", action="store_true", help="Validate without writing to database")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be written without writing")
    args = parser.parse_args()

    csv_path = Path(args.csv)
    if not csv_path.exists():
        log.error(f"File not found: {csv_path}")
        sys.exit(1)

    # Load CSV
    log.info(f"Loading {csv_path}…")
    df = pd.read_csv(csv_path)
    log.info(f"Loaded {len(df)} rows, {len(df.columns)} columns")

    # Validate
    errors = validate(df, args.type)
    print_validation_report(df, errors, args.type)

    if errors:
        log.error("Validation failed — fix errors before ingesting")
        sys.exit(1)

    if args.validate_only:
        log.info("--validate-only set. Done.")
        return

    # Connect to Supabase
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        log.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env")
        sys.exit(1)

    db = create_client(url, key)

    # Get model version
    mv = db.table("model_versions").select("id").eq("is_current", True).execute()
    if not mv.data:
        log.error("No current model version found. Run seed.py first.")
        sys.exit(1)
    mv_id = mv.data[0]["id"]

    # Get seasons
    seasons_resp = db.table("seasons").select("id,season_year").execute()
    season_map   = {r["season_year"]: r["id"] for r in seasons_resp.data}

    # Get season_id for pbpstats datasets
    season_id = season_map.get(args.season) if args.season else None

    # Route to ingestor
    dry = args.dry_run
    if args.type == "tcv_scores":
        ingest_tcv_scores(db, df, season_map, mv_id, dry_run=dry)
    elif args.type == "iib_scores":
        ingest_iib_scores(db, df, season_map, mv_id, dry_run=dry)
    elif args.type == "pbpstats_lineups":
        ingest_pbpstats_lineups(db, df, season_id, dry_run=dry)
    elif args.type in ("pbpstats_clutch","pbpstats_poss"):
        log.info(f"{args.type}: {len(df)} rows validated. Ingestor not yet implemented.")
        log.info("Drop the CSV in pbpstats_exports/ — mapping will be built after first export review.")

    log.info("Pipeline complete.")


if __name__ == "__main__":
    main()
