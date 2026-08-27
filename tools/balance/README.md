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

## Three things to know before trusting a number

**The seed places the Drift and nothing else.** Terrain is authored, hazard timings come
from site positions, combat rolls nothing, and the AI draws no dice. `--no-fauna` therefore
makes the seed inert, and ten runs become one match ten times — the CLI warns and marks the
report when that happens.

**"Held" is evidence, not proof.** It means the failure that guard-rail describes did not
appear in these runs. The sample size is printed beside every verdict.

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
