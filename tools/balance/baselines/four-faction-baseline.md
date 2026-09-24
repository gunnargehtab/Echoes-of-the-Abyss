# Four-faction baseline

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25 --title 'Four-faction baseline' --out tools/balance/baselines/four-faction-baseline.md
```

> **Refreshed on 24 Sept 2026 because mechanics changed, not to reach a target** (#839, its
> fourth bullet). Same command, seeds and cap, run from `d14d666`. No weight, price or TUNABLE
> moved. The one-navy rail stays **breached**, recorded and left (#654).
>
> The previous file reproduces from `4e01127` (16 Sept), the merge before #754, and from
> nothing later: `7fbb9ba` (18 Sept) gives 16 decided and the Directorate at 69%. What changed
> in the simulation since:
>
> - #754: the commander keeps a garden claim until the tender arrives.
> - #842 (#838): the four carriers join the roster.
> - #853, #861, #864 (#839): a craft is not a line hull, and the commander buys its carrier and
>   flies it.
> - #886 (#854): the commander reads its berths before it queues a hull.
> - #900 (#863): a craft goes round its own carrier.
> - #880 and the owner's ruling (#839): the carrier want is counted, and yields to the Sower's
>   and Bower's open wants.
>
> The ruling changes no match here. The Commune raises no Slipway in any of the 30 seeds, so
> every match is identical to `main` at `afb9753` but for the new *yielded* row, which reads 0.
> No navy buys its carrier.
>
> Against the previous file: 18 matches are decided, not 14. The Knights-starve rail reads
> **held** (82%, n=14 long) where it read **no data**: the median match now ends at 1331 s,
> before the 1500 s cap, so longer-than-median matches exist. Win rates move: the Directorate
> from 79% to 67%, the Commune from 14% to 22%, the Knights from 7% to 11%. The Consortium stays
> at 0%.

30 matches on `ventfront-divide`, seeds 4000–4029. 12 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_One seating: every match dealt each navy the same spawn. A win rate here cannot separate the doctrine from the chair — see `baselines/seat-rotation.md`, and `--rotate-seats`._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 67% vs parity 25%, bar 50% (n=18 decided, one seating) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 22% vs best rival 67%, premium 5.8 vs 6.2 (n=18 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 602 s tracked per match, win 0% (n=18 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 15.9/min, Drift Health median 68 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 138/min vs field 168 — 82% (n=14 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1331 (737–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 68 (63–75) |

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
| Consortium | 30 | 18 | 0% | 222 | 1.9 | 3.3 | 36 | 602 | 30 | 0% | 18.2 | 100% | 4% |
| Commune | 30 | 18 | 22% | 185 | 0.8 | 6.8 | 32 | 640 | 20 | 0% | 43.2 | 46% | 1% |
| Directorate | 30 | 18 | 67% | 176 | 3.0 | 15.9 | 49 | 880 | 41 | 0% | 24.7 | 100% | 15% |
| Knights | 30 | 18 | 11% | 158 | 7.7 | 1.0 | 55 | 773 | 60 | 0% | 15.0 | 100% | 6% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 20.7 / 21.5 | 10.8 / 9.8 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 9.2 / 7.2 | 0.0 / 0.0 |
| Harvester | 9.5 / 10.0 | 12.6 / 12.6 | 5.6 / 4.1 | 10.5 / 9.2 |
| Chorister | 0.0 / 0.0 | 2.7 / 2.5 | 0.0 / 1.9 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.2 / 2.9 |
| Spinner | 0.0 / 0.0 | 0.5 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.2 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.8 / 0.1 | 0.0 / 0.0 |
| Beacon | 3.0 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 3.2 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 2.1 / 1.5 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.4 |
| Broadside | 0.2 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.6 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.8 / 3.7 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.2 / 2.9 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.6 / 1.3 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.1 | 1.0 | 1.0 | 1.0 |
| Sentinel Turret | 1.0 | 0.1 | 0.5 | 0.9 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.1 |
| Vent Tap | 0.9 | 0.1 | 0.9 | 0.5 |
| Slipway | 0.5 | 0.0 | 0.4 | 0.7 |
| Bio-Reactor | 0.0 | 0.7 | 1.0 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 34708 | 44309 | 57240 | 50538 |
| Blocked: not escorted | 16037 (46%) | 7428 (17%) | 14802 (26%) | 39615 (78%) |
| Blocked: no free yard | 11769 (34%) | 5315 (12%) | 36750 (64%) | 5308 (11%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 2485 (7%) | 15861 (36%) | 5437 (9%) | 4780 (9%) |
| Already has one | 4412 (13%) | 15686 (35%) | 250 (0%) | 833 (2%) |
| **Bought** | 5 (0%) | 19 (0%) | 1 (0%) | 2 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 34701 | 44275 | 57237 | 50522 |
| Blocked: not escorted | 19432 (56%) | 14626 (33%) | 14802 (26%) | 39928 (79%) |
| Blocked: no free yard | 11810 (34%) | 29649 (67%) | 36750 (64%) | 5308 (11%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 338 (1%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 3459 (10%) | 0 (0%) | 5347 (9%) | 5286 (10%) |
| Already has one | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **Bought** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 620 | 600 | 600 | 610 |
| Peak in any match | 680 | 630 | 650 | 776 |
| Best peak above the opening 600 | 80 | 30 | 50 | 176 |
| Matches with a Slipway standing | 16 | 0 | 13 | 20 |
| Peak with the yard up, median | 270 | — | 150 | 283 |
| Peak with the yard up, best | 602 | — | 300 | 776 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 33.7 | 53.4 | 62.8 | 58.6 |
| Nodules delivered a match | 2324 | 2657 | 3114 | 2904 |
| Nodules banked a match | 2319 | 2648 | 3104 | 2464 |
| Mean hold delivered | 69.0 | 49.8 | 49.6 | 49.6 |
| Nodules lost in transit a match | 171 | 181 | 93 | 104 |
| Lost as a share of what was cut | 7% | 6% | 3% | 3% |
| Harvester-time laden | 28% | 38% | 38% | 26% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
