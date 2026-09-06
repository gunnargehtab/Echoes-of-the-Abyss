# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 6 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 4% vs best rival 38%, premium 4.3 vs 5.0 (n=24 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 556 s tracked per match, win 21% (n=24 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.5/min, Drift Health median 21 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 144/min vs field 189 — 76% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1121 (861–1500) |
| Commanders eliminated, of 3 needed | 2 (2–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (26–26) |
| First blood, seconds | 48 (48–49) |
| Drift Health at the end | 21 (15–30) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 24 | 21% | 187 | 0.4 | 37 | 556 | 0% | 19.8 | 100% | 0% |
| Commune | 30 | 24 | 4% | 203 | 0.1 | 47 | 648 | 4% | 44.8 | 50% | 0% |
| Directorate | 30 | 24 | 38% | 213 | 0.5 | 52 | 727 | 0% | 45.9 | 100% | 7% |
| Knights | 30 | 24 | 38% | 163 | 0.2 | 61 | 796 | 0% | 22.5 | 100% | 7% |

## Losses per match, by hull

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 1.0 | 31.4 | 33.9 | 1.0 |
| Corvette | 11.9 | 3.3 | 6.1 | 15.3 |
| Cruiser | 0.0 | 0.0 | 0.0 | 0.2 |
| Harvester | 6.7 | 9.6 | 5.9 | 6.1 |
| Spinner | 0.0 | 0.5 | 0.0 | 0.0 |
| Freighter | 0.3 | 0.0 | 0.0 | 0.0 |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
