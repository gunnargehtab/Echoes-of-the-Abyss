# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 10 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 75% vs parity 25%, bar 50% (n=20 decided) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 10% vs best rival 75%, premium 4.1 vs 5.7 (n=20 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 566 s tracked per match, win 0% (n=20 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 16.5/min, Drift Health median 69 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 134/min vs field 170 — 78% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1130 (632–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 69 (64–75) |

## The Drift as seeded

| Species | Asked | Seeded (p10–p90) | Matches short |
| --- | --- | --- | --- |
| Ashgrazer | 16 | 16 (16–16) | 0 of 30 |
| Draymaw | 15 | 15 (15–15) | 0 of 30 |
| Sounder | 1 | 1 (1–1) | 0 of 30 |
| Rasp | 3 | 3 (3–3) | 0 of 30 |
| Lampfry | 6 | 6 (6–6) | 0 of 30 |
| Tetherjelly | 5 | 5 (5–5) | 0 of 30 |
| Hollow | 2 | 2 (2–2) | 0 of 30 |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Crystal/min | Biomass/min | Mean SIG | Tracked, s | Found enemy, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 30 | 20 | 0% | 240 | 1.7 | 3.2 | 42 | 566 | 30 | 0% | 19.1 | 100% | 4% |
| Commune | 30 | 20 | 10% | 163 | 0.3 | 4.4 | 40 | 613 | 20 | 0% | 38.9 | 46% | 1% |
| Directorate | 30 | 20 | 75% | 185 | 3.2 | 16.5 | 67 | 881 | 41 | 0% | 24.4 | 100% | 15% |
| Knights | 30 | 20 | 15% | 164 | 10.1 | 1.0 | 63 | 791 | 60 | 0% | 13.2 | 100% | 8% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 17.8 / 18.2 | 12.1 / 10.8 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 7.5 / 5.6 | 0.0 / 0.0 |
| Harvester | 9.3 / 10.1 | 13.5 / 13.6 | 5.9 / 4.2 | 9.7 / 8.2 |
| Chorister | 0.0 / 0.0 | 1.3 / 1.1 | 0.0 / 2.0 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 2.3 |
| Spinner | 0.0 / 0.0 | 0.4 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.3 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.1 | 0.0 / 0.0 |
| Beacon | 3.5 / 3.5 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.8 / 2.7 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 2.2 / 1.6 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.3 |
| Broadside | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.4 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 2.1 / 4.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.1 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.4 / 1.1 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.1 | 1.0 | 1.1 | 1.1 |
| Sentinel Turret | 1.0 | 0.1 | 0.7 | 0.9 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.2 |
| Vent Tap | 0.9 | 0.0 | 0.9 | 0.6 |
| Slipway | 0.5 | 0.0 | 0.4 | 0.8 |
| Bio-Reactor | 0.0 | 0.5 | 1.1 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
