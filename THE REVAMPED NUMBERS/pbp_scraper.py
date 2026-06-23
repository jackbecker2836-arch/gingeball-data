"""
Basketball-Reference Play-by-Play Scraper  (v2 — maximal capture)
=================================================================
Scrapes 2020-21 .. 2024-25 and produces RAPM-ready, audited data.

DESIGN PRINCIPLE: capture everything on the BBRef page on the FIRST pass, because
re-fetching costs ~6 hours at the legal crawl rate. Anything derivable later is
secondary; anything that lives only on the page is captured now.

OUTPUTS
  data/html/{gid}.html.gz          raw page (gzip) -> reparse locally, never re-scrape
  data/raw_pbp/{gid}.csv           flat events (side, player ids, assist/block/steal,
                                   shot distance, FT sequence, elapsed seconds, ...)
  data/possessions/{gid}_tp.csv    true possessions (FT-sequence-aware)
  data/possessions/{gid}_lineups.csv  COMPLETE stints: 10 player ids+names, score &
                                   time boundaries, margin, season/date/playoff tags
  data/possessions/{gid}_meta.json per-game QC (periods, stints, starter source, score check)
  data/players_master.csv          cumulative id -> name
  data/qc_manifest.csv             one row per game (scan this instead of 5,775 files)
  data/failures.csv                games that failed fetch/parse (re-run these only)
  data/schedule/season_{yr}.json   game ids + playoff flag

USAGE
  python pbp_scraper.py                      # full run (resume-safe, atomic, audited)
  python pbp_scraper.py --game 202402250HOU
  python pbp_scraper.py --selftest 202402250HOU
  python pbp_scraper.py --reparse            # rebuild CSVs from saved html/, no network
  python pbp_scraper.py --no-save-html       # opt out of raw html (saves ~1.5GB)
"""

import os, sys, time, json, gzip, random, logging, re, argparse
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Comment
import pandas as pd

# ── Config ──────────────────────────────────────────────────────────────────────
SEASONS = [2021, 2022, 2023, 2024, 2025, 2026]   # 2021 == 2020-21, 2026 == 2025-26
DELAY   = 3.5
JITTER  = 1.5            # + random 0..JITTER seconds, to look less robotic
BASE    = "https://www.basketball-reference.com"
SAVE_HTML        = True
BOXSCORE_FALLBACK = True  # fetch box score only when starter inference != 5/5
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; GingeballResearch/1.0; contact: research@gingeball.com)"}

DATA_DIR  = Path("./data")
RAW_DIR   = DATA_DIR / "raw_pbp"
POSS_DIR  = DATA_DIR / "possessions"
SCHED_DIR = DATA_DIR / "schedule"
HTML_DIR  = DATA_DIR / "html"
PLAYERS_MASTER = DATA_DIR / "players_master.csv"
QC_MANIFEST    = DATA_DIR / "qc_manifest.csv"
FAILURES       = DATA_DIR / "failures.csv"
for d in [RAW_DIR, POSS_DIR, SCHED_DIR, HTML_DIR]:
    d.mkdir(parents=True, exist_ok=True)

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)s  %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler(DATA_DIR / "scraper.log")])
log = logging.getLogger(__name__)

# ── HTTP ──────────────────────────────────────────────────────────────────────
def get_html(url: str, retries: int = 3) -> str | None:
    """Fetch URL text with retry + jittered delay. Returns html string or None."""
    for attempt in range(retries):
        try:
            resp = requests.get(url, headers=HEADERS, timeout=30)
            if resp.status_code == 429:
                wait = 60 * (attempt + 1); log.warning(f"429 rate-limited; waiting {wait}s …")
                time.sleep(wait); continue
            if resp.status_code == 404:
                log.warning(f"404 — {url}"); return None
            resp.raise_for_status()
            time.sleep(DELAY + random.uniform(0, JITTER))
            return resp.text
        except requests.RequestException as e:
            log.error(f"attempt {attempt+1} failed {url}: {e}"); time.sleep(DELAY * 2)
    return None

def get_soup(url: str) -> BeautifulSoup | None:
    h = get_html(url); return BeautifulSoup(h, "html.parser") if h else None

def all_tables(soup: BeautifulSoup):
    """All <table>, including those BBRef hides inside HTML comments (box scores)."""
    tables = list(soup.find_all("table"))
    for c in soup.find_all(string=lambda t: isinstance(t, Comment)):
        if "<table" in c:
            tables += BeautifulSoup(c, "html.parser").find_all("table")
    return tables

# ── Time / meta helpers ─────────────────────────────────────────────────────────
def clock_to_seconds(s: str):
    m = re.match(r"(\d+):(\d+(?:\.\d+)?)", str(s).strip())
    return int(m.group(1)) * 60 + float(m.group(2)) if m else None

