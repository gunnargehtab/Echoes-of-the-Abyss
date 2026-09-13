---
name: dev-loop
description: Run one change as a closed loop — build against an authored target, validate with the gates, capture evidence, hand it to a fresh critic, refine, and stop on a written criterion. Use when a change is large enough that one pass will not get it right, when a session is asked to iterate or refine until something is correct, and as the inner loop work-issue runs once it has claimed an issue. Prefer this over open-ended iteration; the exit criteria and the stall rule are what stop a refine loop from running forever or from polishing a number nobody asked it to move.
---

# Running a change as a closed loop

This is the inner loop. [`work-issue`](../work-issue/SKILL.md) picks *what* to
work on and takes the result to a pull request; [`steward`](../steward/SKILL.md)
drives that pull request to green. This file covers the middle: how to get one
change from "claimed" to "correct" without either stopping too early or
iterating forever.

It is adapted from [dream-loop](https://github.com/achimala/dream-loop) — build
toward a locked target, hand the result to a separate critic, refine on its
feedback, exit on a criterion rather than on a feeling — and from the loop
proposed in #709. What it is *not* is a new task system, a new spec, a new
harness or a new verifier. This repository already has all four, and
[`.claude/AGENTIC-LOOP.md`](../../AGENTIC-LOOP.md) records which is which and
what was deliberately left unbuilt.

## The target is authored, not dreamed

dream-loop's first move is to generate a target screenshot and lock it, because
its user's request is the only specification that exists. **Do not do that
here.** `docs/` is the design bible, it came first, and code transcribes it.
Generating a target would be writing a second specification that the real one
then has to agree with.

So the target is already locked, and locating it is step one of every round:

| Kind of change | The target is |
| --- | --- |
| A mechanic, a unit, an economy path | The `docs/` section that specifies it, and the SPEC constants that cite it |
| A mission | `docs/mission-<name>.md`, beat by beat |
| A screen or a panel | The numbered section of `docs/ui-ux.md` it implements |
| Anything visual | The gates in `docs/graphics-standards.md`, plus the concept art in `docs/concept-art/` |
| A hull, structure or prop | Its `UNIT —` or `STRUCTURE —` block in `docs/asset-prompts-3d.md` |
| The mix | `docs/audio-direction.md`, against readings from `tools/audio-meter` |

If you cannot name the target, you do not have one, and that is the whole
finding. **Stop and say so** rather than inventing one — see "When the loop
stops instead" below. An unattended session that picks a reading of an ambiguous
doc and ships it has written a plausible wrong answer into the design bible,
which is the one failure this loop is built to avoid.

Visual work is the exception that proves the rule: there a target *image* is
right, and the repository already has the idiom for it. Use the committed
concept art and the renders in `docs/concept-art/renders/`, not a fresh
generation.

## The round

Each round is seven steps, and the order matters because it fails cheapest
first.

1. **Read the target.** The doc section, every time, not your memory of it. If
   the target and the code disagree, that is a bug in one of them and which one
   is a design call — see the stop rule.
2. **Implement.** One self-contained increment, not the whole issue. `CLAUDE.md`
   asks for instalments because a session can end mid-change and take the
   container with it.
3. **Self-validate.** `npm run gates`. One command, one exit code, no fail-fast,
   so one run tells you everything that is red. Use `--only=` while you iterate
   on a single gate and drop the filter before the round ends.
4. **Capture evidence.** The gates say the tree is sound. They do not say the
   change does what the doc describes — that needs an artifact a critic can
   look at. See the table below.
5. **Critique.** Hand the target, the diff and the evidence to the
   [`loop-critic`](../../agents/loop-critic.md) subagent, fresh, every round.
6. **Address the verdict.** Fix what it found, or write down why a finding is
   wrong. Both are acceptable; ignoring one is not.
7. **Check the exit criteria.** Below. If they are not met and the loop has not
   stalled, go to step 2.

Steps 3 and 5 are separate on purpose and neither substitutes for the other. A
green `npm run gates` says nothing about whether the change matches its doc; a
satisfied critic says nothing about whether the tree compiles.

### Evidence, by what changed

The critic reads what you give it. Give it the artifact that would show the
fault, which is not the same artifact for every kind of change:

| What changed | Capture |
| --- | --- |
| Echo Layer, detection, propagation | A `tools/echo-sim` scenario — deterministic, and committed beside its `.expected.json` |
| Simulation, missions, combat | The backend test file for it, run alone: `npm -w packages/backend exec -- node --import tsx --test test/<file>.test.ts` |
| Anything rendered, HUD or world | A screenshot through [`run-game`](../run-game/SKILL.md), against a real match |
| A screen, a panel, a control | The frontend test for it, plus the accessibility path — `docs/ui-ux.md` §11 calls accessibility a correctness requirement |
| A hull, structure or prop | [`hull-intake`](../hull-intake/SKILL.md)'s bake and report, then `node tools/hull-models/diff.mjs <slug>` if the model already existed |
| The mix | `tools/audio-meter` readings, taken at the bus |
| A performance path | The counted work, never a stopwatch — `Match.worstStepWork`, `Match.contactPathWalksLastPass`, nodes built per tick |

That last row is a standing rule, not a preference. A wall-clock maximum is the
noisiest statistic on a shared runner and has failed CI on spread alone; a count
is a property of the algorithm and is the same everywhere.

## The critic is a separate agent, and that is structural

One fresh [`loop-critic`](../../agents/loop-critic.md) per round. Not a section
of this file that you read and apply to yourself.

`docs/graphics-standards.md` and #540 already settled the principle in one line:
**a generator that also grades itself is not a gate.** `hull-designer` used to
carry its own "reviewing a bake" section, which meant the author of a shape was
also its only reader — a second draft wearing a review's clothes.
`hull-reviewer` exists because that did not work, and this is the same split for
changes that are not hulls.

Two consequences, neither of them style:

- **The critic cannot edit.** It has no `Edit` and no `Write`. A critic that
  fixes what it finds has authored the fix and is grading itself one level down.
  It reports; you fix; it looks again.
- **The critic starts fresh every round.** Not resumed, not continued. By round
  three you have spent two rounds convincing yourself the approach is sound, and
  that accumulated conviction is exactly the thing a review is supposed to be
  independent of. Pass it the *previous* verdict as text so it can see whether a
  finding survived, but never its previous context.

Where this diverges from `hull-reviewer`: that agent is also pinned *away* from
the authoring model, because a blind spot about shape is aesthetic and travels
with the model. A blind spot about correctness is not that — it is about what
this session has already talked itself into, and fresh context is what cures it.
So the critic is pinned to the strongest reviewer available rather than to a
different one.

## Exit criteria

Stop and take the change to a pull request when **all** of these hold:

- `npm run gates` is green — every gate, not a filtered subset.
- The critic's last verdict is **pass**, or its only open findings are ones you
  have written down a reason for.
- Every acceptance condition the issue states is met, and you can point at the
  evidence for each.
- The change is still an instalment that stands on its own. If it has grown into
  three unrelated things, that is three pull requests.

A round that meets these is finished. Do not run another for polish — this loop
has no notion of a score to maximise, deliberately, and "one more round" with no
open finding is how a bounded loop becomes an unbounded one.

### Stall detection

Two rounds that close no finding the critic had already raised means the
approach is wrong, not that it needs a third attempt. Stop refining and
reconsider the design: re-read the target, and say plainly what about the
current shape cannot satisfy it.

If a reconsidered approach also fails to close a finding, **the loop is stalled
and stops.** Report what you tried, what the critic keeps saying, and what you
would need in order to proceed. Under `work-issue` that is a stopping comment
and a released claim; interactively it is a question to the person at the
keyboard. A loop that reports a stall is working correctly. A loop that keeps
going is not.

## Guardrails

#709 asks for caps, and they translate:

- **Ten rounds per change, hard.** Reaching ten is a stall by definition,
  whatever the critic last said.
- **One increment per round.** If a round's diff touches parts of the tree the
  round's target does not name, split it.
- **Never widen the change to satisfy a finding.** A critic finding about code
  the change does not touch is a note for the issue tracker, not this round's
  work.
- **Push at every self-contained step**, and open the pull request as soon as
  the branch carries an increment that stands on its own. A container can go
  away mid-loop; an unpushed round is a lost round.
- **The gates are run, not predicted.** "This should pass lint" is not step 3.

## Three things the loop must never do

These are the repository's own hard rules, and an autonomous refine loop is
exactly the thing most likely to break them by accident.

- **Never tune for balance.** `CLAUDE.md` freezes it, and a loop that refines
  until a number looks right is the purest form of the thing the freeze exists
  to stop. No exit criterion is a win rate; the critic does not score balance;
  a breached guard-rail reading in `docs/economy.md` §9 is **recorded and left**.
  A *correctness* fault the harness surfaces — a navy that cannot pay for its
  roster, a commander that never builds a structure its waves gate on, an
  economy path that refuses a legal purchase — is not balance and is still a bug
  to fix. If a round's justification is a win rate, it is not the round to run.
- **Never resolve a docs/code disagreement by guessing.** Which one is wrong is
  a design call. Write up both readings and what each would cost; that write-up
  is the run's output and it is a successful run.
- **Never send the client anything it has not resolved.** Not temporarily, not
  to make a round's evidence easier to capture, not behind a debug flag. The
  whole game is hidden information; a client holding unresolved world state is a
  maphack regardless of what it draws.

## Working files

Scratch for a loop — captured screenshots, intermediate harness output, the
verdict you are about to act on — goes in `.dev-loop/` at the repository root.
It is gitignored. Nothing in it is an artifact: a screenshot that belongs to the
change belongs in `docs/screenshots/` through the graphics gates, and a scenario
worth keeping belongs in `tools/echo-sim/scenarios/` with its expected output
beside it.

## Related

`.claude/AGENTIC-LOOP.md` · [`work-issue`](../work-issue/SKILL.md) ·
[`steward`](../steward/SKILL.md) · [`run-game`](../run-game/SKILL.md) ·
[`hull-intake`](../hull-intake/SKILL.md) ·
[`balance-run`](../balance-run/SKILL.md) ·
[`loop-critic`](../../agents/loop-critic.md)
