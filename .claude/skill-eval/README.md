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

> **Dated 2026-10-08.** That pin held at this experiment's base, `f7bf3f5`. Since #962
> (27 September) the backend runs `@colyseus/core` `^0.18.17`, so the skill now
> describes this tree rather than running ahead of it.

## The finding that shapes the arm list

**The repository's own engineering prose already carries the guard**, in the Colyseus
paragraph: the skill documents 0.18, four minors ahead of what is pinned, and is carried
against exactly this drift. A control arm that keeps that paragraph intact is therefore
not an unguarded control. It sat under `CLAUDE.md`'s "Conventions" at this experiment's
base and moved to `packages/backend/CLAUDE.md` with #791's split, so `prepare-arm.sh`
asks git which file holds it rather than naming one.

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

Run of 2026-09-12, all three on `claude-opus-5` from base `f7bf3f5`, B and C on the
byte-identical prompt above. Gates were re-run here rather than taken from the arm's own
report.

| Arm | Blocking traps | Tells | Gates | Cost | Output tokens |
| --- | --- | --- | --- | --- | --- |
| A — #687, skill present | 0 | 0 | pass, CI green | not comparable | — |
| B — no skill, guard intact | 0 | 0 | **fail**, 9 of 10 | $9.38 | 63,576 |
| C — no skill, no guard | 0 | 0 | pass, 10 of 10 | $7.79 | 50,677 |

**No drift in any arm.** The guard prevented nothing, in the arm that had the skill, the arm
that had only the `CLAUDE.md` paragraph, and the arm that had neither.

**But the probe was weak, and that is the finding that matters.** Every Colyseus API the
task required is version-stable: `onUncaughtException` has the same signature in 0.15 as
later, and so do `setSimulationInterval` and `disconnect()`. The one drifting API in reach,
`onLeave`, appears in both arms only as a string literal inside the `methodName` union —
neither arm ever wrote its signature. The drift traps could not have fired. A clean sweep
here is not evidence that recall gets 0.15 right; it is evidence that this task never asked.

**The only real quality difference had nothing to do with Colyseus.** Arm B's test calls
`Object.hasOwn`, which needs the ES2022 lib the backend tsconfig does not set, so
`type-check` fails with two errors. No trap covers that, and none should — it is a house
convention, not API drift. Arm C, with one guard fewer and 17% less spend, passed all ten.
With one run per arm that difference is as likely noise as signal.

**Arm B reported "all gates pass" and they did not.** Re-run the gates against the arm's
branch; never record the arm's own summary.

### What a stronger experiment would need

A task that *forces* a drifting API to be written rather than one that merely runs near
them. That is experiment `lobby-callbacks`, below.

## Experiment `lobby-callbacks`

The client subscribes to the room's whole schema through `room.onStateChange`, so the lobby
view is rebuilt and `JSON.stringify`d five times a second to discover nothing changed. The
task is to subscribe to what the lobby actually depends on instead, and delete the
serialised-key workaround.

It is the strong probe #627 was not, for three reasons:

1. **The repository has no example to copy.** The one subscription in the client is coarse.
   #627's arms could read `extends Room<MatchState>` off the file they were editing; here
   there is nothing to read, so the arm reaches for recall.
2. **It is the top row of the skill's own drift table.** Per-collection and per-field
   callbacks are exactly what 0.17 replaced with the `getStateCallbacks` proxy.
3. **The installed client cannot express the drift.** `colyseus.js` is 0.15.28 and exports
   no `getStateCallbacks`, so the 0.18 shape is a compile error.

The correct form, from the installed typings rather than from recall: `MapSchema.onAdd`,
`onRemove` and `onChange` take a callback and return an unsubscribe function, and
`Schema.listen(prop, cb)` does the same for a field.

**Cost is the measurement here, not the trap table.** Because drift cannot compile, a
drifting arm finds out when it runs the gates and fixes itself, so both arms are likely to
end with clean diffs. What separates them is what the detour cost. The traps stay as a
backstop for drift that survives to the diff, and the criteria check that the task was
actually done rather than worked around a second time.

Two arms first, for maximum contrast: **A** with the skill and the guard, **C** with
neither. If they differ, **B** then says whether the `CLAUDE.md` paragraph alone accounts
for it. Running B up front buys nothing if A and C agree.

Run of 2026-09-12, both on `claude-opus-5` from base `15f8734`, byte-identical prompt.
Gates re-run here, never taken from the arm's own report.

| Arm | Blocking traps | Gates | Cost | Output tokens | Wall clock |
| --- | --- | --- | --- | --- | --- |
| A — skill and guard present | 0 of 8 | 10 of 10 | $5.25 | 38,356 | ~16 min |
| C — neither | 0 of 8 | 10 of 10 | **$4.36** | 35,043 | ~11.5 min |

**Both wrote the correct 0.15 API, and the arm without the skill was cheaper.** Arm C, with
no skill and no `CLAUDE.md` guard, reached for `state.listen('phase', push)` and
`state.players.onAdd((player, key) => player.onChange(push))` unaided, collected the
unsubscribe functions each returns, and called them on teardown. Arm A did the same thing,
passing `listen`'s `immediate` argument explicitly, for 20% more spend and five more
minutes.