def elapsed_seconds(period: int, time_str: str):
    rem = clock_to_seconds(time_str)
    if rem is None: return None
    plen = 12*60 if period <= 4 else 5*60
    prior = sum((12*60 if p <= 4 else 5*60) for p in range(1, period))
    return round(prior + (plen - rem), 1)

def game_meta(game_id: str):
    y, mo = int(game_id[:4]), int(game_id[4:6])
    season = y + 1 if mo >= 10 else y           # Dec 2020 -> 2021 (2020-21)
    return game_id[:8], season                   # (date YYYYMMDD, season_year)

# ── Schedule (now tags playoff vs regular) ──────────────────────────────────────
TEAMS = ["ATL","BOS","BRK","CHO","CHI","CLE","DAL","DEN","DET","GSW","HOU","IND","LAC",
         "LAL","MEM","MIA","MIL","MIN","NOP","NYK","OKC","ORL","PHI","PHO","POR","SAC",
         "SAS","TOR","UTA","WAS"]

def season_game_ids(season: int) -> dict[str, bool]:
    """Return {game_id: is_playoff} for a season (regular + playoffs), resume-safe."""
    cache = SCHED_DIR / f"season_{season}.json"
    if cache.exists():
        d = json.loads(cache.read_text())
        if isinstance(d, dict):                      # v2 format {gid: is_playoff}
            log.info(f"Season {season}: {len(d)} game ids from cache.")
            return d
        log.info(f"Season {season}: stale (v1) cache found — refetching with playoff flags.")
    log.info(f"Fetching schedule for season {season} …")
    games: dict[str, bool] = {}
    for team in TEAMS:
        soup = get_soup(f"{BASE}/teams/{team}/{season}_games.html")
        if soup is None: continue
        for table in all_tables(soup):
            tid = table.get("id", "")
            if tid not in ("games", "games_playoffs"): continue
            is_po = (tid == "games_playoffs")
            for a in table.select("a[href*='/boxscores/2']"):
                m = re.search(r"/boxscores/(\d{9}[A-Z]{3})\.html", a["href"])
                if m: games[m.group(1)] = games.get(m.group(1), False) or is_po
        log.info(f"  {team}: {len(games)} total so far")
    cache.write_text(json.dumps(games, indent=2))
    log.info(f"Season {season}: {len(games)} games ({sum(games.values())} playoff).")
    return games

# ── Link/id helpers ──────────────────────────────────────────────────────────────
def _pid(a) -> str:
    if not a or not a.has_attr("href"): return ""
    m = re.search(r"/players/[a-z]/([a-z0-9]+)\.html", a["href"]); return m.group(1) if m else ""

LINEUP_DIAG = {}   # populated by extract_lineups for selftest visibility

def backfill_ids(pbp):
    """
    Resolve missing player ids from the player NAME seen elsewhere in the game, and
    repair substitutions where only one of the two players is linked.

    Subs: when BOTH players are linked we trust the precise positional ids
    (links[0]=enters, links[1]=leaves — this preserves same-abbreviation players like
    Jalen vs Jaylin Williams). When a link is missing we fall back to the event TEXT
    ("X enters the game for Y") and resolve each name through the id map, so the
    on-court set never takes an empty/ambiguous id.
    """
    pbp = pbp.copy()
    for c in ("player", "player_id", "player2", "player2_id", "assist_id", "block_id", "steal_id"):
        if c in pbp.columns: pbp[c] = pbp[c].fillna("")   # CSV reloads read blanks as NaN floats
    name2id = {}
    for nm, pid in zip(pbp["player"], pbp["player_id"]):
        if pid and nm and not str(pid).startswith("NAME:"): name2id.setdefault(nm, pid)
    for nm, pid in zip(pbp["player2"], pbp["player2_id"]):
        if pid and nm and not str(pid).startswith("NAME:"): name2id.setdefault(nm, pid)

    def resolve(name):
        if not name: return ""
        if name in name2id: return name2id[name]
        return "NAME:" + re.sub(r"\W+", "_", name).strip("_")

    pl, plid, p2, p2id = [], [], [], []
    for _, r in pbp.iterrows():
        if r["is_sub"]:
            if r["player_id"] and r["player2_id"]:        # both linked → trust positional ids
                pl.append(r["player"]); plid.append(r["player_id"])
                p2.append(r["player2"]); p2id.append(r["player2_id"]); continue
            m = re.search(r"(.+?)\s+enters the game for\s+(.+)", str(r["event_text"]), re.I)
            if m:
                en, lv = m.group(1).strip(), m.group(2).strip()
                pl.append(en); plid.append(resolve(en)); p2.append(lv); p2id.append(resolve(lv)); continue
        # non-sub (or unparseable sub): keep link id, else backfill by name
        pl.append(r["player"]);  plid.append(r["player_id"] or resolve(r["player"]))
        p2.append(r["player2"]); p2id.append(r["player2_id"] or (resolve(r["player2"]) if r["player2"] else ""))

    pbp["player"], pbp["player_id"], pbp["player2"], pbp["player2_id"] = pl, plid, p2, p2id
    ev = pbp["event_text"].str.lower()
    pbp["assist_id"] = [x if (not sub and "assist" in e) else "" for x, sub, e in zip(pbp["player2_id"], pbp["is_sub"], ev)]
    pbp["block_id"]  = [x if (not sub and b) else "" for x, sub, b in zip(pbp["player2_id"], pbp["is_sub"], pbp["is_block"])]
    pbp["steal_id"]  = [x if (not sub and s) else "" for x, sub, s in zip(pbp["player2_id"], pbp["is_sub"], pbp["is_steal"])]
    return pbp

