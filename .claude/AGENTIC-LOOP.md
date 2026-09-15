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
| Invariants (`/spec/invariants.md`) | Was scattered — stated as an invariant in prose in one place, and asserted across the suites | **Yes** — `docs/invariants.md`, 14 rows over 13 test files, each naming its source and the test that holds it, with `npm run check:invariants` failing when a holder is gone |
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
| Max cycles per task | Ten rounds, hard, in `dev-loop` — reaching it is a stall |
| Max patch size | Not a line count: one increment per round, and a round whose diff outgrows its target is a finding `loop-critic` raises |
| Schema validation for patches | `npm run gates` — type-check, lint, format, the model round-trip, both doc gates |
| Crash detection | The suites, and the evidence step: a harness run that does not reproduce is `evidence-missing` |
| Progress detection | The `CARRIED OVER` section of the verdict, read by the stall rule |
| Rollback on catastrophic failure | Instalment pushes on a branch; `steward` covers the pull request from there |
| Strict diff application rules | Not applicable — the loop edits the tree directly and the gates are the check |

The two guardrails #709 does not have, and this repository needs, are in
`dev-loop` under "Three things the loop must never do": never tune for balance,
never resolve a docs/code disagreement by guessing, never send the client
anything it has not resolved.

## Still owed

- **The invariants contract is built** (`docs/invariants.md`), which was this list's
  largest gap. Fourteen rows across thirteen test files, each naming the property, the doc section or issue it
  descends from, and the file and test that hold it — and a gate,
  `npm run check:invariants`, that fails when a row names a test somebody renamed. It is
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
  step 2 without selecting anything. It clones `main` at the start of every run and invokes
  `/work-issue`, whose §5 now hands the work to `dev-loop` — so a firing picks
  up the rounds and the critic **from the clone**, with no change to the Routine
  at all, the moment this branch merges. Until then firings run the old
  `work-issue`, because `main` does not carry these files yet.

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