Nothing drifted. On the surface 0.17 replaced wholesale, with no example in the repository
to copy, on a task that cannot be completed by writing the shape the skill documents,
neither arm reached for the 0.18 shape.

### What this does and does not establish

It is still one run per arm, and the cost gap is well inside what two runs of the same task
vary by. Read it as "no measured benefit", not as "measured harm".

**And the prompt did part of the skill's job.** It says: *"Use the Colyseus client API as it
exists in the version this repository has installed. Check it rather than recalling it."*
Both arms got that line, so the comparison holds, but it is a version guard in the prompt,
and it lowers the drift pressure on both arms. A third iteration should drop it — that is
the single change most likely to make a difference visible, and it costs one more pair of
runs.

## Experiment `lobby-callbacks-v2`

The same task, from the same base, with the version guard taken **out of the prompt**. It
differs from `lobby-callbacks` by exactly two lines:

```diff
- - Use the Colyseus client API as it exists in the version this repository has installed.
-   Check it rather than recalling it.
```

With v1 already run, this completes a 2x2 over {skill, no skill} and {guard in prompt, no
guard}. **v2 arm C is the only cell with no guard of any kind** — no skill, no `CLAUDE.md`
paragraph, no instruction to check the installed version — and is where drift appears if it
appears at all. Same traps, same fixture, same base, same model. The instruction not to read
other branches stays: it guards against copying, not against drift.

| Arm | Blocking traps | Gates | Cost | Output tokens | Cache reads |
| --- | --- | --- | --- | --- | --- |
| A — skill and guard | 0 of 8 | 10 of 10 | **$15.56** | 50,254 | 25.5M |
| C — no guard at all | 0 of 8 | 10 of 10 | $6.28 | 34,670 | 5.9M |

### The 2x2, and the one number that moved

| | Guard in prompt | No guard in prompt |
| --- | --- | --- |
| **Skill + `CLAUDE.md`** | $5.25 · 6.2M reads | **$15.56 · 25.5M reads** |
| **Neither** | $4.36 · 4.6M reads | $6.28 · 5.9M reads |

Every cell wrote the correct 0.15 API and passed all ten gates. **Nothing has ever drifted,
in any cell, across three experiments and nine arms.**

What moved is the top-right cell. Take the version guard out of the prompt and the arm that
has the skill spends **three times** what its twin spent, reading 4.1x the cache tokens,
to arrive at the same code. The arm with no guard of any kind barely moved. That is the
shape the skill's own cost profile predicts — roughly 4,300 tokens of `SKILL.md` and up to
60,000 of references, spent to establish that 0.18 does not apply here — and it is the only
effect any of these experiments has measured.

Read it as circumstantial. The cache-read jump is consistent with the skill firing and
pulling its references, and nothing else in the cell changed, but the transcript was not
inspected to confirm it.

### Two caveats on the numbers above

- **v2 arm C's cost is inflated.** A stray message reached that session *after* it had
  pushed 4fd05f3, and it spent a turn asking what was meant. The committed work is
  unaffected, and the contamination pushes C's figure **up**, so the A-versus-C gap is if
  anything understated.
- **One run per cell.** The v1 gap was inside run-to-run variance. A 3x gap is harder to
  dismiss, but four runs are still four runs.

### A trap that tested a name, and had to be fixed

`unsubscribed` originally searched for `unsubscribe` and `off(`. Both v2 arms failed it
while tearing down correctly from three call sites each, having named theirs `unwatchLobby`
with an `Unsubscribe` type. The pattern now matches the teardown handle being *stored* —
`push(...listen(...))` and friends — which is the actual contract, and it matches all four
arms. `docs/ui-ux.md`'s own testing rule says it: assert what is promised, never what the
source happens to be called.

### The standing read on the colyseus skill

Across three experiments and nine arms — #627's A, B and C, `lobby-callbacks`' A and C,
and `lobby-callbacks-v2`'s A and C, plus #687 as a real arm — the vendored `colyseus` skill
has **never changed an outcome**. No arm has ever written a 0.17 or 0.18 shape, including
the arm with no skill, no `CLAUDE.md` paragraph and no instruction to check the version,
working on the surface 0.17 replaced wholesale with no example in the tree to copy.

Every measured difference has gone against the skill, and the largest is 3x cost for
identical output. The honest summary is that on this codebase the guard is redundant
against a model that already gets 0.15 right, and it is not free when it fires.

That is an argument for dropping it, not proof it is worthless: the drift it documents is
real, and a project actually on 0.17 or 0.18 would be a different test. If it stays, it
should stay as a deliberate insurance premium with the price written down, not as an
assumption that it helps.

Since #962 this repository is that project. These readings priced the skill as a guard
against drift; none has measured it as the 0.18 reference `VENDORED-SKILLS.md` now keeps.

## Experiment `1828-diagnosing`

