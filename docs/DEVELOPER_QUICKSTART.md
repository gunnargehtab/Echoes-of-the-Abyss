# Developer Quickstart

A brief guide for contributors: get a local dev environment running, and make
small code or documentation changes with confidence they will pass CI.

## Prerequisites

- **Node.js 22 or newer**, npm 10+
- Git

Node 22 is a hard floor, not a recommendation. The backend dev and test scripts
use `node --import tsx` and the stable `node:test` runner, and CI pins Node 22.
Older runtimes fail with errors that do not obviously point at the Node version.

## Repository layout

Root is an npm workspace with three packages, plus standalone tooling:

- `packages/shared` — `@echoes/shared`: types, tuning constants, Echo Layer math
- `packages/backend` — Colyseus game server; owns the authoritative simulation
- `packages/frontend` — React shell and the two-canvas renderer (three.js conn view under the PixiJS HUD)
- `tools/echo-sim` — deterministic Echo scenario harness (not a workspace)
- `docs/` — the design bible

## Setup

Clone the repo:

```bash
git clone https://github.com/gunnargehtab/Echoes-of-the-Abyss.git
cd Echoes-of-the-Abyss
```

Install dependencies from the repo root:

```bash
npm ci
```

## Running the project

```bash
npm run dev            # backend + frontend together
npm run build          # build all packages
npm test               # run all tests
npm run type-check     # type-check frontend and backend
npm run lint           # ESLint across workspaces
npm run format:check   # Prettier check (npm run format to fix)
```

The frontend dev server serves on `:5173`; the backend listens on `:3000` and
exposes `/health`.

### Build the shared package first

`packages/frontend` and `packages/backend` import `@echoes/shared` by its build
output (`dist/`), not its source. Every root script above already runs
`npm run build:shared` first, so the commands in this section are safe as-is.

If you run a single workspace script directly after editing `packages/shared`,
rebuild it yourself or you will see stale types and confusing resolution errors:

```bash
npm run build:shared
```

## Run a single workspace

```bash
npm -w packages/frontend run dev
npm -w packages/backend run dev
npm -w packages/shared run test
```

Run one backend test file:

```bash
npm -w packages/backend exec -- node --import tsx --test test/match.test.ts
```

### Frontend tests need the Vite shim

The client is authored for Vite, and two of its idioms are build-time transforms rather
than runtime APIs: `import url from './thing.png'` and `import.meta.glob(...)`. Node
refuses the first and has never heard of the second, so any test that imports a client
module through to `EchoRenderer` or `PerspectiveView` needs the loader hooks in
`packages/frontend/test/support/viteAssetHooks.mjs`. `npm -w packages/frontend run test`
already passes them; a hand-rolled invocation must too:

```bash
npm -w packages/frontend exec -- node --import tsx \
  --import ./test/support/viteAssets.mjs --test test/rendererSmoke.test.ts
```

That test is the headless renderer smoke test — it boots both painters against a canned
match with the GL contexts stubbed out. See
[graphics-standards.md](graphics-standards.md), "What `npm test` holds, and what only a
screenshot can", for what it covers and what it deliberately does not.

## Echo simulator

A standalone deterministic harness for Echo Layer scenarios:

```bash
cd tools/echo-sim
node sim.js                             # built-in sample, prints JSON
node sim.js scenarios/simple-scenario.json
```

See [tools/echo-sim/README.md](../tools/echo-sim/README.md) for the scenario
format and the programmatic API.

## Docs and CI

CI (`.github/workflows/ci.yml`) runs on every push and pull request: build
shared, type-check, ESLint, Prettier check, tests, full build, then two
documentation gates over `docs/` — markdownlint and a link check.

**Both documentation gates are blocking.** In particular, linking a file that
does not exist fails the build. Planned-but-unwritten documents belong in the
"Planned / Not Yet Written" section of [README.md](README.md) as plain text,
not as links.

Run the doc gates locally exactly as CI does:

```bash
npx -y markdownlint-cli "docs/**/*.md" "docs/*.md" --ignore node_modules
git ls-files ':(glob)docs/**/*.md' | while read -r file; do
  npx -y markdown-link-check --config .markdown-link-check.json "$file" || exit 1
done
```

Prettier deliberately does not cover `docs/`. Design docs are authored prose and
are linted by markdownlint instead of being reformatted.

## Contributing

- Use descriptive branch prefixes: `feat/`, `fix/`, `ci/`, `docs/`
- Keep pull requests focused and reference the issue they close (e.g. `Fixes #30`)
- Run type-check, lint, format:check and tests before pushing
- When adding a mechanic, update the relevant design doc and cross-link it

Agent-facing guidance on architecture and conventions lives in
[CLAUDE.md](../CLAUDE.md) at the repository root; it is a useful orientation for
human contributors too.

## Related

- [systems-echo.md](systems-echo.md) — the acoustic fog of war
- [systems-depth.md](systems-depth.md) — depth and commitment
- [tech-stack.md](tech-stack.md) — target stack and Echo Layer implementation notes
- [ROADMAP.md](ROADMAP.md) — current milestones
