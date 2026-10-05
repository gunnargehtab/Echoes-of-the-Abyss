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
>
> **Refreshed on 5 Oct 2026 because a mechanic changed, not to reach a target** (#1090).
> Same command, seeds and cap, run from `3caa5c2`; the before figures are the previous file,
> which the same command at `164f2f9` reproduces. No weight, price or TUNABLE moved. The
> change: the Broadside, the Weaver and the Lance wait with the fleet when nothing is in
> reach, where nothing used to order them off their yard, and the Weaver lays only under way
> (`docs/tech-stack.md`, "The skirmish AI").
>
> What it moved, recorded and left: 13 matches are decided, not 12, and the median match still
> runs to the 1500 s cap. No verdict flips: one-navy stays **breached** (the Directorate 77%,
> n=13), Knights-starve reads **no data**, and the other four read **held**. Win rates over the
> thirteen: the Directorate 77%, the Knights 15%, the Commune 8%, the Consortium 0%.
>
> **Refreshed on 5 Oct 2026 because a mechanic changed, not to reach a target** (#703).
> Same command, seeds and cap, run from `3580952`; the before figures are the previous file,
> which the same command reproduces on this branch with `main`'s `commander.ts` (`956a6ab`).
> No weight, price or TUNABLE moved.
> The change: the commander points every yard with a fighting line at its muster point, so
> a launched hull leaves the apron on the tick it is built rather than on the next decision
> (`commandRally`; `docs/tech-stack.md`, "The skirmish AI").
>
> What it moved, recorded and left: 11 matches are decided, not 13, and the median match still
> runs to the 1500 s cap. No verdict flips: one-navy stays **breached** (the Directorate 73%,
> n=11), Knights-starve reads **no data**, and the other four read **held**. Win rates over the
> eleven: the Directorate 73%, the Knights 18%, the Commune 9%, the Consortium 0%.

> **Refreshed on 5 Oct 2026 because a mechanic changed, not to reach a target** (#1092,
> #1090). Same command, seeds and cap, run from this branch merged with `main` at
> `40cf68f`; the before figures are the previous file, which is `main`'s own.
> No weight, price or TUNABLE moved. The change, two mechanics: a depot rearms each hull to
> its own magazine, where it stopped at the roster's two (#1092), and a spent Broadside,
> Weaver or Lance walks to the nearest Bastion or Foundry and stays until it is full, where
> it used to stand where it emptied (#1090; `docs/tech-stack.md`, "The skirmish AI").
>
> What it moved, recorded and left: 10 matches are decided, not 11, and the median match
> still runs to the 1500 s cap. No verdict flips: one-navy stays **breached** (the
> Directorate 80%, n=10), Knights-starve reads **no data**, and the other four read
> **held**. Win rates over the ten: the Directorate 80%, the Commune 10%, the Knights 10%
> (was 18%), the Consortium 0%.

30 matches on `ventfront-divide`, seeds 4000–4029. 20 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_One seating: every match dealt each navy the same spawn. A win rate here cannot separate the doctrine from the chair — see `baselines/seat-rotation.md`, and `--rotate-seats`._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 80% vs parity 25%, bar 50% (n=10 decided, one seating) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 10% vs best rival 80%, premium 4.9 vs 4.5 (n=10 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 748 s tracked per match, win 0% (n=10 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 10.4/min, Drift Health median 65 (n=30) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 20 s, first blood 48 s (n=30) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (714–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 20 (20–20) |
| First blood, seconds | 48 (48–48) |
| Drift Health at the end | 65 (60–76) |

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
| Consortium | 30 | 10 | 0% | 177 | 1.7 | 3.7 | 39 | 748 | 30 | 0% | 15.3 | 100% | 5% |
| Commune | 30 | 10 | 10% | 157 | 0.4 | 8.8 | 32 | 646 | 20 | 0% | 30.2 | 58% | 1% |
| Directorate | 30 | 10 | 80% | 162 | 2.7 | 10.4 | 45 | 778 | 46 | 0% | 20.8 | 100% | 13% |
| Knights | 30 | 10 | 10% | 142 | 9.6 | 0.7 | 57 | 854 | 60 | 0% | 14.0 | 100% | 8% |

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 9.2 / 9.7 | 11.2 / 10.2 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 3.4 / 2.3 | 0.0 / 0.0 |
| Harvester | 8.0 / 8.5 | 14.2 / 13.4 | 5.8 / 5.0 | 11.6 / 9.8 |
| Chorister | 0.0 / 0.0 | 3.1 / 2.9 | 0.0 / 1.6 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 2.0 |
| Bulwark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 0.2 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.8 / 0.5 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.7 / 0.0 | 0.0 / 0.0 |
| Beacon | 1.7 / 1.7 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.2 / 2.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.9 / 1.4 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.2 |
| Broadside | 0.3 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.2 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.2 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 |
| Furnace | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.3 / 3.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 0.2 / 2.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.6 / 0.5 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.0 | 1.0 | 1.1 | 1.1 |
| Sentinel Turret | 1.0 | 0.8 | 1.0 | 1.0 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.2 |
| Vent Tap | 1.2 | 0.9 | 1.1 | 1.0 |
| Slipway | 0.7 | 0.4 | 0.9 | 0.9 |
| Bio-Reactor | 0.0 | 1.0 | 1.1 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 41859 | 52347 | 60509 | 61284 |
| Blocked: not escorted | 21896 (52%) | 27508 (53%) | 30177 (50%) | 54912 (90%) |
| Blocked: no free yard | 9920 (24%) | 2781 (5%) | 7493 (12%) | 173 (0%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 1849 (4%) | 15170 (29%) | 17800 (29%) | 5095 (8%) |
| Already has one | 8185 (20%) | 6882 (13%) | 5029 (8%) | 1102 (2%) |
| **Bought** | 9 (0%) | 6 (0%) | 10 (0%) | 2 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 41837 | 52332 | 60496 | 61259 |
| Blocked: not escorted | 27378 (65%) | 32742 (63%) | 32329 (53%) | 54892 (90%) |
| Blocked: no free yard | 10213 (24%) | 16193 (31%) | 7493 (12%) | 173 (0%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 1574 (3%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 3397 (6%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 4246 (10%) | 0 (0%) | 19100 (32%) | 6194 (10%) |
| Already has one | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **Bought** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| _Shut before the purse, with the price in it_ | 203 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull. The last row is not a reason and joins no sum: of the observations the escort, the yard, the berths or the yield shut, it counts those at which the purse already held the deck's price. It is a floor on what the gates cost and not a ceiling: a shut gate also stops the deck bidding, so the bank never saved toward it (#915)._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 610 | 600 | 630 | 643 |
| Peak in any match | 730 | 640 | 640 | 772 |
| Best peak above the opening 600 | 130 | 40 | 40 | 172 |
| Matches with a Slipway standing | 20 | 12 | 27 | 28 |
| Peak with the yard up, median | 430 | 160 | 300 | 674 |
| Peak with the yard up, best | 730 | 380 | 390 | 772 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 33.4 | 52.8 | 60.9 | 62.9 |
| Nodules delivered a match | 2300 | 2623 | 3011 | 3117 |
| Nodules banked a match | 2296 | 2609 | 3008 | 2785 |
| Mean hold delivered | 68.9 | 49.7 | 49.5 | 49.6 |
| Nodules lost in transit a match | 154 | 191 | 126 | 96 |
| Lost as a share of what was cut | 6% | 7% | 4% | 3% |
| Harvester-time laden | 26% | 35% | 37% | 21% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
