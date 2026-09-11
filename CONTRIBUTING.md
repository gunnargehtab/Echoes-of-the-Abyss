# Contributing

The working conventions for this repository, in one place. [CLAUDE.md](CLAUDE.md) is the
deep companion (architecture, gotchas, and the reasoning behind these rules — it is
written for AI agents but everything in it is true for humans too); this file is the
short contract every change is reviewed against.

## Ground rules

1. **The docs are canonical.** `docs/` came first and remains the source of every tuning
   number. Code transcribes the docs; when they disagree, that is a bug in one of them —
   your PR says which one you are changing and why.
2. **Server-authoritative is a hard rule.** The whole game is hidden information. Never
   send the client anything it has not resolved — not "temporarily", not behind a debug
   flag that ships.
3. **Every mechanic is an argument about sound or depth.** A unit ability or faction
   trait anchored to neither is arbitrary; reconsider it before implementing it.
4. **Visual changes clear the gates** in
   [docs/graphics-standards.md](docs/graphics-standards.md), including a screenshot in
   the PR.

## Running it locally

```bash
npm ci
npm run dev          # server on :3000, client on :5173
```

[docs/DEVELOPER_QUICKSTART.md](docs/DEVELOPER_QUICKSTART.md) is the orientation for a first
contribution: repository layout, what each workspace is, how to run one of them on its own,
and how to drive the standalone Echo simulator.
[SETUP.md](SETUP.md) is the full setup, and [CLAUDE.md](CLAUDE.md) explains the build order,
which is the thing that breaks first: `frontend` and `backend` import `@echoes/shared` by
its **build output**, so a stale `dist/` produces confusing errors in both. Every root
script rebuilds it for you; if you invoke a workspace script directly after editing
`packages/shared`, run `npm run build:shared` yourself.

**Node 22+ is required.** Older runtimes fail with errors that do not obviously point at
the Node version.

## Branches and commits

**Trunk-based.** `main` is the only long-lived branch, and it is always green and always
deployable — every gate below is blocking in CI, so a red `main` is an incident rather than
a Tuesday.

- Branch off `main`, keep the branch short-lived, and open one PR from it.
- Branch names use `feat/`, `fix/`, `ci/`, `docs/` prefixes: `feat/harvest-throttle`,
  `docs/bestiary-drift-health`.
- Commit subjects use the matching prefixes (`feat:`, `fix:`, `ci:`, `docs:`, plus
  `test:` and `refactor:` where they fit), imperative mood, and say what the change
  *does*: `feat: bake structure sprites from the approved 3D models`.
- Keep commits small and focused; a commit that needs "and" in its subject is usually two.
- **Squash-merge**, so `main`'s history is one commit per PR and each one is revertable on
  its own. The PR body is where the reasoning lives; the squash subject is where you find
  it again.
- Never rewrite history on a branch someone else may have checked out. On your own branch
  before review, rebase freely.

## Releases and tags

**There are none yet, and that is deliberate rather than an oversight.**

Nothing here is versioned or published: the packages are `private`, `0.0.1`, and consumed
only by each other. Tagging a repository nobody installs from would be ceremony that costs
something (a tag implies a promise about what it contains) and buys nothing.

The condition that starts it: **the first tag is cut when the game is playable end to end
by someone who did not build it** — lobby, a match against an opponent, a win or a loss,
without a README open beside them. At that point:

- Semantic versioning on `main` only, tagged `v0.MINOR.PATCH`, staying below `1.0.0` until
  the design bible and the code agree everywhere.
- A tag is cut from a green `main`, never from a branch.
- The tag's annotation names the issues it closes; `docs/ROADMAP.md` is the running record
  of what is left.

Until then, `main` is the release, and the way to get a change to people is to merge it.

## Pull requests