def parse_team_abbrevs(soup, game_id):
    home = game_id[-3:]; codes = []
    for a in soup.select("a[href]"):
        m = re.search(r"/teams/([A-Z]{3})/\d{4}\.html", a["href"])
        if m and m.group(1) not in codes: codes.append(m.group(1))
    away = next((c for c in codes if c != home), "")
    if not away and soup.title:
        mt = re.match(r"(.+?)\s+at\s+(.+?)\s+Play", soup.title.get_text())
        if mt: away = mt.group(1).strip()
    return away, home

# ── PBP parsing (maximal field capture) ──────────────────────────────────────────
def parse_pbp_page(soup, game_id, is_playoff=False):
    table = soup.find("table", {"id": "pbp"})
    if table is None:
        log.warning(f"No PBP table for {game_id}"); return None
    away_team, home_team = parse_team_abbrevs(soup, game_id)
    if not away_team or not home_team:
        log.warning(f"{game_id}: teams unresolved (away={away_team!r} home={home_team!r})")
    date, season = game_meta(game_id)

    rows, current_period = [], 1
    for tr in table.find_all("tr"):
        cls = tr.get("class", []) if "class" in tr.attrs else []
        if "thead" in cls:
            text = tr.get_text(strip=True)
            m  = re.search(r"(\d)(?:st|nd|rd|th)\s+Q", text, re.I)
            ot = re.search(r"(\d)(?:st|nd|rd|th)\s+OT", text, re.I)
            if m:   current_period = int(m.group(1))
            elif ot: current_period = 4 + int(ot.group(1))
            elif re.search(r"\bOT\b|Overtime", text, re.I): current_period = 5
            continue
        tds = tr.find_all("td")
        if len(tds) < 6: continue

        time_td  = tds[0].get_text(strip=True)
        away_td, home_td = tds[1], tds[5]
        away_raw = away_td.get_text(separator=" ", strip=True)
        home_raw = home_td.get_text(separator=" ", strip=True)

        away_score = home_score = None
        for _c in tds:
            _m = re.fullmatch(r"(\d{1,3})-(\d{1,3})", _c.get_text(strip=True))
            if _m: away_score, home_score = int(_m.group(1)), int(_m.group(2)); break

        if away_raw:   side, event_text, event_td = "away", away_raw, away_td
        elif home_raw: side, event_text, event_td = "home", home_raw, home_td
        else: continue
        if not time_td: continue

        ev = event_text.lower()
        is_shot   = bool(re.search(r"\b(makes|misses)\b", ev))
        shot_made = bool(re.search(r"\bmakes\b", ev)) if is_shot else None
        is_ft     = "free throw" in ev
        ft_made   = (("makes" in ev) if is_ft else None)
        is_tech_ft = is_ft and "technical" in ev
        is_rebound = "rebound" in ev
        is_off_rebound = is_rebound and "offensive" in ev
        is_def_rebound = is_rebound and "defensive" in ev
        is_turnover = "turnover" in ev
        is_steal    = "steal" in ev
        is_block    = "block" in ev
        is_foul     = "foul" in ev
        is_timeout  = "timeout" in ev
        is_sub      = "enters the game for" in ev
        is_jumpball = "jump ball" in ev
        is_scoring  = bool(shot_made) or bool(ft_made)
        is_live_ball_tov = is_turnover and is_steal
        is_dead_ball = is_timeout or is_sub or (is_foul and not is_turnover)

        # FT sequence ("free throw 2 of 3")
        ft_num = ft_of = None
        mft = re.search(r"free throw (\d+) of (\d+)", ev)
        if mft: ft_num, ft_of = int(mft.group(1)), int(mft.group(2))

        # Shot zone + distance
        shot_zone = shot_dist = None
        if is_shot and not is_ft:
            md = re.search(r"from (\d+) ft", ev)
            if md: shot_dist = int(md.group(1))
            if "3-pt" in ev or "3-point" in ev or "3pt" in ev:
                shot_zone = "corner_3" if "corner" in ev else "above_break_3"
            elif re.search(r"\b(dunk|layup|alley.oop|finger.roll|tip.in|putback|hook)\b", ev):
                shot_zone, shot_dist = "rim", (shot_dist if shot_dist is not None else 0)
            elif "paint" in ev or "in the lane" in ev: shot_zone = "paint"
            elif shot_dist is not None: shot_zone = "above_break_3" if shot_dist >= 23 else ("midrange" if shot_dist >= 15 else "paint")
            else: shot_zone = "midrange"

        points = 1 if ft_made else (3 if (shot_made and not is_ft and shot_zone in ("corner_3","above_break_3")) else (2 if (shot_made and not is_ft) else 0))

        links = event_td.find_all("a")
        player    = links[0].get_text(strip=True) if links else ""
        player_id = _pid(links[0]) if links else ""
        player2   = links[1].get_text(strip=True) if len(links) > 1 else ""
        player2_id = _pid(links[1]) if len(links) > 1 else ""
        # Semantic 2nd-actor (only meaningful for non-subs)
        assist_id = player2_id if (not is_sub and "assist" in ev) else ""
        block_id  = player2_id if (not is_sub and is_block) else ""
        steal_id  = player2_id if (not is_sub and is_steal) else ""

        rows.append({
            "game_id": game_id, "season": season, "date": date, "is_playoff": is_playoff,
            "period": current_period, "time_remaining": time_td,
            "elapsed": elapsed_seconds(current_period, time_td),
            "away_score": away_score, "home_score": home_score,
            "away_team": away_team, "home_team": home_team,
            "side": side, "team": away_team if side == "away" else home_team,
            "player": player, "player_id": player_id, "player2": player2, "player2_id": player2_id,
            "assist_id": assist_id, "block_id": block_id, "steal_id": steal_id,
            "event_text": event_text,
            "is_scoring": is_scoring, "points": points,
            "is_shot": is_shot, "shot_made": shot_made, "shot_zone": shot_zone, "shot_dist": shot_dist,
            "is_ft": is_ft, "ft_made": ft_made, "ft_num": ft_num, "ft_of": ft_of, "is_tech_ft": is_tech_ft,
            "is_rebound": is_rebound, "is_off_rebound": is_off_rebound, "is_def_rebound": is_def_rebound,
            "is_turnover": is_turnover, "is_steal": is_steal, "is_block": is_block, "is_foul": is_foul,
            "is_timeout": is_timeout, "is_sub": is_sub, "is_jumpball": is_jumpball,
            "is_live_ball_tov": is_live_ball_tov, "is_dead_ball": is_dead_ball,
        })
    return pd.DataFrame(rows) if rows else None

