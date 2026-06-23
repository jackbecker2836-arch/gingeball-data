"""
pull_fastbreak.py  —  pulls the data we DON'T already have (synergy play-types,
hustle/screen-assists/deflections, player matchups, and the official NBA
gravity / leverage / shot-quality leaders) straight from stats.nba.com.

These are the "blocked tier" metrics. None of them are in llimllib/nba_data —
the only way to get them is to hit stats.nba.com, which is what fastbreak does.

RUN (Windows PowerShell):
    python --version              # must be 3.12 or higher
    pip install fastbreak pandas
    python pull_fastbreak.py

Outputs a handful of CSVs into whatever folder you run it from. Move them into
your data repo and push. If a call 403s or hangs, just re-run — stats.nba.com
throttles; the script caches and is safe to re-run.
"""

import asyncio
import sys
# Windows fix: fastbreak's DNS resolver (aiodns/pycares) only works on a Selector
# event loop, but Python 3.8+ defaults to Proactor on Windows -> "Could not contact
# DNS servers". Force the selector loop before any async work.
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
import pandas as pd
from fastbreak.clients import NBAClient
from fastbreak.endpoints import (
    GravityLeaders,
    LeverageLeaders,
    ShotQualityLeaders,
    LeagueHustleStatsPlayer,
    LeagueSeasonMatchups,
    SynergyPlaytypes,
)

SEASONS = ["2020-21", "2021-22", "2022-23", "2023-24"]   # 2024-25 already pulled

def yy(season: str) -> str:
    a, b = season.split("-")
    return a[-2:] + b[-2:]   # "2021-22" -> "2122" (repo naming)


def to_df(resp):
    """Find the first list-of-records field on the response and flatten to a DataFrame."""
    for val in vars(resp).values():
        if isinstance(val, list) and val and hasattr(val[0], "model_dump"):
            return pd.DataFrame([x.model_dump() for x in val])
    return pd.DataFrame([resp.model_dump()])


async def main(season):
    sfx = yy(season)
    async with NBAClient(cache_ttl=300) as client:
        # --- single-call leaderboards -------------------------------------
        # NOTE the arg-name split: some take season=, some take season_year=
        jobs = {
            "gravity":     GravityLeaders(season=season),
            "leverage":    LeverageLeaders(season_year=season),
            "shotquality": ShotQualityLeaders(season_year=season),
            "hustle":      LeagueHustleStatsPlayer(season=season, per_mode="PerGame"),
            "matchups":    LeagueSeasonMatchups(season=season),
        }
        for name, ep in jobs.items():
            try:
                r = await client.get(ep)
                df = to_df(r)
                df.to_csv(f"{name}_{sfx}.csv", index=False)
                print(f"OK  {name:12s} {df.shape}  -> {name}_{sfx}.csv")
            except Exception as e:
                print(f"!!  {name:12s} FAILED  {type(e).__name__}: {e}")

        # --- synergy play-types: one call per type, stacked into 2 files ---
        play_types = ["Isolation", "Transition", "Postup", "PRBallHandler",
                      "PRRollman", "Spotup", "Handoff", "Cut", "OffScreen",
                      "OffRebound", "Misc"]
        for grp in ("offensive", "defensive"):
            frames = []
            for pt in play_types:
                try:
                    r = await client.get(SynergyPlaytypes(
                        league_id="00", season_year=season,
                        season_type="Regular Season", per_mode="Totals",
                        player_or_team="P", play_type=pt, type_grouping=grp))
                    d = to_df(r)
                    d["play_type"] = pt
                    frames.append(d)
                    print(f"OK  synergy {grp:9s} {pt}")
                except Exception as e:
                    print(f"!!  synergy {grp} {pt} FAILED: {e}")
            if frames:
                out = f"synergy_{grp}_{sfx}.csv"
                pd.concat(frames, ignore_index=True).to_csv(out, index=False)
                print(f"--> wrote {out}")


async def run_all():
    for s in SEASONS:
        print(f"\n===== pulling {s} =====")
        await main(s)

if __name__ == "__main__":
    asyncio.run(run_all())
