# Duel matrix

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --duel-matrix --matches 10 --seed 4000 --max-minutes 25 --title 'Duel matrix' --out tools/balance/baselines/duel-matrix.md
```

> **Refreshed on 25 Sept 2026 because a mechanic changed, not to reach a target** (#706).
> Same command, seeds and cap, run from `81539f9`. No weight, price or TUNABLE moved. The
> change: the commander saves for a Refinery, Vent Tap or turret it wants and cannot afford,
> where it used to let that want bar the rung and save for nothing (`docs/roster-plan.md` §4,
> "The Commune's rung was locked, not unaffordable").
>
> The previous file was run at #842 (`b6ac276`), and #839 and #854 have changed the commander
> since, so the comparison below is against the same command run at `1bf8280`, the commit
> before this change.
>
> What it was for: a Slipway stands in 28 of the Commune's 60 matches, from 3. Summed across
> the four columns, Slipway hulls built go from 0.4 to 1.2, with the Commune's Sower among
> them where there was none.
>
> What it cost, recorded and left: one verdict flips — loud economies reads **held**, was
> breached. The one-navy rail stays **breached** on the Commune (81%, from 80%) and quiet
> economies stays **breached**. 107 matches are decided, not 110, and the median match runs
> 539 s, not 445.
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
> What it moved, recorded and left: one verdict flips — quiet economies reads **held**, was
> breached. The one-navy rail stays **breached**, now on the Directorate (78%) where it was the
> Commune (81%), and Directorate Biomass stays **breached**. 108 matches are decided, not 107,
> and the median match runs 576 s, not 539. Win rates: the Commune 60% from 81%, the
> Consortium 30% from 21%, the Knights 28% from 19%, the Directorate 78% from 77%.
>
> **Refreshed on 28 Sept 2026 because two mechanics changed, not to reach a target** (#973).
> Same command, seeds and cap, run from `fcff184`; the before figures are the previous file,
> which the same command at `bf138d4` reproduces. No weight, price or TUNABLE moved. The
> changes: the Dredge holds the crystal field (#961), and the army orders its siege hull in no
> branch, and a siege hull with no wall classified waits in the fleet's middle rather than at
> the rally point (#971). Both are in `docs/tech-stack.md`, "The skirmish AI". #950's push,
> merged between them, moves no match.
>
> What it moved, recorded and left: 16 matches of 120 differ, 2 at #961 and 15 at #971, with
> one match moving at both. Two change their result, both at #971 and both the Consortium
> against the Knights: seed 4006 goes from a Consortium win to a draw with the Consortium in
> slot 0, and seed 4005 from a draw to a Consortium win with the Knights in slot 0. So
> 108 matches are still decided, the median match still runs 576 s, and no verdict flips or
> navy's win rate moves; the two chairs read 50% each, not 51% and 49%. Knights-starve reads
> 75%, not 77%, and the Consortium is tracked 551 s a match, not 555.
>
> **Refreshed on 5 Oct 2026 because a mechanic changed, not to reach a target** (#1090).
> Same command, seeds and cap, run from `3caa5c2`. **The previous file did not reproduce:**
> the same command at `164f2f9`, before this change, already differs from it (the Commune
> 63%, not 60%; the chairs 54% and 46%), so the before figures here are that run's. No
> weight, price or TUNABLE moved. The change: the Broadside, the Weaver and the Lance wait
> with the fleet when nothing is in reach, where nothing used to order them off their yard,
> and the Weaver lays only under way (`docs/tech-stack.md`, "The skirmish AI").
>
> What it moved, recorded and left: 105 matches are decided, not 108, and the median match
> still runs 576 s. One verdict flips: loud economies reads **breached** (the Consortium wins
> 25%, n=105), not **held**, recorded and left as `docs/economy.md` §9 says. One-navy and the
> Biomass snowball stay **breached**; quiet economies and Knights-starve read **held**. Win
> rates: the Directorate 77% (was 79%), the Commune 66% (63%), the Knights 27% (26%), the
> Consortium 25% (28%).

> **Refreshed on 5 Oct 2026 because a mechanic changed, not to reach a target** (#1092).
> Same command, seeds and cap, run from `9193fb9`. No weight, price or TUNABLE moved. The
> change: a depot rearms each hull to its own magazine, where it stopped at the roster's two.
> No verdict, win rate or decided count moves; a few cells of the two yard tables move by one
> observation.

> **Refreshed on 5 Oct 2026 because a mechanic changed, not to reach a target** (#1090).
> Same command, seeds and cap, run from `a96ad12`. No weight, price or TUNABLE moved. The
> change: a spent Broadside, Weaver or Lance walks to a depot and stays until it is full.
> 107 matches are decided, not 105, and the median match still runs 576 s. No verdict flips.
> Win rates: the Directorate 79% (was 77%), the Commune 65% (66%), the Knights 27% (27%),
> the Consortium 26% (25%).

120 matches on `ventfront-divide`, seeds 4000–4009. 13 ended without a winner inside the time budget, on a median 0 of the 1 elimination a win needs.

_12 seatings over 6 rosters, pooled. Each navy played more than one spawn *and* more than one opponent, so the per-faction column is about the doctrine rather than about the chair or the draw._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Directorate 79% vs parity 25%, bar 50% (n=56 decided, 12 seatings pooled) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 65% vs best rival 79%, premium 5.9 vs 5.5 (n=107 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 558 s tracked per match, win 26% (n=107 decided) | **breached** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 9.9/min, Drift Health median 81 (n=120) | **breached** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | 152/min vs field 198 — 77% (n=32 long) | **held** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 24 s, first blood 61 s (n=120) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 576 (348–1500) |
| Commanders eliminated, of 1 needed | 0 (0–0) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 24 (20–26) |
| First blood, seconds | 61 (48–67) |
| Drift Health at the end | 81 (75–85) |

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
| Consortium | 60 | 53 | 26% | 199 | 2.3 | 3.7 | 63 | 558 | 33 | 0% | 11.7 | 100% | 5% |
| Commune | 60 | 54 | 65% | 237 | 0.7 | 8.6 | 40 | 418 | 23 | 0% | 19.4 | 55% | 2% |
| Directorate | 60 | 56 | 79% | 255 | 1.5 | 9.9 | 47 | 524 | 27 | 0% | 14.1 | 100% | 5% |
| Knights | 60 | 51 | 27% | 149 | 8.1 | 0.9 | 58 | 504 | 32 | 0% | 7.8 | 100% | 7% |

## Per chair

| Slot | Matches | Decided | Win rate | Navies that sat here |
| --- | --- | --- | --- | --- |
| 0 | 120 | 107 | 55% | Consortium, Commune, Directorate, Knights |
| 1 | 120 | 107 | 45% | Consortium, Commune, Directorate, Knights |

_The spawn, not the navy. `--matchup` binds a faction to a spawn by its position in the list, so this column and the one above it are the two marginals of one table — and on `ventfront-divide` this is the bigger of them._

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 6.5 / 5.6 | 8.5 / 6.8 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 1.9 / 0.8 | 0.0 / 0.0 |
| Harvester | 7.3 / 6.2 | 12.0 / 10.3 | 7.0 / 4.3 | 6.8 / 4.3 |
| Chorister | 0.0 / 0.0 | 1.6 / 1.3 | 0.0 / 1.6 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 2.0 |
| Bulwark | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 0.5 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Dredge | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.7 / 0.3 |
| Freighter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.1 | 0.0 / 0.0 |
| Beacon | 1.7 / 1.5 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 1.3 / 0.7 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.1 / 0.6 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.4 / 0.0 |
| Broadside | 0.3 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.4 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Furnace | 0.3 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.0 / 2.6 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 0.4 / 1.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.4 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 0.1 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.2 | 1.0 | 1.1 | 1.4 |
| Sentinel Turret | 1.0 | 0.7 | 0.8 | 1.0 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.0 |
| Vent Tap | 0.8 | 0.8 | 0.9 | 0.8 |
| Slipway | 0.7 | 0.5 | 0.7 | 0.5 |
| Bio-Reactor | 0.0 | 0.9 | 1.0 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 68594 | 66762 | 66293 | 72660 |
| Blocked: not escorted | 33106 (48%) | 37539 (56%) | 39404 (59%) | 67510 (93%) |
| Blocked: no free yard | 17641 (26%) | 4277 (6%) | 17196 (26%) | 132 (0%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 3007 (4%) | 12466 (19%) | 6983 (11%) | 4469 (6%) |
| Already has one | 14820 (22%) | 12457 (19%) | 2700 (4%) | 546 (1%) |
| **Bought** | 20 (0%) | 23 (0%) | 10 (0%) | 3 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 68551 | 66695 | 66279 | 72628 |
| Blocked: not escorted | 39812 (58%) | 44054 (66%) | 39723 (60%) | 67481 (93%) |
| Blocked: no free yard | 18200 (27%) | 17573 (26%) | 17232 (26%) | 193 (0%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 265 (0%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 5068 (8%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 10539 (15%) | 0 (0%) | 9059 (14%) | 4954 (7%) |
| Already has one | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **Bought** | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| _Shut before the purse, with the price in it_ | 309 (0%) | 200 (0%) | 486 (1%) | 1 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull. The last row is not a reason and joins no sum: of the observations the escort, the yard, the berths or the yield shut, it counts those at which the purse already held the deck's price. It is a floor on what the gates cost and not a ceiling: a shut gate also stops the deck bidding, so the bank never saved toward it (#915)._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 610 | 600 | 620 | 601 |
| Peak in any match | 730 | 660 | 690 | 757 |
| Best peak above the opening 600 | 130 | 60 | 90 | 157 |
| Matches with a Slipway standing | 41 | 26 | 39 | 29 |
| Peak with the yard up, median | 420 | 310 | 330 | 340 |
| Peak with the yard up, best | 730 | 508 | 690 | 757 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 31.7 | 48.0 | 51.0 | 41.6 |
| Nodules delivered a match | 2205 | 2387 | 2533 | 2072 |
| Nodules banked a match | 2196 | 2377 | 2523 | 1763 |
| Mean hold delivered | 69.6 | 49.7 | 49.7 | 49.8 |
| Nodules lost in transit a match | 151 | 131 | 98 | 65 |
| Lost as a share of what was cut | 6% | 5% | 4% | 3% |
| Harvester-time laden | 28% | 35% | 40% | 29% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