# ── True possessions (now FT-sequence aware) ────────────────────────────────────
def parse_true_possessions(pbp):
    if pbp is None or pbp.empty: return pd.DataFrame()
    game_id = pbp["game_id"].iloc[0]; away = pbp["away_team"].iloc[0]; home = pbp["home_team"].iloc[0]
    records, tp_id = [], 0
    offense, defense, last_time, last_period = away, home, None, 1

    def new_tp(t, period, off, defe):
        return {"true_possession_id": f"{game_id}_TP{tp_id:04d}", "game_id": game_id, "period": period,
                "offense_team": off, "defense_team": defe, "tp_start_time": t, "tp_end_time": None,
                "standard_possessions_inside": 0, "true_possession_points": 0,
                "advantage_count": 0, "dead_ball_end_type": None}
    current = new_tp(None, 1, offense, defense)

    for _, row in pbp.iterrows():
        period, t = row["period"], row["time_remaining"]
        if period != last_period:
            if current["tp_start_time"] is not None:
                current["tp_end_time"] = last_time; current["dead_ball_end_type"] = "end_of_period"
                records.append(current); tp_id += 1
            offense, defense = away, home; current = new_tp(t, period, offense, defense); last_period = period
        if current["tp_start_time"] is None: current["tp_start_time"] = t
        if row["is_scoring"]: current["true_possession_points"] += row["points"]

        end_tp, end_type, flip = False, None, False
        if row["is_timeout"]: end_tp, end_type = True, "timeout"
        elif row["is_sub"]: pass
        elif row["shot_made"] and not row["is_ft"]: end_tp, end_type, flip = True, "made_fg", True
        elif row["ft_made"]:
            last_ft = (row["ft_of"] is None) or (row["ft_num"] == row["ft_of"])
            if row["is_tech_ft"]: pass                       # technical FT: no flip, play continues
            elif last_ft: end_tp, end_type, flip = True, "made_ft", True   # only the LAST FT ends the trip
        elif row["is_turnover"] and not row["is_live_ball_tov"]: end_tp, end_type, flip = True, "dead_ball_tov", True
        elif row["is_foul"] and not row["is_turnover"]: end_tp, end_type = True, "foul"

        if end_tp:
            current["tp_end_time"] = t; current["dead_ball_end_type"] = end_type
            records.append(current); tp_id += 1
            if flip: offense, defense = defense, offense
            current = new_tp(t, period, offense, defense)
        elif row["is_off_rebound"]:
            current["standard_possessions_inside"] += 1
        last_time = t

    if current["tp_start_time"] is not None:
        current["tp_end_time"] = last_time; current["dead_ball_end_type"] = "game_end"; records.append(current)
    return pd.DataFrame(records) if records else pd.DataFrame()

