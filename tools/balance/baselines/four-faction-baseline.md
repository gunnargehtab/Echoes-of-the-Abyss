# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 7 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 9% vs best rival 61%, premium 3.5 vs 6.2 (n=23 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 452 s tracked per match, win 9% (n=23 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 2.8/min, Drift Health median 75 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 139/min vs field 175 — 79% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1172 (797–1500) |
| Commanders eliminated, of 3 needed | 2 (2–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 75 (72–79) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Crystal/min | Biomass/min | Mean SIG | Tracked, s | Found enemy, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 23 | 9% | 207 | 0.6 | 2.3 | 33 | 452 | 30 | 0% | 15.9 | 100% | 2% |
| Commune | 30 | 23 | 9% | 170 | 0.6 | 0.4 | 49 | 663 | 20 | 5% | 37.3 | 44% | 1% |
| Directorate | 30 | 23 | 61% | 196 | 2.2 | 2.8 | 63 | 876 | 41 | 0% | 35.6 | 100% | 9% |
| Knights | 30 | 23 | 22% | 163 | 8.5 | 1.0 | 62 | 819 | 60 | 0% | 16.2 | 100% | 9% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 20.9 / 21.5 | 28.3 / 26.0 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 2.4 / 2.0 | 5.9 / 4.9 |
| Harvester | 7.5 / 8.3 | 11.5 / 12.0 | 7.1 / 5.3 | 9.7 / 8.0 |
| Chorister | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 2.0 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 1.8 |
| Tender | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 0.3 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Precentor | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.2 |
| Freighter | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.0 | 0.0 / 0.0 |
| Beacon | 2.4 / 2.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 1.6 / 1.5 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 0.8 / 0.4 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.3 |
| Weaver | 0.0 / 0.0 | 0.3 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 2.4 / 4.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 0.3 / 2.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.1 | 1.0 | 1.1 |
| Sentinel Turret | 1.0 | 0.5 | 0.8 | 0.9 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.2 |
| Vent Tap | 0.4 | 0.1 | 0.4 | 0.6 |
| Slipway | 0.3 | 0.4 | 1.0 | 0.6 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
