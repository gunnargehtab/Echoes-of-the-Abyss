---
name: dev-loop
description: Run one change as a closed loop — build against an authored target, validate with the gates, capture evidence, hand it to a fresh critic, refine, and stop on a written criterion. Use when a change is large enough that one pass will not get it right, when a session is asked to iterate or refine until something is correct, and as the inner loop work-issue runs once it has claimed an issue. Prefer this over open-ended iteration; the exit criteria and the stall rule are what stop a refine loop from running forever or from polishing a number nobody asked it to move.
---

# Running a change as a closed loop

The inner loop. [`work-issue`](../work-issue/SKILL.md) picks the issue and opens
the pull request; [`steward`](../steward/SKILL.md) drives it to green. This file
takes one change from "claimed" to "correct" in at most three rounds, each graded
by a fresh [`loop-critic`](../../agents/loop-critic.md).
[`.claude/AGENTIC-LOOP.md`](../../AGENTIC-LOOP.md) records where the shape came
from and where each guardrail is enforced.

## The target is authored, not invented

`docs/` is the design bible and code transcribes it. Locating the target is the
first step of every round:

| Kind of change | The target is |
| --- | --- |
| A mechanic, a unit, an economy path | The `docs/` section that specifies it, and the SPEC constants that cite it |
| A mission | `docs/mission-<name>.md`, beat by beat |
| A screen or a panel | The numbered section of `docs/ui-ux.md` it implements |
| Anything visual | The gates in `docs/graphics-standards.md`, and the concept art and renders in `docs/concept-art/` |
| A hull, structure or prop | Its `UNIT —` or `STRUCTURE —` block in `docs/asset-prompts-3d.md` |
| The mix | `docs/audio-direction.md`, against readings from `tools/audio-meter` |
| Tooling, CI, these files | The issue's acceptance criteria, and the file's own header |

**A target that is missing, or reads two ways, is a design call.** Decide it the
way `work-issue` §7 says: options, a recommendation, the recommendation taken. If
the decision is that the doc is wrong or silent, amend the doc section first, then
build against it. Never build against a reading you did not write down.

## The round

Seven steps, cheapest failure first.

1. **Read the target**, the section itself, not your memory of it. **Then read the
   code for anything the change will state as fact** — a comment, a doc line, a
   label, a sentence in the pull request. The target says what the game *should*
   do; only the code says what it *does*. Issue bodies are the worst source: they
   describe a past state in the present tense. False sentences are the finding
   this loop's critics raise most.
2. **Implement** one self-contained increment, not the whole issue.
3. **Self-validate** with `npm run gates`. Iterate with `-- --only=`; drop the
   filter before the round ends. Run it; never predict it.
4. **Capture evidence** that shows the change does what the target says (below).
5. **Critique.** Spawn a fresh `loop-critic` with the brief below.
6. **Address the verdict.** Fix each finding, or write down why it is wrong.
7. **Check the exit criteria.** Not met and not stalled: back to step 2.

Steps 3 and 5 do not substitute for each other. Green gates say nothing about the
doc; a passing critic says nothing about the build.

### Evidence, by what changed

| What changed | Capture |
| --- | --- |
| Echo Layer, detection, propagation | A `tools/echo-sim` scenario, committed beside its `.expected.json` |
| Simulation, missions, combat | The backend test file, run alone: `npm -w packages/backend exec -- node --import tsx --test test/<file>.test.ts` |
| Anything rendered, HUD or world | A screenshot through [`run-game`](../run-game/SKILL.md), against a real match |
| A screen, a panel, a control | Its frontend test, plus the accessibility path (`docs/ui-ux.md` §11) |
| A hull, structure or prop | [`hull-intake`](../hull-intake/SKILL.md)'s bake and report, and `node tools/hull-models/diff.mjs <slug>` for an existing model |
| The mix | `tools/audio-meter` readings, taken at the bus |
| A performance path | Counted work (`Match.worstStepWork`, `Match.contactPathWalksLastPass`, nodes per tick), never a stopwatch |

### The critic's brief

The critic reads what you hand it, and a vague brief costs it an hour. Give it,
as text:

- **Target:** the doc path and section, or the issue's acceptance criteria.
- **Diff:** `git diff origin/main...HEAD`, and from round 2 the delta since the
  last verdict (`git diff <sha>..HEAD`).
- **Evidence:** the commands you ran and their output; the gates' summary line.
- **Decisions:** the options you wrote and the one you took, if any.
- **Previous verdict**, verbatim, from round 2 on. Never its context.

## The critic is a separate agent