# ── Team map + per-period lineup reconstruction ──────────────────────────────────
# Two BBRef realities force this design:
#   1. A player's event COLUMN is not his team — fouls are logged in the column of the
#      team that DREW them, so the fouler shows up in his opponent's column. We therefore
#      map players to teams from substitutions (reliably columned) + non-foul actions.
#   2. Substitutions at quarter breaks are frequently NOT logged ("enters the game for"
#      lines are omitted; players just start appearing). So lineups CANNOT be carried
#      across periods — each period's opening five is re-derived from its own events.

def build_team_map(pbp):
    """player_id -> 'away'/'home', by majority vote over subs (weight 5) and non-foul
    primary actions (weight 1). Fouls are excluded (column = drawing team, not fouler)."""
    from collections import defaultdict, Counter
    votes = defaultdict(Counter)
    for _, r in pbp.iterrows():
        if r["is_sub"]:
            if r["player_id"]:  votes[r["player_id"]][r["side"]] += 5
            if r["player2_id"]: votes[r["player2_id"]][r["side"]] += 5
        elif not r["is_foul"]:
            if r["player_id"]: votes[r["player_id"]][r["side"]] += 1
    return {pid: c.most_common(1)[0][0] for pid, c in votes.items() if c}

def period_opening(prows, tmap):
    """Opening five per team for ONE period: players seen on court (own action, teammate
    assist, opponent block/steal, or subbed-out) before ever being subbed IN this period.
    Team comes from tmap, never the column, so foul-misattributed rows can't pollute."""
    entered = {"away": set(), "home": set()}; opening = {"away": [], "home": []}
    def consider(pid):
        t = tmap.get(pid)
        if t and pid not in entered[t] and pid not in opening[t] and len(opening[t]) < 5:
            opening[t].append(pid)
    for _, r in prows.iterrows():
        if r["is_sub"]:
            if r["player2_id"]: consider(r["player2_id"])
            t = tmap.get(r["player_id"])
            if t and r["player_id"]: entered[t].add(r["player_id"])
        else:
            for pid in (r["player_id"], r["assist_id"], r["block_id"], r["steal_id"]):
                if pid: consider(pid)
        if len(opening["away"]) >= 5 and len(opening["home"]) >= 5: break
    return opening

def fetch_boxscore_starters(game_id, away, home):
    """Ground-truth starters from the box score (only called when inference != 5/5)."""
    soup = get_soup(f"{BASE}/boxscores/{game_id}.html")
    if soup is None: return {}
    out = {}
    for side, team in (("away", away), ("home", home)):
        tbl = next((t for t in all_tables(soup) if t.get("id") == f"box-{team}-game-basic"), None)
        if tbl is None or tbl.tbody is None: continue
        starters = []
        for tr in tbl.tbody.find_all("tr"):
            if "thead" in (tr.get("class", []) or []): break   # "Reserves" separator
            pid = _pid(tr.find("th").find("a") if tr.find("th") else None)
            if pid: starters.append(pid)
            if len(starters) == 5: break
        if len(starters) == 5: out[side] = starters
    return out

