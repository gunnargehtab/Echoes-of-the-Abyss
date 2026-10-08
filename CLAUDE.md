# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this repository is

*Echoes of the Abyss* is a browser-native, server-authoritative RTS with acoustic fog of
war. The design bible (`docs/`) came first and stays canonical; the TypeScript monorepo
under `packages/` transcribes it. A disagreement is a bug in one of the two, so say which
one you are changing and why.

## Balance work is frozen

**Do not tune the game for balance.** Not a hull price, not a yield rate, not a build-list
weight, not a TUNABLE moved because a win rate looked wrong, and no baseline in
`tools/balance/baselines/` refreshed to chase a guard-rail. The systems are still changing
shape; a number tuned against today's is thrown away by the next mechanic to land.
A **breached** guard-rail in `docs/economy.md` §9 is recorded and left (#654), and an
issue about a faction winning or losing too much is not work to take.

Still live: a *correctness* fault the harness surfaces — a navy that cannot pay for its
roster (#520), a commander that never builds a structure its waves gate on (#518) — and a
baseline refreshed because a *mechanic* changed, which records the new shape rather than
chasing a target. `tools/balance` is that harness, driven by the `balance-run` skill, and
the freeze lifts by a decision written here rather than by a run deciding it is time.

## Write short on GitHub

Long writing costs the reader: the six pull requests merged before this rule averaged
1,598-word bodies. Every issue, pull request, review, comment and commit message follows
it, since a merge commit carries its body into `main` for good.

- **Short sentences**, one idea each, leading with the answer: what changed, or what is
  wrong.
- **Facts, not narrative.** Numbers, paths, the failing test's name.
- **Link instead of quoting.** Name the doc, the test or the issue and move on.
- **Budgets.** 300 words for a pull request body, 200 for an issue, 100 for a comment.
- **A pull request body is three sections** (`.github/PULL_REQUEST_TEMPLATE.md`):
  Problem, at most three sentences; Options, only when the change took a decision, at
  most three per option; Solution, at most three, naming what proves it.

Code comments still explain *why* ([Style](#style)), and `docs/` stays prose.
`tools/prose-budget/` measures a body's words and sentences, advisory and never blocking.

## Commands

Run everything from the repository root. `package.json` holds every script, and
`docs/DEVELOPER_QUICKSTART.md` runs one workspace, or one test file, on its own.

| Task | Command |
| --- | --- |
| Install / check the install | `npm ci` / `npm run preflight` |
| Dev (server + client) / build all | `npm run dev` / `npm run build` |
| Test all / type-check / lint | `npm test` / `npm run type-check` / `npm run lint` |
| Formatting check / fix | `npm run format:check` / `npm run format` |
| Hull scripts ↔ GLBs ↔ outlines | `npm run check:models` |
| `docs/invariants.md` names live tests | `npm run check:invariants` |
| This file and its siblings | `npm run docs:claude` |
| Every blocking gate, one pass | `npm run gates` |

`npm run gates` runs every blocking check in `.github/workflows/ci.yml` in one pass: the
finish line to hand a `/goal`. It says the tree is sound, never that a number is right.
Its flags go after a load-bearing `--` (`-- --help` lists them); without it npm takes
`--only=…` for its own config, forwards nothing, and every gate runs.

**Node 22.3+ is required** (`node --import tsx`, the stable `node:test` runner, the test
shim's `process.getBuiltinModule`; CI pins 22).
Older runtimes fail with errors that do not point at the Node version.

## Build order — the thing that breaks first

`packages/frontend` and `packages/backend` import `@echoes/shared` by its **build output**
(`dist/`), not its source, so a stale or missing `dist/` produces confusing type errors and
runtime resolution failures across both. Root scripts run `npm run build:shared` first;
after editing `packages/shared`, run it yourself before calling a workspace script.

## Architecture

```text
packages/shared    @echoes/shared — types, tuning constants, Echo Layer math.
packages/backend   Colyseus server. Owns the simulation. Node + esbuild bundle.
packages/frontend  React shell, three.js under PixiJS. A terminal, not a sim.
tools/             Every harness and gate; tools/CLAUDE.md gives each its line.
docs/              The design bible, and the source of every SPEC number.
```

`tools/`, `packages/backend/`, `packages/frontend/` and `docs/` each have a `CLAUDE.md` for
what binds that directory only, loaded for a session working under it. What stays here
binds two or more.

### Server-authoritative is a hard rule, not a preference

The whole game is hidden information, so a client holding unresolved world state is a
maphack whatever it draws. Detection resolves per player in
`packages/backend/src/sim/systems/echoLayer.ts`, and only the result crosses the wire, under
opaque per-observer handles that cannot be counted into a map-wide total. Never send the
client anything it has not resolved: not "temporarily", not behind a debug flag that ships.

### Constants live in exactly one place

All tuning numbers belong in `packages/shared/src/constants.ts`, tagged in their comment:

- **SPEC** — taken from a design doc. Change the doc first, then the constant, citing the
  doc section.
- **TUNABLE** — a prototype number the docs do not pin down. Free to move; expected to.

Some are *derived*: `BASE_THRESHOLD` is solved from the spec'd 2,400 m active-sonar
self-reveal, so the documented ping radii fall out of the propagation model. Never
hard-code over a derived value to pass a test; a constant two packages need goes in shared.

### Invariants live in exactly one place too

A property that must hold **over every input** — "no entity exists above `world.maxEid`"
— is an invariant, and [`docs/invariants.md`](docs/invariants.md) lists them and its rules.
`npm run check:invariants` asserts every holder a row names still resolves: liveness
rather than correctness, the bargain `check:models` makes.

## Import extensions differ by package — this is deliberate

- `packages/shared` compiles under `module: NodeNext`, so a relative import **must** carry
  a `.js` extension even though the file is `.ts`: `import { Biome } from './types.js';`
- `packages/backend` and `packages/frontend` use `moduleResolution: bundler` with
  `allowImportingTsExtensions`, so a relative import carries the **real** extension:
  `import { Match } from '../sim/match.ts';`

Copying an import line between packages will break it.

## The wire

Every message that crosses the socket — 31 a client may send, 11 the room may send — is
declared once in `packages/shared/src/wire.ts`: the name, the payload, and for a client
message its runtime **shape** in `CLIENT_SHAPE`. No message name is a string literal
anywhere else, and adding one is all three edits — the assertions at the foot of `wire.ts`
fail the build if you make fewer. `MatchRoom.onClientMessage` checks each message against
its shape once, so no handler writes a `Number.isFinite` of its own. `wire.ts` says why,
and why Colyseus *schema* state is a different channel.

## Style

Prettier: 100 columns, single quotes, ES5 trailing commas, semicolons. It covers
`packages/**`, `tools/**/*.{js,json}` and root JSON — deliberately **not** `docs/`, which
is authored prose linted by markdownlint instead. Comments explain *why*, not *what*, and
several encode hard-won gotchas: match that register; don't strip them when refactoring.

## Design constraints worth knowing before you touch gameplay

Every mechanic is an argument about **sound** or **depth**: how loud it makes you, and what
going deep commits you to. One anchored to neither is arbitrary — reconsider it before
implementing it, and aim at dread rather than confusion. `docs/systems-echo.md` and
`docs/systems-depth.md` are those two systems; `.github/copilot-instructions.md` is the
design-side companion (SIG scale, biome PF, depth bands, doctrines).

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request: `checks`,
`models`, two test shards and `docs` run in parallel; `build` requires checks and models
to pass. All three doc gates block, so a dead link in `docs/` fails the build.
`pages.yml`, `pr-body.yml` and `labels.yml` gate nothing; each header says what it does.

## Contributing

`CONTRIBUTING.md` is the contract: branches, commits, labels, pull requests, and the gates
to run first. Anything visual also clears `docs/graphics-standards.md`. The template is
`.github/PULL_REQUEST_TEMPLATE.md` — upper case is the only spelling here, so a probe for
`.github/pull_request_template.md` finds nothing and proves nothing.

- **Push in instalments.** A session can hit a context or session limit and lose its
  container. Commit and push at every self-contained step; open the pull request once an
  increment stands on its own and passes the gates, not when the issue is done, and say
  in it what is left.
- **Claim the issue before you touch a file.** Assign it to the repository owner (`get_me`
  gives the login) **before** the first edit, in every session: the assignee is the only
  claim that exists before a branch does (`.claude/skills/work-issue/SKILL.md` §3; §5 keeps
  the claim *comment* for firings). Unassign if the work stops without a pull request.
- **Vendored skills are read-only.** Eleven of `.claude/skills/` are upstream copies, and
  reformatting one destroys what makes a re-sync cheap: `.claude/VENDORED-SKILLS.md`.

## The agentic loop

`work-issue` picks an issue, `dev-loop` runs the change as a closed loop — built against a
written target, validated by `npm run gates`, graded each round by a fresh `loop-critic` —
and `steward` drives the pull request to green. Each skill holds its own rules, and
`.claude/AGENTIC-LOOP.md` maps where every guardrail is enforced.

Three bind a session whether or not it loaded the skill. The loop never tunes for balance
(the freeze is what a loop maximising a number would launder), and never settles a
docs/code disagreement silently: it writes the options and a recommendation, takes it
unattended with both in the pull request, and asks the person at the keyboard otherwise.
The critic has no `Edit` and no `Write`: **a generator that also grades itself is not a
gate** (#540). And **a change gets three rounds, a cap a person sets**: reaching it is a
stall, and the pull request stays open with its findings listed in the body.

Related: `README.md` · `CONTRIBUTING.md` · `SETUP.md` · `docs/README.md` ·
`docs/DEVELOPER_QUICKSTART.md` · `.github/copilot-instructions.md`
