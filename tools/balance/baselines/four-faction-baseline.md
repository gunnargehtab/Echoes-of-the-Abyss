# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

30 matches on `ventfront-divide`, seeds 4000–4029. 16 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_One seating: every match dealt each navy the same spawn. A win rate here cannot separate the doctrine from the chair — see `baselines/seat-rotation.md`, and `--rotate-seats`._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 79% vs parity 25%, bar 50% (n=14 decided, one seating) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 14% vs best rival 79%, premium 5.4 vs 6.8 (n=14 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 603 s tracked per match, win 0% (n=14 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 15.4/min, Drift Health median 68 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (785–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 68 (61–76) |

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
| Consortium | 30 | 14 | 0% | 219 | 1.7 | 3.3 | 32 | 603 | 30 | 0% | 18.4 | 100% | 4% |
| Commune | 30 | 14 | 14% | 173 | 0.6 | 7.1 | 32 | 690 | 20 | 0% | 43.6 | 47% | 1% |
| Directorate | 30 | 14 | 79% | 165 | 3.0 | 15.4 | 50 | 941 | 41 | 0% | 24.7 | 100% | 15% |
| Knights | 30 | 14 | 7% | 155 | 7.9 | 1.1 | 53 | 804 | 60 | 0% | 15.8 | 100% | 8% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 20.1 / 20.9 | 10.3 / 9.3 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 9.5 / 7.3 | 0.0 / 0.0 |
| Harvester | 9.3 / 10.0 | 13.7 / 13.6 | 6.0 / 4.4 | 10.3 / 9.4 |
| Chorister | 0.0 / 0.0 | 3.0 / 2.7 | 0.0 / 1.8 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.1 / 2.9 |
| Spinner | 0.0 / 0.0 | 0.5 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.7 / 0.4 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.2 | 0.0 / 0.0 |
| Beacon | 3.1 / 3.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 3.3 / 3.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 2.2 / 1.6 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.4 |
| Broadside | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.7 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 |
| Furnace | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.9 / 3.9 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.0 / 2.8 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.2 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.9 / 1.7 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.0 | 1.0 | 1.0 |
| Sentinel Turret | 1.0 | 0.1 | 0.6 | 0.9 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.1 |
| Vent Tap | 0.9 | 0.1 | 0.9 | 0.5 |
| Slipway | 0.5 | 0.0 | 0.5 | 0.7 |
| Bio-Reactor | 0.0 | 0.8 | 1.0 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 33201 | 50020 | 63036 | 53518 |
| Blocked: not escorted | 15557 (47%) | 7743 (15%) | 21604 (34%) | 38847 (73%) |
| Blocked: no free yard | 11424 (34%) | 4565 (9%) | 34162 (54%) | 7573 (14%) |
| Blocked: cannot afford | 2673 (8%) | 16150 (32%) | 6750 (11%) | 4713 (9%) |
| Already has one | 3543 (11%) | 21541 (43%) | 518 (1%) | 2382 (4%) |
| **Bought** | 4 (0%) | 21 (0%) | 2 (0%) | 3 (0%) |

_The five reasons partition the want: every observation that reaches it increments exactly one, so the five sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 620 | 600 | 600 | 610 |
| Peak in any match | 690 | 600 | 650 | 766 |
| Best peak above the opening 600 | 90 | 0 | 50 | 166 |
| Matches with a Slipway standing | 16 | 0 | 14 | 20 |
| Peak with the yard up, median | 245 | — | 150 | 320 |
| Peak with the yard up, best | 440 | — | 380 | 766 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 32.5 | 54.7 | 65.2 | 59.6 |
| Nodules delivered a match | 2249 | 2715 | 3238 | 2951 |
| Nodules banked a match | 2242 | 2706 | 3223 | 2546 |
| Mean hold delivered | 69.1 | 49.6 | 49.7 | 49.5 |
| Nodules lost in transit a match | 160 | 197 | 98 | 111 |
| Lost as a share of what was cut | 7% | 7% | 3% | 4% |
| Harvester-time laden | 28% | 36% | 37% | 25% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) plus the tithe (`HADRON.TITHE_PER_S` a second), which pushes it back up. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
