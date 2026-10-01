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
>
> **Refreshed on 27 Sept 2026 because a mechanic changed, not to reach a target** (#950).
> Same command, seeds and cap, run from `8b463a2`; the before figures are the previous file,
> which the same command at `2e09e8d` reproduces. No weight, price or TUNABLE moved. The
> change: a committed push orders on every hull away from its objective, where it used to
> order none once one hull stood there (`docs/tech-stack.md`, "The skirmish AI").
>
> What it moved, recorded and left: three matches of thirty differ (seeds 4006, 4009 and
> 4012), and 4012 goes from a Directorate win to a draw, so 17 matches are decided, not 18,
> and the median match runs 1477 s, not 1462. No verdict flips: one-navy stays **breached**
> (the Directorate 71%, n=17), and the other five read **held**. Win rates over the seventeen:
> the Directorate 71%, the Knights 18%, the Consortium 12%, the Commune 0%.
>
> **Refreshed on 28 Sept 2026 because a mechanic changed, not to reach a target** (#971).
> Same command, seeds and cap, run from `6e28777`; the before figures are the previous file,
> which the same command at `7149d0d` reproduces. No weight, price or TUNABLE moved. The
> change: the army orders its siege hull in no branch, and a siege hull with no wall waits in
> the fleet's middle rather than at the rally point (`docs/tech-stack.md`, "The skirmish AI").
>
> What it moved, recorded and left: nine matches of thirty differ. Three change their result:
> 4006 goes from a Knights win to a draw, 4029 from a Directorate win to a draw, and 4026
> from a Consortium win to a Directorate win. So 15 matches are decided, not 17, and the
> median match runs to the 1500 s cap. One verdict moves: Knights-starve reads **no data**,
> not **held**, with no longer-than-median match. One-navy stays **breached** (the Directorate
> 80%, n=15), and the other four read **held**. Win rates over the fifteen: the Directorate
> 80%, the Knights 13%, the Consortium 7%, the Commune 0%.
>
> **Refreshed on 1 Oct 2026 because a mechanic changed, not to reach a target** (#999).
> Same command, seeds and cap, run from `52ffe80`; the before figures are the previous file,
> which the same command at `f3a2197` reproduces. No weight, price or TUNABLE moved. The
> change: a Consortium hull holding a kelp field open pays `CUTTER_SIG` for as long as it
> cuts, where it went quiet once the canopy came apart six seconds in (`docs/hazards.md` §4).
>
> What it moved, recorded and left: 15 matches of thirty differ. Four change their result:
> 4007 goes from a Consortium win to a Knights win, and 4017, 4019 and 4021 from a win to a
> draw. So 12 matches are decided, not 15, and the median match still runs to the 1500 s
> cap. No verdict flips: one-navy stays **breached** (the Directorate 83%, n=12),
> Knights-starve reads **no data**, and the other four read **held**. Win rates over the
> twelve: the Directorate 83%, the Knights 17%, the Consortium and the Commune 0%.

30 matches on `ventfront-divide`, seeds 4000–4029. 18 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_One seating: every match dealt each navy the same spawn. A win rate here cannot separate the doctrine from the chair — see `baselines/seat-rotation.md`, and `--rotate-seats`._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 83% vs parity 25%, bar 50% (n=12 decided, one seating) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 0% vs best rival 83%, premium 5.0 vs 5.3 (n=12 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 724 s tracked per match, win 0% (n=12 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 11.5/min, Drift Health median 65 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (950–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 65 (58–74) |

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
| Consortium | 30 | 12 | 0% | 185 | 1.9 | 3.5 | 35 | 724 | 30 | 0% | 15.3 | 100% | 4% |
| Commune | 30 | 12 | 0% | 160 | 0.2 | 9.0 | 32 | 745 | 20 | 0% | 35.6 | 58% | 1% |
| Directorate | 30 | 12 | 83% | 155 | 2.8 | 11.5 | 46 | 859 | 45 | 0% | 22.9 | 100% | 13% |
| Knights | 30 | 12 | 17% | 143 | 10.0 | 0.9 | 55 | 843 | 60 | 0% | 13.3 | 100% | 8% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 12.3 / 13.1 | 12.9 / 11.8 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 3.3 / 2.1 | 0.0 / 0.0 |
| Harvester | 7.6 / 8.1 | 14.5 / 14.4 | 6.3 / 5.5 | 11.1 / 9.4 |
| Chorister | 0.0 / 0.0 | 3.7 / 3.4 | 0.0 / 1.8 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 2.0 |
| Bulwark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.5 / 0.3 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.1 | 0.0 / 0.0 |
| Beacon | 1.8 / 1.8 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.6 / 2.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.8 / 1.3 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.3 |
| Broadside | 0.3 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.4 / 0.2 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 |
| Furnace | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.1 | 0.0 / 0.0 |
| Caisson | 1.4 / 3.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 0.2 / 2.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.4 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.5 / 0.3 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.1 | 1.0 | 1.1 |
| Sentinel Turret | 1.0 | 0.7 | 1.0 | 1.0 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.3 |
| Vent Tap | 1.1 | 0.9 | 1.0 | 1.0 |
| Slipway | 0.8 | 0.3 | 1.0 | 1.0 |
| Bio-Reactor | 0.0 | 1.0 | 1.0 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 39879 | 54453 | 62405 | 59738 |
| Blocked: not escorted | 17221 (43%) | 28209 (52%) | 27648 (44%) | 52606 (88%) |
| Blocked: no free yard | 9977 (25%) | 2861 (5%) | 8296 (13%) | 340 (1%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 1734 (4%) | 19622 (36%) | 17425 (28%) | 5323 (9%) |
| Already has one | 10937 (27%) | 3758 (7%) | 9024 (14%) | 1467 (2%) |
| **Bought** | 10 (0%) | 3 (0%) | 12 (0%) | 2 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 39858 | 54447 | 62390 | 59723 |
| Blocked: not escorted | 25184 (63%) | 31029 (57%) | 29885 (48%) | 52597 (88%) |
| Blocked: no free yard | 10248 (26%) | 21512 (40%) | 8325 (13%) | 340 (1%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 384 (1%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 1906 (4%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 4426 (11%) | 0 (0%) | 23796 (38%) | 6786 (11%) |
| Already has one | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **Bought** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| _Shut before the purse, with the price in it_ | 148 (0%) | 37 (0%) | 0 (0%) | 0 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull. The last row is not a reason and joins no sum: of the observations the escort, the yard, the berths or the yield shut, it counts those at which the purse already held the deck's price. It is a floor on what the gates cost and not a ceiling: a shut gate also stops the deck bidding, so the bank never saved toward it (#915)._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 610 | 600 | 630 | 750 |
| Peak in any match | 760 | 640 | 640 | 771 |
| Best peak above the opening 600 | 160 | 40 | 40 | 171 |
| Matches with a Slipway standing | 22 | 10 | 29 | 30 |
| Peak with the yard up, median | 410 | 155 | 300 | 750 |
| Peak with the yard up, best | 760 | 390 | 530 | 771 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 33.3 | 56.1 | 61.5 | 61.6 |
| Nodules delivered a match | 2308 | 2788 | 3056 | 3045 |
| Nodules banked a match | 2305 | 2784 | 3048 | 2718 |
| Mean hold delivered | 69.3 | 49.7 | 49.7 | 49.4 |
| Nodules lost in transit a match | 111 | 160 | 146 | 94 |
| Lost as a share of what was cut | 5% | 5% | 5% | 3% |
| Harvester-time laden | 25% | 35% | 36% | 20% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
