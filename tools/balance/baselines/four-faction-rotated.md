# Four-faction baseline, seating rotated

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --rotate-seats --title 'Four-faction baseline, seating rotated' --out tools/balance/baselines/four-faction-rotated.md
```

120 matches on `ventfront-divide`, seeds 4000–4029. 71 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_4 seatings, pooled. Each navy played more than one spawn, so the per-faction column is about the doctrine rather than about the chair._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 57% vs parity 25%, bar 50% (n=49 decided, 4 seatings pooled) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 10% vs best rival 57%, premium 4.2 vs 3.5 (n=49 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 760 s tracked per match, win 2% (n=49 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 12.2/min, Drift Health median 70 (n=120) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 24 s, first blood 62 s (n=120) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (809–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 24 (20–26) |
| First blood, seconds | 62 (48–67) |
| Drift Health at the end | 70 (63–75) |

## The Drift as seeded

| Species | Asked | Seeded (p10–p90) | Matches short |
| --- | --- | --- | --- |
| Ashgrazer | 16 | 16 (16–16) | 0 of 120 |
| Draymaw | 15 | 15 (15–15) | 0 of 120 |
| Sounder | 1 | 1 (1–1) | 0 of 120 |
| Rasp | 3 | 3 (3–3) | 0 of 120 |
| Lampfry | 6 | 6 (6–6) | 0 of 120 |
| Tetherjelly | 5 | 5 (5–5) | 0 of 120 |
| Hollow | 2 | 2 (2–2) | 0 of 120 |

## Per faction

| Faction | Matches | Decided | Win rate | Nodules/min | Crystal/min | Biomass/min | Mean SIG | Tracked, s | Found enemy, s | Throttled down | Losses | Below the Shelf | Under the layer |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Consortium | 120 | 49 | 2% | 185 | 1.5 | 2.7 | 53 | 760 | 36 | 0% | 19.3 | 100% | 4% |
| Commune | 120 | 49 | 10% | 181 | 0.5 | 6.2 | 43 | 609 | 29 | 0% | 37.7 | 44% | 1% |
| Directorate | 120 | 49 | 57% | 171 | 2.3 | 12.2 | 58 | 778 | 40 | 1% | 27.9 | 100% | 11% |
| Knights | 120 | 49 | 31% | 151 | 6.5 | 1.1 | 57 | 756 | 47 | 0% | 15.0 | 100% | 8% |

## Per chair

| Slot | Matches | Decided | Win rate | Navies that sat here |
| --- | --- | --- | --- | --- |
| 0 | 120 | 49 | 29% | Consortium, Commune, Directorate, Knights |
| 1 | 120 | 49 | 12% | Consortium, Commune, Directorate, Knights |
| 2 | 120 | 49 | 43% | Consortium, Commune, Directorate, Knights |
| 3 | 120 | 49 | 16% | Consortium, Commune, Directorate, Knights |

_The spawn, not the navy. `--matchup` binds a faction to a spawn by its position in the list, so this column and the one above it are the two marginals of one table — and on `ventfront-divide` this is the bigger of them._

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 15.6 / 16.2 | 12.9 / 12.7 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 6.0 / 5.0 | 0.0 / 0.0 |
| Harvester | 10.6 / 10.7 | 13.8 / 13.9 | 7.7 / 7.0 | 10.3 / 9.2 |
| Chorister | 0.0 / 0.0 | 1.5 / 1.3 | 0.0 / 2.0 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.2 / 2.8 |
| Bulwark | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 1.0 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.5 / 0.2 |
| Freighter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.1 | 0.0 / 0.0 |
| Beacon | 3.4 / 3.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.5 / 2.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.5 / 1.1 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.4 |
| Broadside | 0.3 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.7 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.2 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.9 / 3.7 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.3 / 3.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.9 / 1.4 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.1 | 1.0 | 1.1 | 1.1 |
| Sentinel Turret | 1.0 | 0.4 | 0.7 | 0.8 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.1 |
| Vent Tap | 0.7 | 0.5 | 0.7 | 0.5 |
| Slipway | 0.7 | 0.2 | 0.6 | 0.5 |
| Bio-Reactor | 0.0 | 0.8 | 0.9 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
