"""
pull_epm2.py — patched EPM puller for dunksandthrees.com

The official scraper hardcodes 87 column names, but the site now returns 88,
so it crashes at the labeling step (the data itself downloads fine). This version
KEEPS the site's own columns instead of forcing names, and saves raw CSVs.
Upload the CSVs and the EPM columns get identified on the other end.

RUN (PowerShell), from any folder with internet:
    pip install pandas requests        # already done for you
    python pull_epm2.py

Writes epm_current_raw.csv and epm_2025_raw.csv next to it.
"""
import re, json, requests, pandas as pd

JSON_REGEX_EPM = re.compile("stats:(.*),season:")
HEADERS = {"User-Agent": "Mozilla/5.0 (Windows NT 6.1; WOW64; rv:52.0) Gecko/20100101 Firefox/52.0"}

def parse_epm_raw(html):
    j = re.findall(JSON_REGEX_EPM, html)
    if not j:
        return None
    # exact same cleaning the original uses (this part worked — it parsed fine)
    json_str = (
        j[0].strip()
        .replace(":", '":')
        .replace(",", ',"')
        .replace("{", '{"')
        .replace('"{"', '{"')
        .replace(",.", ",0.")
        .replace(",-.", ",-0.")
        .replace(":.", ":0.")
        .replace(":-.", ":-0.")
    )
    json_list = json.loads(json_str)
    df = pd.DataFrame(json_list)          # keep the site's natural columns — do NOT rename
    return df

def fetch(year):
    base = "https://dunksandthrees.com/epm"
    url = f"{base}?season={year}" if year else base
    print(f"Processing {url}")
    r = requests.get(url, headers=HEADERS)
    return parse_epm_raw(r.text)

for label, year in {"current": None, "2025": "2025"}.items():
    try:
        df = fetch(year)
        if df is None or df.empty:
            print(f"!! {label}: no rows (regex didn't match — site changed more than a column)")
            continue
        out = f"epm_{label}_raw.csv"
        df.to_csv(out, index=False)
        print(f"OK {label}: {df.shape} -> {out}")
        print(f"   columns: {list(df.columns)}")
    except Exception as e:
        print(f"!! {label} FAILED: {type(e).__name__}: {e}")
