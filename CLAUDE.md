# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## What this repository is

*Echoes of the Abyss* is a browser-native, server-authoritative RTS with acoustic fog of
war. The repository holds two things that must stay in agreement:

1. **The design bible** (`docs/`) — worldbuilding, mechanics, art and audio direction. It
   is prose, and it is the source of the numbers.
2. **A playable scaffold** (`packages/`) — a TypeScript monorepo implementing the Echo
   Layer simulation, a Colyseus match server, and a PixiJS client.

The docs came first and remain canonical. Code transcribes the docs; when they disagree,
that is a bug in one of them — say which one you are changing and why.

## Balance work is frozen

**Do not tune the game for balance.** Not a hull price, not a yield rate, not a build-list
weight, not a TUNABLE moved because a win rate looked wrong. The systems this game is made
of are still changing shape — hulls, fauna, flora, the economy's own accounts — and every
number tuned against today's shape is thrown away by the next mechanic that lands. Balancing
now is spent effort that buys nothing, and a thirty-match batch costs real wall clock to
produce and real attention to read.

What the freeze covers and what it does not:

- **Frozen** — repricing a hull, retuning a yield, changing an AI build list to move a win
  rate, refreshing a baseline in `tools/balance/baselines/` to chase a guard-rail, and
  filing or working an issue whose subject is a faction winning or losing too much.
  `docs/economy.md` §9's guard-rails stay written down and stay true as a statement of
  intent; a **breached** reading is recorded and left, not acted on. #654 is the standing
  example and is deferred on exactly this basis.
