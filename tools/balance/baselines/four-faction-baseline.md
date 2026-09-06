# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 8 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 5% vs best rival 59%, premium 3.2 vs 7.4 (n=22 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 394 s tracked per match, win 0% (n=22 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 0.3/min, Drift Health median 18 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 146/min vs field 177 — 82% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 26 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1150 (792–1500) |
| Commanders eliminated, of 3 needed | 2 (2–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 26 (26–26) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 18 (12–29) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Biomass/min | Mean SIG | Tracked, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 22 | 0% | 186 | 0.2 | 25 | 394 | 0% | 15.4 | 100% | 2% |
| Commune | 30 | 22 | 5% | 172 | 0.1 | 54 | 720 | 3% | 44.3 | 51% | 2% |
| Directorate | 30 | 22 | 59% | 201 | 0.3 | 62 | 862 | 0% | 35.6 | 100% | 6% |
| Knights | 30 | 22 | 36% | 157 | 0.1 | 62 | 795 | 0% | 18.2 | 100% | 10% |

## Losses per match, by hull

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 1.0 | 29.7 | 25.3 | 1.0 |
| Corvette | 5.6 | 2.4 | 4.8 | 9.1 |
| Cruiser | 0.1 | 0.0 | 0.0 | 0.0 |
| Harvester | 8.5 | 11.9 | 5.4 | 8.0 |
| Tender | 0.1 | 0.0 | 0.0 | 0.0 |
| Spinner | 0.0 | 0.2 | 0.0 | 0.0 |
| Reciter | 0.0 | 0.0 | 0.0 | 0.0 |
| Freighter | 0.1 | 0.0 | 0.0 | 0.0 |

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
