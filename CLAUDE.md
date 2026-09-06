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

Single workspace: `npm -w packages/backend run dev`, `npm -w packages/frontend run dev`,
`npm -w packages/shared run test`.

Single backend test file: `npm -w packages/backend exec -- node --import tsx --test test/match.test.ts`.

Doc gates, exactly as CI runs them:

```bash
npx -y markdownlint-cli "docs/**/*.md" "docs/*.md" --ignore node_modules
git ls-files -z ':(glob)docs/**/*.md' \
  | xargs -0 npx -y markdown-link-check --config .markdown-link-check.json
```

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
                   sim/maps/ holds the authored map archetypes — data literals,
                   never generated. Terrain.demo() is a test fixture, not a map.
packages/frontend  React shell + two-canvas renderer: three.js conn view (the
                   world) under a transparent PixiJS HUD, one shared camera
                   (EchoRenderer.setConn). A terminal, not a simulation.
tools/echo-sim     Standalone CommonJS harness for deterministic Echo scenarios.
                   Not an npm workspace; run it directly:
                   node tools/echo-sim/sim.js [tools/echo-sim/scenarios/<name>.json]
                   Tests can also require('./lib') for detect/runScenario.
docs/              The design bible. Prose, and the source of every SPEC number.
```

### Server-authoritative is a hard rule, not a preference

The whole game is hidden information, so a client that receives unresolved world state is
a maphack no matter what it chooses to draw. Detection resolves per player in
`packages/backend/src/sim/systems/echoLayer.ts`, and only the resolved result crosses the
wire. Contacts are reported under opaque per-observer handles rather than raw entity ids,
so a client cannot infer the map-wide unit count from contacts it legitimately detected.

Never send the client anything it has not resolved — not "temporarily", not behind a debug
flag that ships.

### Two clocks

`packages/backend/src/sim/match.ts` runs a fixed 60 Hz simulation step (`SIM.TICK_HZ`) so
behaviour does not vary with server load, and resolves the Echo Layer at 5 Hz
(`SIM.ECHO_HZ`) against a hard 2 ms budget (`SIM.ECHO_BUDGET_MS`). Detection is the
expensive pass, and players cannot perceive 60 Hz changes in a sonar contact.

Anything you add to the per-tick path is on the 60 Hz budget. Anything touching detection
is on the 2 ms one — `Match` tracks the rolling worst-case cost, so a regression here is
observable rather than theoretical.

Both budgets are asserted on **counted work**, never on a stopwatch: the Echo pass by its
path integrals (`Match.contactPathWalksLastPass`), the 60 Hz step by its pair tests and
cell probes (`Match.worstStepWork`, defined in `sim/stepWork.ts`). A maximum of a
wall-clock sample is the noisiest statistic available on a shared runner — identical work
has spread eightfold between runs in one process and failed CI on the spread alone — while
a count is a property of the algorithm and is the same everywhere. The milliseconds are
still tracked and still worth printing; they are not what a test fails on.

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

## Conventions

### Import extensions differ by package — this is deliberate

- `packages/shared` compiles under `module: NodeNext`, so relative imports **must** carry a
  `.js` extension: `import { Biome } from './types.js';` (even though the file is `.ts`).
- `packages/backend` and `packages/frontend` use `moduleResolution: bundler` with
  `allowImportingTsExtensions`, so relative imports carry the **real** extension:
  `import { Match } from '../sim/match.ts';`

Copying an import line between packages will break it.

### Colyseus

Import from `@colyseus/core`, never the `colyseus` meta-package. The meta-package
re-exports via `__exportStar`, which Node's static CJS export detection cannot see, so
`import { Room } from 'colyseus'` fails at runtime under the unbundled ESM dev server while
working fine once bundled. `@colyseus/schema` needs legacy decorators, which is why
`useDefineForClassFields` stays `false` in the backend tsconfig — flipping it silently
wipes the `@type()` metadata.

### The wire

Every message that crosses the socket — 24 a client may send, 11 the room may send — is
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

### Frontend tests run under a Vite shim

The client is authored for Vite, and two of its idioms are build-time transforms rather
than runtime APIs: `import url from './thing.png'` and `import.meta.glob(...)`. Node has
neither, so `packages/frontend`'s test script passes loader hooks
(`test/support/viteAssets.mjs`) alongside tsx. Any hand-rolled `node --test` invocation
that reaches a client module through to `EchoRenderer` or `PerspectiveView` needs them
too, or the import throws before a single assertion runs.

Three tests are what those hooks exist for, and all three follow the same rule: boot the
real class, stub only what the runner genuinely lacks, and assert on counted work rather
than on a stopwatch.

- `test/rendererSmoke.test.ts` — both painters against a canned match, with only the two
  rasterisers stubbed (`test/support/headless.ts`). Display objects, draw instructions,
  scene-graph identities. Pixels stay the screenshot gates in `docs/graphics-standards.md`.
- `test/audioEngine.test.ts` — the bus graph against a stubbed `AudioContext`
  (`test/support/headlessAudio.ts`), which models edges and parameter writes rather than
  swallowing them, so routing and ducking are checkable. `AUDIO_BUDGET_MS` is a wall-clock
  number and is *not* what the test asserts; nodes built per tick is.
- `test/gameClient.test.ts` — the message contract, against a stub room
  (`test/support/colyseusStub.ts`). A renamed or reshaped message is a compile error
  since #489 (see "The wire" above), so what is left here is the half types cannot
  reach: that the client actually registers a handler for every name the room can send.
- `test/gameCanvas.test.ts` — the shell, through `react-test-renderer`, which renders to
  an object tree and needs no DOM (hence no jsdom). `createNodeMock` supplies the two
  host elements. It tests *connections*, because that is what a composition root gets
  wrong: a message that reaches one painter and not the other, a snapshot that never
  reaches the mix, a device left open on unmount.
- `test/appShell.test.ts`, `lobby.test.ts`, `settingsScreen.test.ts`,
  `controlsScreen.test.ts` — the screens that implement a written rule, through the same
  renderer and the helpers in `test/support/screen.ts`. `docs/ui-ux.md` §11 calls
  accessibility "a correctness requirement, not a feature tier", so full rebinding, the
  75–200% UI scale and the colour-vision palettes are held here; §14's doors are held in
  the shell test. **Assert what a doc section promises, never what the JSX says** — a
  test that mirrors markup is a change detector, and screenshots already cover how things
  look. `Rendered.button()` matches a control's *accessible name* for the same reason.

Four seams in production code exist for these and have no other caller: `EchoRenderer`'s
constructor takes an optional `Application`, `PerspectiveView.mount` an optional renderer
factory, `GameClient`'s constructor an optional `Client`, and `GameCanvas` an optional
`harness` prop carrying all three — it needs its own because it is where the other three
are *constructed*, so without it the boot stops at `mount()` on a machine with no GPU. All
default to the real thing; none is a feature.

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
jobs that share one cached install (`.github/actions/setup`):

- `build` — build shared → type-check → ESLint → Prettier check → full build.
- `test (shard 1)` and `test (shard 2)` — the shared and frontend suites, then the backend
  suite split file-by-file with node's `--test-shard`. The mission tests play whole missions
  out at 60 Hz and are most of the suite's time; the shard count in the matrix is the one
  knob for wall clock, at the cost of one more billed minute per shard.
- `docs` — markdownlint on `docs/`, then one `markdown-link-check` invocation over every
  doc. **Both doc gates are blocking**, so a dead link in `docs/` fails the build.

The link checker config (`.markdown-link-check.json`) ignores this repo's own github.com
URLs — the repository is private, so unauthenticated requests to its issues and clone URL
return 404 and those links would fail forever — and enables `retryOn429`, because
`docs/ROADMAP.md` links roughly twenty GitHub issues.

Run the same checks locally before pushing; the full sequence is cheap.

## Contributing

The full conventions live in `CONTRIBUTING.md` — the short version: branch names use
`feat/`, `fix/`, `ci/`, `docs/` prefixes; commit subjects use the matching prefixes; keep
PRs focused and reference the issue they close (`Fixes #30`). Issue and PR templates live
in `.github/`. Anything visual must clear the gates in `docs/graphics-standards.md`,
screenshot included.

Related: `README.md` · `CONTRIBUTING.md` · `SETUP.md` · `SETUP-ANDROID.md` (the whole game — server included —
runs on-device in Termux) · `docs/README.md` · `docs/DEVELOPER_QUICKSTART.md` ·
`.github/copilot-instructions.md` (the design-side companion to this file: faction noise
doctrines, biome PF table, and the doc-by-doc map of `docs/`)
