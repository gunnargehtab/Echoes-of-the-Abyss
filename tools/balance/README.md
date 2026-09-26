# Balance harness

Headless matches, telemetry, and a verdict against every guard-rail the design bible names.

```bash
node tools/balance/run.mjs --help
node tools/balance/run.mjs --matchup consortium,commune --matches 10
```

`run.mjs` is a launcher. The harness itself is `packages/backend/src/balance/`, because it
imports `Match` and `AiSeat` and those are backend TypeScript with real `.ts` import
extensions under `moduleResolution: bundler` — running them from outside the workspace would
mean a second copy of the backend's build config whose only job is to drift.

## What it is for

`packages/shared/src/constants.ts` is full of numbers tagged TUNABLE. This is how you move
one with an argument behind it:

```bash
node tools/balance/run.mjs --matchup consortium,commune --matches 10 \
  --out baselines/before.md
node tools/balance/run.mjs --matchup consortium,commune --matches 10 \
  --set HARVEST_THROTTLE.Overburden.cargoMultiplier=1.0 \
  --out baselines/after.md
```

Both files are Markdown tables, so the pull request that changes the constant can carry the
diff that justifies it.

## One process per match

The harness runs each match in its own process, `--jobs` of them at a time and one per core
by default. That is a correctness rule before it is a speed one.

`bitecs` keeps its entity cursor and its freed-id list in *module* scope, shared by every
world in a process, and recycles a freed id once a thousand have been returned — which one
twenty-five-minute four-faction match comfortably exceeds. Looped in one process, a batch
therefore builds each new world on the previous matches' dead ids, with their component data
still sitting behind those ids, and a match's result comes to depend on its position in the
batch. Measured on `ventfront-divide`: seed 4001 alone matched the second match of a looped
batch, and seeds 4007, 4014, 4021 and 4029 did not match the eighth, fifteenth, twenty-second
and thirtieth. Resetting the entity cursor between matches is not enough — the ids come back,
the component arrays behind them do not empty.

Two consequences worth knowing. `--set` overrides are applied inside every worker, from the
same argv each one re-parses, because constants are per-process and a batch whose overrides
lived only in the parent would report a "before" as an "after". And `--in-process` still runs
the old single-process loop, for attaching a debugger to a batch; it warns, because results
past the first few matches are not reproducible.

## What a report says about a wave

Four of the per-faction tables answer the question a roster wave is judged on, and they are
meant to be read together — none of them means much alone.

**Hulls per match — built / lost.** A loss column cannot tell a hull that was never built
from one that was built and lived, and those are opposite findings about a wave. #518 was
opened on three zeros in the loss half and read them as "never built"; only the other half
can say so.

**Structures commissioned per match.** How far up its own tech tree a navy actually got.
Counted on the *rise* rather than on the order, because a commander whose placement the
server refuses asks again on every observation. The opening Bastion and Foundry are excluded
for the reason the opening stockpile is not income: they are a gift, not a decision.

**Nodules, Crystal and Biomass per minute.** Half the roster is priced in crystal or Biomass
(`docs/economy.md` §8), so a navy that cannot fill those accounts cannot field what they buy
however well it saves. The Directorate is the case that made the column necessary: it
commissions a Slipway in nine matches of ten and builds neither hull the yard is for.

