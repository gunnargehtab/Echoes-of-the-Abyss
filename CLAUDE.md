# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this repository is

*Echoes of the Abyss* is a browser-native, server-authoritative RTS with acoustic fog of
war. Two things here must agree: the design bible (`docs/`) and the TypeScript monorepo
under `packages/` that plays it. The docs came first and stay canonical — code transcribes
them, and a disagreement is a bug in one of the two, so say which one you are changing and
why.

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

Long writing costs the reader, not the writer: the six pull requests merged before this
rule averaged 1,598-word bodies. Every issue, pull request, review, comment and commit
message follows it.

- **Short sentences**, one idea each, leading with the answer: what changed, or what is
  wrong.
- **Facts, not narrative.** Numbers, paths, the failing test's name.
- **Link instead of quoting.** Name the doc, the test or the issue and move on.
- **Budgets.** 300 words for a pull request body, 200 for an issue, 100 for a comment.

A merge commit carries a body into `main` permanently, which is why commit messages count.
Scope is GitHub text: code comments still explain *why* ([Style](#style)), and `docs/`
stays prose. `tools/prose-budget/` measures a body, advisory and never blocking.

## Commands

Run everything from the repository root. `package.json` holds every script, and
`docs/DEVELOPER_QUICKSTART.md` runs one workspace, or one test file, on its own.

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Check the install | `npm run preflight` |
| Dev (server + client) | `npm run dev` |
| Build all | `npm run build` |
| Test all | `npm test` |
| Type-check | `npm run type-check` |
| Lint | `npm run lint` |
| Formatting check / fix | `npm run format:check` / `npm run format` |
| Hull scripts ↔ GLBs ↔ outlines | `npm run check:models` |
| `docs/invariants.md` names live tests | `npm run check:invariants` |
| This file and its siblings | `npm run docs:claude` |
| Every blocking gate, one pass | `npm run gates` |

`npm run gates` runs every blocking check in `.github/workflows/ci.yml` in one pass — one
answer to "would this branch pass CI", and so the finish line to hand a `/goal`. It says
the tree is sound, never that a number is right. `-- --help` names its flags, and the `--`
is load-bearing: without it npm takes `--only=…` for its *own* config, rejects it as
invalid, forwards nothing, and every gate runs.

**Node 22+ is required.** The backend dev and test scripts use `node --import tsx` and the
stable `node:test` runner, and CI pins Node 22. Older runtimes fail with errors that do not
obviously point at the Node version.

## Build order — the thing that breaks first

`packages/frontend` and `packages/backend` import `@echoes/shared` by its **build output**
(`dist/`), not its source, so a stale or missing `dist/` produces confusing type errors and
runtime resolution failures across both. Every root script that needs it runs
`npm run build:shared` first; invoke a workspace script directly after editing
`packages/shared` and you run that yourself.

## Architecture

```text
packages/shared    @echoes/shared — types, tuning constants, Echo Layer math.
packages/backend   Colyseus server. Owns the simulation. Node + esbuild bundle.
packages/frontend  React shell, three.js under PixiJS. A terminal, not a sim.
tools/hull-models  Kit, faction, hull and structure scripts; they build the GLBs.
tools/hull-maps    The sprite maps and plan outlines those models bake to.
tools/hull-renders One beauty frame per hull, in its navy's water.
tools/audio-meter  What the mix measures: LUFS, true peak, band split.
tools/invariants   Every holder docs/invariants.md names still resolves.
tools/claude-docs  This file and its siblings: lint, links, live paths.
tools/prose-budget How long a GitHub body is, in words a person reads.
tools/roadmap      docs/ROADMAP.md against live GitHub issue state.
tools/balance      Headless matches, and a verdict on every guard-rail.
tools/echo-sim     Deterministic Echo scenarios, standalone.
tools/lib          spawn.mjs, the one way a gate is spawned.
tools/*.mjs        gates.mjs, preflight-deps.mjs, android-check.mjs.
docs/              The design bible, and the source of every SPEC number.
```

`tools/CLAUDE.md`, `packages/backend/CLAUDE.md` and `packages/frontend/CLAUDE.md` hold what
binds one directory only, and load for a session working under it. What stays here binds
two or more.

### Server-authoritative is a hard rule, not a preference

The whole game is hidden information, so a client holding unresolved world state is a
maphack whatever it draws. Detection resolves per player in
`packages/backend/src/sim/systems/echoLayer.ts`, and only the result crosses the wire,
under opaque per-observer handles that cannot be counted into a map-wide total. Never send
the client anything it has not resolved: not "temporarily", not behind a debug flag that
ships.

### Constants live in exactly one place

All tuning numbers belong in `packages/shared/src/constants.ts`, tagged in their comment:

- **SPEC** — taken from a design doc. Change the doc first, then the constant, citing the
  doc section.
- **TUNABLE** — a prototype number the docs do not pin down. Free to move; expected to.

Some are *derived*, not chosen: `BASE_THRESHOLD` is solved from the spec'd 2,400 m
active-sonar self-reveal, so the documented ping radii fall out of the propagation model
rather than being special-cased. Never hard-code over a derived value to pass a test, and a
constant needed in two packages belongs in shared.

### Invariants live in exactly one place too

A *number* lives in `constants.ts`. A property that must hold **over every input** — "no
entity exists above `world.maxEid`" — is an invariant, and
[`docs/invariants.md`](docs/invariants.md) is the list, with its own rules for what belongs
on it. `npm run check:invariants` asserts every holder a row names still resolves: liveness
rather than correctness, the bargain `check:models` makes.

## Conventions

### Import extensions differ by package — this is deliberate

- `packages/shared` compiles under `module: NodeNext`, so a relative import **must** carry
  a `.js` extension even though the file is `.ts`: `import { Biome } from './types.js';`
- `packages/backend` and `packages/frontend` use `moduleResolution: bundler` with
  `allowImportingTsExtensions`, so a relative import carries the **real** extension:
  `import { Match } from '../sim/match.ts';`

Copying an import line between packages will break it.

### The wire

Every message that crosses the socket — 32 a client may send, 11 the room may send — is
declared once in `packages/shared/src/wire.ts`: the name, the payload, and for a client
message its runtime **shape** in `CLIENT_SHAPE`. No message name is a string literal
anywhere else, and adding one is all three edits — the assertions at the foot of `wire.ts`
fail the build if you make fewer. `MatchRoom.onClientMessage` checks each message against
its shape once, so no handler writes a `Number.isFinite` of its own.

The constants rule, applied to the protocol; `wire.ts` records the silent failure behind
it, and why Colyseus *schema* state is a different channel.

### Style

Prettier: 100 columns, single quotes, ES5 trailing commas, semicolons. It covers
`packages/**`, `tools/**/*.{js,json}` and root JSON — deliberately **not** `docs/`, which is
authored prose linted by markdownlint instead.

Comments here explain *why*, not *what*, and several encode hard-won gotchas. Match that
register; don't strip them when refactoring.

### Docs

- `docs/glossary.md` is authoritative. A term meaning two things is resolved there first,
  then fixed everywhere.
- **Never link a doc that does not exist.** The `docs/` link check is blocking, so planned
  work goes in `docs/README.md`'s "Planned / Not Yet Written" as plain text.
- Cross-link rather than restate. Every doc ends with a "Related" section.
- Use concrete numbers: "45 SIG while idle with systems live", not "moderate SIG".

### Vendored skills

`.claude/skills/` holds six skills written here and eleven copied from public marketplaces.
`.claude/VENDORED-SKILLS.md` records each copy's upstream, licence, why it is a copy rather
than a plugin, and its two `LOCAL` edits. The copies are read-only — reformatting one
destroys what makes a re-sync cheap — so `npm run docs:claude` lints the six and leaves the
eleven alone. Never link one from `docs/`, where the link check is blocking.

## Design constraints worth knowing before you touch gameplay

Every mechanic is an argument about **sound** or **depth**: how loud it makes you, and what
going deep commits you to. One anchored to neither is arbitrary — reconsider it before
implementing it, and aim at dread rather than confusion.

`docs/systems-echo.md` and `docs/systems-depth.md` are those two systems, and
`.github/copilot-instructions.md` is the design-side companion: the SIG scale, the biome PF
table, the depth bands, each faction's doctrine.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every pull request, as four
parallel jobs: `build`, two test shards, and `docs`. Its comments carry the reasoning,
including why the shard count is the one knob for wall clock. All three doc gates block, so
a dead link in `docs/` fails the build.

The three workflows beside it — `pages.yml`, `pr-body.yml`, `labels.yml` — gate nothing,
and each says in its own header what it does and when it acts.

## Contributing

`CONTRIBUTING.md` is the contract: branches, commits, labels, pull requests, and the gates
to run first. Anything visual also clears `docs/graphics-standards.md`. The template is
`.github/PULL_REQUEST_TEMPLATE.md` — upper case is the only spelling here, so a probe for
`.github/pull_request_template.md` finds nothing and proves nothing.

### Push in instalments, and open the PR before the session ends

A session can hit a context or session limit mid-change, and the container goes with it.
Commit and push at every self-contained step; open the pull request once the branch carries
an increment that stands on its own and passes the gates, not when the issue is done. If
the work stops half done, the body says what is left.

### Claim the issue before you touch a file

Assign the issue to the repository owner (`get_me` gives the login) **before** the first
edit, in every session and not only the unattended `work-issue` loop: the assignee is the
only claim that exists before a branch does, and a branch scan cannot close that gap
(`.claude/skills/work-issue/SKILL.md` §3, whose §5 keeps the claim *comment* for firings
alone). Unassign if the work stops without a pull request; an issue left assigned reads as
in progress.

## The agentic loop

`work-issue` picks an issue, `dev-loop` runs the change as a closed loop — built against a
written target, validated by `npm run gates`, graded each round by a fresh `loop-critic` —
and `steward` drives the pull request to green. Each skill holds its own rules, and
`.claude/AGENTIC-LOOP.md` maps where every guardrail is enforced.

Three of them bind a session whether or not it loaded the skill. The loop never tunes for
balance — the freeze above is what a loop maximising a number would launder — and never
settles a docs/code disagreement by guessing. The critic has no `Edit` and no `Write`, for
the reason #540 settled for hulls: **a generator that also grades itself is not a gate.**
And **a change gets three rounds, a cap a person sets**: reaching it is a stall, and the
pull request stays open with the findings still open in its body.

Related: `README.md` · `CONTRIBUTING.md` · `SETUP.md` · `SETUP-ANDROID.md` (Termux, the
whole game on-device) · `docs/README.md` · `docs/DEVELOPER_QUICKSTART.md` ·
`.github/copilot-instructions.md`
