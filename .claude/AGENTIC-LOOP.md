# The agentic development loop

This records how the loop proposed in #709 was built here: which of its four
components already existed under another name, which one was genuinely missing,
and which were deliberately not built. It is the companion to
[`skills/dev-loop/SKILL.md`](skills/dev-loop/SKILL.md), which is the loop
itself, and to [`agents/loop-critic.md`](agents/loop-critic.md), which is the
half of it that cannot be a section of a file the author reads to itself.

It lives in `.claude/` rather than `docs/` for the same reason
`VENDORED-SKILLS.md` does: link checking on `docs/` is blocking in CI, and this
file's whole job is to point at skills, which live outside it.

## Where it comes from

Two sources, and they disagree about shape in a way worth writing down.

**#709** describes a Python tree — `/loop/loop.py`, `/loop/verifier.py`,
`/loop/harness/run_headless.py`, `/spec/`, `/tasks/open.json` — with four
components: a task system, a spec with invariants, a headless harness, and a
verifier. Its component breakdown is right. Its file layout was written against
a repository that is not this one: there is no Python here, the paths it names
(`src/systems/pressure_zone.ts`) do not exist, and the mechanic it names is not
built: `docs/hazards.md` §3 is "Abyssal Pressure Zones", and the same file's own
table rules it **site only** — "crush attrition already exists as a depth
mechanic; a *zone* would layer on top of it". So #709 asks for a harness
scenario against a hazard the docs deliberately left unbuilt.

