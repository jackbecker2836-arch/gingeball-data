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

SEASON = "2024-25"   # change to "2025-26" etc. for other seasons


def to_df(resp):
    """Find the first list-of-records field on the response and flatten to a DataFrame."""
    for val in vars(resp).values():
        if isinstance(val, list) and val and hasattr(val[0], "model_dump"):
            return pd.DataFrame([x.model_dump() for x in val])
    return pd.DataFrame([resp.model_dump()])


async def main():
    async with NBAClient(cache_ttl=300) as client:
        # --- single-call leaderboards -------------------------------------
        # NOTE the arg-name split: some take season=, some take season_year=
        jobs = {
            "gravity":     GravityLeaders(season=SEASON),
            "leverage":    LeverageLeaders(season_year=SEASON),
            "shotquality": ShotQualityLeaders(season_year=SEASON),
            "hustle":      LeagueHustleStatsPlayer(season=SEASON, per_mode="PerGame"),
            "matchups":    LeagueSeasonMatchups(season=SEASON),
        }
        for name, ep in jobs.items():
            try:
                r = await client.get(ep)
                df = to_df(r)
                df.to_csv(f"{name}_2425.csv", index=False)
                print(f"OK  {name:12s} {df.shape}  -> {name}_2425.csv")
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
                        league_id="00", season_year=SEASON,
                        season_type="Regular Season", per_mode="Totals",
                        player_or_team="P", play_type=pt, type_grouping=grp))
                    d = to_df(r)
                    d["play_type"] = pt
                    frames.append(d)
                    print(f"OK  synergy {grp:9s} {pt}")
                except Exception as e:
                    print(f"!!  synergy {grp} {pt} FAILED: {e}")
            if frames:
                out = f"synergy_{grp}_2425.csv"
                pd.concat(frames, ignore_index=True).to_csv(out, index=False)
                print(f"--> wrote {out}")


if __name__ == "__main__":
    asyncio.run(main())
