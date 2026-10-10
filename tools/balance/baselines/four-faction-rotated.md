# Four-faction baseline, seating rotated

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --rotate-seats --title 'Four-faction baseline, seating rotated' --out tools/balance/baselines/four-faction-rotated.md
```

> **Refreshed on 10 Oct 2026 because a mechanic changed, not to reach a target** (#1256).
> Same command, seeds and cap, run from `ae233a1`. The before figures are the same command at
> `main`'s `eb9b5af`, which does not reproduce the previous file (26 decided there, not 53);
> the simulation has changed since that file was recorded. No weight, price or TUNABLE moved.
> The change: home defence, the transport's landing, the Herald's turn and the ping trigger
> skip a contact below Bearing, whose position the layer reports as its listener's own
> (`docs/tech-stack.md`, "The skirmish AI").
>
> What it moved, recorded and left: all 120 matches differ and 48 change their result. 42
> are decided, not 26, and the median match still runs to the 1500 s cap. No verdict flips:
> one-navy stays **breached** (the Knights 76%, was 77%, n=42), Knights-starve reads
> **no data**, and the other four read **held**. Win rates over the 42: the Knights 76%, the
> Directorate 21% (was 8%), the Consortium 2% (12%), the Commune 0% (4%). The chairs read
> 7%, 26%, 26% and 40%, not 19%, 35%, 27% and 19%. Sentinel Turrets commissioned per match
> fall from 1.0, 0.9, 1.0 and 1.0 to 0.9, 0.5, 0.6 and 0.7.

120 matches on `ventfront-divide`, seeds 4000–4029. 78 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_4 seatings, pooled. Each navy played more than one spawn, so the per-faction column is about the doctrine rather than about the chair._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Knights 76% vs parity 25%, bar 50% (n=42 decided, 4 seatings pooled) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 76%, premium 6.3 vs 4.7 (n=42 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 770 s tracked per match, win 2% (n=42 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 10.0/min, Drift Health median 64 (n=120) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 23 s, first blood 57 s (n=120) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (967–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 23 (16–26) |
| First blood, seconds | 57 (43–65) |
| Drift Health at the end | 64 (57–73) |

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
| Consortium | 120 | 42 | 2% | 172 | 2.7 | 3.5 | 50 | 770 | 39 | 0% | 16.3 | 100% | 5% |
| Commune | 120 | 42 | 0% | 192 | 1.7 | 8.3 | 30 | 626 | 27 | 0% | 26.8 | 59% | 3% |
| Directorate | 120 | 42 | 21% | 177 | 1.7 | 10.0 | 38 | 724 | 40 | 1% | 24.9 | 100% | 9% |
| Knights | 120 | 42 | 76% | 137 | 8.3 | 2.1 | 68 | 841 | 41 | 0% | 10.0 | 100% | 10% |

## Per chair

| Slot | Matches | Decided | Win rate | Navies that sat here |
| --- | --- | --- | --- | --- |
| 0 | 120 | 42 | 7% | Consortium, Commune, Directorate, Knights |
| 1 | 120 | 42 | 26% | Consortium, Commune, Directorate, Knights |
| 2 | 120 | 42 | 26% | Consortium, Commune, Directorate, Knights |
| 3 | 120 | 42 | 40% | Consortium, Commune, Directorate, Knights |

_The spawn, not the navy. `--matchup` binds a faction to a spawn by its position in the list, so this column and the one above it are the two marginals of one table — and on `ventfront-divide` this is the bigger of them._

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 4.2 / 5.2 | 10.7 / 11.2 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 3.7 / 3.4 | 0.0 / 0.0 |
| Harvester | 8.3 / 8.2 | 13.0 / 13.1 | 7.0 / 6.6 | 8.7 / 6.3 |
| Chorister | 0.0 / 0.0 | 2.0 / 1.9 | 0.0 / 2.0 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 1.5 |
| Bulwark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 1.0 / 0.5 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.3 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Dredge | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.6 / 0.5 |
| Freighter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.4 / 0.2 | 0.0 / 0.0 |
| Beacon | 3.0 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.6 / 2.6 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.5 / 1.3 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.0 / 0.3 |
| Broadside | 0.5 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.6 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 0.2 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 0.0 |
| Furnace | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Blight | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 |
| Tocsin | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.4 / 3.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 0.9 / 2.9 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.3 |
| Gantry | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Offertory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Versicle | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.1 | 1.0 | 1.2 | 1.2 |
| Sentinel Turret | 0.9 | 0.5 | 0.6 | 0.7 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.3 |
| Spore Veil | 0.0 | 0.0 | 0.0 | 0.0 |
| Vent Tap | 1.0 | 1.2 | 1.2 | 1.1 |
| Slipway | 0.9 | 0.8 | 0.7 | 1.0 |
| Bio-Reactor | 0.0 | 1.0 | 1.0 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 208242 | 203461 | 217099 | 251372 |
| Blocked: not escorted | 67347 (32%) | 80034 (39%) | 121020 (56%) | 165864 (66%) |
| Blocked: no free yard | 42384 (20%) | 9044 (4%) | 35553 (16%) | 2034 (1%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 22298 (11%) | 26126 (13%) | 36253 (17%) | 62866 (25%) |
| Already has one | 76158 (37%) | 88180 (43%) | 24243 (11%) | 20582 (8%) |
| **Bought** | 55 (0%) | 77 (0%) | 30 (0%) | 26 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 208130 | 203200 | 217059 | 251229 |
| Blocked: not escorted | 107063 (51%) | 140700 (69%) | 132585 (61%) | 172787 (69%) |
| Blocked: no free yard | 43852 (21%) | 36978 (18%) | 35622 (16%) | 2305 (1%) |
| Blocked: no berth | 0 (0%) | 56 (0%) | 1886 (1%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 24462 (12%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 52060 (25%) | 1004 (0%) | 46966 (22%) | 75598 (30%) |
| Already has one | 5150 (2%) | 0 (0%) | 0 (0%) | 538 (0%) |
| **Bought** | 5 (0%) | 0 (0%) | 0 (0%) | 1 (0%) |
| _Shut before the purse, with the price in it_ | 1201 (1%) | 1607 (1%) | 567 (0%) | 0 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull. The last row is not a reason and joins no sum: of the observations the escort, the yard, the berths or the yield shut, it counts those at which the purse already held the deck's price. It is a floor on what the gates cost and not a ceiling: a shut gate also stops the deck bidding, so the bank never saved toward it (#915)._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 640 | 620 | 630 | 617 |
| Peak in any match | 760 | 715 | 1140 | 781 |
| Best peak above the opening 600 | 160 | 115 | 540 | 181 |
| Matches with a Slipway standing | 104 | 94 | 89 | 112 |
| Peak with the yard up, median | 430 | 370 | 360 | 354 |
| Peak with the yard up, best | 760 | 715 | 1140 | 781 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 39.0 | 59.7 | 60.2 | 63.0 |
| Nodules delivered a match | 2703 | 2962 | 2979 | 3129 |
| Nodules banked a match | 2697 | 2937 | 2968 | 2820 |
| Mean hold delivered | 69.4 | 49.6 | 49.5 | 49.7 |
| Nodules lost in transit a match | 161 | 179 | 131 | 70 |
| Lost as a share of what was cut | 6% | 6% | 4% | 2% |
| Harvester-time laden | 26% | 30% | 35% | 26% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
