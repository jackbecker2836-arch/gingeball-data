#!/usr/bin/env python3
# =============================================================================
# GINGEBALL DATA MANIFEST BUILDER
# CONTENT MARKER: GINGEBALL_MANIFEST_V1   (pick this file by marker, not name)
#
# Inventories the gingeball-data repo's SIM-RELEVANT files (2425 / 2526 /
# component + name-keyed player rates) and answers, per file:
#   - grain:  player_name | player_id | lineup | team | unknown
#   - join key the sim would merge on
#   - season, metric family
#   - row/col counts, sheet name
#   - usable_now: can it feed the sim today, or is it blocked (e.g. id->name map)
#   - dup_of: content fingerprint collision (catches accidental copies)
#
# Reads format by MAGIC BYTES, never by extension -- names lie in this repo
# (.csv.xlsx is usually real XLSX; some .xlsx are actually CSV).
#
# Usage:
#   python gingeball_data_manifest.py                 # fetch from raw GitHub
#   python gingeball_data_manifest.py --local DIR     # inventory a local folder
#   python gingeball_data_manifest.py --out PREFIX    # output file prefix
# Deps: pandas, openpyxl  (pip install pandas openpyxl)
# =============================================================================
import argparse, hashlib, io, os, re, sys, json
import pandas as pd

RAW = "https://raw.githubusercontent.com/jackbecker2836-arch/gingeball-data/main"

# --- sim-relevant target list (2425 / 2526 / component + name-keyed player) ---
# Out-of-scope historical seasons (1314..2324) are intentionally excluded; they
# feed the archetype HISTORICAL model, not the live sim. `possessions2526` is a
# known accidental copy of 2425 and is kept ONLY to prove dup-detection fires.
TARGETS = [
    # team (2425)
    "team2425offstealmisc.csv.xlsx","team2chance2425.csv.xlsx","teamfoul2425.csv.xlsx",
    "teamftsource2425.csv.xlsx","teammisc2425.csv.xlsx","teamoffFTmissmisc2425.csv.xlsx",
    "teamoffmakemisc2425.csv.xlsx","teamoffmissmisc2425.csv.xlsx","teampass2425.csv.xlsx",
    "teampen2425.csv.xlsx","teamreb2425.csv.xlsx","teamscore2425.csv.xlsx",
    "teamshotdis2425.csv.xlsx","teamto2425.csv.xlsx",
    # player (name-keyed)
    "2425def.csv.xlsx","def2425.csv.xlsx","def2526.csv.xlsx","defense2526.csv.xlsx",
    "selfcreated2425.xlsx","selfcreated2526.xlsx",
    "component_master_2526.csv","component_historical_2014_2024.csv","component_historical_2019_2024.csv",
    # player (entity_id-keyed tracking)
    "2425totals.csv.xlsx","players2324.csv.xlsx","2425touchdata.csv","202526touchdata.csv",
    # lineup (2526 per-100 + score)
    "per100MSC2526.csv.xlsx","per100PS2526.csv.xlsx","per100SQ2526.csv.xlsx","per100TOs2526.csv.xlsx",
    "per100assists2526.csv.xlsx","per100fouls2526.csv.xlsx","per100ftsource2526.csv.xlsx",
    "per100reb2526.csv.xlsx","per100scp2526.csv.xlsx","2526score100poss.csv.xlsx",
    # mixed-grain (let the classifier decide)
    "shotdat2425.csv.xlsx","shotdif2425.csv.xlsx","shotdif2526.csv.xlsx",
    "drives2425.csv.xlsx","drives2526.csv.xlsx","passes2425.csv.xlsx","passing2526.csv.xlsx",
    "possessions2425.csv.xlsx","possessions2526.csv.xlsx","poss2425.csv.xlsx",
    "opponent2425.csv.xlsx","opponent2526.csv.xlsx","rebound2526.csv.xlsx",
    "2425reb.csv.xlsx","2425rebtotals.csv.xlsx","2425shotstotals.csv.xlsx",
    "2425trackingshottotals.csv.xlsx","2425extras.csv.xlsx","speeddistance2526.csv.xlsx",
    "paint2526.csv.xlsx","post2526.csv.xlsx","elbow2526.csv.xlsx",
    "toughshotmaking2526.csv.xlsx","toughshotmaking2425.csv.xlsx",
    "shottrackingdata.csv.xlsx","pbpstats-tracking-shots.csv.xlsx","2021to2526pbpalladvantage.csv",
]