Does the vendored `diagnosing-bugs` skill (#1917) change how a bug gets fixed? It replays
[#1828](https://github.com/gunnargehtab/Echoes-of-the-Abyss/issues/1828): `npm run
preflight` passed while the client served three r169, because the root's tools pin
satisfied a presence walk the frontend's own copy should have.

### The pick

#1919 asked for a closed `bug` fixed in one pull request, whose cause was not in the first
file its report names. #1828's report names `packages/frontend/package.json` first; the
cause was `tools/preflight-deps.mjs`, fixed in #1830 alone. It also reproduces in one `mv`
and one command, the tight loop the skill's Phase 1 asks for. Passed over:

- #1032, #1218, #1308, #1322, #1953: each report names the faulty file first.
- #1301: fixed across two pull requests, #1302 and #1399.
- #1558: a frame judged by eye, and its report's "Where" is the clamp that was fixed.

`PROMPT.md` quotes the report's first three sections, with three trims. It drops
"Additional context", which proposed the fix: a diagnosis probe handed the fix measures
copying. It also drops "since #1805" and "(found in #1826)", which point at history an arm
could read for the answer.

### The arms

`traps.json` sets `"graft": true`. The base, `1388ce41`, predates the skill, so the landed
#1830 is the skill-absent arm, as #687 was for `627`. `prepare-arm.sh` arm `a` grafts
`.claude/skills/diagnosing-bugs` from `main` onto that base. `NO_PUSH=1` cut it locally.

A graft arm reads `docs:claude` red for reasons of its own. `check.mjs` at the base lists
no `diagnosing-bugs`, and `VENDORED-SKILLS.md` names experiment paths the strip removed.
Grade such an arm on the other eleven gates.

**Arm A ran as a subagent, not a session, so the graft shaped none of its context.** This
session could not start a fresh one. A subagent takes its skill listing and `CLAUDE.md`
from the parent's checkout, this probe's branch, whose `CLAUDE.md` and skills match
`main`'s. So arm A saw `diagnosing-bugs` listed because `main` has it, beside `grilling`
and `writing-for-agents`, which the base lacks. It worked the base's files under `main`'s
instructions. It got `PROMPT.md` verbatim behind five sentences that name its worktree,
keep it there, and ask for a local commit and a report.

### Run of 2026-11-26

| Arm | Skill loaded | Traps | Gates | Repro before the fix | Output tokens |
| --- | --- | --- | --- | --- | --- |
| landed #1830, no skill on disk | — | 0 of 6 tripped | CI green | yes, per its body | not comparable |
| A, skill listed | **no** | 0 of 6 tripped | 11 of 12, `docs:claude` from the graft | **no** | 21,329 |

Arm A's figure counts each message once, with 2.10M cache reads. Its transcript writes one
line per content block, and each line repeats its message's usage.

**The skill never fired.** Arm A made no `Skill` call and read no file under
`.claude/skills/diagnosing-bugs`. A bug report stating a symptom and its steps is the
skill's own trigger, "reports something broken", and the arm passed it by.

**So nothing it teaches showed up.** Arm A read the preflight, checked the two installed
versions, and wrote the fix at its sixth tool call. It ran the issue's repro once, after
the fix, and its seven tests were never watched failing. Phase 1's red loop and Phase 5's
test-before-fix are both absent. #1830's body reports the repro passing before the fix and
failing after it. Nothing records its test written first or watched failing.

Re-run here, arm A's gates pass bar `docs:claude`, and the repro fails then passes on its
tree.

Both fixes read the resolved copy's version against the declared range, with a range
reader of their own and no `semver` dependency. Arm A's reader is larger, taking `~`,
x-ranges and `||`, and puts it inside `preflight-deps.mjs`. `arms/a.diff` is the code.

### What this does and does not establish

One run, without the Routine's framing. The prompt says "Implement the change described
below", and the report names the faulty file and its mechanism, "the presence walk". That
is weak pressure toward a skill for hard bugs, and it bears on the drop trigger in
`VENDORED-SKILLS.md`: the next probe should hand over a symptom alone. What it does show
is that the description did not fire on a bug report. #1086's session read the same of
`pixijs-scene-graphics` on a Graphics task.

## What this cannot tell you

One issue per arm is a sample of one, and the same prompt run twice does not produce
the same diff. A clean sweep in both arms is weak evidence of redundancy; a drift trap
tripping in B and not in A is strong evidence the guard works, because the trap was
named before either arm ran. Treat a single run as a screen, not a verdict, and read
it alongside the token column rather than instead of it.

**And a gate column is only as honest as the fixtures under it.** Every
`lobby-callbacks` cell above reads "10 of 10", and three of those four arms had
nonetheless dropped a load-bearing fallback, because each arm's own test stub
initialised the room state more completely than the real decoder does and the bug lived
in the gap. `ARMS.md` has the detail. The lesson generalises past this experiment: an
arm writes its own fixtures, so a green gate run says the arm is consistent with what it
believed, not that what it believed was true.

Issue #652 is the only work in the backlog with enough repeated, near-identical units
to beat this — twenty structure ports, splittable ten and ten, with `check.mjs` giving
a part-for-part verdict on each.
