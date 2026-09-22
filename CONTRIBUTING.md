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
   flag that ships. Why, and what the opaque per-observer handles buy, is in
   [CLAUDE.md](CLAUDE.md#server-authoritative-is-a-hard-rule-not-a-preference).
3. **Every mechanic is an argument about sound or depth.** A unit ability or faction
   trait anchored to neither is arbitrary; reconsider it before implementing it.
4. **Visual changes clear the gates** in
   [docs/graphics-standards.md](docs/graphics-standards.md), including a screenshot in
   the PR.
5. **Write short on GitHub.** Clear, simple, short sentences in every issue, PR, review
   comment and commit message. A PR body under 300 words, an issue under 200, a comment
   under 100. The rule and what it does not cover are in
   [CLAUDE.md](CLAUDE.md#write-short-on-github); `tools/prose-budget/check.mjs` counts a
   body, and the **PR body** workflow reports every PR's count without blocking it.

## Running it locally

```bash
npm ci
npm run dev          # server on :3000, client on :5173
```

[docs/DEVELOPER_QUICKSTART.md](docs/DEVELOPER_QUICKSTART.md) is the orientation for a first
contribution: repository layout, what each workspace is, how to run one of them on its own,
and how to drive the standalone Echo simulator. [SETUP.md](SETUP.md) is the full setup.

Two things break before anything else does, and both are stated once in `CLAUDE.md`:
[the build order](CLAUDE.md#build-order--the-thing-that-breaks-first), because `frontend`
and `backend` import `@echoes/shared` by its build output and a stale `dist/` breaks both,
and [the Node 22 floor](CLAUDE.md#commands), whose failures do not point at the Node
version.

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
- **Merge commits**, one per pull request, so `main`'s first-parent history is one entry
  per PR and each is revertable on its own with `git revert -m 1`. Read that history with
  `git log --first-parent`; the branch's own commits stay underneath it, and the PR body
  is where the reasoning lives — in a sentence or two, per ground rule 5. That body
  *becomes* the merge commit's message, so it is held to the same budget for the same
  reason: `main`'s history is read with `git log`, where nobody scrolls.

  This line read *squash-merge* until it was measured. That was true of the first
  eighteen pull requests and has not been true since 26 August 2026: every one of the
  291 pull requests merged after it came in as a merge commit, without exception. The
  intent the old wording gave — one entry per PR, revertable on its own — is what
  first-parent and `revert -m 1` deliver, so what changed is the mechanism and not the
  reason. A contributor following the doc would have been the only person squashing.
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
  Issue templates are in `.github/ISSUE_TEMPLATE/`.
- Keep the body under 300 words — ground rule 5. Say what changed and why, then stop.
  The merge commit inherits this body, so its length is permanent.
- Run the CI gates locally first — the full sequence is cheap, and it is one command:

  ```bash
  npm run gates
  ```

  That is `preflight`, `build:shared`, `type-check`, `lint`, `format:check`,
  `check:models`, `check:invariants`, `test`, `build`, and all three doc gates — every
  blocking check in
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
cost is real and worth naming: #540 carries the label across what is left of it — Phase
6's pristine pass, now that every hull, structure and environment prop is built by a
script — so none of it is the loop's to take.

Four further labels are addressed to the unattended backlog Routine rather than to a
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

**`standing`** is the fourth, and it marks an issue that is open *because the decision
went that way* — a permanent target something in the tree cites by number, rather than
work anybody intends to finish. #703 is the case that cut it. `AiUnbuilt` in
`packages/backend/src/ai/types.ts` prices each listed gap at "naming the issue that fills
it", and an entry naming a **closed** issue names nothing — so when #621 closed, the
three entries were re-pointed at #703, and closing #703 in its turn would have re-created
the same defect one citation at a time. The way off that treadmill is to let one issue
stay open on purpose and say so, which is what this label says. It differs from
`wontfix`, which parks an investigation the build cannot act on yet, and from
`routine-log`, which is the loop's own ledger: a `standing` issue is a live reference with
a live citation pointing at it, and the code that cites it is correct precisely because
the issue never closes. Like `needs-hardware` and `wontfix`, it is a statement about the
work rather than about a run, so it is **a person's to apply and a person's to remove** —
and removing it means the citations need somewhere else to point first.

## Code conventions

The code conventions are stated once, each with the runtime gotcha behind it — in
[CLAUDE.md](CLAUDE.md) where the rule binds two or more packages, and in the package's own
nested file where it does not. The gotcha is the reason the rule is worth following, and it
is the part a summary drops — which is why this file names each rule and links rather than
repeating it:

- [Constants live in exactly one place](CLAUDE.md#constants-live-in-exactly-one-place) —
  and what the two tags on them oblige you to do.
- [Import extensions differ by package](CLAUDE.md#import-extensions-differ-by-package--this-is-deliberate)
  — copying an import line between packages breaks it.
- [Colyseus](packages/backend/CLAUDE.md#colyseus) — which package to import from, and the
  one tsconfig flag to leave alone.
- [The wire](CLAUDE.md#the-wire) — every socket message declared once, name and payload,
  plus a runtime shape for everything a client sends.
- [Two clocks](packages/backend/CLAUDE.md#two-clocks) — the 60 Hz step and the 2 ms Echo
  budget, both asserted on counted work rather than on a stopwatch.
- [Style](CLAUDE.md#style) — Prettier's settings, and what a comment in this codebase is
  for.

`npm run format` settles the last one. The rest are reviewed.

## Docs conventions

Four rules, stated once in [CLAUDE.md](CLAUDE.md#docs): the glossary is authoritative,
never link a doc that does not exist, cross-link rather than restate, and use concrete
numbers. [docs/README.md](docs/README.md) is the design bible's own index and its editing
rules.

The third of those is why this file links instead of repeating. It applies to the
repository's own prose as much as to `docs/`.

## Project skills

Repeatable workflows are captured as Claude Code skills in `.claude/skills/`, so the
process lives in the repo instead of in one person's head. Read that directory rather
than a list here, and each skill's own front matter for what it is for.

`tools/claude-docs/check.mjs` holds the authoritative split between the skills this
repository wrote and the vendored copies, and fails `npm run docs:claude` on a skill in
neither list. [CLAUDE.md](CLAUDE.md#vendored-skills) says why the copies are read-only,
and `.claude/VENDORED-SKILLS.md` records each one's upstream and licence.

This file used to name four of them, and there are six. A list here is a second copy of
something the gate already holds, and it drifts the same quiet way the hand-copied gate
list above drifted before `npm run gates` became the one command that runs them all.

When you find yourself re-explaining a workflow a second time — a bake step, a test
harness, a review checklist — turn it into a skill next to those rather than a wiki page
nobody runs.

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