**The ordnance want — where it was stopped.** The three tables above say *whether* a navy
fielded its declared ordnance hull. None of them can say *why not*, and the answer differs
per navy: measured on ten seeds for #698, the Order is stopped by the escort gate in 82% of the
observations that reached this want, the Directorate by the yard in 67% of its own, and the
Commune by the purse in 36% — one zero in the build column, three different remedies. The
denominator is the row the table prints, *observations reaching the want*, and not the
commander's observations: most of those return earlier, at the harvester or the scout. The six reasons partition
the want, so they sum to the observations that reached it and each cell carries its share of
them. *No berth* is a yard free and too few berths left to crew the hull (`docs/economy.md`
§10, #854). Before #854 that observation read *bought* when the purse could pay, although the
server refused the order. A `Bought` cell at zero means that navy never once ordered the hull its own doctrine
declares; the largest blocked row above it says which gate to argue with. This is a count of
*decisions* rather than of the water, so unlike every other series here it comes from the
commander rather than from a snapshot — see `MatchTelemetry.finish`.

**The carrier want — where it was stopped.** The same six reasons for each navy's carrier
(#839), since its want is gated the same way: behind the escort, one only, at a yard, in the
berths, out of the purse. `docs/roster-plan.md` §2 says a hull the commander never buys does not exist in the
baseline, and this table says which gate kept it out. Every carrier is a Slipway hull, so *no
free yard* counts the escorted observations before the rung stood as well as those at a busy
yard. A seventh reason, *yielded to the Sower or the Bower*, is the owner's ruling on #839: the
carrier's want sits below those two in the order of purchase, so while either is open it
neither buys nor bids. Only the Commune names either hull, so the row reads zero for the other
three. The last row, in italics, is not a reason and joins no sum (#915). Of the observations
the escort, the yard, the berths or the yield shut, it counts those at which the purse already
held the deck's price: the shut gate alone stood between the deck and a purchase. The purse is
asked last, so the largest blocked row cannot say that. The row is a floor and not a ceiling:
a shut gate also stops the deck bidding, so the bank never saved toward it, and what opening a
gate would buy takes a run with the gate open.

**The bank against the rung.** The most nodules a navy ever held at one instant, and the most
it held once a Slipway was standing. The tables above are rates and counts, and none of
them can say whether a hull was ever *affordable* — which is a maximum, and a maximum a
ten-second sample misses, because a bank rises to a price and is spent inside one interval.
Issue #518 spent five sessions reading the arbitration between a commander's wants before
this column said the money was never there: peak bank with a yard up is under 400 for the
Consortium against a 700 nodule Bulwark, and the peak over the whole match is 600–680 against
a 600 nodule yard. Read it before attributing a row of zeros to how a commander spends.

**The nodule round trip.** Every table above this one is an *account*: what the bank held,
what rose into it, how fast. None of them can say whether a navy is **paid what it mines**,
because a flat bank reads identically whether the ore never left the field, never reached a
depot, or arrived and was spent the same second. This table is the other side of that ledger
— what the depots took in, counted one hold at a time, plus the ore that was cut and went
down with its hauler, which no income column can show at all.

Read `Nodules delivered a match` against `Nodules banked a match`. Only two paths in the tree
credit nodules — the deposit in `systems/harvest.ts` and the Order's tithe in
`systems/tithe.ts` — so for three of the four navies those two figures are the same number
arrived at from opposite ends.

The Knights are the table's own control, and their row carries **both** of the nodule terms
`docs/economy.md` §6 gives that navy, not just the famous one:

```text
banked  ≈  delivered × HADRON.NODULE_YIELD_MULTIPLIER  +  HADRON.TITHE_PER_S × seconds
```

**Both terms, because the printed gap is their difference and neither alone predicts it.** The
half-yield pulls banked down and the tithe pushes it back up, and over the thirty stored seeds
the half-yield is the larger by some four hundred nodules: it takes **1,452** off a delivered
column of 2,904 and the tithe puts **1,018** back over a mean 1,018 s alive, leaving **434** —
and the **440** the table prints is that plus the same ~6 nodules of purchase-netting the other
three rows carry, the first bias in the table below. Name only the multiplier and a reader
expects 1,452 and finds
2,464 — a thousand-nodule excess that is the doctrine rather than a fault. What the control
actually buys is this: an instrument that had quietly ended up reading the bank twice would
report the Knights' two columns *equal*.

**A gap between the two columns is a magnitude to weigh, not a defect on sight.** Three biases
sit between them, all one-directional, and the largest is on the banked side:

| Bias | Direction | Size |
| --- | --- | --- |
| A purchase inside the same 200 ms pass as a deposit nets against `nodulesEarned` | banked down | up to a whole hold per delivery. Over the thirty stored seeds it means 0.20% of the delivered column for the Consortium, 0.31% for the Commune and 0.32% for the Directorate; the largest in any single match is 100 nodules, two holds, in a 22-minute one |
| A hold is recorded as the harvester was last seen carrying it | delivered down | up to one observation's mining, 2 nodules |
| A hold whose hull dies in the pass it empties in is counted as lost | delivered down, lost up | one hold per death |

**`Harvester-time laden` is any second with a nodule hold aboard**, which begins at the first
bite rather than at the turn for home — so it is the cut and the haul together, not the haul
alone. On the commander-free match the split is 39 points of hauling against 19 of cutting with
a partial hold, so reading the column as the walk home overstates it by half. The harvest mode
is not in the snapshot, which is why the counter cannot separate the two.

**The ledger closes exactly only where nothing is bought.** That is not a limitation of the
counters, it is the first bias above, and it is why `balance.test.ts` holds the equality on a
match with no commander in it — three navies, nothing purchased, and delivered equals banked
to zero nodules, the Order's §6 identity included.

This was built for #706, where the Commune's bank never once rises above its opening 600 in
thirty matches and nothing in the harness could say whether that was a price problem or a
payment one.

## Three things to know before trusting a number

**The seed places the Drift and nothing else.** Terrain is authored, hazard timings come
from site positions, combat rolls nothing, and the AI draws no dice. `--no-fauna` therefore
makes the seed inert, and ten runs become one match ten times — the CLI warns and marks the
report when that happens.

**"And nothing else" is not "and so it barely matters".** Placing the Drift is the largest
single determinant of who wins a match on `ventfront-divide` — larger, measured, than the
difference between two navies' doctrines. See the next entry.

**The chair is a variable, and `--matchup` pins it.** The spec binds each faction to a spawn
by its position in the list: the entry index *is* the slot. So a batch measures one seating,
and a win rate out of one seating cannot separate a doctrine from the corner it started in.

That is not a theoretical caveat. Four seats of *one* navy — doctrine held perfectly
constant, so every remaining difference is the furniture — win 11% / 28% / 50% / 11% by
slot across 109 decided matches and three different navies. Rotating the seat order in the
four-faction baseline moves the Directorate from 75% to 31% and the Knights from 15% to 56%
on identical seeds, and moves which navy the "one navy is simply stronger" rail names.

`baselines/seat-rotation.md` is that measurement, including the two hypotheses it kills:
the map is symmetric in every field the simulation reads, and with fauna off a mirror match
is a perfect tie, so the asymmetry is the Drift's placement rather than the ground or a slot
ordering in the sim.

**Rotate the seating before you attribute a win rate to a navy**, and pool the rotations —
four batches with the matchup cycled gives each faction each chair exactly once, which is
what makes the per-faction column mean the doctrine again. `--rotate-seats` is that, in one
command:

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights \
  --matches 30 --seed 4000 --max-minutes 25 --rotate-seats
```

Every seed is played once per cyclic rotation, so the batch is four times the size and the
report is the pool. Cyclic rather than all twenty-four permutations because balancing the
two marginals against each other is the whole requirement, and that costs four batches
rather than twenty-four.

### The duel matrix

`--duel-matrix` is the same argument on the other axis: every *ordered* pair of
`--matchup`, pooled. Four factions give twelve batches — six pairings, each way round.

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights \
  --duel-matrix --matches 10 --seed 4000 --max-minutes 25
```

`baselines/duel-matrix.md` is the committed run, and it exists because #518 spent its whole
life quoting a six-duel table nobody could reproduce. A duel is where the Slipway is hardest
to reach — two commanders, a smaller map share each — so it is the scenario a roster wave
whose hulls sit behind the rung is actually judged in, and it had never been one command.

Ordered rather than unordered pairs for the reason above it: with two seats one navy always
takes `spawns[0]`, so a pairing played one way round cannot separate the doctrine from the
chair. The report says which it is — `12 seatings over 6 rosters, pooled` rather than
`4 seatings, pooled` — because a win rate pooled over a *matrix* is against different
opponents as well as different chairs, and that is the wider claim.

Mutually exclusive with `--rotate-seats`, which owns the same axis and is refused with a
message saying so.

It is **opt-in**, and that is a decision rather than an oversight: on by default it would
multiply every batch's cost by its seat count and make every baseline committed here
incomparable with the next one. `baselines/four-faction-rotated.md` is the committed pool,
and `baselines/directorate-leads.md` is what #600's four leads read off it — which is the
short answer to what a rotated batch is for.

Two things the report then says that it cannot say without this:

- **A seating line under the header.** `4 seatings, pooled` or `One seating: ... a win rate
  here cannot separate the doctrine from the chair`. The seed range is identical either way,
  so nothing else on the page distinguishes them.
- **A `Per chair` table**, the other marginal of the same table the per-faction rows are one
  marginal of, printed only when the two can differ — a rotation, where a slot hosts several
  navies, or a mirror, where a navy holds several slots. In a single-seating four-faction
  batch it would be the faction table relabelled, so it is omitted.

The `one navy is simply stronger` rail also prints the count inside its own reading, because
`Directorate 75%` out of one seating and `Directorate 57%` pooled over four are different
claims and it spent fourteen baselines unable to say which it was making (#600).

**"Held" is evidence, not proof.** It means the failure that guard-rail describes did not
appear in these runs. The sample size is printed beside every verdict.

**A duel is short, and no flag makes it longer.** The pairings run to a median of 333 to
1,008 seconds against a 25-minute cap, because a duel ends when one commander concedes rather
than when the clock runs out — so raising `--max-minutes` on a duel changes nothing. The
Slipway rises around 420 s, which is a large share of a duel's whole length.

**That is no longer the same as "a duel cannot see the rung", and the distinction is #518's.**
Over the committed matrix the yard is commissioned 0.4, 0.1, 0.2 and 0.2 times a match and
stands in 23, 3, 13 and 11 matches of 60 — so a duel *does* reach it. What a duel cannot do
is pay for what it builds: the peak bank with a yard standing has a median of 330, 60, 250
and 261 against hulls priced 260 to 700, and exactly two of the thirteen Slipway hulls ever
come off the slip (the Knights' Reciter at 0.3 a match, the Consortium's Broadside at 0.1).
Read the two tables together before concluding anything about a hull from a row of zeros.

**A win rate counts decided matches, and most batches are short of them.** Three rails read
win rates, and a win rate is a ratio over matches that ended with a winner — not over matches
run. A thirty-match batch in which twenty-nine timed out carries one decided match, and the
faction that won it reads 100%. All three refuse to rule below ten decided matches and say
so in their reading; the per-faction table prints the denominator in its own column, and a
win rate over no decided matches prints as `—` rather than as `0%`.

**One of those three is about the batch and not about a faction.** "One navy is simply
stronger" reads the best win rate in the table against twice parity — 50% of a four-seat
batch — and it exists because the other five rails each test one named doctrine's failure,
so a batch in which any single seat runs away reads five-for-five green. It did, for
fourteen consecutive baselines. The bar scales with the seat count, which means it is 100%
in a duel: no win rate can clear it, so a two-seat matchup gets `no data` rather than a
`held` from a test that could not fail.

## `baselines/`

Committed results, so a future change has something to be compared against. Regenerate with
the command recorded in each file's header.

Related: `docs/playtest-checklist.md` · `docs/tech-stack.md` · `docs/economy.md` §9 ·
`docs/bestiary.md` §8

## What is committed here

The Markdown reports, and not their JSON siblings. A committed baseline exists so a future
change has something to be compared against *in a diff*, and a 200 KB JSON diff is not
something anyone reads. Each report carries the command that produced it, so the JSON is one
command away when you want to plot a series.
