# Seat rotation — what a win rate measures when the chair is fixed

`--matchup` binds each faction to a spawn by its position in the list: `cli.ts` parses the
spec with the entry index as the slot, and `runner.ts` hands that slot straight to
`Match.addPlayer`. So a batch measures one *seating*, not one matchup, and every
four-faction baseline this repository has committed seated the Directorate in slot 2 and
nobody else there.

This file is what happens when you rotate that seating and change nothing else. It was
produced for #600, whose first question is whether the Directorate's breach of
[economy.md](../../docs/economy.md) §9 is its doctrine or its commander.

The answer is: partly neither. **The chair is worth more than any doctrine on this table.**

## The four rotations

Same seeds, same cap, same map, same commanders. Only the seat order differs.

```bash
node tools/balance/run.mjs --matchup consortium,commune,directorate,knights --matches 30 --seed 4000 --max-minutes 25
node tools/balance/run.mjs --matchup knights,consortium,commune,directorate --matches 30 --seed 4000 --max-minutes 25
node tools/balance/run.mjs --matchup directorate,knights,consortium,commune --matches 30 --seed 4000 --max-minutes 25
node tools/balance/run.mjs --matchup commune,directorate,knights,consortium --matches 30 --seed 4000 --max-minutes 25
```

The first is the committed four-faction baseline's own command, and it reproduces it
exactly — same win rates, same income columns, same verdicts.

| Seat order | Decided | Consortium | Commune | Directorate | Knights | Rail reads |
| --- | --- | --- | --- | --- | --- | --- |
| consortium, commune, directorate, knights | 20 | 0% | 10% | **75%** | 15% | Directorate, **breached** |
| knights, consortium, commune, directorate | 16 | 0% | 13% | 31% | **56%** | Knights, **breached** |
| directorate, knights, consortium, commune | 5 | 20% | 0% | **80%** | 0% | no data (n < 10) |
| commune, directorate, knights, consortium | 8 | 0% | 13% | **50%** | 38% | no data (n < 10) |

Permuting the seating moves the Directorate from 75% to 31% and the Knights from 15% to
56%, on identical seeds. It also decides how many matches decide at all: 20, 16, 5, 8.

Pooled over all four seatings — each faction sits in each chair exactly once, so the two
marginals are balanced against each other:

| Pooled over four seatings, 49 decided | Win rate |
| --- | --- |
| Directorate | 57% (28/49) |
| Knights | 31% (15/49) |
| Commune | 10% (5/49) |
| Consortium | 2% (1/49) |

| The chair, doctrine varying, 49 decided | Win rate |
| --- | --- |
| slot 0 | 29% (14/49) |
| slot 1 | 12% (6/49) |
| slot 2 | 43% (21/49) |
| slot 3 | 16% (8/49) |

The Directorate is still ahead of the field, and still over §9's bar — but at 57%, not at
75%. Eighteen points of the committed reading is the chair it was sitting in.

## The mirrors — the chair with doctrine held constant

Four seats of one navy, so the doctrine cannot vary at all and every remaining difference
is the seating.

```bash
node tools/balance/run.mjs --matchup directorate,directorate,directorate,directorate --matches 90 --seed 4000 --max-minutes 25
node tools/balance/run.mjs --matchup knights,knights,knights,knights --matches 90 --seed 4000 --max-minutes 25
node tools/balance/run.mjs --matchup commune,commune,commune,commune --matches 90 --seed 4000 --max-minutes 25
```

| Mirror | Decided | slot 0 | slot 1 | slot 2 | slot 3 |
| --- | --- | --- | --- | --- | --- |
| Directorate | 37 | 5% | 38% | 51% | 5% |
| Knights | 19 | 11% | 11% | 58% | 21% |
| Commune | 53 | 15% | 28% | 45% | 11% |
| **Pooled** | **109** | **11%** | **28%** | **50%** | **11%** |

Slot 2 wins half of every decided match it plays in, against 11% for slot 0 and slot 3.
Three different doctrines, all four seats identical within each batch, 109 decided matches.
The spread is the furniture.

## What it is not

Two hypotheses were tested and both are dead, which is why they are recorded here rather
than left for the next person to re-derive.

**It is not the map's geometry.** `ventfront-divide` is symmetric under an x-mirror, a
y-mirror and a 180° rotation in every field the simulation reads — all 13 terrain regions,
every resource, every spawn. The single feature that breaks mirror symmetry is a pair of
`toxic-brine` hazards sitting on two of the four home nodule fields (slots 0 and 3), and
that pair is inert: [hazards.md](../../docs/hazards.md)'s Implementation Status table lists
Toxic Brine Clouds as "site only — placed and telegraphed, no behaviour". Adding brine to all four home fields
and re-running the Directorate mirror produced a **byte-identical** result — same 37
decided, same 5/38/51/5 — which is the confirmation that nothing reads it.

**It is not an ordering bias in the simulation or the commander.** With `--no-fauna`, four
identical Directorate seats on the symmetric map run the full 25 minutes and end with
`winnerSlot: null` — a perfect tie, nobody able to break it. A sim that quietly favoured a
slot index could not draw that match.

## What is left, and it is the seed

`world.rng` is drawn from in exactly one place in the whole simulation: `Match.seedFauna`,
placing the Drift. The map is symmetric, the sim draws with fauna off, and the chairs are
unequal with fauna on. So the Drift's placement is what makes one corner worth four times
another — and pooled across ninety seeds it does not average out.

The harness has always said the seed places the Drift and nothing else. What this file adds
is that placing the Drift is not a garnish on a match: **it is the largest single
determinant of who wins one**, larger than the difference between two navies' doctrines.

That is a finding about the harness and about `ventfront-divide`, not a tuning conclusion,
and it is deliberately left as one here — see #600.

## How to read a baseline after this

A single-order batch is still worth running and still says something. What it cannot do is
attribute a win rate to a doctrine, because the doctrine and the chair arrive together and
this file measures the chair as the bigger of the two. Rotate the seating before you
conclude anything about a navy, and pool the rotations.

Related: [README.md](../README.md) · [economy.md](../../docs/economy.md) §9 ·
[bestiary.md](../../docs/bestiary.md) §8
