# Duel matrix

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --duel-matrix --matches 10 --seed 4000 --max-minutes 25 --title 'Duel matrix' --out tools/balance/baselines/duel-matrix.md
```

120 matches on `ventfront-divide`, seeds 4000–4009. 10 ended without a winner inside the time budget, on a median 0 of the 1 elimination a win needs.

_12 seatings over 6 rosters, pooled. Each navy played more than one spawn *and* more than one opponent, so the per-faction column is about the doctrine rather than about the chair or the draw._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 82% vs parity 25%, bar 50% (n=57 decided, 12 seatings pooled) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 77% vs best rival 82%, premium 6.4 vs 5.6 (n=110 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 516 s tracked per match, win 15% (n=110 decided) | **breached** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 9.3/min, Drift Health median 83 (n=120) | **breached** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 154/min vs field 224 — 68% (n=31 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 24 s, first blood 59 s (n=120) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 469 (300–1274) |
| Commanders eliminated, of 1 needed | 0 (0–0) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 24 (20–26) |
| First blood, seconds | 59 (48–67) |
| Drift Health at the end | 83 (77–85) |

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
| Consortium | 60 | 54 | 15% | 211 | 1.6 | 3.2 | 62 | 516 | 33 | 0% | 15.1 | 100% | 4% |
| Commune | 60 | 56 | 77% | 261 | 0.7 | 5.0 | 41 | 378 | 23 | 0% | 21.1 | 46% | 2% |
| Directorate | 60 | 57 | 82% | 268 | 1.1 | 9.3 | 48 | 477 | 27 | 0% | 18.4 | 100% | 4% |
| Knights | 60 | 53 | 23% | 155 | 6.9 | 0.8 | 61 | 504 | 32 | 0% | 11.5 | 100% | 6% |

## Per chair

| Slot | Matches | Decided | Win rate | Navies that sat here |
| --- | --- | --- | --- | --- |
| 0 | 120 | 110 | 48% | Consortium, Commune, Directorate, Knights |
| 1 | 120 | 110 | 52% | Consortium, Commune, Directorate, Knights |

_The spawn, not the navy. `--matchup` binds a faction to a spawn by its position in the list, so this column and the one above it are the two marginals of one table — and on `ventfront-divide` this is the bigger of them._

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 10.9 / 8.7 | 12.4 / 10.0 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 3.6 / 2.0 | 0.0 / 0.0 |
| Harvester | 8.3 / 7.4 | 10.8 / 8.6 | 6.9 / 3.9 | 8.3 / 6.1 |
| Chorister | 0.0 / 0.0 | 0.7 / 0.4 | 0.0 / 1.7 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.5 / 3.2 |
| Bulwark | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 0.8 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.1 |
| Freighter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 0.0 | 0.0 / 0.0 |
| Beacon | 3.2 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 1.5 / 0.7 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.2 / 0.8 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.1 |
| Broadside | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.6 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.6 / 3.5 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.4 / 2.5 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.4 / 1.0 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.1 | 1.0 | 1.0 | 1.0 |
| Sentinel Turret | 1.0 | 0.4 | 0.3 | 0.6 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.1 |
| Vent Tap | 0.6 | 0.4 | 0.5 | 0.1 |
| Slipway | 0.4 | 0.1 | 0.2 | 0.2 |
| Bio-Reactor | 0.0 | 0.6 | 0.9 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 600 | 600 | 600 | 600 |
| Peak in any match | 700 | 645 | 770 | 775 |
| Best peak above the opening 600 | 100 | 45 | 170 | 175 |
| Matches with a Slipway standing | 23 | 3 | 13 | 11 |
| Peak with the yard up, median | 330 | 60 | 250 | 261 |
| Peak with the yard up, best | 700 | 65 | 770 | 775 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
