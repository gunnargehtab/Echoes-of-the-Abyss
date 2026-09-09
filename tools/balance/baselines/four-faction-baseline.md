# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 13 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 82% vs parity 25%, bar 50% (n=17 decided) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 6% vs best rival 82%, premium 5.1 vs 7.2 (n=17 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 514 s tracked per match, win 0% (n=17 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 13.1/min, Drift Health median 72 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 131/min vs field 188 — 70% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1428 (747–1500) |
| Commanders eliminated, of 3 needed | 2 (2–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 72 (65–76) |

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
| Consortium | 30 | 17 | 0% | 264 | 1.5 | 2.6 | 37 | 514 | 30 | 0% | 18.7 | 100% | 4% |
| Commune | 30 | 17 | 6% | 180 | 0.6 | 4.8 | 36 | 585 | 20 | 0% | 37.3 | 46% | 1% |
| Directorate | 30 | 17 | 82% | 181 | 3.5 | 13.1 | 67 | 890 | 41 | 0% | 24.6 | 100% | 14% |
| Knights | 30 | 17 | 12% | 155 | 9.5 | 0.7 | 66 | 820 | 60 | 0% | 13.1 | 100% | 7% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 16.5 / 17.0 | 12.1 / 10.6 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 8.8 / 6.9 | 0.0 / 0.0 |
| Harvester | 9.0 / 9.9 | 11.9 / 12.7 | 5.9 / 3.9 | 10.0 / 8.0 |
| Chorister | 0.0 / 0.0 | 1.3 / 1.3 | 0.0 / 2.0 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 2.4 |
| Spinner | 0.0 / 0.0 | 0.4 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.4 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.0 | 0.0 / 0.0 |
| Beacon | 3.6 / 3.6 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.8 / 2.7 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 2.0 / 1.2 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.2 |
| Broadside | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.5 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.7 / 3.6 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.0 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.4 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.3 / 1.1 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.0 | 1.0 | 1.0 |
| Sentinel Turret | 1.0 | 0.1 | 0.4 | 0.9 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.2 |
| Vent Tap | 0.9 | 0.1 | 0.8 | 0.8 |
| Slipway | 0.5 | 0.0 | 0.5 | 0.9 |
| Bio-Reactor | 0.0 | 0.6 | 1.1 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