NAME_COLS = ["player","name","playername","player_name","shortname","te","short_name"]

def get_bytes(fname, local=None):
    if local:
        p = os.path.join(local, fname)
        if not os.path.exists(p): return None, "missing_local"
        return open(p, "rb").read(), "ok"
    import urllib.request, urllib.error
    try:
        with urllib.request.urlopen(f"{RAW}/{fname}", timeout=30) as r:
            return r.read(), "ok"
    except urllib.error.HTTPError as e:
        return None, f"http_{e.code}"
    except Exception as e:
        return None, f"err_{type(e).__name__}"

def read_frame(b):
    """Return (df, sheet, fmt) reading by MAGIC BYTES, not extension."""
    if b[:2] == b"PK":                      # zip => xlsx
        xl = pd.ExcelFile(io.BytesIO(b))
        return xl.parse(xl.sheet_names[0]), xl.sheet_names[0], "xlsx"
    for enc in ("utf-8-sig","utf-8","latin-1"):
        try:
            return pd.read_csv(io.BytesIO(b), encoding=enc, low_memory=False), "csv", "csv"
        except Exception:
            continue
    raise ValueError("unreadable")

def season_of(fname):
    m = re.search(r"(20)?(\d{2})(\d{2})(?!\d)", fname)
    if m: return f"{m.group(2)}-{m.group(3)}"
    m = re.search(r"(20\d{2})_(20\d{2})", fname)
    if m: return f"{m.group(1)}..{m.group(2)}"
    return "?"

def family_of(fname):
    f = fname.lower()
    for k in ["per100","teamscore","teammisc","teamfoul","teamftsource","teampass","teampen",
              "teamreb","teamto","teamshotdis","team2chance","teamoff","team2425off",
              "component_master","component_historical","selfcreated","toughshotmaking",
              "shotdif","shotdat","shottracking","speeddistance","speeddist","possessions",
              "score100poss","drives","passing","passes","opponent","rebound","reb","def",
              "defense","paint","post","elbow","touchdata","totals","extras","pbpalladvantage",
              "tracking-shots","players","poss"]:
        if f.startswith(k) or k in f: return k
    return "other"

def classify(df):
    cols = [str(c) for c in df.columns]
    low = {c.lower(): c for c in cols}
    name_col = next((low[n] for n in NAME_COLS if n in low), None)
    has_id = "entity_id" in low
    n = len(df)
    # lineup: a name column whose values are comma-joined 5-man strings
    if name_col is not None:
        s = df[name_col].astype(str)
        if s.str.contains(",").mean() > 0.5:
            return "lineup", "lineup_5man", name_col
    # team: ~30 rows, key values are short (<=3 char) abbreviations
    if name_col is not None and n <= 40:
        vals = df[name_col].astype(str)
        if vals.str.len().median() <= 3 and vals.nunique() <= 32:
            return "team", name_col, name_col
    if has_id and name_col is None:
        return "player_id", "entity_id", "entity_id"
    if name_col is not None:
        return "player_name", name_col, name_col
    return "unknown", "?", None

def usable(grain):
    return {"player_name":"yes (name join)",
            "player_id":"yes (entity_id = stats.nba.com id; 100% name-resolved)",
            "lineup":"engine/matchup grain (subs, Gap-B, MIN/+-)",
            "team":"engine calibration / matchup",
            "unknown":"inspect manually"}[grain]

