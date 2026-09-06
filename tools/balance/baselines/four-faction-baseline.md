# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 6 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 13% vs best rival 58%, premium 3.4 vs 8.5 (n=24 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 354 s tracked per match, win 0% (n=24 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.4/min, Drift Health median 17 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 139/min vs field 180 — 77% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1046 (793–1500) |
| Commanders eliminated, of 3 needed | 2 (2–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (26–26) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 17 (11–29) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Found enemy, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 24 | 0% | 213 | 0.2 | 25 | 354 | 30 | 0% | 15.8 | 100% | 1% |
| Commune | 30 | 24 | 13% | 176 | 0.1 | 52 | 664 | 26 | 2% | 40.0 | 49% | 1% |
| Directorate | 30 | 24 | 58% | 203 | 0.4 | 61 | 840 | 46 | 0% | 32.7 | 100% | 7% |
| Knights | 30 | 24 | 29% | 153 | 0.1 | 57 | 706 | 60 | 0% | 16.6 | 100% | 10% |

## Losses per match, by hull

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 1.0 | 25.0 | 22.1 | 1.0 |
| Corvette | 3.9 | 2.2 | 4.8 | 7.4 |
| Harvester | 9.0 | 11.2 | 5.7 | 7.7 |
| Tender | 0.0 | 0.0 | 0.0 | 0.0 |
| Spinner | 0.0 | 0.1 | 0.0 | 0.0 |
| Sower | 0.0 | 0.0 | 0.0 | 0.0 |
| Reciter | 0.0 | 0.0 | 0.0 | 0.1 |
| Beacon | 1.9 | 0.0 | 0.0 | 0.0 |
| Glider | 0.0 | 1.3 | 0.0 | 0.0 |
| Acolyte | 0.0 | 0.0 | 0.1 | 0.0 |
| Herald | 0.0 | 0.0 | 0.0 | 0.3 |
| Weaver | 0.0 | 0.2 | 0.0 | 0.0 |
| Lance | 0.0 | 0.0 | 0.0 | 0.0 |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