One fresh `loop-critic` per round, never resumed, never a section of this file
applied to yourself. **A generator that also grades itself is not a gate** (#540).

- **The critic does not edit.** It has no `Edit` or `Write`, and uses its `Bash`
  only to re-run evidence. A critic that fixes what it finds is grading its own fix.
- **The critic starts fresh.** Pass the previous verdict as text so it can see
  what survived; never its context. By round three the author has talked itself
  into the approach, and fresh context is the cure.

It is pinned to the strongest model rather than a different one: a correctness
blind spot is this session's conviction, not the model's taste.

## Findings have a severity

The critic marks each finding **blocking** or **minor**.

- **Blocking:** behaviour differs from the target, an acceptance criterion is
  unmet, a hard rule is broken, evidence does not reproduce, a decision taken
  without options, or a false sentence another text or a test relies on.
- **Minor:** a local fix checkable by reading it alone — a stale comment, a wording
  slip, a false aside nothing depends on, a missing line of the PR body.

Only blocking findings earn another round. Minor ones are fixed straight away and
checked by the verification pass. A round whose findings are all minor is the last
round.

## Exit criteria

These say when to stop *iterating*. The pull request opened at the first
increment that stood on its own.

Stop when **all** hold:

- `npm run gates` is green, every gate.
- The last verdict is **pass**, or its open findings are minor and fixed, or
  carry a written reason.
- Every acceptance condition **the issue states** is met, with evidence for each.
  Not a stricter bar you set on the way: a critic calling a bar self-imposed is a
  stop signal, not a finding.
- The change is still one instalment.
- The verification pass has covered every edit made after the last verdict.

Do not run a round for polish. There is no score to maximise.

### The verification pass

Every loop ends on edits no critic saw. Before stopping, check just those edits
against four questions — no new scope, no spawned critic, not a round:

- does each fix do what its finding asked;
- does it break a case that used to hold;
- does the positive control still pass;
- did it touch anything its finding did not name?

A stall verdict stops the refining; it does not review the last edit. On #738 the
unreviewed last edit was the fault, past eleven green gates.

### Stalls

**Two rounds that close no blocking finding** mean the approach is wrong.
Reconsider once: re-read the target and say what about the current shape cannot
satisfy it. If the new approach also closes nothing, the loop is stalled: report
what you tried and what the critic keeps saying. Under `work-issue` that is §7's
"does not converge" case.

### The cap: three rounds

**Three rounds per change, hard.** A person set it (18 September); a firing may not
raise it. Round three ends one of two ways:

- **Exit criteria met:** done.
- **Not met:** run the verification pass anyway, push what is green, and list the
  open findings in the pull request body as the critic worded them. Nothing
  landable at all is `work-issue` §7's "does not converge".

Do not buy a round back by skipping the critic, folding two increments into one
round, or calling the verification pass a round. Interactively, the person at the
keyboard may grant a fourth; unattended, three is the end.

## Guardrails

- **One increment per round.** A diff reaching beyond the round's target is split.
- **Never widen the change to satisfy a finding.** A finding about code the change
  does not touch goes to #746.
- **Push at every self-contained step.** An unpushed round is lost with the
  container.

## Three things the loop must never do

- **Never tune for balance.** `CLAUDE.md` freezes it. No exit criterion is a win
  rate, and a breached guard-rail in `docs/economy.md` §9 is recorded and left. A
  correctness fault — a navy that cannot pay for its roster — is still a bug.
- **Never settle a docs/code disagreement silently.** Decide it in the open per
  `work-issue` §7: options in the pull request, the recommendation taken, the doc
  amended first when the doc is what changes.
- **Never send the client anything it has not resolved.** Not temporarily, not
  for easier evidence, not behind a debug flag.

## The pull request is not the transcript

Evidence is long because the critic reads all of it. GitHub gets the conclusion,
in the template's shape: Problem, Options, Solution, three sentences each. One
round and five rounds produce the same body.

## Working files

Scratch — screenshots, harness output, the verdict you are acting on — goes in
`.dev-loop/` at the repository root, which is gitignored. A screenshot that
belongs to the change goes in `docs/screenshots/`; a scenario worth keeping goes
in `tools/echo-sim/scenarios/` beside its expected output.

## Related

`.claude/AGENTIC-LOOP.md` · [`work-issue`](../work-issue/SKILL.md) ·
[`steward`](../steward/SKILL.md) · [`run-game`](../run-game/SKILL.md) ·
[`hull-intake`](../hull-intake/SKILL.md) ·
[`balance-run`](../balance-run/SKILL.md) ·
[`loop-critic`](../../agents/loop-critic.md)
