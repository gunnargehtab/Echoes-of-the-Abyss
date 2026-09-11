# Four-faction baseline, seating rotated

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --rotate-seats --title 'Four-faction baseline, seating rotated' --out tools/balance/baselines/four-faction-rotated.md
```

120 matches on `ventfront-divide`, seeds 4000–4029. 67 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_4 seatings, pooled. Each navy played more than one spawn, so the per-faction column is about the doctrine rather than about the chair._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 72% vs parity 25%, bar 50% (n=53 decided, 4 seatings pooled) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 4% vs best rival 72%, premium 4.7 vs 3.6 (n=53 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 700 s tracked per match, win 6% (n=53 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 12.3/min, Drift Health median 70 (n=120) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 24 s, first blood 62 s (n=120) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (705–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 24 (20–26) |
| First blood, seconds | 62 (48–67) |
| Drift Health at the end | 70 (64–76) |

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
| Consortium | 120 | 53 | 6% | 184 | 1.6 | 2.9 | 51 | 700 | 41 | 0% | 17.8 | 100% | 4% |
| Commune | 120 | 53 | 4% | 194 | 0.8 | 6.6 | 42 | 580 | 29 | 0% | 36.8 | 45% | 1% |
| Directorate | 120 | 53 | 72% | 177 | 1.8 | 12.3 | 58 | 743 | 40 | 2% | 26.5 | 100% | 10% |
| Knights | 120 | 53 | 19% | 147 | 6.2 | 1.0 | 57 | 761 | 46 | 0% | 15.3 | 100% | 7% |

## Per chair

| Slot | Matches | Decided | Win rate | Navies that sat here |
| --- | --- | --- | --- | --- |
| 0 | 120 | 53 | 40% | Consortium, Commune, Directorate, Knights |
| 1 | 120 | 53 | 8% | Consortium, Commune, Directorate, Knights |
| 2 | 120 | 53 | 42% | Consortium, Commune, Directorate, Knights |
| 3 | 120 | 53 | 11% | Consortium, Commune, Directorate, Knights |

_The spawn, not the navy. `--matchup` binds a faction to a spawn by its position in the list, so this column and the one above it are the two marginals of one table — and on `ventfront-divide` this is the bigger of them._

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 14.5 / 15.3 | 12.1 / 11.8 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 6.5 / 5.1 | 0.0 / 0.0 |
| Harvester | 9.3 / 9.4 | 13.4 / 13.6 | 7.7 / 6.4 | 10.2 / 9.2 |
| Chorister | 0.0 / 0.0 | 1.7 / 1.5 | 0.0 / 1.9 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.3 / 3.0 |
| Bulwark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 1.0 / 0.5 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.3 |
| Freighter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.1 | 0.0 / 0.0 |
| Beacon | 3.1 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.5 / 2.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.5 / 1.1 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.5 |
| Broadside | 0.3 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.7 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 |
| Furnace | 0.2 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Tocsin | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.7 / 3.6 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.2 / 3.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.5 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.8 / 1.3 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.0 | 1.1 | 1.1 |
| Sentinel Turret | 1.0 | 0.4 | 0.6 | 0.8 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.1 |
| Vent Tap | 0.6 | 0.4 | 0.7 | 0.5 |
| Slipway | 0.8 | 0.2 | 0.5 | 0.5 |
| Bio-Reactor | 0.0 | 0.8 | 0.8 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