# ── Lineups / stints ─────────────────────────────────────────────────────────────
def extract_lineups(pbp, tmap, boxscore_starters=None):
    """Rebuild complete stints. Each period's opening five is re-derived (BBRef omits
    between-quarter subs); players are routed to teams via tmap (BBRef miscolumns fouls)."""
    if pbp is None or pbp.empty: return pd.DataFrame()
    game_id = pbp["game_id"].iloc[0]; season = pbp["season"].iloc[0]
    date = pbp["date"].iloc[0]; is_po = bool(pbp["is_playoff"].iloc[0])

    id2name = {}
    for _, r in pbp.iterrows():
        if r["player_id"]:  id2name.setdefault(r["player_id"], r["player"])
        if r["player2_id"]: id2name.setdefault(r["player2_id"], r["player2"])

    stints, cur_a, cur_h = [], 0, 0
    diag = {"skipped_size": 0, "max_size": 0, "null_duration": 0, "covered_secs": 0.0,
            "blank_ids": 0, "drift_examples": []}

    def record(period, t_on, t_off, secs_on, secs_off, sc_on, sc_off, lineup):
        sz_a, sz_h = len(lineup["away"]), len(lineup["home"])
        diag["max_size"] = max(diag["max_size"], sz_a, sz_h)
        if t_on is None or t_off is None or t_on == t_off: return
        if sz_a != 5 or sz_h != 5:
            diag["skipped_size"] += 1
            if len(diag["drift_examples"]) < 6:
                diag["drift_examples"].append({"period": int(period), "t_on": t_on, "t_off": t_off, "away": sz_a, "home": sz_h})
            return
        a, h = sorted(lineup["away"]), sorted(lineup["home"])
        if any(not x or str(x).startswith("NAME:") for x in a + h): diag["blank_ids"] += 1
        dur = (round(secs_off - secs_on, 1) if (secs_on is not None and secs_off is not None) else None)
        if dur is None: diag["null_duration"] += 1
        else: diag["covered_secs"] += dur
        rec = {"game_id": game_id, "season": season, "date": date, "is_playoff": is_po,
               "period": period, "time_on": t_on, "time_off": t_off,
               "secs_on": secs_on, "secs_off": secs_off, "duration": dur,
               "away_score_on": sc_on[0], "home_score_on": sc_on[1],
               "away_score_off": sc_off[0], "home_score_off": sc_off[1],
               "score_margin_on": sc_on[1] - sc_on[0], "score_margin_off": sc_off[1] - sc_off[0]}
        for i, pid in enumerate(a, 1): rec[f"away_p{i}"] = id2name.get(pid, pid); rec[f"away_p{i}_id"] = pid
        for i, pid in enumerate(h, 1): rec[f"home_p{i}"] = id2name.get(pid, pid); rec[f"home_p{i}_id"] = pid
        stints.append(rec)

    periods = sorted(pbp["period"].unique())
    prev_close = None
    for p in periods:
        prows = pbp[pbp["period"] == p]
        opening = period_opening(prows, tmap)
        for side in ("away", "home"):
            if len(opening[side]) < 5:
                if p == periods[0] and boxscore_starters and side in boxscore_starters:
                    opening[side] = boxscore_starters[side]                 # game tip-off fallback
                elif prev_close and prev_close.get(side):                   # later periods: carry prior close
                    for pid in prev_close[side]:
                        if len(opening[side]) >= 5: break
                        if pid not in opening[side]: opening[side].append(pid)
        lineup = {"away": set(opening["away"][:5]), "home": set(opening["home"][:5])}
        s_time = s_secs = None; s_scores = (cur_a, cur_h); last_t = last_s = None
        for _, row in prows.iterrows():
            t, secs = row["time_remaining"], row["elapsed"]
            v = row["away_score"]
            if v is not None and v == v: cur_a, cur_h = row["away_score"], row["home_score"]
            if s_time is None: s_time, s_secs, s_scores = t, secs, (cur_a, cur_h)
            if row["is_sub"]:
                tm = tmap.get(row["player_id"]) or tmap.get(row["player2_id"])
                if tm in lineup:
                    record(p, s_time, t, s_secs, secs, s_scores, (cur_a, cur_h), lineup)
                    lineup[tm].discard(row["player2_id"])
                    if row["player_id"]: lineup[tm].add(row["player_id"])
                    s_time, s_secs, s_scores = t, secs, (cur_a, cur_h)
            last_t, last_s = t, secs
        record(p, s_time, last_t, s_secs, last_s, s_scores, (cur_a, cur_h), lineup)
        prev_close = {"away": sorted(lineup["away"]), "home": sorted(lineup["home"])}

    global LINEUP_DIAG; LINEUP_DIAG = diag
    return pd.DataFrame(stints) if stints else pd.DataFrame()

# ── IO helpers ────────────────────────────────────────────────────────────────────
def write_csv_atomic(df, path: Path, retries: int = 12, backoff: float = 0.75):
    # os.replace can hit PermissionError (WinError 5) on Windows when OneDrive sync, Excel,
    # or antivirus is briefly holding the destination open. The lock is transient, so retry
    # with linear backoff (total window ~60s) before giving up with an actionable message.
    tmp = path.with_suffix(path.suffix + ".tmp")
    df.to_csv(tmp, index=False)
    last = None
    for i in range(retries):
        try:
            os.replace(tmp, path)
            return
        except PermissionError as e:
            last = e
            time.sleep(backoff * (i + 1))
    raise PermissionError(
        f"Could not replace {path} after {retries} retries — a program is holding it open. "
        f"Close Excel if {path.name} is open there, and pause OneDrive sync (or move the project "
        f"out of OneDrive). The temp file is safe at {tmp}. Original error: {last}"
    )

def save_html(game_id, html):
    with gzip.open(HTML_DIR / f"{game_id}.html.gz", "wt", encoding="utf-8") as f: f.write(html)

def load_html(game_id):
    p = HTML_DIR / f"{game_id}.html.gz"
    if not p.exists(): return None
    with gzip.open(p, "rt", encoding="utf-8") as f: return f.read()

