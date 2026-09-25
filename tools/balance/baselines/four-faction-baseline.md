# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

> **Refreshed on 25 Sept 2026 because a mechanic changed, not to reach a target** (#706).
> Same command, seeds and cap. No weight, price or TUNABLE moved. The change: the commander
> saves for a Refinery, Vent Tap or turret it wants and cannot afford, where it used to let
> that want bar the rung and save for nothing (`docs/roster-plan.md` §4, "The Commune's rung
> was locked, not unaffordable").
>
> What it was for: the Commune raises a Slipway in 15 matches of 30, from none. Slipway
> hulls built across the four navies go from 1.0 a match to 1.9.
>
> What it cost, recorded and left: 6 matches are decided, not 18, and the median match runs
> to the 1500 s cap. Four rails that read **held** or **breached** now read **no data** —
> one-navy (was breached), quiet economies, loud economies (n=6, needs 10), and Knights-starve
> (no longer-than-median match). Win rates over the six: the Directorate 83%, the Commune 17%,
> the Consortium and the Knights 0%.

30 matches on `ventfront-divide`, seeds 4000–4029. 24 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_One seating: every match dealt each navy the same spawn. A win rate here cannot separate the doctrine from the chair — see `baselines/seat-rotation.md`, and `--rotate-seats`._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 83% vs parity 25%, bar 50% (n=6 decided, needs 10, one seating) | **no data** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 17% vs best rival 83%, premium 4.5 vs 6.4 (n=6 decided, needs 10) | **no data** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 689 s tracked per match, win 0% (n=6 decided, needs 10) | **no data** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 10.7/min, Drift Health median 64 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (1142–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 64 (59–70) |

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
| Consortium | 30 | 6 | 0% | 207 | 1.5 | 3.8 | 32 | 689 | 30 | 0% | 16.2 | 100% | 4% |
| Commune | 30 | 6 | 17% | 143 | 0.3 | 9.3 | 32 | 814 | 20 | 0% | 33.2 | 60% | 1% |
| Directorate | 30 | 6 | 83% | 146 | 2.5 | 10.7 | 44 | 966 | 41 | 0% | 24.5 | 100% | 15% |
| Knights | 30 | 6 | 0% | 138 | 10.4 | 0.5 | 49 | 825 | 60 | 0% | 14.6 | 100% | 7% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 10.8 / 11.2 | 14.0 / 12.7 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 2.9 / 2.5 | 0.0 / 0.0 |
| Harvester | 8.5 / 9.1 | 14.7 / 13.7 | 6.0 / 5.5 | 11.8 / 10.2 |
| Chorister | 0.0 / 0.0 | 3.7 / 3.6 | 0.0 / 1.9 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 2.2 |
| Bulwark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 0.2 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Dredge | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.7 / 0.4 |
| Freighter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.8 / 0.1 | 0.0 / 0.0 |
| Beacon | 1.9 / 1.9 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.4 / 2.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 2.1 / 1.5 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.3 |
| Broadside | 0.2 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.2 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.4 / 0.3 | 0.0 / 0.0 |
| Furnace | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.3 / 3.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 0.5 / 2.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.5 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.1 | 1.0 | 1.2 |
| Sentinel Turret | 1.0 | 0.8 | 1.0 | 0.9 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.4 |
| Vent Tap | 1.2 | 1.0 | 1.2 | 0.9 |
| Slipway | 0.7 | 0.5 | 1.0 | 1.0 |
| Bio-Reactor | 0.0 | 1.0 | 1.1 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 37555 | 62965 | 67480 | 61739 |
| Blocked: not escorted | 18086 (48%) | 35305 (56%) | 31079 (46%) | 57045 (92%) |
| Blocked: no free yard | 9642 (26%) | 3803 (6%) | 10849 (16%) | 212 (0%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 5525 (15%) | 17545 (28%) | 17130 (25%) | 4482 (7%) |
| Already has one | 4296 (11%) | 6306 (10%) | 8410 (12%) | 0 (0%) |
| **Bought** | 6 (0%) | 6 (0%) | 12 (0%) | 0 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 37536 | 62951 | 67464 | 61721 |
| Blocked: not escorted | 20836 (56%) | 40046 (64%) | 31987 (47%) | 57029 (92%) |
| Blocked: no free yard | 9800 (26%) | 19819 (31%) | 10849 (16%) | 212 (0%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 605 (1%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 3086 (5%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 6900 (18%) | 0 (0%) | 24023 (36%) | 4480 (7%) |
| Already has one | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **Bought** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 630 | 600 | 630 | 677 |
| Peak in any match | 740 | 660 | 640 | 775 |
| Best peak above the opening 600 | 140 | 60 | 40 | 175 |
| Matches with a Slipway standing | 20 | 15 | 29 | 30 |
| Peak with the yard up, median | 420 | 175 | 300 | 677 |
| Peak with the yard up, best | 740 | 410 | 520 | 775 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 34.6 | 58.6 | 63.9 | 61.2 |
| Nodules delivered a match | 2396 | 2915 | 3175 | 3025 |
| Nodules banked a match | 2389 | 2907 | 3168 | 2746 |
| Mean hold delivered | 69.2 | 49.8 | 49.7 | 49.4 |
| Nodules lost in transit a match | 129 | 194 | 135 | 98 |
| Lost as a share of what was cut | 5% | 6% | 4% | 3% |
| Harvester-time laden | 27% | 35% | 37% | 20% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
