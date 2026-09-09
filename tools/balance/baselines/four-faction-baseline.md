# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 10 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 95%, premium 4.5 vs 6.0 (n=20 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 597 s tracked per match, win 0% (n=20 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 6.1/min, Drift Health median 74 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 140/min vs field 167 — 84% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1224 (816–1500) |
| Commanders eliminated, of 3 needed | 2 (2–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 74 (70–78) |

## The Drift as seeded

| Species | Asked | Seeded (p10–p90) | Matches short |
| --- | --- | --- | --- |
| Ashgrazer | 16 | 12 (10–15) | 29 of 30 (97%) |
| Draymaw | 15 | 10 (7–12) | 30 of 30 (100%) |
| Sounder | 1 | 1 (1–1) | 0 of 30 |
| Rasp | 3 | 2 (0–3) | 21 of 30 (70%) |
| Lampfry | 6 | 4 (2–6) | 27 of 30 (90%) |
| Tetherjelly | 5 | 3 (2–4) | 28 of 30 (93%) |
| Hollow | 2 | 1 (1–2) | 21 of 30 (70%) |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Crystal/min | Biomass/min | Mean SIG | Tracked, s | Found enemy, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 20 | 0% | 236 | 1.3 | 2.8 | 39 | 597 | 30 | 0% | 18.2 | 100% | 4% |
| Commune | 30 | 20 | 0% | 173 | 0.9 | 0.9 | 38 | 636 | 20 | 0% | 35.5 | 48% | 2% |
| Directorate | 30 | 20 | 95% | 175 | 3.3 | 6.1 | 67 | 884 | 41 | 1% | 22.6 | 100% | 12% |
| Knights | 30 | 20 | 5% | 157 | 10.0 | 0.5 | 59 | 766 | 60 | 0% | 13.7 | 100% | 7% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 15.1 / 15.8 | 11.5 / 10.1 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 8.5 / 5.8 | 0.0 / 0.0 |
| Harvester | 9.2 / 9.8 | 12.6 / 13.5 | 6.0 / 4.0 | 10.1 / 9.1 |
| Chorister | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 1.8 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 2.2 |
| Spinner | 0.0 / 0.0 | 0.3 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.4 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.7 / 0.0 | 0.0 / 0.0 |
| Beacon | 3.4 / 3.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.5 / 2.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.4 / 0.8 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.4 |
| Broadside | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.3 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.1 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.7 / 3.6 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.1 / 3.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.7 / 0.6 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.1 | 1.0 | 1.1 |
| Sentinel Turret | 1.0 | 0.6 | 1.0 | 1.0 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.2 |
| Vent Tap | 0.8 | 0.0 | 0.6 | 0.7 |
| Slipway | 0.5 | 0.3 | 1.0 | 0.9 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