**[dream-loop](https://github.com/achimala/dream-loop)** is the loop that
actually works, and it is an agent skill rather than a program: lock a target,
build toward it, hand the result to a **separate critic with fresh context**,
refine on its verdict, exit on a criterion. Its pro workflow is a seven-step
round with one judge subagent per round, a stall rule, and a stop-and-ask when
a redesign does not move the verdict.

The build follows dream-loop's shape and #709's component list.

## What #709 asked for, and what it already was

| #709 component | Already here as | Built? |
| --- | --- | --- |
| Task system (`/tasks/open.json`) | GitHub Issues, plus `work-issue`'s selection rule, self-assignment and open-PR cap | No — a JSON task file would be a second backlog, diverging from the first by Thursday |
| Spec (`/spec/systems.md`) | `docs/` — the design bible, canonical, and the source of every SPEC constant | No — a second spec is the one thing `CLAUDE.md` is most emphatic against |
| Invariants (`/spec/invariants.md`) | Was scattered — stated as an invariant in prose in one place, and asserted across the suites | **Yes** — `docs/invariants.md`, 37 rows over 81 holders (`npm run check:invariants` at `2da92bc`), each naming its source and the test that holds it, with that gate failing when a holder is gone |
| Acceptance tests (`/spec/acceptance_tests.md`) | `tools/echo-sim/scenarios/*.json` with committed `.expected.json`, plus the three suites | No — the scenarios already are this, in a form a harness runs |
| Harness (`run_headless.py`) | `tools/echo-sim`, `tools/balance`, `tools/audio-meter`, `hull-intake`, and the `run-game` browser drive | No — five harnesses exist; what was missing was a rule for which to reach for, now the evidence table in `dev-loop` |
| Verifier (`verifier.py`) | `npm run gates` — every blocking CI gate, one pass, one exit code | No — and a parallel verifier would drift from CI, which is the exact failure `tools/gates.mjs` was written to end |
| Per-cycle logs (`/logs/cycle_001.md`) | `work-issue` §8's per-firing comment on the run log (#580), plus the claim and stopping comments on the worked issue — the log reaches whoever watches the loop, the issue comments whoever watches that issue | No — a per-cycle file per round would be a third record after the issue comment and the PR; `.dev-loop/` holds a round's scratch and is gitignored |
| Loop script (`loop.py`) | Nothing | **Yes** — `skills/dev-loop/SKILL.md` |
| Self-Refine | Nothing general; `hull-designer`/`hull-reviewer` is this pattern for hulls only | **Yes** — `agents/loop-critic.md` |

So the honest summary is that six of #709's eight pieces existed, and the two
that did not are the two that make it a *loop*: the round structure, and a
critic that is not the author.

## The three adaptations that matter

**The target is authored, not dreamed.** dream-loop's first step generates a
target image, because its user's prompt is the only specification in play. Here
`docs/` came first and code transcribes it, so generating a target would create
a second specification for the real one to disagree with. `dev-loop` instead
names, per kind of change, which doc section *is* the target. Visual work keeps
dream-loop's shape, because there a target image is right and the repository
already commits them under `docs/concept-art/`.

**The critic is pinned to the strongest model, not to a different one.**
`hull-reviewer` is deliberately pinned *away* from the authoring model, because
a blind spot about shape is aesthetic and travels with the model. A blind spot
about correctness is not that — it is what this session has already talked
itself into over three rounds — and fresh context is what cures it. So
`loop-critic` is `opus`, and the separation is carried by no editing tools, a
standing rule against writing through the `Bash` it needs for evidence, and no
resumed context.

**There is no score.** dream-loop exits at a rubric score of 8, which suits a
target that is an image. A correctness target is met or it is not, and a loop
that maximises a number will find numbers to maximise. `dev-loop`'s exit
criteria are all boolean, its stall rule counts *surviving findings* rather than
a delta, and `loop-critic` is told in as many words not to score balance —
because a refine loop grading a number's rightness is how tuning gets laundered
through a correctness review while `CLAUDE.md`'s balance freeze is in force.

## Guardrails, and where each is enforced

| #709 guardrail | Here |
| --- | --- |
| Max cycles per task | Three rounds, hard, in `dev-loop` — reaching it is a stall, and the pull request stays open with what is left written in its body |
| Max patch size | Not a line count: one increment per round, and a round whose diff outgrows its target is a finding `loop-critic` raises |
| Schema validation for patches | `npm run gates` — type-check, lint, format, the model round-trip, all three doc gates |
| Crash detection | The suites, and the evidence step: a harness run that does not reproduce is `evidence-missing` |
| Progress detection | The `CARRIED OVER` section of the verdict, read by the stall rule |
| Rollback on catastrophic failure | Instalment pushes on a branch; `steward` covers the pull request from there |
| Strict diff application rules | Not applicable — the loop edits the tree directly and the gates are the check |

The two guardrails #709 does not have, and this repository needs, are in
`dev-loop` under "Three things the loop must never do": never tune for balance,
never resolve a docs/code disagreement by guessing, never send the client
anything it has not resolved.

### These files are gated too, and a number in them carries its source

`npm run docs:claude` runs markdownlint and a relative-link check over the
markdown this repository wrote under `.claude/`. It joins
`npm run gates` and the CI `docs` job beside the two that have always covered
`docs/`. The eleven vendored skills are excluded — they are upstream copies, and
reformatting one destroys the only property that makes a re-sync cheap. What
the gate holds there is the *list* — `check.mjs`'s array, `VENDORED-SKILLS.md`'s
table and the directories on disk, failing on any two disagreeing. The spelled
word "eleven" it does not read, here or anywhere else the number is written out,
which is why the convention below is the only thing keeping those sentences
honest.

A gate over prose catches a broken heading, not a false sentence. So the
convention these files follow, which nothing can enforce, is that **a number
restated here names the command that produced it and the commit it was read
at** — the invariants row above is the worked example. Before #748 it claimed
"14 rows over 13 test files" while the gate printed thirty and sixty-four —
and #747 had corrected the same figure further down this very file, without
touching the copy in the table.
A bare number reads as a live fact and goes on reading that way forever. A
number stamped with `at <sha>` reads as a measurement, which is what it is, and
a reader who needs today's figure knows which command to run.

## How it improves itself

#709 has no clause for this, and the gap it left was not the loop's ability to
*change* — several pull requests have changed these files — but its ability to
**say** that something needs changing. A firing's findings went into #580, which
is a record and not a queue, and eight sat there across seven entries.

Two things close that, decided on 15 September:

- **#746** is the epic a firing files a verified finding against when the finding
  belongs to no other epic — a defect found while reading code for something
  else, a doc claim the code contradicts, or a rule in these files that did not
  survive a run. `work-issue` §4 carries the bar: verified against code at a
  named commit, never against the prose describing it, and never inside the
  balance freeze.
- **A firing may edit its own rules, except the ones that bound it** —
  `work-issue` §2's cap, §3's exclusions and claim check, §7's stopping cases,
  `dev-loop`'s three-round cap, and `loop-critic`'s separation from the author.
  Those it writes an issue about and stops, per §5. The critic's check 4 fails a round that edits one, which is
  the only enforcement there is: `npm run gates` does not read `.claude/`.

So the loop improves itself the way it improves anything else: an issue, a claim,
rounds, a critic, a reviewed pull request. The one thing it may not do is author
the constraint it is under. That is #540's rule at one remove — a generator that
also grades itself is not a gate — and the cost of getting it wrong is not a bad
patch, which the gates and the critic catch, but a firing quietly widening what
it is allowed to select.

## Still owed

- **The invariants contract is built** (`docs/invariants.md`), which was this list's
  largest gap. Each row names the property, the doc section or issue it descends
  from, and the file and test that hold it. The count is the gate's to print
  rather than this file's to restate twice — `npm run check:invariants` prints
  today's, the table above stamps one reading of it, and the gate fails when a
  row names a test somebody renamed. It is
  a liveness check rather than a correctness one, for the reason the file itself gives:
  verifying the assertion would mean re-implementing the suite, which is the second
  source of truth this repository keeps refusing to build. What is still owed on it is
  *coverage* — the list states the invariants that were written down as invariants by
  the tests holding them, and says plainly that it is not complete.
- **The scheduled firing already exists, and needs nothing.** This list used to
  say the Routine was owed as account configuration. It is not: `Work one issue
  from the backlog` (`trig_0188TRMLkmwkoArLR7DZ3RGR`) has fired since 27 August
  under `claude-opus-5`, in a fresh session per firing — every four hours on
  `13 */4 * * *` until 15 September, and every six on `13 */6 * * *` since. The
  cadence moved because the loop's open-PR cap now binds on review throughput
  rather than on backlog supply: the 04:15 firing on 15 September was the first
  to find two of its own pull requests open, green and unmerged, and to stop at
  step 2 without selecting anything. It clones `main` at the start of every run
  and invokes `/work-issue`, whose §5 hands the work to `dev-loop` — so a firing
  picks up the rounds and the critic **from the clone**, with no change to the
  Routine at all. That took effect when these files merged on 13 September: the
  firing that landed #738 ran five rounds with a fresh critic each, four of them
  `revise`, and the one that landed #742 ran three.

  **The cap is three rounds rather than ten since 18 September**, set by the
  repository owner for efficiency. A round cap bounds an unattended firing, so it
  is a person's number and not a firing's, which is why it is on the list above.
  What changes for a run shaped like #738's is the ending rather than the work:
  it stops on round three with its pull request open and the findings still open
  written in the body, instead of refining to round five. `dev-loop`'s "Reaching
  the cap" says how to stop there, and carries the cost side — what rounds four
  to seven have actually found in the runs on record. The Routine itself needed
  no edit, for the reason the paragraph below gives.

  Its prompt is deliberately thin, and it says so itself — "the rules live in
  that file and not in this prompt ... if the two ever disagree, the file wins" —
  which is the whole reason the loop can be changed in a reviewed pull request
  instead of in trigger configuration nobody can diff. It has been edited once,
  on 15 September, and only to stop it naming a target that moved: the bullet
  asking for "the gates in `CONTRIBUTING.md`" now asks for `npm run gates`, the
  one command `work-issue` §6 canonicalised.

## Related

[`skills/dev-loop/SKILL.md`](skills/dev-loop/SKILL.md) ·
[`agents/loop-critic.md`](agents/loop-critic.md) ·
[`skills/work-issue/SKILL.md`](skills/work-issue/SKILL.md) ·
[`skills/steward/SKILL.md`](skills/steward/SKILL.md) ·
[`VENDORED-SKILLS.md`](VENDORED-SKILLS.md) · `../CLAUDE.md`
