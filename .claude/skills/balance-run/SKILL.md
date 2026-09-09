---
name: balance-run
description: Run the balance harness and read what comes back — the thirty-match baselines in tools/balance/baselines/, and the before/after pair that justifies moving a TUNABLE constant. Use this whenever a change moves simulation numbers (fauna, economy, AI, tuning constants) and a baseline needs refreshing or a guard-rail needs re-reading. It covers what a run costs, what makes one reproducible, and the traps that make a batch lie.
---

# Balance runs

```bash
node tools/balance/run.mjs \
  --matchup consortium,commune,directorate,knights \
  --matches 30 --seed 4000 --max-minutes 25 \
  --title 'Four-faction baseline' \
  --out tools/balance/baselines/four-faction-baseline.md
```

Writes the Markdown report and a `.json` sibling holding every match's
telemetry. `tools/balance/README.md` is the guide to reading the report; this
is the guide to producing one you can trust.

## One process per match, and why you cannot loop instead

The harness runs each match in its own process, `--jobs` of them at a time
(default: one per core). That is not only for speed. `bitecs` keeps its entity
cursor and freed-id list in module scope, shared by every world in a process,
and recycles freed ids once a thousand have been returned — which one
twenty-five-minute four-faction match comfortably exceeds. Run a batch in one
process and from roughly the third match onward each new world is built on the
previous matches' dead ids, with their component data still in place.

That was measured, not assumed: seed 4001 alone matched the second match of a
looped batch, and seeds 4007, 4014, 4021 and 4029 did not match the eighth,
fifteenth, twenty-second and thirtieth. Resetting the entity cursor between
matches does not fix it — the ids come back but the component arrays behind
them do not empty.

So: **a match's result must not depend on its position in the batch**, and the
only unit that owns its own `bitecs` globals is a process. `--in-process`
still runs the old loop for attaching a debugger to, and warns.

## Costs

Roughly 15–25 s of simulation per twenty-five-minute four-faction match, so a
thirty-match baseline is about 2 minutes on four cores. Each worker is a full
simulation: the box is saturated while a batch runs, so do not start a test
suite alongside one. Background a long batch and read the report when it lands.

## Traps

- **`--no-fauna` makes the seed inert.** Placing the Drift is the only thing
  the simulation draws from `world.rng`, so without it every match in a batch
  is the same match. The harness warns; heed it and run one.
- **`--set` is applied per worker**, from the same argv each worker re-parses.
  If you add a flag to the CLI that changes the simulation, make sure it is not
  in `batch.ts`'s `PARENT_ONLY` list, or workers will not see it.
- **A guard-rail verdict is not a win rate.** The table asserts what the design
  bible names as a risk. A change can leave every verdict `held` and still move
  a faction's win rate ten points, so read the per-faction table too.
- **`--matchup` pins the chair as well as the roster**, because the entry index
  is the spawn slot. One seating cannot separate a doctrine from the corner it
  started in, and on `ventfront-divide` the corner is the bigger of the two:
  four seats of one navy win 11% / 28% / 50% / 11% by slot over 109 decided
  matches. Rotating the seat order moves the Directorate from 75% to 31% and
  changes which navy the "one navy is simply stronger" rail names. Cycle the
  matchup four ways and pool before you attribute a win rate to a navy —
  `tools/balance/baselines/seat-rotation.md` is the measurement and the two
  hypotheses it rules out.
- **Refresh a baseline with the command recorded at the top of its own file**,
  which is the whole point of that line being there. Changing the matchup, the
  seed or the cap makes a different document, not a newer one.

## After a change that moves simulation numbers

Refresh the baseline, then read the diff rather than the file: guard-rail
verdicts first, then per-faction win rates and income, then the match-length
and Drift rows. State any verdict that flipped and any win rate that moved
more than a few points — a stored baseline is the record other people compare
against, so a silent shift in it is worse than a noisy one.

Related: `tools/balance/README.md` · `packages/backend/src/balance/batch.ts` ·
`docs/bestiary.md` §8 · `CLAUDE.md`
