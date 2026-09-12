# Skill A/B harness

Does a vendored skill in `.claude/skills/` improve what comes out, and what does it
cost to find out? This directory holds the apparatus for answering that one experiment
at a time. It is agent tooling, not game code: nothing here is imported by
`packages/` or `tools/`, and it sits outside every gate `npm run gates` runs.

`.claude/VENDORED-SKILLS.md` says why each skill was taken. This says how to find out
whether it was worth taking.

## What the first experiment measures

Experiment `627` runs [issue #627](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/627),
per-room exception containment, against the vendored `colyseus` skill.

It was chosen because the skill's value here is **negative and specific**. The skill
documents 0.18; `@colyseus/core` is pinned to `^0.15.57`; the skill's own Step 1 tells
the reader to stop and follow the pinned version's docs. So the thing to measure is
not better code, it is whether an arm writes a 0.17/0.18 API shape into a 0.15 room —
and that is a pre-registerable, machine-checkable event rather than a judgement.
Issue #627 puts an arm directly onto that surface: `onUncaughtException`, `onLeave`,
the `Room` generic and 32 message handlers.

## The finding that shapes the arm list

**`CLAUDE.md` already carries the guard**, in the Colyseus paragraph under
"Conventions": the skill documents 0.18, four minors ahead of what is pinned, and is
carried against exactly this drift. A control arm that keeps `CLAUDE.md` intact is
therefore not an unguarded control.

That is not a flaw to design out. It is the decision-relevant question — the repository
already pays about 1,150 tokens per session for eleven skill descriptions, and the
`colyseus` skill's body is roughly 4,300 tokens with about 60,000 more in references
it may pull, all to say "not applicable here". If three sentences of `CLAUDE.md` do the
same job, the skill is dead weight. So arm B measures the skill's value *over the
paragraph*, which is what a keep-or-drop decision turns on, and arm C prices the guard
outright.

| Arm | `.claude/skills/colyseus` | `CLAUDE.md` guard | Answers |
| --- | --- | --- | --- |
| A | present | present | the status quo |
| B | absent | present | is the skill worth its tokens given `CLAUDE.md`? |
| C | absent | absent | is *any* guard needed, or does recall get 0.15 right unaided? |

A and B are the pair. C is optional and costs one more run; without it a clean B is
ambiguous between "the skill is redundant" and "no guard was ever needed".

## Running an arm

```bash
.claude/skill-eval/prepare-arm.sh 627 a f7bf3f5    # then b, then optionally c
```

**Experiment 627's base is `f7bf3f5`, not `main`.** #627 was closed by #687 while
this harness was being written, so every later commit already carries the work the
arms are asked to do. An arm cut from today's `main` would open the issue, find it
finished, and measure nothing. `f7bf3f5` is the last commit with the issue open, the
skill on disk and the `CLAUDE.md` guard intact.

That failure mode is not specific to this experiment: **an experiment whose task
lands while the harness is being built is silently dead**, because every criterion
reads as already satisfied. `score.mjs` reports a criterion the base already meets as
`VACUOUS` rather than passing it, which is the signal to re-cut from an earlier base.

Cut every arm of one experiment from the same base, in one sitting. Arms cut days apart
from a moving `main` are not comparable.

`traps.json` is the pre-registered answer key, and an arm that could read it would be
graded on a test it had seen. Since this harness now lives on `main`, `prepare-arm.sh`
strips `.claude/skill-eval` from the arm as it cuts it, and asserts it is gone — along
with the skill and guard state the arm is supposed to have — before it will push. The
invariant is that the *arm* does not carry the answer key, not that the base never had
it.

Then start **one fresh session per arm** on its branch, so token accounting is clean,
and give it `627/PROMPT.md` verbatim and nothing else. The prompt is neutral: it
mentions no skill and no experiment. Under Claude Code Remote that is
`create_session` with `source_revision` set to the arm branch.

**The prompt states the task in full rather than pointing at the issue**, and forbids
reading other branches and pull requests. It has to. #627 is closed on GitHub with the
merged #687 linked from it as the pull request that closed it, so an arm told to "read
the issue" is one tool call from the finished answer and would be graded on its ability
to copy. Any experiment whose task has ever been completed on this repository has the
same problem: inline the task, and say not to go looking.

The arms must differ in one thing only. Same prompt, same model, same base commit,
same permission mode.

## Scoring

Three numbers per arm, and only the first is automated.

```bash
node .claude/skill-eval/score.mjs --experiment 627 --range origin/main...HEAD --arm a --json arm-a.json
npm run gates            # the repository's own finish line: one exit code for "would pass CI"
```

- **Traps** — `score.mjs` grades the diff's *added lines* against `627/traps.json`.
  Whole-tree scanning would be useless here: `extends Room<MatchState>` is the correct
  0.15 form and appears on main, and `from 'colyseus'` appears inside the comment
  warning against it. What an arm wrote is the only thing an arm can be graded on.
  Traps are grouped `drift` (attributable to the skill), `house` (`CLAUDE.md` rules,
  identical in every arm, so a sanity check rather than a measurement) and `criterion`
  (issue #627's own acceptance criteria).
- **Gates** — `npm run gates`, pass or fail, plus which gate failed.
- **Cost** — total tokens and wall clock for the session, read off the arm's own
  session. This is the half the trap table cannot see: an arm can score a clean sweep
  and still have read 60,000 tokens of 0.18 reference material to get there.

`score.mjs --selftest` runs every trap against a fixture built to trip all of them,
per trap rather than by count, and exits non-zero if any pattern never fires. A trap
file that cannot catch its own trap measures nothing, so run it before trusting a
result.

## Record

| Arm | Blocking traps | Tells | Gates | Tokens | Wall clock |
| --- | --- | --- | --- | --- | --- |
| A | | | | | |
| B | | | | | |
| C | | | | | |

## What this cannot tell you

One issue per arm is a sample of one, and the same prompt run twice does not produce
the same diff. A clean sweep in both arms is weak evidence of redundancy; a drift trap
tripping in B and not in A is strong evidence the guard works, because the trap was
named before either arm ran. Treat a single run as a screen, not a verdict, and read
it alongside the token column rather than instead of it.

Issue #652 is the only work in the backlog with enough repeated, near-identical units
to beat this — twenty structure ports, splittable ten and ten, with `check.mjs` giving
a part-for-part verdict on each.
