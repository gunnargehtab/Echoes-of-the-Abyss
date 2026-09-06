# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 8 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 5% vs best rival 64%, premium 3.3 vs 6.6 (n=22 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 436 s tracked per match, win 5% (n=22 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.5/min, Drift Health median 17 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 142/min vs field 161 — 88% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1279 (793–1500) |
| Commanders eliminated, of 3 needed | 2 (2–3) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (26–26) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 17 (9–29) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Found enemy, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 22 | 5% | 195 | 0.3 | 29 | 436 | 30 | 0% | 17.2 | 100% | 2% |
| Commune | 30 | 22 | 5% | 167 | 0.1 | 51 | 695 | 26 | 2% | 39.0 | 52% | 2% |
| Directorate | 30 | 22 | 64% | 192 | 0.5 | 63 | 874 | 46 | 0% | 35.8 | 100% | 6% |
| Knights | 30 | 22 | 27% | 155 | 0.1 | 58 | 769 | 60 | 0% | 17.0 | 100% | 9% |

## Losses per match, by hull

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 1.0 | 24.7 | 24.7 | 1.0 |
| Corvette | 4.8 | 2.3 | 5.1 | 7.7 |
| Cruiser | 0.0 | 0.0 | 0.0 | 0.0 |
| Harvester | 8.8 | 10.3 | 5.8 | 8.0 |
| Bulwark | 0.0 | 0.0 | 0.0 | 0.0 |
| Spinner | 0.0 | 0.2 | 0.0 | 0.0 |
| Sower | 0.0 | 0.1 | 0.0 | 0.0 |
| Reciter | 0.0 | 0.0 | 0.0 | 0.0 |
| Freighter | 0.1 | 0.0 | 0.0 | 0.0 |
| Beacon | 2.4 | 0.0 | 0.0 | 0.0 |
| Glider | 0.0 | 1.5 | 0.0 | 0.0 |
| Acolyte | 0.0 | 0.0 | 0.1 | 0.0 |
| Herald | 0.0 | 0.0 | 0.0 | 0.3 |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
