"""
pull_epm.py — pulls EPM (Estimated Plus-Minus: off / def / total) from dunksandthrees.com
using the mwrolstad/dunks_and_threes_scraper package. Gives us a CURRENT-season impact
yardstick (our RAPM only goes through 2023-24).

RUN (Windows PowerShell):
    git clone https://github.com/mwrolstad/dunks_and_threes_scraper.git
    cd dunks_and_threes_scraper
    pip install pandas requests
    # put this file in that folder, then:
    python pull_epm.py

Writes epm_current.csv and epm_2025.csv next to it. Move them into your data repo.
If a year prints "no rows", the site layout changed — tell me and I'll adjust the parser.
"""
import os, sys, pandas as pd

# make the repo's src/ layout importable no matter where we run from
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "src"))

from dunks_and_threes_scraper import scrape_epm  # module-level function in __init__.py

# None = current season; "2025" = 2024-25, "2024" = 2023-24, etc.
targets = {"current": None, "2025": "2025"}

for label, year in targets.items():
    try:
        rows = scrape_epm(year=year)
        if not rows:
            print(f"!! {label}: no rows returned (site layout may have changed)")
            continue
        df = pd.DataFrame(rows)
        out = f"epm_{label}.csv"
        df.to_csv(out, index=False)
        # show the columns that matter
        cols = [c for c in df.columns if "epm" in str(c).lower() or c in ("player_name", "team_abrv")]
        print(f"OK {label}: {df.shape} -> {out}   (impact cols: {cols[:6]})")
    except Exception as e:
        print(f"!! {label} FAILED: {type(e).__name__}: {e}")