def update_players_master(pbp):
    pairs = {}
    for _, r in pbp.iterrows():
        if r["player_id"]:  pairs.setdefault(r["player_id"], r["player"])
        if r["player2_id"]: pairs.setdefault(r["player2_id"], r["player2"])
    if not pairs: return
    existing = {}
    if PLAYERS_MASTER.exists():
        try:
            df = pd.read_csv(PLAYERS_MASTER); existing = dict(zip(df["player_id"], df["name"]))
        except Exception: pass
    for k, v in pairs.items(): existing.setdefault(k, v)
    write_csv_atomic(pd.DataFrame(sorted(existing.items()), columns=["player_id", "name"]), PLAYERS_MASTER)

def append_row(path: Path, row: dict):
    df = pd.DataFrame([row])
    df.to_csv(path, mode="a", header=not path.exists(), index=False)

# ── QC ────────────────────────────────────────────────────────────────────────────
def qc_metrics(game_id, pbp, lineups, tp, starter_source):
    periods = sorted(int(p) for p in pbp["period"].unique())
    final_a = pbp["away_score"].dropna().iloc[-1] if pbp["away_score"].notna().any() else None
    final_h = pbp["home_score"].dropna().iloc[-1] if pbp["home_score"].notna().any() else None
    pts_a = int(pbp.loc[pbp["side"] == "away", "points"].sum())
    pts_h = int(pbp.loc[pbp["side"] == "home", "points"].sum())
    score_ok = (final_a is not None and abs(pts_a - final_a) <= 3 and abs(pts_h - final_h) <= 3)
    n_stints = len(lineups)
    return {"game_id": game_id, "season": int(pbp["season"].iloc[0]), "is_playoff": bool(pbp["is_playoff"].iloc[0]),
            "n_events": len(pbp), "n_periods": len(periods), "periods_ok": periods[:4] == [1,2,3,4],
            "n_stints": n_stints, "stints_ok": n_stints >= 20, "n_tp": len(tp),
            "starter_source": starter_source,
            "final_score": f"{final_a}-{final_h}", "pts_sum": f"{pts_a}-{pts_h}", "score_ok": bool(score_ok)}

# ── Per-game pipeline ──────────────────────────────────────────────────────────────
def process_pbp(game_id, soup, is_playoff):
    """Parse one already-fetched page into (pbp, lineups, tp, qc)."""
    pbp = parse_pbp_page(soup, game_id, is_playoff)
    if pbp is None or pbp.empty: return None
    pbp = backfill_ids(pbp)                      # resolve missing ids before lineup tracking
    tmap = build_team_map(pbp)                   # player -> team (column is unreliable for fouls)
    source = "pbp_perperiod"
    boxscore = None
    if BOXSCORE_FALLBACK:                         # only needed if the tip-off five can't be inferred
        periods = sorted(pbp["period"].unique())
        op1 = period_opening(pbp[pbp["period"] == periods[0]], tmap)
        if len(op1["away"]) != 5 or len(op1["home"]) != 5:
            boxscore = fetch_boxscore_starters(game_id, pbp["away_team"].iloc[0], pbp["home_team"].iloc[0])
            if boxscore: source = "boxscore_fallback"
    lineups = extract_lineups(pbp, tmap, boxscore)
    tp = parse_true_possessions(pbp)
    qc = qc_metrics(game_id, pbp, lineups, tp, source)
    return pbp, lineups, tp, qc

def write_outputs(game_id, pbp, lineups, tp, qc):
    write_csv_atomic(pbp, RAW_DIR / f"{game_id}.csv")
    write_csv_atomic(tp, POSS_DIR / f"{game_id}_tp.csv")
    write_csv_atomic(lineups, POSS_DIR / f"{game_id}_lineups.csv")
    (POSS_DIR / f"{game_id}_meta.json").write_text(json.dumps(qc, indent=2))
    update_players_master(pbp)
    append_row(QC_MANIFEST, qc)

def scrape_game(game_id, is_playoff=False) -> bool:
    raw, tpf, luf = RAW_DIR / f"{game_id}.csv", POSS_DIR / f"{game_id}_tp.csv", POSS_DIR / f"{game_id}_lineups.csv"
    if raw.exists() and tpf.exists() and luf.exists(): return True
    html = get_html(f"{BASE}/boxscores/pbp/{game_id}.html")
    if html is None:
        append_row(FAILURES, {"game_id": game_id, "reason": "fetch_failed"}); return False
    if SAVE_HTML: save_html(game_id, html)
    res = process_pbp(game_id, BeautifulSoup(html, "html.parser"), is_playoff)
    if res is None:
        append_row(FAILURES, {"game_id": game_id, "reason": "parse_empty"}); return False
    pbp, lineups, tp, qc = res
    write_outputs(game_id, pbp, lineups, tp, qc)
    if not qc["stints_ok"]:
        log.warning(f"{game_id}: only {qc['n_stints']} stints (written, flagged in qc_manifest).")
    return True