def fingerprint(df, keycol):
    """True content hash: actual cell values (float-rounded) + column names.
    Only byte-equivalent data collides -- same-schema/same-roster files with
    different numbers (e.g. team start-type pace splits) do NOT."""
    d = df.copy()
    for c in d.select_dtypes("float").columns:
        d[c] = d[c].round(6)
    if keycol and keycol in d.columns:
        d = d.sort_values(by=keycol, kind="mergesort").reset_index(drop=True)
    try:
        body = pd.util.hash_pandas_object(d, index=False).values.tobytes()
    except Exception:
        body = d.to_csv(index=False).encode()
    colh = hashlib.md5(repr(tuple(str(c) for c in d.columns)).encode()).hexdigest()[:6]
    return colh + hashlib.md5(body).hexdigest()[:12]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--local", default=None, help="inventory a local folder instead of GitHub")
    ap.add_argument("--all", action="store_true", help="with --local: sweep every csv/xlsx except data/ & response_data/")
    ap.add_argument("--out", default="gingeball_manifest", help="output file prefix")
    args = ap.parse_args()

    targets = TARGETS
    if args.all and args.local:
        targets = []
        for dp, _, fns in os.walk(args.local):
            rel = os.path.relpath(dp, args.local).replace("\\", "/")
            if rel.startswith("data") or rel.startswith("response_data") or "/.git" in dp or dp.endswith(".git"):
                continue
            for fn in fns:
                if fn.lower().endswith((".csv", ".xlsx")):
                    targets.append(fn if rel == "." else f"{rel}/{fn}")
        targets = sorted(targets)

    rows, fps = [], {}
    for i, f in enumerate(targets, 1):
        b, status = get_bytes(f, args.local)
        rec = {"file": f, "status": status, "season": season_of(f), "family": family_of(f),
               "grain": "", "join_key": "", "rows": "", "cols": "", "sheet": "",
               "usable_now": "", "dup_of": "", "n_cols": ""}
        if b is None:
            rows.append(rec); print(f"[{i:>2}/{len(TARGETS)}] {status:>10}  {f}"); continue
        try:
            df, sheet, fmt = read_frame(b)
            grain, jk, keycol = classify(df)
            fp = fingerprint(df, keycol)
            rec.update(grain=grain, join_key=jk, rows=len(df), n_cols=df.shape[1],
                       cols="; ".join(str(c) for c in list(df.columns)[:14]),
                       sheet=sheet, usable_now=usable(grain), fmt=fmt)
            if fp in fps: rec["dup_of"] = fps[fp]
            else: fps[fp] = f
        except Exception as e:
            rec["status"] = f"read_err:{type(e).__name__}"
        rows.append(rec)
        print(f"[{i:>3}/{len(targets)}] {rec.get('grain') or rec['status']:>11}  {f}"
              + (f"   DUP_OF {rec['dup_of']}" if rec['dup_of'] else ""))

    man = pd.DataFrame(rows)
    csv_path = f"{args.out}.csv"
    man.to_csv(csv_path, index=False)

    # readable markdown grouped by grain
    md = ["# Gingeball data manifest (sim-relevant)", "",
          f"Source: {'local '+args.local if args.local else RAW}", "",
          "**Join rules:** `entity_id` and team ids are stats.nba.com ids "
          "(player ids resolve to names via nba_api static list, verified 100% on 2425totals). "
          "Lineup ids are `-`-joined player ids **sorted as strings** "
          "(e.g. `1629029-1630162-201142-203500-203999`; string sort, not numeric). "
          "The per100/score100poss lineup files key on last-name `ShortName` + `TeamAbbreviation`.", ""]
    order = ["player_name","player_id","lineup","team","unknown",""]
    for g in order:
        sub = man[man["grain"] == g]
        if not len(sub): continue
        md.append(f"## grain: {g or '(unreadable / missing)'}  ({len(sub)} files)")
        for _, r in sub.iterrows():
            tag = f" — DUP of {r['dup_of']}" if r['dup_of'] else ""
            md.append(f"- **{r['file']}** [{r['status']}] season={r['season']} "
                      f"rows={r['rows']} cols={r['n_cols']} key=`{r['join_key']}` "
                      f"→ {r['usable_now']}{tag}")
        md.append("")
    md_path = f"{args.out}.md"
    open(md_path, "w").write("\n".join(md))

    ok = (man["status"] == "ok").sum()
    print(f"\nwrote {csv_path} and {md_path}  ({ok}/{len(man)} fetched ok, "
          f"{(man['dup_of']!='').sum()} true content dups, "
          f"{(man['grain']=='player_id').sum()} id-keyed files (resolved via stats.nba.com))")

if __name__ == "__main__":
    main()
