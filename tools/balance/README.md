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

Three of the per-faction tables answer the question a roster wave is judged on, and they are
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

## Three things to know before trusting a number

**The seed places the Drift and nothing else.** Terrain is authored, hazard timings come
from site positions, combat rolls nothing, and the AI draws no dice. `--no-fauna` therefore
makes the seed inert, and ten runs become one match ten times — the CLI warns and marks the
report when that happens.

**"Held" is evidence, not proof.** It means the failure that guard-rail describes did not
appear in these runs. The sample size is printed beside every verdict.

**A duel is short, and no flag makes it longer.** The six pairings run to a median of 272 to
650 seconds against a 25-minute cap, because a duel ends when one commander concedes rather
than when the clock runs out — so raising `--max-minutes` on a duel changes nothing. Anything
that arrives late in a match is measurable in the four-faction baseline (a 1,006 s median)
and not in a duel: the Slipway rises around 420 s, which is most of a duel's whole length.

**A win rate counts decided matches, and most batches are short of them.** Two rails read
win rates, and a win rate is a ratio over matches that ended with a winner — not over matches
run. A thirty-match batch in which twenty-nine timed out carries one decided match, and the
faction that won it reads 100%. Both rails refuse to rule below ten decided matches and say
so in their reading; the per-faction table prints the denominator in its own column, and a
win rate over no decided matches prints as `—` rather than as `0%`.

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