- One concern per PR, referencing the issue it closes (`Fixes #30`).
- Fill in the template in [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
- Run the CI gates locally first — the full sequence is cheap, and it is one command:

  ```bash
  npm run gates
  ```

  That is `preflight`, `build:shared`, `type-check`, `lint`, `format:check`,
  `check:models`, `test`, `build`, and both doc gates — every blocking check in
  `.github/workflows/ci.yml`, so a dead link in `docs/` fails here exactly as it fails
  there. It runs them in one pass rather than stopping at the first red one, prints a
  pass/fail summary, and exits non-zero if any gate failed. `npm run gates -- --list`
  names them; `--only=`, `--skip=` and `--bail` narrow a run while you iterate on one.

  The list this replaces was missing `check:models`, which is the argument for having a
  single command: prose that repeats a gate list drifts from the workflow that runs it,
  and drifts quietly.

## Labels

The label set lives in [.github/labels.yml](.github/labels.yml) and is synced by a
workflow. Add, remove, or recolor labels by editing that file — never in the GitHub UI,
where the sync will overwrite you. The file is **exhaustive**: the sync deletes any label
it does not list, so a label applied without being added there first is scheduled for
deletion rather than merely unmanaged.

That is the fix for how the set drifted. The sync ran with `skip-delete` until #599, which
made the file additive: a label created in the UI, or shipped as a GitHub default, could
never be removed by editing it. `documentation` sat next to `docs` that way — the same
colour, the same description, two names for one thing, and ten issues filed under the
wrong one. Where two labels would mean the same thing, **`docs` is the name.**

One label carries a routing rule rather than a category. **`fable-5.1`** marks an issue
whose work is *shape* — a hull script, a faction module, a GLB, a prop, a prompt block —
and is therefore executed under the design model of record that
[docs/asset-prompts-3d.md](docs/asset-prompts-3d.md) rule 3 names for the whole series.
It does not mark an issue merely because art is mentioned in it: the gates
(`hull-intake`, the glow calibration, the screenshot review) stay adversarial to whoever
authored the model, and every number that is not a shape — a stat block, a doctrine, the
wire, the balance harness — stays outside it. A hull's SIG is an argument about sound;
its silhouette is not.

Routing away from a model is the other half of routing to one, so this label also takes
the issue off the backlog Routine's list — the Routine is pinned to one model at its
trigger and cannot switch mid-run. That half was implicit until #586, which the loop read
as ordinary `enhancement` work and shipped as #594: green on every gate, and three shape
decisions authored under the wrong model. The gates could not have caught it, since they
are adversarial to the model rather than about which one authored it. So the loop skips
`fable-5.1` outright, and the work waits for a session running the model of record. The
cost is real and worth naming: #540 carries the label across every model still to be
built — the structure kinds Phase 3 has left, and all nineteen of Phase 4's unmodelled
hulls — so none of them is the loop's to take.

Three further labels are addressed to the unattended backlog Routine rather than to a
person, and each takes an issue off its list for a different reason. **`routine-log`**
marks the run ledger the loop writes to, so it is never mistaken for a work item.
**`needs-hardware`** marks work that is real but cannot be done in a container — a
wall-clock frame timing needs an actual GPU. **`needs-decision`** marks work that is
doable there and blocked on a design call a person owes: the docs and the code disagree,
or answering the issue means deciding what a mechanic should argue. Without it a blocked
issue is the *most* selectable thing in the backlog, since being open, unassigned and
unclaimed is precisely what being blocked looks like from outside. The loop applies
`needs-decision` itself when it stands down, always alongside a comment saying what is
owed; the other two are a person's to apply. Removing any of them puts the issue back in
play on the next firing.

## Code conventions

- **Constants live in exactly one place**: `packages/shared/src/constants.ts`, tagged
  **SPEC** (from a design doc — change the doc first, cite the section) or **TUNABLE**
  (prototype number, free to move). Never replace a *derived* value with a hard-coded one
  to make a test pass. If a constant would exist in two packages, it belongs in shared.
- **Import extensions differ by package, deliberately.** `packages/shared` uses `.js`
  extensions on relative imports (NodeNext); backend and frontend use the real `.ts`
  extension (bundler resolution). Copying an import line between packages will break it.
- **Colyseus**: import from `@colyseus/core`, never the `colyseus` meta-package, and
  leave `useDefineForClassFields` alone in the backend tsconfig. The reasons are runtime
  gotchas, spelled out in [CLAUDE.md](CLAUDE.md).
- **Budgets are part of correctness.** Per-tick code is on the 60 Hz budget; anything
  touching detection is on the 2 ms Echo budget, and `Match` tracks the rolling
  worst case.
- **Comments explain *why*, not *what***, and several encode hard-won runtime gotchas —
  match that register and don't strip them when refactoring.
- **Style is Prettier's job** (100 columns, single quotes, ES5 trailing commas,
  semicolons): `npm run format` and stop thinking about it.

