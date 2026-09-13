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
| Invariants (`/spec/invariants.md`) | Scattered — asserted across 11 test files, named as an `INVARIANT:` comment in exactly one place (`packages/shared/src/missions.ts`) | **No** — see "Still owed". `dev-loop` and `loop-critic` name several hard *rules*, which is not the same thing as stating the invariants |
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

- **A written invariants contract.** #709's `/spec/invariants.md` is the one
  component with no real equivalent. The invariants exist and are enforced —
  `maxEid`, the mission objective monotonicity rule, ordnance and the fog of
  war, the map containment rule `docs/maps.md` bought with three authoring faults, the
  counted-work budgets — but they are asserted across 11 test files and stated,
  as an invariant, in one.
  A doc that lists each invariant, its source section and the test that holds it
  would give `loop-critic` a checklist instead of a memory, and it would want a
  drift gate of its own: a row naming a test that no longer exists must fail
  loudly, in the idiom of `check:models` and the roadmap's drift report. Not
  built here, because it is a day's careful reading of the suite and this branch
  is an instalment.
- **A scheduled firing of the whole loop.** `work-issue` §5 now routes into
  `dev-loop` and both it and `steward` link it, so a firing reaches the rounds
  from inside the repository. What is left is the Routine itself, which is
  account configuration rather than anything a branch can carry.

## Related

[`skills/dev-loop/SKILL.md`](skills/dev-loop/SKILL.md) ·
[`agents/loop-critic.md`](agents/loop-critic.md) ·
[`skills/work-issue/SKILL.md`](skills/work-issue/SKILL.md) ·
[`skills/steward/SKILL.md`](skills/steward/SKILL.md) ·
[`VENDORED-SKILLS.md`](VENDORED-SKILLS.md) · `../CLAUDE.md`
