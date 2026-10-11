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
>
> **Refreshed on 11 Oct 2026 because a mechanic changed, not to reach a target** (#1288).
> Same command, seeds and cap, run from `a544134`; the before figures are the previous file,
> which the same command at `main`'s `d5f3400` reproduces. No weight, price or TUNABLE moved.
> The change: a creature no longer takes a target it could never bite, one deeper or
> shallower than its home depth by more than its band plus its bite, unless it is within a
> bite of the depth the creature holds now ([bestiary.md](../../../docs/bestiary.md) §4).
>
> What it moved, recorded and left: all 120 matches differ and 61 change their result.
> Thirty-three draws become wins, 22 wins become draws and six change hands, so 53 matches
> are decided, not 42. One-navy stays **breached** (the Knights 58%, was 76%), recorded and
> left as `docs/economy.md` §9 says; every other verdict is unchanged. Win rates over the 53:
> the Knights 58%, the Directorate 32% (21%), the Commune 6% (0%), the Consortium 4% (2%).

120 matches on `ventfront-divide`, seeds 4000–4029. 67 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_4 seatings, pooled. Each navy played more than one spawn, so the per-faction column is about the doctrine rather than about the chair._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Knights 58% vs parity 25%, bar 50% (n=53 decided, 4 seatings pooled) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 6% vs best rival 58%, premium 5.7 vs 4.7 (n=53 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 789 s tracked per match, win 4% (n=53 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 9.8/min, Drift Health median 63 (n=120) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 23 s, first blood 57 s (n=120) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (878–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 23 (16–26) |
| First blood, seconds | 57 (43–65) |
| Drift Health at the end | 63 (57–71) |

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
| Consortium | 120 | 53 | 4% | 179 | 3.2 | 3.4 | 51 | 789 | 39 | 0% | 17.1 | 100% | 5% |
| Commune | 120 | 53 | 6% | 182 | 1.7 | 8.3 | 32 | 643 | 27 | 0% | 27.7 | 59% | 2% |
| Directorate | 120 | 53 | 32% | 181 | 1.8 | 9.8 | 39 | 733 | 40 | 0% | 24.9 | 100% | 9% |
| Knights | 120 | 53 | 58% | 138 | 7.7 | 1.8 | 66 | 817 | 41 | 0% | 10.3 | 100% | 10% |

## Per chair

| Slot | Matches | Decided | Win rate | Navies that sat here |
| --- | --- | --- | --- | --- |
| 0 | 120 | 53 | 9% | Consortium, Commune, Directorate, Knights |
| 1 | 120 | 53 | 34% | Consortium, Commune, Directorate, Knights |
| 2 | 120 | 53 | 32% | Consortium, Commune, Directorate, Knights |
| 3 | 120 | 53 | 25% | Consortium, Commune, Directorate, Knights |

_The spawn, not the navy. `--matchup` binds a faction to a spawn by its position in the list, so this column and the one above it are the two marginals of one table — and on `ventfront-divide` this is the bigger of them._

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 4.8 / 5.7 | 11.0 / 11.1 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 3.7 / 3.2 | 0.0 / 0.0 |
| Harvester | 8.1 / 8.1 | 13.4 / 13.5 | 7.2 / 6.8 | 9.0 / 6.8 |
| Chorister | 0.0 / 0.0 | 2.1 / 1.9 | 0.0 / 2.0 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 1.5 |
| Bulwark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 1.0 / 0.5 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.3 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 |
| Dredge | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.4 / 0.6 |
| Freighter | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.5 / 0.2 | 0.0 / 0.0 |
| Beacon | 3.1 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.5 / 2.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.5 / 1.3 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.9 / 0.2 |
| Broadside | 0.6 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.7 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.2 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.2 / 0.0 |
| Furnace | 0.5 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Blight | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Tocsin | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.7 / 3.5 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 0.9 / 2.9 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.2 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.8 / 0.3 |
| Gantry | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spark | 0.2 / 0.2 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.1 | 1.1 | 1.2 | 1.3 |
| Sentinel Turret | 0.8 | 0.5 | 0.6 | 0.7 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.3 |
| Spore Veil | 0.0 | 0.0 | 0.0 | 0.0 |
| Vent Tap | 0.9 | 1.1 | 1.2 | 1.1 |
| Slipway | 0.9 | 0.8 | 0.8 | 0.9 |
| Bio-Reactor | 0.0 | 1.0 | 1.0 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 208726 | 212124 | 214023 | 243783 |
| Blocked: not escorted | 57942 (28%) | 88192 (42%) | 114903 (54%) | 166746 (68%) |
| Blocked: no free yard | 42495 (20%) | 8936 (4%) | 34221 (16%) | 2701 (1%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 21331 (10%) | 24577 (12%) | 39358 (18%) | 57935 (24%) |
| Already has one | 86881 (42%) | 90340 (43%) | 25510 (12%) | 16381 (7%) |
| **Bought** | 77 (0%) | 79 (0%) | 31 (0%) | 20 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 208581 | 211867 | 213986 | 243648 |
| Blocked: not escorted | 101661 (49%) | 151565 (72%) | 126566 (59%) | 170332 (70%) |
| Blocked: no free yard | 44569 (21%) | 35179 (17%) | 34221 (16%) | 3071 (1%) |
| Blocked: no berth | 0 (0%) | 50 (0%) | 3320 (2%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 23436 (11%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 53066 (25%) | 1637 (1%) | 49879 (23%) | 70141 (29%) |
| Already has one | 9275 (4%) | 0 (0%) | 0 (0%) | 103 (0%) |
| **Bought** | 10 (0%) | 0 (0%) | 0 (0%) | 1 (0%) |
| _Shut before the purse, with the price in it_ | 448 (0%) | 1696 (1%) | 1492 (1%) | 0 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull. The last row is not a reason and joins no sum: of the observations the escort, the yard, the berths or the yield shut, it counts those at which the purse already held the deck's price. It is a floor on what the gates cost and not a ceiling: a shut gate also stops the deck bidding, so the bank never saved toward it (#915)._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 630 | 610 | 630 | 615 |
| Peak in any match | 760 | 710 | 1140 | 772 |
| Best peak above the opening 600 | 160 | 110 | 540 | 172 |
| Matches with a Slipway standing | 110 | 96 | 95 | 109 |
| Peak with the yard up, median | 430 | 360 | 360 | 345 |
| Peak with the yard up, best | 760 | 685 | 1140 | 772 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 40.9 | 60.1 | 60.6 | 61.2 |
| Nodules delivered a match | 2837 | 2985 | 3011 | 3039 |
| Nodules banked a match | 2832 | 2959 | 3002 | 2739 |
| Mean hold delivered | 69.3 | 49.7 | 49.7 | 49.7 |
| Nodules lost in transit a match | 142 | 202 | 132 | 86 |
| Lost as a share of what was cut | 5% | 6% | 4% | 3% |
| Harvester-time laden | 26% | 29% | 35% | 26% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
