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
>
> **Refreshed on 17 Oct 2026 because a mechanic changed, not to reach a target** (#1434).
> Same command, seeds and cap, run from `76d4cbe`. The before figures are the same command at
> `main`'s `052a2e2`, which does not reproduce the previous file; the simulation has changed
> since. No weight, price or TUNABLE moved.
> The change: a harvester re-picks its depot on every trip, where it used to keep the first
> one for life, so a forward Refinery built later is hauled to and hums
> ([economy.md](../../../docs/economy.md) §8).
>
> What it moved, recorded and left: deliveries a match rise 1–6% for every navy. 43 matches are
> decided, not 35. Loud economies flips from **breached** to **held** (the Consortium wins 12%,
> was 0%); one-navy stays **breached**, the Knights 63% (was 77%).

120 matches on `ventfront-divide`, seeds 4000–4029. 77 ended without a winner inside the time budget, on a median 2 of the 3 eliminations a win needs.

_4 seatings, pooled. Each navy played more than one spawn, so the per-faction column is about the doctrine rather than about the chair._

## Guard-rails

| Risk | Source | Metric | Reading | Verdict |
| --- | --- | --- | --- | --- |
| One navy is simply stronger | economy.md §9 | Best win rate against 2x parity | Knights 63% vs parity 25%, bar 50% (n=43 decided, 4 seatings pooled) | **breached** |
| Quiet economies simply win | economy.md §9 | Commune win rate, and nodules per minute per point of mean SIG | win 2% vs best rival 63%, premium 7.3 vs 5.8 (n=43 decided) | **held** |
| Loud economies are unplayable | economy.md §9 | Consortium seconds tracked, against Consortium win rate | 785 s tracked per match, win 12% (n=43 decided) | **held** |
| Directorate Biomass snowballs | economy.md §9 · bestiary.md §8 | Biomass per minute against final Drift Health | 9.9/min, Drift Health median 64 (n=120) | **held** |
| Knights starve out of every long game | economy.md §9 | Hadron income against the field, in longer-than-median matches | no long matches in this batch | **no data** |
| Fauna decide matches | bestiary.md §8 | First blood against first classified enemy — losses before anyone met anyone | enemy found 23 s, first blood 57 s (n=120) | **held** |

## The match

| Measure | Median (p10–p90) |
| --- | --- |
| Length, seconds | 1500 (859–1500) |
| Commanders eliminated, of 3 needed | 2 (1–2) |
| First contact, seconds | 0 (0–0) |
| First classified enemy, seconds | 23 (16–26) |
| First blood, seconds | 57 (43–65) |
| Drift Health at the end | 64 (58–71) |

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
| Consortium | 120 | 43 | 12% | 190 | 3.7 | 3.9 | 51 | 785 | 39 | 0% | 17.3 | 100% | 5% |
| Commune | 120 | 43 | 2% | 206 | 1.6 | 8.4 | 28 | 614 | 27 | 0% | 26.7 | 57% | 2% |
| Directorate | 120 | 43 | 23% | 215 | 2.3 | 9.9 | 37 | 746 | 40 | 0% | 25.2 | 100% | 11% |
| Knights | 120 | 43 | 63% | 139 | 8.3 | 2.1 | 71 | 804 | 41 | 0% | 11.4 | 100% | 11% |

## Per chair

| Slot | Matches | Decided | Win rate | Navies that sat here |
| --- | --- | --- | --- | --- |
| 0 | 120 | 43 | 7% | Consortium, Commune, Directorate, Knights |
| 1 | 120 | 43 | 19% | Consortium, Commune, Directorate, Knights |
| 2 | 120 | 43 | 26% | Consortium, Commune, Directorate, Knights |
| 3 | 120 | 43 | 49% | Consortium, Commune, Directorate, Knights |

_The spawn, not the navy. `--matchup` binds a faction to a spawn by its position in the list, so this column and the one above it are the two marginals of one table — and on `ventfront-divide` this is the bigger of them._

## Hulls per match — built / lost

| Hull | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Light Scout | 0.0 / 1.0 | 4.3 / 5.2 | 10.5 / 11.2 | 0.0 / 1.0 |
| Corvette | 0.0 / 0.0 | 0.0 / 0.0 | 3.6 / 3.2 | 0.0 / 0.0 |
| Harvester | 8.2 / 8.3 | 13.2 / 13.3 | 7.2 / 7.2 | 9.8 / 7.3 |
| Chorister | 0.0 / 0.0 | 1.8 / 1.7 | 0.0 / 2.0 | 0.0 / 0.0 |
| Clarion | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 1.5 |
| Bulwark | 0.1 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spinner | 0.0 / 0.0 | 1.1 / 0.6 | 0.0 / 0.0 | 0.0 / 0.0 |
| Sower | 0.0 / 0.0 | 0.3 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Dredge | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reciter | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.7 / 0.5 |
| Freighter | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Verger | 0.0 / 0.0 | 0.0 / 0.0 | 0.5 / 0.2 | 0.0 / 0.0 |
| Beacon | 3.0 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Glider | 0.0 / 0.0 | 2.3 / 2.3 | 0.0 / 0.0 | 0.0 / 0.0 |
| Acolyte | 0.0 / 0.0 | 0.0 / 0.0 | 1.4 / 1.2 | 0.0 / 0.0 |
| Herald | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.2 / 0.4 |
| Broadside | 0.7 / 0.3 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Weaver | 0.0 / 0.0 | 0.7 / 0.4 | 0.0 / 0.0 | 0.0 / 0.0 |
| Thurible | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.2 | 0.0 / 0.0 |
| Lance | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.3 / 0.0 |
| Furnace | 0.6 / 0.5 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Lure | 0.0 / 0.0 | 0.0 / 0.0 | 0.1 / 0.0 | 0.0 / 0.0 |
| Tocsin | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Caisson | 1.1 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Reed | 0.0 / 0.0 | 1.1 / 3.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Bower | 0.0 / 0.0 | 0.2 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 |
| Derrick | 1.0 / 0.9 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Responsory | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 1.3 / 0.7 |
| Gantry | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |
| Spark | 0.1 / 0.1 | 0.0 / 0.0 | 0.0 / 0.0 | 0.0 / 0.0 |

_The opening escort is not counted as built: it is a gift, not a decision._

## Structures commissioned per match

| Structure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Nodule Refinery | 1.1 | 1.0 | 1.1 | 1.2 |
| Sentinel Turret | 0.7 | 0.6 | 0.8 | 0.7 |
| Sounding Spire | 0.0 | 0.0 | 0.0 | 0.1 |
| Vent Tap | 0.8 | 1.1 | 1.4 | 1.0 |
| Slipway | 1.0 | 0.9 | 0.8 | 1.0 |
| Bio-Reactor | 0.0 | 1.0 | 1.1 | 0.0 |

_The opening Bastion and Foundry are not counted: they are a gift, not a decision._

## The ordnance want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Broadside | Weaver | Thurible | Lance |
| Observations reaching the want | 204513 | 196029 | 207181 | 257048 |
| Blocked: not escorted | 36832 (18%) | 65617 (33%) | 119538 (58%) | 146601 (57%) |
| Blocked: no free yard | 45915 (22%) | 9871 (5%) | 32791 (16%) | 4273 (2%) |
| Blocked: no berth | 0 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 19246 (9%) | 21166 (11%) | 30543 (15%) | 76878 (30%) |
| Already has one | 102438 (50%) | 99288 (51%) | 24278 (12%) | 29266 (11%) |
| **Bought** | 82 (0%) | 87 (0%) | 31 (0%) | 30 (0%) |

_The six reasons partition the want: every observation that reaches it increments exactly one, so the six sum to the row above them. A navy whose **bought** cell is 0 never put its own declared ordnance hull in the water, and the largest blocked row says which gate to argue with (#698)._

## The carrier want — where it was stopped

| Reason | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Hull wanted | Gantry | Rootstock | Succentor | Offertory |
| Observations reaching the want | 204349 | 195750 | 207142 | 256897 |
| Blocked: not escorted | 89118 (44%) | 136318 (70%) | 129746 (63%) | 157067 (61%) |
| Blocked: no free yard | 49866 (24%) | 34398 (18%) | 32805 (16%) | 4285 (2%) |
| Blocked: no berth | 0 (0%) | 52 (0%) | 1684 (1%) | 0 (0%) |
| Yielded to the Sower or the Bower | 0 (0%) | 23322 (12%) | 0 (0%) | 0 (0%) |
| Blocked: cannot afford | 63749 (31%) | 1660 (1%) | 42907 (21%) | 95545 (37%) |
| Already has one | 1615 (1%) | 0 (0%) | 0 (0%) | 0 (0%) |
| **Bought** | 1 (0%) | 0 (0%) | 0 (0%) | 0 (0%) |
| _Shut before the purse, with the price in it_ | 1144 (1%) | 1465 (1%) | 210 (0%) | 0 (0%) |

_The same six reasons and a seventh, partitioning the same way. A navy whose **bought** cell is 0 never put its deck in the water. Every carrier is a Slipway hull, so a free yard is one that has risen, and "no free yard" counts the escorted observations before the rung stood as well as those at a busy yard. "Yielded" is an observation at which the Sower's or the Bower's want was open, so the deck neither bought nor bid: below them in the order of purchase, by the ruling on #839. Only the Commune names either hull. The last row is not a reason and joins no sum: of the observations the escort, the yard, the berths or the yield shut, it counts those at which the purse already held the deck's price. It is a floor on what the gates cost and not a ceiling: a shut gate also stops the deck bidding, so the bank never saved toward it (#915)._

## The bank against the rung — the most nodules ever held at once

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Peak in a match, median | 650 | 610 | 630 | 616 |
| Peak in any match | 860 | 690 | 1060 | 766 |
| Best peak above the opening 600 | 260 | 90 | 460 | 166 |
| Matches with a Slipway standing | 117 | 105 | 97 | 115 |
| Peak with the yard up, median | 430 | 360 | 320 | 389 |
| Peak with the yard up, best | 860 | 600 | 1060 | 766 |

_The opening stockpile is 600 nodules and a Slipway costs 600, so a peak at the opening is the gift rather than savings — the row above it is what a navy ever banked on top of what it was handed. The rung rows are read over the matches that raised a Slipway, and are "—" for a navy that raised none._

## The nodule round trip — what the depots took in

| Measure | Consortium | Commune | Directorate | Knights |
| --- | --- | --- | --- | --- |
| Deliveries a match | 42.2 | 61.5 | 62.7 | 64.5 |
| Nodules delivered a match | 2920 | 3048 | 3115 | 3205 |
| Nodules banked a match | 2904 | 3028 | 3101 | 2889 |
| Mean hold delivered | 69.3 | 49.6 | 49.7 | 49.7 |
| Nodules lost in transit a match | 137 | 174 | 148 | 88 |
| Lost as a share of what was cut | 4% | 5% | 5% | 3% |
| Harvester-time laden | 26% | 30% | 35% | 26% |
| Harvester-time stalled | 0% | 0% | 0% | 0% |

_Delivered is what reached a depot; banked is what the account rose by. The Order is this table's own control and is meant to differ, by both of economy.md §6's nodule terms — half of each hold (`HADRON.NODULE_YIELD_MULTIPLIER`) taken off, and the tithe (`HADRON.TITHE_PER_S` a second) put back on. The gap printed is what is left of the larger term after the smaller one, plus the netting below. For the other three, weigh a gap rather than read it as a defect: banked is a per-observation delta, so a purchase in the same pass as a deposit nets against it. Lost in transit is ore that was cut and died with its hauler, which no income column can show. Laden is any second with a hold aboard, so it is the cut after the first bite plus the haul home, not the haul alone. Stalled counts a harvester the server reports as out of work, never one throttled down on purpose._

_A verdict of "held" means the failure that guard-rail describes did not appear in these runs. It is evidence, not proof; weigh it against the sample size._