## Docs conventions

- [docs/glossary.md](docs/glossary.md) is authoritative. A term that means two things in
  two docs gets fixed in the glossary first, then everywhere.
- **Never link a doc that does not exist** — the link check is blocking. Planned work
  goes in the "Planned / Not Yet Written" section of [docs/README.md](docs/README.md) as
  plain text.
- Cross-link rather than restate; every doc ends with a "Related" section.
- Use concrete numbers: "45 SIG while idle with systems live", not "moderate SIG".

## Project skills

Repeatable workflows are captured as Claude Code skills in `.claude/skills/`, so the
process lives in the repo instead of in one person's head:

- **run-game** — boots both dev servers as a stoppable unit and drives the game in a
  headless browser; the way to verify a change in the real client and to produce the
  screenshot an art PR needs.
- **hull-intake** — validates a 3D model export (GLB) and bakes the review maps; the
  intake gate in [docs/graphics-standards.md](docs/graphics-standards.md).
- **work-issue** — picks one unclaimed, non-epic issue off the backlog, assigns it to
  itself with a comment saying the Routine has it, and takes it to a PR — or comments,
  releases the claim, and stops when the call is a design one. When nothing is eligible it
  files a single sub-issue off an epic instead, so the backlog refills itself one scoped
  item at a time. This is the skill a scheduled Routine runs unattended several times a
  day; its open-PR cap, not its schedule, is what keeps CI spend bounded.
- **steward** — what a session subscribed to an open PR does between "opened" and
  "merged", where this repository differs from the generic drive-to-green rules: reproduce
  locally before reading job logs, when a CI re-run is affordable on this account's Actions
  minutes, merge rather than rebase on `claude/` branches, and which review asks are design
  calls that stop on a comment instead of a push.

When you find yourself re-explaining a workflow a second time — a bake step, a test
harness, a review checklist — turn it into a skill next to these four rather than a wiki
page nobody runs.

`.claude/hooks/session-start.sh` runs `npm install` and `npm run build:shared` when a
remote session starts, so an agent container arrives with the gates above already
runnable. It is a no-op in a local checkout, which manages its own `node_modules`.

## Verifying on Android

The whole game runs on-device in Termux ([SETUP-ANDROID.md](SETUP-ANDROID.md)). One
command proves a phone can run it, and doubles as a pass/fail gate after a `git pull`:

```bash
node tools/android-check.mjs
```

## Related

- [CLAUDE.md](CLAUDE.md) — architecture, build order, and the reasoning behind these rules
- [README.md](README.md) — what the game is
- [SETUP.md](SETUP.md) — full development setup
- [docs/DEVELOPER_QUICKSTART.md](docs/DEVELOPER_QUICKSTART.md) — repository layout, running
  a single workspace, and the Echo simulator
- [docs/README.md](docs/README.md) — the design bible's index and editing rules
- [docs/graphics-standards.md](docs/graphics-standards.md) — the acceptance bar for anything visual
