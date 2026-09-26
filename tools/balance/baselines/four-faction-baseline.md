# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

> **Refreshed on 25 Sept 2026 because a mechanic changed, not to reach a target** (#706).
> Same command, seeds and cap, run from `81539f9`; the before figures are the previous file,
> which the same command at `1bf8280` reproduces. No weight, price or TUNABLE moved. The
> change: the commander saves for a Refinery, Vent Tap or turret it wants and cannot afford,
> where it used to let that want bar the rung and save for nothing (`docs/roster-plan.md` §4,
> "The Commune's rung was locked, not unaffordable").
>
> What it was for: the Commune raises a Slipway in 15 matches of 30, from none. Slipway
> hulls built across the four navies go from 1.0 a match to 1.9.
>
> What it cost, recorded and left: 6 matches are decided, not 18, and the median match runs
> to the 1500 s cap. Four rails that read **held** or **breached** now read **no data** —
> one-navy (was breached), quiet economies, loud economies (n=6, needs 10), and Knights-starve
> (no longer-than-median match). Win rates over the six: the Directorate 83%, the Commune 17%,
> the Consortium and the Knights 0%.
>
> **One row added on 26 Sept 2026, and nothing refreshed** (#915). The same command, run
> from `6db5600`, the first commit whose footnote this file carries, reproduces every line
> below these notes byte for byte. The row counts the observations a gate in front of the
> purse shut while the purse already held the deck's price.
>
> **Refreshed on 26 Sept 2026 because a mechanic changed, not to reach a target** (#946).
> Same command, seeds and cap, run from `956359c`; the before figures are the previous file,
> which the same command at `2b5836d` reproduces, so the notes above describe the file before
> this refresh. No weight, price or TUNABLE moved. The change: while the army masses, the
> commander recalls every hull away from the rally, where it used to leave the rest on their
> last order once one hull had arrived — most often an attack still chasing
> (`docs/tech-stack.md`, "The skirmish AI").
>
> What it moved, recorded and left: 18 matches are decided, not 6, and the median match runs
> 1462 s, not 1500. Four rails that read **no data** now read a verdict. One-navy is
> **breached** (the Directorate 72%, n=18), recorded and left as `docs/economy.md` §9 says;
> quiet economies, loud economies and Knights-starve read **held**. Win rates over the
> eighteen: the Directorate 72%, the Knights 17%, the Consortium 11%, the Commune 0%.

30 matches on `ventfront-divide`, seeds 4000–4029. 12 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_One seating: every match dealt each navy the same spawn. A win rate here cannot separate the doctrine from the chair — see `baselines/seat-rotation.md`, and `--rotate-seats`._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 72% vs parity 25%, bar 50% (n=18 decided, one seating) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 72%, premium 5.5 vs 4.7 (n=18 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 732 s tracked per match, win 11% (n=18 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 11.3/min, Drift Health median 66 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 126/min vs field 146 — 86% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1462 (950–1500) |
| Commanders eliminated, of 3 needed | 2 (1–3) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 66 (59–70) |

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
| Consortium | 30 | 18 | 11% | 184 | 2.0 | 3.9 | 39 | 732 | 30 | 0% | 15.3 | 100% | 4% |
| Commune | 30 | 18 | 0% | 168 | 0.2 | 9.2 | 30 | 710 | 20 | 0% | 35.1 | 59% | 1% |
| Directorate | 30 | 18 | 72% | 157 | 2.8 | 11.3 | 48 | 891 | 45 | 0% | 23.0 | 100% | 11% |
| Knights | 30 | 18 | 17% | 144 | 10.8 | 0.8 | 55 | 826 | 60 | 0% | 13.7 | 100% | 8% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 11.5 / 12.4 | 12.7 / 11.8 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 3.4 / 1.8 | 0.0 / 0.0 |
| Harvester | 7.6 / 8.0 | 14.6 / 14.8 | 6.7 / 5.6 | 10.8 / 9.5 |
| Chorister | 0.0 / 0.0 | 3.3 / 3.2 | 0.0 / 1.9 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 2.2 |
| Bulwark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.5 / 0.4 |
| Freighter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.1 | 0.0 / 0.0 |
| Beacon | 1.9 / 1.9 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.5 / 2.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 2.0 / 1.4 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.3 |
| Broadside | 0.4 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.4 / 0.3 | 0.0 / 0.0 |
| Furnace | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.5 / 3.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 0.2 / 2.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.5 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.5 / 0.4 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.0 | 1.0 | 1.1 |
| Sentinel Turret | 1.0 | 0.6 | 1.0 | 1.0 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.2 |
| Vent Tap | 1.2 | 0.9 | 1.2 | 1.0 |
| Slipway | 0.8 | 0.3 | 1.0 | 1.0 |
| Bio-Reactor | 0.0 | 1.0 | 1.0 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 41713 | 49489 | 63592 | 58400 |
| Blocked: not escorted | 16395 (39%) | 26814 (54%) | 29397 (46%) | 53143 (91%) |
| Blocked: no free yard | 10161 (24%) | 3104 (6%) | 8301 (13%) | 370 (1%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 3365 (8%) | 16914 (34%) | 17754 (28%) | 4887 (8%) |
| Already has one | 11781 (28%) | 2654 (5%) | 8128 (13%) | 0 (0%) |
| **Bought** | 11 (0%) | 3 (0%) | 12 (0%) | 0 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 41692 | 49483 | 63577 | 58386 |
| Blocked: not escorted | 24175 (58%) | 28375 (57%) | 32184 (51%) | 53133 (91%) |
| Blocked: no free yard | 10415 (25%) | 19416 (39%) | 8330 (13%) | 370 (1%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 559 (1%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 1692 (3%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 7102 (17%) | 0 (0%) | 22504 (35%) | 4883 (8%) |
| Already has one | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **Bought** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| _Shut before the purse, with the price in it_ | 162 (0%) | 37 (0%) | 0 (0%) | 0 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull. The last row is not a reason and joins no sum: of the observations the escort, the yard, the berths or the yield shut, it counts those at which the purse already held the deck's price. It is a floor on what the gates cost and not a ceiling: a shut gate also stops the deck bidding, so the bank never saved toward it (#915)._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 610 | 600 | 630 | 751 |
| Peak in any match | 760 | 640 | 640 | 772 |
| Best peak above the opening 600 | 160 | 40 | 40 | 172 |
| Matches with a Slipway standing | 23 | 9 | 29 | 29 |
| Peak with the yard up, median | 410 | 155 | 310 | 751 |
| Peak with the yard up, best | 760 | 390 | 530 | 772 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 34.7 | 54.2 | 64.5 | 61.3 |
| Nodules delivered a match | 2397 | 2696 | 3208 | 3022 |
| Nodules banked a match | 2394 | 2691 | 3201 | 2679 |
| Mean hold delivered | 69.1 | 49.8 | 49.7 | 49.3 |
| Nodules lost in transit a match | 123 | 173 | 150 | 77 |
| Lost as a share of what was cut | 5% | 6% | 4% | 2% |
| Harvester-time laden | 25% | 36% | 37% | 20% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
