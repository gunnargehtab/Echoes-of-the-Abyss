# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 13 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_One seating: every match dealt each navy the same spawn. A win rate here cannot separate the doctrine from the chair — see `baselines/seat-rotation.md`, and `--rotate-seats`._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 94% vs parity 25%, bar 50% (n=17 decided, one seating) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 94%, premium 4.1 vs 5.4 (n=17 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 611 s tracked per match, win 0% (n=17 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 15.9/min, Drift Health median 70 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 141/min vs field 172 — 82% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1287 (705–1500) |
| Commanders eliminated, of 3 needed | 2 (2–3) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 70 (65–76) |

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
| Consortium | 30 | 17 | 0% | 221 | 1.6 | 3.5 | 41 | 611 | 30 | 0% | 18.7 | 100% | 4% |
| Commune | 30 | 17 | 0% | 174 | 0.5 | 6.3 | 42 | 625 | 20 | 0% | 43.0 | 45% | 1% |
| Directorate | 30 | 17 | 94% | 174 | 3.3 | 15.9 | 68 | 883 | 41 | 0% | 22.9 | 100% | 15% |
| Knights | 30 | 17 | 6% | 164 | 7.2 | 1.0 | 56 | 736 | 60 | 0% | 15.1 | 100% | 7% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 19.5 / 20.2 | 9.3 / 8.9 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 9.8 / 6.8 | 0.0 / 0.0 |
| Harvester | 9.4 / 10.1 | 13.5 / 14.1 | 6.0 / 3.8 | 9.8 / 9.2 |
| Chorister | 0.0 / 0.0 | 2.3 / 2.2 | 0.0 / 1.8 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 2.8 |
| Spinner | 0.0 / 0.0 | 0.3 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.4 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.1 | 0.0 / 0.0 |
| Beacon | 3.1 / 3.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 3.1 / 3.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 2.1 / 1.4 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.5 |
| Broadside | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.5 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 2.0 / 4.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.0 / 2.9 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.5 / 1.3 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.0 | 1.0 | 1.0 |
| Sentinel Turret | 1.0 | 0.1 | 0.7 | 0.9 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.1 |
| Vent Tap | 0.9 | 0.0 | 1.0 | 0.5 |
| Slipway | 0.6 | 0.0 | 0.3 | 0.7 |
| Bio-Reactor | 0.0 | 0.7 | 1.0 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
