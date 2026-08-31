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
git ls-files ':(glob)docs/**/*.md' | while read -r f; do
  npx -y markdown-link-check --config .markdown-link-check.json "$f" || exit 1
done
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

`.github/workflows/ci.yml` runs on every push and PR: build shared → type-check → ESLint →
Prettier check → tests → full build → markdownlint on `docs/` → markdown link check on
`docs/`. **Both doc gates are blocking**, so a dead link in `docs/` fails the build.

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
