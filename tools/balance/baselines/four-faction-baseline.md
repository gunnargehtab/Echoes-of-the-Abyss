# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 16 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 86%, premium 4.4 vs 6.3 (n=14 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 608 s tracked per match, win 0% (n=14 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 6.9/min, Drift Health median 72 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (950–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 72 (67–76) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Crystal/min | Biomass/min | Mean SIG | Tracked, s | Found enemy, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 14 | 0% | 230 | 1.5 | 2.8 | 37 | 608 | 30 | 0% | 19.0 | 100% | 6% |
| Commune | 30 | 14 | 0% | 180 | 1.1 | 0.3 | 41 | 759 | 20 | 0% | 40.3 | 52% | 2% |
| Directorate | 30 | 14 | 86% | 159 | 3.2 | 6.9 | 67 | 1022 | 41 | 0% | 27.2 | 100% | 11% |
| Knights | 30 | 14 | 14% | 145 | 9.8 | 0.6 | 61 | 881 | 60 | 0% | 14.7 | 100% | 7% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 17.0 / 17.8 | 14.5 / 13.1 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 8.4 / 6.4 | 0.0 / 0.0 |
| Harvester | 8.9 / 9.7 | 15.5 / 15.0 | 6.3 / 4.8 | 10.5 / 9.0 |
| Chorister | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 1.9 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.2 / 2.8 |
| Spinner | 0.0 / 0.0 | 0.5 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.7 / 0.5 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.1 | 0.0 / 0.0 |
| Beacon | 3.8 / 3.8 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 3.4 / 3.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.6 / 0.9 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.3 |
| Broadside | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.6 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Caisson | 2.1 / 4.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.5 / 3.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.5 / 0.5 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.3 / 1.1 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.0 | 1.0 | 1.0 |
| Sentinel Turret | 1.0 | 0.8 | 1.0 | 0.9 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.2 |
| Vent Tap | 0.9 | 0.0 | 0.5 | 0.7 |
| Slipway | 0.6 | 0.5 | 1.0 | 0.7 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