# ── Reparse mode (rebuild from saved html, no network) ──────────────────────────────
def reparse_all(schedule):
    files = sorted(HTML_DIR.glob("*.html.gz"))
    log.info(f"Reparsing {len(files)} saved pages (no network) …")
    for i, p in enumerate(files, 1):
        gid = p.name.replace(".html.gz", "")
        res = process_pbp(gid, BeautifulSoup(load_html(gid), "html.parser"), schedule.get(gid, False))
        if res is None: append_row(FAILURES, {"game_id": gid, "reason": "reparse_empty"}); continue
        write_outputs(gid, *res)
        if i % 200 == 0: log.info(f"  reparsed {i}/{len(files)}")
    log.info("Reparse complete.")

# ── Selftest ────────────────────────────────────────────────────────────────────────
def selftest(game_id):
    print(f"\n=== SELFTEST {game_id} ===")
    html = get_html(f"{BASE}/boxscores/pbp/{game_id}.html")
    if not html: print("FAIL: fetch"); return
    soup = BeautifulSoup(html, "html.parser")
    away, home = parse_team_abbrevs(soup, game_id)
    print(f"teams: away={away!r} home={home!r} (home should be {game_id[-3:]!r})")
    pbp = parse_pbp_page(soup, game_id)
    if pbp is None: print("FAIL: no pbp"); return
    print(f"events={len(pbp)}  periods={sorted(pbp['period'].unique())}")
    print(f"player_id coverage={(pbp['player_id']!='').mean():.0%}  subs={int(pbp['is_sub'].sum())}  "
          f"assists={int((pbp['assist_id']!='').sum())} blocks={int((pbp['block_id']!='').sum())} steals={int((pbp['steal_id']!='').sum())}")
    print(f"shots w/ distance={(pbp['shot_dist'].notna()).sum()}  FT w/ sequence={(pbp['ft_of'].notna()).sum()}")
    tmap = build_team_map(pbp)
    print(f"team_map: {len(tmap)} players mapped")
    periods = sorted(pbp["period"].unique())
    op1 = period_opening(pbp[pbp["period"] == periods[0]], tmap)
    print(f"period-1 opening five: away={len(op1['away'])}/5 home={len(op1['home'])}/5")
    bad = [int(p) for p in periods
           if len(period_opening(pbp[pbp['period'] == p], tmap)['away']) != 5
           or len(period_opening(pbp[pbp['period'] == p], tmap)['home']) != 5]
    print(f"periods with opening != 5/5: {bad if bad else 'none'}")
    res = process_pbp(game_id, soup, False)
    _, lineups, tp, qc = res
    print(f"STINTS={len(lineups)} (expect ~30-45)  TP={len(tp)}")
    if not lineups.empty:
        print(f"  per period: {lineups.groupby('period').size().to_dict()}")
        covered = LINEUP_DIAG.get("covered_secs", 0) / 60
        print(f"  stint coverage: {covered:.1f} min of 48 ({covered/48:.0%})  [should be ~48]")
        d = LINEUP_DIAG
        print(f"  drift check: stints_skipped(size!=5)={d['skipped_size']}  max_oncourt={d['max_size']}  "
              f"null_duration={d['null_duration']}  blank_ids={d['blank_ids']}")
        if d["drift_examples"]:
            print(f"  first drift moments: {d['drift_examples']}")
    print(f"QC: {json.dumps(qc)}")
    print("=== END ===\n")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game"); ap.add_argument("--selftest"); ap.add_argument("--reparse", action="store_true")
    ap.add_argument("--no-save-html", action="store_true")
    args = ap.parse_args()
    global SAVE_HTML
    if args.no_save_html: SAVE_HTML = False
    if args.selftest: selftest(args.selftest); return

    schedule = {}
    for season in SEASONS: schedule.update(season_game_ids(season))
    if args.reparse: reparse_all(schedule); return
    if args.game: log.info(f"{args.game}: {'OK' if scrape_game(args.game, schedule.get(args.game, False)) else 'FAIL'}"); return

    total = success = skip = fail = 0
    log.info("=" * 60); log.info(f"Scraper v2 — {len(schedule)} games, save_html={SAVE_HTML}"); log.info("=" * 60)
    for gid, is_po in sorted(schedule.items()):
        if (RAW_DIR / f"{gid}.csv").exists() and (POSS_DIR / f"{gid}_lineups.csv").exists():
            skip += 1; continue
        ok = scrape_game(gid, is_po); total += 1; success += int(ok); fail += int(not ok)
        if total % 50 == 0: log.info(f"  {success} ok / {fail} fail / {skip} skip")
    log.info("=" * 60); log.info(f"DONE: {success} ok / {fail} fail / {skip} skip"); log.info("=" * 60)

if __name__ == "__main__":
    main()