- **Not frozen** — everything else the harness is for. The harness is `tools/balance`,
  driven by the `balance-run` skill, and its committed readings are
  `tools/balance/baselines/`. A *correctness* fault it surfaces is still a bug and still
  gets fixed: a navy that cannot pay for its own roster (#520), a commander that never
  builds a structure its own waves gate on (#518), an economy path that refuses a legal
  purchase. Those are not balance; they are the simulation failing to do what the docs say
  it does. A baseline refreshed because a *mechanic* changed is also fine — that is
  recording the new shape, not chasing a target.

The freeze lifts when the systems stop moving, and it lifts by a decision written here,
not by a run deciding the moment has come. Until then, if a piece of work's justification
is a win rate, it is not the work to do.

## Write short on GitHub

Long writing costs the reader, not the writer. The six pull requests merged before this
rule averaged 1,598-word bodies.

Issues, pull requests, reviews, comments and commit messages follow these rules:

- **Short sentences.** One idea each.
- **Lead with the answer.** The first line says what changed, or what is wrong.
- **Facts, not narrative.** Numbers, paths, the failing test's name. Do not retell how you
  got there.
- **Link instead of quoting.** Name the doc, the test or the issue and move on.
- **Budgets.** 300 words for a pull request body, 200 for an issue, 100 for a comment.
  Over budget means cut.

Commit messages count because a merge commit carries the body into `main` permanently.
Reasoning still belongs in a body, in a sentence or two.

Scope is GitHub text. Code comments still explain *why* ([Style](#style)), `docs/` stays
prose, and brevity never turns a caveat into a false claim.

`tools/prose-budget/` measures a body, and the **PR body** workflow reports each pull
request's count. It is advisory and never blocks a merge.

## Commands

Run everything from the repository root.

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Check the install is current | `npm run preflight` |
| Dev (server + client) | `npm run dev` |
| Build all | `npm run build` |
| Test all | `npm test` |
| Type-check | `npm run type-check` |
| Lint | `npm run lint` |
| Formatting check / fix | `npm run format:check` / `npm run format` |
| Hull scripts ↔ GLBs ↔ outlines agree | `npm run check:models` |
| `docs/invariants.md` still names live tests | `npm run check:invariants` |
| `.claude/`, `CLAUDE.md`, `CONTRIBUTING.md`, `copilot-instructions.md`: lint, links, live paths | `npm run docs:claude` |
| Every blocking gate, in one pass | `npm run gates` |

Single workspace: `npm -w packages/backend run dev`, `npm -w packages/frontend run dev`,
`npm -w packages/shared run test`.

Single backend test file: `npm -w packages/backend exec -- node --import tsx --test test/match.test.ts`.

The three doc gates on their own — the same three CI's `docs` job runs:

```bash
npm run gates -- --only=docs:lint,docs:links,docs:claude
```

The `--` is load-bearing. `npm run gates --only=…` is npm's *own* `--only` config, which
npm rejects as invalid and never forwards, so that spelling silently runs every gate.

`npm run gates` is those three plus every other blocking check in
`.github/workflows/ci.yml`, run in one pass and summarised: one exit code for "this branch
would pass CI". It is the finish line to work against — a condition a machine can settle,
rather than a judgement about whether the work looks done — which is what makes it the
sensible thing to hand a `/goal`. It does not stop at the first failure, so one run tells
you everything that is red; `--bail` when you want the old behaviour, `--only=` and
`--skip=` while you iterate on a single gate, `--list` to see their names.

Not every task has such a finish line, and inventing one is worse than not having one.
Exploratory and design work does not get a gate that can settle it, and **nothing about
balance does** — see the freeze above. A green `npm run gates` says the tree is sound. It
never says a number is right.

**Node 22+ is required.** The backend dev and test scripts use `node --import tsx` and the
stable `node:test` runner, and CI pins Node 22. Older runtimes fail with errors that do not
obviously point at the Node version.

## Build order — the thing that breaks first

`packages/frontend` and `packages/backend` import `@echoes/shared` by its **build output**
(`dist/`), not its source. A stale or missing `dist/` produces confusing type errors and
runtime resolution failures across both packages.

Every root script that needs it already runs `npm run build:shared` first. If you invoke a
workspace script directly after editing `packages/shared`, rebuild shared yourself:

```bash
npm run build:shared
```

## Architecture

```text
packages/shared    @echoes/shared — types, tuning constants, Echo Layer math.
                   Compiled with tsc (NodeNext) to dist/. Imported by both sides.
packages/backend   Colyseus server. Owns the simulation. Node + esbuild bundle.
packages/frontend  React shell + two-canvas renderer, three.js under PixiJS. A
                   terminal, not a simulation.
tools/hull-models  The kit, faction, hull and structure scripts that build the GLBs.
tools/hull-maps    The sprite maps and plan outlines those models bake to.
tools/hull-renders One beauty frame per hull, in the water its navy lives in.
tools/audio-meter  What the mix measures: LUFS, true peak, band split.
tools/invariants   Every holder docs/invariants.md names still resolves.
tools/claude-docs  This file and its siblings: lint, links, live paths.
tools/prose-budget How long a GitHub body is, in the words a person reads.
tools/roadmap      docs/ROADMAP.md rendered against live GitHub issue state.
tools/balance      Headless matches, and a verdict against every guard-rail.
tools/echo-sim     Deterministic Echo scenarios, standalone.
tools/lib          spawn.mjs, the one way a gate is spawned.
tools/*.mjs        gates.mjs, preflight-deps.mjs, android-check.mjs.
docs/              The design bible. Prose, and the source of every SPEC number.
```

Three directories carry their own `CLAUDE.md`, loaded only for a session working under
them: `tools/CLAUDE.md` is the paragraph behind each line above,
`packages/backend/CLAUDE.md` holds the two clocks and the Colyseus import rule, and
`packages/frontend/CLAUDE.md` holds the test shim and the production seams. What stays
here binds two or more of them.

### Server-authoritative is a hard rule, not a preference

The whole game is hidden information, so a client that receives unresolved world state is
a maphack no matter what it chooses to draw. Detection resolves per player in
`packages/backend/src/sim/systems/echoLayer.ts`, and only the resolved result crosses the
wire. Contacts are reported under opaque per-observer handles rather than raw entity ids,
so a client cannot infer the map-wide unit count from contacts it legitimately detected.

Never send the client anything it has not resolved — not "temporarily", not behind a debug
flag that ships.

### Constants live in exactly one place

All tuning numbers belong in `packages/shared/src/constants.ts`, tagged in their comment:

- **SPEC** — taken from a design doc. Change the doc first, then the constant, and cite the
  doc section in the comment.
- **TUNABLE** — a prototype number the docs do not pin down. Free to move; expected to.

Some constants are *derived* rather than chosen — `BASE_THRESHOLD` is solved from the
spec'd 2,400 m active-sonar self-reveal so the documented ping radii fall out of the
general propagation model instead of being special-cased. Do not replace a derived value
with a hard-coded one to make a test pass.

If a constant would need to exist in two packages, it belongs in shared.

### Invariants live in exactly one place too

A *number* lives in `constants.ts`. A property that must hold **over every input** —
"no entity exists above `world.maxEid`", "ordnance never resolves as an observer", "a
beat never fails an objective the player has met" — is an invariant, and
[`docs/invariants.md`](docs/invariants.md) is the list of them. Each row names the
property, the doc section or issue it descends from, and the file and test that hold it.

The tests still hold the invariants; the doc holds the *list*, and
`npm run check:invariants` holds the doc, asserting every named holder still resolves.
It is a liveness check, not a correctness one — it cannot tell you a test still asserts
what its row claims, only that something by that name is still there. That is the same
bargain `check:models` makes, and it buys the same thing: prose that repeats what code
does drifts, and a script makes the drift loud.

The list is not complete and does not claim to be. Adding a row is a normal part of
fixing a bug whose failure mode was silent.

## Conventions

### Import extensions differ by package — this is deliberate

- `packages/shared` compiles under `module: NodeNext`, so relative imports **must** carry a
  `.js` extension: `import { Biome } from './types.js';` (even though the file is `.ts`).
- `packages/backend` and `packages/frontend` use `moduleResolution: bundler` with
  `allowImportingTsExtensions`, so relative imports carry the **real** extension:
  `import { Match } from '../sim/match.ts';`

Copying an import line between packages will break it.

### The wire

Every message that crosses the socket — 32 a client may send, 11 the room may send — is
declared once in `packages/shared/src/wire.ts`, name and payload together. Neither package
writes a message name as a string literal; both reach the wire through a thin generic
wrapper (`MatchRoom.onClientMessage`/`sendTo`/`announce`, `GameClient.handle`/`order`) that
takes the name and infers the payload from the same map. Adding a message means adding it
to `CLIENT_MSG` or `SERVER_MSG` *and* to `ClientMessages` or `ServerMessages`; the
`Exact<>` assertions at the foot of `wire.ts` fail the build if you do one and not the
other.

This is the constants rule applied to the protocol, and it was learned the hard way: a name
renamed on one side alone used to compile, travel, and be silently dropped by a room with
no handler registered for it. Colyseus *schema* state is a different channel and not
covered here — it syncs to everyone, which is exactly why the per-observer payloads are
messages instead.

Since #628 the table carries a third thing: each client message's **shape** at runtime, in
`CLIENT_SHAPE` beside its payload. A type describes what a well-behaved client sends and
the socket carries whatever it is handed, so `MatchRoom.onClientMessage` validates against
that declaration once, for every message, and no handler writes a `Number.isFinite` of its
own. Adding a message means a third edit: its shape, typed against its payload, which is
why a field name that is not on the payload fails the build. The two bounds it spends —
`WIRE.MAX_IDS` on an array field and `WIRE.MAX_MESSAGES_PER_WINDOW` per client — live in
`constants.ts` like every other number. Validation runs on the message path, never the step
path; nothing here is on the 60 Hz budget.

### Style

Prettier: 100 columns, single quotes, ES5 trailing commas, semicolons. It covers
`packages/**`, `tools/**/*.{js,json}` and root JSON — deliberately **not** `docs/`, which is
authored prose linted by markdownlint instead.

Comments in this codebase explain *why*, not *what*, and several encode hard-won runtime
gotchas. Match that register; don't strip those comments when refactoring.

### Docs

- `docs/glossary.md` is authoritative. If a term means two things in two docs, resolve it
  in the glossary first, then fix every instance.
- **Never link a doc that does not exist.** Link checking on `docs/` is blocking in CI.
  Planned work goes in the "Planned / Not Yet Written" section of `docs/README.md` as plain
  text, not as a link.
- Cross-link rather than restate. Every doc ends with a "Related" section.
- Use concrete numbers: "45 SIG while idle with systems live", not "moderate SIG".

### Vendored skills

`.claude/skills/` holds six skills written for this repository and eleven copied from
public marketplaces — PixiJS v8, three.js, WCAG 2.2 accessibility, and the Colyseus version
guard above. They are copied rather than installed as plugins because a plugin is
all-or-nothing and every installed skill's description is loaded into every session, so the
subset that matches what the code actually imports is the whole point.
`.claude/VENDORED-SKILLS.md` records each one's upstream, commit, licence and reason, how to
re-sync it, and what was looked at and rejected.

Treat them as read-only — `npm run docs:claude` lints the six written here and
leaves the eleven alone, because reformatting a copy destroys the one property
that makes re-syncing it cheap. Two local edits exist and both are marked `LOCAL`
in place: the
`pixijs` router says which five of its twenty-six rows are on disk, and the `accessibility`
skill points one reference at its upstream sibling rather than at a path this repository did
not take. Do not link them from `docs/` — link checking there is blocking in CI and these
files live outside it.

## Design constraints worth knowing before you touch gameplay

Every mechanic in this game is an argument about **sound** or **depth**. If a unit ability
or faction trait is anchored to neither, it is arbitrary and should be reconsidered before
it is implemented.

- **Acoustic Signature (SIG, 0–100)** — everything that makes you strong makes you loud.
  Economy is loud, construction is loud, alpha strikes are loud. When adding an ability,
  decide how loud it is and whether that loudness fits the faction's doctrine.
- **Propagation Factor (PF)** — biomes are defined by how sound moves through them
  (Thermal Vein 0.45 masks; Abyssal Trench 1.6 carries). PF is a lever: changing a biome's
  PF changes which factions thrive there.
- **Depth is a commitment timer**, not just a vertical hazard. Descent is fast and loud,
  ascent is slow and silent, and units below their Pressure Rating take unhealable crush
  attrition. A deep raid must succeed, retreat, or die.
- **Target emotion is dread, not confusion.** Partial information the player can reason
  about. If a rule is merely confusing, simplify it.

Start with `docs/systems-echo.md` and `docs/systems-depth.md`; everything else descends
from those two.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on every PR, as four parallel
jobs. The three that need `node_modules` share one cached install
(`.github/actions/setup`); `docs` needs none and skips it.

- `build` — build shared → type-check → ESLint → Prettier check → hull-model round-trip
  check (`check:models`) → invariants-list check (`check:invariants`) → full build.
- `test (shard 1)` and `test (shard 2)` — the backend suite split file-by-file with node's
  `--test-shard`. The mission tests play whole missions out at 60 Hz and are most of the
  suite's time; the shard count in the matrix is the one knob for wall clock, at the cost
  of one more billed minute per shard. The last shard, and only the last
  (`if: matrix.shard == strategy.job-total`), also runs the shared and frontend suites and
  `npm run test:roadmap` — ten seconds between them, put on the lighter side of the split.
- `docs` — markdownlint on `docs/`, then one `markdown-link-check` invocation over every
  doc, then `npm run docs:claude` over the prose this repository wrote about itself —
  `.claude/`, plus `CLAUDE.md`, `CONTRIBUTING.md` and `.github/copilot-instructions.md`.
  **All three are blocking**, so a dead link in `docs/` fails the build.

The link checker config (`.markdown-link-check.json`) ignores this repo's own github.com
URLs — the repository is private, so unauthenticated requests to its issues and clone URL
return 404 and those links would fail forever — and enables `retryOn429`, because
`docs/ROADMAP.md` links roughly twenty GitHub issues.

Three other workflows live beside it, and none of them gates a merge:

- `pages.yml` — **Roadmap site**. Builds `tools/roadmap` on pushes to `main` that touch
  what feeds the page, on issue events, and daily. It deploys only once someone sets the
  `PUBLISH_ROADMAP` variable, because this repository is private and a Pages site is not;
  until then it uploads the site as an artifact and stays green.
- `pr-body.yml` — **PR body**. Reports a pull request's word count through
  `tools/prose-budget` ("Write short on GitHub" above). Advisory: the step always succeeds.
- `labels.yml` — **Sync Labels**. Applies `.github/labels.yml` on a push that changes it.
  That file is the complete set, so a label it does not list is deleted, not merely
  unmanaged (#599).

Run the same checks locally before pushing; `npm run gates` is the whole blocking sequence
and is cheap.

## Contributing

The full conventions live in `CONTRIBUTING.md` — the short version: branch names use
`feat/`, `fix/`, `ci/`, `docs/` prefixes; commit subjects use the matching prefixes; keep
PRs focused and reference the issue they close (`Fixes #30`). The PR template is
`.github/PULL_REQUEST_TEMPLATE.md` — upper case is the only spelling here, so a probe for
`.github/pull_request_template.md` finds nothing and says nothing about whether a template
exists; issue templates are in `.github/ISSUE_TEMPLATE/`. Anything visual must clear the
gates in `docs/graphics-standards.md`, screenshot included.

### Push in instalments, and open the PR before the session ends

A session — interactive or unattended — can hit a context or session limit part
way through a long change, and the container goes with it. Commit and push at
every self-contained step rather than once at the end, and open the pull request
as soon as the branch carries an increment that stands on its own and passes the
gates above, not when the whole issue is finished. Keep working on the same
branch afterwards; the pull request follows it. If the work stops half done, say
in the PR body what is done and what is left, so the next session picks up a
branch instead of re-deriving one.

### Claim the issue before you touch a file

Assign the issue to the repository owner (`get_me` gives the login) **before** the first
edit — in every session, interactive ones included, not only the unattended `work-issue`
loop. The assignee is the only claim that exists before a branch does, and it is what
keeps a Routine firing from starting work a person is already halfway through: an
assignee is the loop's cheapest and earliest exclusion, and a branch scan cannot close
the gap before the first push (`.claude/skills/work-issue/SKILL.md` §3).

The claim **comment** stays the loop's (§5). A firing needs one because nobody is at the
keyboard to ask which of the two logins took the issue; in an interactive session you are,
and an assignee carrying no loop claim comment already reads as a person's — which is how
§3 tells a live claim from a stale one. Unassign if the work stops without a pull request:
an issue left assigned reads as in progress to the next firing and to every person.

## The agentic loop

`work-issue` picks an issue and `steward` drives its pull request to green. Between
them sits `dev-loop`: one change run as a closed loop — build against the doc section
that is its target, validate with `npm run gates`, capture evidence, hand it to the
`loop-critic` subagent fresh, refine on the verdict, and stop on a written criterion
rather than on a feeling.

The critic is a separate agent with no `Edit` and no `Write`, for the reason #540 already
settled for hulls: **a generator that also grades itself is not a gate.** Two rounds in
which the same finding survives is a stall, and a stall stops the loop and asks.

**A change gets three rounds, and that cap is a person's to set.** It was ten until
18 September, when it was cut to three for efficiency: an unattended firing spends around
twenty dollars, and the rounds after the third are the ones nobody is watching. Reaching
the cap is a stall like any other — the pull request stays open with the findings still
open written in its body, so the next session or a person picks up a list instead of
re-deriving one. Interactively the cap is where the loop asks, and a person can grant a
fourth round; a firing cannot grant itself one, for the same reason it cannot raise the
open-PR cap.

Two rules bind it harder than they bind a person, because a refine loop is the thing most
likely to break them by accident: it never tunes for balance (the freeze above is exactly
what a loop maximising a number would launder), and it never resolves a docs/code
disagreement by guessing. `.claude/AGENTIC-LOOP.md` records how this maps onto #709's
proposal, what was deliberately not built, and what is still owed.

Related: `README.md` · `CONTRIBUTING.md` · `SETUP.md` · `SETUP-ANDROID.md` (the whole game — server included —
runs on-device in Termux) · `docs/README.md` · `docs/DEVELOPER_QUICKSTART.md` ·
`.github/copilot-instructions.md` (the design-side companion to this file: faction noise
doctrines, biome PF table, and the doc-by-doc map of `docs/`)
